# Lumen Salud Mental

PWA de gestión clínica para consultorios de salud mental. Permite administrar pacientes, turnos, pagos, facturación, notas clínicas y tareas, con soporte multi-profesional y filtrado de datos por profesional.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | React 18 + TypeScript + Vite |
| Estilos | TailwindCSS + `cn()` (clsx + tailwind-merge) |
| Backend | Firebase (Firestore, Auth, Storage) |
| Funciones | Cloud Functions v1/v2 (Node 20) |
| Testing | Vitest + Testing Library (unit) · Playwright (E2E) |
| PWA | vite-plugin-pwa |
| Iconos | lucide-react |

## Requisitos previos

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta de Firebase con proyecto configurado

## Configuración inicial

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` y completar las variables:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

3. Instalar dependencias:

```bash
npm install
cd functions && npm install && cd ..
```

## Scripts disponibles

```bash
# Desarrollo
npm run dev          # Servidor de desarrollo (localhost:5173)

# Calidad
npm run lint         # ESLint
npm run format       # Prettier
npm run type-check   # tsc --noEmit
npm run ci           # type-check + lint + tests + build (pipeline completo)

# Testing
npm test             # Vitest en modo watch
npm run test:ui      # Vitest con UI en browser
npm run test:coverage # Coverage con v8
npm run test:e2e     # Playwright (requiere servidor corriendo)

# Build y preview
npm run build        # Build de producción
npm run preview      # Preview del build
```

## Arquitectura

```
ServiceContext
  └── FirebaseService (IDataService)
        └── DataContext (suscripciones Firestore en tiempo real)
              └── views / hooks
```

- **`IDataService`** (`src/services/IDataService.ts`) — interfaz abstracta para todas las operaciones de datos.
- **`FirebaseService`** (`src/services/FirebaseService.ts`) — implementación única; queries filtrados por `professionalName`.
- **`DataContext`** — expone `appointments` (profesional actual) y `allAppointments` (todos los profesionales).

### Ruta base en Firestore

```
artifacts/lumen-production/clinics/lumen-general/{colección}
```

### Routing

Sin biblioteca de routing. `App.tsx` maneja la vista activa con estado `currentView` + `React.lazy()` para code splitting.

## Estructura de directorios

```
src/
├── components/         # Componentes React
│   ├── layout/         # Sidebar, MobileHeader
│   ├── modals/         # Modales (turnos, pacientes, pagos…)
│   ├── patients/       # Componentes de pacientes
│   ├── payments/       # Componentes de pagos
│   └── ui/             # Primitivas compartidas (LoadingSpinner, ModalOverlay)
├── context/            # DataContext, ServiceContext
├── hooks/              # Custom hooks (useDataActions, useAgendaStats…)
├── lib/                # Firebase config, utils, constantes, routes
│   └── __tests__/      # Tests unitarios de lib/
├── services/           # IDataService, FirebaseService
│   └── __tests__/      # Tests de servicios
├── types/              # Tipos de dominio (index.ts)
├── views/              # Vistas lazy (Dashboard, Calendar, Patients…)
└── App.tsx

functions/              # Cloud Functions (Node 20)
  └── src/index.ts      # validateTurnstile, triggerInvoiceGeneration

tests/                  # Tests E2E con Playwright
docs/                   # Auditorías, planes, reviews y documentación técnica
```

## Despliegue

```bash
# Reglas de Firestore
firebase deploy --only firestore:rules

# Reglas de Storage
firebase deploy --only storage

# Hosting
firebase deploy --only hosting

# Cloud Functions
cd functions && npm run deploy
```

## Testing

Los tests unitarios están en `src/lib/__tests__/` y `src/services/__tests__/`. Los tests E2E están en `tests/`.

```bash
# Correr todos los tests una vez
npm test -- --run

# Coverage
npm run test:coverage

# E2E (requiere servidor en localhost:5173)
npm run dev &
npm run test:e2e
```

**Coverage mínimo exigido (vitest.config.ts):** 80% statements, branches, functions y lines sobre los archivos en scope.

## Dominio

| Concepto | Detalle |
| --- | --- |
| Estados de turno | `programado` · `completado` · `cancelado` · `ausente` · `presente` |
| Fuente de paciente | `particular` · `psique` |
| Lógica Psique | 25% de comisión para pacientes `psique`; opt-out por turno con `excludeFromPsique: true` |
| Turnos facturados | `billingStatus: 'invoiced'` → solo se puede modificar `isPaid` |
| Pagos | No se pueden eliminar (regla de Firestore) |

## Documentación

Ver [`docs/README.md`](docs/README.md) para el historial completo de auditorías, planes de implementación y reviews de ciclo.

| Documento | Descripción |
| --- | --- |
| [`docs/audits/`](docs/audits/) | Auditorías periódicas de calidad |
| [`docs/plans/`](docs/plans/) | Planes de implementación task-by-task |
| [`docs/reviews/`](docs/reviews/) | Registros de cierre de fase |
| [`docs/technical/v1.0.0_TECHNICAL.md`](docs/technical/v1.0.0_TECHNICAL.md) | Arquitectura técnica detallada |

## Estado actual

**Versión:** `1.1.0` · **Score de calidad:** B+ (auditoría 26/02/2026)

| Área | Score |
| --- | --- |
| Seguridad | B |
| Arquitectura | B+ |
| TypeScript | A- |
| Testing | B- |
| Performance | A- |
| Accesibilidad | B+ |
| DX | A- |
