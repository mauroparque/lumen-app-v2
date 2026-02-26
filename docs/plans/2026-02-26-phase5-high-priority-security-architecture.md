# Phase 5 — Seguridad y Arquitectura (Prioridad Alta) — Plan de Implementación

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Resolver los 6 hallazgos de prioridad alta identificados en la auditoría del 26/02/2026 — 4 de seguridad y 2 de arquitectura/corrección.

**Architecture:** Cambios en Firestore rules, Storage rules, Cloud Functions, y service layer (IDataService + FirebaseService). Sin cambios en UI.

**Tech Stack:** Firebase Firestore rules, Firebase Storage rules, Cloud Functions v1/v2, TypeScript, Vitest.

**Auditoría de origen:** [`docs/audits/2026-02-26_AUDIT.md`](../audits/2026-02-26_AUDIT.md)  
**Auditoría base:** [`docs/audits/2026-02-19_AUDIT.md`](../audits/2026-02-19_AUDIT.md)

---

## Resumen de acciones

| # | Acción | Issue | Esfuerzo est. |
| --- | --- | --- | --- |
| 1 | Restringir `psiquePayments` a admin en Firestore rules | SEC-N01 | 15 min |
| 2 | Agregar límites de tamaño y MIME type en `storage.rules` | SEC-07 | 15 min |
| 3 | Sanitizar `data` en `triggerInvoiceGeneration` (whitelist de campos) | SEC-N02 | 30 min |
| 4 | Eliminar `deletePayment` de `IDataService`, `FirebaseService`, `useDataActions` y tests | ARCH-N01 | 30 min |
| 5 | Fix `addPayment` para respetar `date` del input | ARCH-N02 | 15 min |
| 6 | Implementar rate limiting y App Check en `validateTurnstile` | SEC-N03 | 1-2h |

**Esfuerzo total estimado:** ~3h

---

## Task 1: Restringir `psiquePayments` a admin (SEC-N01)

**Contexto:** La colección `psiquePayments` actualmente tiene `allow read, write: if isAuthenticated()` — cualquier usuario autenticado puede leer/modificar datos de facturación Psique de cualquier profesional. Debería requerir `isAdmin()` para escritura y restringir lectura por admin o profesional propio.

**Files:**
- Modify: `firestore.rules` L79-81

**Step 1: Verificar el estado actual de las reglas**

Confirmar que la regla actual es:
```
match /psiquePayments/{monthId} {
  allow read, write: if isAuthenticated();
}
```

**Step 2: Reemplazar la regla por una con RBAC**

```
// Psique payments — admin full CRUD, profesional lectura de todos (necesario para vista de pagos)
// Escritura solo admin (gestionan pagos de Psique centralizadamente)
match /psiquePayments/{monthId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated() && isAdmin();
}
```

**Decisión de diseño:** Se mantiene `read` abierto a todos los autenticados porque la vista de pagos Psique necesita mostrar el estado de pago de los meses para el profesional actual (el filtrado se realiza por campo `professional` en el frontend via `usePsiquePayments`). La escritura (`markPsiquePaymentAsPaid`) se restringe exclusivamente a administradores, ya que la gestión de pagos a Psique es una operación administrativa.

**Step 3: Desplegar reglas para verificación**

Run: `firebase deploy --only firestore:rules`  
Expected: Deploy successful

**Step 4: Commit**

```bash
git add firestore.rules
git commit -m "fix(security): restrict psiquePayments write to admin only (SEC-N01)"
```

---

## Task 2: Agregar límites de tamaño y MIME type en Storage rules (SEC-07)

**Contexto:** `storage.rules` solo verifica `request.auth != null`. Sin validación de tamaño ni tipo de archivo, un usuario autenticado podría subir archivos arbitrariamente grandes o ejecutables.

**Files:**
- Modify: `storage.rules`

**Step 1: Verificar el estado actual**

Confirmar que la regla es:
```
match /patients/{patientId}/attachments/{allPaths=**} {
  allow read, write: if request.auth != null;
}
```

**Step 2: Reemplazar con reglas que validen tamaño y tipo**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Adjuntos de pacientes: solo usuarios autenticados
    // Límite: 10MB, solo tipos de archivo seguros (docs, imágenes, PDFs)
    match /patients/{patientId}/attachments/{allPaths=**} {
      allow read: if request.auth != null;

      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024  // 10MB máximo
        && request.resource.contentType.matches('image/.*|application/pdf|application/msword|application/vnd\\.openxmlformats-officedocument\\.wordprocessingml\\.document|text/plain');
    }
  }
}
```

**MIME types permitidos:**
- `image/*` — fotos, escaneos, capturas
- `application/pdf` — informes, derivaciones
- `application/msword` — documentos Word legacy
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` — documentos Word moderno (.docx)
- `text/plain` — notas de texto

**Step 3: Desplegar reglas para verificación**

Run: `firebase deploy --only storage`  
Expected: Deploy successful

**Step 4: Commit**

```bash
git add storage.rules
git commit -m "fix(security): add file size limit (10MB) and MIME type validation to storage rules (SEC-07)"
```

---

## Task 3: Sanitizar datos en `triggerInvoiceGeneration` (SEC-N02)

**Contexto:** La Cloud Function `triggerInvoiceGeneration` hace `...data` spread, reenviando todos los campos del documento de billing queue al webhook de n8n sin sanitizar. Un documento con campos inyectados (e.g., un campo `headers` o `url`) se reenviaría al webhook.

**Files:**
- Modify: `functions/src/index.ts` L57-90

**Step 1: Identificar los campos legítimos del billing queue**

Revisar `requestBatchInvoice` en `FirebaseService.ts` para determinar los campos que se escriben al crear un documento en la billing queue:

Campos esperados:
- `type` (string: `'batch'`)
- `appointmentIds` (string[])
- `patientId` (string)
- `patientName` (string)
- `patientDni` (string)
- `patientEmail` (string)
- `totalPrice` (number)
- `lineItems` (array of `{ description, amount }`)
- `requestedAt` (Timestamp)
- `requestedBy` (string — uid)
- `status` (string: `'pending'`)

**Step 2: Implementar whitelist de campos en `triggerInvoiceGeneration`**

Reemplazar el spread `...data` con extracción explícita de campos permitidos:

```typescript
export const triggerInvoiceGeneration = functions.firestore
    .document("artifacts/{appId}/clinics/{clinicId}/integrations/billing/queue/{docId}")
    .onCreate(async (snap, context) => {
        const data = snap.data();
        const { docId } = context.params;

        // 1. Validar estado inicial
        if (data.status !== "pending") return null;

        // 2. Obtener configuración
        const config = (functions.config as any)().billing;

        if (!config || !config.url || !config.secret) {
            console.error("Falta configuración de billing (url o secret)");
            return snap.ref.update({ status: "error_config" });
        }

        // 3. Sanitizar: solo campos permitidos del billing queue
        const allowedFields = {
            type: data.type,
            appointmentIds: data.appointmentIds,
            patientId: data.patientId,
            patientName: data.patientName,
            patientDni: data.patientDni,
            patientEmail: data.patientEmail,
            totalPrice: data.totalPrice,
            lineItems: data.lineItems,
            requestedAt: data.requestedAt,
            requestedBy: data.requestedBy,
            status: data.status,
        };

        try {
            // 4. Marcar como procesando
            await snap.ref.update({ status: "processing" });

            // 5. Enviar a n8n con Header de Seguridad — solo campos sanitizados
            await axios.post(config.url, {
                queueDocId: docId,
                ...allowedFields
            }, {
                headers: { "x-lumen-secret": config.secret }
            });

            console.log(`Solicitud enviada a n8n para docId: ${docId}`);
            return null;

        } catch (error: any) {
            console.error("Error enviando a n8n:", error.message);
            return snap.ref.update({
                status: "error_sending",
                debugError: error.message
            });
        }
    });
```

**Step 3: Compilar y verificar**

Run: `cd functions && npm run build`  
Expected: Build exitoso sin errores

**Step 4: Commit**

```bash
git add functions/src/index.ts
git commit -m "fix(security): sanitize billing queue data with field whitelist before sending to webhook (SEC-N02)"
```

---

## Task 4: Eliminar `deletePayment` — código muerto (ARCH-N01)

**Contexto:** `deletePayment` existe en `IDataService`, `FirebaseService`, `useDataActions` y tests, pero Firestore rules lo bloquean con `allow delete: if false`. Es código muerto que genera una falsa expectativa. Se debe eliminar de toda la cadena.

**Files afectados (5):**
- Modify: `src/services/IDataService.ts` — eliminar declaración L41
- Modify: `src/services/FirebaseService.ts` — eliminar implementación L277-279
- Modify: `src/hooks/useDataActions.ts` — eliminar rama `'payments'` del switch L52 y tipo del union
- Modify: `src/services/__tests__/IDataService.test.ts` — eliminar mock y assertions
- Modify: `src/services/__tests__/FirebaseService.test.ts` — eliminar test

**Step 1: Eliminar de `IDataService.ts`**

Eliminar la línea:
```typescript
    deletePayment(id: string): Promise<void>;
```

**Step 2: Eliminar de `FirebaseService.ts`**

Eliminar el método:
```typescript
    async deletePayment(id: string): Promise<void> {
        const docRef = doc(db, PAYMENTS_COLLECTION, id);
        await deleteDoc(docRef);
    }
```

Verificar si `deleteDoc` queda sin otros usos en el archivo. Si solo se usaba para `deletePayment`, eliminar el import también.

**Step 3: Actualizar `useDataActions.ts`**

Cambiar el tipo del parámetro `collectionName` de `deleteItem` para excluir `'payments'`:

```typescript
    const deleteItem = async (collectionName: 'patients' | 'appointments', id: string) => {
        const s = ensureService();
        if (collectionName === 'patients') {
            return s.deletePatient(id);
        } else if (collectionName === 'appointments') {
            return s.deleteAppointment(id);
        }
        throw new Error(`Unknown collection: ${collectionName}`);
    };
```

**Step 4: Actualizar `IDataService.test.ts`**

- Eliminar `deletePayment: vi.fn()` del mock (L30)
- Eliminar assertion `expect(service.deletePayment).toBeDefined()` (L104)
- Actualizar el array de método names que verifica completeness (L162): eliminar `'deletePayment'`

**Step 5: Actualizar `FirebaseService.test.ts`**

Eliminar o modificar el test en L835:
```typescript
    it('deletePayment y updatePayment delegan en deleteDoc/updateDoc', async () => {
```

Si el test valida `deletePayment` y `updatePayment` juntos, separar y mantener solo la parte de `updatePayment`.

**Step 6: Verificar compilación y tests**

Run: `npx tsc --noEmit`  
Expected: 0 errores

Run: `npm test -- --run`  
Expected: Todos los tests pasan (puede haber 1-2 tests menos)

**Step 7: Commit**

```bash
git add src/services/IDataService.ts src/services/FirebaseService.ts src/hooks/useDataActions.ts src/services/__tests__/IDataService.test.ts src/services/__tests__/FirebaseService.test.ts
git commit -m "refactor(arch): remove dead deletePayment from service layer — blocked by Firestore rules (ARCH-N01)"
```

---

## Task 5: Fix `addPayment` para respetar `date` del input (ARCH-N02)

**Contexto:** `addPayment` en `FirebaseService.ts` descarta silenciosamente el campo `date` del `PaymentInput` y siempre sobreescribe con `Timestamp.now()`. Esto viola el contrato del tipo `PaymentInput` que incluye un campo `date: Timestamp | null`.

**Decisión de diseño:** Usar el `date` del input si se proporciona y es un Timestamp válido; usar `Timestamp.now()` como fallback si es `null` o no se envía.

**Files:**
- Modify: `src/services/FirebaseService.ts` L258-275

**Step 1: Reemplazar la implementación de `addPayment`**

De:
```typescript
    async addPayment(payment: PaymentInput, appointmentId?: string): Promise<string> {
        const batch = writeBatch(db);
        const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));

        batch.set(paymentRef, {
            ...payment,
            date: Timestamp.now(),
            createdByUid: this.uid,
        });
```

A:
```typescript
    async addPayment(payment: PaymentInput, appointmentId?: string): Promise<string> {
        const batch = writeBatch(db);
        const paymentRef = doc(collection(db, PAYMENTS_COLLECTION));

        batch.set(paymentRef, {
            ...payment,
            date: payment.date instanceof Timestamp ? payment.date : Timestamp.now(),
            createdByUid: this.uid,
        });
```

**Step 2: Verificar que los tests existentes siguen pasando**

Run: `npm test -- --run src/services/__tests__/FirebaseService.test.ts`  
Expected: Todos los tests pasan

**Step 3: Agregar test para el caso de `date` proporcionado**

En `src/services/__tests__/FirebaseService.test.ts`, buscar el bloque de tests de `addPayment` y agregar:

```typescript
    it('addPayment respeta date del input si es un Timestamp', async () => {
        const customDate = Timestamp.fromDate(new Date('2026-01-15'));
        const payment: PaymentInput = {
            patientName: 'Test Patient',
            amount: 5000,
            concept: 'Consulta',
            date: customDate,
        };

        await service.addPayment(payment);

        expect(writeBatch(db).set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ date: customDate })
        );
    });

    it('addPayment usa Timestamp.now() si date es null', async () => {
        const payment: PaymentInput = {
            patientName: 'Test Patient',
            amount: 5000,
            concept: 'Consulta',
            date: null,
        };

        await service.addPayment(payment);

        expect(writeBatch(db).set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ date: expect.any(Object) })
        );
    });
```

**Step 4: Ejecutar tests**

Run: `npm test -- --run`  
Expected: Todos los tests pasan (incluidos los nuevos)

**Step 5: Commit**

```bash
git add src/services/FirebaseService.ts src/services/__tests__/FirebaseService.test.ts
git commit -m "fix(arch): respect date from PaymentInput in addPayment, fallback to Timestamp.now() (ARCH-N02)"
```

---

## Task 6: Rate limiting y App Check en `validateTurnstile` (SEC-N03)

**Contexto:** La Cloud Function `validateTurnstile` no tiene rate limiting ni App Check habilitado (`enforceAppCheck: false`). Un atacante podría llamarla masivamente consumiendo la cuota de verificaciones de Cloudflare Turnstile.

**Files:**
- Modify: `functions/src/index.ts` L8-45

### Parte A: Habilitar App Check

**Step 1: Habilitar `enforceAppCheck` en la función**

Cambiar `enforceAppCheck: false` a `enforceAppCheck: true`:

```typescript
export const validateTurnstile = onCall(
    {
        enforceAppCheck: true,
        secrets: ["TURNSTILE_SECRET"],
    },
    async (request) => {
```

> **Nota:** Esto requiere que App Check esté configurado en el frontend con un provider (reCAPTCHA Enterprise o similar). Si aún no está configurado, dejarlo como `false` y documentarlo como prerrequisito. La configuración del frontend se detalla en el Step 2.

**Step 2: Configurar App Check en el frontend (prerrequisito)**

Si App Check no está configurado en el proyecto, se necesita:

1. Activar App Check en la Firebase Console (Settings → App Check)
2. Registrar un provider (reCAPTCHA Enterprise se recomienda para web)
3. Agregar al `src/lib/firebase.ts`:

```typescript
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

// Después de initializeApp
if (import.meta.env.PROD) {
    initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
    });
}
```

4. Agregar `VITE_RECAPTCHA_SITE_KEY` a `.env` y `.env.example`

> **IMPORTANTE:** Si App Check no está configurado en el proyecto Firebase, este paso debe hacerse primero en la Firebase Console. Si no se puede activar en esta iteración, dejar `enforceAppCheck: false` y documentar como prerequisito pendiente.

### Parte B: Rate limiting con Firestore counter

**Step 3: Implementar rate limiting in-memory en la Cloud Function**

Agregar un rate limiter simple basado en IP usando un Map en memoria. Esto funciona por instancia de Cloud Function y es una protección básica contra abuso:

```typescript
// Rate limiting in-memory (por instancia de CF)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 5;   // 5 intentos por minuto por IP

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    entry.count++;
    return true;
}
```

**Step 4: Integrar rate limiting en `validateTurnstile`**

```typescript
export const validateTurnstile = onCall(
    {
        enforceAppCheck: true,  // o false si App Check no está configurado aún
        secrets: ["TURNSTILE_SECRET"],
    },
    async (request) => {
        // Rate limiting por IP
        const ip = request.rawRequest?.ip || 'unknown';
        if (!checkRateLimit(ip)) {
            throw new HttpsError("resource-exhausted", "Too many requests. Try again later.");
        }

        const token = request.data?.token;
        // ... resto igual ...
    }
);
```

**Step 5: Compilar y verificar**

Run: `cd functions && npm run build`  
Expected: Build exitoso

**Step 6: Decisión de despliegue de App Check**

Si App Check no está configurado en Firebase Console:
- Dejar `enforceAppCheck: false` por ahora
- Agregar comentario `// TODO: enable after configuring App Check in Firebase Console`
- El rate limiting funciona independientemente de App Check

**Step 7: Commit**

```bash
git add functions/src/index.ts
git commit -m "fix(security): add rate limiting to validateTurnstile + prepare App Check enforcement (SEC-N03)"
```

Si también se configuró App Check en el frontend:

```bash
git add functions/src/index.ts src/lib/firebase.ts .env.example
git commit -m "fix(security): add rate limiting and App Check enforcement to validateTurnstile (SEC-N03)"
```

---

## Verificación final

Después de completar las 6 tasks:

**Step 1: Compilar todo**

```bash
npx tsc --noEmit
cd functions && npm run build && cd ..
```

Expected: 0 errores en ambos

**Step 2: Lint**

```bash
npx eslint src/
```

Expected: 0 errores (warnings pre-existentes son aceptables)

**Step 3: Tests**

```bash
npm test -- --run
```

Expected: Todos los tests pasan. Count ~90-94 (se eliminaron tests de deletePayment, se agregaron de addPayment).

**Step 4: Build de producción**

```bash
npm run build
```

Expected: Build exitoso sin warnings nuevos

**Step 5: Commit final y tag**

```bash
git tag -a v1.2.0 -m "Phase 5: High-priority security and architecture fixes (SEC-N01, SEC-N02, SEC-N03, SEC-07, ARCH-N01, ARCH-N02)"
```

---

## Resumen de hallazgos abordados

| Issue | Descripción | Task |
| --- | --- | --- |
| SEC-N01 | `psiquePayments` sin RBAC | Task 1 |
| SEC-07 | Storage rules sin límites | Task 2 |
| SEC-N02 | `triggerInvoiceGeneration` sin sanitización | Task 3 |
| ARCH-N01 | `deletePayment` código muerto | Task 4 |
| ARCH-N02 | `addPayment` descarta `date` del input | Task 5 |
| SEC-N03 | `validateTurnstile` sin rate limiting ni App Check | Task 6 |
