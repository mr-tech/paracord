/**
 * `WeakKey` (the constraint TypeScript's own `lib.es2015.collection.d.ts` gives
 * `WeakSet`/`WeakMap`/`WeakRef`) was added to the bundled lib in TypeScript 5.4; this
 * workspace's installed compiler is 5.1.6, whose libs don't define the name, and
 * `@vitest/utils/dist/diff.d.ts` references it unconditionally. Declared here matching
 * the upstream definition exactly, so that declaration file type-checks under 5.1.6.
 */
type WeakKey = object;
