
-- =============================================================================
-- E2E Testing Mock Data for Strzel Sobie
--
-- Passwords for all users are the username followed by "password".
-- Example: password for "admin@e2e.com" is "adminpassword".
-- =============================================================================

PRAGMA foreign_keys = OFF;

DELETE FROM reservations_propositions;
DELETE FROM reservations_reservations;
DELETE FROM reservations_records;
DELETE FROM events_signups;
DELETE FROM events_events;
DELETE FROM users_user_global_roles;
DELETE FROM users_user_range_roles;
DELETE FROM auth_user_credentials;
DELETE FROM audit_logs;
DELETE FROM users_users;
DELETE FROM ranges_shooting_ranges;

PRAGMA foreign_keys = ON;

-- =============================================================================
-- Ranges
-- =============================================================================
INSERT INTO ranges_shooting_ranges (
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
  total_tracks,
  extras
) VALUES
  (
    99,
    'dobczyce',
    'E2E Test Range',
    'club',
    1,
    'E2E test club range with active reservations.',
    'Member-only notes for E2E tests.',
    49.8805,
    20.0906,
    '{"monday":{"open":"10:00","close":"18:00"},"tuesday":{"open":"10:00","close":"18:00"},"wednesday":{"open":"10:00","close":"18:00"},"thursday":{"open":"10:00","close":"18:00"},"friday":{"open":"10:00","close":"18:00"}}',
    8,
    '{}'
  ),
  (
    100,
    'ally-e2e',
    'E2E Ally Range',
    'ally',
    0,
    'Information-only ally range for E2E coverage.',
    'Member-only notes for ally range behavior.',
    50.0647,
    19.945,
    '{"monday":{"open":"09:00","close":"17:00"},"tuesday":{"open":"09:00","close":"17:00"},"wednesday":{"open":"09:00","close":"17:00"},"thursday":{"open":"09:00","close":"17:00"},"friday":{"open":"09:00","close":"17:00"}}',
    0,
    '{}'
  ),
  (
    101,
    'coming-soon-e2e',
    'E2E Coming-Soon Range',
    'coming-soon',
    0,
    'Planned location for coming-soon E2E coverage.',
    'Member-only notes for coming-soon behavior.',
    49.483,
    20.0262,
    '{"monday":{"open":"closed","close":"closed"},"tuesday":{"open":"closed","close":"closed"},"wednesday":{"open":"closed","close":"closed"},"thursday":{"open":"closed","close":"closed"},"friday":{"open":"closed","close":"closed"}}',
    0,
    '{}'
  ),
  (
    102,
    'meetup-e2e',
    'E2E Meetup Range',
    'meetup',
    0,
    'Event-focused range for meetup E2E coverage.',
    'Member-only notes for meetup range behavior.',
    49.9888,
    19.888,
    '{"monday":{"open":"12:00","close":"20:00"},"tuesday":{"open":"12:00","close":"20:00"},"wednesday":{"open":"12:00","close":"20:00"},"thursday":{"open":"12:00","close":"20:00"},"friday":{"open":"12:00","close":"20:00"}}',
    0,
    '{"allowMemberEvents":true}'
  );

-- =============================================================================
-- Users & Credentials
-- All passwords are the username + "password", e.g., "adminpassword"
-- =============================================================================

-- ID 901: Admin User (Club/Community Administrator)
INSERT INTO users_users (id, email, phone_number) VALUES (901, 'admin@e2e.com', '101101101');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (901, '$2b$10$nGdCgGvBZ.KGm3lpEvez1uj7ONNkmPrzlecsqxyxvLwIJ7xF1AKjC');

-- ID 902: Coordinator User
INSERT INTO users_users (id, email, phone_number) VALUES (902, 'coordinator@e2e.com', '202202202');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (902, '$2b$10$dk8/oRKg0MVeWIoOqL7fmOcUDLhQK4Nov2Sa5BtnaRuTNSD5P3G.G');

-- ID 903: Member User
INSERT INTO users_users (id, email, phone_number) VALUES (903, 'member@e2e.com', '303303303');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (903, '$2b$10$9g7nT/ywabMtmKX58eMt5.maizMa/8lUGyAuF6NAUHlnCQwzRRhBy');

-- ID 904: Guest User
INSERT INTO users_users (id, email, phone_number) VALUES (904, 'guest@e2e.com', '404404404');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (904, '$2b$10$6DsXq1B2JZoDikzlwpAZeeaY9lnH0HXmkrPDkM8iA2AGP.kOLNKge');

-- ID 905: Confirmator User
INSERT INTO users_users (id, email, phone_number) VALUES (905, 'confirmator@e2e.com', '505505505');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (905, '$2b$10$FavGsynIfRyodRTUmjF7EORBSfga.FSNhiBgd/YwAhAkRjmEdJXn2');

-- ID 906: Shooting Range Administrator User
INSERT INTO users_users (id, email, phone_number) VALUES (906, 'rangeadmin@e2e.com', '606606606');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (906, '$2b$10$3V4G0h39dxY1ctANIJj5u.YPFSw9rvzLGrveuN8lcRiO0XS1CO9gu');

-- ID 907: A guest user to be promoted by the Confirmator
INSERT INTO users_users (id, email, phone_number) VALUES (907, 'user-to-be-promoted@e2e.com', '707707707');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (907, '$2b$10$n153T9xZ45QMhCrZpFJ3ou90V3Ge8D.VkTyFUmjUms6vN1kUnlpfm');

-- ID 908: Standard member for login/logout e2e scenario
INSERT INTO users_users (id, email, phone_number) VALUES (908, 'standard-user@e2e.com', '808808808');
INSERT INTO auth_user_credentials (user_id, password_hash) VALUES (908, '$2b$10$OuM9wtYDVy4Mnhw.IweP7Obu1tc.qSDv6KkaKsNrbcfjbBXpnB/L6');


-- =============================================================================
-- Role Assignments
-- =============================================================================

-- Roles are: 1=Guest, 2=Member, 3=Coordinator, 4=Confirmator, 5=RangeAdmin, 6=ClubAdmin

-- User 901: admin@e2e.com -> Club/Community Administrator
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (901, 6);

-- User 902: coordinator@e2e.com -> Coordinator (and Member, Guest)
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (902, 3), (902, 2), (902, 1);

-- User 903: member@e2e.com -> Member (and Guest)
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (903, 2), (903, 1);

-- User 904: guest@e2e.com -> Guest
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (904, 1);

-- User 905: confirmator@e2e.com -> Confirmator
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (905, 4);

-- User 906: rangeadmin@e2e.com -> Shooting Range Administrator for the E2E range
INSERT INTO users_user_range_roles (user_id, role_id, range_id) VALUES (906, 5, 99);

-- User 907: user-to-be-promoted@e2e.com -> Guest
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (907, 1);

-- User 908: standard-user@e2e.com -> Member (and Guest)
INSERT INTO users_user_global_roles (user_id, role_id) VALUES (908, 2), (908, 1);

-- =============================================================================
-- Propositions & Reservations
-- =============================================================================

-- Proposition from a member (903) - for testing highlighting and acceptance
INSERT INTO reservations_propositions (id, user_id, range_id, status, event_date, start_time, end_time, tracks_requested)
VALUES (1001, 903, 99, 'open', '2025-11-10', '12:00', '13:00', 2);

-- Proposition from a guest (904) - for testing basic acceptance
INSERT INTO reservations_propositions (id, user_id, range_id, status, event_date, start_time, end_time, tracks_requested)
VALUES (1002, 904, 99, 'open', '2025-11-11', '14:00', '15:00', 1);

-- A confirmed reservation for calendar checks
INSERT INTO reservations_reservations (id, coordinator_id, range_id, event_date, start_time, end_time, tracks_requested)
VALUES (2001, 902, 99, '2025-11-12', '10:00', '12:00', 3);

-- A confirmed reservation for calendar checks
INSERT INTO reservations_reservations (id, coordinator_id, range_id, event_date, start_time, end_time, tracks_requested)
VALUES (2002, 902, 99, '2025-11-13', '11:00', '12:30', 2);

-- A confirmed reservation for calendar checks
INSERT INTO reservations_reservations (id, coordinator_id, range_id, event_date, start_time, end_time, tracks_requested)
VALUES (2003, 902, 99, '2025-11-14', '16:00', '17:00', 1);

-- =============================================================================
-- Events
-- =============================================================================
INSERT INTO events_events (
  id,
  range_id,
  organizer_id,
  slug,
  name,
  event_date,
  start_time,
  end_time,
  status,
  audience,
  config
) VALUES
  (
    3001,
    99,
    901,
    'e2e-open-training',
    'E2E Open Training',
    '2025-11-15',
    '10:00',
    '12:00',
    'active',
    'public',
    '{"public_description":"Open training session for E2E tests.","member_description":"Member-only prep notes for E2E tests.","registration_type":"registration_required","capacity_type":"unlimited","capacity_limit":null,"guest_policy":null,"waitlist_limit":null,"registration_deadline":null}'
  ),
  (
    3002,
    99,
    906,
    'e2e-members-only-clinic',
    'E2E Members Only Clinic',
    '2025-11-16',
    '15:00',
    '16:30',
    'active',
    'members_only',
    '{"public_description":"Members-only clinic for E2E waitlist coverage.","member_description":"Bring your club card.","registration_type":"registration_required","capacity_type":"limited","capacity_limit":2,"guest_policy":"guests_allowed","waitlist_limit":3,"registration_deadline":null}'
  ),
  (
    3003,
    99,
    901,
    'e2e-closed-registration',
    'E2E Registration Closed',
    '2025-11-20',
    '09:00',
    '10:00',
    'active',
    'public',
    '{"public_description":"Registration is closed for this E2E event.","member_description":null,"registration_type":"registration_required","capacity_type":"unlimited","capacity_limit":null,"guest_policy":null,"waitlist_limit":null,"registration_deadline":"2020-01-01T00:00:00Z"}'
  ),
  (
    3004,
    99,
    901,
    'e2e-admin-workshop',
    'E2E Organizer Workshop',
    '2025-11-18',
    '12:00',
    '13:30',
    'active',
    'members_only',
    '{"public_description":"Workshop for organizers and admins.","member_description":"Schedule notes for organizers.","registration_type":"registration_required","capacity_type":"limited","capacity_limit":5,"guest_policy":"no_guests","waitlist_limit":2,"registration_deadline":null}'
  ),
  (
    3101,
    102,
    901,
    'e2e-meetup-hangout',
    'E2E Meetup Hangout',
    '2025-11-22',
    '18:00',
    '20:00',
    'active',
    'public',
    '{"public_description":"Meetup event listing for E2E coverage.","member_description":null,"registration_type":"registration_required","capacity_type":"unlimited","capacity_limit":null,"guest_policy":null,"waitlist_limit":null,"registration_deadline":null}'
  );

INSERT INTO events_signups (id, event_id, user_id, status, guests_count) VALUES
  (4001, 3002, 902, 'confirmed', 0),
  (4002, 3002, 908, 'confirmed', 0),
  (4003, 3004, 903, 'confirmed', 1),
  (4004, 3004, 906, 'confirmed', 0),
  (4005, 3004, 902, 'waitlisted', 0);
