# Strzel Sobie

This repository contains the source code for the "Strzel Sobie" shooting range reservation system.

## Project Structure

This project is built as a **modular monolith**. The backend source code is divided into independent modules, each responsible for a specific business domain. This approach promotes separation of concerns, making the application easier to develop, test, and maintain.

The `src` directory contains all the source code, organized into the following modules:

-   **`src/client`**: The Vue.js frontend application. ([details](./src/client/README.md))
-   **`src/worker`**: The Cloudflare Worker that acts as the API gateway and composition root, assembling the different backend modules to serve API requests. ([details](./src/worker/README.md))
-   **`src/common`**: Shared utilities, types, and constants that are not specific to any business domain. ([details](./src/common/README.md))
-   **`src/auth`**: Handles user authentication (login, passwords, sessions) and authorization (permissions). ([details](./src/auth/README.md))
-   **`src/users`**: Manages user accounts, profiles, roles, and the verification process for Members and Coordinators. ([details](./src/users/README.md))
-   **`src/reservations`**: Contains the core business logic for propositions, reservations, scheduling. ([details](./src/reservations/README.md))
-   **`src/admin`**: Implements the administrative functions for Range and Club Admins, such as managing range settings and logging external records. ([details](./src/admin/README.md))
-   **`src/notifications`**: Responsible for sending email notifications for events like new propositions or confirmed reservations. ([details](./src/notifications/README.md))

The `tests` directory mirrors the `src` structure, containing automated tests for each corresponding module. ([details](./tests/README.md))
