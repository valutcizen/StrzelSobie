import { reactive, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type FullCalendar from '@fullcalendar/vue3'
import type { ComposerTranslation } from 'vue-i18n'
import type { DateSelectArg } from '@fullcalendar/core'
import { http } from '@/services/http'
import type { RangeEvent } from '@/types/calendar'
import type { SelectedSlot } from '@/components/calendar/PropositionFormDialog.vue'
import type { ReservationSubmissionError } from '@/components/calendar/ReservationFormDialog.vue'

type SnackbarColor = 'success' | 'error'

export const useCalendarDialogs = ({
  calendarRef,
  canCreateReservations,
  rangeSlug,
  refreshEvents,
  t,
}: {
  calendarRef: Ref<InstanceType<typeof FullCalendar> | null>
  canCreateReservations: ComputedRef<boolean>
  rangeSlug: ComputedRef<string>
  refreshEvents: () => Promise<void>
  t: ComposerTranslation
}) => {
  const selectedSlot = ref<SelectedSlot | null>(null)
  const propositionDialogOpen = ref(false)
  const reservationDialog = reactive({
    open: false,
    propositionId: null as number | null,
    defaultStart: null as string | null,
    defaultEnd: null as string | null,
    defaultFiringLineId: null as number | null,
    defaultTrackNos: [] as number[],
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
    color: 'success' as SnackbarColor,
  })

  const showSnackbar = (message: string, color: SnackbarColor = 'success') => {
    snackbarState.open = true
    snackbarState.message = message
    snackbarState.color = color
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
    defaultFiringLineId?: number | null
    defaultTrackNos?: number[]
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
    reservationDialog.defaultFiringLineId =
      typeof options.defaultFiringLineId === 'number' ? options.defaultFiringLineId : null
    reservationDialog.defaultTrackNos = Array.isArray(options.defaultTrackNos)
      ? options.defaultTrackNos
      : []
  }

  const handleSlotSelect = (selectionInfo: DateSelectArg) => {
    const { start, end } = selectionInfo

    if (reservationDialog.open || propositionDialogOpen.value) {
      calendarRef.value?.getApi().unselect()
      return
    }

    const isSameDay = start.toDateString() === end.toDateString()

    const endIsMidnight =
      end.getHours() === 0 &&
      end.getMinutes() === 0 &&
      end.getSeconds() === 0 &&
      end.getMilliseconds() === 0
    const startPlusOneDay = new Date(start)
    startPlusOneDay.setDate(start.getDate() + 1)
    const endIsNextDay = startPlusOneDay.toDateString() === end.toDateString()

    if (!isSameDay && !(endIsNextDay && endIsMidnight)) {
      calendarRef.value?.getApi().unselect()
      return
    }

    calendarRef.value?.getApi().unselect()

    if (canCreateReservations.value) {
      selectedSlot.value = null
      openReservationDialog({
        defaultStart: selectionInfo.startStr,
        defaultEnd: selectionInfo.endStr,
      })
      return
    }

    selectedSlot.value = {
      start: selectionInfo.startStr,
      end: selectionInfo.endStr,
    }
    propositionDialogOpen.value = true
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

  return {
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
    showSnackbar,
    snackbarState,
  }
}
