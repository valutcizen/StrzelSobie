export type RangeEventType = 'proposition' | 'reservation' | 'record'

export interface RangeEventMeta {
  propositionId?: number | null
  reservationId?: number
  tracksRequested?: number
  isMember?: boolean
  coordinatorId?: number | null
  numParticipants?: number | null
  linkedProposition?: PropositionEventDetail | null
  adminId?: number | null
  createdAt?: string | null
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
  tracksRequested: number | null
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
  tracksRequested: number | null
  createdAt: string | null
  coordinator: PersonSummary | null
  notes?: string | null
}

export type RangeEventDetail = PropositionEventDetail | ReservationEventDetail
