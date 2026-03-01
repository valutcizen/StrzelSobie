import { ShootingRange } from './model';

/**
 * DTO for a shooting range summary.
 * Corresponds to an item in the response payload for `GET /api/v1/ranges`.
 * Maps `display_name` to `displayName`.
 */
export type RangeSummaryDto = {
  id: ShootingRange['id'];
  slug: ShootingRange['slug'];
  displayName: ShootingRange['display_name'];
  type: ShootingRange['type'];
  allowsReservations: boolean;
  latitude?: ShootingRange['latitude'] | null;
  longitude?: ShootingRange['longitude'] | null;
  extras?: RangeExtras;
};

/**
 * Represents the structure of operating hours for a range.
 */
export type OperatingHours = {
  [day: string]: { open: string; close: string } | null;
};

export type RangeParkingLocation = {
  latitude: ShootingRange['latitude'];
  longitude: ShootingRange['longitude'];
};

export type RangeExtras = {
  parkingLocation?: RangeParkingLocation | null;
  allowMemberEvents?: boolean;
  mapLogoUrl?: string | null;
  voivodeship?: string | null;
  address?: string | null;
  phone?: string | null;
  details?: string | null;
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
  type: ShootingRange['type'];
  allowsReservations: boolean;
  isDeleted?: boolean;
  publicDescription?: ShootingRange['public_description'] | null;
  memberDescription?: ShootingRange['member_description'] | null;
  latitude?: ShootingRange['latitude'] | null;
  longitude?: ShootingRange['longitude'] | null;
  totalTracks: ShootingRange['total_tracks'];
  operatingHours: OperatingHours;
  extras: RangeExtras;
  parkingLocation: RangeParkingLocation | null;
};

export type RangeListResponseDto = RangeSummaryDto[];


/**
 * Command model for updating a shooting range.
 * Corresponds to the request payload for `PATCH /api/v1/ranges/{rangeSlug}`.
 */
export type UpdateRangeCommand = Partial<
  Pick<
    RangeDetailsDto,
    | 'displayName'
    | 'type'
    | 'allowsReservations'
    | 'publicDescription'
    | 'memberDescription'
    | 'totalTracks'
    | 'operatingHours'
    | 'latitude'
    | 'longitude'
    | 'parkingLocation'
  >
> & {
  allowMemberEvents?: boolean;
  mapLogoUrl?: string | null;
  voivodeship?: string | null;
};

/**
 * Command model for creating a shooting range.
 * Corresponds to the request payload for `POST /api/v1/ranges`.
 */
export type CreateRangeCommand = {
  slug: ShootingRange['slug'];
  displayName?: ShootingRange['display_name'];
  type?: ShootingRange['type'];
  allowsReservations?: boolean;
  publicDescription?: ShootingRange['public_description'] | null;
  memberDescription?: ShootingRange['member_description'] | null;
  latitude?: ShootingRange['latitude'];
  longitude?: ShootingRange['longitude'];
  totalTracks?: ShootingRange['total_tracks'] | null;
  operatingHours?: OperatingHours;
  mapLogoUrl?: string | null;
  voivodeship?: string | null;
};
