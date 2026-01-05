# `src` Directory

This directory contains the source code for the "Strzel Sobie" application, organized into a modular monolith structure. Each subdirectory represents a distinct module with a specific set of responsibilities. The modules are managed as an [npm workspace](https://docs.npmjs.com/cli/v7/using-npm/workspaces).

## Modules

Below is a description of each module within the `src` directory.

### `ranges`

-   **Description:** Implements managing range settings.
-   [Go to module](./ranges/README.md)

### `auth`

-   **Description:** Handles user authentication (login, passwords, sessions) and authorization (permissions).
-   [Go to module](./auth/README.md)

### `auth-simple`

-   **Description:** Simple, hardcoded auth module for local testing and demos (no registration).
-   [Go to module](./auth-simple/README.md)

### `client`

-   **Description:** The Vue.js frontend application that users interact with.
-   [Go to module](./client/README.md)

### `common`

-   **Description:** Contains shared utilities, types, and constants. Crucially, it defines the communication contracts (ports and adapters) that allow other modules to interact without creating direct dependencies, promoting a loosely coupled architecture.
-   [Go to module](./common/README.md)

### `notifications`

-   **Description:** Responsible for sending email notifications for events like new propositions or confirmed reservations.
-   [Go to module](./notifications/README.md)

### `events`

-   **Description:** Manages shooting range events, registrations, and event policies.
-   [Go to module](./events/README.md)

### `reservations`

-   **Description:** Contains the core business logic for propositions, reservations, scheduling, logging external records, and the calendar view.
-   [Go to module](./reservations/README.md)

### `users`

-   **Description:** Manages user accounts, profiles, roles, and the verification process for Members and Coordinators.
-   [Go to module](./users/README.md)

### `worker`

-   **Description:** The Cloudflare Worker that serves as the API gateway and the **composition root** for the entire backend. It is responsible for assembling the application by injecting concrete implementations (from other modules) into the modules that require them, based on the contracts defined in the `common` module.
-   [Go to module](./worker/README.md)
