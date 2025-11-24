-- Mock shooting ranges (club, ally, coming-soon) for local testing.

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
  total_tracks
) VALUES (
    1,
    'strzel-sobie-krakow',
    'Strzel Sobie Kraków',
    'club',
    1,
    'Główna strzelnica klubowa. Zapraszamy wszystkich członków i gości. Pełna oferta i dostępność w kalendarzu.',
    'Dla członków klubu dostępne są dodatkowe rabaty i rezerwacje na wyłączność. Skontaktuj się z koordynatorem.',
    50.0519,
    19.9232,
    '{
      "monday": {"open": "10:00", "close": "20:00"},
      "tuesday": {"open": "10:00", "close": "20:00"},
      "wednesday": {"open": "10:00", "close": "20:00"},
      "thursday": {"open": "10:00", "close": "20:00"},
      "friday": {"open": "10:00", "close": "22:00"},
      "saturday": {"open": "09:00", "close": "22:00"},
      "sunday": {"open": "09:00", "close": "20:00"}
    }',
    10
  ), (
    2,
    'ally-krakow',
    'Allies Range Kraków',
    'ally',
    0,
    'Partnerska strzelnica, informacje kontaktowe i godziny otwarcia.',
    'Notatki dla członków klubu o zasadach współpracy.',
    50.0647,
    19.9450,
    '{
      "monday": {"open": "09:00", "close": "18:00"},
      "tuesday": {"open": "09:00", "close": "18:00"},
      "wednesday": {"open": "09:00", "close": "18:00"},
      "thursday": {"open": "09:00", "close": "18:00"},
      "friday": {"open": "09:00", "close": "18:00"},
      "saturday": {"open": "09:00", "close": "16:00"},
      "sunday": null
    }',
    5
  ), (
    3,
    'coming-soon-podhale',
    'Strzelnica Podhale (wkrótce)',
    'coming-soon',
    0,
    'Nowa lokalizacja w trakcie przygotowań. Śledź aktualizacje.',
    'Planowane zasady korzystania dla członków.',
    49.4830,
    20.0262,
    '{}',
    NULL
  );
