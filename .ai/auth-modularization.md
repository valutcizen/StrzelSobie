# Auth Modularization Plan (Frontend + Backend)

## Goal

Add pluggable auth modules that include both backend logic and frontend UI, without changing the default auth module. The frontend part must be bundled as static assets with the main client build (no backend HTML for auth screens). The selected auth module should be chosen via config and a shared interface, mirroring how backend services are already composed.

Scope note: All auth modules must keep the current session preservation and token generation mechanism. New auth methods should focus on specific needs (SSO providers, second-factor, registration confirmation) without redefining the session format.

## High-Level Approach

1. Keep `@strzel-sobie/auth` as the default backend module (no behavior change).
2. Create separate auth method modules, each providing:
   - A backend implementation that conforms to a common backend interface.
   - A frontend UI implementation that conforms to a common UI interface.
3. Select the backend module at runtime via env config in the worker.
4. Select the frontend module at build time via `VITE_AUTH_MODULE`, so only one auth UI is bundled and served as static assets.

## New Common Interfaces

Add new types in `src/common/src/auth` to define the shared contract:

**Backend interface**
- File: `src/common/src/auth/module.ts`
- Example shape:
  - `AuthModuleBackend`
    - `createAuthService(deps): IAuthService`
    - `registerAuthRoutes?(openapi, deps): void`
  - `AuthModuleBackendDeps`
    - Env bindings (db, kv, etc.)
    - Domain services used by auth (users, audit)

**Frontend interface**
- File: `src/common/src/auth/ui.ts`
- Example shape:
  - `AuthModuleUi`
    - `routes: RouteRecordRaw[]`
    - `init?(ctx): void`
  - `AuthModuleUiContext`
    - Router, pinia, i18n (as needed)

Export these in `src/common/src/index.ts` or existing auth exports.

## Backend Module Layout

Create new backend auth modules as separate workspaces:

```
src/auth-<method>/
  package.json
  src/
    index.ts
    module.ts
    ...domain/application/infrastructure
```

`src/auth-<method>/src/index.ts` should export:
- `createAuthModuleBackend(...)`
- any public types

**Default backend module**
- Keep `@strzel-sobie/auth` unchanged.
- Add a thin adapter in `src/auth/src/module.ts` that implements `AuthModuleBackend`.

## Backend Module Selection in Worker

Add a small registry in the worker:

```
src/worker/src/auth/module-registry.ts
```

Responsibilities:
- Map `AUTH_MODULE` string to a backend module.
- Provide a default mapping to `@strzel-sobie/auth`.
- Return the selected module to the worker setup.

Example selection flow:
1. Read `c.env.AUTH_MODULE` (fallback `default`).
2. Resolve module from registry.
3. Call `createAuthService(...)`.
4. Optionally call `registerAuthRoutes(...)` if the module provides extra routes.

This keeps the default behavior and allows new modules to be swapped in without touching the default auth package.

## Frontend Module Layout

Each auth method should have a dedicated UI module:

```
src/auth-<method>-client/
  package.json
  src/
    index.ts
    routes.ts
    components/
```

`src/auth-<method>-client/src/index.ts` should export:
- `authUiModule: AuthModuleUi`

## Frontend Module Selection in Client

Implement a single entry point in the client that resolves the auth UI module based on `VITE_AUTH_MODULE`. Example:

```
src/client/src/auth/module.ts
```

This file should:
1. Read `import.meta.env.VITE_AUTH_MODULE` (fallback `default`).
2. Import only the matching module (via conditional exports or Vite alias).
3. Export the resolved `authUiModule`.

Recommended approach: Vite alias per build.
- Add in `src/client/vite.config.ts`:
  - Alias `@auth-ui` -> `@strzel-sobie/auth-<method>-client`
- Use `@auth-ui` in client code so the build includes only one UI module.

This ensures the auth UI is bundled as static assets with the main client build and served exactly like the rest of the frontend.

## Route Integration

In the main client router setup:
- Import `authUiModule`.
- Append `authUiModule.routes` to the router.
- Call `authUiModule.init(...)` if present.

This avoids hardcoded auth routes and keeps module swapping clean.

## Configuration

**Backend**
- Add `AUTH_MODULE` to worker env config (dev + prod + CI).
- Default to `default`.

**Frontend**
- Add `VITE_AUTH_MODULE` to client build config (dev + prod + CI).
- Default to `default`.
- The final selection should be set by the CI pipeline during the client build stage.

**Proposed env keys and defaults**
- `AUTH_MODULE=default` (worker, runtime selection)
- `VITE_AUTH_MODULE=default` (client, build-time selection)
- Optional per-method keys for SSO/2FA, e.g.:
  - `AUTH_OIDC_ISSUER_URL`
  - `AUTH_OIDC_CLIENT_ID`
  - `AUTH_OIDC_CLIENT_SECRET`
  - `AUTH_2FA_PROVIDER`

## Testing Requirements

- Backend module selection:
  - Unit test the registry mapping with default and non-default keys.
- Frontend module selection:
  - Ensure build resolves a single `@auth-ui` alias for the selected module.
  - Add a smoke test that the login route is registered.

## Migration Steps

1. Add common interfaces in `src/common`.
2. Add adapter in `@strzel-sobie/auth` to implement `AuthModuleBackend`.
3. Add backend registry in worker.
4. Add frontend `@auth-ui` alias and `authUiModule` resolver.
5. Create a first alternative module (example: `auth-oidc`) to validate the system.

## Simple Test Auth Module (Hardcoded Users)

Add a minimal auth module for testing and local demos. This module:
- Uses a hardcoded user list with plaintext passwords (dev only).
- Implements login/logout/session validation.
- Does not support registration.
- Keeps authorization out of scope; roles are provided by the hardcoded users so existing role checks continue to work.
- Provides a minimal login UI.

### Backend: `@strzel-sobie/auth-simple`

**Location**
```
src/auth-simple/
  package.json
  src/
    index.ts
    module.ts
    simple-auth.service.ts
```

**Behavior**
- `login(dto)`:
  - Match email + password from an in-memory list.
  - On success, create a session token and store it in KV (reuse `SessionKvRepository`).
  - On failure, return `Result.fail` with unauthorized error.
- `validateSession(token)`:
  - Read KV, return `SessionData` or error.
- `logout(token)`:
  - Delete KV session.
- `register(...)`:
  - Always return `Result.fail` with HTTP 403.
  - Error message: "Registration currently not allowed".

**Hardcoded users source**
- Use a constant list in `simple-auth.service.ts`:
  - `[{ id, email, password, roles }]`
- Keep this list small and clearly marked as dev-only.
- Ensure the SQL used in tests assigns the admin role to one of these hardcoded users.
  - SQL file: `mock-data/9000_add-mock-users.sql`
- Ensure the hardcoded user ids and roles match what the users module expects (same ids/roles in the mock SQL).
- Keep the hardcoded list in sync with the mock SQL by using the same user ids and emails.
  - Users from `mock-data/9000_add-mock-users.sql`:
    - `id=1, email=admin@example.com, roles=[admin, member, guest]`
    - `id=2, email=coordinator@example.com, roles=[coordinator, member, guest]`
    - `id=3, email=member@example.com, roles=[member, guest]`
    - `id=4, email=guest@example.com, roles=[guest]`
  - For local testing, use plaintext passwords that mirror the mock SQL comment:
    - `adminpassword`, `coordinatorpassword`, `memberpassword`, `guestpassword`

**Module adapter**
- Implement `AuthModuleBackend` in `module.ts`.
- Export `createAuthModuleBackend` from `index.ts`.

### Frontend: `@strzel-sobie/auth-simple-client`

**Location**
```
src/auth-simple-client/
  package.json
  src/
    index.ts
    routes.ts
    views/
      LoginSimple.vue
```

**Behavior**
- A single login page that posts to `/api/v1/auth/login`.
- No registration route.
- Show a short helper text about the hardcoded accounts.

### Wiring

**Backend**
- Add `auth-simple` to the worker registry.
- Set `AUTH_MODULE=simple` for local dev.

**Frontend**
- Set `VITE_AUTH_MODULE=simple` for local dev.
- Ensure the build uses the `@auth-ui` alias to bundle only the simple UI.

## Vite Wiring Note

Use a build-time alias to bundle exactly one auth UI module:

```
// src/client/vite.config.ts
resolve: {
  alias: {
    '@auth-ui': VITE_AUTH_MODULE === 'simple'
      ? '@strzel-sobie/auth-simple-client'
      : '@strzel-sobie/auth-default-client'
  }
}
```

`@strzel-sobie/auth-default-client` should be the default auth UI package created from the current login flow.

Then import only from `@auth-ui` in the client:

```
import { authUiModule } from '@auth-ui';
```

## CI/Workflow Wiring Note

Set module selection in CI at build time using standard env injection:
- Use workflow inputs or environment variables.
- Set `AUTH_MODULE` for worker deploy steps.
- Set `VITE_AUTH_MODULE` for client build steps.
- Keep defaults in code for local/dev and let CI override per environment.

## Do / Do Not

Do:
- Keep the default auth module behavior unchanged.
- Use a shared interface for backend and frontend auth modules.
- Keep auth UI bundled with the main client build (static assets).
- Keep auth compatible with user module data (user ids, roles, and session format).
- Keep session token generation and storage consistent with the current implementation.

Do not:
- Add backend HTML endpoints for auth pages.
- Change existing auth routes or default auth service behavior.
- Force the client to fetch login UI from the backend.
