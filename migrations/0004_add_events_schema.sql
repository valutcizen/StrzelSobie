-- Add Events module tables and align reservations schema with events plan.

-- New table for events configuration and details.
CREATE TABLE events_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    range_id INTEGER NOT NULL,
    organizer_id INTEGER NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    audience TEXT NOT NULL,
    config TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id),
    FOREIGN KEY (organizer_id) REFERENCES users_users (id)
);

CREATE INDEX idx_events_range_date ON events_events(range_id, event_date);
CREATE INDEX idx_events_range_slug ON events_events(range_id, slug);

-- Join table for event signups.
CREATE TABLE events_signups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    guests_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events_events (id),
    FOREIGN KEY (user_id) REFERENCES users_users (id)
);

-- Rebuild reservations_reservations to remove public/joinable fields and participants count.
PRAGMA foreign_keys=OFF;

ALTER TABLE reservations_propositions RENAME TO reservations_propositions_old;

CREATE TABLE reservations_propositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    tracks_requested INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id)
);

INSERT INTO reservations_propositions (
    id,
    user_id,
    range_id,
    status,
    event_date,
    start_time,
    end_time,
    tracks_requested,
    created_at
)
SELECT
    id,
    user_id,
    range_id,
    status,
    event_date,
    start_time,
    end_time,
    tracks_requested,
    created_at
FROM reservations_propositions_old;

DROP TABLE reservations_propositions_old;

CREATE INDEX idx_propositions_range_date ON reservations_propositions(range_id, event_date);

ALTER TABLE reservations_reservations RENAME TO reservations_reservations_old;

CREATE TABLE reservations_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposition_id INTEGER,
    coordinator_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    tracks_requested INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposition_id) REFERENCES reservations_propositions (id),
    FOREIGN KEY (coordinator_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id)
);

INSERT INTO reservations_reservations (
    id,
    proposition_id,
    coordinator_id,
    range_id,
    event_date,
    start_time,
    end_time,
    tracks_requested,
    created_at
)
SELECT
    id,
    proposition_id,
    coordinator_id,
    range_id,
    event_date,
    start_time,
    end_time,
    tracks_requested,
    created_at
FROM reservations_reservations_old;

DROP TABLE reservations_reservations_old;

CREATE INDEX idx_reservations_range_date ON reservations_reservations(range_id, event_date);

PRAGMA foreign_keys=ON;
