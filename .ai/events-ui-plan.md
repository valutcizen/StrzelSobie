# UI Plan - Events Module

This document outlines the UI architecture and components for implementing the Events module, based on the finalized PRD, API, and database plans. It should be used in conjunction with the main `ui-plan.md`.

## 1. UI Structure Overview

The Events module will be integrated into the existing Vue.js, Vuetify, and Pinia structure. The primary changes involve adding new views for creating and viewing events, and updating the main `CalendarView` to display events as a new data type. Event creation will be handled via a dedicated full-page form due to its complexity. Most user interactions, like signing up, will use `v-dialog` modals to maintain context.

## 2. New & Updated Views

### 1. New: Event Detail View
- **View Name**: Event Detail
- **View Path**: `/ranges/{rangeSlug}/events/{eventId}`
- **Main Purpose**: To be the canonical, shareable page for a single event. It serves as both a public information page and a management dashboard for organizers.
- **Key Information to Display**:
    - Event name, start/end times, and descriptions (`publicDescription` and `memberDescription` rendered conditionally based on user role).
    - Registration status: deadline, total slots, remaining slots, waitlist status.
    - For organizers: A list of confirmed participants and waitlisted users.
- **Key View Components**:
    - `v-btn` for "Sign Up" / "Join Waitlist", which opens the `SignUpDialog`. This button will be disabled if registration is closed or the event is full.
    - For authorized users (organizer/admin), an "Edit Event" button that links to the `EventFormView` and the `ParticipantList` component.
- **UX and Security**: This view will fetch all data from the `GET /ranges/{rangeSlug}/events/{eventId}` endpoint. It will be responsible for showing/hiding the `memberDescription` and management tools based on the user's role from the Pinia auth store.

### 2. New: Event Form View
- **View Name**: Event Form
- **View Path**: `/admin/ranges/{rangeSlug}/events/new` (for creation) and `/admin/ranges/{rangeSlug}/events/{eventId}/edit` (for editing).
- **Main Purpose**: A dedicated, full-page form for creating and editing events.
- **Key Information to Display**: A comprehensive form with fields for all event properties.
- **Key View Components**:
    - `EventForm`: A custom component that includes:
        - `v-text-field` for `name`, `publicDescription`, `memberDescription`.
        - Date/time pickers for start/end times and the registration deadline.
        - `v-radio-group` or `v-select` for `audience` ('Public', 'Members-only').
        - `v-radio-group` for `capacity` type ('Unlimited', 'Limited').
        - `v-text-field` for `slots` and `waitlistSlots` (visible if capacity is 'Limited').
        - `v-switch` for `guestPolicy` (visible if audience is 'Members-only').
- **UX and Security**: The view will use VeeValidate and yup for complex, multi-field validation. Form submission will call `POST` or `PATCH` to the appropriate events endpoint. Access will be protected by a route guard based on user roles.

### 3. Updated: Calendar View (`/:rangeSlug/calendar`)
- The `CalendarView` will be updated to consume the new `events` array from the `GET /api/v1/ranges/{rangeSlug}/events` API response.
- **Visual Changes**:
    - Events will be rendered with a distinct color and style to differentiate them from `propositions` and `reservations`.
    - Clicking an event on the calendar will no longer open a dialog, but will instead navigate the user to the new `EventDetailView` at `/ranges/{rangeSlug}/events/{eventId}`.

### 4. Updated: Range Settings View (`/admin/range-settings`)
- A `v-switch` component will be added to this view to control the `membersCanCreateEvents` setting for the range. The value will be updated via the `PATCH /api/v1/ranges/{rangeSlug}` endpoint.
- A "Create New Event" `v-btn` will be added, which navigates the user to the `EventFormView`.

## 3. New & Updated Key Components

### 1. New: `EventForm`
- A large, self-contained form component used by `EventFormView`. It will encapsulate all the input fields and logic for event creation, including showing/hiding fields conditionally (e.g., `guestPolicy` only shows for 'Members-only' events).

### 2. New: `SignUpDialog`
- A `v-dialog` modal that prompts a user to confirm their registration for an event.
- It will conditionally display a `v-text-field` for `guests_count` if the event's guest policy allows it.
- On confirm, it will call `POST /api/v1/ranges/{rangeSlug}/events/{eventId}/signups`.

### 3. New: `ParticipantList`
- A component used within the `EventDetailView` (visible to organizers only).
- It will display two `v-data-table`s: one for confirmed participants and one for the waitlist.
- It will include the "Copy List" button, which, when clicked, will fetch the participant data, format it as Tab-Separated Values (TSV), and use the browser's Clipboard API to copy it for easy pasting into a spreadsheet.

### 4. Updated: `ReservationFormDialog`
- This existing component for direct reservation creation by coordinators will be **simplified**.
- The toggles for `isPublic` and `isJoinable` will be **removed**.
- The form will now only contain the essential fields for blocking time: `eventDate`, `startTime`, `endTime`, and `tracksRequested`.

## 4. New User Journeys

### Journey 1: Admin Creates a Competition Event
1.  **Entry Point**: A `Shooting Range Administrator` navigates to the **Range Settings View**.
2.  **Create**: They click the "Create New Event" button, which takes them to the **Event Form View**.
3.  **Configuration**: They fill out the `EventForm`:
    - Name: "Club Championship 2025"
    - Audience: `Members-only`
    - Capacity: `Limited`, 60 slots, 20 waitlist slots.
    - Guest Policy: `No Guests`.
    - Registration Deadline: A date two weeks before the event.
4.  **Submission**: They submit the form. The app calls `POST /api/v1/ranges/{rangeSlug}/events`.
5.  **Confirmation**: On success, the user is redirected to the newly created event's **Event Detail View**.

### Journey 2: Member Signs Up for an Event
1.  **Discovery**: A `Member` is viewing the **Calendar View** and sees the "Club Championship 2025" event, rendered in its unique style.
2.  **View Details**: They click the event, which navigates them to the **Event Detail View**. They see the description, the registration deadline, and that there are slots available.
3.  **Sign Up**: They click the "Sign Up" button. The `SignUpDialog` appears. Since guests are not allowed, it's just a confirmation prompt.
4.  **Confirmation**: They confirm in the dialog. The app calls `POST .../signups`. On success, the dialog closes, and the detail view updates to show "You are registered for this event" and the "Sign Up" button is replaced with a "Cancel Registration" button.
