# Phase 3: Testing & Cleanup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expandir cobertura de tests a hooks de lógica de negocio, migrar `useStaff` al service layer, resolver todos los errores de lint pre-existentes y corregir deuda técnica menor de tests.

**Architecture:** Extraer lógica pura de hooks en funciones testables, escribir tests unitarios con `renderHook` + mocks de context, migrar el último hook que bypasea `IDataService` reestructurando el provider tree en `App.tsx`, y limpiar 7 errores de lint con fixes mínimos y seguros.

**Tech Stack:** Vitest, @testing-library/react, ESLint, TypeScript strict

**Auditoría de referencia:** [`docs/audits/2026-02-19_AUDIT.md`](../audits/2026-02-19_AUDIT.md)

**Revisión anterior:** [`docs/reviews/2026-02-23_phase2-completion-review.md`](../reviews/2026-02-23_phase2-completion-review.md)

**Review de cierre:** (pendiente)

---

## Resumen de tasks

| # | Grupo | Tarea | Archivos principales |
| --- | ------- | ------- | --------------------- |
| 1 | Lint | Fix `no-unused-vars` en `AppointmentDetailsModal.tsx` | `src/components/modals/AppointmentDetailsModal.tsx` |
| 2 | Lint | Fix `no-unused-vars` en `useAgendaStats.ts` | `src/hooks/useAgendaStats.ts` |
| 3 | Lint | Fix `no-unused-vars` + `no-explicit-any` en `AuthScreen.tsx` | `src/views/AuthScreen.tsx` |
| 4 | Lint | Fix `no-case-declarations` en `PatientsView.tsx` | `src/views/PatientsView.tsx` |
| 5 | Lint | Fix `no-constant-binary-expression` en `utils.test.ts` | `src/lib/__tests__/utils.test.ts` |
| 6 | Tests | Fix `expect().resolves` sin `await` en `IDataService.test.ts` | `src/services/__tests__/IDataService.test.ts` |
| 7 | Tests | Commit lint + test fixes | — |
| 8 | Tests | Extraer lógica pura de `usePsiquePayments` y escribir tests | `src/hooks/usePsiquePayments.ts`, `src/hooks/__tests__/usePsiquePayments.test.ts` |
| 9 | Tests | Verificar tests de `usePsiquePayments` | — |
| 10 | Tests | Escribir tests reales para `usePendingTasks` | `src/hooks/__tests__/usePendingTasks.test.ts` |
| 11 | Tests | Verificar tests de `usePendingTasks` | — |
| 12 | Tests | Commit tests de hooks | — |
| 13 | Migration | Agregar métodos de staff a `IDataService` | `src/services/IDataService.ts` |
| 14 | Migration | Implementar métodos de staff en `FirebaseService` | `src/services/FirebaseService.ts` |
| 15 | Migration | Reestructurar provider tree en `App.tsx` | `src/App.tsx` |
| 16 | Migration | Migrar `useStaff.ts` a usar `IDataService` | `src/hooks/useStaff.ts` |
| 17 | Migration | Verificar migración de `useStaff` | — |
| 18 | Migration | Commit migración de `useStaff` | — |
| 19 | Coverage | Expandir scope de coverage en `vitest.config.ts` | `vitest.config.ts` |
| 20 | Coverage | Commit coverage expansion | — |
| 21 | Final | Verificación end-to-end | — |

---

## Grupo A — Lint Cleanup (7 errores pre-existentes → 0)

### Task 1: Fix `no-unused-vars` en `AppointmentDetailsModal.tsx`

**Files:**

- Modify: `src/components/modals/AppointmentDetailsModal.tsx:186,201`

**Step 1: Aplicar fix**

En línea 186 y 201, el `catch (error)` no usa la variable. Cambiar a `catch (_error)` para cumplir con la regla `@typescript-eslint/no-unused-vars` que ya permite `argsIgnorePattern: '^_'`:

```tsx
// Línea ~186 — handleSaveNote
} catch (_error) {
    toast.error('Error al guardar la evolución');
}

// Línea ~201 — handleFileUpload
} catch (_error) {
    toast.error('Error al subir archivo');
}
```

**Step 2: Verificar**

Run: `npm run lint 2>&1 | Select-String "AppointmentDetailsModal"`  
Expected: 0 resultados

---

### Task 2: Fix `no-unused-vars` en `useAgendaStats.ts`

**Files:**

- Modify: `src/hooks/useAgendaStats.ts:63`

**Step 1: Aplicar fix**

`totalScheduled` se asigna pero nunca se usa. Se incrementa en el loop pero el valor final no se referencia. Revisar si `totalScheduledAppointments` (que sí se devuelve en el return) es distinto. Si `totalScheduled` es redundante, prefijarlo con `_` o eliminarlo:

```typescript
// Línea ~63 — dentro del useMemo
// ANTES:
let totalScheduled = 0;

// OPCIÓN: Si es el mismo concepto que totalScheduledAppointments, 
// renombrar los usos a totalScheduledAppointments directamente.
// Si no se puede determinar, prefijarlo:
let _totalScheduled = 0;
```

> **Nota para el implementador:** Leer el useMemo completo (líneas 40-168) para entender si `totalScheduled` y `totalScheduledAppointments` son lo mismo. Si lo son, eliminá `totalScheduled` y usá `totalScheduledAppointments` directamente. Si no, prefijá con `_`.

**Step 2: Verificar**

Run: `npm run lint 2>&1 | Select-String "useAgendaStats"`  
Expected: 0 resultados (o solo el warning de `no-explicit-any` si existe)

---

### Task 3: Fix `no-unused-vars` + `no-explicit-any` en `AuthScreen.tsx`

**Files:**

- Modify: `src/views/AuthScreen.tsx:48`

**Step 1: Aplicar fix**

```tsx
// ANTES (línea ~48):
} catch (turnstileErr: any) {

// DESPUÉS:
} catch (_turnstileErr: unknown) {
```

Cambios: prefijarlo con `_` (fix `no-unused-vars`) y cambiar `any` → `unknown` (fix `no-explicit-any` warning).

**Step 2: Verificar**

Run: `npm run lint 2>&1 | Select-String "AuthScreen"`  
Expected: Solo queda 1 warning del `any` en el catch genérico de línea ~91, si existe.

---

### Task 4: Fix `no-case-declarations` en `PatientsView.tsx`

**Files:**

- Modify: `src/views/PatientsView.tsx:83-92`

**Step 1: Aplicar fix**

Envolver el bloque `case 'age'` con llaves para crear un scope léxico:

```tsx
// ANTES:
case 'age':
    const ageA = calculateAge(a.birthDate) ?? 999;
    const ageB = calculateAge(b.birthDate) ?? 999;
    comparison = ageA - ageB;
    break;

// DESPUÉS:
case 'age': {
    const ageA = calculateAge(a.birthDate) ?? 999;
    const ageB = calculateAge(b.birthDate) ?? 999;
    comparison = ageA - ageB;
    break;
}
```

**Step 2: Verificar**

Run: `npm run lint 2>&1 | Select-String "PatientsView"`  
Expected: 0 resultados

---

### Task 5: Fix `no-constant-binary-expression` en `utils.test.ts`

**Files:**

- Modify: `src/lib/__tests__/utils.test.ts:55`

**Step 1: Aplicar fix**

```typescript
// ANTES (línea ~55):
const result = cn('base', false && 'hidden', null, undefined);

// DESPUÉS — usar variable para evitar constant expression:
const shouldHide = false;
const result = cn('base', shouldHide && 'hidden', null, undefined);
```

**Step 2: Verificar**

Run: `npm run lint 2>&1 | Select-String "utils.test"`  
Expected: Solo warnings de `no-explicit-any` (que son del test helper y se pueden ignorar)

---

### Task 6: Fix `expect().resolves` sin `await` en `IDataService.test.ts`

**Files:**

- Modify: `src/services/__tests__/IDataService.test.ts:137,149` (aprox.)

**Step 1: Identificar y aplicar fix**

Buscar las 2 líneas con `expect(result).resolves.toBeUndefined()` sin `await`:

```typescript
// ANTES:
expect(result).resolves.toBeUndefined();

// DESPUÉS:
await expect(result).resolves.toBeUndefined();
```

Asegurarse de que el `it()` callback sea `async`:

```typescript
// Si no es async, cambiar:
it('updateTask mock can be configured...', async () => {
```

**Step 2: Verificar**

Run: `npm test -- --run src/services/__tests__/IDataService.test.ts`  
Expected: Todos los tests pasan sin warnings

---

### Task 7: Commit lint + test fixes

**Step 1: Commit**

```bash
git add -A
git commit -m "fix: resolve 7 pre-existing lint errors and 2 test warnings

- AppointmentDetailsModal: prefix unused catch vars with _
- useAgendaStats: fix unused totalScheduled variable
- AuthScreen: prefix unused catch var, any → unknown
- PatientsView: add block scope to case declaration
- utils.test: avoid constant binary expression
- IDataService.test: add await to expect().resolves assertions"
```

**Step 2: Verificar estado limpio**

Run: `npm run lint`  
Expected: Solo warnings (0 errors)

Run: `npm test -- --run`  
Expected: Todos los tests pasan

---

## Grupo B — Coverage Expansion: Tests de Hooks

### Task 8: Tests para `usePsiquePayments` — lógica de `monthData`

**Files:**

- Create: `src/hooks/__tests__/usePsiquePayments.test.ts`
- Reference: `src/hooks/usePsiquePayments.ts`

**Estrategia:** El `monthData` useMemo dentro de `usePsiquePayments` es lógica pura de negocio (filtrado de citas psique, cálculo de fee al 25%, breakdown por paciente). No podemos testar el hook completo sin mockear `useService()` y `useData()`, pero sí podemos extraer tests de la **lógica de cálculo**.

Approach: mockear `useService` y `useData` con `vi.mock`, y configurar el hook con datos controlados.

**Step 1: Escribir los tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePsiquePayments } from '../usePsiquePayments';
import type { Appointment, Patient } from '../../types';

// Mock the context hooks
vi.mock('../../context/ServiceContext', () => ({
    useService: vi.fn(() => ({
        subscribeToPsiquePayments: vi.fn((_prof, cb) => {
            cb({});
            return vi.fn();
        }),
        markPsiquePaymentAsPaid: vi.fn(),
    })),
}));

vi.mock('../../context/DataContext', () => ({
    useData: vi.fn(() => ({
        appointments: [],
        patients: [],
    })),
}));

const makePatient = (overrides: Partial<Patient> = {}): Patient => ({
    id: 'p-1',
    name: 'Test Patient',
    phone: '1234567890',
    email: 'test@test.com',
    isActive: true,
    professional: 'Dr. Test',
    fee: 10000,
    patientSource: 'particular',
    ...overrides,
});

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
    id: 'a-1',
    patientId: 'p-1',
    patientName: 'Test Patient',
    professional: 'Dr. Test',
    date: '2026-02-15',
    time: '10:00',
    duration: 50,
    type: 'presencial',
    status: 'completado',
    isPaid: true,
    price: 10000,
    ...overrides,
});

describe('usePsiquePayments', () => {
    const selectedMonth = new Date(2026, 1); // February 2026

    it('returns zero totals when no psique patients exist', () => {
        const patients = [makePatient({ patientSource: 'particular' })];
        const appointments = [makeAppointment({ isPaid: true })];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.totalAmount).toBe(0);
        expect(result.current.monthData.patientBreakdown).toEqual([]);
    });

    it('calculates 25% fee for psique patient appointments', () => {
        const patients = [makePatient({ id: 'p-1', patientSource: 'psique' })];
        const appointments = [
            makeAppointment({
                patientId: 'p-1',
                date: '2026-02-10',
                isPaid: true,
                price: 10000,
            }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.totalAmount).toBe(2500); // 10000 * 0.25
        expect(result.current.monthData.patientBreakdown).toHaveLength(1);
        expect(result.current.monthData.patientBreakdown[0].psiqueAmount).toBe(2500);
    });

    it('excludes unpaid appointments', () => {
        const patients = [makePatient({ id: 'p-1', patientSource: 'psique' })];
        const appointments = [
            makeAppointment({ patientId: 'p-1', date: '2026-02-10', isPaid: false, price: 10000 }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.totalAmount).toBe(0);
    });

    it('excludes cancelled appointments', () => {
        const patients = [makePatient({ id: 'p-1', patientSource: 'psique' })];
        const appointments = [
            makeAppointment({
                patientId: 'p-1',
                date: '2026-02-10',
                isPaid: true,
                status: 'cancelado',
                price: 10000,
            }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.totalAmount).toBe(0);
    });

    it('respects excludeFromPsique flag on individual appointments', () => {
        const patients = [makePatient({ id: 'p-1', patientSource: 'psique' })];
        const appointments = [
            makeAppointment({
                patientId: 'p-1',
                date: '2026-02-10',
                isPaid: true,
                price: 10000,
                excludeFromPsique: true,
            }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.totalAmount).toBe(0);
    });

    it('filters appointments by selected month', () => {
        const patients = [makePatient({ id: 'p-1', patientSource: 'psique' })];
        const appointments = [
            makeAppointment({ patientId: 'p-1', date: '2026-02-10', isPaid: true, price: 10000 }),
            makeAppointment({ id: 'a-2', patientId: 'p-1', date: '2026-03-10', isPaid: true, price: 8000 }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        // Only February appointment counted
        expect(result.current.monthData.totalAmount).toBe(2500);
    });

    it('aggregates multiple sessions per patient', () => {
        const patients = [makePatient({ id: 'p-1', patientSource: 'psique' })];
        const appointments = [
            makeAppointment({ id: 'a-1', patientId: 'p-1', date: '2026-02-05', isPaid: true, price: 10000 }),
            makeAppointment({ id: 'a-2', patientId: 'p-1', date: '2026-02-12', isPaid: true, price: 10000 }),
            makeAppointment({ id: 'a-3', patientId: 'p-1', date: '2026-02-19', isPaid: true, price: 10000 }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.totalAmount).toBe(7500); // 30000 * 0.25
        expect(result.current.monthData.patientBreakdown[0].sessionCount).toBe(3);
    });

    it('sorts patient breakdown alphabetically', () => {
        const patients = [
            makePatient({ id: 'p-1', name: 'Zara', patientSource: 'psique' }),
            makePatient({ id: 'p-2', name: 'Ana', patientSource: 'psique' }),
        ];
        const appointments = [
            makeAppointment({ id: 'a-1', patientId: 'p-1', patientName: 'Zara', date: '2026-02-10', isPaid: true, price: 5000 }),
            makeAppointment({ id: 'a-2', patientId: 'p-2', patientName: 'Ana', date: '2026-02-10', isPaid: true, price: 5000 }),
        ];

        const { result } = renderHook(() =>
            usePsiquePayments(appointments, patients, selectedMonth),
        );

        expect(result.current.monthData.patientBreakdown[0].patientName).toBe('Ana');
        expect(result.current.monthData.patientBreakdown[1].patientName).toBe('Zara');
    });

    it('exposes PSIQUE_RATE constant as 0.25', () => {
        const { result } = renderHook(() =>
            usePsiquePayments([], [], selectedMonth),
        );

        expect(result.current.PSIQUE_RATE).toBe(0.25);
    });
});
```

**Step 2: Ejecutar tests y verificar que fallan por las razones correctas**

Run: `npm test -- --run src/hooks/__tests__/usePsiquePayments.test.ts`  
Expected: Tests pasan (la lógica ya está implementada, estamos testeando retroactivamente)

---

### Task 9: Verificar tests de `usePsiquePayments`

**Step 1: Ejecutar**

Run: `npm test -- --run src/hooks/__tests__/usePsiquePayments.test.ts`  
Expected: 9/9 tests pasan

**Step 2: Si algún test falla, ajustar**

Posibles ajustes:

- Si los mocks no funcionan con la estructura del hook, ajustar el mock de `useService`/`useData`.
- Si el hook necesita un wrapper React para los providers, crear un wrapper minimal.

---

### Task 10: Tests reales para `usePendingTasks`

**Files:**

- Modify: `src/hooks/__tests__/usePendingTasks.test.ts` (reemplazar placeholder)
- Reference: `src/hooks/usePendingTasks.ts`

**Step 1: Reemplazar el archivo completo con tests reales**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePendingTasks } from '../usePendingTasks';
import type { Appointment, ClinicalNote } from '../../types';

// Mock DataContext
vi.mock('../../context/DataContext', () => ({
    useData: vi.fn(() => ({
        patients: [
            { id: 'p-1', name: 'Patient One', isActive: true, phone: '', email: '', professional: 'Dr. Test', fee: 0, patientSource: 'particular' as const },
            { id: 'p-2', name: 'Patient Two', isActive: true, phone: '', email: '', professional: 'Dr. Test', fee: 0, patientSource: 'particular' as const },
        ],
    })),
}));

// Default mock for ServiceContext — notes with tasks
const mockNotes: ClinicalNote[] = [
    {
        id: 'note-1',
        patientId: 'p-1',
        appointmentId: 'a-1',
        content: 'Session notes',
        attachments: [],
        createdAt: { toDate: () => new Date('2026-02-01') } as any,
        createdBy: 'Dr. Test',
        createdByUid: 'uid-1',
        tasks: [
            { text: 'Pending task 1', completed: false },
            { text: 'Completed task', completed: true },
            { text: 'Pending task 2', completed: false, subtasks: [{ text: 'Sub A', completed: false }] },
        ],
    },
    {
        id: 'note-2',
        patientId: 'p-2',
        appointmentId: 'a-2',
        content: 'Other session',
        attachments: [],
        createdAt: { toDate: () => new Date('2026-02-10') } as any,
        createdBy: 'Dr. Test',
        createdByUid: 'uid-1',
        tasks: [
            { text: 'Another pending task', completed: false },
        ],
    },
];

vi.mock('../../context/ServiceContext', () => ({
    useService: vi.fn(() => ({
        subscribeToAllNotes: vi.fn((cb: (notes: ClinicalNote[]) => void) => {
            cb(mockNotes);
            return vi.fn();
        }),
        completeTask: vi.fn().mockResolvedValue(undefined),
    })),
}));

const makeAppointment = (overrides: Partial<Appointment> = {}): Appointment => ({
    id: 'a-1',
    patientId: 'p-1',
    patientName: 'Patient One',
    professional: 'Dr. Test',
    date: '2026-02-01',
    time: '10:00',
    duration: 50,
    type: 'presencial',
    status: 'completado',
    isPaid: false,
    ...overrides,
});

describe('usePendingTasks', () => {
    it('returns only non-completed tasks', () => {
        const appointments = [
            makeAppointment({ id: 'a-1', date: '2026-02-01' }),
            makeAppointment({ id: 'a-2', patientId: 'p-2', date: '2026-02-10' }),
        ];

        const { result } = renderHook(() => usePendingTasks(appointments));

        // note-1 has 2 pending (index 0 and 2), note-2 has 1 pending
        expect(result.current.pendingTasks).toHaveLength(3);
        expect(result.current.pendingTasks.every((t) => t.text !== 'Completed task')).toBe(true);
    });

    it('includes patient name in tasks', () => {
        const appointments = [makeAppointment()];
        const { result } = renderHook(() => usePendingTasks(appointments));

        const taskForP1 = result.current.pendingTasks.find((t) => t.patientId === 'p-1');
        expect(taskForP1?.patientName).toBe('Patient One');
    });

    it('filters tasks by myPatientIds when provided', () => {
        const appointments = [makeAppointment()];
        const myPatientIds = new Set(['p-1']); // Only patient 1

        const { result } = renderHook(() => usePendingTasks(appointments, myPatientIds));

        // Should only have tasks from note-1 (patient p-1): 2 pending tasks
        expect(result.current.pendingTasks).toHaveLength(2);
        expect(result.current.pendingTasks.every((t) => t.patientId === 'p-1')).toBe(true);
    });

    it('preserves subtasks in pending tasks', () => {
        const appointments = [makeAppointment()];
        const { result } = renderHook(() => usePendingTasks(appointments));

        const taskWithSubs = result.current.pendingTasks.find((t) => t.text === 'Pending task 2');
        expect(taskWithSubs?.subtasks).toHaveLength(1);
        expect(taskWithSubs?.subtasks?.[0].text).toBe('Sub A');
    });

    it('includes appointment date in tasks when matched', () => {
        const appointments = [makeAppointment({ id: 'a-1', date: '2026-02-01' })];
        const { result } = renderHook(() => usePendingTasks(appointments));

        const task = result.current.pendingTasks.find((t) => t.appointmentId === 'a-1');
        expect(task?.appointmentDate).toBe('2026-02-01');
    });

    it('sorts tasks by appointment date', () => {
        const appointments = [
            makeAppointment({ id: 'a-1', date: '2026-02-15' }),
            makeAppointment({ id: 'a-2', patientId: 'p-2', date: '2026-02-01' }),
        ];

        const { result } = renderHook(() => usePendingTasks(appointments));

        // Tasks from appointment a-2 (Feb 01) should come before a-1 (Feb 15)
        const firstTask = result.current.pendingTasks[0];
        expect(firstTask.appointmentDate).toBe('2026-02-01');
    });

    it('returns loading false after subscription callback', () => {
        const { result } = renderHook(() => usePendingTasks([]));
        expect(result.current.loading).toBe(false);
    });

    it('provides a completeTask function', () => {
        const { result } = renderHook(() => usePendingTasks([]));
        expect(typeof result.current.completeTask).toBe('function');
    });
});
```

**Step 2: Ejecutar**

Run: `npm test -- --run src/hooks/__tests__/usePendingTasks.test.ts`  
Expected: Tests pasan

---

### Task 11: Verificar tests de `usePendingTasks`

**Step 1: Ejecutar suite completa**

Run: `npm test -- --run`  
Expected: Todos los tests (antiguos + nuevos) pasan

---

### Task 12: Commit tests de hooks

**Step 1: Commit**

```bash
git add -A
git commit -m "test: add tests for usePsiquePayments and usePendingTasks hooks

- usePsiquePayments: 9 tests covering fee calculation, filtering,
  patient aggregation, month scoping, excludeFromPsique flag
- usePendingTasks: 8 tests covering task filtering, patient matching,
  myPatientIds filtering, subtask preservation, date sorting"
```

---

## Grupo C — `useStaff` Migration a IDataService

### Task 13: Agregar métodos de staff a `IDataService`

**Files:**
- Modify: `src/services/IDataService.ts`

**Step 1: Agregar firmas al final de la interface, antes del cierre `}`**

```typescript
    // --- Staff ---
    subscribeToStaffProfile(uid: string, onData: (profile: StaffProfile | null) => void): () => void;
    createStaffProfile(uid: string, profile: StaffProfile): Promise<void>;
    updateStaffProfile(uid: string, data: Partial<StaffProfile>): Promise<void>;
```

**Step 2: Agregar import de `StaffProfile`**

```typescript
import type {
    // ... existing imports ...
    StaffProfile,
} from '../types';
```

**Step 3: Verificar que compila**

Run: `npx tsc --noEmit 2>&1 | Select-Object -First 5`  
Expected: Errores de tipo en `FirebaseService.ts` (falta implementación) — esto es correcto, se resuelve en Task 14.

---

### Task 14: Implementar métodos de staff en `FirebaseService`

**Files:**

- Modify: `src/services/FirebaseService.ts`

**Step 1: Agregar implementación**

Buscar la sección de métodos al final de la clase y agregar:

```typescript
    // --- Staff ---
    subscribeToStaffProfile(uid: string, onData: (profile: StaffProfile | null) => void): () => void {
        const docRef = doc(this.db, ...this.clinicPath, 'staff', uid);
        return onSnapshot(
            docRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    onData(docSnap.data() as StaffProfile);
                } else {
                    onData(null);
                }
            },
            (error) => {
                console.error('Error fetching staff profile:', error);
                onData(null);
            },
        );
    }

    async createStaffProfile(uid: string, profile: StaffProfile): Promise<void> {
        const docRef = doc(this.db, ...this.clinicPath, 'staff', uid);
        await setDoc(docRef, profile);
    }

    async updateStaffProfile(uid: string, data: Partial<StaffProfile>): Promise<void> {
        const docRef = doc(this.db, ...this.clinicPath, 'staff', uid);
        await setDoc(docRef, data, { merge: true });
    }
```

**Step 2: Agregar import de `StaffProfile` si falta**

**Step 3: Verificar compilación**

Run: `npx tsc --noEmit`  
Expected: 0 errores

---

### Task 15: Reestructurar provider tree en `App.tsx`

**Files:**

- Modify: `src/App.tsx`

**Contexto:** `useStaff` se invoca en línea 46 de `App.tsx`, ANTES de que `ServiceProvider` envuelva el árbol (línea ~105). Para que `useStaff` pueda usar `useService()`, necesitamos que `ServiceProvider` esté más arriba en el árbol.

**Approach:** Crear un componente interno `AuthenticatedApp` que se renderice **dentro** de `ServiceProvider`, y mover `useStaff` a ese componente interno. `ServiceProvider` necesita `user` pero NO `profile` (ya lo tiene), así que podemos crear un `ServiceProvider` con user solamente y luego dentro cargar el profile.

**Opción recomendada:** Reestructurar en dos pasos:

1. `ServiceProvider` se envuelve temprano con solo `user` (sin `profile`)
2. Un componente interno `AppWithProfile` consume `useStaff` (que ahora puede usar `useService()`)

**Step 1: Modificar `ServiceProvider` para que no requiera `profile`**

Verificar `ServiceContext.tsx` — si `profile` solo se usa para derivar `professionalName` en la creación del `FirebaseService`, podemos hacer que `profile` sea opcional y recargarlo cuando esté disponible.

> **Nota para el implementador:** Revisar `src/context/ServiceContext.tsx` línea 25 — `useMemo` que crea el service. Si profile es solo para `professionalName`, se puede pasar como prop o reestructurar. La solución más limpia es:

```tsx
// App.tsx — Nueva estructura
export default function LumenApp() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => { /* auth init — sin cambios */ }, []);

    if (!user) {
        return (
            <AppErrorBoundary>
                <Suspense fallback={...}>
                    <AuthScreen />
                    <PWAUpdatePrompt />
                </Suspense>
            </AppErrorBoundary>
        );
    }

    // ServiceProvider wraps everything that needs the service
    // useStaff now has access to useService() inside
    return <AuthenticatedApp user={user} />;
}

function AuthenticatedApp({ user }: { user: User }) {
    // Now inside ServiceProvider (need to wrap), useStaff can use useService()
    const { profile, loading: loadingProfile, createProfile } = useStaff(user);
    
    // ... rest of authenticated logic ...
}
```

> **Problema:** `ServiceProvider` actualmente requiere `profile` para crear `FirebaseService`. Se necesita evaluar si el `ServiceProvider` puede inicializarse solo con `user` y actualizarse cuando `profile` está disponible, o si la reestructuración es más profunda.

> **Alternativa pragmática:** Si la reestructuración del provider tree es demasiado compleja, mantener `useStaff` con Firestore directo pero agregar un `TODO` explícito y documentar la decisión. La migración completa se haría cuando se refactorice el contexto general (DATA-01, Fase 4).

**Step 2: Verificar compilación y que la app funcione**

Run: `npx tsc --noEmit`  
Run: `npm run build`

---

### Task 16: Migrar `useStaff.ts` a usar `IDataService`

**Files:**

- Modify: `src/hooks/useStaff.ts`

**Step 1: Reemplazar imports y lógica directa de Firestore**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import { useService } from '../context/ServiceContext';
import { StaffProfile } from '../types';

export const useStaff = (user: User | null) => {
    const service = useService();
    const [profile, setProfile] = useState<StaffProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !service) {
            setProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = service.subscribeToStaffProfile(user.uid, (staffProfile) => {
            setProfile(staffProfile);
            setLoading(false);
        });

        return unsubscribe;
    }, [user, service]);

    const createProfile = useCallback(
        async (data: { name: string; specialty?: string }) => {
            if (!user || !service) return;

            const newProfile: StaffProfile = {
                uid: user.uid,
                email: user.email || '',
                name: data.name,
                role: 'professional',
                specialty: data.specialty,
                createdAt: serverTimestamp(),
            };

            await service.createStaffProfile(user.uid, newProfile);
        },
        [user, service],
    );

    const updateProfile = useCallback(
        async (data: Partial<StaffProfile>) => {
            if (!user || !service) return;
            await service.updateStaffProfile(user.uid, data);
        },
        [user, service],
    );

    return { profile, loading, createProfile, updateProfile };
};
```

**Step 2: Eliminar imports directos de Firestore**

Verificar que NO queden imports de `firebase/firestore` (excepto `serverTimestamp` que se necesita para el tipo):

```bash
# Buscar imports de firebase/firestore en useStaff.ts
grep -n "firebase/firestore" src/hooks/useStaff.ts
```

Expected: Solo `import { serverTimestamp } from 'firebase/firestore'` (necesario para el valor de `createdAt`).

> **Nota:** Si se quiere eliminar completamente la dependencia de Firestore, mover `serverTimestamp()` al `FirebaseService.createStaffProfile()` y pasar solo los datos sin timestamp. Esto es preferible pero requiere ajustar la firma.

---

### Task 17: Verificar migración de `useStaff`

**Step 1: Verificar compilación**

Run: `npx tsc --noEmit`  
Expected: 0 errores

**Step 2: Verificar que no quedan imports directos de Firestore en hooks migrados**

```bash
grep -rn "from 'firebase/firestore'" src/hooks/ | grep -v node_modules
```

Expected: Solo `useBillingStatus.ts` (queda como deuda para Fase 4) y posiblemente `useStaff.ts` para `serverTimestamp`.

**Step 3: Verificar build**

Run: `npm run build`  
Expected: Build exitoso

**Step 4: Actualizar mock factory en `IDataService.test.ts`**

Agregar los 3 nuevos métodos al `createMockService`:

```typescript
subscribeToStaffProfile: vi.fn(),
createStaffProfile: vi.fn(),
updateStaffProfile: vi.fn(),
```

Y agregar al array `expectedMethods` del test de completitud.

---

### Task 18: Commit migración de `useStaff`

**Step 1: Commit**

```bash
git add -A
git commit -m "refactor: migrate useStaff to IDataService layer

- Add subscribeToStaffProfile, createStaffProfile, updateStaffProfile to IDataService
- Implement staff methods in FirebaseService
- Restructure App.tsx provider tree so useStaff can access ServiceContext
- Memoize createProfile and updateProfile with useCallback
- Update IDataService test mock factory with new methods
- Remove direct Firestore imports from useStaff.ts"
```

---

## Grupo D — Coverage Config

### Task 19: Expandir scope de coverage en `vitest.config.ts`

**Files:**

- Modify: `vitest.config.ts`

**Step 1: Agregar los módulos recién testeados al array `include`**

```typescript
coverage: {
    provider: 'v8',
    reporter: ['text', 'text-summary', 'lcov'],
    include: [
        // Scope reducido: solo archivos con tests reales.
        // Ampliar incrementalmente al agregar tests para más módulos.
        'src/lib/utils.ts',
        'src/hooks/useAgendaStats.ts',
        'src/hooks/usePsiquePayments.ts',
        'src/hooks/usePendingTasks.ts',
    ],
    // ... rest unchanged
},
```

**Step 2: Ejecutar coverage**

Run: `npm run test:coverage`  
Expected: Coverage pasa thresholds (80/60/80/80) para los 4 archivos en scope. Si algún threshold no se alcanza, investigar qué ramas no están cubiertas y agregar tests.

---

### Task 20: Commit coverage expansion

**Step 1: Commit**

```bash
git add -A
git commit -m "chore: expand test coverage scope to include usePsiquePayments and usePendingTasks"
```

---

## Grupo E — Verificación Final

### Task 21: Verificación end-to-end

**Step 1: TypeScript**

Run: `npx tsc --noEmit`  
Expected: 0 errores

**Step 2: Lint**

Run: `npm run lint`  
Expected: 0 errors (solo warnings aceptables como `no-explicit-any` en tests)

**Step 3: Tests**

Run: `npm test -- --run`  
Expected: Todos los tests pasan (esperado: ~40+ tests)

**Step 4: Coverage**

Run: `npm run test:coverage`  
Expected: Thresholds 80/60/80/80 cumplidos

**Step 5: Build**

Run: `npm run build`  
Expected: Build exitoso

**Step 6: Verificar que no quedan imports directos de Firestore en hooks migrados**

```bash
grep -rn "from 'firebase/firestore'" src/hooks/
```

Expected: Solo `useBillingStatus.ts` (deuda documentada para Fase 4)

**Step 7: Contar mejoras**

| Métrica | Antes (Phase 2) | Después (Phase 3) |
|---------|-----------------|-------------------|
| Lint errors | 7 | 0 |
| Lint warnings | 12 | ~10 (2 menos por AuthScreen fix) |
| Tests | 23 | ~40+ |
| Archivos en coverage scope | 2 | 4 |
| Hooks bypaseando IDataService | 2 (`useStaff`, `useBillingStatus`) | 1 (`useBillingStatus`) |

---

## Deuda técnica que queda para Fase 4

| Item | Detalle |
|------|---------|
| `useBillingStatus.ts` bypasea IDataService | Requiere agregar `subscribeToBillingQueueItem` a IDataService |
| Performance (BUILD-01) | `manualChunks` en Vite para separar Firebase/React/vendors |
| Data freshness (DATA-01) | Ventana de datos stale en DataContext |
| Accesibilidad (A11Y-01) | `ModalOverlay` sin ARIA, focus trap, Escape key |
| FirebaseService sin unit tests | 17+ métodos sin tests (requiere mocks de Firestore) |
| `no-explicit-any` warnings | 8+ warnings (mejora incremental) |

---

Plan complete and saved to `docs/plans/2026-02-23-phase3-testing-cleanup.md`. Two execution options:

**1. Subagent-Driven (this session)** — I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open new session with executing-plans, batch execution with checkpoints

Which approach?
