export type RangeEventType = 'proposition' | 'reservation' | 'record'

export interface RangeEventMeta {
  propositionId?: number
  reservationId?: number
  tracksRequested?: number
  isMember?: boolean
  isOpenForJoining?: boolean
  isPublic?: boolean
  coordinatorId?: number | null
  numParticipants?: number | null
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
