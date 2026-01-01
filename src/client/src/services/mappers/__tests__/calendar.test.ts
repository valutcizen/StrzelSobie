import { describe, it, expect } from 'vitest'
import { mapCalendarEvents } from '../calendar'
import type { CalendarEventsDto } from '@strzel-sobie/common'

describe('mapCalendarEvents', () => {
  it('transforms propositions and reservations into calendar events', () => {
    const response: CalendarEventsDto = {
      propositions: [
        {
          id: 5,
          userId: 12,
          isMember: false,
          eventDate: '2024-05-01',
          startTime: '10:00',
          endTime: '11:30',
          tracksRequested: 2,
        },
      ],
      reservations: [
        {
          id: 9,
          propositionId: 17,
          eventDate: '2024-05-02',
          startTime: '08:00',
          endTime: '09:15',
          tracksRequested: 1,
          details: {
            coordinatorId: 44,
          },
          proposition: {
            id: 17,
            rangeId: 2,
            userId: 88,
            status: 'converted',
            eventDate: '2024-05-02',
            startTime: '07:00',
            endTime: '08:30',
            tracksRequested: 2,
            createdAt: '2024-05-01T10:00:00Z',
            requester: {
              id: 88,
              email: 'requester@example.com',
              phoneNumber: null,
              displayName: 'Requester',
            },
          },
        },
      ],
      events: [],
      records: [],
    }

    const events = mapCalendarEvents(response)

    expect(events).toHaveLength(2)

    const [first, second] = events

    expect(first.type).toBe('proposition')
    expect(first.start).toBe('2024-05-01T10:00:00')
    expect(first.meta?.propositionId).toBe(5)
    expect(first.meta?.tracksRequested).toBe(2)
    expect(first.meta?.isMember).toBe(false)

    expect(second.type).toBe('reservation')
    expect(second.start).toBe('2024-05-02T08:00:00')
    expect(second.meta?.reservationId).toBe(9)
    expect(second.meta?.propositionId).toBe(17)
    expect(second.meta?.linkedProposition?.propositionId).toBe(17)
    expect(second.meta?.linkedProposition?.requester?.email).toBe('requester@example.com')
  })

  it('sorts events chronologically by start time', () => {
    const response: CalendarEventsDto = {
      propositions: [
        {
          id: 2,
          userId: 1,
          isMember: true,
          eventDate: '2024-06-03',
          startTime: '18:00',
          endTime: '19:00',
          tracksRequested: 1,
        },
      ],
      reservations: [
        {
          id: 1,
          propositionId: null,
          eventDate: '2024-06-03',
          startTime: '06:00',
          endTime: '07:20',
          tracksRequested: null,
          details: null,
          proposition: null,
        },
      ],
      events: [],
      records: [],
    }

    const events = mapCalendarEvents(response)

    expect(events[0].type).toBe('reservation')
    expect(events[0].meta?.tracksRequested).toBeUndefined()
    expect(events[0].meta?.coordinatorId).toBeNull()
    expect(events[1].type).toBe('proposition')
  })
})
