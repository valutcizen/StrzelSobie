-- Database schema for Strzel Sobie MVP
-- Target: Cloudflare D1 (SQLite)

-- Users table: Stores information about all registered individuals.
CREATE TABLE users_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT, -- Nullable, for contact by coordinators/admins
    is_deleted INTEGER NOT NULL DEFAULT 0, -- Flag for soft deletes (0 = active, 1 = deleted)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User_Credentials table: Stores authentication credentials for users.
CREATE TABLE auth_user_credentials (
    user_id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE
);

-- Roles table: Defines the distinct roles available in the system.
-- A user's status as a "Guest" is determined by the absence of a "Member" or "Club/Community Administrator" role.
CREATE TABLE users_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE -- e.g., 'Member', 'Coordinator', 'Confirmator', 'Shooting Range Administrator', 'Club/Community Administrator'
);

-- User_Global_Roles table: For assigning roles that apply across the entire system (not specific to one range).
CREATE TABLE users_user_global_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES users_roles (id) ON DELETE CASCADE
);

-- User_Range_Roles table: For assigning roles that are scoped to a specific shooting range.
CREATE TABLE users_user_range_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id, range_id),
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES users_roles (id) ON DELETE CASCADE,
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id) ON DELETE CASCADE
);

-- Shooting_Ranges table: Defines the properties of a shooting range.
-- For MVP, this will contain a single entry for the Dobczyce range.
CREATE TABLE admin_shooting_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier, e.g., "dobczyce"
    display_name TEXT NOT NULL, -- Human-readable name, e.g., "Strzelnica Dobczyce"
    total_tracks INTEGER NOT NULL,
    operating_hours TEXT NOT NULL -- Stored as a JSON object, e.g., '{"monday": {"open": "09:00", "close": "17:00"}, ...}'
);

-- Propositions table: User-created requests for a shooting session.
CREATE TABLE reservations_propositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- e.g., 'open', 'converted', 'cancelled'
    event_date TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    start_time TEXT NOT NULL, -- Format: 'HH:MM'
    end_time TEXT NOT NULL, -- Format: 'HH:MM'
    num_participants INTEGER NOT NULL,
    tracks_requested INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id)
);

-- Reservations table: Confirmed bookings, either converted from propositions or created directly by coordinators.
CREATE TABLE reservations_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposition_id INTEGER, -- Null if created directly by a coordinator
    coordinator_id INTEGER NOT NULL, -- The user (with coordinator role) who confirmed/created the reservation
    range_id INTEGER NOT NULL,
    event_date TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    start_time TEXT NOT NULL, -- Format: 'HH:MM'
    end_time TEXT NOT NULL, -- Format: 'HH:MM'
    num_participants INTEGER NOT NULL,
    tracks_requested INTEGER NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0, -- Flag for visibility to Guests (0 = false, 1 = true)
    is_joinable INTEGER NOT NULL DEFAULT 0, -- Flag for visibility to Members (0 = false, 1 = true)
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposition_id) REFERENCES reservations_propositions (id),
    FOREIGN KEY (coordinator_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id)
);

-- Records table: Manual entries for bookings made outside the application, used for success metric tracking.
CREATE TABLE admin_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL, -- The admin who logged the record
    range_id INTEGER NOT NULL,
    event_date TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    start_time TEXT NOT NULL, -- Format: 'HH:MM'
    end_time TEXT NOT NULL, -- Format: 'HH:MM'
    num_participants INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id)
);

-- Audit_Logs table: A simple audit trail for key events in the system.
CREATE TABLE admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- The user who performed the action (can be null for system actions)
    action_type TEXT NOT NULL, -- e.g., 'RESERVATION_CREATE', 'PROPOSITION_ACCEPT'
    target_id INTEGER, -- The ID of the entity that was affected
    details TEXT, -- A JSON object with details about the event
    event_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id)
);

-- Indexes for performance.
-- The UNIQUE constraint on users_users(email) automatically creates an index for fast user lookup.
-- The composite indexes below are crucial for calendar performance, as queries will filter by range then by date.
CREATE INDEX idx_propositions_range_date ON reservations_propositions(range_id, event_date);
CREATE INDEX idx_reservations_range_date ON reservations_reservations(range_id, event_date);
CREATE INDEX idx_records_range_date ON admin_records(range_id, event_date);

-- Seed the roles table with initial data
INSERT INTO users_roles (name) VALUES
('Member'),
('Coordinator'),
('Confirmator'),
('Shooting Range Administrator'),
('Club/Community Administrator');