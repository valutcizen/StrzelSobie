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
  tracks_requested
) VALUES (
  101,
  3,
  1,
  'open',
  '2025-10-10',
  '10:00',
  '11:30',
  2
);

-- Reservation created directly by the coordinator.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  coordinator_id,
  range_id,
  event_date,
  start_time,
  end_time,
  tracks_requested
) VALUES (
  201,
  NULL,
  2,
  1,
  '2025-10-10',
  '12:00',
  '13:30',
  3
);

-- Reservation that should be visible but without details to guests.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  coordinator_id,
  range_id,
  event_date,
  start_time,
  end_time,
  tracks_requested
) VALUES (
  202,
  NULL,
  2,
  1,
  '2025-10-11',
  '09:00',
  '10:30',
  4
);

-- Guest proposition waiting for review.
INSERT INTO reservations_propositions (
  id,
  user_id,
  range_id,
  status,
  event_date,
  start_time,
  end_time,
  tracks_requested
) VALUES (
  102,
  4,
  1,
  'open',
  '2025-10-12',
  '15:00',
  '16:30',
  1
);

-- Reservation that still blocks time on the calendar.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  coordinator_id,
  range_id,
  event_date,
  start_time,
  end_time,
  tracks_requested
) VALUES (
  203,
  NULL,
  2,
  1,
  '2025-10-12',
  '17:00',
  '18:30',
  2
);
