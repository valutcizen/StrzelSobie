<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import FullCalendar from '@fullcalendar/vue3'
import type {
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventMountArg,
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
import ReservationFormDialog, {
  type ReservationSubmissionError,
} from '@/components/calendar/ReservationFormDialog.vue'
import ConfirmationDialog from '@/components/common/ConfirmationDialog.vue'
import RecordFormDialog from '@/components/calendar/RecordFormDialog.vue'
import type {
  PersonSummary,
  RangeEvent,
  RangeEventDetail,
  PropositionEventDetail,
  ReservationEventDetail,
} from '@/types/calendar'
import { toDateOnly } from '@/utils/datetime'
import { http } from '@/services/http'
import { UserRoleEnum } from '@/types/auth'
import type { PropositionDetailDto, ReservationDetailDto } from '@strzel-sobie/common'
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'
import { useRangeStore } from '@/stores/range'

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

const calendarRef = ref<InstanceType<typeof FullCalendar> | null>(null)
const calendarContainerRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null
const currentViewRange = ref<{ start: Date; end: Date } | null>(null)
const selectedEvent = ref<RangeEvent | null>(null)
const eventDetailOpen = ref(false)

interface EventDetailState {
  loading: boolean
  error: string | null
  detail: RangeEventDetail | null
}

const eventDetailState = reactive<EventDetailState>({
  loading: false,
  error: null,
  detail: null,
})

const detailCache = new Map<string, RangeEventDetail>()
const detailRequestId = ref(0)

const selectedSlot = ref<SelectedSlot | null>(null)
const propositionDialogOpen = ref(false)
const reservationDialog = reactive({
  open: false,
  propositionId: null as number | null,
  defaultStart: null as string | null,
  defaultEnd: null as string | null,
  defaultTracks: null as number | null,
  defaultParticipants: null as number | null,
  defaultIsPublic: null as boolean | null,
  defaultIsOpenForJoining: null as boolean | null,
})
const recordDialogOpen = ref(false)
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
    UserRoleEnum.Member,
    UserRoleEnum.Coordinator,
    UserRoleEnum.ShootingRangeAdministrator,
    UserRoleEnum.ClubCommunityAdministrator,
  ]),
)

const calendarEvents = computed(() =>
  calendarStore.events.map((event) => {
    const classNames = [`event-${event.type}`]
    let backgroundColor = '#4a5568'
    let borderColor = '#2d3748'
    let textColor = '#ffffff'

    if (event.type === 'proposition') {
      const isMember = Boolean(event.meta?.isMember)
      classNames.push(isMember ? 'event-proposition-member' : 'event-proposition-guest')
      backgroundColor = isMember ? '#2746b9' : '#3a6bff'
      borderColor = isMember ? '#1d3391' : '#2651d6'
    } else if (event.type === 'reservation') {
      const isPublic = Boolean(event.meta?.isPublic)
      const isJoinable = Boolean(event.meta?.isOpenForJoining)

      if (isPublic) {
        classNames.push('event-reservation-public')
        backgroundColor = '#f59e0b'
        borderColor = '#c27802'
        textColor = '#2f1b00'
      } else {
        classNames.push(isJoinable ? 'event-reservation-joinable' : 'event-reservation-private')
        backgroundColor = '#2f9e44'
        borderColor = isJoinable ? '#c27802' : '#1f7d3f'
      }
    } else if (event.type === 'record') {
      classNames.push('event-record')
      backgroundColor = '#6d4c41'
      borderColor = '#4e342e'
    }

    if (event.meta?.isMember) {
      classNames.push('event-member')
    }

    if (event.meta?.isOpenForJoining && isJoinableIndicatorVisible.value) {
      classNames.push('event-joinable')
    }

    return {
      id: event.id,
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

type PropositionStatus = Exclude<PropositionEventDetail['status'], null>

const PROPOSITION_STATUSES = new Set<PropositionStatus>(['open', 'converted', 'cancelled'])

const getEventDetailCacheKey = (event: RangeEvent) => event.id

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null

const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (Number.isNaN(value)) {
      return null
    }
    return value !== 0
  }

  return null
}

const toPersonSummary = (raw: unknown): PersonSummary | null => {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const data = raw as Record<string, unknown>
  const id = typeof data.id === 'number' ? data.id : null
  const email = toNullableString(data.email)
  const phoneNumber = toNullableString(data.phoneNumber ?? data.phone_number)
  const displayName = toNullableString(data.displayName ?? data.display_name)

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

const mapPropositionDetail = (raw: unknown, event: RangeEvent): PropositionEventDetail => {
  const data = (raw ?? {}) as Record<string, unknown>

  const propositionId =
    typeof data.id === 'number' ? data.id : event.meta?.propositionId ?? event.sourceId

  const numParticipants =
    toNullableNumber(data.numParticipants ?? data.num_participants) ??
    (typeof event.meta?.numParticipants === 'number' ? event.meta.numParticipants : null)

  const tracksRequested =
    toNullableNumber(data.tracksRequested ?? data.tracks_requested) ??
    (typeof event.meta?.tracksRequested === 'number' ? event.meta.tracksRequested : null)

  const statusRaw = data.status
  const statusValue = typeof statusRaw === 'string' ? statusRaw : null
  const status =
    statusValue && PROPOSITION_STATUSES.has(statusValue as PropositionStatus)
      ? (statusValue as PropositionStatus)
      : null

  const createdAt = toNullableString(data.createdAt ?? data.created_at)
  const requester = toPersonSummary(data.requester ?? data.user)
  const notes = toNullableString(data.notes ?? data.additionalNotes ?? data.comment)

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

const mapReservationDetail = (raw: unknown, event: RangeEvent): ReservationEventDetail => {
  const data = (raw ?? {}) as Record<string, unknown>

  const reservationId =
    typeof data.id === 'number' ? data.id : event.meta?.reservationId ?? event.sourceId

  let propositionId = toNullableNumber(data.propositionId ?? data.proposition_id)

  const numParticipants =
    toNullableNumber(data.numParticipants ?? data.num_participants) ??
    (typeof event.meta?.numParticipants === 'number' ? event.meta.numParticipants : null)

  const tracksRequested =
    toNullableNumber(
      data.tracksRequested ??
        data.tracks_requested ??
        data.tracksAllocated ??
        data.tracks_allocated,
    ) ?? (typeof event.meta?.tracksRequested === 'number' ? event.meta.tracksRequested : null)

  const isPublic =
    toBooleanOrNull(data.isPublic ?? data.is_public) ??
    (typeof event.meta?.isPublic === 'boolean' ? event.meta.isPublic : null)

  const isJoinable =
    toBooleanOrNull(
      data.isJoinable ??
        data.is_joinable ??
        data.openForJoining ??
        data.open_for_joining,
    ) ?? (typeof event.meta?.isOpenForJoining === 'boolean' ? event.meta.isOpenForJoining : null)

  const createdAt = toNullableString(data.createdAt ?? data.created_at)
  const coordinator = toPersonSummary(data.coordinator ?? data.owner ?? data.manager)
  const notes = toNullableString(data.notes ?? data.additionalNotes ?? data.comment)
  const rawPropositionDetail =
    data.proposition ?? data.linkedProposition ?? data.originalProposition ?? null
  const proposition =
    rawPropositionDetail !== null ? mapPropositionDetail(rawPropositionDetail, event) : null

  if (proposition && propositionId === null) {
    propositionId = proposition.propositionId
  }

  return {
    type: 'reservation',
    reservationId,
    propositionId,
    proposition,
    numParticipants,
    tracksRequested,
    isPublic,
    isJoinable,
    createdAt,
    coordinator,
    notes: notes ?? undefined,
  }
}

const loadEventDetails = async (event: RangeEvent) => {
  if (event.type !== 'proposition' && event.type !== 'reservation') {
    eventDetailState.loading = false
    eventDetailState.error = null
    return
  }

  const cacheKey = getEventDetailCacheKey(event)
  let endpoint: string | null = null

  if (event.type === 'proposition') {
    const propositionId = event.meta?.propositionId
    if (!propositionId) {
      eventDetailState.loading = false
      eventDetailState.error = null
      return
    }
    endpoint = `/propositions/${propositionId}`
  } else {
    const reservationId = event.meta?.reservationId
    if (!reservationId) {
      eventDetailState.loading = false
      eventDetailState.error = null
      return
    }
    endpoint = `/reservations/${reservationId}`
  }

  const requestId = ++detailRequestId.value
  eventDetailState.loading = true
  eventDetailState.error = null

  try {
    let detail: RangeEventDetail | null = null
    if (event.type === 'proposition') {
      const { data } = await http.get<PropositionDetailDto>(endpoint)
      detail = mapPropositionDetail(data, event)
    } else {
      const { data } = await http.get<ReservationDetailDto>(endpoint)
      detail = mapReservationDetail(data, event)
    }

    if (detail) {
      detailCache.set(cacheKey, detail)
    }

    if (detailRequestId.value === requestId) {
      eventDetailState.detail = detail
    }
  } catch (error) {
    if (detailRequestId.value === requestId) {
      eventDetailState.error =
        error instanceof Error ? error.message : t('calendar.eventDetail.errors.loadFailed')
      eventDetailState.detail = null
    }
  } finally {
    if (detailRequestId.value === requestId) {
      eventDetailState.loading = false
    }
  }
}

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarState.open = true
  snackbarState.message = message
  snackbarState.color = color
}

const loadEventsForRange = async (range: { start: Date; end: Date }, force = false) => {
  if (!rangeSlug.value) {
    return
  }

  if (force) {
    detailCache.clear()
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

  if (!authStore.hasAnyRole([UserRoleEnum.Coordinator])) {
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

  const cacheKey = getEventDetailCacheKey(rangeEvent)
  const cachedDetail = detailCache.get(cacheKey) ?? null

  eventDetailState.detail = cachedDetail
  eventDetailState.error = null
  const needsRefresh =
    cachedDetail &&
    rangeEvent.type === 'reservation' &&
    cachedDetail.type === 'reservation' &&
    cachedDetail.propositionId !== null &&
    !cachedDetail.proposition
  if (cachedDetail && !needsRefresh) {
    eventDetailState.loading = false
    return
  }

  if (rangeEvent.type === 'proposition' || rangeEvent.type === 'reservation') {
    eventDetailState.loading = true
    void loadEventDetails(rangeEvent)
  } else {
    eventDetailState.loading = false
  }
}

const handleDetailReload = (event: RangeEvent) => {
  if (event.type !== 'proposition' && event.type !== 'reservation') {
    return
  }

  detailCache.delete(getEventDetailCacheKey(event))
  eventDetailState.error = null
  eventDetailState.loading = true

  void loadEventDetails(event)
}

const handleEventDidMount = (info: EventMountArg) => {
  info.el.setAttribute('data-event-id', info.event.id)
}

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

  const eventBounds = calendarStore.events.reduce<{
    earliest: number | null
    latest: number | null
  }>(
    (acc, event) => {
      const startMinutes = minutesFromDate(event.start)
      const endMinutes = minutesFromDate(event.end)

      if (startMinutes !== null) {
        acc.earliest = acc.earliest === null ? startMinutes : Math.min(acc.earliest, startMinutes)
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
  events: calendarEvents.value,
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
  select: handleSlotSelect,
  eventClick: handleEventClick,
  datesSet: handleDatesSet,
  eventDidMount: handleEventDidMount,
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
  () => eventDetailOpen.value,
  (open) => {
    if (!open) {
      eventDetailState.loading = false
      eventDetailState.error = null
      eventDetailState.detail = null
      selectedEvent.value = null
    }
  },
)

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
  defaultTracks?: number | null
  defaultParticipants?: number | null
  defaultIsPublic?: boolean | null
  defaultIsOpenForJoining?: boolean | null
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
  reservationDialog.defaultTracks =
    typeof options.defaultTracks === 'number' ? options.defaultTracks : null
  reservationDialog.defaultParticipants =
    typeof options.defaultParticipants === 'number' ? options.defaultParticipants : null

  const isPublicDefault =
    typeof options.defaultIsPublic === 'boolean' ? options.defaultIsPublic : true
  reservationDialog.defaultIsPublic = isPublicDefault

  const isOpenForJoiningDefault =
    typeof options.defaultIsOpenForJoining === 'boolean'
      ? options.defaultIsOpenForJoining && isPublicDefault
      : false
  reservationDialog.defaultIsOpenForJoining = isOpenForJoiningDefault
}

const handleAcceptEvent = (event: RangeEvent) => {
  eventDetailOpen.value = false
  let defaultTracks: number | null =
    typeof event.meta?.tracksRequested === 'number' ? event.meta.tracksRequested : null
  let defaultParticipants: number | null = null

  const detail = eventDetailState.detail
  if (detail && detail.type === 'proposition') {
    if (typeof detail.tracksRequested === 'number') {
      defaultTracks = detail.tracksRequested
    }
    if (typeof detail.numParticipants === 'number') {
      defaultParticipants = detail.numParticipants
    }
  }

  openReservationDialog({
    propositionId: event.meta?.propositionId ?? null,
    defaultStart: event.start,
    defaultEnd: event.end,
    defaultTracks,
    defaultParticipants,
    defaultIsPublic: false,
    defaultIsOpenForJoining: false,
  })
}

const performCancellation = async (event: RangeEvent) => {
  if (!rangeSlug.value) {
    return
  }

  if (event.type === 'proposition' && event.meta?.propositionId) {
    await http.delete(`/propositions/${event.meta.propositionId}`)
  } else if (event.type === 'reservation' && event.meta?.reservationId) {
    await http.delete(`/ranges/${rangeSlug.value}/reservations/${event.meta.reservationId}`)
  }
}

const openCancellationConfirmation = (event: RangeEvent) => {
  eventDetailOpen.value = false
  confirmationState.open = true
  confirmationState.loading = false
  confirmationState.title =
    event.type === 'reservation'
      ? t('calendar.confirmation.cancelReservationTitle')
      : t('calendar.confirmation.cancelPropositionTitle')
  confirmationState.description =
    event.type === 'reservation'
      ? t('calendar.confirmation.cancelReservationDescription')
      : t('calendar.confirmation.cancelPropositionDescription')
  confirmationState.successMessage =
    event.type === 'reservation'
      ? t('calendar.snackbar.reservationCancelled')
      : t('calendar.snackbar.propositionCancelled')
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
      error instanceof Error ? error.message : t('common.feedback.operationFailed'),
      'error',
    )
  } finally {
    confirmationState.loading = false
  }
}

const handlePropositionSubmitted = async () => {
  propositionDialogOpen.value = false
  await refreshEvents()
  showSnackbar(t('calendar.snackbar.propositionSubmitted'))
}

const handleReservationSubmitted = async () => {
  reservationDialog.open = false
  await refreshEvents()
  showSnackbar(t('calendar.snackbar.reservationSaved'))
}

const handleReservationError = (error: ReservationSubmissionError) => {
  const message = error.forceRequired
    ? `${error.message} ${t('calendar.snackbar.forceAdvice')}`
    : error.message
  showSnackbar(message, 'error')
}

const handleRecordSubmitted = async () => {
  recordDialogOpen.value = false
  await refreshEvents()
  showSnackbar(t('calendar.snackbar.recordSaved'))
}

watch(
  () => rangeSlug.value,
  async () => {
    await loadRangeDetails()
    calendarStore.clear()
    detailCache.clear()
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

  // Ensure initial events load even before calendar emits datesSet
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
          <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-4">
            <div>
              <div class="text-h6">
                {{ t('calendar.view.title') }}
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
                data-testid="calendar-propose-slot-button"
                @click="openPropositionDialog"
              >
                {{ t('calendar.view.proposeSlot') }}
              </v-btn>
              <v-btn
                v-if="authStore.hasAnyRole([UserRoleEnum.Coordinator])"
                color="primary"
                prepend-icon="mdi-calendar-plus"
                data-testid="calendar-new-reservation-button"
                @click="openReservationDialog({})"
              >
                {{ t('calendar.view.newReservation') }}
              </v-btn>
              <v-btn
                v-if="canManageRecords"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-clipboard-plus"
                data-testid="calendar-record-without-reservation-button"
                @click="recordDialogOpen = true"
              >
                {{ t('calendar.view.recordWithoutReservation') }}
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

            <div
              ref="calendarContainerRef"
              data-testid="calendar"
            >
              <FullCalendar
                ref="calendarRef"
                :options="calendarOptions"
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
      @cancel="openCancellationConfirmation"
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
