-- Update ranges_shooting_ranges to support multi-range types and booking capability flags.
-- This migration replaces the ranges table to add type, allows_reservations, descriptions, and geolocation.

PRAGMA foreign_keys=off;

CREATE TABLE ranges_shooting_ranges_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'club' CHECK (type IN ('club', 'ally', 'coming-soon')),
    allows_reservations INTEGER NOT NULL DEFAULT 1,
    public_description TEXT,
    member_description TEXT,
    latitude REAL NOT NULL DEFAULT 0.0,
    longitude REAL NOT NULL DEFAULT 0.0,
    operating_hours TEXT NOT NULL,
    total_tracks INTEGER,
    CHECK (
        (type = 'club' AND allows_reservations = 1)
        OR (type IN ('ally', 'coming-soon') AND allows_reservations = 0)
    )
);

-- Migrate existing data; legacy rows are treated as club ranges with default coordinates and empty descriptions.
INSERT INTO ranges_shooting_ranges_new (
    id,
    slug,
    display_name,
    type,
    allows_reservations,
    public_description,
    member_description,
    latitude,
    longitude,
    operating_hours,
    total_tracks
) SELECT
    id,
    slug,
    display_name,
    'club' AS type,
    1 AS allows_reservations,
    '' AS public_description,
    NULL AS member_description,
    0.0 AS latitude,
    0.0 AS longitude,
    operating_hours,
    total_tracks
FROM ranges_shooting_ranges;

DROP TABLE ranges_shooting_ranges;
ALTER TABLE ranges_shooting_ranges_new RENAME TO ranges_shooting_ranges;

PRAGMA foreign_keys=on;
