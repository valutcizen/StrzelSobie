import type { RangeType } from '@strzel-sobie/common';

export type ShootingRange = {
  id: number;
  slug: string;
  type: RangeType;
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

export type FiringLine = {
  id: number;
  rangeId: number;
  name: string;
  tracksCount: number;
  lengthMeters: number | null;
  sortOrder: number;
};
