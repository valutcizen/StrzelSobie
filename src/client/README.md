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

- `src/layouts` — Shared layout shells
- `src/views` — Route-aligned views (`/profile`, admin dashboards, range pages, etc.)
- `src/components` — Reusable UI elements (auth dialog, calendar dialogs, navigation helpers)
- `src/stores` — Pinia stores for auth, calendar, and admin use cases
- `src/plugins` — Vuetify, i18n, and VeeValidate setup modules
- `src/services/http.ts` — Axios instance with global auth error handling

Authentication and registration are presented in the `AuthDialog` modal (triggered from the top app bar or guards) instead of a dedicated `/auth` route.

## Rich Text

Admin-editable HTML fields should use `src/components/common/RichTextEditor.vue` for editing and `src/components/common/RichTextContent.vue` for display. The backend sanitizes rich text before persistence with `sanitize-html`, and the renderer uses the browser Sanitizer API (`setHTML` / `setHTMLUnsafe`) with a text-only fallback when the API is unavailable.

Run builds or dev servers via workspace scripts, e.g. `npm run dev -w src/client`.
