# Lumen Salud Mental — Copilot Instructions

## Agent Skills — Mandatory Usage

This project uses a **skills** system located in `.agents/skills/`. All skills are listed with routing signals and paths in [.agents/skills/SKILLS_INDEX.md](../.agents/skills/SKILLS_INDEX.md).

### Rules

1. **Read `using-superpowers`** at the start of every conversation — it is the only mandatory skill.
2. **Consult SKILLS_INDEX.md** to find skills matching your current task. The index has a signal→skill routing table — scan it and load all matching skills before acting.
3. Skills cover process (planning, debugging, TDD), technology (vitest, playwright, firebase, tailwind, vite), and quality (code review, verification). Don't limit yourself to process skills — load technology-specific skills when the task involves those technologies.
4. **Rigid skills** (TDD, debugging, verification): follow strictly. **Flexible skills** (frontend patterns, design, tools): adapt to context.

---

## Guardrail Command Validation — Mandatory

All shell commands executed by the agent **must** be validated through the Guardrail MCP tools before execution. The MCP server runs as a Docker container and is integrated directly into VS Code — no Python wrapper needed.

### Workflow per conversation

1. **Call `mcp_guardrail-mcp_guardrail_init_session`** at the start of every conversation to obtain a `session_token`.
2. **Call `mcp_guardrail-mcp_guardrail_validate_bash`** with the command and `session_token` before every `run_in_terminal` call.
3. **If `valid: true`** → proceed with `run_in_terminal`.
4. **If blocked** → report the violation, do NOT rewrite the command to bypass it.

### Rules

| Rule                                   | Description                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Initialize session**                 | At the start of every conversation call `mcp_guardrail-mcp_guardrail_init_session`                    |
| **Obtain session token**               | Do NOT run terminal commands or edit files without a valid `session_token`                            |
| **Use session token**                  | Pass the token in all subsequent guardrail tool calls                                                 |
| **Validate before execute**            | Call `mcp_guardrail-mcp_guardrail_validate_bash` before every `run_in_terminal`                       |
| **If a command is blocked**            | Report the reason — do NOT bypass or rewrite to circumvent the guardrail                              |
| **If the MCP server is not reachable** | Restart the Docker stack: `cd ~/tools/agent-guardrails-mcp/mcp-server/deploy && docker compose up -d` |

### Protected operation categories

- `git` — force push, hard reset on shared branches, remote branch deletion, clean force
- `bash` — `rm -rf` on system/home dirs, curl pipe sh, chmod 777
- `database` — DROP DATABASE, TRUNCATE TABLE
- `security` — credential exposure in shell
- `deploy` — bare `firebase deploy` without `--only`

> This is a **rigid rule**: no shortcuts, no exceptions.

---

## Project Overview

Mental-health clinic management PWA (React 18 + TypeScript + Vite + Firebase + TailwindCSS). Spanish-language domain: patients, appointments, payments, billing, clinical notes. Multi-professional support with per-professional data filtering.

## Architecture

### Data Flow

`ServiceContext` creates a `FirebaseService` (bound to current user/professional) → `DataContext` subscribes to Firestore real-time streams → views/hooks consume via `useData()` / `useService()` / `useDataActions()`.

- **`IDataService`** (`src/services/IDataService.ts`) — abstract interface for all data operations
- **`FirebaseService`** (`src/services/FirebaseService.ts`) — sole implementation; queries are scoped by `professionalName`
- **`DataContext`** exposes two appointment sets: `appointments` (my professional) and `allAppointments` (all professionals for agenda "Todos")

### Firestore Path Convention

All collections are nested under a fixed artifact/clinic path defined in `src/lib/routes.ts`:

```
artifacts/{appId}/clinics/{CLINIC_ID}/{collection}
```

`appId` and `CLINIC_ID` are constants in `src/lib/firebase.ts` — never dynamic.

### View Routing

No router library — `App.tsx` uses a `currentView` state (`View` type) with conditional rendering + `React.lazy` for code splitting. Navigation is via `setCurrentView()` prop drilling.

## Key Conventions

### Types

All domain types live in `src/types/index.ts`. Use `PatientInput`, `AppointmentInput`, `PaymentInput` (Omit<T, 'id'>) for creation payloads.

### Hooks Pattern

- **Data reads**: `useData()` from `DataContext` for patients/appointments/payments
- **Mutations**: `useDataActions()` wraps `IDataService` methods with service-availability guard
- **Specialized**: `useAgendaStats`, `usePsiquePayments`, `usePendingTasks`, `useClinicalNotes`, `useBillingStatus`, `useCalendarAppointments` — each in `src/hooks/`

### Styling

TailwindCSS with `cn()` utility (`src/lib/utils.ts`) combining `clsx` + `tailwind-merge`. Brand color: `teal-600`. No CSS modules or styled-components.

### UI Components

Shared primitives in `src/components/ui/index.tsx` (`LoadingSpinner`, `ModalOverlay`). Modals use `ModalOverlay` with backdrop-blur + click-outside-to-close pattern.

### Icons

`lucide-react` exclusively. No other icon library.

## Documentation Convention (`docs/`)

### Folder structure

```
docs/
  audits/      ← quality audits periódicos           → YYYY-MM-DD_AUDIT.md
  plans/       ← planes de implementación            → YYYY-MM-DD-<fase-o-feature>.md
  reviews/     ← registros de cierre de fase         → YYYY-MM-DD_<tema>-review.md
  technical/   ← documentación técnica/arquitectura  → v<semver>_TECHNICAL.md
  README.md    ← índice maestro con historial y deuda técnica abierta
```

### Reglas de vinculación entre documentos

Todo documento debe referenciar hacia adelante **y** hacia atrás:

- **Auditoría** → al final, sección "Planes generados" con links a cada plan y al review de cierre.
- **Plan** → en el header, link a la auditoría de origen + plan relacionado (si hay fixes) + review de cierre.
- **Review** → en el header, link a la auditoría y a todos los planes que verificó.
- **`docs/README.md`** → actualizar la tabla del historial y el árbol de ciclos cada vez que se crea un documento nuevo.

### Obligaciones al crear un documento nuevo

1. Usar el patrón de nombre de su carpeta.
2. Agregar la fila correspondiente en `docs/README.md`.
3. Agregar el link de retorno en los documentos a los que referencia.

---

## Domain-Specific Rules

### Appointment Statuses

`'programado' | 'completado' | 'cancelado' | 'ausente' | 'presente'` — Spanish terms, not English.

### Psique Billing Logic

Patients with `patientSource: 'psique'` incur a 25% fee to Psique Salud Mental. Individual appointments can opt out via `excludeFromPsique: true`. Cancelled appointments with `chargeOnCancellation: true` still generate charges.

### Firestore Security Constraints

- **Invoiced appointments** (`billingStatus: 'invoiced'`) can only have `isPaid` updated — all other fields are locked by Firestore rules
- **Payments** cannot be deleted (rule: `allow delete: if false`)
- Billing queue items are write-once (no update/delete)

## Commands

```bash
npm run dev          # Vite dev server (localhost:5173)
npm run build        # Production build
npm test             # Vitest (unit, jsdom, src/**/*.test.ts)
npm run test:e2e     # Playwright (chromium, tests/*.spec.ts)
```

### Firebase

```bash
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

### Cloud Functions

Located in `functions/` with separate `package.json`. The `triggerInvoiceGeneration` function watches the billing queue and forwards to an n8n webhook.

## Testing

- **Unit**: Vitest + jsdom + `@testing-library/react`. Setup in `src/test/setup.ts`. Tests in `src/lib/__tests__/`.
- **E2E**: Playwright against dev server (`--mode test`). Tests in `tests/`.

## Environment Variables

Firebase config via `VITE_FIREBASE_*` env vars (validated at startup in `src/lib/firebase.ts`):
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.
