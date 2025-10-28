import { compareAsc } from 'date-fns'
import type {
  PersonSummary,
  PropositionEventDetail,
  RangeEvent,
  RangeEventType,
} from '../../types/calendar'
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
  propositionId: number | null
  eventDate: string
  startTime: string
  endTime: string
  tracksRequested: number | null
  isPublic: boolean
  isJoinable: boolean | null
  details: {
    coordinatorId: number
    numParticipants: number
  } | null
  proposition: unknown
}

export interface CalendarEventsResponse {
  propositions: PropositionEventDto[]
  reservations: ReservationEventDto[]
}

const PROPOSITION_STATUSES = new Set<Exclude<PropositionEventDetail['status'], null>>([
  'open',
  'converted',
  'cancelled',
])

const toPersonSummary = (person: unknown): PersonSummary | null => {
  if (!person || typeof person !== 'object') {
    return null
  }

  const data = person as Record<string, unknown>
  const id = typeof data.id === 'number' ? data.id : null
  const email = typeof data.email === 'string' ? data.email : null
  const phoneNumber = typeof data.phoneNumber === 'string' ? data.phoneNumber : null
  const displayName = typeof data.displayName === 'string' ? data.displayName : null

  if (id === null && !email && !phoneNumber && !displayName) {
    return null
  }

  return {
    id,
    email,
    phoneNumber,
    displayName,
  }
}

const mapLinkedProposition = (proposition: unknown): PropositionEventDetail | null => {
  if (!proposition || typeof proposition !== 'object') {
    return null
  }

  const data = proposition as Record<string, unknown>
  const propositionId = typeof data.id === 'number' ? data.id : null
  if (propositionId === null) {
    return null
  }

  const numParticipants = typeof data.numParticipants === 'number' ? data.numParticipants : null
  const tracksRequested = typeof data.tracksRequested === 'number' ? data.tracksRequested : null
  const statusRaw = typeof data.status === 'string' ? data.status : null
  const status =
    statusRaw && PROPOSITION_STATUSES.has(statusRaw as Exclude<PropositionEventDetail['status'], null>)
      ? (statusRaw as Exclude<PropositionEventDetail['status'], null>)
      : null
  const createdAt = typeof data.createdAt === 'string' ? data.createdAt : null
  const requester = toPersonSummary(data.requester)
  const notes = typeof data.notes === 'string' ? data.notes : null

  return {
    type: 'proposition',
    propositionId,
    numParticipants,
    tracksRequested,
    status,
    createdAt,
    requester,
    notes: notes ?? undefined,
  }
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

  const reservationEvents: RangeEvent[] = (dto.reservations ?? []).map((event) => {
    const tracksRequested =
      typeof event.tracksRequested === 'number' ? event.tracksRequested : undefined
    const coordinatorId = event.details ? event.details.coordinatorId : null
    const numParticipants = event.details ? event.details.numParticipants : null

    const isPublic = Boolean(event.isPublic)
    const isJoinable = event.isJoinable === true
    const linkedProposition = mapLinkedProposition(event.proposition)
    const propositionId = event.propositionId ?? linkedProposition?.propositionId ?? null

    return {
      id: `reservation-${event.id}`,
      sourceId: event.id,
      title: buildTitle('reservation', { isPublic, isJoinable }),
      type: 'reservation',
      start: combineDateAndTime(event.eventDate, event.startTime),
      end: combineDateAndTime(event.eventDate, event.endTime),
      allDay: false,
      meta: {
        reservationId: event.id,
        tracksRequested,
        isPublic,
        isOpenForJoining: isJoinable,
        coordinatorId,
        numParticipants,
        propositionId,
        linkedProposition,
      },
    }
  })

  return [...propositionEvents, ...reservationEvents].sort((a, b) =>
    compareAsc(new Date(a.start), new Date(b.start)),
  )
}
