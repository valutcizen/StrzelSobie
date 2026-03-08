# Product Requirements Document (PRD) - Strzel Sobie

## 1. Product Overview
Strzel Sobie is a specialized reservation management application for shooting ranges. The application facilitates a booking process where Members propose a time for a shooting session, and Shooting Range Administrators convert these propositions into official reservations. During proposition creation, the member declares whether someone in their group will hold a shooting coordinator license. The system is built around a robust role-based access control system, ensuring that different user types have appropriate permissions. It now supports multiple shooting ranges created by Club/Community Administrators: club/community ranges with full reservations, ally ranges that are information-only, and coming-soon ranges that are visible publicly but do not yet allow reservations.

## 2. User Problem
Standard booking and reservation applications available on the market do not address operational needs of shooting ranges, where each booking often requires manual coordination and communication. Strzel Sobie solves this with a proposition-to-reservation workflow managed by range administration. Members can submit propositions with required legal declaration data, and range administrators can review, modify, and convert propositions into reservations while communicating directly with users.

## 3. Functional Requirements
### 3.1. User Management and Roles
- The system will feature a role-based access control system with six distinct user roles:
  - Guest: A publicly registered user. Can browse schedules according to visibility rules, cannot create propositions, and can sign up for public events.
  - Member: A verified member of the club/community. Can create and manage their own propositions.
  - Coordinator: A user with a verified shooting coordinator license (informational/verification role, not required for proposition conversion).
  - Confirmator: An administrative role responsible for verifying user memberships and licenses, granting "Member" or "Coordinator" status.
  - Shooting Range Administrator: Manages the settings for a specific shooting range.
  - Club/Community Administrator (Main Admin): Has global permissions to manage users, roles, and system settings.
- Public users can self-register for a "Guest" account.
- The initial Club/Community Administrator (superuser) account will be created via a one-time deployment script.

### 3.2. Reservation and Proposition System
- Terminology: Polish `oś` is represented as **firing line** in English.
- Only Members can create "propositions" for a desired shooting time, selecting specific tracks or the entire firing line when available.
- Proposition creation includes a required declaration field stating whether someone in the member's group will hold a valid shooting coordinator license during the shooting (`true/false`).
- For users with the "Coordinator" role, this declaration is pre-filled as `true` and cannot be changed.
- During proposition creation, a member can optionally choose one specific range administrator to notify, or create the proposition without targeted notification.
- Shooting Range Administrators can view all open propositions for ranges they administer.
- Only Shooting Range Administrators can convert a proposition into a confirmed "Reservation." The original proposer is notified automatically.
- Shooting Range Administrators can modify proposition details (e.g., final time, firing line/tracks scope) before conversion. For MVP, the original user does not need to re-confirm these changes.
- Shooting Range Administrators can create "Reservations" directly without a preceding proposition.
- A "Cancel and Re-propose" function will allow Shooting Range Administrators to revert a reservation back into an active proposition.
- Range Administrators can manually log "Records" for shootings that were booked outside the application (e.g., walk-ins) to ensure accurate success metric tracking. This is considered part of the reservation domain.
- During proposition conversion, the administrator can pick a per-range message template, edit its content, and include that final message in the user notification.

### 3.3. Scheduling, Calendar, and Conflict Management
- A weekly calendar view will be the primary interface for viewing the range schedule.
- Calendar views are organized per firing line (separate calendar view for each firing line in a range).
- The calendar will visually distinguish between available time slots, user propositions, and confirmed reservations.
- The system will block users from creating a proposition for a time slot that is already fully booked.
- The system will allow Shooting Range Administrators to create overlapping reservations but will present a clear warning message detailing the conflict before confirmation.
- Range capacity model:
  - A range contains multiple firing lines.
  - A firing line has one fixed distance/length.
  - A firing line contains multiple tracks, and all tracks in that firing line have the same distance/length.
  - A single proposition/reservation can reference only one firing line.
  - A single proposition/reservation can reserve one or many tracks from that firing line.
  - "Full firing line" reservation is represented by selecting all tracks from that firing line.
  - If a user needs multiple firing lines in the same time window, they must create multiple propositions/reservations.
  - The system does not block the same user from having parallel reservations on different firing lines in the same time.
- Event model:
  - An event can be assigned to zero, one, or many firing lines.
  - If a booking overlaps an event assigned to the same firing line, range administrator receives conflict warning and can confirm to proceed.
- The proposition/review experience will show Shooting Range Administrators whether overlapping propositions/reservations on the same firing line/tracks declared coordinator-license presence.
- One coordinator-license declaration is required per firing line involved in a booking.

### 3.4. Administration and Reporting
- Administrators will have a dedicated interface to manage range settings (e.g., operating hours, firing lines, tracks per firing line).
- Range Administrators can manually log "Records" for shootings that were booked outside the application (e.g., walk-ins) to ensure accurate success metric tracking.
- Range Administrators will have contact profiles (phone, email, etc.) with:
  - one global default profile,
  - optional per-range profile override,
  - visibility controls to hide profile globally or per range.
- Range details will include an "Administrator Contacts" field that shows visible admin contacts for that range.
- Range Administrators can maintain message templates per range for proposition-to-reservation conversion notifications.
- A "Source" or "Type" field will be associated with all bookings to distinguish between Proposition, Reservation, and Record.
- A simple audit trail will log all changes to reservations (creation, modification, cancellation).

### 3.5. Notifications
- The system will send in-app and email notifications for key events:
  - To a selected Shooting Range Administrator when a new proposition is created (only when member explicitly selects one).
  - To a user when their proposition is converted into a reservation, including administrator message content.
  - To a user when their reservation is canceled.
- Notifications module is the single place for notification delivery orchestration, including planned email delivery for these flows.

### 3.6. Multi-Range Directory, Map, and Public Access
- Range types and capabilities:
  - Each range stores a `type` (club/community, ally, coming-soon) and an explicit `allowsReservations` flag (club ranges: true; ally and coming-soon ranges: false).
  - Basic range fields shared by all types: description (supports links), geolocation, opening hours (current format).
  - Any range can additionally store a member-only description visible only to authenticated users with the Member role (or higher).
- Public browsing:
  - Range list and map are accessible without login; individual range basic info is public for all ranges.
  - Public events are visible in public range views (without login).
  - Signing up to a public event requires authentication; Guest role is sufficient.
  - Compared with non-authenticated visitors, Guest role adds event signup capability (for public events) while keeping the same public-info visibility baseline.
  - `/map` is the public entry for the map; range detail links remain the same as existing range URLs and are shareable.
  - Landing on `/` with no deeper path redirects to the last opened range (stored in `localStorage` as `lastRangeId`) if it still exists; otherwise redirect to `/map`.
  - Default map viewport uses a Poland bounding box; no geolocation is required to render the map.
- List/map presentation:
  - Map markers use distinct colors for club/community, ally, and coming-soon ranges, defined as separate tokens in the build.
  - Range list is paginated and offers sorting (e.g., name A→Z, distance when location permission is granted, type priority).
  - Type filtering is optional; searching is not required for this iteration.
- Range detail presentation:
  - Range details include an "Administrator Contacts" section populated from visible administrator profiles (global defaults plus per-range overrides), visible only to Members (or higher).
- Booking constraints for ally and coming-soon ranges:
  - UI booking CTA is disabled on ally and coming-soon range pages with a clear message and link back to the range info.
  - Direct navigation to booking routes for ally or coming-soon ranges redirects back to the range info view.
  - API attempts to create reservations for ally or coming-soon ranges return `409 reservations_not_available_for_ally_range` (shared code for non-bookable ranges).

### 3.7. Data Privacy and UI
- Reservation visibility is role-dependent:
  - Guests can view the calendar, see all reservations, and only ever see anonymized reservation summaries without administrator or participant details.
  - Members can view the calendar and see details for all reservations.
  - All other user-generated content remains visible only to authenticated users; public access is limited to the range directory/map and each range's basic info as described in 3.6.
- Public event details remain visible without login according to event audience settings.
- Personal contact information (phone/email) will be visible only according to role and profile visibility settings (Administrators always; Members and higher when explicitly configured as visible in range contact section).
- The User Interface will be in Polish.
- The application will include a Privacy Policy compliant with Polish law.
- The calendar view will feature a welcoming "empty state" with a call-to-action for new users.

## 4. Product Boundaries
### 4.1. In Scope for MVP
- Multiple shooting ranges with a public directory: club/community ranges (with reservations), ally ranges (information-only), and coming-soon ranges (information-only), created and managed by Club/Community Administrators (no predefined ranges).
- Public range list and map (no login required) with color-coded markers, pagination, and basic sorting; `/map` is the public entry, and `/` redirects to the last opened range or `/map`.
- Public range detail for all ranges showing description (links allowed), geolocation, and opening hours; any range may also show member-only description to authenticated users with the Member role (or higher).
- User roles: Guest, Member, Coordinator, Confirmator, Range Admin, Club/Community Admin.
- Full lifecycle for propositions and reservations: member proposition creation, conversion by range administrator, modification, cancellation.
- Weekly calendar view with clear visual distinctions for different booking types.
- In-app and email notifications for core workflows.
- Manual logging of external bookings ("Records") for metric tracking.
- Basic conflict management (block user propositions on full slots, warn administrators of overlaps).
- UI in Polish and inclusion of a privacy policy.

### 4.2. Out of Scope for MVP
- Merging multiple propositions into a single reservation.
- A formal waitlist system for fully booked time slots.
- Maintenance of the official shooting range register book ("książka pobytu na strzelnicy").
- Advanced range assets beyond description/opening hours (e.g., rich media galleries, detailed policy documents).
- Multi-language support.
- A full event-sourcing implementation for the audit trail.

## 5. User Stories

- ID: US-001
- Title: New User Registration
- Description: As a new user, I want to register for an account so that I can sign up for public events and use authenticated features.
- Acceptance Criteria:
  - A public-facing registration page exists.
  - I must provide a valid email address and a password.
  - Upon successful registration, I am assigned the "Guest" role.
  - I am automatically logged in after registration.

- ID: US-002
- Title: User Login and Authentication
- Description: As a registered user, I want to log in to the application to access my account and the system's features.
- Acceptance Criteria:
  - A login page exists with fields for email and password.
  - If I enter correct credentials, I am granted access to the application.
  - If I enter incorrect credentials, I am shown an error message.
  - My role (Guest, Member, Coordinator, etc.) determines what features I can access after logging in.

- ID: US-003
- Title: View Weekly Schedule
- Description: As a user, I want to view the weekly calendar for the shooting range to see availability and bookings according to my role.
- Acceptance Criteria:
  - The calendar displays a 7-day view and can be navigated to the next/previous weeks.
  - I can switch between separate weekly calendars for each firing line in the selected range.
  - Available time slots are clearly visible to all users.
  - Propositions are visible to Members and administrators according to permissions.
  - As a Guest, I can see reservations on the calendar, but they are always shown without personal or contact details, regardless of their visibility flags.
  - As a Member (or higher role), I can see and view details for all reservations.

- ID: US-004
- Title: Create a Proposition (Member Only)
- Description: As a Member, I want to create a proposition for a shooting session so that a range administrator can convert it into a reservation.
- Acceptance Criteria:
  - As a Member, I can select an available time slot on the calendar to initiate a proposition.
  - As a Guest, I cannot create a proposition.
  - I must select exactly one firing line and either specific tracks or full firing line.
  - I must provide declaration value whether someone in my group has shooting coordinator license.
  - If I have the "Coordinator" role, this declaration is auto-set to true and disabled for editing.
  - I can optionally choose one specific range administrator to notify, or skip targeted notification.
  - Upon submission, my proposition appears on the calendar for range administrators to see.

- ID: US-005
- Title: Targeted Admin Notification Choice
- Description: As a Member, I want to decide whether to notify a specific range administrator when creating a proposition.
- Acceptance Criteria:
  - Proposition form allows selecting one visible range administrator as optional notification target.
  - Proposition form allows creating proposition without selecting any notification target.
  - If a specific admin is selected, only that admin receives targeted "new proposition" notification.
  - If no specific admin is selected, no admin notification is sent.
  - If no specific admin is selected, proposition is still created successfully.

- ID: US-006
- Title: View and Convert Proposition
- Description: As a Range Administrator, I want to view proposition details and convert a proposition into a reservation.
- Acceptance Criteria:
  - I can click on a proposition in the calendar to view its details.
  - The details view includes who created it and selected firing line/tracks.
  - The details view shows declaration status for this proposition and other overlapping items on the same firing line/tracks.
  - There is a "Convert to Reservation" action.
  - Clicking this action changes proposition into a reservation on the calendar.
  - The user who created the proposition receives in-app and email notification that it was confirmed.

- ID: US-007
- Title: Modify and Convert Proposition with Message
- Description: As a Range Administrator, I want to modify proposition details and send a message while converting it.
- Acceptance Criteria:
  - In proposition details view, I can edit fields like final time and firing line/tracks before conversion.
  - I can adjust final reservation times before conversion.
  - I can choose a saved per-range message template.
  - I can modify the message content before final conversion.
  - The resulting reservation reflects my changes.
  - The original proposer is notified with updated reservation details and the administrator message.

- ID: US-008
- Title: Create Direct Reservation
- Description: As a Range Administrator, I want to create a reservation directly on the calendar without a user proposition.
- Acceptance Criteria:
  - I can select an available time slot and choose to create a reservation directly.
  - I must fill in the reservation details.
  - I can reserve specific tracks or whole firing line when available, within exactly one firing line.
  - The reservation appears on the calendar.

- ID: US-009
- Title: Handle Overlapping Reservation
- Description: As a Range Administrator, I need to be warned if I try to create a reservation that overlaps with an existing one.
- Acceptance Criteria:
  - If I create a reservation (either directly or by converting a proposition) that conflicts with an existing reservation's time and firing line/tracks scope, a warning modal appears.
  - A reservation for the same user on a different firing line in the same time window is allowed.
  - The warning message displays the specific details of the conflicting booking.
  - I can choose to proceed with the booking despite the warning, or cancel the action.

- ID: US-010
- Title: Cancel Reservation
- Description: As a Range Administrator, I want to cancel a confirmed reservation.
- Acceptance Criteria:
  - I can select a reservation and choose a "Cancel" option.
  - The user associated with the reservation (if any) receives in-app and email cancellation notification.
  - The reservation is removed from the calendar, and the time slot becomes available again (or reverts to showing any underlying propositions).

- ID: US-011
- Title: Sign Up to Public Event as Guest
- Description: As a Guest, I want to sign up for a public event so that I can participate without becoming a Member first.
- Acceptance Criteria:
  - I can view public events without login.
  - As an authenticated Guest, I can submit signup for a public event.
  - As a non-authenticated visitor, attempting to sign up redirects me to login/registration.
  - Event signup permission for Guests applies only to events with `Public` audience.

- ID: US-012
- Title: User and Role Management
- Description: As a Club/Community Administrator, I want to manage users and their roles.
- Acceptance Criteria:
  - I can view a list of all registered users.
  - I can edit a user's profile to assign or un-assign roles (Guest, Member, Coordinator, Confirmator, Range Admin).
  - I can deactivate or delete a user account.

- ID: US-013
- Title: Membership and License Confirmation
- Description: As a Confirmator, I want to review users and upgrade their status to "Member" or "Coordinator".
- Acceptance Criteria:
  - I have access to a queue or list of users awaiting verification.
  - I can view a user's profile and any submitted documents (handled externally for MVP).
  - I can change a user's role from "Guest" to "Member" or "Coordinator".

- ID: US-014
- Title: Log External Booking (Record)
- Description: As a Range Administrator, I want to log a shooting that happened without being booked through the app to ensure our metrics are accurate. This functionality is part of the reservations domain.
- Acceptance Criteria:
  - I have an interface to create a "Record".
  - I can enter the date, time, and number of participants for the external booking.
  - This "Record" is stored in the database for metric calculation but does not appear as a typical reservation on the main calendar view.

- ID: US-015
- Title: Range Setup
- Description: As a Range Administrator, I want to configure the basic settings for my shooting range.
- Acceptance Criteria:
  - I have access to a "Range Setup" interface.
  - I can define the range's operating hours for each day of the week.
  - I can define firing lines with their distance/length.
  - I can define tracks assigned to each firing line.

- ID: US-016
- Title: Browse Shooting Ranges (Public Map and List)
- Description: As any visitor, I want to browse all shooting ranges on a public map or list so I can discover club, ally, and coming-soon locations without logging in.
- Acceptance Criteria:
  - `/map` is publicly accessible and loads a map centered on a Poland-wide bounding box.
  - Map markers use distinct colors for club/community, ally, and coming-soon ranges.
  - The range list is publicly accessible, paginated, and supports sorting (name A→Z as default; type priority; distance when geolocation permission is granted).
  - Each range in the list links to its existing detail page URL; these links are shareable without authentication.
  - Only ranges added by Club/Community Administrators appear.

- ID: US-017
- Title: View Range Detail with Member-Only Notes
- Description: As a visitor or member, I want to view range details, with sensitive notes limited to members.
- Acceptance Criteria:
  - Public users can see basic info for any range: description (links allowed), geolocation, opening hours, range type, and whether reservations are allowed.
  - Member-only description is shown only when the viewer is authenticated with the Member role (or higher).
  - Ally and coming-soon ranges do not expose reservation actions or links beyond their info view.
  - Range detail URLs remain unchanged and are directly shareable.
  - Ranges are created and managed by Club/Community Administrators; there is no predefined seed range.

- ID: US-018
- Title: Redirect to Last Opened Range or Map
- Description: As a returning visitor, I want the home page to take me back to the range I last viewed or to the map if that range is unavailable.
- Acceptance Criteria:
  - Visiting `/` with no deeper path reads `lastRangeId` from `localStorage`; if the range exists it redirects to that range detail, otherwise to `/map`.
  - Viewing any range detail updates `lastRangeId`.
  - If the stored range was removed or is otherwise unavailable, the user is redirected to `/map` without error.

- ID: US-019
- Title: Prevent Reservations on Ally or Coming-Soon Ranges
- Description: As a user, I should not be able to attempt bookings on ally or coming-soon ranges.
- Acceptance Criteria:
  - On ally and coming-soon range pages, the booking CTA is disabled with a message directing the user to the info view.
  - Direct navigation to a booking-specific route for ally or coming-soon ranges redirects back to the range info view.
  - API calls that attempt to create reservations for ally or coming-soon ranges return HTTP 409 with code `reservations_not_available_for_ally_range` (code reused for non-bookable ranges).
  - Club ranges retain full reservation flow.

## 6. Success Metrics
The success of the Strzel Sobie MVP will be measured against the following key performance indicators:

1. Primary Goal: Application Adoption at Club Ranges
   - Metric: 90% of all shooting sessions at a managed club range are reserved through the application (tracked per range).
   - Formula: (Number of 'Reservations') / (Number of 'Reservations' + Number of 'Records') over a given time period, calculated per club range.
   - 'Reservations' are bookings made via the app. 'Records' are manual entries by an admin for bookings made outside the app.

2. Secondary Goal: Proposition Conversion Rate
   - Metric: 50% of all user-created "propositions" are successfully converted into "reservations" by range administrators.
   - Formula: (Number of converted propositions) / (Total number of propositions created) over a given time period.
   - This metric indicates the effectiveness of the platform in turning member demand into confirmed reservations.
