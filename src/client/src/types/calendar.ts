import type { CalendarEventsDto } from '@strzel-sobie/common'

export type CalendarEventAudience = CalendarEventsDto['events'][number]['audience']

export type RangeEventType = 'proposition' | 'reservation' | 'record' | 'event'

export interface RangeEventMeta {
  propositionId?: number | null
  reservationId?: number
  firingLineId?: number | null
  trackNos?: number[]
  isMember?: boolean
  hasCoordinatorLicenseInGroup?: boolean
  approvedByAdminId?: number | null
  numParticipants?: number | null
  linkedProposition?: PropositionEventDetail | null
  adminId?: number | null
  createdAt?: string | null
  eventSlug?: string
  audience?: CalendarEventAudience
}

export interface RangeEvent {
  id: string
  sourceId: number
  title: string
  type: RangeEventType
  start: string
  end: string
  allDay?: boolean
  meta?: RangeEventMeta
}

export interface PersonSummary {
  id: number | null
  email?: string | null
  phoneNumber?: string | null
  displayName?: string | null
}

export interface PropositionEventDetail {
  type: 'proposition'
  propositionId: number
  firingLineId: number | null
  trackNos: number[]
  hasCoordinatorLicenseInGroup: boolean | null
  status: 'open' | 'converted' | 'cancelled' | null
  createdAt: string | null
  requester: PersonSummary | null
  notes?: string | null
}

export interface ReservationEventDetail {
  type: 'reservation'
  reservationId: number
  propositionId: number | null
  proposition: PropositionEventDetail | null
  firingLineId: number | null
  trackNos: number[]
  createdAt: string | null
  approvedByAdmin: PersonSummary | null
  notes?: string | null
}

export type RangeEventDetail = PropositionEventDetail | ReservationEventDetail
