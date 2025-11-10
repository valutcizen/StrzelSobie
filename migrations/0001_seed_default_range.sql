-- Seed default 'dobczyce' shooting range for MVP.
-- This migration creates the initial range required for the application to function.

INSERT INTO ranges_shooting_ranges (slug, display_name, total_tracks, operating_hours) VALUES
('dobczyce', 'Strzelnica Dobczyce', 2, '{
  "monday": {"open": "06:00", "close": "22:00"},
  "tuesday": {"open": "06:00", "close": "22:00"},
  "wednesday": {"open": "06:00", "close": "22:00"},
  "thursday": {"open": "06:00", "close": "22:00"},
  "friday": {"open": "06:00", "close": "22:00"},
  "saturday": {"open": "06:00", "close": "22:00"},
  "sunday": {"open": "06:00", "close": "22:00"}
}');
