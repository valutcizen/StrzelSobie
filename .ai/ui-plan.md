# UI Architecture for Strzel Sobie

## 1. UI Structure Overview

The user interface will be a single-page application (SPA) built using **Vue.js with TypeScript**. The **Vuetify** component library will be used for a consistent and responsive Material Design look and feel. State management will be handled by **Pinia**, with dedicated stores for authentication, calendar data, and administration.

The core of the application is a calendar-centric interface, supplemented by a public multi-range directory and map. Most user interactions (creating propositions, viewing event details) are handled through **`v-dialog` modals** to maintain context. The layout is a standard app shell with a persistent navigation drawer, a top app bar, a main content area, and a footer. Landing on `/` will check `localStorage.lastRangeId`; if it points to an existing range the user is redirected to that range, otherwise to `/map`.

Client-side validation will be implemented using **VeeValidate** and **yup** for immediate user feedback on forms. All user-facing text will be managed by **vue-i18n** (defaulting to Polish), and a date library like `date-fns` will be used for consistent date/time formatting.

## 2. View List

### 1. Authentication View
- **View Name**: Authentication
- **View Path**: `/auth`
- **Main Purpose**: To allow new users to register and existing users to log in.
- **Key Information to Display**:
    - Login form (email, password).
    - Registration form (email, password).
- **Key View Components**:
    - `v-tabs` to switch between "Logowanie" (Login) and "Rejestracja" (Registration).
    - `v-form` with `v-text-field` for inputs.
    - `v-btn` for form submission.
- **UX, Accessibility, and Security Considerations**:
    - UX: Clear error messages on failed login/registration (e.g., "Invalid credentials", "Email already in use"). Use VeeValidate for real-time field validation.
    - Accessibility: All form fields will have associated `<label>` elements.
    - Security: The view will handle the `POST /api/v1/auth/register` and `POST /api/v1/auth/login` API calls. Upon successful login, the app will immediately call `GET /api/v1/auth/me` to populate the user state.

### 2. Range Directory & Map View
- **View Name**: Range Directory & Map
- **View Path**: `/map`
- **Main Purpose**: Public entry point to browse all ranges, combining a map and paginated list.
- **Key Information to Display**:
    - Map markers color-coded by range type (club/community, ally, coming-soon) pulled from `GET /api/v1/ranges`.
    - Paginated list of ranges with display name, type badge, allowsReservations flag, and distance when location permission is granted.
    - Sorting options (name A→Z default; distance when lat/lng available; type priority).
- **Key View Components**:
    - `RangeMap` component with a Poland bounding box default viewport and marker color tokens per type.
    - `RangeList` with pagination controls, sort dropdown, and optional type filter chips.
    - `RangeTypeBadge` indicating type and whether reservations are allowed.
    - "Wybierz" buttons routing to `/:rangeSlug` while writing `lastRangeId` to `localStorage`.
- **UX, Accessibility, and Security Considerations**:
    - UX: Map and list share the same data set; selecting a list row focuses the marker and vice versa. No login required.
    - Accessibility: List rows and map markers expose accessible labels with range name and type.
    - Security: All data is public; when distance sorting is chosen, geolocation permission is explicitly requested and errors are handled gracefully.

### 3. Range Detail View
- **View Name**: Range Detail
- **View Path**: `/:rangeSlug` (shareable public URL)
- **Main Purpose**: To show range information and funnel users toward booking when available.
- **Key Information to Display**:
    - Range name, type badge, `allowsReservations` status, public description (links allowed), latitude/longitude (embedded mini-map pin), opening hours, total tracks.
    - Member-only description shown only when the authenticated user has the Member role or higher.
- **Key View Components**:
    - `RangeHero` header with type/availability badges and a CTA block.
    - `RangeDescription` sections for public and member-only copy (member section collapses for unauthenticated/Guest users).
    - `RangeActionBar` with primary CTA "Zobacz kalendarz" when `allowsReservations` is true; otherwise a disabled button with a tooltip/banner explaining bookings are unavailable and a secondary link back to `/map`.
- **UX, Accessibility, and Security Considerations**:
    - UX: The view updates `lastRangeId` on load to support the `/` redirect rule.
    - Accessibility: Descriptions sanitize and preserve links; action buttons remain focusable even when disabled with explanatory text.
    - Security: Member-only description is requested conditionally; non-bookable ranges never show booking CTAs as enabled.

### 4. Calendar View (Range Schedule)
- **View Name**: Calendar
- **View Path**: `/:rangeSlug/calendar` (routed from Range Detail CTA)
- **Main Purpose**: To provide a weekly overview of availability, propositions, and reservations for ranges that allow bookings.
- **Key Information to Display**:
    - Events (propositions, reservations) fetched from `GET /api/v1/ranges/{rangeSlug}/events`.
    - Visual distinction between event types; reservations marked "Open for Joining"; badges for propositions made by "Members".
- **Key View Components**:
    - `FullCalendar` component configured for a week view.
    - `v-skeleton-loader` to show while events are loading.
    - "Empty state" message with a "Zaproponuj termin" CTA when no events are present.
    - `EventDetailDialog` (custom component) opened on event click.
    - `PropositionFormDialog` (custom component) opened on clicking an empty time slot.
- **UX, Accessibility, and Security Considerations**:
    - UX: If a user navigates here for an ally or coming-soon range, a route guard redirects them back to `/:rangeSlug` with a toast/banner explaining bookings are unavailable.
    - Accessibility: Events on the calendar should be keyboard-navigable.
    - Security: Data is role-dependent. The API response from `/events` filters details for Guests, and the UI renders what it receives.

### 5. My Profile View
- **View Name**: My Profile
- **View Path**: `/profile`
- **Main Purpose**: To allow the logged-in user to see their own account details.
- **Key Information to Display**:
    - User's email.
    - A list of the user's assigned roles (e.g., "Member", "Coordinator").
- **Key View Components**:
    - `v-card` to display profile information.
    - `v-chip` components to list the user's roles.
- **UX, Accessibility, and Security Considerations**:
    - UX: This is a simple, read-only view.
    - Security: Data is fetched from the `GET /api/v1/auth/me` endpoint and stored in the Pinia auth store.

### 6. User Management View
- **View Name**: User Management
- **View Path**: `/admin/users`
- **Main Purpose**: For Club/Community Administrators to manage all users and their roles.
- **Key Information to Display**:
    - A paginated table of all users from `GET /api/v1/users`.
    - User email, creation date, and current roles.
- **Key View Components**:
    - `v-data-table` to list users with sorting and filtering.
- **UX, Accessibility, and Security Considerations**:
    - UX: A clean, powerful interface for managing a potentially large list of users.
    - Security: This view is strictly limited to users with the "Club/Community Administrator" role. Role changes are handled through dialogs calling `POST /api/v1/users/{userId}/roles` and `DELETE /api/v1/users/{userId}/roles/{roleId}`.

### 7. User Verification View
- **View Name**: User Verification
- **View Path**: `/admin/verify-users`
- **Main Purpose**: For "Confirmators" to approve "Guest" users, upgrading them to "Member" or "Coordinator".
- **Key Information to Display**:
    - A filtered list of users with the "Guest" role who are awaiting verification.
- **Key View Components**:
    - `v-list` or `v-data-table` showing "Guest" users.
- **UX, Accessibility, and Security Considerations**:
    - UX: A streamlined workflow for the verification process.
    - Security: This view is strictly limited to users with the "Confirmator" role. Promote actions call the role assignment endpoint.

### 8. Range Settings View
- **View Name**: Range Settings
- **View Path**: `/admin/range-settings`
- **Main Purpose**: For Range Administrators to manage their range's configuration.
- **Key Information to Display**:
    - Current range operating hours and total track count from `GET /api/v1/ranges/{rangeSlug}`.
- **Key View Components**:
    - `v-form` to edit operating hours and track count (`PATCH /api/v1/ranges/{rangeSlug}`).
    - `v-btn` to open a `RecordFormDialog` for logging external bookings (`POST /api/v1/ranges/{rangeSlug}/records`).
- **UX, Accessibility, and Security Considerations**:
    - UX: A simple settings page for range-specific administrators.
    - Security: This view is strictly limited to users with the "Shooting Range Administrator" role for the current range.

## 3. User Journey Map

**Main Use Case: Guest browses the directory, creates a proposition, Coordinator accepts it**

1.  **Landing & Discovery**: A visitor hits `/`. If `localStorage.lastRangeId` points to a valid range they are redirected to that range; otherwise they land on **Range Directory & Map** (`/map`), seeing Poland-centered markers and a paginated list.
2.  **Select a Range**: The visitor clicks a marker or list item, opening the **Range Detail** (`/:rangeSlug`) and updating `lastRangeId`. If the range is ally/coming-soon, the booking CTA is disabled with a clear message and a link back to `/map`.
3.  **Authenticate**: From the Range Detail CTA or calendar "Propose" action, unauthenticated visitors are sent to **Authentication** (`/auth`) and then redirected back to the target range.
4.  **View Calendar**: For bookable ranges, the user lands on **Calendar** (`/:rangeSlug/calendar`). As a Guest, they see reservations in anonymized form; Members (or higher) see full details and "Open for Joining" markers. If someone tries to open the calendar for an ally/coming-soon range, a guard returns them to the Range Detail with an explanation.
5.  **Create Proposition**: The user clicks an empty slot to open the `PropositionFormDialog`, fills in participants/tracks, and submits (`POST /ranges/{rangeSlug}/propositions`). A `v-snackbar` confirms creation and the event appears on the calendar.
6.  **Coordinator Review**: A Coordinator views the same calendar, sees a badge indicating the proposer is not a Member, and opens the `EventDetailDialog` to review details.
7.  **Accept Proposition**: The Coordinator clicks "Accept", triggering `POST /ranges/{rangeSlug}/reservations` with `propositionId`. The event changes color to a reservation, and the original user receives confirmation.

## 4. Layout and Navigation Structure

The application will use a consistent layout managed by Vuetify's layout components.

-   **`v-app-bar`**: A top bar that is always visible. It will contain:
    -   The application title ("Strzel Sobie") linking to `/map`.
    -   The logged-in user's email when available.
    -   A user menu (`v-menu`) with links to "My Profile" (`/profile`) and a "Logout" button.
-   **`v-navigation-drawer`**: A persistent side menu for primary navigation. The links displayed will be dynamically rendered based on the user's roles fetched from `GET /api/v1/auth/me`.
    -   **All Users**: "Mapa i katalog" (`/map`); when `lastRangeId` is known, show quick links to "Szczegóły strzelnicy" (`/:rangeSlug`) and "Kalendarz" (`/:rangeSlug/calendar`) if bookings are allowed.
    -   **Admins**: Links to "Zarządzanie Użytkownikami" (User Management), "Weryfikacja Użytkowników" (User Verification), or "Ustawienia Strzelnicy" (Range Settings) depending on their specific admin role.
-   **`v-main`**: The central content area where the Vue Router will render the component for the current route (e.g., Directory, Range Detail, Calendar View, Profile View).
-   **`v-footer`**: A simple footer containing a link to the "Polityka Prywatności" (Privacy Policy) page.
-   **Route Guards**:
    -   `/` redirects to `/:rangeSlug` if `lastRangeId` is valid; otherwise to `/map`.
    -   `/:rangeSlug/calendar` checks `allowsReservations`; ally or coming-soon ranges are redirected to `/:rangeSlug` with a toast explaining bookings are unavailable.

## 5. Key Components

These are custom, reusable components that will be built to handle specific, repeated functionalities.

-   **`RangeMap`**: Map view with Poland bounding box, colored markers per range type, and list/map selection sync.
-   **`RangeList`**: Paginated list with sorting (name, distance, type priority) and optional type filters; emits selection events to center the map and route to detail.
-   **`RangeTypeBadge`**: Visual badge for club/community, ally, and coming-soon types, carrying color tokens shared with map markers.
-   **`RangeActionBar`**: CTA block on the Range Detail page showing booking availability; disables and displays info for ally/coming-soon ranges.
-   **`RangeAvailabilityGuard`**: Router/route-aware helper that redirects non-bookable ranges away from the calendar and surfaces the proper toast/banner.
-   **`EventDetailDialog`**: A `v-dialog` that displays the details of a proposition or reservation. It will show different actions (e.g., "Accept", "Cancel") depending on the event type and user's role.
-   **`PropositionFormDialog`**: A `v-dialog` containing a `v-form` for creating or editing a proposition. It will use VeeValidate for validation.
-   **`ReservationFormDialog`**: A `v-dialog` for Coordinators to create a reservation directly. Includes toggles for "Public" and "Open for Joining".
-   **`RecordFormDialog`**: A `v-dialog` for Range Admins to log an external booking (Record).
-   **`ConfirmationDialog`**: A generic `v-dialog` used to confirm destructive actions (e.g., "Are you sure you want to cancel?") or to show warnings (like the overlap warning for Coordinators).
-   **`GlobalErrorHandler`**: An Axios interceptor that is not a visual component but is a key part of the UI architecture. It will catch `401 Unauthorized` or `403 Forbidden` API responses and automatically redirect the user to the `/auth` view.
-   **`RoleBasedLink`**: A small wrapper component used in the navigation drawer to conditionally render a link based on whether the user's roles (from the Pinia store) match the required roles for the link.
