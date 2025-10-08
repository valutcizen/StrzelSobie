# Project Overview

This is a shooting range reservation system named "Strzel Sobie". It's a modular monolith built with a Vue.js frontend and a Cloudflare Worker backend. The backend is divided into several modules, each responsible for a specific business domain like authentication, user management, reservations, etc.
Detailed description is in Product Requirements Document in file `.ai/prd.md`.

## Building and Running

### Installation

To install all dependencies for all modules, run:

```bash
npm install
```

### Build

To build all modules, run:

```bash
npm run build
```

### Testing

To run tests for all modules, run:

```bash
npm run test
```

## Development Conventions

When editing files, please adhere to the following rulesets:
**Backend modules** (`src/auth`, `src/users`, `src/reservations`, `src/admin`, `src/notifications`): Use the rules defined in `.ai/rules/backend.md`.
**Client module** (`src/client`): Use the rules defined in `.ai/rules/client.md`.
**Worker module** (`src/worker`): Use the rules defined in `.ai/rules/worker.md`.

The project uses npm workspaces to manage the different modules. Each module has its own `package.json` file. The backend is designed to be a set of independent modules that are composed together in the Cloudflare Worker. The frontend is a standard Vue.js application.

The project is in an early stage of development. The frontend has a placeholder `App.vue` and the backend worker implementation is missing.

After every change check README.md for module or in root path if need to be changed.