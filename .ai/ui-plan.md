# UI Architecture for Strzel Sobie

## 1. UI Structure Overview

The user interface will be a single-page application (SPA) built using **Vue.js with TypeScript**. The **Vuetify** component library will be used for a consistent and responsive Material Design look and feel. State management will be handled by **Pinia**, with dedicated stores for authentication, calendar data, and administration.

The core of the application is a calendar-centric interface, with most user interactions (creating propositions, viewing event details) handled through **`v-dialog` modals** to maintain context. The layout is a standard app shell with a persistent navigation drawer, a top app bar, a main content area, and a footer.

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

### 2. Calendar View
- **View Name**: Calendar
- **View Path**: `/:rangeSlug` (e.g., `/dobczyce`)
- **Main Purpose**: To provide a comprehensive weekly overview of range availability, propositions, and reservations for a specific range. This is the main user dashboard.
- **Key Information to Display**:
    - Events (propositions, reservations) fetched from `GET /api/v1/ranges/{rangeSlug}/events`.
    - Visual distinction between event types (e.g., propositions are one color, reservations another).
    - Reservations marked as "Open for Joining" will have a distinct color (e.g., green) to encourage participation.
    - Badges for propositions made by "Members".
- **Key View Components**:
    - `FullCalendar` component configured for a week view.
    - `v-skeleton-loader` to show while events are loading.
    - "Empty state" message with a "Propose a time" CTA button when no events are present.
    - `EventDetailDialog` (custom component) opened on event click.
    - `PropositionFormDialog` (custom component) opened on clicking an empty time slot.
- **UX, Accessibility, and Security Considerations**:
    - UX: The calendar will be pannable and zoomable on mobile. Event details will be loaded into non-blocking dialogs.
    - Accessibility: Events on the calendar should be keyboard-navigable.
    - Security: The data displayed is role-dependent. The API response from `/events` will filter details for Guests, and the UI will render what it receives.

### 3. My Profile View
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

### 4. User Management View
- **View Name**: User Management
- **View Path**: `/admin/users`
- **Main Purpose**: For Club/Community Administrators to manage all users and their roles.
- **Key Information to Display**:
    - A paginated table of all users from `GET /api/v1/users`.
    - User email, creation date, and current roles.
- **Key View Components**:
    - `v-data-table` to list users with sorting and filtering.
    - A dialog for editing a user's roles, using `v-select` or `v-chip-group` to assign/unassign roles based on `POST /api/v1/users/{userId}/roles` and `DELETE /api/v1/users/{userId}/roles/{roleId}`.
- **UX, Accessibility, and Security Considerations**:
    - UX: A clean, powerful interface for managing a potentially large list of users.
    - Security: This view is strictly limited to users with the "Club/Community Administrator" role.

### 5. User Verification View
- **View Name**: User Verification
- **View Path**: `/admin/verify-users`
- **Main Purpose**: For "Confirmators" to approve "Guest" users, upgrading them to "Member" or "Coordinator".
- **Key Information to Display**:
    - A filtered list of users with the "Guest" role who are awaiting verification.
- **Key View Components**:
    - `v-list` or `v-data-table` showing "Guest" users.
    - Buttons on each user row to "Promote to Member" or "Promote to Coordinator", which trigger API calls to assign the new role.
- **UX, Accessibility, and Security Considerations**:
    - UX: A streamlined workflow for the verification process.
    - Security: This view is strictly limited to users with the "Confirmator" role.

### 6. Range Settings View
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

**Main Use Case: Guest Creates a Proposition, Coordinator Accepts It**

1.  **Landing & Login**: A new user arrives at the site and is presented with the **Authentication View** (`/auth`).
2.  **Registration**: The user navigates to the "Registration" tab, enters their email and password, and submits the form (`POST /auth/register`). They are now a "Guest" and are automatically logged in.
3.  **View Calendar**: The user is redirected to the main **Calendar View** for the default range (e.g., `/dobczyce`). They see the weekly schedule. As a Guest, they can only see details for "Public" reservations; other bookings appear as opaque "Busy" blocks.
4.  **Initiate Proposition**: The user clicks on an empty time slot. This opens the `PropositionFormDialog`.
5.  **Create Proposition**: The user fills in the number of participants and desired tracks and submits the form (`POST /ranges/{rangeSlug}/propositions`). A `v-snackbar` confirms "Proposition created." The new proposition appears on their calendar.
6.  **Coordinator View**: A "Coordinator" logs in. They also land on the **Calendar View**. They see the new proposition, visually marked as being from a non-member.
7.  **Review Proposition**: The Coordinator clicks the proposition event, opening the `EventDetailDialog`, which shows who created it and the requested details.
8.  **Accept Proposition**: The dialog contains an "Accept" button. The Coordinator clicks it. This triggers a `POST /ranges/{rangeSlug}/reservations` call with the `propositionId`.
9.  **Confirmation**: The API confirms the creation. The event on the calendar changes color to indicate it is now a confirmed "Reservation". The original user receives a confirmation email.

## 4. Layout and Navigation Structure

The application will use a consistent layout managed by Vuetify's layout components.

-   **`v-app-bar`**: A top bar that is always visible. It will contain:
    -   The application title ("Strzel Sobie").
    -   The logged-in user's email.
    -   A user menu (`v-menu`) with links to "My Profile" (`/profile`) and a "Logout" button.
-   **`v-navigation-drawer`**: A persistent side menu for primary navigation. The links displayed will be dynamically rendered based on the user's roles fetched from `GET /api/v1/auth/me`.
    -   **All Users**: "Kalendarz" (Calendar).
    -   **Admins**: Links to "Zarządzanie Użytkownikami" (User Management), "Weryfikacja Użytkowników" (User Verification), or "Ustawienia Strzelnicy" (Range Settings) depending on their specific admin role.
-   **`v-main`**: The central content area where the Vue Router will render the component for the current route (e.g., Calendar View, Profile View).
-   **`v-footer`**: A simple footer containing a link to the "Polityka Prywatności" (Privacy Policy) page.

## 5. Key Components

These are custom, reusable components that will be built to handle specific, repeated functionalities.

-   **`EventDetailDialog`**: A `v-dialog` that displays the details of a proposition or reservation. It will show different actions (e.g., "Accept", "Cancel") depending on the event type and user's role.
-   **`PropositionFormDialog`**: A `v-dialog` containing a `v-form` for creating or editing a proposition. It will use VeeValidate for validation.
-   **`ReservationFormDialog`**: A `v-dialog` for Coordinators to create a reservation directly. Includes toggles for "Public" and "Open for Joining".
-   **`RecordFormDialog`**: A `v-dialog` for Range Admins to log an external booking (Record).
-   **`ConfirmationDialog`**: A generic `v-dialog` used to confirm destructive actions (e.g., "Are you sure you want to cancel?") or to show warnings (like the overlap warning for Coordinators).
-   **`GlobalErrorHandler`**: An Axios interceptor that is not a visual component but is a key part of the UI architecture. It will catch `401 Unauthorized` or `403 Forbidden` API responses and automatically redirect the user to the `/auth` view.
-   **`RoleBasedLink`**: A small wrapper component used in the navigation drawer to conditionally render a link based on whether the user's roles (from the Pinia store) match the required roles for the link.