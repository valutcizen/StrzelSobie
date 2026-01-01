import { compareAsc } from 'date-fns'
import type {
  PersonSummary,
  PropositionEventDetail,
  RangeEvent,
  RangeEventType,
} from '../../types/calendar'
import { combineDateAndTime } from '../../utils/datetime'
import i18n from '@/plugins/i18n'
import type { CalendarEventsDto } from '@strzel-sobie/common'

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

  const tracksRequested =
    typeof data.tracksRequested === 'number'
      ? data.tracksRequested
      : typeof data.tracks_requested === 'number'
        ? data.tracks_requested
        : null
  const statusRaw = typeof data.status === 'string' ? data.status : null
  const status =
    statusRaw && PROPOSITION_STATUSES.has(statusRaw as Exclude<PropositionEventDetail['status'], null>)
      ? (statusRaw as Exclude<PropositionEventDetail['status'], null>)
      : null
  const createdAt =
    typeof data.createdAt === 'string'
      ? data.createdAt
      : typeof data.created_at === 'string'
        ? data.created_at
        : null
  const requester = toPersonSummary(data.requester ?? data.user)
  const notes =
    typeof data.notes === 'string'
      ? data.notes
      : typeof data.additionalNotes === 'string'
        ? data.additionalNotes
        : typeof data.comment === 'string'
          ? data.comment
          : null

  return {
    type: 'proposition',
    propositionId,
    tracksRequested,
    status,
    createdAt,
    requester,
    notes: notes ?? undefined,
  }
}

const translate = (key: string) => i18n.global.t(key) as string

const buildTitle = (type: RangeEventType, meta: { isMember?: boolean }) => {
  if (type === 'proposition') {
    return meta.isMember
      ? translate('calendar.eventTitles.proposition.member')
      : translate('calendar.eventTitles.proposition.guest')
  }

  if (type === 'reservation') {
    return translate('calendar.eventTitles.reservation')
  }

  return translate('calendar.eventTitles.record')
}

export const mapCalendarEvents = (dto: CalendarEventsDto): RangeEvent[] => {
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
    const linkedProposition = mapLinkedProposition(event.proposition)
    const propositionId = event.propositionId ?? linkedProposition?.propositionId ?? null

    return {
      id: `reservation-${event.id}`,
      sourceId: event.id,
      title: buildTitle('reservation', {}),
      type: 'reservation',
      start: combineDateAndTime(event.eventDate, event.startTime),
      end: combineDateAndTime(event.eventDate, event.endTime),
      allDay: false,
      meta: {
        reservationId: event.id,
        tracksRequested,
        coordinatorId,
        propositionId,
        linkedProposition,
      },
    }
  })

  const recordEvents: RangeEvent[] = (dto.records ?? []).map((event) => ({
    id: `record-${event.id}`,
    sourceId: event.id,
    title: buildTitle('record', {}),
    type: 'record',
    start: combineDateAndTime(event.eventDate, event.startTime),
    end: combineDateAndTime(event.eventDate, event.endTime),
    allDay: false,
    meta: {
      numParticipants: event.numParticipants,
      adminId: event.adminId,
      createdAt: event.createdAt,
    },
  }))

  return [...propositionEvents, ...reservationEvents, ...recordEvents].sort((a, b) =>
    compareAsc(new Date(a.start), new Date(b.start)),
  )
}
