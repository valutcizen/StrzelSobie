import { reactive, ref, watch } from 'vue'
import { http } from '@/services/http'
import type {
  OverlapDeclarationContextItem,
  PropositionEventDetail,
  RangeEvent,
  RangeEventDetail,
  ReservationEventDetail,
} from '@/types/calendar'
import type { PropositionDetailDto, ReservationDetailDto } from '@strzel-sobie/common'
import type { ComposerTranslation } from 'vue-i18n'
import type { EventClickArg } from '@fullcalendar/core'
import type { PersonSummary } from '@/types/calendar'

type PropositionStatus = Exclude<PropositionEventDetail['status'], null>

const PROPOSITION_STATUSES = new Set<PropositionStatus>(['open', 'converted', 'cancelled'])

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' ? value : null

const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

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

const toOverlapDeclarationContext = (
  raw: unknown,
): OverlapDeclarationContextItem[] => {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      type: (item.type === 'reservation' ? 'reservation' : 'proposition') as
        | 'reservation'
        | 'proposition',
      id: typeof item.id === 'number' ? item.id : 0,
      eventDate: typeof item.eventDate === 'string' ? item.eventDate : '',
      startTime: typeof item.startTime === 'string' ? item.startTime : '',
      endTime: typeof item.endTime === 'string' ? item.endTime : '',
      firingLineId: typeof item.firingLineId === 'number' ? item.firingLineId : 0,
      trackNos: Array.isArray(item.trackNos)
        ? item.trackNos.filter((track): track is number => typeof track === 'number')
        : [],
      hasCoordinatorLicenseInGroup:
        typeof item.hasCoordinatorLicenseInGroup === 'boolean'
          ? item.hasCoordinatorLicenseInGroup
          : null,
    }))
    .filter((item) => item.id > 0 && item.firingLineId > 0 && item.eventDate !== '')
}

const mapPropositionDetail = (raw: unknown, event: RangeEvent): PropositionEventDetail => {
  const data = (raw ?? {}) as Record<string, unknown>

  const propositionId =
    typeof data.id === 'number' ? data.id : event.meta?.propositionId ?? event.sourceId

  const firingLineId =
    toNullableNumber(data.firingLineId ?? data.firing_line_id) ??
    (typeof event.meta?.firingLineId === 'number' ? event.meta.firingLineId : null)
  const trackNos = Array.isArray(data.trackNos)
    ? data.trackNos.filter((item): item is number => typeof item === 'number')
    : Array.isArray(event.meta?.trackNos)
      ? event.meta.trackNos
      : []
  const hasCoordinatorLicenseInGroup =
    typeof data.hasCoordinatorLicenseInGroup === 'boolean'
      ? data.hasCoordinatorLicenseInGroup
      : typeof event.meta?.hasCoordinatorLicenseInGroup === 'boolean'
        ? event.meta.hasCoordinatorLicenseInGroup
        : null

  const statusRaw = data.status
  const statusValue = typeof statusRaw === 'string' ? statusRaw : null
  const status =
    statusValue && PROPOSITION_STATUSES.has(statusValue as PropositionStatus)
      ? (statusValue as PropositionStatus)
      : null

  const createdAt = toNullableString(data.createdAt ?? data.created_at)
  const requester = toPersonSummary(data.requester ?? data.user)
  const notes = toNullableString(data.notes ?? data.additionalNotes ?? data.comment)
  const overlapDeclarationContext = toOverlapDeclarationContext(data.overlapDeclarationContext)

  return {
    type: 'proposition',
    propositionId,
    firingLineId,
    trackNos,
    hasCoordinatorLicenseInGroup,
    overlapDeclarationContext,
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

  const firingLineId =
    toNullableNumber(data.firingLineId ?? data.firing_line_id) ??
    (typeof event.meta?.firingLineId === 'number' ? event.meta.firingLineId : null)
  const trackNos = Array.isArray(data.trackNos)
    ? data.trackNos.filter((item): item is number => typeof item === 'number')
    : Array.isArray(event.meta?.trackNos)
      ? event.meta.trackNos
      : []

  const createdAt = toNullableString(data.createdAt ?? data.created_at)
  const approvedByAdmin = toPersonSummary(
    data.approvedByAdmin ?? data.approved_by_admin ?? data.coordinator ?? data.owner ?? data.manager,
  )
  const notes = toNullableString(data.notes ?? data.additionalNotes ?? data.comment)
  const overlapDeclarationContext = toOverlapDeclarationContext(data.overlapDeclarationContext)
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
    firingLineId,
    trackNos,
    overlapDeclarationContext,
    createdAt,
    approvedByAdmin,
    notes: notes ?? undefined,
  }
}

const getEventDetailCacheKey = (event: RangeEvent) => event.id

interface EventDetailState {
  loading: boolean
  error: string | null
  detail: RangeEventDetail | null
}

export const useEventDetails = ({
  openReservationDialog,
  onEventNavigate,
  t,
}: {
  openReservationDialog: (options: {
    propositionId?: number | null
    defaultStart?: string | null
    defaultEnd?: string | null
    defaultFiringLineId?: number | null
    defaultTrackNos?: number[]
  }) => void
  onEventNavigate: (event: RangeEvent) => void
  t: ComposerTranslation
}) => {
  const selectedEvent = ref<RangeEvent | null>(null)
  const eventDetailOpen = ref(false)
  const eventDetailState = reactive<EventDetailState>({
    loading: false,
    error: null,
    detail: null,
  })
  const detailCache = new Map<string, RangeEventDetail>()
  const detailRequestId = ref(0)

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

  const handleEventClick = (clickInfo: EventClickArg) => {
    const rangeEvent = (clickInfo.event.extendedProps.rangeEvent ?? null) as RangeEvent | null
    if (!rangeEvent) {
      return
    }

    if (rangeEvent.type === 'event') {
      onEventNavigate(rangeEvent)
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

  const handleAcceptEvent = (event: RangeEvent) => {
    eventDetailOpen.value = false
    let defaultFiringLineId: number | null =
      typeof event.meta?.firingLineId === 'number' ? event.meta.firingLineId : null
    let defaultTrackNos: number[] = Array.isArray(event.meta?.trackNos) ? event.meta.trackNos : []
    const detail = eventDetailState.detail
    if (detail && detail.type === 'proposition') {
      defaultFiringLineId = detail.firingLineId
      defaultTrackNos = detail.trackNos
    }

    openReservationDialog({
      propositionId: event.meta?.propositionId ?? null,
      defaultStart: event.start,
      defaultEnd: event.end,
      defaultFiringLineId,
      defaultTrackNos,
    })
  }

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

  const clearCache = () => {
    detailCache.clear()
  }

  return {
    clearCache,
    eventDetailOpen,
    eventDetailState,
    handleAcceptEvent,
    handleDetailReload,
    handleEventClick,
    loadEventDetails,
    selectedEvent,
  }
}
