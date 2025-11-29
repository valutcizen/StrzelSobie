-- Adds indexes to speed up user lookups while excluding soft-deleted records.
-- Supports:
--  - listing/filtering users by email with is_deleted = 0
--  - sorting/pagination on created_at for active users

CREATE INDEX idx_users_email_not_deleted ON users_users (is_deleted, email);
CREATE INDEX idx_users_created_not_deleted ON users_users (is_deleted, created_at, id);
