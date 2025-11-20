import { computed } from 'vue'
import type { Ref } from 'vue'
import type { EventInput } from '@fullcalendar/core'
import type { ComposerTranslation } from 'vue-i18n'
import { useRangeStore } from '@/stores/range'

const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
const CLOSED_BACKGROUND_COLOR = '#e7eaf0'

const parseTimeToMinutes = (value: string | null | undefined): number | null => {
  if (!value || typeof value !== 'string') {
    return null
  }

  const [hoursStr, minutesStr] = value.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  return hours * 60 + minutes
}

const formatMinutesAsTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const paddedHours = String(Math.min(Math.max(hours, 0), 24)).padStart(2, '0')
  const paddedMinutes = String(Math.min(Math.max(minutes, 0), 59)).padStart(2, '0')
  return `${paddedHours}:${paddedMinutes}:00`
}

const minutesFromDate = (value: string | Date | null | undefined): number | null => {
  if (!value) {
    return null
  }

  const dateValue = typeof value === 'string' ? new Date(value) : value
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return null
  }

  return dateValue.getHours() * 60 + dateValue.getMinutes()
}

const minutesToDateOnDay = (day: Date, minutes: number): Date => {
  const normalizedMinutes = Math.min(Math.max(minutes, 0), 24 * 60)
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(normalizedMinutes / 60),
    normalizedMinutes % 60,
    0,
    0,
  )
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getWeekdayKey = (date: Date): (typeof weekdayKeys)[number] =>
  weekdayKeys[date.getDay()] ?? weekdayKeys[0]

const createClosedBackgroundEvent = (
  start: Date,
  end: Date,
  idSuffix: string,
  title: string,
): EventInput | null => {
  if (end <= start) {
    return null
  }

  return {
    id: `closed-${idSuffix}-${start.getTime()}`,
    start,
    end,
    display: 'background',
    backgroundColor: CLOSED_BACKGROUND_COLOR,
    classNames: ['calendar-closed-slot'],
    title,
  }
}

export const useOperatingHours = ({
  currentViewRange,
  events,
  t,
}: {
  currentViewRange: Ref<{ start: Date; end: Date } | null>
  events: Ref<readonly { start: string | Date; end?: string | Date | null }[]>
  t: ComposerTranslation
}) => {
  const rangeStore = useRangeStore()

  const closedCalendarBackgroundEvents = computed<EventInput[]>(() => {
    const viewRange = currentViewRange.value
    const operatingHours = rangeStore.currentRange?.operatingHours

    if (!viewRange || !operatingHours) {
      return []
    }

    const closedEvents: EventInput[] = []
    const dayCursor = new Date(viewRange.start)
    dayCursor.setHours(0, 0, 0, 0)

    const viewEnd = new Date(viewRange.end)
    viewEnd.setHours(0, 0, 0, 0)

    const closedLabel = t('calendar.view.closedLabel')

    while (dayCursor < viewEnd) {
      const dayStart = new Date(dayCursor)
      const dayEnd = new Date(dayCursor)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayKey = getWeekdayKey(dayStart)
      const dateKey = formatDateKey(dayStart)
      const hours = operatingHours[dayKey] ?? null

      if (!hours) {
        const closedDay = createClosedBackgroundEvent(dayStart, dayEnd, dateKey, closedLabel)
        if (closedDay) {
          closedEvents.push(closedDay)
        }
      } else {
        const openMinutes = parseTimeToMinutes(hours.open)
        const closeMinutes = parseTimeToMinutes(hours.close)

        const isDayClosed =
          openMinutes === null || closeMinutes === null || openMinutes >= closeMinutes
        if (isDayClosed) {
          const closedDay = createClosedBackgroundEvent(dayStart, dayEnd, dateKey, closedLabel)
          if (closedDay) {
            closedEvents.push(closedDay)
          }
        } else {
          const beforeOpen = createClosedBackgroundEvent(
            dayStart,
            minutesToDateOnDay(dayStart, openMinutes),
            `${dateKey}-before`,
            closedLabel,
          )
          const afterClose = createClosedBackgroundEvent(
            minutesToDateOnDay(dayStart, closeMinutes),
            dayEnd,
            `${dateKey}-after`,
            closedLabel,
          )

          if (beforeOpen) {
            closedEvents.push(beforeOpen)
          }
          if (afterClose) {
            closedEvents.push(afterClose)
          }
        }
      }

      dayCursor.setDate(dayCursor.getDate() + 1)
    }

    return closedEvents
  })

  const calendarTimeBounds = computed(() => {
    const operatingHours = rangeStore.currentRange?.operatingHours
    let earliest: number | null = null
    let latest: number | null = null

    if (operatingHours) {
      for (const entry of Object.values(operatingHours)) {
        if (!entry) {
          continue
        }

        const openMinutes = parseTimeToMinutes(entry.open)
        const closeMinutes = parseTimeToMinutes(entry.close)

        if (openMinutes === null || closeMinutes === null) {
          continue
        }

        earliest = earliest === null ? openMinutes : Math.min(earliest, openMinutes)
        latest = latest === null ? closeMinutes : Math.max(latest, closeMinutes)
      }
    }

    const eventBounds = events.value.reduce<{
      earliest: number | null
      latest: number | null
    }>(
      (acc, event) => {
        const startMinutes = minutesFromDate(event.start)
        const endMinutes = minutesFromDate(event.end)

        if (startMinutes !== null) {
          acc.earliest =
            acc.earliest === null ? startMinutes : Math.min(acc.earliest, startMinutes)
        }
        if (endMinutes !== null) {
          acc.latest = acc.latest === null ? endMinutes : Math.max(acc.latest, endMinutes)
        }

        return acc
      },
      { earliest: null, latest: null },
    )

    const candidateMin = [earliest, eventBounds.earliest].filter(
      (value): value is number => typeof value === 'number',
    )
    const candidateMax = [latest, eventBounds.latest].filter(
      (value): value is number => typeof value === 'number',
    )

    if (candidateMin.length === 0 && candidateMax.length === 0) {
      return null
    }

    const slotMinMinutes = Math.max(0, Math.min(...(candidateMin.length ? candidateMin : [0])))
    const slotMaxMinutesRaw = Math.max(
      slotMinMinutes + 60,
      ...candidateMax,
      ...(candidateMin.length ? candidateMin : []),
    )
    const slotMaxMinutes = Math.min(slotMaxMinutesRaw + 30, 24 * 60)

    return {
      slotMinTime: formatMinutesAsTime(slotMinMinutes),
      slotMaxTime: formatMinutesAsTime(slotMaxMinutes),
    }
  })

  return {
    closedCalendarBackgroundEvents,
    calendarTimeBounds,
  }
}
