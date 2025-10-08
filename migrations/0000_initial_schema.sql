-- Strzel Sobie Database Schema
-- Version: 1.0
-- Target: Cloudflare D1 (SQLite)
--
-- This schema defines the tables, relationships, and indexes for the Strzel Sobie MVP.
-- It is designed to be modular, with table names prefixed by the owning module
-- (e.g., `users_`, `auth_`, `reservations_`, `admin_`).

-- =============================================================================
-- Module: users
-- =============================================================================

-- Stores core information about all registered users.
CREATE TABLE users_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT, -- Optional, for contact by coordinators/admins.
    is_deleted INTEGER NOT NULL DEFAULT 0, -- Soft delete flag: 0 = active, 1 = deleted.
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Defines all possible user roles within the system.
-- This table is pre-populated with initial data (see bottom of file).
CREATE TABLE users_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE -- e.g., 'Member', 'Coordinator', 'Shooting Range Administrator'.
);

-- Assigns system-wide (global) roles to users.
CREATE TABLE users_user_global_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    -- When a user is deleted, their global roles are also deleted.
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE,
    -- When a role is deleted, assignments of that role are also deleted.
    FOREIGN KEY (role_id) REFERENCES users_roles (id) ON DELETE CASCADE
);

-- Assigns range-specific roles to users.
CREATE TABLE users_user_range_roles (
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, role_id, range_id),
    -- When a user is deleted, their range-specific roles are also deleted.
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE,
    -- When a role is deleted, assignments of that role are also deleted.
    FOREIGN KEY (role_id) REFERENCES users_roles (id) ON DELETE CASCADE,
    -- When a shooting range is deleted, roles specific to that range are also deleted.
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id) ON DELETE CASCADE
);

-- =============================================================================
-- Module: auth
-- =============================================================================

-- Stores password hashes for user authentication.
CREATE TABLE auth_user_credentials (
    user_id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL,
    -- Establishes a one-to-one relationship with users_users.
    -- Deleting a user will delete their credentials.
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE
);

-- =============================================================================
-- Module: admin
-- =============================================================================

-- Stores details about the shooting ranges.
CREATE TABLE admin_shooting_ranges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier, e.g., "dobczyce".
    display_name TEXT NOT NULL, -- Human-readable name, e.g., "Strzelnica Dobczyce".
    total_tracks INTEGER NOT NULL,
    -- Stores opening hours as a JSON object.
    operating_hours TEXT NOT NULL -- e.g., '{"monday": {"open": "09:00", "close": "17:00"}, ...}'
);

-- Manual entries for off-system bookings, used for tracking metrics.
CREATE TABLE admin_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL, -- The administrator who logged the record.
    range_id INTEGER NOT NULL,
    event_date TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    start_time TEXT NOT NULL, -- Format: 'HH:MM'
    end_time TEXT NOT NULL, -- Format: 'HH:MM'
    num_participants INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id)
);

-- A simple audit trail for logging key events in the system.
CREATE TABLE admin_audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER, -- The user who performed the action (NULL for system actions).
    action_type TEXT NOT NULL, -- e.g., 'RESERVATION_CREATE', 'PROPOSITION_ACCEPT'.
    target_id INTEGER, -- The ID of the entity that was affected.
    details TEXT, -- A JSON object with details about the event.
    event_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id)
);

-- =============================================================================
-- Module: reservations
-- =============================================================================

-- User-created requests for a shooting session, awaiting confirmation.
CREATE TABLE reservations_propositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    status TEXT NOT NULL, -- e.g., 'open', 'converted', 'cancelled'.
    event_date TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    start_time TEXT NOT NULL, -- Format: 'HH:MM'
    end_time TEXT NOT NULL, -- Format: 'HH:MM'
    num_participants INTEGER NOT NULL,
    tracks_requested INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id)
);

-- Confirmed bookings, created from propositions or directly by coordinators.
CREATE TABLE reservations_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposition_id INTEGER, -- NULL if created directly by a coordinator.
    coordinator_id INTEGER NOT NULL, -- The user who confirmed/created the reservation.
    range_id INTEGER NOT NULL,
    event_date TEXT NOT NULL, -- Format: 'YYYY-MM-DD'
    start_time TEXT NOT NULL, -- Format: 'HH:MM'
    end_time TEXT NOT NULL, -- Format: 'HH:MM'
    num_participants INTEGER NOT NULL,
    tracks_requested INTEGER NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 0, -- 1 if visible to Guests, 0 otherwise.
    is_joinable INTEGER NOT NULL DEFAULT 0, -- 1 if Members can join, 0 otherwise.
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposition_id) REFERENCES reservations_propositions (id),
    FOREIGN KEY (coordinator_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES admin_shooting_ranges (id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Composite indexes to optimize calendar performance by filtering by range and then date.
CREATE INDEX idx_propositions_range_date ON reservations_propositions(range_id, event_date);
CREATE INDEX idx_reservations_range_date ON reservations_reservations(range_id, event_date);
CREATE INDEX idx_records_range_date ON admin_records(range_id, event_date);

-- =============================================================================
-- Data Seeding
-- =============================================================================

-- Pre-populates the roles table with the initial set of system roles.
INSERT INTO users_roles (name) VALUES
('Member'),
('Coordinator'),
('Confirmator'),
('Shooting Range Administrator'),
('Club/Community Administrator');
