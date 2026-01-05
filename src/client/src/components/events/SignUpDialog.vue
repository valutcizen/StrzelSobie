<template>
  <v-dialog
    :model-value="open"
    max-width="420"
    data-testid="event-signup-dialog"
    @update:model-value="emit('update:open', $event)"
  >
    <v-card>
      <v-card-title>{{ t('events.signup.title') }}</v-card-title>
      <v-card-text>
        <p class="text-body-2 mb-4">
          {{ t('events.signup.prompt', { name: eventName }) }}
        </p>

        <v-text-field
          v-if="allowsGuests"
          v-model.number="guests"
          type="number"
          min="0"
          :label="t('events.signup.guestsLabel')"
          data-testid="event-signup-guests-input"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          data-testid="event-signup-cancel-button"
          @click="emit('update:open', false)"
        >
          {{ t('common.actions.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          data-testid="event-signup-confirm-button"
          @click="confirm"
        >
          {{ t('common.actions.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { EventGuestPolicy } from '@strzel-sobie/common/models'

const props = defineProps<{
  open: boolean
  eventName: string
  guestPolicy: EventGuestPolicy | null
  loading?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
  (event: 'confirm', payload: { guests: number }): void
}>()

const { t } = useI18n()
const guests = ref(0)

const allowsGuests = computed(() => props.guestPolicy === EventGuestPolicy.GuestsAllowed)

watch(
  () => props.open,
  (open) => {
    if (open) {
      guests.value = 0
    }
  },
)

const confirm = () => {
  emit('confirm', { guests: allowsGuests.value ? Math.max(0, guests.value) : 0 })
}
</script>
