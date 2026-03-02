# Revisión de Cierre — Fase 5: Seguridad y Arquitectura (Prioridad Alta)

**Fecha de revisión:** 1 de marzo de 2026

**Fase:** Phase 5 — Seguridad y Arquitectura: Prioridad Alta

**Rama analizada:** `main` (16 commits desde `v1.1.0`, 9 archivos de código, +190/-68)

**Auditoría de referencia:** [`docs/audits/2026-02-26_AUDIT.md`](../audits/2026-02-26_AUDIT.md)

**Plan ejecutado:**

- [`docs/plans/2026-02-26-phase5-high-priority-security-architecture.md`](../plans/2026-02-26-phase5-high-priority-security-architecture.md) — Plan principal (6 tasks)

**Revisión anterior:** [`docs/reviews/2026-02-26_phase4-completion-review.md`](../reviews/2026-02-26_phase4-completion-review.md)

---

## Veredicto: FASE 5 COMPLETADA ✓

## Resumen Ejecutivo

La Fase 5 resolvió los 6 hallazgos de prioridad alta identificados en la auditoría post-4 fases: 4 de seguridad (psiquePayments RBAC, storage limits + MIME validation, sanitización de billing queue, rate limiting en validateTurnstile) y 2 de arquitectura (eliminación de `deletePayment` muerto, fix de `addPayment` para respetar `date` del input). Además, durante la revisión de PR se introdujeron 2 mejoras adicionales no planificadas: RBAC per-patient en Storage rules y null-safety en `isAdmin()` de Firestore rules.

---

## Verificación por hallazgo

| Issue        | Hallazgo                                                              | Estado       | Solución implementada                                                                                                                                                                              |
| ------------ | --------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEC-N01**  | `psiquePayments` sin RBAC — cualquier autenticado podía escribir      | **Resuelto** | `firestore.rules`: `write` restringido a `isAuthenticated() && isAdmin()`. `read` mantiene `isAuthenticated()` — necesario para vista de pagos por profesional. Commit `5f6ee3a`                   |
| **SEC-07**   | Storage rules sin límites de tamaño ni tipo                           | **Resuelto** | `storage.rules`: 10MB máximo + whitelist de MIME types (image/\*, PDF, Word, text/plain). Commit `3dada85`                                                                                         |
| **SEC-N02**  | `triggerInvoiceGeneration` hace spread `...data` sin sanitizar        | **Resuelto** | Whitelist explícita de 11 campos permitidos en `functions/src/index.ts`. Commit `3b25fc8`                                                                                                          |
| **ARCH-N01** | `deletePayment` existe en código pero Firestore rules lo bloquean     | **Resuelto** | Eliminado de `IDataService`, `FirebaseService`, `useDataActions`, y tests. `deleteDoc` import mantenido (usado por `deletePatient`/`deleteAppointment`). Commit `37fee2c`                          |
| **ARCH-N02** | `addPayment` descarta `date` del input, siempre usa `Timestamp.now()` | **Resuelto** | Implementación: `payment.date instanceof Timestamp ? payment.date : Timestamp.now()`. 2 tests nuevos. Commits `ad502f8`, `707157a`                                                                 |
| **SEC-N03**  | `validateTurnstile` sin rate limiting ni App Check                    | **Parcial**  | Rate limiting in-memory implementado (5 req/min por IP). App Check preparado con `enforceAppCheck: false` + TODO documentado — requiere configuración previa en Firebase Console. Commit `7e14258` |

---

## Cambios adicionales (fuera del plan)

Durante el proceso de PR y merge se introdujeron mejoras adicionales no contempladas en el plan original:

| Commit    | Descripción                                                                                                                                                                                 | Impacto                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `b20ee56` | **Storage RBAC per-patient** — read solo para staff activo, write solo para admin o profesional owner del paciente. Usa `firestore.get()` para resolver staff y patient docs.               | Seguridad: cierra vector de acceso cross-patient a adjuntos |
| `07f985f` | **Firestore rules fixes** — (1) Revert notes read a `isAuthenticated()` porque queries por appointmentId/patientId fallaban; (2) `isAdmin()` null-safe: guarda contra staff doc inexistente | Estabilidad: previene errores en evaluación de reglas       |
| `471458a` | Fix typo en comentario de storage.rules ("dedocs" → "de docs")                                                                                                                              | Calidad: corrección menor de documentación en código        |
| `7f5719a` | Sugerencia aplicada desde PR review                                                                                                                                                         | Calidad                                                     |

---

## Verificación de tareas — Plan principal (6 tasks)

### Task 1: Restringir `psiquePayments` a admin (SEC-N01)

| Aspecto                                  | Estado | Detalle                                                                    |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------- |
| Regla `write` restringida a admin        | ✅     | `allow write: if isAuthenticated() && isAdmin();` en `firestore.rules` L88 |
| Regla `read` mantiene acceso autenticado | ✅     | `allow read: if isAuthenticated();` — necesario para `usePsiquePayments`   |
| Commit                                   | ✅     | `5f6ee3a` — mensaje convencional correcto                                  |

### Task 2: Storage rules — tamaño y MIME (SEC-07)

| Aspecto                  | Estado | Detalle                                                                  |
| ------------------------ | ------ | ------------------------------------------------------------------------ |
| Límite 10MB              | ✅     | `request.resource.size < 10 * 1024 * 1024`                               |
| Whitelist MIME types     | ✅     | `image/.*`, PDF, Word (.doc/.docx), text/plain                           |
| RBAC per-patient (extra) | ✅     | `isAdmin() \|\| isOwnerProfessional()` — mejora sobre el plan original   |
| Read restringido a staff | ✅     | `isStaff()` verificado via `firestore.get()` al documento `/staff/{uid}` |
| Commit                   | ✅     | `3dada85` (plan) + `b20ee56` (RBAC extra)                                |

### Task 3: Sanitizar `triggerInvoiceGeneration` (SEC-N02)

| Aspecto                    | Estado | Detalle                                                                                                                                                                     |
| -------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Whitelist de campos        | ✅     | 11 campos explícitos: `type`, `appointmentIds`, `patientId`, `patientName`, `patientDni`, `patientEmail`, `totalPrice`, `lineItems`, `requestedAt`, `requestedBy`, `status` |
| Spread `...data` eliminado | ✅     | Solo `allowedFields` se envía al webhook                                                                                                                                    |
| `queueDocId` preservado    | ✅     | Se envía fuera del spread de allowedFields                                                                                                                                  |
| Commit                     | ✅     | `3b25fc8`                                                                                                                                                                   |

### Task 4: Eliminar `deletePayment` (ARCH-N01)

| Aspecto                              | Estado | Detalle                                                                                                     |
| ------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| Eliminado de `IDataService.ts`       | ✅     | L41 eliminada — interface ya no declara `deletePayment`                                                     |
| Eliminado de `FirebaseService.ts`    | ✅     | Implementación eliminada, `deleteDoc` import mantenido (otros usos)                                         |
| Eliminado de `useDataActions.ts`     | ✅     | `deleteItem` tipo: `'patients' \| 'appointments'` — sin rama `'payments'`                                   |
| Tests actualizados                   | ✅     | `IDataService.test.ts`: sin mock ni assertion. `FirebaseService.test.ts`: test de `deletePayment` eliminado |
| Sin referencias residuales en `src/` | ✅     | Verificado con grep — 0 matches en `src/`                                                                   |
| Commit                               | ✅     | `37fee2c`                                                                                                   |

### Task 5: Fix `addPayment` date handling (ARCH-N02)

| Aspecto                                    | Estado | Detalle                                                              |
| ------------------------------------------ | ------ | -------------------------------------------------------------------- |
| Respeta `date` del input si es `Timestamp` | ✅     | `payment.date instanceof Timestamp ? payment.date : Timestamp.now()` |
| Fallback a `Timestamp.now()` si null       | ✅     | Rama else del ternario                                               |
| Test: date proporcionado                   | ✅     | `addPayment respeta date del input si es un Timestamp` — L274        |
| Test: date null                            | ✅     | `addPayment usa Timestamp.now() cuando date es null` — L298          |
| Commits                                    | ✅     | `ad502f8` (fix) + `707157a` (tests)                                  |

### Task 6: Rate limiting y App Check (SEC-N03)

| Aspecto                            | Estado     | Detalle                                                                                       |
| ---------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Rate limiting in-memory            | ✅         | 5 req/min por IP, `checkRateLimit()` con Map + ventana temporal                               |
| `HttpsError("resource-exhausted")` | ✅         | Error lanzado cuando se excede el límite                                                      |
| `enforceAppCheck: false`           | ⚠️ Parcial | Dejado como `false` con TODO documentado — requiere configuración en Firebase Console primero |
| IP extraction                      | ✅         | `request.rawRequest?.ip \|\| 'unknown'`                                                       |
| Commit                             | ✅         | `7e14258`                                                                                     |

**Nota sobre App Check:** La decisión de dejar `enforceAppCheck: false` es correcta. Habilitar App Check sin el provider configurado en el frontend bloquearía todas las llamadas legítimas. El TODO queda como prerequisito documentado para una futura iteración.

---

## Verificación técnica (01/03/2026)

| Check                           | Resultado                                                    |
| ------------------------------- | ------------------------------------------------------------ |
| `npx tsc --noEmit`              | ✅ 0 errores                                                 |
| `npx eslint src/`               | ✅ 0 errores, 11 warnings (`no-explicit-any` pre-existentes) |
| `npm test -- --run`             | ✅ 94 tests, 6 archivos, todos pasan                         |
| `npm run build`                 | ✅ Build exitoso (PWA v1.2.0, 34 precache entries)           |
| `cd functions && npm run build` | ✅ Build exitoso (requiere `npm install` previo)             |

### Métricas de tests

| Métrica          | Antes (Fase 4) | Ahora (Fase 5)                  | Cambio                            |
| ---------------- | -------------- | ------------------------------- | --------------------------------- |
| Total tests      | 92             | 94                              | +2 (addPayment date tests)        |
| Test files       | 6              | 6                               | Sin cambios                       |
| Tests eliminados | —              | 1 (deletePayment)               | Código muerto removido            |
| Tests agregados  | —              | 3 (2 addPayment date + 1 merge) | Cobertura de nuevo comportamiento |

### Métricas de build

| Chunk             | Tamaño      | gzip      |
| ----------------- | ----------- | --------- |
| `vendor-firebase` | 498.50 KB   | 116.34 KB |
| `vendor-ui`       | 192.51 KB   | 58.05 KB  |
| App chunks (lazy) | 1-40 KB c/u | —         |
| CSS total         | ~40 KB      | ~7 KB     |

---

## Observaciones y hallazgos menores

### 1. Tag `v1.2.0` no creado

El plan indicaba crear un tag `v1.2.0` al finalizar. No se encontró el tag en el repositorio. El `package.json` ya tiene `"version": "1.1.0"` (no fue bumpeado). **Acción recomendada:** Crear tag y bump de versión en el siguiente ciclo.

### 2. Storage rules: mejora significativa sobre el plan

El plan original solo pedía validación de tamaño y MIME type. La implementación final incluye RBAC per-patient con `firestore.get()` lookups, lo que es una mejora sustancial de seguridad. La regla de `read` ahora requiere ser staff activo (no solo autenticado), y `write` requiere ser admin o profesional asignado al paciente.

### 3. `isAdmin()` null-safe

Se detectó y corrigió un bug potencial: si un usuario autenticado no tenía documento en `/staff/{uid}`, la evaluación de `isAdmin()` fallaba. Ahora tiene guard: `let d = getStaffData(); return d != null && d.role == 'admin';`.

### 4. Notes read rule revertida

La regla de `notes` read fue revertida a `isAuthenticated()` porque el tightening previo (filtro por `createdByUid`) bloqueaba queries legítimas por `appointmentId`/`patientId` — Firestore no puede garantizar el filtro sin un índice compound. Queda documentado como TODO para futuras mejoras.

### 5. Rate limiting: limitación por diseño

El rate limiting in-memory funciona por instancia de Cloud Function. Si hay múltiples instancias activas, un atacante podría distribuir requests entre ellas. Para una protección más robusta se podría usar un counter en Firestore o Redis en el futuro. Para el volumen actual del proyecto, la implementación es adecuada.

### 6. `axios` import (SEC-N04 no resuelto)

El import `import axios from "axios"` en `functions/src/index.ts` sigue existiendo y se usa en `triggerInvoiceGeneration`. Esto era señalado como hallazgo de severidad baja (SEC-N04 mencionaba dead import, pero en realidad se usa activamente en L119). La auditoría puede estar desactualizada en este punto — `axios` **sí se usa** para el POST al webhook de n8n.

---

## Deuda técnica pendiente

### De la auditoría 26/02/2026 — Resuelto en Fase 5

| ID       | Estado                                                                           |
| -------- | -------------------------------------------------------------------------------- |
| SEC-N01  | ✅ Resuelto                                                                      |
| SEC-07   | ✅ Resuelto (+ RBAC extra)                                                       |
| SEC-N02  | ✅ Resuelto                                                                      |
| ARCH-N01 | ✅ Resuelto                                                                      |
| ARCH-N02 | ✅ Resuelto                                                                      |
| SEC-N03  | ⚠️ Parcial (rate limiting ✅, App Check pendiente de config en Firebase Console) |

### Deuda remanente (severidad media-baja)

| Área                 | IDs                                                                  | Estado                                         |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| Seguridad (media)    | SEC-N04 (revisar si aplica), SEC-N05, SEC-06, SEC-10, SEC-11, SEC-13 | Pendiente                                      |
| Arquitectura (media) | ARCH-N03, ARCH-N04, ARCH-N05, ARCH-N06, ARCH-N07                     | Pendiente                                      |
| Hooks/Componentes    | HOOK-N01..N04, COMP-N01, COMP-N02                                    | Pendiente                                      |
| Testing gaps         | 8/10 hooks sin tests, 0 componentes, 0 vistas                        | Pendiente                                      |
| Configuración        | Path aliases, engines, sourcemaps                                    | Pendiente                                      |
| App Check            | Configurar provider en Firebase Console + frontend                   | Pendiente (prerequisito para SEC-N03 completo) |
| Tag/Versión          | Crear tag `v1.2.0` y bump de package.json                            | Pendiente                                      |

---

## Resumen de commits (v1.1.0..HEAD)

| #   | Hash      | Mensaje                                                                   | Tipo          |
| --- | --------- | ------------------------------------------------------------------------- | ------------- |
| 1   | `23290de` | docs: create phase 5 plan                                                 | Planificación |
| 2   | `473e898` | docs: add root README                                                     | Documentación |
| 3   | `5f6ee3a` | fix(security): restrict psiquePayments write to admin only (SEC-N01)      | **Task 1**    |
| 4   | `3dada85` | fix(security): add file size limit and MIME type validation (SEC-07)      | **Task 2**    |
| 5   | `3b25fc8` | fix(security): sanitize billing queue data with field whitelist (SEC-N02) | **Task 3**    |
| 6   | `37fee2c` | refactor(arch): remove dead deletePayment (ARCH-N01)                      | **Task 4**    |
| 7   | `ad502f8` | fix(arch): respect date from PaymentInput in addPayment (ARCH-N02)        | **Task 5**    |
| 8   | `7e14258` | fix(security): add rate limiting to validateTurnstile (SEC-N03)           | **Task 6**    |
| 9   | `707157a` | test(addPayment): add date-handling tests + TODO for App Check            | **Task 5+6**  |
| 10  | `471458a` | Apply suggestion from @Copilot (typo fix)                                 | PR review     |
| 11  | `7f5719a` | Apply suggestion from @mauroparque                                        | PR review     |
| 12  | `b20ee56` | fix(storage-rules): enforce per-patient RBAC on attachment access         | **Extra**     |
| 13  | `42a6304` | Merge pull request #11                                                    | Merge         |
| 14  | `07f985f` | fix(security): fix notes read rule and null-safe isAdmin()                | **Extra**     |
| 15  | `e42b5a8` | docs: add v1.1.0 technical documentation                                  | Documentación |
| 16  | `c14eafa` | docs: update agent skills instructions and add skills-lock.json           | Tooling       |
