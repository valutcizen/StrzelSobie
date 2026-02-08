export type ShootingRange = {
  id: number;
  slug: string;
  type: 'club' | 'ally' | 'coming-soon' | 'meetup';
  allowsReservations: boolean;
  isDeleted: boolean;
  publicDescription?: string | null;
  memberDescription?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  displayName: string;
  totalTracks: number | null;
  operatingHours: string; // JSON string
  extras?: string | null;
};

export type ShootingRangeSummary = Pick<
  ShootingRange,
  'id' | 'slug' | 'type' | 'allowsReservations' | 'latitude' | 'longitude' | 'displayName' | 'extras'
>;
