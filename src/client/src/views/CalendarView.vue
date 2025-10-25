<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import type {
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
} from '@fullcalendar/core'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import plLocale from '@fullcalendar/core/locales/pl'
import { useCalendarStore } from '@/stores/calendar'
import { useAuthStore } from '@/stores/auth'
import EventDetailDialog from '@/components/calendar/EventDetailDialog.vue'
import PropositionFormDialog, {
  type SelectedSlot,
} from '@/components/calendar/PropositionFormDialog.vue'
import ReservationFormDialog from '@/components/calendar/ReservationFormDialog.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import type { RangeEvent } from '@/types/calendar'
import { toDateOnly } from '@/utils/datetime'
import { http } from '@/services/http'

const calendarStore = useCalendarStore()
const authStore = useAuthStore()
const route = useRoute()

const rangeSlug = computed(() => String(route.params.rangeSlug ?? authStore.defaultRangeSlug))

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const currentViewRange = ref<{ start: Date; end: Date } | null>(null)
const selectedEvent = ref<RangeEvent | null>(null)
const eventDetailOpen = ref(false)
const selectedSlot = ref<SelectedSlot | null>(null)
const propositionDialogOpen = ref(false)
const reservationDialog = reactive({
  open: false,
  propositionId: null as number | null,
  defaultStart: null as string | null,
  defaultEnd: null as string | null,
})
const confirmationState = reactive({
  open: false,
  loading: false,
  title: '',
  description: '',
  successMessage: '',
  action: null as null | (() => Promise<void>),
})
const snackbarState = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const isJoinableIndicatorVisible = computed(() =>
  authStore.hasAnyRole([
    'Member',
    'Coordinator',
    'Shooting Range Administrator',
    'Club/Community Administrator',
  ]),
)

const calendarEvents = computed(() =>
  calendarStore.events.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay ?? false,
    extendedProps: {
      rangeEvent: event,
    },
    classNames: [
      `event-${event.type}`,
      event.meta?.isMember ? 'event-member' : '',
      event.meta?.isOpenForJoining && isJoinableIndicatorVisible.value ? 'event-joinable' : '',
    ].filter(Boolean),
  })),
)

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarState.open = true
  snackbarState.message = message
  snackbarState.color = color
}

const loadEventsForRange = async (range: { start: Date; end: Date }, force = false) => {
  if (!rangeSlug.value) {
    return
  }

  await calendarStore.fetchEvents({
    rangeSlug: rangeSlug.value,
    startDate: toDateOnly(range.start),
    endDate: toDateOnly(range.end),
    force,
  })
}

const handleDatesSet = async (info: DatesSetArg) => {
  currentViewRange.value = { start: info.start, end: info.end }
  await loadEventsForRange(currentViewRange.value)
}

const handleSlotSelect = (selectionInfo: DateSelectArg) => {
  const { start, end } = selectionInfo

  const isSameDay = start.toDateString() === end.toDateString()

  // Special case: selection ends at midnight of the next day.
  const endIsMidnight =
    end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0 && end.getMilliseconds() === 0
  const startPlusOneDay = new Date(start)
  startPlusOneDay.setDate(start.getDate() + 1)
  const endIsNextDay = startPlusOneDay.toDateString() === end.toDateString()

  if (!isSameDay && !(endIsNextDay && endIsMidnight)) {
    calendarRef.value?.getApi().unselect()
    return
  }

  selectedSlot.value = {
    start: selectionInfo.startStr,
    end: selectionInfo.endStr,
  }

  if (!authStore.hasAnyRole(['Coordinator'])) {
    propositionDialogOpen.value = true
  } else {
    // Coordinators get the choice via the proposition dialog by default
    propositionDialogOpen.value = true
  }

  calendarRef.value?.getApi().unselect()
}

const handleEventClick = (clickInfo: EventClickArg) => {
  const rangeEvent = (clickInfo.event.extendedProps.rangeEvent ?? null) as RangeEvent | null
  if (!rangeEvent) {
    return
  }

  selectedEvent.value = rangeEvent
  eventDetailOpen.value = true
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [timeGridPlugin, dayGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  locales: [plLocale],
  locale: 'pl',
  slotDuration: '00:30:00',
  allDaySlot: false,
  expandRows: true,
  firstDay: 1,
  nowIndicator: true,
  selectable: true,
  selectMirror: true,
  events: calendarEvents.value,
  height: 'auto',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridWeek',
  },
  buttonText: {
    today: 'Dzisiaj',
    week: 'Tydzień',
  },
  select: handleSlotSelect,
  eventClick: handleEventClick,
  datesSet: handleDatesSet,
}))

const refreshEvents = async () => {
  if (currentViewRange.value) {
    await loadEventsForRange(currentViewRange.value, true)
  }
}

const openPropositionDialog = () => {
  const now = new Date()
  now.setMinutes(0, 0, 0)
  const end = new Date(now)
  end.setHours(end.getHours() + 1)

  selectedSlot.value = {
    start: now.toISOString(),
    end: end.toISOString(),
  }
  propositionDialogOpen.value = true
}

const openReservationDialog = (options: {
  propositionId?: number | null
  defaultStart?: string | null
  defaultEnd?: string | null
}) => {
  const defaultStart = options.defaultStart
  const defaultEnd = options.defaultEnd

  if (!defaultStart || !defaultEnd) {
    const start = new Date()
    start.setMinutes(0, 0, 0)
    const end = new Date(start)
    end.setHours(end.getHours() + 1)

    reservationDialog.defaultStart = defaultStart ?? start.toISOString()
    reservationDialog.defaultEnd = defaultEnd ?? end.toISOString()
  } else {
    reservationDialog.defaultStart = defaultStart
    reservationDialog.defaultEnd = defaultEnd
  }

  reservationDialog.open = true
  reservationDialog.propositionId = options.propositionId ?? null
}

const handleAcceptEvent = (event: RangeEvent) => {
  eventDetailOpen.value = false
  openReservationDialog({
    propositionId: event.meta?.propositionId ?? null,
    defaultStart: event.start,
    defaultEnd: event.end,
  })
}

const performCancellation = async (event: RangeEvent) => {
  if (!rangeSlug.value) {
    return
  }

  if (event.type === 'proposition' && event.meta?.propositionId) {
    await http.delete(`/ranges/${rangeSlug.value}/propositions/${event.meta.propositionId}`)
  } else if (event.type === 'reservation' && event.meta?.reservationId) {
    await http.delete(`/ranges/${rangeSlug.value}/reservations/${event.meta.reservationId}`)
  }
}

const openCancellationConfirmation = (event: RangeEvent) => {
  eventDetailOpen.value = false
  confirmationState.open = true
  confirmationState.loading = false
  confirmationState.title =
    event.type === 'reservation' ? 'Anulować rezerwację?' : 'Wycofać propozycję?'
  confirmationState.description =
    event.type === 'reservation'
      ? 'Anulowana rezerwacja nie będzie już widoczna w kalendarzu.'
      : 'Wycofana propozycja zniknie z kalendarza.'
  confirmationState.successMessage =
    event.type === 'reservation' ? 'Rezerwacja została anulowana.' : 'Propozycja została wycofana.'
  confirmationState.action = async () => {
    await performCancellation(event)
    await refreshEvents()
  }
}

const handleConfirmationConfirm = async () => {
  if (!confirmationState.action) {
    return
  }

  confirmationState.loading = true
  try {
    await confirmationState.action()
    confirmationState.open = false
    showSnackbar(confirmationState.successMessage, 'success')
  } catch (error) {
    showSnackbar(
      error instanceof Error ? error.message : 'Nie udało się wykonać akcji.',
      'error',
    )
  } finally {
    confirmationState.loading = false
  }
}

const handleJoinEvent = async (event: RangeEvent) => {
  if (!rangeSlug.value || !event.meta?.reservationId) {
    return
  }

  try {
    await http.post(`/ranges/${rangeSlug.value}/reservations/${event.meta.reservationId}/join`)
    showSnackbar('Dołączyłeś do rezerwacji.')
  } catch (error) {
    showSnackbar(
      error instanceof Error ? error.message : 'Nie udało się dołączyć do rezerwacji.',
      'error',
    )
  }
}

const handlePropositionSubmitted = async () => {
  propositionDialogOpen.value = false
  await refreshEvents()
  showSnackbar('Propozycja została zgłoszona.')
}

const handleReservationSubmitted = async () => {
  reservationDialog.open = false
  await refreshEvents()
  showSnackbar('Rezerwacja została zapisana.')
}

watch(
  () => rangeSlug.value,
  async () => {
    calendarStore.clear()
    if (currentViewRange.value) {
      await loadEventsForRange(currentViewRange.value, true)
    }
  },
)

onMounted(async () => {
  // Ensure initial events load even before calendar emits datesSet
  if (!currentViewRange.value) {
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 7)
    currentViewRange.value = { start, end }
  }

  await loadEventsForRange(currentViewRange.value, true)
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-4">
            <div>
              <div class="text-h6">
                Kalendarz
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ rangeSlug }}
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <v-btn
                color="secondary"
                variant="outlined"
                prepend-icon="mdi-target"
                @click="openPropositionDialog"
              >
                Zaproponuj termin
              </v-btn>
              <v-btn
                v-if="authStore.hasAnyRole(['Coordinator'])"
                color="primary"
                prepend-icon="mdi-calendar-plus"
                @click="openReservationDialog({})"
              >
                Nowa rezerwacja
              </v-btn>
            </div>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <v-alert
              v-if="calendarStore.lastError"
              type="error"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              {{ calendarStore.lastError }}
            </v-alert>

            <FullCalendar
              ref="calendarRef"
              :options="calendarOptions"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <EventDetailDialog
      :open="eventDetailOpen"
      :event="selectedEvent"
      @update:open="eventDetailOpen = $event"
      @accept="handleAcceptEvent"
      @cancel="openCancellationConfirmation"
      @join="handleJoinEvent"
    />

    <PropositionFormDialog
      :open="propositionDialogOpen"
      :range-slug="rangeSlug"
      :selected-slot="selectedSlot"
      @update:open="propositionDialogOpen = $event"
      @submitted="handlePropositionSubmitted"
    />

    <ReservationFormDialog
      :open="reservationDialog.open"
      :range-slug="rangeSlug"
      :proposition-id="reservationDialog.propositionId"
      :default-start="reservationDialog.defaultStart"
      :default-end="reservationDialog.defaultEnd"
      @update:open="reservationDialog.open = $event"
      @submitted="handleReservationSubmitted"
    />

    <ConfirmationDialog
      :open="confirmationState.open"
      :loading="confirmationState.loading"
      :title="confirmationState.title"
      :description="confirmationState.description"
      confirm-text="Potwierdź"
      cancel-text="Anuluj"
      color="error"
      @update:open="confirmationState.open = $event"
      @confirm="handleConfirmationConfirm"
    />

    <v-snackbar
      v-model="snackbarState.open"
      :color="snackbarState.color"
      timeout="3000"
    >
      {{ snackbarState.message }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.event-proposition {
  background-color: rgba(33, 150, 243, 0.2);
  border-left: 4px solid #1976d2;
  color: #0d47a1;
}

.event-reservation {
  background-color: rgba(46, 125, 50, 0.2);
  border-left: 4px solid #2e7d32;
  color: #1b5e20;
}

.event-record {
  background-color: rgba(121, 85, 72, 0.25);
  border-left: 4px solid #6d4c41;
  color: #4e342e;
}

.event-member {
  border-style: dashed;
}

.event-joinable {
  box-shadow: inset 0 0 0 2px #2e7d32;
}

:deep(.fc-button) {
  color: rgba(0, 0, 0, 0.87);
  background-color: #f5f5f5;
}

:deep(.fc-button-primary:not(:disabled).fc-button-active),
:deep(.fc-button-primary:not(:disabled):active) {
  background-color: #1976d2;
  color: white;
}
</style>
