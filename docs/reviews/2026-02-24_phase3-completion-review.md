# Revisión de Cierre — Fase 3: Testing & Cleanup

**Fecha de revisión:** 24 de febrero de 2026

**Fase:** Phase 3 — Testing & Cleanup

**Rama analizada:** `phase3-lint-cleanup` → mergeada a `main` (PR #9, 15 commits, 16 archivos, +1054/-85)

**Auditoría de referencia:** [`docs/audits/2026-02-19_AUDIT.md`](../audits/2026-02-19_AUDIT.md)

**Planes ejecutados:**

- [`docs/plans/2026-02-23-phase3-testing-cleanup.md`](../plans/2026-02-23-phase3-testing-cleanup.md) — Plan principal (21 tasks)
- [`docs/plans/2026-02-24-phase3-fixes.md`](../plans/2026-02-24-phase3-fixes.md) — Fixes post code-review (3 items)

**Revisión anterior:** [`docs/reviews/2026-02-23_phase2-completion-review.md`](../reviews/2026-02-23_phase2-completion-review.md)

---

## Veredicto: FASE 3 COMPLETADA ✓

## Resumen Ejecutivo

La Fase 3 abordó la deuda técnica heredada de Fase 2: expansión del scope de test coverage, corrección de lint errors pre-existentes, migración parcial de `useStaff` al service layer, y correcciones post code-review (rutas Firestore, OOM en tests, mocks duplicados). El resultado es una base de código con **0 lint errors**, **~40 tests funcionales**, y lógica de negocio crítica extraída a módulos puros testeables.

---

## Verificación por hallazgo de deuda técnica

| ID | Hallazgo heredado | Estado | Solución implementada |
| --- | --- | --- | --- |
| **TEST-01 (cont.)** | Coverage scope limitado a 2 archivos | **Resuelto** | Scope expandido a 4 archivos: `utils.ts`, `psiqueCalculations.ts`, `useAgendaStats.ts`, `usePendingTasks.ts` |
| **Lint pre-existente** | 7 lint errors pre-existentes sin resolver | **Resuelto** | 0 lint errors. Fixes en `AppointmentDetailsModal` (catch vars), `AuthScreen` (catch + any), `PatientsView` (case declarations), `utils.test.ts` (constant expression), `IDataService.test.ts` (await resolves) |
| **ARCH-01 (remanente)** | `useStaff.ts` bypasea `IDataService` | **Parcial** | `IDataService` + `FirebaseService` tienen los 3 métodos de staff. Hook no migrado (ver decisión abajo) |

---

## Verificación de tareas — Plan principal (21 tasks)

### Grupo A — Lint Cleanup

| # | Tarea | Estado | Detalle |
| --- | --- | --- | --- |
| T1 | `AppointmentDetailsModal` catch vars | ✅ | Usa `catch {` bare syntax |
| T2 | `useAgendaStats` unused var | ✅ | `totalScheduled` ya no existe en el archivo |
| T3 | `AuthScreen` unused var + any | ✅ | Usa `catch {}` bare en línea 48 |
| T4 | `PatientsView` case declaration | ✅ | `case 'age': { }` con block scope |
| T5 | `utils.test.ts` constant expression | ✅ | Confirmado por 0 lint errors |
| T6 | `IDataService.test.ts` await resolves | ✅ | Confirmado por 0 lint errors |
| T7 | Commit lint fixes | ✅ | Commit `6101dc3` |

### Grupo B — Tests de Hooks

| # | Tarea | Estado | Detalle |
| --- | --- | --- | --- |
| T8 | Tests `usePsiquePayments` | ✅ | Migrado a `src/lib/__tests__/psiqueCalculations.test.ts` (10 tests) |
| T9 | Verificar tests | ✅ | Tests contra función pura — sin OOM |
| T10 | Tests `usePendingTasks` | ✅ | `src/hooks/__tests__/usePendingTasks.test.ts` (7 tests) |
| T11 | Verificar tests | ✅ | |
| T12 | Commit | ✅ | Commits `93e4c42`, `3b264e0`, `2e55ef8` |

### Grupo C — useStaff Migration

| # | Tarea | Estado | Detalle |
| --- | --- | --- | --- |
| T13 | Staff methods en `IDataService` | ✅ | `subscribeToStaffProfile`, `createStaffProfile`, `updateStaffProfile` |
| T14 | Implementar en `FirebaseService` | ✅ | Con `STAFF_COLLECTION` + `STAFF_COLLECTION` fix (F1) |
| T15 | Reestructurar `App.tsx` provider tree | ❌ | No realizado — ver decisión abajo |
| T16 | Migrar `useStaff.ts` a IDataService | ❌ | Hook sigue usando Firestore directo |
| T17 | Verificar migración | N/A | |
| T18 | Commit | N/A | |

### Grupo D — Coverage Config

| # | Tarea | Estado | Detalle |
| --- | --- | --- | --- |
| T19 | Expandir coverage scope | ✅ | 4 archivos en scope (vs 2 en Fase 2) |
| T20 | Commit | ✅ | Commit `c0eccb6` |

### Grupo E — Verificación Final

| # | Tarea | Estado | Detalle |
| --- | --- | --- | --- |
| T21 | End-to-end checks | ✅ | tsc ✅, lint ✅, tests ✅, build ✅ |

---

## Verificación de tareas — Fixes post code-review (3 items)

| # | Fix | Severidad | Estado | Commit |
| --- | --- | --- | --- | --- |
| F1 | Rutas Firestore en `FirebaseService.ts` usan hardcoded path en vez de `STAFF_COLLECTION` | Crítica | ✅ | `8e13576` |
| F2 | OOM en `usePsiquePayments.test.ts` por `renderHook` + mocks pesados | Alta | ✅ | `e03a88e`, `2e55ef8` |
| F3 | Mock duplicado de `ServiceContext` en `usePendingTasks.test.ts` | Baja | ✅ | `d538e05` |

---

## Decisiones de diseño tomadas

### Extracción de `psiqueCalculations` a módulo independiente

La lógica pura de cálculo de fees fue extraída a `src/lib/psiqueCalculations.ts` en vez de dejarla inline en el hook. Esto es **mejor** que lo planificado:

- Módulo sin dependencias de React, testeable sin jsdom
- Exporta `calculatePsiqueMonthData`, `getDocKey`, `PSIQUE_RATE`
- El hook `usePsiquePayments.ts` actúa como glue code (contexto, estado, side effects)
- Tests en `src/lib/__tests__/psiqueCalculations.test.ts` — 10 tests cubriendo edge cases

### `useStaff` no migrado (decisión consciente)

`useStaff` se invoca en `App.tsx` **antes** de que `ServiceProvider` exista en el árbol. Reestructurar el provider tree requería cambios al patrón de inicialización. El plan original documentaba esta alternativa pragmática:

> *"Si la reestructuración del provider tree resulta compleja, dejar `useStaff` con Firestore directo y documentar la deuda."*

La interfaz (`IDataService`) y la implementación (`FirebaseService`) están listas — solo falta switchear el hook cuando se refactorice el árbol de providers.

### Fix de negocio adicional: `chargeOnCancellation`

Durante la fase se descubrió y corrigió un bug: los turnos cancelados **con cobro** (`chargeOnCancellation: true`) no se incluían en el billing de Psique. Fix aplicado en `psiqueCalculations.ts` (commit `a342bcd`).

---

## Verificaciones técnicas (24/02/2026)

| Check | Resultado |
| --- | --- |
| `npx eslint src/` | ✅ 0 errors, 11 warnings (todos `no-explicit-any`) |
| `npx tsc --noEmit` | ✅ 0 errores |
| `npm test` | ✅ ~40 tests pasan (4 archivos) |
| `npm run build` | ✅ Build exitoso |
| Coverage scope | ✅ 4 archivos: `utils.ts`, `psiqueCalculations.ts`, `useAgendaStats.ts`, `usePendingTasks.ts` |

### Lint warnings remanentes (11, todos aceptables)

| Warning | Archivo | Tipo |
| --- | --- | --- |
| 11× `no-explicit-any` | Varios | Uso intencional de `any` en types, service layer, config |

---

## Métricas de la rama

| Métrica | Valor |
| --- | --- |
| Commits totales | 15 (plan principal + fixes + merge) |
| Archivos tocados | 16 |
| Líneas agregadas | +1,054 |
| Líneas eliminadas | -85 |
| Tests antes (Fase 2) | 23 (3 archivos) |
| Tests después (Fase 3) | ~40 (4 archivos) |
| Lint errors antes | 7 |
| Lint errors después | **0** |
| Archivos en coverage scope | 4 (vs 2 en Fase 2) |

---

## Deuda técnica pendiente

### De esta fase (Phase 3)

| Item | Detalle | Prioridad | Acción sugerida |
| --- | --- | --- | --- |
| **`useStaff.ts` bypass** | Hook sigue con Firestore directo. Interface + implementación listos en service layer | Baja | Migrar cuando se refactorice el provider tree (DATA-01) |
| **`useBillingStatus` bypass** | Hook con Firestore directo, no abordado en Fase 3 | Media | Incluir en Fase 4 |
| **FirebaseService sin tests** | 17+ métodos sin tests unitarios | Media | Requiere mocks de Firestore |

### Heredada de fases anteriores

| ID | Área | Prioridad |
| --- | --- | --- |
| BUILD-01 | Bundle size — sin `manualChunks` en Vite | Media |
| DATA-01 | Ventana de datos stale al cruzar límites de fecha | Media |
| A11Y-01 | Modals sin `role="dialog"`, ARIA, focus trap | Media |

---

## Próximos pasos — Fase 4

Orden de prioridad recomendado:

1. **Performance** (BUILD-01) — `manualChunks` en Vite para separar Firebase, React, vendors
2. **Data freshness** (DATA-01) — Revisión de subscripciones en `DataContext` + refactor provider tree (oportunidad para migrar `useStaff`)
3. **Accesibilidad** (A11Y-01) — `ModalOverlay` con ARIA, focus trap, Escape key
4. **Service layer completion** — Migrar `useBillingStatus` + `useStaff` a `IDataService`
5. **FirebaseService tests** — Tests unitarios con mocks de Firestore

---

### *Revisión realizada por Antigravity (Claude) — 24 de febrero de 2026*
