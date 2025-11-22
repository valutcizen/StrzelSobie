<template>
  <v-sheet
    class="range-map"
    rounded="lg"
    elevation="1"
    data-testid="range-map"
  >
    <div class="range-map__canvas">
      <div class="range-map__overlay" />
      <div
        v-for="marker in markers"
        :key="marker.slug"
        class="range-map__marker"
        :class="[{ 'range-map__marker--selected': marker.slug === selectedSlug }, marker.className]"
        :style="marker.style"
      >
        <v-btn
          size="small"
          icon="mdi-map-marker"
          variant="flat"
          :color="marker.color"
          :aria-label="marker.label"
          data-testid="range-map-marker"
          @click="$emit('select', marker.slug)"
        />
        <div class="range-map__label">
          {{ marker.label }}
        </div>
      </div>

      <div
        v-if="markers.length === 0"
        class="range-map__empty"
      >
        {{ t('rangeDirectory.map.empty') }}
      </div>
    </div>
  </v-sheet>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RangeSummary } from '@/types/range'

interface Props {
  ranges: RangeSummary[]
  selectedSlug?: string | null
}

defineEmits<{
  (event: 'select', slug: string): void
}>()

const props = defineProps<Props>()
const { t } = useI18n()

const POLAND_BOUNDS = {
  latMin: 49.0,
  latMax: 54.8,
  lngMin: 14.07,
  lngMax: 24.15,
}

const typeColorMap: Record<string, string> = {
  club: 'success',
  ally: 'info',
  'coming-soon': 'warning',
}

const markers = computed(() => {
  const latRange = POLAND_BOUNDS.latMax - POLAND_BOUNDS.latMin
  const lngRange = POLAND_BOUNDS.lngMax - POLAND_BOUNDS.lngMin

  return props.ranges
    .filter((range) => typeof range.latitude === 'number' && typeof range.longitude === 'number')
    .map((range) => {
      const x = ((range.longitude! - POLAND_BOUNDS.lngMin) / lngRange) * 100
      const y = (1 - (range.latitude! - POLAND_BOUNDS.latMin) / latRange) * 100

      return {
        slug: range.slug,
        label: range.displayName,
        color: typeColorMap[range.type] ?? 'primary',
        className: `range-map__marker--${range.type}`,
        style: {
          left: `${x}%`,
          top: `${y}%`,
        },
      }
    })
})
</script>

<style scoped>
.range-map {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #dbeafe, #f5f5f5);
  border: 1px solid rgba(25, 118, 210, 0.18);
}

.range-map__canvas {
  position: relative;
  width: 100%;
  height: 420px;
  background: radial-gradient(circle at 30% 30%, rgba(25, 118, 210, 0.14), transparent 38%),
    radial-gradient(circle at 70% 60%, rgba(14, 165, 233, 0.18), transparent 42%);
}

.range-map__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(0deg, rgba(255, 255, 255, 0.25), transparent 35%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.16), transparent 30%);
  pointer-events: none;
}

.range-map__marker {
  position: absolute;
  transform: translate(-50%, -50%);
  text-align: center;
  transition: transform 0.2s ease, filter 0.2s ease;
}

.range-map__marker--selected {
  transform: translate(-50%, -50%) scale(1.06);
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.12));
}

.range-map__marker--coming-soon .v-btn {
  animation: pulse 2.4s ease-in-out infinite;
}

.range-map__label {
  margin-top: 4px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  white-space: nowrap;
}

.range-map__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #4b5563;
  font-weight: 500;
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
  100% {
    transform: scale(1);
  }
}
</style>
