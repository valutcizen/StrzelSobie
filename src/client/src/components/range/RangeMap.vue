<template>
  <v-sheet
    class="range-map"
    rounded="lg"
    elevation="1"
    data-testid="range-map"
  >
    <div class="range-map__frame">
      <l-map
        ref="mapRef"
        v-model:zoom="zoom"
        :center="center"
        :use-global-leaflet="false"
        :options="{ zoomAnimation: true, markerZoomAnimation: true }"
        @ready="onMapReady"
      >
        <l-tile-layer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          layer-type="base"
          name="OpenStreetMap"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
        />

        <l-marker
          v-for="range in validRanges"
          :key="range.slug"
          :lat-lng="[range.latitude!, range.longitude!]"
          :icon="createIcon(range, range.slug === selectedSlug) as L.Icon"
          :z-index-offset="getMarkerZIndex(range, range.slug === selectedSlug)"
          @click="() => emit('select', range.slug)"
        >
          <l-tooltip
            :options="{ direction: 'top', offset: L.point(0, -4), opacity: 0.95, className: 'range-map__tooltip', permanent: false, sticky: false }"
          >
            {{ range.displayName }}
          </l-tooltip>
        </l-marker>
      </l-map>
    </div>
    <div
      v-if="!hasMarkers"
      class="range-map__empty"
    >
      {{ t('rangeDirectory.map.empty') }}
    </div>
  </v-sheet>
</template>

<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import L, { type DivIcon, type Map } from 'leaflet'
import type { RangeSummary } from '@/types/range'
import {
  LMap,
  LTileLayer,
  LMarker,
  LTooltip,
} from '@vue-leaflet/vue-leaflet'

interface Props {
  ranges: RangeSummary[]
  selectedSlug?: string | null
}

const emit = defineEmits<{
  (event: 'select', slug: string): void
}>()

const props = defineProps<Props>()
const { t } = useI18n()

const mapRef = ref<InstanceType<typeof LMap> | null>(null)
const mapInstance = ref<Map | null>(null)

const POLAND_BOUNDS = {
  latMin: 49.0,
  latMax: 54.8,
  lngMin: 14.07,
  lngMax: 24.15,
}

const zoom = ref(6)
const center = ref<[number, number]>([(POLAND_BOUNDS.latMin + POLAND_BOUNDS.latMax) / 2, 19.5])

const typeStyleMap: Record<string, { color: string; icon: string }> = {
  club: { color: '#43a047', icon: 'mdi-target' },
  ally: { color: '#0288d1', icon: 'mdi-handshake' },
  'coming-soon': { color: '#f59e0b', icon: 'mdi-progress-clock' },
}

const validRanges = computed(() =>
  props.ranges.filter((range) => typeof range.latitude === 'number' && typeof range.longitude === 'number'),
)
const hasMarkers = computed(() => validRanges.value.length > 0)

const createIcon = (range: RangeSummary, isSelected: boolean): DivIcon => {
  const style = typeStyleMap[range.type] ?? { color: '#1976d2', icon: 'mdi-map-marker' }
  const size = 34
  const border = '2px'
  const shadow = isSelected ? '0 6px 14px rgba(0, 0, 0, 0.25)' : '0 4px 10px rgba(0, 0, 0, 0.18)'

  const svg = `
    <div style="width:${size}px;height:${size + 6}px;position: relative;">
      <div style="
        width:${size}px;
        height:${size}px;
        background: white;
        border:${border} solid ${style.color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow:${shadow};
        display:flex;
        align-items:center;
        justify-content:center;
      ">
        <span style="
          transform: rotate(45deg);
          font-size:18px;
          color:${style.color};
          font-family: 'Material Design Icons';
        " class="mdi ${style.icon}"></span>
      </div>
    </div>
  `

  return L.divIcon({
    html: svg,
    className: 'leaflet-div-icon range-map__pin',
    iconSize: [size, size + 6],
    iconAnchor: [size / 2, size + 6],
  })
}

const getMarkerZIndex = (range: RangeSummary, isSelected: boolean): number => {
  let baseZIndex = 0
  switch (range.type) {
    case 'club':
      baseZIndex = 300
      break
    case 'ally':
      baseZIndex = 200
      break
    case 'coming-soon':
      baseZIndex = 100
      break
    default:
      baseZIndex = 150 // Default for unknown types
  }

  return isSelected ? baseZIndex + 700 : baseZIndex // Selected marker always on top
}

const onMapReady = () => {
  mapInstance.value = mapRef.value?.leafletObject as L.Map ?? null
  if (mapInstance.value) {
    fitBoundsToMarkers()
  }
}

const fitBoundsToMarkers = () => {
  if (!mapInstance.value || validRanges.value.length === 0) {
    return
  }
  const bounds = L.latLngBounds(validRanges.value.map((r) => [r.latitude as number, r.longitude as number]))
  if (bounds.isValid()) {
    mapInstance.value.fitBounds(bounds.pad(0.2), { maxZoom: 12 })
  }
}

watch(() => props.ranges, () => {
  nextTick(() => {
    fitBoundsToMarkers()
  })
}, { deep: true })

watch(() => props.selectedSlug, (newSlug) => {
  if (!mapInstance.value || !newSlug) return

  const range = validRanges.value.find((r) => r.slug === newSlug)
  if (range) {
    mapInstance.value.setView([range.latitude as number, range.longitude as number], Math.max(mapInstance.value.getZoom(), 8))
  }
})

</script>

<style scoped>
.range-map {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(25, 118, 210, 0.18);
}

.range-map__frame {
  position: relative;
  width: 100%;
  height: 520px;
  z-index: 1;
}

.range-map__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #4b5563;
  font-weight: 500;
  pointer-events: none;
}

:deep(.range-map__tooltip) {
  background-color: rgba(31, 41, 55, 0.92);
  color: white;
  border-radius: 6px;
  border: none;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

:deep(.range-map__tooltip .leaflet-tooltip-tip) {
  display: none;
}

:deep(.range-map__pin.leaflet-div-icon) {
  background: transparent;
  border: none;
  box-shadow: none;
}
</style>