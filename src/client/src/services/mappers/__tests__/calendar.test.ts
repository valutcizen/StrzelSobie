import { describe, it, expect } from 'vitest'
import { mapCalendarEvents } from '../calendar'

describe('mapCalendarEvents', () => {
  it('transforms propositions and reservations into calendar events', () => {
    const response = {
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
          eventDate: '2024-05-02',
          startTime: '08:00',
          endTime: '09:15',
          tracksRequested: 1,
          isPublic: true,
          isJoinable: true,
          details: {
            coordinatorId: 44,
            numParticipants: 3,
          },
        },
      ],
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
    expect(second.meta?.isPublic).toBe(true)
    expect(second.meta?.isOpenForJoining).toBe(true)
    expect(second.meta?.numParticipants).toBe(3)
  })

  it('sorts events chronologically by start time', () => {
    const response = {
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
          eventDate: '2024-06-03',
          startTime: '06:00',
          endTime: '07:20',
          tracksRequested: 1,
          isPublic: false,
          isJoinable: false,
          details: null,
        },
      ],
    }

    const events = mapCalendarEvents(response)

    expect(events[0].type).toBe('reservation')
    expect(events[1].type).toBe('proposition')
  })
})
