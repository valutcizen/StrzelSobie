-- Add flexible extras column for shooting ranges to store JSON data such as parking locations.
ALTER TABLE ranges_shooting_ranges ADD COLUMN extras TEXT NOT NULL DEFAULT '{}';
