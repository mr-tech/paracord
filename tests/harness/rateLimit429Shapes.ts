import type { ScriptedResponse } from './loopbackApiOrigin';

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

export const INFORMATION_FREE: ScriptedResponse = {
  status: 429,
  headers: { 'content-type': 'application/json' },
  body: { message: 'You are being rate limited.' },
};

export interface Shape {
  label: string;
  response: ScriptedResponse;
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
    expectedSends: { min: 2, max: 3 },
  },
];
