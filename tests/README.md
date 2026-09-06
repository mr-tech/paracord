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
  WP-7 step 6 adds to `loopbackRpcServer.ts`: **`startRequestService`'s `origin` parameter**
  (qa WP7-F4's arm M2, the only mechanism measured to reach a controllable origin at all — the
  pattern every prior `startRequestService` consumer used, a static import of the harness before
  `createApiAgainstOrigin`, reaches Discord's real API live) — when given, `server.apiClient` is
  **overwritten after `addRequestService` registers**, with an `Api` built the same way
  `createApiAgainstOrigin` builds any other test-only client, pointed at `origin` instead of
  Discord. A cell that wants a real proxied forward to land somewhere controllable passes `origin`
  here; there is deliberately no other way to reach it, so the unsafe pattern has nowhere to be
  written by accident. Also added: a **forward-then-fail**/**forward-then-withhold** mode
  (`forwardThenFail`/`clearForwardThenFail`, `forwardThenWithhold`/`clearForwardThenWithhold`) —
  unlike `injectFault`/`withhold`, the real handler runs to completion (a genuine forward reaches
  whatever `apiClient` is wired to, counted like any other request) before the client is answered
  with the trigger code or left to its own deadline; a withheld forward is torn down with
  `forceClose()`, same as a plain withhold. Per-party attribution at the origin (WP7-F2) needs no
  new harness mechanism: `startRequestService`'s `apiOptions` already reaches
  `Api.createWrappedRequestMethod`, which spreads `requestOptions.headers` into every outgoing
  request, so a test tags the proxy's own `Api` (`{ requestOptions: { headers: { 'x-wp7-party':
  'proxy' } } }`) and reads `LoopbackApiOrigin#receivedHeaders` directly — already fed in step
  with `requestReceipts`, nothing added there either.
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
  method spellings) with no socket needed. WP-7 step 2 adds `responseMessageTolerance.test.ts`
  (AC-7.1/AC-7.2) — `ResponseMessage.fromProto`'s decode: every shape singly encoded (new server)
  and, doubly encoded (old server, reproduced by formula), the `{object, array, null}` recovery
  set and the permanent ambiguous residue (a genuine string whose text is valid JSON of a
  non-string type mis-decodes on every pairing, named rather than left silent).
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
  (AC-6.6, the same sites with `allowFallback: false`). As of WP-7 (steps 1-6): the request-proxy
  path — `rpcProxyResponseShape.test.ts` (AC-7.1, every JSON body shape including the falsy/empty
  members the server-side presence check keys on, proxied vs. local); `rpcProxyRequestOptions.test.ts`
  (AC-7.3, `params`/`returnOnRateLimit`/`returnOnGlobalRateLimit`/`maxRateLimitRetry`/`createForm`
  crossing the wire); `rpcProxyResendGate.test.ts` (AC-7.6, D-49 — the fallback re-send's method
  gate, forward-then-fail/forward-then-withhold, per-party origin attribution, and the compound
  predicate's controls: C-A an out-of-set code, C-B the latched branch, C-C a clean call). The
  (old server, new client) pairing (AC-7.2) is covered instead at `tests/unit/`, below — the old
  server's double encoding is reproduced by formula (`JSON.stringify(JSON.stringify(value))`,
  the exact transform its frozen code performs), not by running its archived code in-process;
  qa's Phase 2 owns any further `git archive`-based pairing rig.

## Timeout / time-based cells removed (owner ruling, superseding D-50/D-52; no plan text)

**This section supersedes the "Suite guard withdrawn, then restored" record below it in this
file's own history** (kept as a closed chapter at the end of this section rather than deleted,
since it explains why the same five files appear twice). D-50 commented fourteen cells out; D-52
restored them at WP-7 step 10 (`4992e81`). Both were plan-text decisions with a criterion behind
them. This is neither: the owner's ruling has no criterion, no step and no plan revision — the
planner is stood down for the rest of this effort and he declined to lift it for this. His words,
verbatim and entire, given as two messages minutes apart:

> "I reject all timeout / time-based tests. The[y] can run during the fulfillment of a milestone
> to confirm behavior, and then must be removed after the milestone completion."
>
> "They can also run once right before declaring the code deployable if must-be."

**The one constraint his own amendment adds**: these cells may run once more, right before the
code is declared deployable, if that becomes necessary. Removal is by plain deletion (not
comment-out) precisely because git history is the recovery path for that one-more-run, and D-50's
comment-out/restore pair is not repeated here — this implementer was told deletion forecloses the
iff-both-directions audit comment-out/restore gave AC-7.7/AC-7.10 (a), and to record what is lost
rather than try to preserve it.

**The rule applied** (the load-bearing judgement is the implementer's; the owner's two sentences
name no test by name): a cell is *timeout / time-based* if the property it verifies is defined in
terms of real elapsed wall-clock time during the test's own run — a backoff schedule's growth, a
deadline's expiry, a heartbeat-ack timeout's firing count, a rate-limit window's real-time
boundary — **regardless of whether the test measures that behaviour via a real sleep or a virtual
clock jump**. A cell is *not* time-based merely because it uses `setTimeout` or `waitForCondition`
as a mechanism to wait for a state change or settle a buffer before asserting a value; there the
timeout is a failure budget, not the property under test.

Cells removed by this rule, all on `chain-001`, this ruling's commit:

| File | Cells removed | Criteria losing their instrument (text stays; the cells verified it once and are gone) |
| --- | --- | --- |
| `tests/gateway/reconnect-backoff.test.ts` | 2 (whole file) | AC-1.1 (b) |
| `tests/gateway/resume-host-abandonment.test.ts` | 3 (whole file) | AC-1.10 (b) |
| `tests/gateway/end-releases-timers.test.ts` | 4 (whole file) | AC-1.6 |
| `tests/api/informationFreeBackoff.test.ts` | 3 (whole file) | AC-9.8 (b), incl. its `maxRateLimitRetry` clause |
| `tests/api/serverErrorResetRegression.test.ts` | 2 (whole file) | AC-5.2 (i) |
| `tests/gateway/heartbeat-veto.test.ts` | 2 (whole file) | AC-1.5 |
| `tests/api/rpcDeadlineFallback.test.ts` | 7 (whole file) | AC-6.2 (the `allowFallback: true` deadline sites), WP6-F10's regression guard, the SL-1/SL-2 substitute readings |
| `tests/api/rpcDeadlineNoFallback.test.ts` | 4 (whole file) | AC-6.2 (the `allowFallback: false` arm), D-43's latch-timing reading |
| `tests/api/rateLimit429.test.ts` | 10 of 20 (the `AC-9.1` describe block only) | AC-9.1 (send counts inside a real 4.5s window) — AC-9.2's two describe blocks are untouched: they read a cache/queue decision against `vi.setSystemTime`, not against a real wait, and keep their instrument |
| `tests/api/rpcProxyResendGate.test.ts` | 2 of 17 (the `forward-then-withhold` describe only) | AC-7.6's code-4/deadline trigger-code member — the {14, 1, 13} members and every control keep their instrument |
| `tests/api/rpcRecreateSingleFlight.test.ts` | 1 of 10 (one cell) | WP6-F9's real-timing-discriminated cell (the "stale rejection" case) — the sibling "stale success" cell (WP6-F9's other mutant, M9) is fully mocked with no real time and stays; WP6-F9 keeps a partial guard, not none |

**Total: 40 cells across 11 files** (8 files emptied entirely and deleted outright — a file with
every cell removed left no test behind to keep it alive as a `.test.ts`, and vitest v4 errors a
suite with zero collected tests rather than passing it vacuously, which is the same reason step 7
needed an `it.skip` placeholder it does not get to use this time since there is nothing being kept
green in these eight); 3 files partially edited, every other cell in them untouched.

**Deliberately not removed, read against the same rule and named so an omission is not mistaken
for one**: `tests/gateway/chunk-ttl.test.ts` (AC-1.12) tests a TTL — a time-bounded property in
substance — entirely via `vi.setSystemTime` clock jumps, never a real wait, so it costs no real
time and carries none of the flakiness-under-contention risk the real-clock tests above do; kept
on that basis, not overlooked. `tests/gateway/close-matrix.test.ts`, `chunk-state.test.ts`,
`corrupt-zlib-frame.test.ts`, `close-connecting.test.ts`, `close-invalid-wire-code.test.ts`, both
`smoke/` files, `rpcServiceLoss.test.ts`, `rpcCacheUpdateRecreateFailure.test.ts`,
`globalRateLimitSibling.test.ts`, `serverErrorRetry.test.ts`, `serverErrorTransport.test.ts` and
`serverErrorSignal.test.ts` all use a fixed real sleep only as a settle buffer or a
`waitForCondition` polling bound — a failure budget, never the value under test — and keep their
cells. Every `tests/unit/` arithmetic form (`backoffSchedule`, `failureCounter`,
`rateLimitRetryTarget`, `sharedScheduleGuard`) computes a schedule value synchronously with no real
or virtual clock involved at all and was never a candidate.

### Prior history, closed by this section: Suite guard withdrawn, then restored (D-50 → D-52)

At WP-7 step 7 the same five gateway/backoff cells above were commented out under D-50, then
restored at step 10 under D-52 (`4992e81`) once the suite's actual pole (`close-matrix.test.ts`)
was made concurrent and the cut's cost was read on both sides of it — both plan-text decisions,
both with a criterion (AC-7.7, AC-7.10) behind them. That episode is now superseded by the ruling
above: those five files are gone again, this time by deletion under an owner ruling with no plan
text, and AC-7.7/AC-7.10 (a) no longer describe a suite that exists. The full quoted rulings for
D-50 and D-52 are in `steering/001-rulings.md` (`007f65c`, `114168a`, `998496b`) and the plan's
Decisions Register; not restated here a third time.

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
