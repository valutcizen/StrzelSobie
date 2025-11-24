-- Update ranges_shooting_ranges to support multi-range types and booking capability flags.
-- This migration adds new columns to the ranges table using ALTER TABLE to avoid recreating tables.

-- Add new columns with default values.
-- SQLite automatically populates existing rows with the default value.
ALTER TABLE ranges_shooting_ranges ADD COLUMN type TEXT NOT NULL DEFAULT 'club';
ALTER TABLE ranges_shooting_ranges ADD COLUMN allows_reservations INTEGER NOT NULL DEFAULT 1;
ALTER TABLE ranges_shooting_ranges ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE ranges_shooting_ranges ADD COLUMN public_description TEXT;
ALTER TABLE ranges_shooting_ranges ADD COLUMN member_description TEXT;
ALTER TABLE ranges_shooting_ranges ADD COLUMN latitude REAL;
ALTER TABLE ranges_shooting_ranges ADD COLUMN longitude REAL;

-- Indexes to support API lookups (detail and directory/map) while filtering soft-deleted ranges.
-- These indexes are new and were part of the original migration plan.
CREATE INDEX idx_ranges_slug_not_deleted ON ranges_shooting_ranges (is_deleted, slug);
CREATE INDEX idx_ranges_type_not_deleted ON ranges_shooting_ranges (is_deleted, type, id);
