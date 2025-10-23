<template>
  <div class="calendar-view">
    <FullCalendar
      ref="calendarRef"
      :options="calendarOptions"
    />

    <div
      v-if="calendarStore.isLoading"
      class="calendar-overlay"
    >
      <v-skeleton-loader type="table" />
    </div>

    <div
      v-else-if="!calendarStore.hasEvents"
      class="calendar-empty"
    >
      <v-icon size="64">
        mdi-calendar-clock
      </v-icon>
      <p class="text-subtitle-1 mt-4">
        {{ t('calendar.emptyState') }}
      </p>
      <v-btn
        class="mt-4"
        color="primary"
        @click="openPropositionDialog"
      >
        {{ t('calendar.propositionCta') }}
      </v-btn>
    </div>
  </div>

  <EventDetailDialog
    v-model:open="isEventDetailDialogOpen"
    :event="selectedEvent"
    @accept="onEventAccepted"
  />

  <PropositionFormDialog
    v-model:open="isPropositionDialogOpen"
    :range-slug="currentRangeSlug"
    :selected-slot="selectedSlot"
    @submitted="onPropositionSubmitted"
  />

  <ReservationFormDialog
    v-model:open="isReservationDialogOpen"
    :default-end="pendingReservation?.end ?? null"
    :default-start="pendingReservation?.start ?? null"
    :proposition-id="pendingReservation?.propositionId ?? null"
    :range-slug="currentRangeSlug"
    @submitted="onReservationSubmitted"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarOptions, DateSelectArg, DatesSetArg, EventClickArg, EventInput } from '@fullcalendar/core'
import { endOfWeek, startOfWeek, subDays } from 'date-fns'
import { useCalendarStore } from '../stores/calendar'
import type { RangeEvent } from '../types/calendar'
import EventDetailDialog from '../components/calendar/EventDetailDialog.vue'
import PropositionFormDialog, { type SelectedSlot } from '../components/calendar/PropositionFormDialog.vue'
import ReservationFormDialog from '../components/calendar/ReservationFormDialog.vue'
import { toDateOnly } from '../utils/datetime'

const route = useRoute()
const { t } = useI18n()
const calendarStore = useCalendarStore()

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const selectedEvent = ref<RangeEvent | null>(null)
const selectedSlot = ref<SelectedSlot | null>(null)
const pendingReservation = ref<{ propositionId: number | null; start: string | null; end: string | null } | null>(null)
const isEventDetailDialogOpen = ref(false)
const isPropositionDialogOpen = ref(false)
const isReservationDialogOpen = ref(false)
const visibleRange = ref<{ startDate: string; endDate: string } | null>(null)

const currentRangeSlug = computed(() => (typeof route.params.rangeSlug === 'string' ? route.params.rangeSlug : ''))

const getEventColor = (event: RangeEvent) => {
  switch (event.type) {
    case 'reservation':
      return '#388E3C'
    case 'record':
      return '#757575'
    case 'proposition':
    default:
      return '#1976D2'
  }
}

const calendarEvents = computed<EventInput[]>(() =>
  calendarStore.events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    color: getEventColor(event),
    extendedProps: event,
  })),
)

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  events: calendarEvents.value,
  selectable: true,
  nowIndicator: true,
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek,timeGridDay',
  },
  eventClick: (info: EventClickArg) => {
    selectedEvent.value = info.event.extendedProps as RangeEvent
    isEventDetailDialogOpen.value = true
  },
  select: (selectionInfo: DateSelectArg) => {
    selectedSlot.value = {
      start: selectionInfo.startStr,
      end: selectionInfo.endStr,
    }
    isPropositionDialogOpen.value = true
  },
  datesSet: async (arg: DatesSetArg) => {
    if (!currentRangeSlug.value) {
      return
    }

    const range = computeVisibleRange(arg.start, arg.end)
    visibleRange.value = range
    await fetchEventsForCurrentRange({ force: false })
  },
}))

const openPropositionDialog = () => {
  selectedSlot.value = null
  isPropositionDialogOpen.value = true
}

const onPropositionSubmitted = async () => {
  await fetchEventsForCurrentRange({ force: true })
}

const onEventAccepted = (event: RangeEvent) => {
  pendingReservation.value = {
    propositionId: event.meta?.propositionId ?? null,
    start: event.start,
    end: event.end,
  }
  isEventDetailDialogOpen.value = false
  isReservationDialogOpen.value = true
}

const onReservationSubmitted = async () => {
  await fetchEventsForCurrentRange({ force: true })
  pendingReservation.value = null
}

const computeVisibleRange = (viewStart: Date, viewEnd: Date) => {
  const startDate = toDateOnly(viewStart)
  const endDate = toDateOnly(subDays(viewEnd, 1))
  return { startDate, endDate }
}

const computeDefaultRange = () => {
  const today = new Date()
  const start = startOfWeek(today, { weekStartsOn: 1 })
  const end = endOfWeek(today, { weekStartsOn: 1 })

  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
  }
}

const fetchEventsForCurrentRange = async ({ force }: { force: boolean }) => {
  if (!currentRangeSlug.value) {
    return
  }

  const range = visibleRange.value ?? computeDefaultRange()

  await calendarStore.fetchEvents({
    rangeSlug: currentRangeSlug.value,
    startDate: range.startDate,
    endDate: range.endDate,
    force,
  })
}

watch(
  currentRangeSlug,
  (slug) => {
    if (!slug) {
      return
    }

    if (!visibleRange.value) {
      visibleRange.value = computeDefaultRange()
    }

    void fetchEventsForCurrentRange({ force: true })
  },
  { immediate: true },
)

onMounted(() => {
  if (!visibleRange.value) {
    visibleRange.value = computeDefaultRange()
  }

  if (!calendarStore.currentRangeSlug && currentRangeSlug.value) {
    void fetchEventsForCurrentRange({ force: true })
  }
})
</script>

<style scoped>
.calendar-view {
  min-height: 480px;
  position: relative;
}

.calendar-overlay {
  align-items: center;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  inset: 0;
  justify-content: center;
  position: absolute;
  z-index: 2;
}

.calendar-empty {
  align-items: center;
  display: flex;
  flex-direction: column;
  inset: 0;
  justify-content: center;
  position: absolute;
  text-align: center;
  z-index: 1;
}
</style>
