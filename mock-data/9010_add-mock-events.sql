-- Mock reservations and propositions for calendar testing.
-- Assumes users/ranges from 9000_add-mock-users.sql and 8990_add-mock-ranges.sql exist.

-- Proposition created by the member user, still awaiting admin action.
INSERT INTO reservations_propositions (
  id,
  user_id,
  range_id,
  status,
  event_date,
  start_time,
  end_time,
  firing_line_id,
  metadata_json
) VALUES (
  101,
  3,
  1,
  'open',
  '2025-10-10',
  '10:00',
  '11:30',
  101,
  '{"hasCoordinatorLicenseInGroup":true,"trackNos":[1,2]}'
);

-- Reservation created directly by range admin.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  approved_by_admin_id,
  range_id,
  event_date,
  start_time,
  end_time,
  firing_line_id,
  metadata_json
) VALUES (
  201,
  NULL,
  2,
  1,
  '2025-10-10',
  '12:00',
  '13:30',
  101,
  '{"trackNos":[1,2,3]}'
);

-- Reservation that should be visible but without details to guests.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  approved_by_admin_id,
  range_id,
  event_date,
  start_time,
  end_time,
  firing_line_id,
  metadata_json
) VALUES (
  202,
  NULL,
  2,
  1,
  '2025-10-11',
  '09:00',
  '10:30',
  102,
  '{"trackNos":[1,2,3,4]}'
);

-- Second member proposition waiting for review.
INSERT INTO reservations_propositions (
  id,
  user_id,
  range_id,
  status,
  event_date,
  start_time,
  end_time,
  firing_line_id,
  metadata_json
) VALUES (
  102,
  3,
  1,
  'open',
  '2025-10-12',
  '15:00',
  '16:30',
  103,
  '{"hasCoordinatorLicenseInGroup":false,"trackNos":[1]}'
);

-- Reservation that still blocks time on the calendar.
INSERT INTO reservations_reservations (
  id,
  proposition_id,
  approved_by_admin_id,
  range_id,
  event_date,
  start_time,
  end_time,
  firing_line_id,
  metadata_json
) VALUES (
  203,
  NULL,
  2,
  1,
  '2025-10-12',
  '17:00',
  '18:30',
  101,
  '{"trackNos":[2,3]}'
);
