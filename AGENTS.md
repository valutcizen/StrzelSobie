# Project Overview

This is a shooting range reservation system named "Strzel Sobie". It's a modular monolith built with a Vue.js frontend and a Cloudflare Worker backend. The backend is divided into several modules, each responsible for a specific business domain like authentication, user management, reservations, etc.
Detailed description is in Product Requirements Document in file `.ai/prd.md`.

## Building and Running

### Installation

To install all dependencies for all modules, run:

```bash
npm install
```

### Development

To start the backend development server, run:

```bash
npm run dev:backend
```

### Build

To build all modules, run:

```bash
npm run build
```

This will build both the frontend and the backend. You can also build them separately:

- **Frontend:** `npm run build:frontend`
- **Backend:** `npm run build:backend`

### Testing

To run unit and integration tests for all modules, run:

```bash
npm run test
```

To run the end-to-end tests, use:

```bash
npm run test:e2e
```

### Database

To apply database migrations, run:

```bash
npm run db:migrate
```

To reset the database to its initial state with mock data, run:

```bash
npm run db:reset
```

## Development Conventions

When editing files, please adhere to the following rulesets:
**Backend modules** (`src/auth`, `src/users`, `src/reservations`, `src/ranges`, `src/notifications`): Use the rules defined in `.ai/rules/backend.md`.
**Client module** (`src/client`): Use the rules defined in `.ai/rules/client.md`.
**Worker module** (`src/worker`): Use the rules defined in `.ai/rules/worker.md`.
**Data Flow**: Use the rules defined in `.ai/rules/data-flow.md`.
**Testing**: See the overview in `.ai/rules/unit.tests.md`, `.ai/rules/integration.tests.md` for guidance on mocking, Result handling, and Vitest usage.

The project uses npm workspaces to manage the different modules. Each module has its own `package.json` file. The backend is designed to be a set of independent modules that are composed together in the Cloudflare Worker. The frontend is a standard Vue.js application.

The project is in an early stage of development. The backend API is largely in place, and the frontend is now ready for testing.

After every change check README.md for module or in root path if need to be changed.
