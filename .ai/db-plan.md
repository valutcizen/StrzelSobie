### 1. Overview

This document outlines the database schema for the Strzel Sobie project, designed for Cloudflare D1 (an SQLite-like database). The schema is organized based on the modular architecture of the backend, where each table is "owned" by a specific module (e.g., `users`, `auth`, `reservations`, `ranges`).

### 2. Table Ownership and Naming Conventions

To maintain clarity and prevent naming conflicts between modules, all tables follow the `{module_name}_{table_name}` naming convention. For example, the `users` table, owned by the `users` module, is named `users_users`.

### 3. List of Tables

**`users_users`**

*   **Owner**: `users`
*   **Description**: Stores core information about all registered users in the system.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the user. |
| `email` | TEXT | NOT NULL, UNIQUE | User's primary email address, used for login and communication. |
| `phone_number` | TEXT | NULL | Optional contact number for coordinators or administrators. |
| `is_deleted` | INTEGER | NOT NULL, DEFAULT 0 | Soft delete flag. `0` for active, `1` for deleted. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the user account was created. |

**`auth_user_credentials`**

*   **Owner**: `auth`
*   **Description**: Stores the password hash for user authentication, linked one-to-one with `users_users`.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `user_id` | INTEGER | PRIMARY KEY, FOREIGN KEY (users_users.id) | Links to the corresponding user in `users_users`. |
| `password_hash` | TEXT | NOT NULL | The hashed user password. |

**`users_roles`**

*   **Owner**: `users`
*   **Description**: Defines all possible roles within the system (e.g., Member, Coordinator). Roles are either global (Guest, Member, Coordinator, Confirmator, Club/Community Admin) or range-scoped (Range Admin).

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY | Unique identifier for the role. |
| `name` | TEXT | NOT NULL, UNIQUE | The name of the role (e.g., "Member"). |
| `scope` | TEXT | NOT NULL | The scope of the role ('global' or 'range'). |

**`users_user_global_roles`**

*   **Owner**: `users`
*   **Description**: A join table assigning system-wide roles to users.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The ID of the user being assigned the role. |
| `role_id` | INTEGER | NOT NULL, FOREIGN KEY (users_roles.id) | The ID of the global role being assigned. |
| | | PRIMARY KEY (user_id, role_id) | |

**`users_user_range_roles`**

*   **Owner**: `users`
*   **Description**: A join table assigning range-specific roles to users (currently used only for Range Admin assignments per shooting range).

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The ID of the user being assigned the role. |
| `role_id` | INTEGER | NOT NULL, FOREIGN KEY (users_roles.id) | The ID of the range-specific role. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The ID of the shooting range this role applies to. |
| | | PRIMARY KEY (user_id, role_id, range_id) | |

**`ranges_shooting_ranges`**

*   **Owner**: `ranges`
*   **Description**: Stores details about the shooting ranges managed by the system. Ranges are created by Club/Community Administrators; there are no predefined/seed ranges.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the shooting range. |
| `slug` | TEXT | NOT NULL, UNIQUE | A URL-friendly identifier (e.g., "dobczyce"). |
| `display_name` | TEXT | NOT NULL | The human-readable name of the range. |
| `type` | TEXT | NOT NULL, CHECK (type IN ('club','ally','coming-soon')) | Range category: club/community (reservations enabled), ally (info only), coming-soon (info only). |
| `allows_reservations` | INTEGER | NOT NULL, DEFAULT 0 | `1` if reservations can be made (club ranges), `0` otherwise (ally/coming-soon). |
| `is_deleted` | INTEGER | NOT NULL, DEFAULT 0 | Soft delete flag for ranges directory/map. `1` hides the range from all listings and lookups. |
| `public_description` | TEXT | NULL | Public description; can contain links. |
| `member_description` | TEXT | NULL | Member-only description, visible to authenticated users with Member role or higher. |
| `latitude` | REAL | NOT NULL | Latitude coordinate for map display. |
| `longitude` | REAL | NOT NULL | Longitude coordinate for map display. |
| `operating_hours` | TEXT | NOT NULL | A JSON object defining the range's opening and closing times. |
| `total_tracks` | INTEGER | NOT NULL | The total number of shooting tracks available (relevant for club ranges). |

**`reservations_propositions`**

*   **Owner**: `reservations`
*   **Description**: Stores reservation proposals created by users, awaiting confirmation.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the proposition. |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The user who created the proposition. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The target shooting range for the proposition. |
| `status` | TEXT | NOT NULL | The current status (e.g., "open", "converted", "cancelled"). |
| `event_date` | TEXT | NOT NULL | The proposed date for the event (YYYY-MM-DD). |
| `start_time` | TEXT | NOT NULL | The proposed start time (HH:MM). |
| `end_time` | TEXT | NOT NULL | The proposed end time (HH:MM). |
| `num_participants` | INTEGER | NOT NULL | The number of participants for the event. |
| `tracks_requested` | INTEGER | NOT NULL | The number of shooting tracks requested. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the proposition was created. |

**`reservations_reservations`**

*   **Owner**: `reservations`
*   **Description**: Stores confirmed reservations, which can be created from a proposition or directly by a coordinator.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the reservation. |
| `proposition_id` | INTEGER | NULL, FOREIGN KEY (reservations_propositions.id) | The proposition this reservation was converted from (if any). |
| `coordinator_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The coordinator who confirmed or created the reservation. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The shooting range where the reservation is located. |
| `event_date` | TEXT | NOT NULL | The date of the event (YYYY-MM-DD). |
| `start_time` | TEXT | NOT NULL | The start time of the event (HH:MM). |
| `end_time` | TEXT | NOT NULL | The end time of the event (HH:MM). |
| `num_participants` | INTEGER | NOT NULL | The number of participants. |
| `tracks_requested` | INTEGER | NOT NULL | The number of tracks reserved. |
| `is_public` | INTEGER | NOT NULL, DEFAULT 0 | `1` if visible to Guests, `0` otherwise. |
| `is_joinable` | INTEGER | NOT NULL, DEFAULT 0 | `1` if Members can join, `0` otherwise. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the reservation was created. |

**`reservations_records`**

*   **Owner**: `reservations`
*   **Description**: Manual entries for off-system bookings (e.g., walk-ins), used for tracking metrics. While created by a user with administrative privileges, these are conceptually post-factum reservations and thus belong to the reservations domain.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the record. |
| `admin_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) | The administrator who logged the record. |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (ranges_shooting_ranges.id) | The shooting range for the record. |
| `event_date` | TEXT | NOT NULL | The date of the event (YYYY-MM-DD). |
| `start_time` | TEXT | NOT NULL | The start time of the event (HH:MM). |
| `end_time` | TEXT | NOT NULL | The end time of the event (HH:MM). |
| `num_participants` | INTEGER | NOT NULL | The number of participants. |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the record was created. |

**`audit_logs`**

*   **Owner**: `worker`
*   **Description**: A simple audit trail for logging key events in the system.

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique identifier for the log entry. |
| `user_id` | INTEGER | NULL, FOREIGN KEY (users_users.id) | The user who performed the action (NULL for system actions). |
| `action_type` | TEXT | NOT NULL | The type of action performed (e.g., "RESERVATION_CREATE"). |
| `target_id` | INTEGER | NULL | The ID of the entity that was affected. |
| `details` | TEXT | NULL | A JSON object containing details about the event. |
| `event_timestamp` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Timestamp of when the event occurred. |

### 4. Relationships between Tables

- **Users and Credentials**: A one-to-one relationship (`users_users` 1-to-1 `auth_user_credentials`). Deleting a user from `users_users` will cascade and delete their credentials from `auth_user_credentials`.
- **Users and Roles**: A many-to-many relationship implemented via two join tables:
  - `users_user_global_roles` for global roles.
  - `users_user_range_roles` for range-specific roles (currently only Range Admin is range-scoped; Member/Coordinator/Confirmator are global).
  Deleting a user or role will cascade and remove the corresponding entries in these join tables.
- **User and Proposition**: A one-to-many relationship (`users_users` 1-to-N `reservations_propositions`).
- **Proposition and Reservation**: An optional one-to-one relationship (`reservations_propositions` 1-to-1 `reservations_reservations`).
- **User and Reservation/Record**: A one-to-many relationship where a `coordinator_id` in `reservations_reservations` or an `admin_id` in `reservations_records` links back to `users_users`.
- **Shooting Range and Events**: A one-to-many relationship (`ranges_shooting_ranges` 1-to-N `reservations_propositions`/`reservations_reservations`/`reservations_records`).

### 5. Indexes

- **Automatic Indexes**: Primary keys and columns with a `UNIQUE` constraint are automatically indexed by the database.
- **Composite Indexes for Calendar Performance**: To optimize queries that filter by shooting range and then by date, the following indexes are created:
  - `CREATE INDEX idx_propositions_range_date ON reservations_propositions(range_id, event_date);`
  - `CREATE INDEX idx_reservations_range_date ON reservations_reservations(range_id, event_date);`
  - `CREATE INDEX idx_records_range_date ON reservations_records(range_id, event_date);`
- **Indexes for Ranges Directory/Detail**:
  - `CREATE INDEX idx_ranges_slug_not_deleted ON ranges_shooting_ranges(is_deleted, slug);`
  - `CREATE INDEX idx_ranges_type_not_deleted ON ranges_shooting_ranges(is_deleted, type, id);`

### 6. Row-Level Security (RLS)

The project uses Cloudflare D1, which does not natively support RLS. All data access and visibility rules (e.g., Guests see only public reservations, while Members see all) must be implemented in the application layer (the Cloudflare Worker).

### 7. Design Decisions

- **Role Management**: The schema distinguishes between global and range-specific roles to provide fine-grained access control and future flexibility.
- **Data Seeding**: The `users_roles` table is pre-populated with the initial set of system roles required for the application to function correctly.
- **Date and Time Storage**: `Date` (YYYY-MM-DD) and `Time` (HH:MM) are stored in separate `TEXT` columns to simplify indexing and queries, as all events are assumed to occur on a single day.
- **Soft Deletes**: The `users_users` table uses an `is_deleted` flag to allow for deactivating users without losing historical data, preserving the integrity of audit logs and metrics.
- **Range Soft Deletes**: `ranges_shooting_ranges.is_deleted` hides ranges from public directory/map and lookups. On delete, the slug is mutated with a timestamp suffix to free the original slug for future reuse.
- **Range Creation**: Ranges are created and managed by Club/Community Administrators; there is no predefined or seeded range in the database.
- **Range Types and Booking Capability**: `type` plus `allows_reservations` enforce booking rules (club ranges allow reservations; ally and coming-soon ranges are information-only); the member-only description is readable only to authenticated users with the Member role or higher.
