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
  a test. Two WP-9b additions on the same contract (real sockets, a port/count read as data, a
  named `waitFor*`, `close()`): `loopbackApiOrigin.ts` (a real `http` origin answering a scripted
  status/headers/body sequence, driven through `Api` — `createApiAgainstOrigin` redirects
  `Api`'s hardcoded REST base to it via `vi.doMock` + a dynamic `import()`, never by constructing
  `RateLimitHeaders` by hand, which cannot see `Api#updateRateLimitCache`) and
  `loopbackRpcServer.ts` (a real rate-limit `RpcServer` on `127.0.0.1:0`, with its `authorize`
  count exposed as data — counted by wrapping `rateLimitCache.authorizeRequestFromClient`,
  never by parsing its DEBUG log line). WP-5 step 3 adds to `loopbackApiOrigin.ts`: a
  destroy-on-accept mode (`setDestroyOnAccept`) that kills the TCP connection before any byte
  is written, and a `connectionCount` fed on the TCP-level `connection` event — distinct from
  `acceptCount`/`requestCount`, fed once a request's body has fully arrived (not on the
  HTTP-level `request` event that only starts the handler waiting for it), which the destroy
  mode never reaches at all — plus per-request `requestReceipts` (method, path, whether a body
  was received, the body itself, arrival order), fed on the same body-end event; the origin now
  consumes every request body to populate them (measured safe: the receipt count, connection
  count and client-visible status are unchanged either way). One consequence of the body-end
  feed: a send whose body is truncated mid-transfer is accepted at the TCP level but recorded by
  neither `acceptCount` nor `requestReceipts`. WP-6 step 3 adds to `loopbackRpcServer.ts`: a
  per-method withhold mode (`withhold`/`release`) — a withheld call reaches the handler, is
  counted, and then never calls back, so the stream stays open until the client's own deadline
  fires or the server is force-shut-down; it takes precedence over an injected fault and is
  installed the same way (before `addService` registers the real handler), so a withhold
  persists across the client's own recreate. **A withheld call must be torn down with
  `forceClose()`, never `close()`** — `close()` (`tryShutdown`) waits for every open stream to
  drain and does not resolve while one is held; using it on a withhold cell hangs the file, with
  no failing assertion to read. Also added: `clearFault` (undoes `injectFault`), and
  `helloCalls`/`waitForHello`, mirroring `updateCalls`/`waitForUpdate` at the same wrapper layer
  (before the withhold or fault check, so a withheld or faulted `hello` still counts as "reached
  the server" — distinct from `authorizeCalls`, which wraps the real rate-limit-cache call and
  so reads 0 under a withhold or fault on `authorize` even though the call did reach the server;
  the two counters feed on different events and neither reading is wrong for what it feeds on).
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
  cross-class close-origin handoff. `sharedScheduleGuard.test.ts` (AC-9.12) drives both
  `computeBackoffMs` consumers (`failureCounter.ts`, `rateLimitRetryTarget.ts`) against one
  literal bound per attempt, so the two curves cannot drift apart unnoticed. WP-5 step 2 adds
  `isServerErrorResponse.test.ts` and `isIdempotentMethod.test.ts` — the compound retry
  predicate's two conjuncts, each over its full domain (500..599 plus both boundaries; all 20
  method spellings) with no socket needed.
- `tests/gateway/` — integration tests against the *fixed* gateway state machine (WP-1 on), over
  real loopback sockets, on the real clock (time-seam rule, forms (b)/(c)).
- `tests/api/` — integration tests against `Api`'s 429 handling (WP-9b on), over both request
  paths (local, and RPC through a loopback rate-limit `RpcServer`, D-20), on the real clock
  (time-seam rule, forms (b)/(c)) and against the pure schedule/predicate functions where the
  criterion's own instrument is form (a) (`AC-9.1`'s membership predicate, `AC-9.8`'s reset rule).
  Also, as of WP-2: `Api`'s response to the RPC rate-limit service becoming unreachable
  (`rpcServiceLoss.test.ts`), over the fixed transport-failure set `isRpcTransportFailure`
  (`src/clients/Api/structures/`) closes over. As of WP-5: the 5xx/transport retry's method
  gate — `serverErrorTransport.test.ts` (AC-5.1, the transport class, instrument
  `connectionCount`) and `serverErrorRetry.test.ts` (AC-5.2, the method class and the
  conjunct/429-control checks, instrument `requestReceipts`; DELETE's body is stripped
  client-side, so the body-agreement clause has six spellings in its domain, not eight),
  `serverErrorSignal.test.ts` (AC-5.5, the gate-order property — the emit must not read the
  method before the count decides whether to fire) — and the information-free-schedule reset
  regression re-landed as a real, asserting spec (`serverErrorResetRegression.test.ts`,
  AC-5.2 (i)), replacing the recorder-only predecessor instrument qa found could not fail
  (WP5-F3). As of WP-6: the gRPC channel lifecycle — `rpcRecreateSingleFlight.test.ts`
  (AC-6.1, single-flight recreation and close-on-recreate, over the five reachable
  (site, kind) pairs), `rpcDeadlineFallback.test.ts` (AC-6.2 + AC-6.3, every deadline site
  with `allowFallback: true`, read from the same runs) and `rpcDeadlineNoFallback.test.ts`
  (AC-6.6, the same sites with `allowFallback: false`).

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
  `waitForResumable`/`waitForCondition`/`LoopbackGatewayServer#waitForAttempt`, not `setTimeout` —
  and, as of WP-9b, `LoopbackApiOrigin#waitForAccept`/`LoopbackRpcServer#waitForAuthorize`, and as
  of WP-2, `LoopbackRpcServer#waitForUpdate`. A fixed sleep stays the correct shape only for an
  *absence* assertion (nothing to wait on by event) — code review CR-31(a).

## The audit's four named harnesses (`TODO.md`, discharged by D-12)

| # | Harness | Status in this chain | Where |
| --- | --- | --- | --- |
| (i) | fake-`ws` harness: never-opened sockets, stuck-CONNECTING, late-handshake, session-preserving close | **Built** — real loopback sockets (`LoopbackGatewayServer`'s `reject503`/`hang`/`accept`+`acceptDelayMs` modes and `closeLiveSocket`/`dropLiveSocket`), not a fake `ws`. Two later additions to the same class: `sendDispatch(type, data, seq?)` (an arbitrary op-0 dispatch — chunk replay, AC-1.4/AC-1.12) and `sendRawBinary(bytes)` (a raw frame bypassing JSON encoding — a corrupt `zlib-stream` frame, AC-1.7; no server-side negotiation needed, since `identity.compress` is the client's own decision). | `tests/harness/loopbackGatewayServer.ts`; exercised by `tests/smoke/*.test.ts` and `tests/gateway/*.test.ts` |
| (ii) | 429 header table | **Built in WP-9b** — the 5-shape × 2-path fixture (`tests/api/rateLimit429.test.ts`) | `AC-9.1`/`AC-9.2`/`AC-9.3`/`AC-9.8`'s fixture, plan WP-9 |
| (iii) | authorize-path global-decrement test | **Not built** — M3 dropped (D-5); no remaining criterion reads it (plan §Scope) | — |
| (iv) | send-limiter test | **Not built** — M4 closed; no criterion consumes it (plan §Scope) | — |

## Running

- `npm test` — `vitest run`, all files under `tests/**/*.test.ts`.
- `npm run test:types` — type-checks `tests/` (`tsconfig.tests.json`), and the `src/` files it
  imports as dependencies, without emitting.
