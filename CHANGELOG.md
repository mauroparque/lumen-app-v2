# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-02-20

### Added

- **RBAC Firestore rules** with role-based access control — admin, professional, and staff roles with scoped permissions ([SEC-01](https://github.com/mauroparque/lumen-app-v2/commit/ebd42c085c54df5708c7dc72f06ffcf7d66d5658))
- **Allowlist-based onboarding** replacing previous auto-admin provisioning — only pre-approved emails can register ([SEC-02](https://github.com/mauroparque/lumen-app-v2/commit/26513069c006f9dad3dabe3be3c412d5ce6a54d9))
- **Server-side Turnstile validation** via `validateTurnstile` Cloud Function — bot protection before Firebase Auth login ([SEC-03](https://github.com/mauroparque/lumen-app-v2/commit/23d8950e98cc163eae1a534f2f6ef8f738ecb180), [03c661b](https://github.com/mauroparque/lumen-app-v2/commit/03c661b3a3b80acd6fdd9e0a2d72a5ad78dd847e))
- **Strict Content Security Policy** — removed `unsafe-eval`, added `nonce` support, Firebase/Turnstile domains whitelisted ([SEC-04](https://github.com/mauroparque/lumen-app-v2/commit/a7974eb2da74b6aa9a64d5ad6ed0e278a74d1a6d))
- **Caching headers** in `firebase.json` for static assets ([a7974eb](https://github.com/mauroparque/lumen-app-v2/commit/a7974eb2da74b6aa9a64d5ad6ed0e278a74d1a6d))
- `AllowedEmail` type and centralized collection routes in `src/lib/routes.ts` ([cfc4997](https://github.com/mauroparque/lumen-app-v2/commit/cfc49979609dd726651fb5816d85f085487c15e7))
- Allowlist seed script (`scripts/seed-allowlist.ts`) for bootstrapping staff emails in Firestore ([f1e7b28](https://github.com/mauroparque/lumen-app-v2/commit/f1e7b28d79506ec3dce8e17c25dbbffa38e94330))
- `.env.example` documenting all required environment variables ([900ff5a](https://github.com/mauroparque/lumen-app-v2/commit/900ff5a11a9509921f9400390ed71e235795288f))

### Fixed

- Declared `TURNSTILE_SECRET` in Cloud Function `secrets` option — critical for runtime access ([0108682](https://github.com/mauroparque/lumen-app-v2/commit/01086824224810f00b8a718b173bdc5099efeeae))
- Clarified staff Firestore rules — replaced broad `write+create` with explicit `create`, `update`, `delete` rules ([017e6b6](https://github.com/mauroparque/lumen-app-v2/commit/017e6b63cb959917391297322c47f45a29a092f0))
- Moved `getFunctions()` call to module level in `AuthScreen` to avoid re-initialization on every form submit ([ac4df38](https://github.com/mauroparque/lumen-app-v2/commit/ac4df38ec05fde6588e32713df48c7835547fa67))
- Removed `firebase-admin` from frontend `devDependencies` — belongs only in `functions/` and seed scripts ([5298cc8](https://github.com/mauroparque/lumen-app-v2/commit/5298cc8727d30c029503f0253b382168c00fa2ab))
- Cleaned `index.html` — removed mock globals, added `preconnect` hints, fixed meta tags ([166a733](https://github.com/mauroparque/lumen-app-v2/commit/166a73379c99fb65b5d21d32a9808703a27b3b17))
- Seed script auto-detects `projectId` from service account credentials ([ac52822](https://github.com/mauroparque/lumen-app-v2/commit/ac52822688553f26b06c3c1b5dd076a33aa29493))

### Security

- Removed 25 npm vulnerabilities in `functions/` by dropping unused `firebase-functions-test` and running `npm audit fix` ([b74cb7c](https://github.com/mauroparque/lumen-app-v2/commit/b74cb7c198b8c85c9478b171650ff45765bbd717))
- Upgraded `axios`, `fast-xml-parser`, `jws`, `qs` to patched versions (CVE fixes)
- Eliminated `unsafe-eval` from CSP — all scripts now require nonce-based authorization
- Server-side Turnstile validation prevents bot/replay attacks on authentication

[Unreleased]: https://github.com/mauroparque/lumen-app-v2/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/mauroparque/lumen-app-v2/compare/cfc49979609dd726651fb5816d85f085487c15e7~1...v1.0.0
