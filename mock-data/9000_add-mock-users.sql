-- Mock data for the Strzel Sobie application.

-- Passwords for all users are the username followed by "password".
-- For example, the password for "admin@example.com" is "adminpassword".

-- First, ensure there is a shooting range for range-specific roles.
INSERT OR IGNORE INTO ranges_shooting_ranges (id, slug, display_name, total_tracks, operating_hours)
VALUES (1, 'dobczyce', 'Strzelnica Dobczyce', 10, '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"}}');

-- =============================================================================
-- Users & Credentials
-- =============================================================================

-- 1. Admin User (Club/Community Administrator) - password: adminpassword
INSERT INTO users_users (id, email, phone_number) VALUES (1, 'admin@example.com', '111222333');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (1, '$2b$10$FU.WmIzyOoL.NzISIP2/d.87Ny.70117VDrog6t4I5jNY6sZH3TWy');

-- 2. Coordinator User (Coordinator and Shooting Range Administrator) - password: coordinatorpassword
INSERT INTO users_users (id, email, phone_number) VALUES (2, 'coordinator@example.com', '444555666');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (2, '$2b$10$pDxSbBFN7dac.JV.izN8keS3Q/VZmRiEJPY7r4NSA297LNW61LhIS');

-- 3. Member User - password: memberpassword
INSERT INTO users_users (id, email, phone_number) VALUES (3, 'member@example.com', '777888999');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (3, '$2b$10$8hgpbV6ipp0Hov/bbQK3duE7V61j2QB0JNhYMRYAiCSLknDSX3hTm');

-- 4. Guest User (just a basic user account) - password: guestpassword
INSERT INTO users_users (id, email, phone_number) VALUES (4, 'guest@example.com', NULL);
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (4, '$2b$10$ueJ8u2Mea4n8cP8mKQL6Cuk5je9FadxQKC6xLvI1aj2bJYpB/Fyh.');

-- =============================================================================
-- Role Assignments
-- =============================================================================

-- Assign 'Club/Community Administrator' (ID 6) to the admin user (ID 1).
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (1, 6), (1, 2), (1, 1);

-- Assign 'Coordinator' (ID 3) to the coordinator user (ID 2).
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (2, 3), (2, 2), (2, 1);

-- Assign 'Shooting Range Administrator' (ID 5) for range 1 to the coordinator user (ID 2).
-- INSERT INTO users_user_range_roles (user_id, role_id, range_id) VALUES (2, 5, 1);

-- Assign 'Member' (ID 2) to the member user (ID 3).
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (3, 2), (3, 1);

-- Assign 'Guest' (ID 1) to the guest user (ID 4).
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (4, 1);
