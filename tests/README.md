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
  `loopbackGatewayServer.ts`'s doc comment). Shared across test files, not itself a test.
- `tests/fixtures/` — standalone scripts a test forks as a child process, for a case that would
  otherwise crash its host (`.cjs`, run by `node` directly — not part of the TypeScript program a
  vitest worker transforms).
- `tests/smoke/` — one file per subsystem behaviour a harness must reproduce against **unfixed**
  HEAD, proving the harness works before any fix package uses it (plan `001-audit-live-findings`,
  WP-0 step 4). A later WP's own regression tests are not smoke tests and do not belong here.

## Naming and test-form conventions

- **Spec-form by default**: a test states what the surface does, not the absence of a past bug.
- **Bug-form only for an escaped defect** — one that reached the owner, a release, or another
  surface (GLOSSARY, "escaped defect") — marked with a comment naming the artefact that recovered
  it: `// escaped: <path>`. The one bug-form fixture in this suite today is the 503 reconnect loop
  (`tests/smoke/reconnect-loop.smoke.test.ts`), escaped via the owner's own report:
  `// escaped: agent-output/user-files/_TODO.txt, owner report 2026-09-03`.
- A fixture that reproduces the loop **must first drive a successful `READY`** (`session_id` and
  `resume_gateway_url` set) before failing the host — a fresh, never-connected gateway loops at
  1 Hz through the normal login queue and passes vacuously at unfixed HEAD (A-1 §A-1.6; plan
  Assumption 4).

## The audit's four named harnesses (`TODO.md`, discharged by D-12)

| # | Harness | Status in this chain | Where |
| --- | --- | --- | --- |
| (i) | fake-`ws` harness: never-opened sockets, stuck-CONNECTING, late-handshake, session-preserving close | **Built** — real loopback sockets (`LoopbackGatewayServer`'s `reject503`/`hang`/`accept`+`acceptDelayMs` modes and `closeLiveSocket`/`dropLiveSocket`), not a fake `ws` | `tests/harness/loopbackGatewayServer.ts`; exercised by `tests/smoke/*.test.ts` |
| (ii) | 429 header table | **Built in WP-9b** (not this package) | `AC-9.3`'s fixture, plan WP-9 |
| (iii) | authorize-path global-decrement test | **Not built** — M3 dropped (D-5); no remaining criterion reads it (plan §Scope) | — |
| (iv) | send-limiter test | **Not built** — M4 closed; no criterion consumes it (plan §Scope) | — |

## Running

- `npm test` — `vitest run`, all files under `tests/**/*.test.ts`.
- `npm run test:types` — type-checks `tests/` (`tsconfig.tests.json`), and the `src/` files it
  imports as dependencies, without emitting.
