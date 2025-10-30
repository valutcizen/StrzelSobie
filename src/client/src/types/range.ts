export interface OperatingHoursEntry {
  open: string
  close: string
}

export type OperatingHours = Record<string, OperatingHoursEntry | null>

export interface RangeSummary {
  id: number
  slug: string
  displayName: string
}

export interface RangeDetails extends RangeSummary {
  totalTracks: number
  operatingHours: OperatingHours
}

export type UpdateRangePayload = Partial<Pick<RangeDetails, 'totalTracks' | 'operatingHours'>>
