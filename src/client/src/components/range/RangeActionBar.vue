<template>
  <v-sheet
    class="range-action-bar px-4 py-4"
    color="primary"
    variant="tonal"
    rounded="lg"
    data-testid="range-action-bar"
  >
    <div class="d-flex flex-column flex-md-row align-md-center justify-space-between gap-3">
      <div>
        <p class="text-subtitle-1 mb-1">
          {{ headline }}
        </p>
        <p
          v-if="!allowsReservations"
          class="text-body-2 text-medium-emphasis mb-0"
        >
          {{ t('range.actionBar.unavailableHint') }}
        </p>
      </div>
      <div class="d-flex flex-column flex-sm-row gap-2">
        <v-btn
          color="primary"
          :disabled="!allowsReservations"
          prepend-icon="mdi-calendar-clock"
          data-testid="range-open-calendar-button"
          @click="$emit('open-calendar')"
        >
          {{ t('range.actionBar.openCalendar') }}
        </v-btn>
        <v-btn
          variant="text"
          prepend-icon="mdi-map-outline"
          data-testid="range-back-to-map-button"
          @click="$emit('back-to-map')"
        >
          {{ t('range.actionBar.backToMap') }}
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="!allowsReservations"
      type="info"
      variant="tonal"
      border="start"
      class="mt-3 mb-0"
    >
      {{ unavailableCopy }}
    </v-alert>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RangeDetails } from '@/types/range'

interface Props {
  allowsReservations: boolean
  rangeType: RangeDetails['type']
}

defineEmits<{
  (event: 'open-calendar'): void
  (event: 'back-to-map'): void
}>()

const props = defineProps<Props>()
const { t } = useI18n()

const unavailableCopy = computed(() => {
  if (props.rangeType === 'ally') {
    return t('range.actionBar.unavailableAlly')
  }
  if (props.rangeType === 'coming-soon') {
    return t('range.actionBar.unavailableComingSoon')
  }
  return t('range.actionBar.unavailableGeneric')
})

const headline = computed(() => {
  if (props.allowsReservations) {
    return t('range.actionBar.available')
  }

  return unavailableCopy.value
})
</script>

<style scoped>
.range-action-bar {
  border: 1px solid rgba(25, 118, 210, 0.14);
}
</style>
