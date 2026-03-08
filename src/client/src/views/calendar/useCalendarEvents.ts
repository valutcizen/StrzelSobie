import { computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CalendarOptions, DatesSetArg, EventInput, EventMountArg } from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/vue3'
import type { ComposerTranslation } from 'vue-i18n'
import plLocale from '@fullcalendar/core/locales/pl'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { toDateOnly } from '@/utils/datetime'
import type { RangeEvent } from '@/types/calendar'
import type { useCalendarStore } from '@/stores/calendar'

const getEventDetailCacheKey = (event: RangeEvent) => event.id

export const useCalendarEvents = ({
  calendarRef,
  calendarStore,
  closedCalendarBackgroundEvents,
  calendarTimeBounds,
  currentViewRange,
  defaultView,
  locale,
  onForceReload,
  rangeSlug,
  selectedFiringLineId,
  t,
}: {
  calendarRef: Ref<InstanceType<typeof FullCalendar> | null>
  calendarStore: ReturnType<typeof useCalendarStore>
  closedCalendarBackgroundEvents: ComputedRef<EventInput[]>
  calendarTimeBounds: ComputedRef<{ slotMinTime: string; slotMaxTime: string } | null>
  currentViewRange: Ref<{ start: Date; end: Date } | null>
  defaultView: ComputedRef<string>
  locale: Ref<string>
  onForceReload?: () => void
  rangeSlug: ComputedRef<string>
  selectedFiringLineId: Ref<number | null>
  t: ComposerTranslation
}) => {
  const filteredRangeEvents = computed(() =>
    calendarStore.events.filter((event) => {
      if (event.type === 'proposition' || event.type === 'reservation') {
        return (
          selectedFiringLineId.value === null ||
          event.meta?.firingLineId === selectedFiringLineId.value
        )
      }

      return true
    }),
  )

  const calendarEvents = computed<EventInput[]>(() =>
    filteredRangeEvents.value.map((event) => {
      const classNames = [`event-${event.type}`]
      let backgroundColor = '#4a5568'
      let borderColor = '#2d3748'
      let textColor = '#ffffff'

      if (event.type === 'proposition') {
        const isMember = Boolean(event.meta?.isMember)
        classNames.push(isMember ? 'event-proposition-member' : 'event-proposition-guest')
        backgroundColor = isMember ? '#2746b9' : '#3a6bff'
        borderColor = isMember ? '#1d3391' : '#2651d6'
      } else if (event.type === 'event') {
        classNames.push('event-event')
        backgroundColor = '#d97706'
        borderColor = '#b45309'
      } else if (event.type === 'reservation') {
        classNames.push('event-reservation')
        backgroundColor = '#2f9e44'
        borderColor = '#1f7d3f'
      } else if (event.type === 'record') {
        classNames.push('event-record')
        backgroundColor = '#6d4c41'
        borderColor = '#4e342e'
      }

      if (event.meta?.isMember) {
        classNames.push('event-member')
      }

      return {
        id: getEventDetailCacheKey(event),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay ?? false,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          rangeEvent: event,
        },
        classNames,
      }
    }),
  )

  const calendarDisplayEvents = computed<EventInput[]>(() => [
    ...calendarEvents.value,
    ...closedCalendarBackgroundEvents.value,
  ])

  const loadEventsForRange = async (range: { start: Date; end: Date }, force = false) => {
    if (!rangeSlug.value) {
      return
    }

    if (force) {
      onForceReload?.()
    }

    await calendarStore.fetchEvents({
      rangeSlug: rangeSlug.value,
      startDate: toDateOnly(range.start),
      endDate: toDateOnly(range.end),
      force,
    })
  }

  const handleDatesSet = async (info: DatesSetArg) => {
    const prev = currentViewRange.value
    const nextRange = { start: info.start, end: info.end }
    const isSameRange =
      prev &&
      prev.start.getTime() === nextRange.start.getTime() &&
      prev.end.getTime() === nextRange.end.getTime()

    if (isSameRange) {
      return
    }

    currentViewRange.value = nextRange
    await loadEventsForRange(nextRange)
  }

  const calendarOptions = computed<CalendarOptions>(() => ({
    plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
    initialView: defaultView.value,
    locales: [plLocale],
    locale: locale.value,
    slotDuration: '00:30:00',
    slotMinTime: calendarTimeBounds.value?.slotMinTime ?? '00:00:00',
    slotMaxTime: calendarTimeBounds.value?.slotMaxTime ?? '24:00:00',
    allDaySlot: false,
    expandRows: true,
    firstDay: 1,
    nowIndicator: true,
    selectable: true,
    selectMirror: true,
    events: calendarDisplayEvents.value,
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'timeGridDay,timeGridWeek',
    },
    buttonText: {
      today: t('calendar.fc.today'),
      day: t('calendar.fc.day'),
      week: t('calendar.fc.week'),
    },
    datesSet: handleDatesSet,
  }))

  watch(
    () => locale.value,
    (newLocale) => {
      const api = calendarRef.value?.getApi()
      if (!api) {
        return
      }
      api.setOption('locale', newLocale)
      api.setOption('buttonText', {
        today: t('calendar.fc.today'),
        day: t('calendar.fc.day'),
        week: t('calendar.fc.week'),
      })
    },
  )

  watch(
    defaultView,
    (newView) => {
      const api = calendarRef.value?.getApi()
      if (!api) {
        return
      }

      if (api.view.type !== newView) {
        api.changeView(newView)
      }
    },
  )

  const refreshEvents = async () => {
    if (currentViewRange.value) {
      await loadEventsForRange(currentViewRange.value, true)
    }
  }

  const handleEventDidMount = (info: EventMountArg) => {
    info.el.setAttribute('data-event-id', info.event.id)
  }

  return {
    calendarDisplayEvents,
    calendarEvents,
    calendarOptions,
    calendarTimeBounds,
    currentViewRange,
    handleDatesSet,
    handleEventDidMount,
    loadEventsForRange,
    refreshEvents,
  }
}
