# Tests

TypeScript under `tests/`, type-checked separately from the production build
(`tsconfig.tests.json`, `npm run test:types`) and executed by vitest (`npm test`). Never swept
into `tsc -b`/`dist/` — `tsconfig.json`'s `include: ["src"]` keeps the production build scoped to
`src/`. `tests/`, `tsconfig.tests.json` and `vitest.config.mts` never reach the published package:
`package.json`'s `files` allowlist names only `dist`, `llms.txt` and `llms-full.txt`, so anything
outside that set is excluded regardless of `.npmignore` or `.gitignore`.

`tsconfig.tests.json`'s `include` is exactly `["tests"]` — `src/`'s files are still type-checked as
the dependencies tests import, but `src/`'s one compilation authority stays `tsconfig.json`/
`tsc -b`; `test:types` is not a second, weaker recompilation of it. `skipLibCheck` is not set.
Two dependency declaration-file failures surface under this program and are handled narrowly
rather than by widening `skipLibCheck`:

- `@grpc/proto-loader`'s `import Long = require('long')` resolves, under this project's
  `moduleResolution: "bundler"`, to a `long` declaration incompatible with how the generated
  `@grpc/grpc-js` types use it (32 `TS2709` errors, all in `node_modules`). Fixed by a `paths`
  override in `tsconfig.tests.json` redirecting `long` to its UMD declaration file — the same one
  classic module resolution already picks, so this restores that behaviour rather than adding one.
- `@vitest/utils/dist/diff.d.ts` references the `WeakKey` type unconditionally; TypeScript added
  `WeakKey` to its bundled libs in 5.4, and this project pins `typescript@^5.1.6`. Fixed by
  `tests/types/weakkey-shim.d.ts`, declaring `type WeakKey = object` to match the upstream
  definition — one file, one dependency, one reason.

## Placement

- `tests/harness/` — reusable fixtures against real loopback sockets (no fake `ws`; see
  `loopbackGatewayServer.ts`'s doc comment) and the named-condition waits (`waitFor.ts`, WP-1 step
  0) every test in this chain uses instead of a fixed sleep. Shared across test files, not itself
  a test.
- `tests/fixtures/` — standalone scripts a test forks as a child process, for a case that would
  otherwise crash its host (`.cjs`, run by `node` directly — not part of the TypeScript program a
  vitest worker transforms).
- `tests/smoke/` — one file per subsystem behaviour a harness must reproduce against **unfixed**
  HEAD, proving the harness works before any fix package uses it (plan `001-audit-live-findings`,
  WP-0 step 4). A later WP's own regression tests are not smoke tests and do not belong here —
  `tests/gateway/`, below, is where WP-1's own tests against the *fixed* gateway landed; two of
  WP-0's four original smoke tests (the 503-loop rate and the CONNECTING `close()` inertness) are
  retired as of WP-1, since both assert unfixed-HEAD behaviour that WP-1 changed by design — their
  properties are carried forward, fixed, in `tests/gateway/reconnect-backoff.test.ts` and
  `tests/gateway/close-connecting.test.ts` respectively. The other two (`hung-handshake-destroy`,
  `session-preserving-close`) are unaffected by WP-1 and remain as regression guards.
- `tests/unit/` — arithmetic on a pure schedule or predicate, no sockets and no timers real or
  fake (time-seam rule, form (a)): the backoff schedule function, the failure counter, the
  cross-class close-origin handoff.
- `tests/gateway/` — integration tests against the *fixed* gateway state machine (WP-1 on), over
  real loopback sockets, on the real clock (time-seam rule, forms (b)/(c)).

## Naming and test-form conventions

- **Spec-form by default**: a test states what the surface does, not the absence of a past bug.
- **Bug-form only for an escaped defect** — one that reached the owner, a release, or another
  surface (GLOSSARY, "escaped defect") — marked with a comment naming the artefact that recovered
  it: `// escaped: <path>`. The 503 reconnect loop is escaped via the owner's own report
  (`// escaped: agent-output/user-files/_TODO.txt, owner report 2026-09-03`) — its regression test
  is `tests/gateway/reconnect-backoff.test.ts` as of WP-1 (retired from `tests/smoke/`, above).
- A fixture that reproduces the loop **must first drive a successful `READY`** (`session_id` and
  `resume_gateway_url` set) before failing the host — a fresh, never-connected gateway loops at
  1 Hz through the normal login queue and passes vacuously at unfixed HEAD (A-1 §A-1.6; plan
  Assumption 4).
- **No fixed sleep for a condition the harness can observe** (WP-1 step 0): wait on
  `waitForResumable`/`waitForCondition`/`LoopbackGatewayServer#waitForAttempt`, not `setTimeout`.

## The audit's four named harnesses (`TODO.md`, discharged by D-12)

| # | Harness | Status in this chain | Where |
| --- | --- | --- | --- |
| (i) | fake-`ws` harness: never-opened sockets, stuck-CONNECTING, late-handshake, session-preserving close | **Built** — real loopback sockets (`LoopbackGatewayServer`'s `reject503`/`hang`/`accept`+`acceptDelayMs` modes and `closeLiveSocket`/`dropLiveSocket`), not a fake `ws`. Two later additions to the same class: `sendDispatch(type, data, seq?)` (an arbitrary op-0 dispatch — chunk replay, AC-1.4/AC-1.12) and `sendRawBinary(bytes)` (a raw frame bypassing JSON encoding — a corrupt `zlib-stream` frame, AC-1.7; no server-side negotiation needed, since `identity.compress` is the client's own decision). | `tests/harness/loopbackGatewayServer.ts`; exercised by `tests/smoke/*.test.ts` and `tests/gateway/*.test.ts` |
| (ii) | 429 header table | **Built in WP-9b** (not this package) | `AC-9.3`'s fixture, plan WP-9 |
| (iii) | authorize-path global-decrement test | **Not built** — M3 dropped (D-5); no remaining criterion reads it (plan §Scope) | — |
| (iv) | send-limiter test | **Not built** — M4 closed; no criterion consumes it (plan §Scope) | — |

## Running

- `npm test` — `vitest run`, all files under `tests/**/*.test.ts`.
- `npm run test:types` — type-checks `tests/` (`tsconfig.tests.json`), and the `src/` files it
  imports as dependencies, without emitting.
