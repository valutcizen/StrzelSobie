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
          v-if="canJoin"
          color="primary"
          variant="tonal"
          @click="emitJoin"
        >
          Dołącz
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
import type { RangeEvent } from '../../types/calendar'

interface EventDetailDialogProps {
  open: boolean
  event: RangeEvent | null
}

const props = defineProps<EventDetailDialogProps>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  accept: [event: RangeEvent]
  cancel: [event: RangeEvent]
  join: [event: RangeEvent]
}>()

const authStore = useAuthStore()

const event = computed(() => props.event)

const isProposition = computed(() => event.value?.type === 'proposition')
const isReservation = computed(() => event.value?.type === 'reservation')
const tracksRequested = computed(() => event.value?.meta?.tracksRequested ?? null)
const participants = computed(() => {
  const value = event.value?.meta?.numParticipants
  return typeof value === 'number' ? value : null
})

const formattedStart = computed(() => {
  if (!event.value) return ''
  return format(parseISO(event.value.start), 'PPpp', { locale: pl })
})

const formattedEnd = computed(() => {
  if (!event.value) return ''
  return format(parseISO(event.value.end), 'PPpp', { locale: pl })
})

const canAccept = computed(() =>
  isProposition.value && Boolean(event.value?.meta?.propositionId) && authStore.hasAnyRole(['Coordinator']),
)
const canJoin = computed(() => isReservation.value && (event.value?.meta?.isOpenForJoining ?? false))
const canCancel = computed(() =>
  Boolean(event.value && event.value.type !== 'record' && authStore.hasAnyRole(['Coordinator', 'Shooting Range Administrator'])),
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

const emitJoin = () => {
  if (event.value) {
    emit('join', event.value)
  }
}
</script>
