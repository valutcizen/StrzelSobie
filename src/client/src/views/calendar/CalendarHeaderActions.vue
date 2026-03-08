<script setup lang="ts">
const props = defineProps<{
  rangeSlug: string
  canCreatePropositions: boolean
  canCreateReservations: boolean
  canManageRecords: boolean
}>()

const emit = defineEmits<{
  (event: 'propose'): void
  (event: 'reserve'): void
  (event: 'record'): void
}>()
</script>

<template>
  <v-card-title class="d-flex align-center justify-space-between flex-wrap gap-4">
    <div>
      <div class="text-h6">
        {{ $t('calendar.view.title') }}
      </div>
      <div class="text-caption text-medium-emphasis">
        {{ props.rangeSlug }}
      </div>
    </div>
    <div class="d-flex flex-wrap gap-2">
      <v-btn
        v-if="props.canCreatePropositions"
        color="secondary"
        variant="outlined"
        prepend-icon="mdi-target"
        data-testid="calendar-propose-slot-button"
        @click="emit('propose')"
      >
        {{ $t('calendar.view.proposeSlot') }}
      </v-btn>
      <v-btn
        v-if="props.canCreateReservations"
        color="primary"
        prepend-icon="mdi-calendar-plus"
        data-testid="calendar-new-reservation-button"
        @click="emit('reserve')"
      >
        {{ $t('calendar.view.newReservation') }}
      </v-btn>
      <v-btn
        v-if="props.canManageRecords"
        color="primary"
        variant="tonal"
        prepend-icon="mdi-clipboard-plus"
        data-testid="calendar-record-without-reservation-button"
        @click="emit('record')"
      >
        {{ $t('calendar.view.recordWithoutReservation') }}
      </v-btn>
    </div>
  </v-card-title>
</template>
