import type { ScriptedResponse } from './loopbackApiOrigin';

/**
 * The 429 shape class over which AC-9.1 (send counts, `tests/timing/`) and AC-9.2
 * (client-side recovery, `tests/api/`) are both stated. Header/body values for the
 * shared-scope, global and Cloudflare shapes are the research's own
 * (`research/uncommitted-429-fix-intent-2026-09-03.md` §F2) — `retry-after: 2` for the
 * shared shape, `retry_after: 5.2` for the global shape, `retry-after: 620` for the
 * Cloudflare shape (shortened to a value still outside AC-9.1's 4.5 s window, so that
 * test does not itself run for over ten minutes — the *shape* under test is the same: a
 * long, HTML-bodied, header-only park).
 */

export const CONTROL: ScriptedResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-global': 'false',
    'x-ratelimit-bucket': 'control-bucket',
    'x-ratelimit-limit': '5',
    'x-ratelimit-remaining': '0',
    'x-ratelimit-reset-after': '1.5',
  },
  body: { message: 'You are being rate limited.' },
};

export const SHARED: ScriptedResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-scope': 'shared',
    'retry-after': '2.2',
  },
  // No body retry_after — matching the research's exact shape (`54f02df` §F2): shared-scope
  // 429s omit bucket headers and are identified by the header alone, so this also exercises
  // extractRetryAfter's fall-through to the header (CR-4's own concern).
  body: { global: false, message: 'The resource is being rate limited.' },
};

export const GLOBAL: ScriptedResponse = {
  status: 429,
  headers: {
    'content-type': 'application/json',
    'x-ratelimit-global': 'true',
  },
  body: { retry_after: 5.2, global: true, message: 'You are being globally rate limited.' },
};

export const CLOUDFLARE: ScriptedResponse = {
  status: 429,
  headers: { 'content-type': 'text/html', 'retry-after': '10' },
  body: '<html><body>error code: 1015</body></html>',
  raw: true,
};

/** No body retry_after, no retry-after header, no x-ratelimit-reset-after (D-17). */
export const INFORMATION_FREE: ScriptedResponse = {
  status: 429,
  headers: { 'content-type': 'application/json' },
  body: { message: 'You are being rate limited.' },
};

export interface Shape {
  label: string;
  response: ScriptedResponse;
  /** Expected network sends over AC-9.1's 4.5s window (research's instrument), each path. */
  expectedSends: number | { min: number; max: number };
}

export const SHAPES: Shape[] = [
  { label: 'control (bucket 429, full headers)', response: CONTROL, expectedSends: 3 },
  { label: 'shared-scope 429 (x-ratelimit-scope: shared)', response: SHARED, expectedSends: 2 },
  { label: 'global 429 (body retry_after, no bucket headers)', response: GLOBAL, expectedSends: 1 },
  { label: 'Cloudflare ban (HTML body, retry-after header)', response: CLOUDFLARE, expectedSends: 1 },
  {
    label: 'information-free 429 (D-17 growth schedule)',
    response: INFORMATION_FREE,
    // AC-9.1: "attempts at 0, >= 1s and >= 3s under the schedule" - up to 3 in the window.
    expectedSends: { min: 2, max: 3 },
  },
];
