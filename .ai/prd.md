# Product Requirements Document (PRD) - Strzel Sobie

## 1. Product Overview
Strzel Sobie is a specialized reservation management application for shooting ranges, designed to comply with Polish law, which mandates the presence of a licensed shooting coordinator for shooting events. The application facilitates a seamless booking process by connecting regular users with licensed coordinators. Users can propose a time for a shooting session, and available coordinators can accept these propositions, converting them into official reservations. The system is built around a robust role-based access control system, ensuring that different user types have appropriate permissions. The Minimum Viable Product (MVP) will focus on a single shooting range in Dobczyce, with an architecture designed for future expansion to multiple ranges.

## 2. User Problem
Standard booking and reservation applications available on the market do not address a key requirement of Polish law for operating shooting ranges: the mandatory presence and supervision of a person holding a shooting coordinator license ("prowadzący strzelanie"). This creates a logistical challenge for both shooting range users, who need to find and coordinate with a licensed individual, and for the coordinators themselves. Strzel Sobie directly solves this problem by integrating the coordinator into the booking workflow. It provides a platform where users can request a booking (a "proposition") and licensed coordinators can approve it, thereby ensuring legal compliance and simplifying the scheduling process for everyone involved.

## 3. Functional Requirements
### 3.1. User Management and Roles
- The system will feature a role-based access control system with six distinct user roles:
  - Guest: A publicly registered user. Can create and manage their own propositions.
  - Member: A verified member of the club/community. Their propositions are visually highlighted.
  - Coordinator: A user with a verified shooting coordinator license. Can create reservations directly and convert user propositions into reservations.
  - Confirmator: An administrative role responsible for verifying user memberships and licenses, granting "Member" or "Coordinator" status.
  - Shooting Range Administrator: Manages the settings for a specific shooting range.
  - Club/Community Administrator (Main Admin): Has global permissions to manage users, roles, and system settings.
- Public users can self-register for a "Guest" account.
- The initial Club/Community Administrator (superuser) account will be created via a one-time deployment script.

### 3.2. Reservation and Proposition System
- Users (Guests, Members) can create "propositions" for a desired shooting time, specifying details such as the number of participants and desired tracks.
- Coordinators can view a list of all open propositions.
- Propositions from "Members" will be visually distinguished with a badge to give them priority.
- Coordinators can accept a proposition, which converts it into a confirmed "Reservation." The original proposer is notified automatically.
- Coordinators can modify a proposition's details (e.g., time, tracks) before accepting it. For the MVP, the original user does not need to re-confirm these changes.
- Coordinators can create "Reservations" directly without a preceding proposition.
- A "Cancel and Re-propose" function will allow coordinators to revert a reservation back into an active proposition.
- Range Administrators can manually log "Records" for shootings that were booked outside the application (e.g., walk-ins) to ensure accurate success metric tracking. This is considered part of the reservation domain.

### 3.3. Scheduling, Calendar, and Conflict Management
- A weekly calendar view will be the primary interface for viewing the range schedule.
- The calendar will visually distinguish between available time slots, user propositions, and confirmed reservations.
- The system will block users from creating a proposition for a time slot that is already fully booked.
- The system will allow coordinators to create overlapping reservations but will present a clear warning message detailing the conflict before confirmation.
- For the MVP, a single booking will assume the same shooting distance for all included tracks.

### 3.4. Administration and Reporting
- Administrators will have a dedicated interface to manage range settings (e.g., operating hours, number of tracks).
- Range Administrators can manually log "Records" for shootings that were booked outside the application (e.g., walk-ins) to ensure accurate success metric tracking.
- A "Source" or "Type" field will be associated with all bookings to distinguish between Proposition, Reservation, and Record.
- A simple audit trail will log all changes to reservations (creation, modification, cancellation).

### 3.5. Notifications
- The system will send automated email notifications for key events:
  - To all coordinators when a new proposition is created.
  - To a user when their proposition is converted into a reservation.
  - To a user when their reservation is canceled.

### 3.6. Data Privacy and UI
- Reservation visibility is role-dependent:
  - Guests can view the calendar and see details of "Public" reservations.
  - Members can view the calendar and see details for all reservations.
  - All other user-generated content remains visible only to authenticated users.
- Personal contact information (phone/email) will be visible only to Administrators and the specific Coordinator assigned to a reservation.
- The User Interface will be in Polish.
- The application will include a Privacy Policy compliant with Polish law.
- The calendar view will feature a welcoming "empty state" with a call-to-action for new users.

## 4. Product Boundaries
### 4.1. In Scope for MVP
- A single shooting range (Dobczyce).
- User roles: Guest, Member, Coordinator, Confirmator, Range Admin, Club/Community Admin.
- Full lifecycle for propositions and reservations: creation, acceptance, modification by coordinator, cancellation.
- Weekly calendar view with clear visual distinctions for different booking types.
- Email notifications for core workflows.
- Manual logging of external bookings ("Records") for metric tracking.
- Basic conflict management (block user propositions on full slots, warn coordinators of overlaps).
- An informational "Joinable Reservations" view (without in-app joining functionality).
- UI in Polish and inclusion of a privacy policy.

### 4.2. Out of Scope for MVP
- Support for multiple shooting ranges in the UI (though the architecture will support it).
- Splitting a single proposition among multiple coordinators.
- Merging multiple propositions into a single reservation.
- A formal waitlist system for fully booked time slots.
- Maintenance of the official shooting range register book ("książka pobytu na strzelnicy").
- Advanced range details (maps, photos, policies).
- In-app mechanism for users to join "Joinable Reservations."
- Multi-language support.
- A full event-sourcing implementation for the audit trail.

## 5. User Stories

- ID: US-001
- Title: New User Registration
- Description: As a new user, I want to register for an account so that I can create propositions to book a shooting time.
- Acceptance Criteria:
  - A public-facing registration page exists.
  - I must provide a valid email address and a password.
  - Upon successful registration, I am assigned the "Guest" role.
  - I receive a confirmation email.
  - I am automatically logged in after registration.

- ID: US-002
- Title: User Login and Authentication
- Description: As a registered user, I want to log in to the application to access my account and the system's features.
- Acceptance Criteria:
  - A login page exists with fields for email and password.
  - If I enter correct credentials, I am granted access to the application.
  - If I enter incorrect credentials, I am shown an error message.
  - The system provides a "forgot password" mechanism.
  - My role (Guest, Member, Coordinator, etc.) determines what features I can access after logging in.

- ID: US-003
- Title: View Weekly Schedule
- Description: As a user, I want to view the weekly calendar for the shooting range to see availability and bookings according to my role.
- Acceptance Criteria:
  - The calendar displays a 7-day view and can be navigated to the next/previous weeks.
  - Available time slots are clearly visible to all users.
  - Propositions are visible to all authenticated users.
  - As a Guest, I can see and view details for reservations explicitly marked as "Public". Other reservations are shown as "busy" with no details.
  - As a Member (or higher role), I can see and view details for all reservations.
  - As a Member (or higher role), reservations are clearly marked with a visual indicator if they are "Open for Joining".

- ID: US-004
- Title: Create a Proposition
- Description: As a Guest or Member, I want to create a proposition for a shooting session so that a coordinator can approve it.
- Acceptance Criteria:
  - I can select an available time slot on the calendar to initiate a proposition.
  - I must fill in required details: number of participants, requested number of tracks.
  - I cannot create a proposition for a time slot that is already fully booked.
  - Upon submission, my proposition appears on the calendar for coordinators to see.
  - All coordinators receive an email notification about the new proposition.

- ID: US-005
- Title: Member Proposition Highlighting
- Description: As a Coordinator, I want to easily distinguish propositions made by verified Members from those made by Guests.
- Acceptance Criteria:
  - When viewing the list of propositions or the calendar, propositions submitted by users with the "Member" role have a clear visual badge or indicator.
  - This indicator is not present on propositions from "Guest" users.

- ID: US-006
- Title: View and Accept Proposition
- Description: As a Coordinator, I want to view the details of a proposition and accept it to convert it into a reservation.
- Acceptance Criteria:
  - I can click on a proposition in the calendar to view its details.
  - The details view includes who created it, number of participants, and requested tracks.
  - There is an "Accept" button.
  - Clicking "Accept" changes the proposition into a reservation on the calendar.
  - The user who created the proposition receives an email notification that it has been confirmed.

- ID: US-007
- Title: Modify and Accept Proposition
- Description: As a Coordinator, I want to modify the details of a proposition before accepting it.
- Acceptance Criteria:
  - In the proposition details view, I can edit fields like the time or number of tracks.
  - After making changes, I can accept the modified proposition.
  - The resulting reservation reflects my changes.
  - The original proposer is notified of the confirmed reservation with the updated details.

- ID: US-008
- Title: Create Direct Reservation
- Description: As a Coordinator, I want to create a reservation directly on the calendar without a user proposition.
- Acceptance Criteria:
  - I can select an available time slot and choose to create a reservation directly.
  - I must fill in the reservation details.
  - The reservation appears on the calendar.
  - I can optionally flag the reservation as "Public", making it visible to Guests.
  - I can optionally flag the reservation as "Open for Joining", which is displayed to Members.

- ID: US-009
- Title: Handle Overlapping Reservation
- Description: As a Coordinator, I need to be warned if I try to create a reservation that overlaps with an existing one.
- Acceptance Criteria:
  - If I create a reservation (either directly or by accepting a proposition) that conflicts with an existing reservation's time and tracks, a warning modal appears.
  - The warning message displays the specific details of the conflicting booking.
  - I can choose to proceed with the booking despite the warning, or cancel the action.

- ID: US-010
- Title: Cancel Reservation
- Description: As a Coordinator, I want to cancel a confirmed reservation.
- Acceptance Criteria:
  - I can select a reservation and choose a "Cancel" option.
  - The user associated with the reservation (if any) receives a cancellation email.
  - The reservation is removed from the calendar, and the time slot becomes available again (or reverts to showing any underlying propositions).

- ID: US-011
- Title: Identify Joinable Reservations
- Description: As a Member, I want to see on the calendar which reservations are open for others to join.
- Acceptance Criteria:
  - When viewing the weekly calendar, reservations that a Coordinator has flagged as "Open for Joining" have a clear visual indicator.
  - This indicator is visible to all users with the "Member" role or higher.
  - The indicator is not visible to "Guest" users.
  - The feature is informational; there is no in-app button to "join".

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
  - I can set the total number of available tracks.

## 6. Success Metrics
The success of the Strzel Sobie MVP will be measured against the following key performance indicators:

1. Primary Goal: Application Adoption
   - Metric: 90% of all shooting sessions at the Dobczyce shooting range are reserved through the application.
   - Formula: (Number of 'Reservations') / (Number of 'Reservations' + Number of 'Records') over a given time period.
   - 'Reservations' are bookings made via the app. 'Records' are manual entries by an admin for bookings made outside the app.

2. Secondary Goal: Proposition Conversion Rate
   - Metric: 50% of all user-created "propositions" are successfully converted into "reservations" by coordinators.
   - Formula: (Number of converted propositions) / (Total number of propositions created) over a given time period.
   - This metric indicates the effectiveness of the platform in connecting users with available coordinators.
