<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RangeParkingLocation } from '@strzel-sobie/common'
import RangeLocationPicker from './RangeLocationPicker.vue'

type ParkingLocation = RangeParkingLocation

type PickerLocation = {
  lat: number | null
  lng: number | null
}

const props = defineProps<{
  modelValue: boolean
  initialLocation?: ParkingLocation | null
  saving?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'save', value: ParkingLocation | null): void
}>()

const { t } = useI18n()

const location = ref<PickerLocation>({ lat: null, lng: null })

const syncFromProps = () => {
  location.value = {
    lat: props.initialLocation?.latitude ?? null,
    lng: props.initialLocation?.longitude ?? null,
  }
}

const normalizeCoordinate = (value: string | number | null): number | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  const trimmed = String(value).trim()
  if (trimmed === '') {
    return null
  }

  const numeric = Number(trimmed)
  return Number.isFinite(numeric) ? numeric : null
}

const updateFromPicker = (value: PickerLocation | null) => {
  location.value = {
    lat: value?.lat ?? null,
    lng: value?.lng ?? null,
  }
}

const updateLat = (value: string | number | null) => {
  location.value = {
    ...location.value,
    lat: normalizeCoordinate(value),
  }
}

const updateLng = (value: string | number | null) => {
  location.value = {
    ...location.value,
    lng: normalizeCoordinate(value),
  }
}

const isEmpty = computed(() => location.value.lat === null && location.value.lng === null)
const hasBoth = computed(
  () => typeof location.value.lat === 'number' && typeof location.value.lng === 'number',
)
const canSave = computed(() => isEmpty.value || hasBoth.value)

const currentLabel = computed(() => {
  if (hasBoth.value) {
    return t('admin.rangeSettings.parking.coordinates', {
      lat: location.value.lat,
      lng: location.value.lng,
    })
  }

  return t('admin.rangeSettings.parking.empty')
})

const close = () => emit('update:modelValue', false)

const clearLocation = () => {
  location.value = { lat: null, lng: null }
}

const save = () => {
  if (!canSave.value) {
    return
  }

  const payload =
    hasBoth.value && location.value.lat !== null && location.value.lng !== null
      ? {
          latitude: location.value.lat,
          longitude: location.value.lng,
        }
      : null

  emit('save', payload)
}

watch(
  () => props.initialLocation,
  () => syncFromProps(),
  { deep: true },
)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      syncFromProps()
    }
  },
)

syncFromProps()
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    max-width="840"
    data-testid="range-parking-modal"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('admin.rangeSettings.parking.modalTitle') }}</span>
        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          data-testid="range-parking-close-button"
          @click="close"
        />
      </v-card-title>

      <v-card-text>
        <v-alert
          type="info"
          variant="tonal"
          border="start"
          class="mb-4"
        >
          {{ t('admin.rangeSettings.parking.modalHint') }}
        </v-alert>

        <div class="d-flex align-center justify-space-between flex-wrap gap-2 mb-2">
          <p
            class="text-body-2 mb-0"
            data-testid="range-parking-current-value"
          >
            {{ currentLabel }}
          </p>

          <v-btn
            variant="text"
            size="small"
            prepend-icon="mdi-map-marker-off-outline"
            data-testid="range-parking-clear-button"
            @click="clearLocation"
          >
            {{ t('admin.rangeSettings.parking.clearAction') }}
          </v-btn>
        </div>

        <RangeLocationPicker
          :model-value="location"
          data-testid="range-parking-map"
          @update:model-value="updateFromPicker"
        />

        <v-row
          class="mt-3"
          dense
        >
          <v-col cols="12" md="6">
            <v-text-field
              :label="t('admin.rangeSettings.latitudeLabel')"
              type="number"
              inputmode="decimal"
              :model-value="location.lat ?? ''"
              data-testid="range-parking-latitude-input"
              @update:model-value="updateLat"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              :label="t('admin.rangeSettings.longitudeLabel')"
              type="number"
              inputmode="decimal"
              :model-value="location.lng ?? ''"
              data-testid="range-parking-longitude-input"
              @update:model-value="updateLng"
            />
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="justify-end">
        <v-btn
          variant="text"
          data-testid="range-parking-cancel-button"
          @click="close"
        >
          {{ t('admin.rangeSettings.parking.cancelAction') }}
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!canSave || saving"
          :loading="saving"
          data-testid="range-parking-save-button"
          @click="save"
        >
          {{ t('admin.rangeSettings.parking.saveAction') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.text-body-2 {
  line-height: 1.5;
}
</style>
