export type ShootingRange = {
  id: number;
  slug: string;
  type: 'club' | 'ally' | 'coming-soon';
  allowsReservations: boolean;
  publicDescription?: string | null;
  memberDescription?: string | null;
  latitude?: number;
  longitude?: number;
  displayName: string;
  totalTracks: number | null;
  operatingHours: string; // JSON string
};
