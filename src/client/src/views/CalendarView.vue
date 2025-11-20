<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import EventDetailDialog from '@/components/calendar/EventDetailDialog.vue'
import PropositionFormDialog from '@/components/calendar/PropositionFormDialog.vue'
import ReservationFormDialog from '@/components/calendar/ReservationFormDialog.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import RecordFormDialog from '@/components/calendar/RecordFormDialog.vue'
import { useCalendarStore } from '@/stores/calendar'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import { UserRoleEnum } from '@/types/auth'
import type { RangeEvent } from '@/types/calendar'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useOperatingHours } from '@/views/calendar/useOperatingHours'
import { useCalendarEvents } from '@/views/calendar/useCalendarEvents'
import { useEventDetails } from '@/views/calendar/useEventDetails'
import { useCalendarDialogs } from '@/views/calendar/useCalendarDialogs'
import CalendarHeaderActions from '@/views/calendar/CalendarHeaderActions.vue'

const calendarStore = useCalendarStore()
const authStore = useAuthStore()
const rangeStore = useRangeStore()
const route = useRoute()
const { t, locale } = useI18n()
const display = useDisplay()

const isSmallScreen = computed(() => display.smAndDown.value)
const defaultView = computed(() => (isSmallScreen.value ? 'timeGridDay' : 'timeGridWeek'))

const rangeSlug = computed(() => String(route.params.rangeSlug ?? authStore.defaultRangeSlug))
const canForceReservations = computed(() =>
  authStore.hasAnyRole([
    UserRoleEnum.Coordinator,
    UserRoleEnum.ShootingRangeAdministrator,
    UserRoleEnum.ClubCommunityAdministrator,
  ]),
)
const canCreateReservations = computed(() => authStore.hasAnyRole([UserRoleEnum.Coordinator]))
const canManageRecords = computed(
  () =>
    authStore.hasAnyRole([
      UserRoleEnum.ShootingRangeAdministrator,
      UserRoleEnum.ClubCommunityAdministrator,
    ]) ||
    authStore.hasAnyRangeRole([
      UserRoleEnum.ShootingRangeAdministrator,
      UserRoleEnum.ClubCommunityAdministrator,
    ]),
)

const isJoinableIndicatorVisible = computed(() =>
  authStore.hasAnyRole([
    UserRoleEnum.Member,
    UserRoleEnum.Coordinator,
    UserRoleEnum.ShootingRangeAdministrator,
    UserRoleEnum.ClubCommunityAdministrator,
  ]),
)

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const calendarContainerRef = ref<HTMLElement | null>(null)
const currentViewRange = ref<{ start: Date; end: Date } | null>(null)
let resizeObserver: ResizeObserver | null = null

const { closedCalendarBackgroundEvents, calendarTimeBounds } = useOperatingHours({
  currentViewRange,
  events: computed(() => calendarStore.events),
  t,
})

let clearEventDetailCache: () => void = () => {}

const {
  calendarOptions,
  handleEventDidMount,
  loadEventsForRange,
  refreshEvents,
} = useCalendarEvents({
  calendarRef,
  calendarStore,
  closedCalendarBackgroundEvents,
  calendarTimeBounds,
  currentViewRange,
  defaultView,
  isJoinableIndicatorVisible,
  locale,
  onForceReload: () => clearEventDetailCache(),
  rangeSlug,
  t,
})

const {
  confirmationState,
  handleConfirmationConfirm,
  handlePropositionSubmitted,
  handleRecordSubmitted,
  handleReservationError,
  handleReservationSubmitted,
  handleSlotSelect,
  openCancellationConfirmation,
  openPropositionDialog,
  openReservationDialog,
  propositionDialogOpen,
  recordDialogOpen,
  reservationDialog,
  selectedSlot,
  snackbarState,
} = useCalendarDialogs({
  calendarRef,
  canCreateReservations,
  rangeSlug,
  refreshEvents,
  t,
})

const {
  clearCache,
  eventDetailOpen,
  eventDetailState,
  handleAcceptEvent,
  handleDetailReload,
  handleEventClick,
  selectedEvent,
} = useEventDetails({
  openReservationDialog,
  t,
})

clearEventDetailCache = clearCache

const enhancedCalendarOptions = computed(() => ({
  ...calendarOptions.value,
  select: handleSlotSelect,
  eventClick: handleEventClick,
  eventDidMount: handleEventDidMount,
}))

const openCancellationDialog = (event: RangeEvent) => {
  eventDetailOpen.value = false
  openCancellationConfirmation(event)
}

const loadRangeDetails = async () => {
  if (!rangeSlug.value) {
    return
  }

  try {
    await rangeStore.fetchRangeDetails(rangeSlug.value)
  } catch {
    // If range metadata is unavailable, fall back to default calendar bounds.
  }
}

const updateCalendarSize = () => {
  const calendarApi = calendarRef.value?.getApi()
  if (calendarApi) {
    calendarApi.updateSize()
  }
}

watch(calendarContainerRef, (newEl, oldEl) => {
  if (!resizeObserver) {
    return
  }

  if (oldEl) {
    resizeObserver.unobserve(oldEl)
  }
  if (newEl) {
    resizeObserver.observe(newEl)
  }
})

watch(
  () => rangeSlug.value,
  async () => {
    await loadRangeDetails()
    calendarStore.clear()
    clearCache()
    if (currentViewRange.value) {
      await loadEventsForRange(currentViewRange.value, true)
    }
  },
)

onMounted(async () => {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateCalendarSize)
    })
    if (calendarContainerRef.value) {
      resizeObserver.observe(calendarContainerRef.value)
    }
  }

  await loadRangeDetails()
  if (!currentViewRange.value) {
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 7)
    currentViewRange.value = { start, end }
  }

  await loadEventsForRange(currentViewRange.value, true)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <CalendarHeaderActions
            :range-slug="rangeSlug"
            :can-create-reservations="canCreateReservations"
            :can-manage-records="canManageRecords"
            @propose="openPropositionDialog"
            @reserve="openReservationDialog({})"
            @record="recordDialogOpen = true"
          />
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

            <div
              ref="calendarContainerRef"
              data-testid="calendar"
            >
              <FullCalendar
                ref="calendarRef"
                :options="enhancedCalendarOptions"
              />
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <EventDetailDialog
      :open="eventDetailOpen"
      :event="selectedEvent"
      :details="eventDetailState.detail"
      :loading="eventDetailState.loading"
      :error="eventDetailState.error"
      @update:open="eventDetailOpen = $event"
      @accept="handleAcceptEvent"
      @cancel="openCancellationDialog"
      @reload-details="handleDetailReload"
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
      :default-tracks="reservationDialog.defaultTracks"
      :default-participants="reservationDialog.defaultParticipants"
      :default-is-public="reservationDialog.defaultIsPublic"
      :default-is-open-for-joining="reservationDialog.defaultIsOpenForJoining"
      :can-use-force="canForceReservations"
      @update:open="reservationDialog.open = $event"
      @submitted="handleReservationSubmitted"
      @submit-error="handleReservationError"
    />

    <RecordFormDialog
      :open="recordDialogOpen"
      :range-slug="rangeSlug"
      @update:open="recordDialogOpen = $event"
      @submitted="handleRecordSubmitted"
    />

    <ConfirmationDialog
      :open="confirmationState.open"
      :loading="confirmationState.loading"
      :title="confirmationState.title"
      :description="confirmationState.description"
      color="error"
      @update:open="confirmationState.open = $event"
      @confirm="handleConfirmationConfirm"
    />

    <v-snackbar
      v-model="snackbarState.open"
      :color="snackbarState.color"
      timeout="3000"
      data-testid="calendar-snackbar"
    >
      {{ snackbarState.message }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
:deep(.event-member) {
  border-style: dashed;
  border-width: 2px;
}

:deep(.event-joinable) {
  box-shadow: inset 0 0 0 2px rgba(245, 158, 11, 0.75);
}

:deep(.calendar-closed-slot) {
  background-color: rgba(99, 102, 115, 0.18) !important;
  color: #475569 !important;
  pointer-events: none;
}

:deep(.event-reservation-public) {
  font-weight: 600;
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
