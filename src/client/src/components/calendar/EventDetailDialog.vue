<template>
  <v-dialog
    :model-value="open"
    max-width="560"
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
          <v-list-item v-if="tracksRequested">
            <template #prepend>
              <v-icon>mdi-target</v-icon>
            </template>
            <v-list-item-title>{{ tracksRequested }} torów</v-list-item-title>
          </v-list-item>
          <v-list-item v-if="isProposition">
            <template #prepend>
              <v-icon>mdi-account</v-icon>
            </template>
            <v-list-item-title>
              {{ event.meta?.isMember ? 'Zgłoszenie członka' : 'Zgłoszenie gościa' }}
            </v-list-item-title>
          </v-list-item>
          <v-list-item v-if="isReservation">
            <template #prepend>
              <v-icon>mdi-shield-check</v-icon>
            </template>
            <v-list-item-title>
              {{ event.meta?.isPublic ? 'Rezerwacja publiczna' : 'Rezerwacja prywatna' }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="event.meta?.isOpenForJoining">
              Otwarta na dołączenie
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item v-if="participants">
            <template #prepend>
              <v-icon>mdi-account-group</v-icon>
            </template>
            <v-list-item-title>{{ participants }} uczestników</v-list-item-title>
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
              @click="emitReload"
            >
              Spróbuj ponownie
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
                <v-list-subheader>Rezerwacja</v-list-subheader>
                <v-list-item v-if="coordinatorDisplay">
                  <template #prepend>
                    <v-icon>mdi-account-tie</v-icon>
                  </template>
                  <v-list-item-title>{{ coordinatorDisplay.title }}</v-list-item-title>
                  <v-list-item-subtitle v-if="coordinatorDisplay.subtitle">
                    {{ coordinatorDisplay.subtitle }}
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item v-if="reservationVisibilityLabel">
                  <template #prepend>
                    <v-icon>mdi-eye-outline</v-icon>
                  </template>
                  <v-list-item-title>{{ reservationVisibilityLabel }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="reservationJoinableLabel">
                  <template #prepend>
                    <v-icon>mdi-account-plus</v-icon>
                  </template>
                  <v-list-item-title>{{ reservationJoinableLabel }}</v-list-item-title>
                </v-list-item>
                <v-list-item v-if="linkedPropositionId !== null">
                  <template #prepend>
                    <v-icon>mdi-link-variant</v-icon>
                  </template>
                  <v-list-item-title>
                    Powiązana propozycja #{{ linkedPropositionId }}
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
                  <v-list-item-subtitle>Data utworzenia</v-list-item-subtitle>
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
                <v-list-subheader>Propozycja</v-list-subheader>
                <v-list-item v-if="!hasReservationSection && linkedPropositionId !== null">
                  <template #prepend>
                    <v-icon>mdi-link-variant</v-icon>
                  </template>
                  <v-list-item-title>
                    Propozycja #{{ linkedPropositionId }}
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
                <v-list-item v-if="propositionSectionTracksRequested !== null">
                  <template #prepend>
                    <v-icon>mdi-target</v-icon>
                  </template>
                  <v-list-item-title>
                    Zapotrzebowanie: {{ propositionSectionTracksRequested }} torów
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="propositionSectionParticipants !== null">
                  <template #prepend>
                    <v-icon>mdi-account-group</v-icon>
                  </template>
                  <v-list-item-title>
                    Uczestnicy: {{ propositionSectionParticipants }}
                  </v-list-item-title>
                </v-list-item>
                <v-list-item v-if="propositionSectionCreatedAt">
                  <template #prepend>
                    <v-icon>mdi-calendar-clock</v-icon>
                  </template>
                  <v-list-item-title>{{ propositionSectionCreatedAt }}</v-list-item-title>
                  <v-list-item-subtitle>Data zgłoszenia</v-list-item-subtitle>
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
          @click="emitUpdate(false)"
        >
          Zamknij
        </v-btn>
        <v-btn
          v-if="canAccept"
          color="primary"
          @click="emitAccept"
        >
          Akceptuj
        </v-btn>
        <v-btn
          v-if="canCancel"
          color="error"
          variant="tonal"
          @click="emitCancel"
        >
          Anuluj
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { useAuthStore } from '../../stores/auth'
import { UserRoleEnum } from '../../types/auth'
import type {
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

const detailTracksRequested = computed(() => {
  const detail = details.value
  if (!detail) return null
  return typeof detail.tracksRequested === 'number' ? detail.tracksRequested : null
})

const detailParticipants = computed(() => {
  const detail = details.value
  if (!detail) return null
  return typeof detail.numParticipants === 'number' ? detail.numParticipants : null
})

const tracksRequested = computed(() => {
  if (detailTracksRequested.value !== null) {
    return detailTracksRequested.value
  }
  const metaValue = event.value?.meta?.tracksRequested
  return typeof metaValue === 'number' ? metaValue : null
})

const participants = computed(() => {
  if (detailParticipants.value !== null) {
    return detailParticipants.value
  }
  const metaValue = event.value?.meta?.numParticipants
  return typeof metaValue === 'number' ? metaValue : null
})

const formattedStart = computed(() => {
  if (!event.value) return ''
  return format(parseISO(event.value.start), 'PPpp', { locale: pl })
})

const formattedEnd = computed(() => {
  if (!event.value) return ''
  return format(parseISO(event.value.end), 'PPpp', { locale: pl })
})

const formatDateTime = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }
  try {
    return format(parseISO(value), 'PPpp', { locale: pl })
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
      return 'Status: oczekuje na akceptację'
    case 'converted':
      return 'Status: przekształcona w rezerwację'
    case 'cancelled':
      return 'Status: wycofana'
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
    person.displayName ?? person.email ?? (person.id !== null ? `Użytkownik #${person.id}` : null)
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

const coordinatorDisplay = computed(() =>
  formatPerson(detailsAsReservation.value?.coordinator ?? null),
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

const propositionSectionTracksRequested = computed(() => {
  const value = propositionSectionDetail.value?.tracksRequested
  return typeof value === 'number' ? value : null
})

const propositionSectionParticipants = computed(() => {
  const value = propositionSectionDetail.value?.numParticipants
  return typeof value === 'number' ? value : null
})

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

const reservationVisibilityLabel = computed(() => {
  const detail = detailsAsReservation.value
  if (!detail || detail.isPublic === null) {
    return null
  }
  return detail.isPublic ? 'Widoczność: publiczna' : 'Widoczność: prywatna'
})

const reservationJoinableLabel = computed(() => {
  const detail = detailsAsReservation.value
  if (!detail || detail.isJoinable === null) {
    return null
  }
  return detail.isJoinable ? 'Otwarta na dołączenie' : 'Tylko dla zapisanych'
})

const canAccept = computed(() =>
  isProposition.value &&
  Boolean(event.value?.meta?.propositionId) &&
  authStore.hasAnyRole([UserRoleEnum.Coordinator]),
)
const canCancel = computed(() =>
  Boolean(
    event.value &&
      event.value.type !== 'record' &&
      authStore.hasAnyRole([UserRoleEnum.Coordinator, UserRoleEnum.ShootingRangeAdministrator]),
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
