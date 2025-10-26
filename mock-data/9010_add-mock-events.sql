-- Mock reservations and propositions for calendar testing.
-- Assumes users and range from 9000_add-mock-users.sql exist.

-- Proposition created by the member user, still awaiting coordinator action.
INSERT INTO reservations_propositions (
  id,
  user_id,
  range_id,
  status,
  event_date,
  start_time,
  end_time,
  num_participants,
  tracks_requested
) VALUES (
  101,
  3,
  1,
  'open',
  '2025-10-10',
  '10:00',
  '11:30',
  3,
  2
);

-- Public reservation created directly by the coordinator.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  coordinator_id,
  range_id,
  event_date,
  start_time,
  end_time,
  num_participants,
  tracks_requested,
  is_public,
  is_joinable
) VALUES (
  201,
  NULL,
  2,
  1,
  '2025-10-10',
  '12:00',
  '13:30',
  4,
  3,
  1,
  1
);

-- Private reservation that should be visible but without details to guests.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  coordinator_id,
  range_id,
  event_date,
  start_time,
  end_time,
  num_participants,
  tracks_requested,
  is_public,
  is_joinable
) VALUES (
  202,
  NULL,
  2,
  1,
  '2025-10-11',
  '09:00',
  '10:30',
  5,
  4,
  0,
  0
);
