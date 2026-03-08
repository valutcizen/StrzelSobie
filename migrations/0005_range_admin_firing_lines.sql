-- Range administration flow schema update:
-- - firing lines with tracks_count (virtual tracks)
-- - reservation/proposition metadata-based track selection
-- - admin contact profiles
-- - event-to-firing-line mapping
-- - notifications module persistence ownership tables
-- - hard drop legacy reservation columns (tracks_requested, coordinator_id)

PRAGMA foreign_keys=OFF;

-- -----------------------------------------------------------------------------
-- Ranges: firing lines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ranges_firing_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    range_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    length_meters INTEGER NOT NULL DEFAULT 25,
    tracks_count INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id) ON DELETE CASCADE,
    CHECK (tracks_count >= 0),
    CHECK (length_meters > 0)
);

CREATE INDEX IF NOT EXISTS idx_ranges_firing_lines_range_sort
    ON ranges_firing_lines(range_id, sort_order);

-- Bootstrap one default firing line for ranges with tracks configured and no firing lines yet.
INSERT INTO ranges_firing_lines (range_id, name, length_meters, tracks_count, sort_order)
SELECT r.id, 'Line 1', 25, r.total_tracks, 1
FROM ranges_shooting_ranges r
WHERE r.total_tracks > 0
  AND NOT EXISTS (
    SELECT 1 FROM ranges_firing_lines fl WHERE fl.range_id = r.id
  );

-- -----------------------------------------------------------------------------
-- Reservations propositions rebuild
-- -----------------------------------------------------------------------------
ALTER TABLE reservations_propositions RENAME TO reservations_propositions_old;

CREATE TABLE reservations_propositions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    firing_line_id INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id),
    FOREIGN KEY (firing_line_id) REFERENCES ranges_firing_lines (id)
);

INSERT INTO reservations_propositions (
    id,
    user_id,
    range_id,
    status,
    event_date,
    start_time,
    end_time,
    firing_line_id,
    metadata_json,
    created_at
)
SELECT
    p.id,
    p.user_id,
    p.range_id,
    p.status,
    p.event_date,
    p.start_time,
    p.end_time,
    COALESCE(
      (SELECT fl.id FROM ranges_firing_lines fl WHERE fl.range_id = p.range_id ORDER BY fl.sort_order, fl.id LIMIT 1),
      (SELECT fl.id FROM ranges_firing_lines fl ORDER BY fl.id LIMIT 1)
    ) AS firing_line_id,
    '{}' AS metadata_json,
    p.created_at
FROM reservations_propositions_old p;

DROP TABLE reservations_propositions_old;

CREATE INDEX idx_propositions_range_date ON reservations_propositions(range_id, event_date);
CREATE INDEX idx_props_line_date_time ON reservations_propositions(firing_line_id, event_date, start_time, end_time);
CREATE INDEX idx_props_user_date ON reservations_propositions(user_id, event_date);
CREATE INDEX idx_props_status_line_date ON reservations_propositions(status, firing_line_id, event_date);

-- -----------------------------------------------------------------------------
-- Reservations confirmed rebuild
-- -----------------------------------------------------------------------------
ALTER TABLE reservations_reservations RENAME TO reservations_reservations_old;

CREATE TABLE reservations_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposition_id INTEGER,
    approved_by_admin_id INTEGER NULL,
    range_id INTEGER NOT NULL,
    event_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    firing_line_id INTEGER NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proposition_id) REFERENCES reservations_propositions (id),
    FOREIGN KEY (approved_by_admin_id) REFERENCES users_users (id),
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id),
    FOREIGN KEY (firing_line_id) REFERENCES ranges_firing_lines (id)
);

INSERT INTO reservations_reservations (
    id,
    proposition_id,
    approved_by_admin_id,
    range_id,
    event_date,
    start_time,
    end_time,
    firing_line_id,
    metadata_json,
    created_at
)
SELECT
    r.id,
    CASE
      WHEN lower(trim(CAST(r.proposition_id AS TEXT))) = 'null' THEN NULL
      ELSE r.proposition_id
    END AS proposition_id,
    r.coordinator_id AS approved_by_admin_id,
    r.range_id,
    r.event_date,
    r.start_time,
    r.end_time,
    COALESCE(
      (SELECT fl.id FROM ranges_firing_lines fl WHERE fl.range_id = r.range_id ORDER BY fl.sort_order, fl.id LIMIT 1),
      (SELECT fl.id FROM ranges_firing_lines fl ORDER BY fl.id LIMIT 1)
    ) AS firing_line_id,
    '{}' AS metadata_json,
    r.created_at
FROM reservations_reservations_old r;

DROP TABLE reservations_reservations_old;

CREATE INDEX idx_reservations_range_date ON reservations_reservations(range_id, event_date);
CREATE INDEX idx_res_line_date_time ON reservations_reservations(firing_line_id, event_date, start_time, end_time);
CREATE INDEX idx_res_prop_id ON reservations_reservations(proposition_id);

-- -----------------------------------------------------------------------------
-- Users: admin contact profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users_admin_contact_profiles (
    user_id INTEGER PRIMARY KEY,
    email TEXT,
    phone_number TEXT,
    display_name TEXT,
    is_hidden_globally INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users_admin_contact_profile_overrides (
    user_id INTEGER NOT NULL,
    range_id INTEGER NOT NULL,
    email TEXT,
    phone_number TEXT,
    display_name TEXT,
    is_hidden_in_range INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, range_id),
    FOREIGN KEY (user_id) REFERENCES users_users (id) ON DELETE CASCADE,
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_override_range_visible
    ON users_admin_contact_profile_overrides(range_id, is_hidden_in_range);

-- -----------------------------------------------------------------------------
-- Reservations: message templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservations_admin_message_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    range_id INTEGER NOT NULL,
    created_by_admin_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (range_id) REFERENCES ranges_shooting_ranges (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_admin_id) REFERENCES users_users (id)
);

CREATE INDEX IF NOT EXISTS idx_admin_templates_range_active
    ON reservations_admin_message_templates(range_id, is_active);

-- -----------------------------------------------------------------------------
-- Events: link to firing lines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events_event_firing_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    firing_line_id INTEGER NOT NULL,
    UNIQUE (event_id, firing_line_id),
    FOREIGN KEY (event_id) REFERENCES events_events (id) ON DELETE CASCADE,
    FOREIGN KEY (firing_line_id) REFERENCES ranges_firing_lines (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_event_lines_line
    ON events_event_firing_lines(firing_line_id);

-- -----------------------------------------------------------------------------
-- Notifications module persistence
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipient_user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT,
    expires_at TEXT,
    FOREIGN KEY (recipient_user_id) REFERENCES users_users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications_delivery_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    provider TEXT,
    status TEXT NOT NULL,
    error TEXT,
    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES notifications_messages (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient_status_time
    ON notifications_messages(recipient_user_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_channel_status_time
    ON notifications_messages(channel, status, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_attempt_message_time
    ON notifications_delivery_attempts(message_id, attempted_at);

PRAGMA foreign_keys=ON;
