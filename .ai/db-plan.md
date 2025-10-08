### 1. List of tables with their columns, data types, and constraints

**`users_users`**
Stores information about all registered users. Owner: `users`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `email` | TEXT | NOT NULL, UNIQUE |
| `phone_number` | TEXT | NULL |
| `is_deleted` | INTEGER | NOT NULL, DEFAULT 0 |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**`auth_user_credentials`**
Stores user credentials for authentication. Owner: `auth`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `user_id` | INTEGER | PRIMARY KEY, FOREIGN KEY (users_users.id) |
| `password_hash` | TEXT | NOT NULL |

**`users_roles`**
Defines the available roles in the system. Owner: `users`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `name` | TEXT | NOT NULL, UNIQUE |

**`users_user_global_roles`**
Join table for global user roles (applicable across the entire system). Owner: `users`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) |
| `role_id` | INTEGER | NOT NULL, FOREIGN KEY (users_roles.id) |
| | | PRIMARY KEY (user_id, role_id) |

**`users_user_range_roles`**
Join table for roles assigned to a specific shooting range. Owner: `users`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) |
| `role_id` | INTEGER | NOT NULL, FOREIGN KEY (users_roles.id) |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (admin_shooting_ranges.id) |
| | | PRIMARY KEY (user_id, role_id, range_id) |

**`admin_shooting_ranges`**
Stores information about shooting ranges. Owner: `admin`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `slug` | TEXT | NOT NULL, UNIQUE |
| `display_name` | TEXT | NOT NULL |
| `total_tracks` | INTEGER | NOT NULL |
| `operating_hours` | TEXT | NOT NULL |

**`reservations_propositions`**
Reservation proposals created by users. Owner: `reservations`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (admin_shooting_ranges.id) |
| `status` | TEXT | NOT NULL |
| `event_date` | TEXT | NOT NULL |
| `start_time` | TEXT | NOT NULL |
| `end_time` | TEXT | NOT NULL |
| `num_participants` | INTEGER | NOT NULL |
| `tracks_requested` | INTEGER | NOT NULL |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**`reservations_reservations`**
Confirmed reservations. Owner: `reservations`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `proposition_id` | INTEGER | NULL, FOREIGN KEY (reservations_propositions.id) |
| `coordinator_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (admin_shooting_ranges.id) |
| `event_date` | TEXT | NOT NULL |
| `start_time` | TEXT | NOT NULL |
| `end_time` | TEXT | NOT NULL |
| `num_participants` | INTEGER | NOT NULL |
| `tracks_requested` | INTEGER | NOT NULL |
| `is_public` | INTEGER | NOT NULL, DEFAULT 0 |
| `is_joinable` | INTEGER | NOT NULL, DEFAULT 0 |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**`admin_records`**
Manual entries for off-system bookings (for metrics). Owner: `admin`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `admin_id` | INTEGER | NOT NULL, FOREIGN KEY (users_users.id) |
| `range_id` | INTEGER | NOT NULL, FOREIGN KEY (admin_shooting_ranges.id) |
| `event_date` | TEXT | NOT NULL |
| `start_time` | TEXT | NOT NULL |
| `end_time` | TEXT | NOT NULL |
| `num_participants` | INTEGER | NOT NULL |
| `created_at` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**`admin_audit_logs`**
Simple audit trail for key events. Owner: `admin`.
| Column Name | Data Type | Constraints |
| --- | --- | --- |
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `user_id` | INTEGER | NULL, FOREIGN KEY (users_users.id) |
| `action_type` | TEXT | NOT NULL |
| `target_id` | INTEGER | NULL |
| `details` | TEXT | NULL |
| `event_timestamp` | TEXT | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 2. Relationships between tables

- **Users and Credentials**: A one-to-one relationship (`users_users` 1-to-1 `auth_user_credentials`) linking user profile data with their authentication credentials.
- **Users and Roles**: A many-to-many relationship implemented via two join tables:
  - `users_user_global_roles` for global roles (e.g., `Member`, `Club/Community Administrator`).
  - `users_user_range_roles` for range-specific roles (e.g., `Shooting Range Administrator`), linking `users_users`, `users_roles`, and `admin_shooting_ranges`.
- **User and Proposition**: A one-to-many relationship (`users_users` 1-to-N `reservations_propositions`). One user can create many propositions.
- **Proposition and Reservation**: An optional one-to-one relationship (`reservations_propositions` 1-to-1 `reservations_reservations`). A reservation may or may not originate from a proposition.
- **User and Reservation/Record**: A one-to-many relationship (`users_users` 1-to-N `reservations_reservations`/`admin_records`). One coordinator/administrator can be associated with many reservations/records.
- **Shooting Range and Events**: A one-to-many relationship (`admin_shooting_ranges` 1-to-N `reservations_propositions`/`reservations_reservations`/`admin_records`). One shooting range can have many events.

### 3. Indexes

- **Automatic Indexes**: Primary keys and columns with a `UNIQUE` constraint (e.g., `users_users.email`, `users_roles.name`, `admin_shooting_ranges.slug`) are automatically indexed.
- **Composite Indexes for Calendar Performance**: To optimize queries that filter first by shooting range and then by date, the following indexes were created:
  - `CREATE INDEX idx_propositions_range_date ON reservations_propositions(range_id, event_date);`
  - `CREATE INDEX idx_reservations_range_date ON reservations_reservations(range_id, event_date);`
  - `CREATE INDEX idx_records_range_date ON admin_records(range_id, event_date);`

### 4. PostgreSQL policies (if applicable)

The project uses Cloudflare D1 (an SQLite-like database), which does not natively support Row-Level Security (RLS) in the style of PostgreSQL. All data visibility rules (e.g., Guests see only public reservations, while Members see all) must be implemented in the application layer (in the Cloudflare Worker logic).

### 5. Any additional notes or explanations about design decisions

- **Role Management**: The schema distinguishes between global and range-specific roles to ensure future flexibility.
- **Data Seeding**: The `roles` table is pre-populated with the required system roles.
- **Date and Time Storage**: Date (`YYYY-MM-DD`) and time (`HH:MM`) are stored in separate `TEXT` columns to simplify indexing and queries for single-day events.
- **Soft Deletes**: The `users` table uses an `is_deleted` flag instead of physically deleting records to preserve the integrity of historical data for metrics.
- **User-Reservation Linking**: Reservations are linked to end-users via the optional `proposition_id` field. Reservations created directly by a coordinator do not have a direct user link in the `reservations` table.