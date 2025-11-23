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
      8  (
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
      "sunday": {"open": "closed", "close": "closed"}
    }',
    NULL
  ),
  (
    3,
    'coming-soon-podhale',
    'Strzelnica Podhale (wkrótce)',
    'coming-soon',
    0,
    'Nowa lokalizacja w trakcie przygotowań. Śledź aktualizacje.',
    'Planowane zasady korzystania dla członków.',
    49.4830,
    20.0262,
    '{
      "monday": {"open": "closed", "close": "closed"},
      "tuesday": {"open": "closed", "close": "closed"},
      "wednesday": {"open": "closed", "close": "closed"},
      "thursday": {"open": "closed", "close": "closed"},
      "friday": {"open": "closed", "close": "closed"},
      "saturday": {"open": "closed", "close": "closed"},
      "sunday": {"open": "closed", "close": "closed"}
    }',
    NULL
  );
