# Client Module

This package contains the Vue 3 + TypeScript single-page application for Strzel Sobie. The UI is built around Vuetify 3 and FullCalendar with modular state management in Pinia.

## Key Libraries

- Vuetify 3 for the layout shell and Material Design components
- Vue Router 4 with meta-driven route guards
- Pinia stores for authentication, calendar data, and administration features
- VeeValidate 4 with yup schemas for client-side validation
- vue-i18n with Polish translations by default
- FullCalendar (time grid) for the weekly range calendar

## Source Structure

- `src/layouts` — Shared app/auth layout shells
- `src/views` — Route-aligned views (`/auth`, `/profile`, admin dashboards, etc.)
- `src/components` — Reusable UI elements (calendar dialogs, navigation helpers)
- `src/stores` — Pinia stores for auth, calendar, and admin use cases
- `src/plugins` — Vuetify, i18n, and VeeValidate setup modules
- `src/services/http.ts` — Axios instance with global auth error handling

Run builds or dev servers via workspace scripts, e.g. `npm run dev -w src/client`.
