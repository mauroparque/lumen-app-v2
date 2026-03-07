# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Session timeout (30 min)** via `useSessionTimeout` hook — auto sign-out tras inactividad; escucha 5 eventos DOM, integrado en `App.tsx` (SEC-11)
- **Schema validation en Firestore rules** — `isValidPatient()`, `isValidAppointment()`, `isValidPayment()` aplicadas en reglas `create`; desplegadas a Firebase (SEC-06)
- **"Estadísticas" en `MobileHeader`** — nuevo ítem de navegación (`BarChart3`) + indicador rojo de deuda pendiente en "Pagos" basado en `isOverdue()` (COMP-N01)
- **`subscribeToPayments`** en `IDataService` + `FirebaseService` — suscripción real-time a pagos scoped por `professionalName`; reemplaza el listener `subscribeToFinance` desperdiciado (ARCH-N03)
- **`commitInBatches()` helper** con `FIRESTORE_BATCH_LIMIT = 500` — aplicado en `addRecurringAppointments` y `deleteRecurringSeries` para respetar el límite de Firestore (ARCH-N06)
- **Firestore indexes config** (`firestore.indexes.json`) referenciado en `firebase.json`
- **Rate limiting** en `validateTurnstile` Cloud Function (SEC-N03)

### Changed

- **`saveNote`** reescrito con `writeBatch` — nota + `hasNotes: true` en el paciente en una sola operación atómica (ARCH-N05)
- **`completeTask`, `updateTask`, `toggleSubtaskCompletion`** reescritos con `runTransaction` — read-then-write atómico (ARCH-N04)
- **`DataContext`** ahora espera los 4 flags (patients, myAppointments, allAppointments, payments) para hacer `setLoading(false)` — con fallback de 10s para evitar loading infinito (ARCH-N07)
- **`useDataActions`** memoizado con `useMemo([service])` — previene recreación de 17 funciones por render (HOOK-N01)
- **`serverTimestamp`** movido de `useStaff` a `FirebaseService.createStaffProfile` — hook ya no importa de `firebase/firestore` directamente (HOOK-N02)
- **`usePatients`** wrapper trivial eliminado — 7 callers migrados a `useData()` directo (HOOK-N03)
- **`PSIQUE_RATE`** centralizado en `psiqueCalculations.ts` — duplicados eliminados de `useAgendaStats` y `PaymentsView` (HOOK-N04)
- **`calculateAge` e `isOverdue`** centralizados en `utils.ts` — duplicados eliminados de vistas (DUP)
- **Cloud Functions** migradas de `functions.config()` deprecado a `defineString` params v2; `BILLING_SECRET` usa Secret Manager vía `runWith({ secrets })` (SEC-N05)
- **PWA**: modo de actualización cambiado a `autoUpdate` + `skipWaiting` — garantiza activación inmediata del nuevo service worker sin interacción del usuario
- **Storage rules**: acceso a attachments ahora aplica RBAC por paciente

### Fixed

- **Firestore rules — permisos generales**: `getProfessionalName()` reforzado con null-check; nueva función `isProfessionalOf()` con fallback por email cuando el campos `name` del staff doc difiere — resolvía `permission-denied` en pagos y turnos
- **Firestore rules — `isPaid`**: actualización del campo `isPaid` ahora permitida para cualquier usuario autenticado (antes solo admin)
- **Firestore rules — `notes.update`**: soporte para notas legacy sin campo `createdByUid`
- **Firestore rules — `psiquePayments`**: escritura permitida para el propio profesional (antes solo admin)
- **Firestore rules — `isAdmin()`**: null-safe; regla de lectura de `notes` relajada a `isAuthenticated()`
- `addPayment`: validate `professionalName` antes del batch write; campo `professional` incluido en el documento de pago para RBAC (SEC ownership)
- `subscribeToPayments`: filtrado por `professionalName` — evita fuga de datos entre profesionales
- `calculateAge`: birthDate parseada como fecha local — corrige bug de UTC offset que producía edades erróneas
- `useSessionTimeout`: Promise de `signOut` manejada correctamente; ref limpiada tras disparar
- `AuthScreen`: errores de Firebase Auth mapeados a mensajes en español vía `getAuthErrorMessage()` — ya no expone códigos crudos de Firebase al usuario (SEC-13)
- `SidebarItem`: props tipadas explícitamente con `interface SidebarItemProps` — elimina `any` (COMP-N02)
- `MobileHeader`: indicador de deuda usa `isOverdue()` centralizado — consistente con el sidebar
- Billing queue: datos sanitizados con campo whitelist antes de enviar al webhook (SEC-N02)
- Storage rules: límite de tamaño de archivo (10 MB) y validación de tipo MIME (SEC-07)
- `deletePayment` eliminado de la capa de servicio — bloqueado por reglas Firestore; era dead code (ARCH-N01)
- `addPayment`: respeta el campo `date` de `PaymentInput`, fallback a `Timestamp.now()` (ARCH-N02)
- `psiquePayments`: escritura restringida a admin (SEC-N01)
- Turnstile: fallback por timeout con retry automático; recarga de página si el widget nunca carga (sin bypass silencioso)

### CI

- Workflow de GitHub Actions actualizado para redeploy en Coolify vía webhook (con headers de Cloudflare)

---

## [1.1.0] - 2026-02-26

### Added

- **Bundle splitting** via `manualChunks` in Vite — chunk principal reducido de 693KB a 29.65KB con chunks separados para Firebase, React y UI vendors (BUILD-01)
- **Accesibilidad en `ModalOverlay`** — `role="dialog"`, `aria-modal`, `aria-label`, focus trap (Tab/Shift+Tab), Escape key, save/restore focus (A11Y-01)
- **`subscribeToBillingStatus`** en `IDataService` + `FirebaseService` — suscripción real-time al estado de facturación (ARCH-01)
- **`BillingStatusData` type** en `src/types/index.ts` — tipo tipado para estados de billing queue
- **50 tests unitarios para `FirebaseService`** con mocks de Firestore — coverage 88% statements, 78% functions (TEST-01)
- **ESLint 9 flat config** con `@typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` + integración con Prettier (LINT-01)
- **Prettier** `.prettierrc` con defaults opinados — `singleQuote`, `tabWidth: 4`, `printWidth: 100`
- **Nuevos scripts npm**: `lint`, `lint:fix`, `format`, `format:check`, `type-check` (`tsc --noEmit`), y `ci` (`lint + format:check + type-check + test + build`) (TSC-01)
- **`ErrorBoundary` global** via `react-error-boundary` envolviendo Suspense en `App.tsx` — previene crashes silenciosos por chunk-load failures
- **Vitest v8 coverage** con thresholds de scope reducido (lines/functions/statements: 80%, branches: 60%) — scope crece incrementalmente
- **14 nuevos métodos en `IDataService`**: `subscribeToClinicalNote`, `subscribeToPatientNotes`, `saveNote`, `updateNote`, `uploadNoteAttachment`, `subscribeToAllNotes`, `completeTask`, `addTask`, `updateTask`, `toggleSubtaskCompletion`, `subscribeToPsiquePayments`, `markPsiquePaymentAsPaid`, `subscribeToPatientAppointments`, `subscribeToPatientPayments` — todos implementados en `FirebaseService` (ARCH-01)
- **`updateTask` y `toggleSubtaskCompletion`** wrappers en `useDataActions` con guard de disponibilidad del servicio
- **Tests unitarios**: `useAgendaStats.test.ts` (6 tests), `IDataService.test.ts` (mock factory + completeness), `usePendingTasks.test.ts` (8 tests), `psiqueCalculations.test.ts` — 92 tests en 6 archivos (TEST-01)

### Changed

- **Recálculo automático de ventana de datos** en `DataContext` — `visibilitychange` + intervalo 4h previenen stale data en sesiones largas PWA (DATA-01)
- **`useBillingStatus` migrado a `IDataService`** — ya no importa `firebase/firestore` directamente (ARCH-01)
- **`useStaff` migrado a `IDataService`** — usa `service.subscribeToStaffProfile` vía `ServiceContext` (ARCH-01)
- **Provider tree reestructurado en `App.tsx`** — nuevo patrón `StaffGate` + `AuthenticatedApp` permite que `useStaff` acceda a `ServiceContext` antes de obtener el perfil (ARCH-01)
- **`useClinicalNotes`** reescrito como dos hooks top-level independientes `useClinicalNote(appointmentId)` y `usePatientNotes(patientId)` — corrige violación de Rules of Hooks (HOOK-01)
- **Migración de acceso directo a Firestore** en: `usePendingTasks`, `usePsiquePayments`, `usePatientData`, `AddTaskModal`, `TasksView` — 0 imports directos de `firebase/firestore` en archivos migrados (ARCH-01)
- **ESLint config simplificado** — ~40 globals browser declarados manualmente reemplazados por `globals.browser` + `globals.es2021`
- **`.gitignore`** actualizado para excluir artefactos de test: `playwright-report/`, `test-results/`, `.worktrees/`
- **Coverage scope ampliado** a 5 archivos (agrega `FirebaseService.ts`) — 92 tests en 6 archivos
- **`psiqueCalculations`** extraído a `src/lib/psiqueCalculations.ts` con función pura `calculatePsiqueMonthData`

### Fixed

- `usePsiquePayments`: eliminados 3 escapes innecesarios en regex — resuelve errores `no-useless-escape`
- `TasksView`: `handleUpdateTask` reducido de 17 a 5 líneas — delega a `IDataService` vía `useDataActions`
- `AppointmentDetailsModal`: previene doble-submit en guardado de notas
- `usePendingTasks`: tracking real del estado de loading
- `FirebaseService`: `subscribeToAllNotes` scoped por `createdByUid`; `addTask` alineado con modelo `ClinicalNote`
- `tasks`: agrega `createdByUid` al payload de `TaskInput` — corrige validación de ownership

### Docs

- Auditoría de calidad post-4 fases (26/02/2026) — score C+ → B+, 34 ítems de deuda técnica documentados

---

## [1.0.0] - 2026-02-20

### Added

- **RBAC Firestore rules** with role-based access control — `admin`, `professional`, and `staff` roles with scoped permissions (SEC-01)
- **Allowlist-based onboarding** replacing previous auto-admin provisioning — only pre-approved emails can register (SEC-02)
- **Server-side Turnstile validation** via `validateTurnstile` Cloud Function — bot protection verified before Firebase Auth login (SEC-03)
- **Strict Content Security Policy** — removed `unsafe-eval`, whitelisted Firebase/Turnstile domains (SEC-04)
- Caching headers in `firebase.json` for static assets
- `AllowedEmail` type and centralized collection routes in `src/lib/routes.ts`
- Allowlist seed script (`scripts/seed-allowlist.ts`) for bootstrapping staff emails in Firestore
- `.env.example` documenting all required environment variables

### Fixed

- Declared `TURNSTILE_SECRET` in Cloud Function `secrets` option — critical for runtime secret access
- Clarified staff Firestore rules — replaced broad `write+create` with explicit `create`, `update`, `delete`
- Moved `getFunctions()` call to module level in `AuthScreen` — was re-initialized on every form submit
- Removed `firebase-admin` from frontend `devDependencies` — belongs only in `functions/` and seed scripts
- Cleaned `index.html` — removed mock globals, added `preconnect` hints, corrected meta tags
- Seed script auto-detects `projectId` from service account credentials
- Relax `notes` Firestore read rule to `isAuthenticated()` — previous rule caused `permission-denied` on app load and Notes view ([a088f08](https://github.com/mauroparque/lumen-app-v2/commit/a088f08))
- Add `createdByUid: user.uid` to note creation payload — previous field stored `displayName` instead of UID, so ownership check never matched ([a088f08](https://github.com/mauroparque/lumen-app-v2/commit/a088f08))
- Guarantee non-null `createdBy` using `user.email ?? user.uid` — `displayName` and `email` are nullable in Firebase ([705152a](https://github.com/mauroparque/lumen-app-v2/commit/705152a))
- Preserve `createdBy`/`createdByUid` on note update — ownership fields set only on creation to prevent edits from overwriting authorship ([705152a](https://github.com/mauroparque/lumen-app-v2/commit/705152a))

### Security

- Removed 25 npm vulnerabilities in `functions/` by dropping unused `firebase-functions-test`
- Upgraded `axios`, `fast-xml-parser`, `jws`, `qs` to patched versions (CVE fixes via `npm audit fix`)
- Eliminated `unsafe-eval` from CSP — all scripts require nonce-based authorization
- Server-side Turnstile validation prevents bot and replay attacks on the authentication flow

[Unreleased]: https://github.com/mauroparque/lumen-app-v2/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/mauroparque/lumen-app-v2/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/mauroparque/lumen-app-v2/releases/tag/v1.0.0
