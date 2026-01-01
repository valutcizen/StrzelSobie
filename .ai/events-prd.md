# Product Requirements Document (PRD) - Events Module

## 1. Product Overview
The Events Module is an extension for the Strzel Sobie application designed to manage organized activities at shooting ranges. It moves beyond the user-driven reservation system by allowing authorized users to create, publish, and manage structured events like training sessions, competitions, or social gatherings. This module provides granular control over event visibility, registration rules, and participant capacity, complete with automated waitlists and notifications, to offer a comprehensive event management solution integrated directly into the existing platform.

## 2. Functional Requirements

### 2.1. Event Creation & Configuration
- **Event Definition:** An event is defined by a combination of properties set by the creator:
  - **Description**: An event has two description fields: a `publicDescription` visible to everyone, and a `memberDescription` visible only to users with the `Member` role or higher.
  - **Registration Type:**
    - `Notice`: An informational-only banner on the calendar. No registration is possible.
    - `Registration Required`: Users must sign up to attend.
  - **Audience:**
    - `Public`: Open to any authenticated user.
    - `Members-only`: Restricted to users with the `Member` role or higher.
  - **Capacity (for events with registration):**
    - `Unlimited`: Any number of users can register.
    - `Limited`: A fixed number of slots. The creator must specify the number of participants.
  - **Guest Policy (for `Members-only` events with registration):**
    - `Guests Allowed`: Members can register themselves and a specified number of guests.
    - `No Guests`: Members can only register for themselves.
  - **Waitlist (for `Limited` capacity events):**
    - The creator can specify a maximum size for the waitlist. If left blank, the waitlist is unlimited.
  - **Registration Deadline (for events with registration):**
    - An optional field for the event creator. If left blank, the registration deadline defaults to the event's end time.
    - The creator can set a specific date and time to close registration earlier. After this deadline, no new sign-ups are allowed.
  - **Track Reservation:** Any event with "Registration Required" will automatically reserve all tracks at the range for its entire duration, preventing concurrent reservations or propositions.
- **Event Creation Permissions:**
  - `Shooting Range Administrator`, and `Club/Community Administrator` can create any type of event on any range.
  - A `Range Administrator` can enable a per-range setting that allows `Members` to create events. These events do not require approval and go live immediately if the selected time slot is available.
- **Event Discovery:**
  - Events will be clearly visible on the main weekly calendar, with a distinct visual style (e.g., color, badge) to differentiate them from propositions and reservations.
  - Each event will have a unique, shareable URL for direct linking and advertising.
  - A dedicated, filterable "Events List" page will also be available.

### 2.2. User Registration & Participation
- **Sign-up:** Authenticated users can sign up for events based on the event's audience rules and available capacity.
- **Group Sign-ups:** For `Members-only` events where guests are allowed, the member can specify the total number of people in their party. This total is deducted from the available slots.
- **Editing a Sign-up:**
  - A user can cancel their own sign-up at any time before the event starts.
  - If guests are allowed, a user can edit the number of participants in their booking. The system will prevent an increase if there are not enough available slots.
- **Waitlists:**
  - If a user tries to sign up for a `Limited` event that is full, they can join a waitlist (if the waitlist is not also full).
  - If a spot becomes free, the first user on the waitlist is automatically promoted to "confirmed" status.
- **Direct Link Access:**
  - An unauthenticated visitor accessing a direct event link will see a public-facing detail page with a "Log in or Register to Sign Up" prompt.
  - For `Members-only` events, the page will state the restriction and prompt for login.

### 2.3. Management & Notifications
- **Participant Visibility:** The full list of confirmed participants and waitlisted users for an event is visible only to the event creator and users with `Shooting Range Administrator` or `Club/Community Administrator` roles. Regular users cannot see other attendees.
- **Clipboard Export:** A "Copy List" button will be available on the participant management view. This will copy the participant list to the clipboard in a tab-separated format, ready for pasting into spreadsheet applications.
- **Event Editing/Cancellation:** The event creator and administrators can edit event details or cancel an event.
- **Notifications (to Participants):** Automated emails will be sent to users for:
  - Sign-up confirmation.
  - Cancellation confirmation.
  - Promotion from waitlist to confirmed.
  - Notification of significant event changes (e.g., time/date) or cancellation by the organizer.
- **Notifications (to Organizers):**
  - To prevent excessive emails, event organizers will **not** receive notifications for participant sign-ups, cancellations, or waitlist activity. They must check the event dashboard to monitor attendance.

## 3. User Stories

- **ID: E-US-001**
- **Title:** Admin Creates a Limited-Capacity Public Event
- **Description:** As a `Shooting Range Administrator`, I want to create a public training event with a limited number of slots so I can manage a session open to all users.
- **Acceptance Criteria:**
  - I can create an event and set its type to `Public` and capacity to `Limited` (e.g., 10 slots).
  - Any logged-in user can see this event on the calendar and sign up.
  - The system stops accepting sign-ups when 10 users have registered and begins offering a waitlist.

- **ID: E-US-002**
- **Title:** Member Creates a Community Meetup
- **Description:** As a `Member`, on a range where this is enabled, I want to create an informal, members-only event to organize a community meetup.
- **Acceptance Criteria:**
  - I can create an event and set its audience to `Members-only`.
  - I can set registration to `Unlimited` and allow guests.
  - The event appears on the calendar immediately, visible only to other members.
  - Other members can sign up for themselves and their guests.

- **ID: E-US-003**
- **Title:** User Signs Up for an Event
- **Description:** As a registered `Guest`, I want to sign up for a public event I see on the calendar.
- **Acceptance Criteria:**
  - I can click on a public event and see its details.
  - I can click "Sign Up" and receive a confirmation email.
  - My spot is now reserved. If I try to sign up again, the system shows I am already registered.

- **ID: E-US-004**
- **Title:** User Joins a Waitlist
- **Description:** As a `Member`, I want to join the waitlist for a popular members-only event that is already full.
- **Acceptance Criteria:**
  - When viewing a full event, the "Sign Up" button is replaced with "Join Waitlist".
  - I can join the waitlist and receive a confirmation.
  - If a spot opens, I am automatically registered and receive a new confirmation email.

- **ID: E-US-005**
- **Title:** User Cancels Their Spot
- **Description:** As a user, I need to cancel my attendance for an event I previously signed up for.
- **Acceptance Criteria:**
  - I can view my existing sign-up and select a "Cancel" option.
  - Upon confirmation, my spot is removed.
  - If there was a waitlist, my cancellation automatically promotes the first person in the queue.

- **ID: E-US-006**
- **Title:** Organizer Edits an Event
- **Description:** As the `Coordinator` who organized an event, I need to postpone it by two hours.
- **Acceptance Criteria:**
  - I can edit the event and change its start and end times.
  - Upon saving, all confirmed and waitlisted participants receive an email notifying them of the time change.

- **ID: E-US-007**
- **Title:** Organizer Exports Participant List via Clipboard
- **Description:** As an `Event Organizer`, I want to easily copy the list of participants to my clipboard in a spreadsheet-friendly format so that I can quickly paste it into Google Sheets or Excel for check-in or further analysis.
- **Acceptance Criteria:**
  - On the event management page, a "Copy List" button is present.
  - Clicking the button copies the entire participant list (including a header row) to the clipboard.
  - The copied data is formatted with tabs separating columns (Tab-Separated Values) for a clean paste into spreadsheet software.
  - The copied data includes columns such as: `No.`, `Name`, `Email`, `Guests`, and `Sign-up Date`.

- **ID: E-US-008**
- **Title:** Organizer Sets a Registration Deadline
- **Description:** As an `Event Organizer` creating a competition, I want to set a registration deadline for 24 hours before the event starts, so I have time to prepare the participant brackets and materials.
- **Acceptance Criteria:**
  - When creating or editing an event, there is an optional "Registration Deadline" date/time field.
  - If the field is left blank, registration remains open until the event ends.
  - If a deadline is set, the "Sign Up" and "Join Waitlist" buttons are disabled for all users after the deadline has passed.
  - The event's details page clearly displays the registration deadline if one is set.

## 4. Out of Scope for MVP
- **Payments:** All events are free. There will be no payment processing.
- **Recurring Events:** The ability to create event series (e.g., every Friday) is not included. Each event is a one-off.
- **Advanced Ticketing:** Complex ticket types (e.g., VIP, Standard) are not supported.
- **Public Sign-ups:** Users must be authenticated to sign up for any event. There is no fully-public, anonymous registration.
