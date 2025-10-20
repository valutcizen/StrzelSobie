import { compareAsc } from 'date-fns'
import type { RangeEvent, RangeEventType } from '../../types/calendar'
import { combineDateAndTime } from '../../utils/datetime'

export interface PropositionEventDto {
  id: number
  userId: number
  isMember: boolean
  eventDate: string
  startTime: string
  endTime: string
  tracksRequested: number
}

export interface ReservationEventDto {
  id: number
  eventDate: string
  startTime: string
  endTime: string
  tracksRequested: number
  isPublic: boolean
  isJoinable: boolean
  details: {
    coordinatorId: number
    numParticipants: number
  } | null
}

export interface CalendarEventsResponse {
  propositions: PropositionEventDto[]
  reservations: ReservationEventDto[]
}

const buildTitle = (type: RangeEventType, meta: { isMember?: boolean; isPublic?: boolean; isJoinable?: boolean }) => {
  if (type === 'proposition') {
    return meta.isMember ? 'Propozycja członka' : 'Propozycja gościa'
  }

  if (type === 'reservation') {
    if (meta.isPublic && meta.isJoinable) {
      return 'Rezerwacja (otwarta)'
    }
    if (meta.isPublic) {
      return 'Rezerwacja (publiczna)'
    }
    return 'Rezerwacja'
  }

  return 'Wydarzenie'
}

export const mapCalendarEvents = (dto: CalendarEventsResponse): RangeEvent[] => {
  const propositionEvents: RangeEvent[] = (dto.propositions ?? []).map((event) => ({
    id: `proposition-${event.id}`,
    sourceId: event.id,
    title: buildTitle('proposition', { isMember: event.isMember }),
    type: 'proposition',
    start: combineDateAndTime(event.eventDate, event.startTime),
    end: combineDateAndTime(event.eventDate, event.endTime),
    allDay: false,
    meta: {
      propositionId: event.id,
      tracksRequested: event.tracksRequested,
      isMember: event.isMember,
    },
  }))

  const reservationEvents: RangeEvent[] = (dto.reservations ?? []).map((event) => ({
    id: `reservation-${event.id}`,
    sourceId: event.id,
    title: buildTitle('reservation', { isPublic: event.isPublic, isJoinable: event.isJoinable }),
    type: 'reservation',
    start: combineDateAndTime(event.eventDate, event.startTime),
    end: combineDateAndTime(event.eventDate, event.endTime),
    allDay: false,
    meta: {
      reservationId: event.id,
      tracksRequested: event.tracksRequested,
      isPublic: event.isPublic,
      isOpenForJoining: event.isJoinable,
      coordinatorId: event.details?.coordinatorId ?? null,
      numParticipants: event.details?.numParticipants ?? null,
    },
  }))

  return [...propositionEvents, ...reservationEvents].sort((a, b) =>
    compareAsc(new Date(a.start), new Date(b.start)),
  )
}
