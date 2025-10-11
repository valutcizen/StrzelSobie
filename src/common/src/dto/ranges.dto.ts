import { ShootingRange } from '../models/admin.models';

/**
 * DTO for a shooting range summary.
 * Corresponds to an item in the response payload for `GET /api/v1/ranges`.
 * Maps `display_name` to `displayName`.
 */
export type RangeSummaryDto = {
  id: ShootingRange['id'];
  slug: ShootingRange['slug'];
  displayName: ShootingRange['display_name'];
};

/**
 * Represents the structure of operating hours for a range.
 */
export type OperatingHours = {
  [day: string]: { open: string; close: string } | null;
};

/**
 * DTO for detailed shooting range information.
 * Corresponds to the response payload for `GET /api/v1/ranges/{rangeSlug}`.
 * Maps entity properties to camelCase and parses `operating_hours` from JSON string.
 */
export type RangeDetailsDto = {
  id: ShootingRange['id'];
  slug: ShootingRange['slug'];
  displayName: ShootingRange['display_name'];
  totalTracks: ShootingRange['total_tracks'];
  operatingHours: OperatingHours;
};

/**
 * Command model for updating a shooting range.
 * Corresponds to the request payload for `PATCH /api/v1/ranges/{rangeSlug}`.
 */
export type UpdateRangeCommand = Partial<Pick<RangeDetailsDto, 'totalTracks' | 'operatingHours'>>;
