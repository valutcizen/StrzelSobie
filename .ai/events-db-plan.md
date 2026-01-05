# Database Plan - Events Module

### 1. Overview

This document outlines the new tables required for the Events module and the necessary modifications to existing tables. The schema is designed for Cloudflare D1 and follows the established project conventions.

### 2. New Tables

**`events_events`**

*   **Owner**: `events`
*   **Description**: Stores the configuration and core details for all events.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the event. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The range where the event takes place. Indexed for fast lookups. |
| `organizer_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The user who created the event. |
| `slug` | TEXT | NOT NULL, UNIQUE | The public, URL-friendly identifier for the event (e.g., `20251115-abcde`). Format: `{YYYYMMDD}-{random5letters_lowercase}`. |
| `name` | TEXT | NOT NULL | The human-readable name of the event. |
| `event_date` | TEXT | NOT NULL | The date of the event (YYYY-MM-DD). Indexed for calendar queries. |
| `start_time` | TEXT | NOT NULL | The start time of the event (HH:MM). |
| `end_time` | TEXT | NOT NULL | The end time of the event (HH:MM). |
| `status` | TEXT | NOT NULL, DEFAULT 'active' | The event's status (e.g., `active`, `cancelled`). |
| `audience` | TEXT | NOT NULL | The target audience for the event. |
| `config` | TEXT | NOT NULL | A JSON object storing detailed, non-searchable event rules and descriptions. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the event was created. |

**Details for the `config` JSON Column in `events_events`:**
This column will store a JSON object with the following structure:
```json
{
  "publicDescription": "A description visible to everyone.",
  "memberDescription": "A detailed description visible only to members.",
  "registrationType": "RegistrationRequired",
  "registrationDeadline": "2025-11-14T10:00:00Z",
  "capacity": {
    "type": "Limited",
    "slots": 20,
    "waitlistSlots": 10
  },
  "guestPolicy": {
    "type": "GuestsAllowed"
  }
}
```

---

**`events_signups`**

*   **Owner**: `events`
*   **Description**: A join table that records which users have signed up for which events.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the signup record. |
| `event_id` | INTEGER | NOT NULL, FOREIGN KEY (events_events.id) | The event being signed up for. |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The user who signed up. |
| `status` | TEXT | NOT NULL | The user's current status for the event. |
| `guests_count` | INTEGER | NOT NULL, DEFAULT 0 | The number of additional guests the user is bringing. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of the initial signup. |
| `updated_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of the last modification (e.g., status change). |
| | | UNIQUE (event_id, user_id) | Prevents a user from signing up for the same event multiple times. |

---

### 3. Modifications to Existing Tables

To avoid feature overlap and simplify the domain logic, the `reservations_reservations` and `reservations_propositions` tables will be modified. The concepts of "public" or "joinable" reservations are now superseded by the Events module.

**`reservations_reservations`**

*   **Action**: Remove the `is_public`, `is_joinable`, and `num_participants` columns.

*   **New Schema**:
| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the reservation. |
| `proposition_id` | INTEGER | NULL, FOREIGN KEY (reservations_propositions.id) | The proposition this reservation was converted from (if any). |
| `coordinator_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The coordinator who confirmed or created the reservation. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The shooting range where the reservation is located. |
| `event_date` | TEXT | NOT NULL | The date of the event (YYYY-MM-DD). |
| `start_time` | TEXT | NOT NULL | The start time of the event (HH:MM). |
| `end_time` | TEXT | NOT NULL | The end time of the event (HH:MM). |
| `tracks_requested` | INTEGER | NOT NULL | The number of tracks reserved. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the reservation was created. |

---

**`reservations_propositions`**

*   **Action**: Remove the `num_participants` column.

*   **New Schema**:
| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the proposition. |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The member who requested the proposition. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The shooting range where the proposition is located. |
| `status` | TEXT | NOT NULL | The proposition status (e.g., `open`, `converted`, `cancelled`). |
| `event_date` | TEXT | NOT NULL | The date of the proposition (YYYY-MM-DD). |
| `start_time` | TEXT | NOT NULL | The start time of the proposition (HH:MM). |
| `end_time` | TEXT | NOT NULL | The end time of the proposition (HH:MM). |
| `tracks_requested` | INTEGER | NOT NULL | The number of tracks requested. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the proposition was created. |

---

### 4. New Indexes

To ensure performant queries for the calendar view, which will fetch events based on their date range, a new index is required.

- **`CREATE INDEX idx_events_range_date ON events_events(range_id, event_date);`**

This will allow the database to efficiently find all events for a given range that fall within a specific time window.
