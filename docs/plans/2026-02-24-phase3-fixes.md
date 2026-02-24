# Phase 3 — Code Review Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Origen:** Code review sobre rama `phase3-lint-cleanup` — 3 hallazgos (F1 Critical, F2 High, F3 Low).  
**Plan principal:** [2026-02-23-phase3-testing-cleanup.md](2026-02-23-phase3-testing-cleanup.md)  
**Review de cierre:** (pendiente)

**Goal:** Resolver los 3 hallazgos del code review para desbloquear el merge de Phase 3.

**Architecture:** F1 corrige rutas Firestore en staff methods. F2 extrae lógica pura de `usePsiquePayments` y reescribe tests sin `renderHook`. F3 limpia un mock duplicado.

**Tech Stack:** TypeScript, Vitest, Firebase/Firestore

---

## F1 — FirebaseService staff methods usan ruta incorrecta (Critical)

**Problema:** Los 3 métodos de staff (`subscribeToStaffProfile`, `createStaffProfile`, `updateStaffProfile`) usan `doc(db, 'staff', uid)` que resuelve a `/staff/{uid}` (raíz de Firestore). Debería usar `STAFF_COLLECTION` de `routes.ts` que resuelve a `artifacts/{appId}/clinics/{CLINIC_ID}/staff/{uid}`.

### Task 1: Agregar STAFF_COLLECTION al import de routes.ts

**Files:**
- Modify: `src/services/FirebaseService.ts` (línea ~20, import de routes)

**Step 1: Agregar STAFF_COLLECTION al import existente**

Cambiar:
```typescript
import {
    PATIENTS_COLLECTION,
    APPOINTMENTS_COLLECTION,
    PAYMENTS_COLLECTION,
    BILLING_QUEUE_COLLECTION,
    NOTES_COLLECTION,
    PSIQUE_PAYMENTS_COLLECTION,
} from '../lib/routes';
```

A:
```typescript
import {
    PATIENTS_COLLECTION,
    APPOINTMENTS_COLLECTION,
    PAYMENTS_COLLECTION,
    BILLING_QUEUE_COLLECTION,
    NOTES_COLLECTION,
    PSIQUE_PAYMENTS_COLLECTION,
    STAFF_COLLECTION,
} from '../lib/routes';
```

### Task 2: Reemplazar `'staff'` por `STAFF_COLLECTION` en los 3 métodos

**Files:**
- Modify: `src/services/FirebaseService.ts` (3 ocurrencias de `doc(db, 'staff', uid)`)

**Step 1: Corregir `subscribeToStaffProfile`**

Cambiar:
```typescript
const docRef = doc(db, 'staff', uid);
```
A:
```typescript
const docRef = doc(db, STAFF_COLLECTION, uid);
```

**Step 2: Corregir `createStaffProfile`**

Cambiar:
```typescript
const docRef = doc(db, 'staff', uid);
```
A:
```typescript
const docRef = doc(db, STAFF_COLLECTION, uid);
```

**Step 3: Corregir `updateStaffProfile`**

Cambiar:
```typescript
const docRef = doc(db, 'staff', uid);
```
A:
```typescript
const docRef = doc(db, STAFF_COLLECTION, uid);
```

**Step 4: Verificar que compila**

Run: `npx tsc --noEmit`
Expected: Sin errores nuevos.

**Step 5: Commit**

```bash
git add src/services/FirebaseService.ts
git commit -m "fix: use STAFF_COLLECTION from routes.ts in staff methods"
```

---

## F2 — usePsiquePayments.test.ts causa OOM (High)

**Problema:** Los tests usan `renderHook` con `vi.mock` de `ServiceContext` y `DataContext`, lo que causa Out-of-Memory (~4GB heap) en jsdom. El worker de Vitest crashea con código 1.

**Solución acordada:** Extraer la lógica pura de cálculo del `useMemo` a una función exportada (`calculatePsiqueMonthData`), y reescribir los tests para testear esa función directamente — sin `renderHook`, sin `vi.mock`, sin jsdom.

### Task 3: Extraer función pura `calculatePsiqueMonthData`

**Files:**
- Modify: `src/hooks/usePsiquePayments.ts`

**Step 1: Exportar las interfaces y la constante**

Las interfaces `PsiquePatientBreakdown` y `PsiqueMonthData` ya existen pero no se exportan. Agregar `export` a ambas y a `PSIQUE_RATE`:

```typescript
export const PSIQUE_RATE = 0.25;

export interface PsiquePatientBreakdown {
    patientId: string;
    patientName: string;
    sessionCount: number;
    totalFee: number;
    psiqueAmount: number;
}

export interface PsiqueMonthData {
    month: string;
    totalAmount: number;
    patientBreakdown: PsiquePatientBreakdown[];
    isPaid: boolean;
    paidDate?: string;
}
```

**Step 2: Crear la función pura `calculatePsiqueMonthData`**

Agregar debajo de las interfaces, antes de `export function usePsiquePayments`:

```typescript
/**
 * Pure function — no React hooks. Computes the Psique month breakdown
 * from raw appointments, patient IDs, and payment records.
 */
export function calculatePsiqueMonthData(
    appointments: Appointment[],
    psiquePatientIds: Set<string>,
    selectedMonth: Date,
    psiquePayments: Record<string, PsiquePayment>,
    professionalName?: string,
): PsiqueMonthData {
    const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;

    const psiqueAppointments = appointments.filter((a) => {
        if (!a.isPaid || a.status === 'cancelado') return false;
        if (!psiquePatientIds.has(a.patientId)) return false;
        if (a.excludeFromPsique) return false;
        return a.date.startsWith(monthStr);
    });

    const patientMap: Record<string, PsiquePatientBreakdown> = {};

    psiqueAppointments.forEach((appt) => {
        if (!patientMap[appt.patientId]) {
            patientMap[appt.patientId] = {
                patientId: appt.patientId,
                patientName: appt.patientName,
                sessionCount: 0,
                totalFee: 0,
                psiqueAmount: 0,
            };
        }

        const fee = appt.price || 0;
        patientMap[appt.patientId].sessionCount++;
        patientMap[appt.patientId].totalFee += fee;
        patientMap[appt.patientId].psiqueAmount += fee * PSIQUE_RATE;
    });

    const patientBreakdown = Object.values(patientMap).sort((a, b) =>
        a.patientName.localeCompare(b.patientName),
    );
    const totalAmount = patientBreakdown.reduce((sum, p) => sum + p.psiqueAmount, 0);

    const getDocKey = (month: string, professional?: string) => {
        if (professional) {
            const safeName = professional.replace(/[/.#$[\]]/g, '_');
            return `${month}_${safeName}`;
        }
        return month;
    };

    const docKey = getDocKey(monthStr, professionalName);
    const paymentRecord = psiquePayments[docKey];

    return {
        month: monthStr,
        totalAmount,
        patientBreakdown,
        isPaid: paymentRecord?.isPaid || false,
        paidDate: paymentRecord?.paidDate,
    };
}
```

**Step 3: Refactorizar el hook para usar la función pura**

Reemplazar el `useMemo` de `monthData`, el `useMemo` de `psiquePatientIds`, el `getDocKey` callback, y la línea `effectiveAppointments`. El hook queda como glue code:

```typescript
export function usePsiquePayments(
    appointments: Appointment[],
    patients: Patient[],
    selectedMonth: Date,
    professionalName?: string,
) {
    const service = useService();
    const { appointments: contextAppointments } = useData();
    const [psiquePayments, setPsiquePayments] = useState<Record<string, PsiquePayment>>({});
    const [loading, setLoading] = useState(true);

    const psiquePatientIds = useMemo(() => {
        return new Set(patients.filter((p) => p.patientSource === 'psique').map((p) => p.id));
    }, [patients]);

    const effectiveAppointments = appointments?.length ? appointments : contextAppointments;

    const monthData = useMemo(
        () =>
            calculatePsiqueMonthData(
                effectiveAppointments,
                psiquePatientIds,
                selectedMonth,
                psiquePayments,
                professionalName,
            ),
        [effectiveAppointments, psiquePatientIds, selectedMonth, psiquePayments, professionalName],
    );

    useEffect(() => {
        if (!service) return;
        setLoading(true);

        const unsub = service.subscribeToPsiquePayments(professionalName, (payments) => {
            setPsiquePayments(payments);
            setLoading(false);
        });

        return unsub;
    }, [service, professionalName]);

    const getDocKey = useCallback((month: string, professional?: string) => {
        if (professional) {
            const safeName = professional.replace(/[/.#$[\]]/g, '_');
            return `${month}_${safeName}`;
        }
        return month;
    }, []);

    const markAsPaid = useCallback(
        async (month: string, isPaid: boolean) => {
            if (!service) throw new Error('Service not available');
            const docKey = getDocKey(month, professionalName);
            const data: Omit<PsiquePayment, 'id'> & { professional?: string } = {
                month,
                totalAmount: monthData.totalAmount,
                isPaid,
                professional: professionalName,
                ...(isPaid ? { paidDate: new Date().toISOString().split('T')[0] } : {}),
            };
            return service.markPsiquePaymentAsPaid(docKey, data);
        },
        [service, professionalName, monthData, getDocKey],
    );

    return {
        monthData,
        loading,
        markAsPaid,
        PSIQUE_RATE,
    };
}
```

**Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: Sin errores.

**Step 5: Commit**

```bash
git add src/hooks/usePsiquePayments.ts
git commit -m "refactor: extract calculatePsiqueMonthData pure function from hook"
```

### Task 4: Reescribir tests para testear la función pura

**Files:**
- Rewrite: `src/hooks/__tests__/usePsiquePayments.test.ts`

**Step 1: Reemplazar el archivo completo**

El nuevo archivo no usa `renderHook`, no usa `vi.mock`, no necesita jsdom. Testea `calculatePsiqueMonthData` y `PSIQUE_RATE` directamente:

```typescript
import { describe, it, expect } from 'vitest';
import {
    calculatePsiqueMonthData,
    PSIQUE_RATE,
} from '../usePsiquePayments';
import type { Appointment, PsiquePayment } from '../../types';

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

const selectedMonth = new Date(2026, 1); // February 2026
const emptyPayments: Record<string, PsiquePayment> = {};

describe('calculatePsiqueMonthData', () => {
    it('returns zero totals when no psique patients exist', () => {
        const psiqueIds = new Set<string>(); // no psique patients
        const appointments = [makeAppointment({ isPaid: true })];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(0);
        expect(result.patientBreakdown).toEqual([]);
    });

    it('calculates 25% fee for psique patient appointments', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({ patientId: 'p-1', date: '2026-02-10', isPaid: true, price: 10000 }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(2500);
        expect(result.patientBreakdown).toHaveLength(1);
        expect(result.patientBreakdown[0].psiqueAmount).toBe(2500);
    });

    it('excludes unpaid appointments', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({ patientId: 'p-1', date: '2026-02-10', isPaid: false, price: 10000 }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(0);
    });

    it('excludes cancelled appointments', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({
                patientId: 'p-1', date: '2026-02-10', isPaid: true,
                status: 'cancelado', price: 10000,
            }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(0);
    });

    it('respects excludeFromPsique flag on individual appointments', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({
                patientId: 'p-1', date: '2026-02-10', isPaid: true,
                price: 10000, excludeFromPsique: true,
            }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(0);
    });

    it('filters appointments by selected month', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({ patientId: 'p-1', date: '2026-02-10', isPaid: true, price: 10000 }),
            makeAppointment({ id: 'a-2', patientId: 'p-1', date: '2026-03-10', isPaid: true, price: 8000 }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(2500);
    });

    it('aggregates multiple sessions per patient', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({ id: 'a-1', patientId: 'p-1', date: '2026-02-05', isPaid: true, price: 10000 }),
            makeAppointment({ id: 'a-2', patientId: 'p-1', date: '2026-02-12', isPaid: true, price: 10000 }),
            makeAppointment({ id: 'a-3', patientId: 'p-1', date: '2026-02-19', isPaid: true, price: 10000 }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.totalAmount).toBe(7500);
        expect(result.patientBreakdown[0].sessionCount).toBe(3);
    });

    it('sorts patient breakdown alphabetically', () => {
        const psiqueIds = new Set(['p-1', 'p-2']);
        const appointments = [
            makeAppointment({ id: 'a-1', patientId: 'p-1', patientName: 'Zara', date: '2026-02-10', isPaid: true, price: 5000 }),
            makeAppointment({ id: 'a-2', patientId: 'p-2', patientName: 'Ana', date: '2026-02-10', isPaid: true, price: 5000 }),
        ];

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, emptyPayments,
        );

        expect(result.patientBreakdown[0].patientName).toBe('Ana');
        expect(result.patientBreakdown[1].patientName).toBe('Zara');
    });

    it('resolves isPaid from payment records using docKey', () => {
        const psiqueIds = new Set(['p-1']);
        const appointments = [
            makeAppointment({ patientId: 'p-1', date: '2026-02-10', isPaid: true, price: 10000 }),
        ];
        const payments: Record<string, PsiquePayment> = {
            '2026-02_Dr__Test': {
                id: '2026-02_Dr__Test',
                month: '2026-02',
                totalAmount: 2500,
                isPaid: true,
                paidDate: '2026-02-28',
            },
        };

        const result = calculatePsiqueMonthData(
            appointments, psiqueIds, selectedMonth, payments, 'Dr. Test',
        );

        expect(result.isPaid).toBe(true);
        expect(result.paidDate).toBe('2026-02-28');
    });
});

describe('PSIQUE_RATE', () => {
    it('equals 0.25', () => {
        expect(PSIQUE_RATE).toBe(0.25);
    });
});
```

**Step 2: Ejecutar los tests**

Run: `npx vitest run src/hooks/__tests__/usePsiquePayments.test.ts`
Expected: 10 tests PASS, 0 heap issues, exit code 0.

**Step 3: Verificar que los demás tests siguen pasando**

Run: `npx vitest run`
Expected: Todos los test suites pasan (incluyendo utils, useAgendaStats, usePendingTasks, IDataService).

**Step 4: Commit**

```bash
git add src/hooks/__tests__/usePsiquePayments.test.ts
git commit -m "test: rewrite usePsiquePayments tests against pure function (fixes OOM)"
```

---

## F3 — Mock duplicado en usePendingTasks.test.ts (Low)

**Problema:** `vi.mock('../../context/ServiceContext')` aparece dos veces — líneas 6-14 (retorna array vacío) y líneas 64-72 (retorna `mockNotes`). Vitest ejecuta ambos en orden, el segundo sobreescribe al primero. El primero es dead code.

### Task 5: Eliminar el mock duplicado

**Files:**
- Modify: `src/hooks/__tests__/usePendingTasks.test.ts`

**Step 1: Eliminar el primer `vi.mock('../../context/ServiceContext')`**

Eliminar las líneas 6-14:

```typescript
vi.mock('../../context/ServiceContext', () => ({
    useService: vi.fn(() => ({
        subscribeToAllNotes: vi.fn((cb: (notes: ClinicalNote[]) => void) => {
            cb([]);
            return vi.fn();
        }),
        completeTask: vi.fn().mockResolvedValue(undefined),
    })),
}));
```

Dejar solo el segundo (que usa `mockNotes` y es el que realmente se ejecuta).

**Step 2: Ejecutar tests**

Run: `npx vitest run src/hooks/__tests__/usePendingTasks.test.ts`
Expected: 8 tests PASS, sin cambio de comportamiento.

**Step 3: Commit**

```bash
git add src/hooks/__tests__/usePendingTasks.test.ts
git commit -m "test: remove duplicate vi.mock in usePendingTasks tests"
```

---

## Verificación final

### Task 6: Verificación completa pre-merge

**Step 1:** `npx tsc --noEmit` → 0 errores  
**Step 2:** `npx eslint .` → 0 errores (warnings pre-existentes OK)  
**Step 3:** `npx vitest run` → todos los suites pasan, exit code 0  
**Step 4:** `npx vitest run --coverage` → thresholds cumplidos (80/60/80/80)  
**Step 5:** `npm run build` → build exitoso  

Si todo pasa, la rama está lista para merge.
