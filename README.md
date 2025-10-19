# Strzel Sobie

[![License](https://img.shields.io/badge/License-Not%20Specified-blue.svg)](LICENSE)

A specialized reservation management application for shooting ranges, designed to comply with Polish law.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Scope (MVP)](#project-scope-mvp)
- [Project Status](#project-status)
- [License](#license)

## Project Description

**Strzel Sobie** is a reservation management application for shooting ranges, specifically tailored to address a key requirement of Polish law: the mandatory presence of a licensed shooting coordinator ("prowadzący strzelanie") during shooting events.

The application solves this logistical challenge by integrating coordinators directly into the booking workflow. Regular users can propose a time for a shooting session, and available coordinators can view and accept these propositions, converting them into official, legally compliant reservations.

The system is built with a robust role-based access control system to ensure users have appropriate permissions, from guests to Club/Community Administrator. The initial MVP focuses on a single shooting range in Dobczyce, with an architecture designed for future expansion.

## Tech Stack

### Frontend
- Vue
- TypeScript
- Vuetify

### Backend
- Cloudflare Worker with TypeScript
- Cloudflare D1 (SQLite-like database)
- Cloudflare KV (Session cache)
- Cloudflare R2 (Static content and image storage)

### CI/CD and Hosting
- GitHub Actions (CI)
- Cloudflare R2 (Artifactory)
- Cloudflare Workflows (CD)
- Cloudflare (Hosting)

## Getting Started Locally

To set up the project for local development, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/strzel-sobie.git
    cd strzel-sobie
    ```

2.  **Install dependencies:**
    The project uses npm workspaces. To install all dependencies for all modules, run the following command from the root directory:
    ```bash
    npm install
    ```

## Available Scripts

The following scripts are available to be run from the project's root directory:

- `npm run build`: Builds all modules/workspaces.
- `npm run test`: Runs the test suite for the entire project using Vitest.
- `npm run test:unit`: Runs only unit tests that match the `*.unit.tests.ts` naming convention.

## Project Scope (MVP)

### In Scope
- A single shooting range (Dobczyce).
- User roles: Guest, Member, Coordinator, Confirmator, Range Admin, Club/Community Admin.
- Full lifecycle for propositions and reservations: creation, acceptance, modification by coordinator, cancellation.
- Weekly calendar view with clear visual distinctions for different booking types.
- Email notifications for core workflows.
- Manual logging of external bookings ("Records") for metric tracking, which is part of the reservations domain.
- Basic conflict management (block user propositions on full slots, warn coordinators of overlaps).
- An informational "Joinable Reservations" view (without in-app joining functionality).
- UI in Polish and inclusion of a privacy policy.

### Out of Scope
- Support for multiple shooting ranges in the UI.
- Splitting a single proposition among multiple coordinators.
- Merging multiple propositions into a single reservation.
- A formal waitlist system for fully booked time slots.
- Maintenance of the official shooting range register book ("książka pobytu na strzelnicy").
- Advanced range details (maps, photos, policies).
- In-app mechanism for users to join "Joinable Reservations."
- Multi-language support.

## Project Status

The project is currently in the **early stage of development**. The primary focus is on delivering the Minimum Viable Product (MVP) as defined in the project scope. The frontend has a placeholder `App.vue` and the core backend worker implementation is in progress.

### API Snapshot
- `POST /api/v1/ranges/:rangeSlug/propositions`: Authenticated guests, members, and above can propose a new shooting session. The backend validates schedule overlaps, range capacity, and captures an audit log. Successful responses return `201 Created` with the proposition payload and a `Location` header.
- `GET /api/v1/ranges/:rangeSlug/events`: Returns the combined list of propositions and reservations for the requested range, filtered by the caller’s role.

## License

This project is licensed under the terms specified in the [LICENSE](LICENSE) file.
