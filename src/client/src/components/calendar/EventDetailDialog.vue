<template>
  <v-dialog
    :model-value="open"
    max-width="560"
    data-testid="event-detail-dialog"
    @update:model-value="emitUpdate"
  >
    <v-card v-if="event">
      <v-card-title>{{ event.title }}</v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item>
            <template #prepend>
              <v-icon>mdi-clock-outline</v-icon>
            </template>
            <v-list-item-title>{{ formattedStart }}</v-list-item-title>
            <v-list-item-subtitle>{{ formattedEnd }}</v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="firingLineId !== null">
            <template #prepend>
              <v-icon>mdi-ray-start-vertex-end</v-icon>
            </template>
            <v-list-item-title>{{ t('calendar.eventDetail.summary.firingLine', { id: firingLineId }) }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="trackNos.length > 0">
            <template #prepend>
              <v-icon>mdi-target</v-icon>
            </template>
            <v-list-item-title>{{ t('calendar.eventDetail.summary.trackNos', { tracks: trackNos.join(', ') }) }}</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="isProposition">
            <template #prepend>
              <v-icon>mdi-account</v-icon>
            </template>
            <v-list-item-title>
              {{ event.meta?.isMember
                ? t('calendar.eventDetail.proposition.member')
                : t('calendar.eventDetail.proposition.guest') }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="participants">
            <template #prepend>
              <v-icon>mdi-account-group</v-icon>
            </template>
            <v-list-item-title>{{ t('calendar.eventDetail.summary.participants', { count: participants }) }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <v-progress-linear
          v-if="isLoadingDetails"
          class="mt-4"
          color="primary"
          indeterminate
        />

        <v-alert
          v-else-if="detailError"
          type="error"
          variant="tonal"
          border="start"
          class="mt-4"
        >
          <div class="d-flex align-center justify-space-between flex-wrap gap-2">
            <span>{{ detailError }}</span>
            <v-btn
              v-if="event"
              size="small"
              variant="text"
              color="primary"
              data-testid="event-detail-retry-button"
              @click="emitReload"
            >
              {{ t('common.actions.retry') }}
            </v-btn>
          </div>
        </v-alert>

        <v-expand-transition>
          <div
            v-if="details && !isLoadingDetails && !detailError"
            class="mt-4"
          >
            <v-divider class="mb-3" />
            <v-list density="compact">
              <template v-if="hasReservationSection">
                <v-list-subheader data-testid="event-detail-reservation-section">
                  {{ t('calendar.eventDetail.sections.reservation') }}
                </v-list-subheader>
                <v-list-item v-if="approvedByAdminDisplay">
                  <template #prepend>
                    <v-icon>mdi-account-tie</v-icon>
                  </template>
                  <v-list-item-title>{{ approvedByAdminDisplay.title }}</v-list-item-title>
                  <v-list-item-subtitle v-if="approvedByAdminDisplay.subtitle">
                    {{ approvedByAdminDisplay.subtitle }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="linkedPropositionId !== null">
                  <template #prepend>
                    <v-icon>mdi-link-variant</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ t('calendar.eventDetail.linkedProposition', { id: linkedPropositionId }) }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="propositionSectionStatusLabel">
                    {{ propositionSectionStatusLabel }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="detailCreatedAt">
                  <template #prepend>
                    <v-icon>mdi-calendar-clock</v-icon>
                  </template>
                  <v-list-item-title>{{ detailCreatedAt }}</v-list-item-title>
                  <v-list-item-subtitle>{{ t('calendar.eventDetail.labels.createdAt') }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="detailNotes">
                  <template #prepend>
                    <v-icon>mdi-note-text</v-icon>
                  </template>
                  <v-list-item-title>{{ detailNotes }}</v-list-item-title>
                </v-list-item>
              </template>

              <v-divider
                v-if="hasReservationSection && hasPropositionSection"
                class="my-2"
              />

              <template v-if="hasPropositionSection">
                <v-list-subheader data-testid="event-detail-proposition-section">
                  {{ t('calendar.eventDetail.sections.proposition') }}
                </v-list-subheader>
                <v-list-item v-if="!hasReservationSection && linkedPropositionId !== null">
                  <template #prepend>
                    <v-icon>mdi-link-variant</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ t('calendar.eventDetail.linkedPropositionShort', { id: linkedPropositionId }) }}
                  </v-list-item-title>
                  <v-list-item-subtitle v-if="propositionSectionStatusLabel">
                    {{ propositionSectionStatusLabel }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item
                  v-else-if="hasReservationSection && propositionSectionStatusLabel"
                >
                  <template #prepend>
                    <v-icon>mdi-information-outline</v-icon>
                  </template>
                  <v-list-item-title>{{ propositionSectionStatusLabel }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="propositionSectionRequesterDisplay">
                  <template #prepend>
                    <v-icon>mdi-account</v-icon>
                  </template>
                  <v-list-item-title>{{ propositionSectionRequesterDisplay.title }}</v-list-item-title>
                  <v-list-item-subtitle v-if="propositionSectionRequesterDisplay.subtitle">
                    {{ propositionSectionRequesterDisplay.subtitle }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="propositionSectionTrackNos.length > 0">
                  <template #prepend>
                    <v-icon>mdi-target</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ t('calendar.eventDetail.labels.trackNosDemand', { tracks: propositionSectionTrackNos.join(', ') }) }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="propositionSectionCoordinatorDeclarationLabel">
                  <template #prepend>
                    <v-icon>mdi-shield-check</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ propositionSectionCoordinatorDeclarationLabel }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="propositionSectionOverlapContext.length > 0">
                  <template #prepend>
                    <v-icon>mdi-layers-triple-outline</v-icon>
                  </template>
                  <v-list-item-title>
                    {{ t('calendar.eventDetail.labels.overlapDeclarationContextTitle') }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-for="overlap in propositionSectionOverlapContext"
                  :key="`${overlap.type}-${overlap.id}`"
                >
                  <template #prepend>
                    <v-icon size="small">mdi-subdirectory-arrow-right</v-icon>
                  </template>
                  <v-list-item-title>
                    {{
                      t('calendar.eventDetail.labels.overlapDeclarationContextItem', {
                        type: overlap.type === 'reservation'
                          ? t('calendar.eventDetail.sections.reservation')
                          : t('calendar.eventDetail.sections.proposition'),
                        id: overlap.id,
                        time: `${overlap.startTime}-${overlap.endTime}`,
                        tracks: overlap.trackNos.join(', '),
                        declaration: overlapDeclarationLabel(overlap.hasCoordinatorLicenseInGroup),
                      })
                    }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="propositionSectionCreatedAt">
                  <template #prepend>
                    <v-icon>mdi-calendar-clock</v-icon>
                  </template>
                  <v-list-item-title>{{ propositionSectionCreatedAt }}</v-list-item-title>
                  <v-list-item-subtitle>{{ t('calendar.eventDetail.labels.submittedAt') }}</v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="propositionSectionNotes">
                  <template #prepend>
                    <v-icon>mdi-note-text</v-icon>
                  </template>
                  <v-list-item-title>{{ propositionSectionNotes }}</v-list-item-title>
                </v-list-item>
              </template>
            </v-list>
          </div>
        </v-expand-transition>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          data-testid="event-detail-close-button"
          @click="emitUpdate(false)"
        >
          {{ t('common.actions.close') }}
        </v-btn>
        <v-btn
          v-if="canAccept"
          color="primary"
          data-testid="event-detail-accept-button"
          @click="emitAccept"
        >
          {{ t('common.actions.accept') }}
        </v-btn>
        <v-btn
          v-if="canCancel"
          color="error"
          variant="tonal"
          data-testid="event-detail-cancel-button"
          @click="emitCancel"
        >
          {{ t('common.actions.cancel') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { enUS, pl as plLocale } from 'date-fns/locale'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../../stores/auth'
import { UserRoleEnum } from '../../types/auth'
import type {
  OverlapDeclarationContextItem,
  PersonSummary,
  PropositionEventDetail,
  RangeEvent,
  RangeEventDetail,
} from '../../types/calendar'

interface EventDetailDialogProps {
  open: boolean
  event: RangeEvent | null
  details: RangeEventDetail | null
  loading: boolean
  error: string | null
}

interface PersonDisplay {
  title: string
  subtitle: string | null
}

const props = defineProps<EventDetailDialogProps>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  accept: [event: RangeEvent]
  cancel: [event: RangeEvent]
  'reload-details': [event: RangeEvent]
}>()

const { t, locale } = useI18n()

const dateLocale = computed(() => (locale.value === 'pl' ? plLocale : enUS))

const authStore = useAuthStore()

const event = computed(() => props.event)
const details = computed(() => props.details)
const isLoadingDetails = computed(() => props.loading)
const detailError = computed(() => props.error)

const isProposition = computed(() => event.value?.type === 'proposition')
const isReservation = computed(() => event.value?.type === 'reservation')

const detailsAsProposition = computed(() =>
  details.value?.type === 'proposition' ? details.value : null,
)
const detailsAsReservation = computed(() =>
  details.value?.type === 'reservation' ? details.value : null,
)

const firingLineId = computed(() => {
  const detail = details.value
  if (detail && typeof detail.firingLineId === 'number') {
    return detail.firingLineId
  }
  const metaValue = event.value?.meta?.firingLineId
  return typeof metaValue === 'number' ? metaValue : null
})

const trackNos = computed(() => {
  const detail = details.value
  if (detail && Array.isArray(detail.trackNos)) {
    return detail.trackNos
  }
  return Array.isArray(event.value?.meta?.trackNos) ? event.value?.meta?.trackNos ?? [] : []
})

const participants = computed(() => {
  const metaValue = event.value?.meta?.numParticipants
  return typeof metaValue === 'number' ? metaValue : null
})

const formattedStart = computed(() => {
  if (!event.value) return ''
  return format(parseISO(event.value.start), 'PPpp', { locale: dateLocale.value })
})

const formattedEnd = computed(() => {
  if (!event.value) return ''
  return format(parseISO(event.value.end), 'PPpp', { locale: dateLocale.value })
})

const formatDateTime = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }
  try {
    return format(parseISO(value), 'PPpp', { locale: dateLocale.value })
  } catch {
    return null
  }
}

const normalizeNotes = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const buildPropositionStatusLabel = (detail: PropositionEventDetail | null): string | null => {
  switch (detail?.status) {
    case 'open':
      return t('calendar.eventDetail.status.pending')
    case 'converted':
      return t('calendar.eventDetail.status.converted')
    case 'cancelled':
      return t('calendar.eventDetail.status.cancelled')
    default:
      return null
  }
}

const detailCreatedAt = computed(() => {
  return formatDateTime(details.value?.createdAt)
})

const detailNotes = computed(() => {
  return normalizeNotes(details.value?.notes)
})

const formatPerson = (person: PersonSummary | null): PersonDisplay | null => {
  if (!person) {
    return null
  }

  const titleCandidate =
    person.displayName ??
    person.email ??
    (person.id !== null ? t('common.labels.userWithId', { id: person.id }) : null)
  const subtitleParts: string[] = []

  if (person.email && person.email !== titleCandidate) {
    subtitleParts.push(person.email)
  }

  if (person.phoneNumber) {
    subtitleParts.push(person.phoneNumber)
  }

  if (!titleCandidate) {
    if (subtitleParts.length === 0) {
      return null
    }
    const [first, ...rest] = subtitleParts
    return {
      title: first,
      subtitle: rest.length > 0 ? rest.join(' | ') : null,
    }
  }

  return {
    title: titleCandidate,
    subtitle: subtitleParts.length > 0 ? subtitleParts.join(' | ') : null,
  }
}

const approvedByAdminDisplay = computed(() =>
  formatPerson(detailsAsReservation.value?.approvedByAdmin ?? null),
)

const reservationLinkedProposition = computed(() => {
  const detailProposition = detailsAsReservation.value?.proposition ?? null
  if (detailProposition) {
    return detailProposition
  }
  return event.value?.meta?.linkedProposition ?? null
})

const hasReservationSection = computed(() => detailsAsReservation.value !== null)

const propositionSectionDetail = computed(() => {
  if (isReservation.value) {
    return reservationLinkedProposition.value
  }
  return detailsAsProposition.value
})

const propositionSectionId = computed(() => {
  if (propositionSectionDetail.value) {
    return propositionSectionDetail.value.propositionId
  }
  if (isReservation.value) {
    const reservationDetailId = detailsAsReservation.value?.propositionId
    if (typeof reservationDetailId === 'number') {
      return reservationDetailId
    }
    const metaId = event.value?.meta?.propositionId
    return typeof metaId === 'number' ? metaId : null
  }
  const metaId = event.value?.meta?.propositionId
  return typeof metaId === 'number' ? metaId : null
})

const hasPropositionSection = computed(() => {
  if (isReservation.value) {
    return propositionSectionDetail.value !== null || propositionSectionId.value !== null
  }
  return propositionSectionDetail.value !== null
})

const propositionSectionStatusLabel = computed(() =>
  buildPropositionStatusLabel(propositionSectionDetail.value),
)

const propositionSectionRequesterDisplay = computed(() =>
  formatPerson(propositionSectionDetail.value?.requester ?? null),
)

const propositionSectionCreatedAt = computed(() =>
  formatDateTime(propositionSectionDetail.value?.createdAt),
)

const propositionSectionNotes = computed(() =>
  normalizeNotes(propositionSectionDetail.value?.notes),
)

const propositionSectionTrackNos = computed(() => propositionSectionDetail.value?.trackNos ?? [])
const propositionSectionOverlapContext = computed<OverlapDeclarationContextItem[]>(() => {
  const direct = details.value?.overlapDeclarationContext
  if (Array.isArray(direct) && direct.length > 0) {
    return direct
  }

  return propositionSectionDetail.value?.overlapDeclarationContext ?? []
})
const propositionSectionCoordinatorDeclarationLabel = computed(() => {
  const detailDeclaration = propositionSectionDetail.value?.hasCoordinatorLicenseInGroup
  const metaDeclaration = event.value?.meta?.hasCoordinatorLicenseInGroup
  const declaration =
    typeof detailDeclaration === 'boolean'
      ? detailDeclaration
      : typeof metaDeclaration === 'boolean'
        ? metaDeclaration
        : null

  if (declaration === null) {
    return null
  }

  return declaration
    ? t('calendar.eventDetail.labels.coordinatorDeclarationYes')
    : t('calendar.eventDetail.labels.coordinatorDeclarationNo')
})

const overlapDeclarationLabel = (value: boolean | null) => {
  if (value === true) {
    return t('calendar.eventDetail.labels.coordinatorDeclarationYesShort')
  }
  if (value === false) {
    return t('calendar.eventDetail.labels.coordinatorDeclarationNoShort')
  }
  return t('calendar.eventDetail.labels.coordinatorDeclarationUnknownShort')
}

const linkedPropositionId = computed(() => {
  if (propositionSectionId.value !== null) {
    return propositionSectionId.value
  }
  if (isReservation.value) {
    const reservationDetailId = detailsAsReservation.value?.propositionId
    if (typeof reservationDetailId === 'number') {
      return reservationDetailId
    }
  }
  const metaId = event.value?.meta?.propositionId
  return typeof metaId === 'number' ? metaId : null
})

const canAccept = computed(() =>
  isProposition.value &&
  Boolean(event.value?.meta?.propositionId) &&
  (authStore.hasAnyRole([UserRoleEnum.ShootingRangeAdministrator, UserRoleEnum.ClubCommunityAdministrator]) ||
    authStore.hasAnyRangeRole([UserRoleEnum.ShootingRangeAdministrator])),
)

const isOwnProposition = computed(() =>
  isProposition.value &&
  typeof event.value?.meta?.userId === 'number' &&
  String(event.value?.meta?.userId) === authStore.user?.id,
)

const canCancel = computed(() =>
  Boolean(
    event.value &&
      event.value.type !== 'record' &&
      (
        authStore.hasAnyRole([UserRoleEnum.ShootingRangeAdministrator, UserRoleEnum.ClubCommunityAdministrator]) ||
        authStore.hasAnyRangeRole([UserRoleEnum.ShootingRangeAdministrator]) ||
        isOwnProposition.value
      ),
  ),
)

const emitUpdate = (value: boolean) => {
  emit('update:open', value)
}

const emitAccept = () => {
  if (event.value) {
    emit('accept', event.value)
  }
}

const emitCancel = () => {
  if (event.value) {
    emit('cancel', event.value)
  }
}

const emitReload = () => {
  if (event.value) {
    emit('reload-details', event.value)
  }
}
</script>
