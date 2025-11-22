<template>
  <v-sheet
    class="range-map"
    rounded="lg"
    elevation="1"
    data-testid="range-map"
  >
    <div
      ref="mapContainer"
      class="range-map__frame"
    />
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
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import L, { type DivIcon, type Map, type Marker } from 'leaflet'
import type { RangeSummary } from '@/types/range'

interface Props {
  ranges: RangeSummary[]
  selectedSlug?: string | null
}

const emit = defineEmits<{
  (event: 'select', slug: string): void
}>()

const props = defineProps<Props>()
const { t } = useI18n()

const mapContainer = ref<HTMLDivElement | null>(null)
const mapInstance = ref<Map | null>(null)
const markers: Record<string, Marker> = {}

const POLAND_BOUNDS = {
  latMin: 49.0,
  latMax: 54.8,
  lngMin: 14.07,
  lngMax: 24.15,
}

const DEFAULT_CENTER: [number, number] = [(POLAND_BOUNDS.latMin + POLAND_BOUNDS.latMax) / 2, 19.5]

const typeStyleMap: Record<string, { color: string; icon: string }> = {
  club: { color: '#43a047', icon: 'mdi-target' },
  ally: { color: '#0288d1', icon: 'mdi-handshake' },
  'coming-soon': { color: '#f59e0b', icon: 'mdi-progress-clock' },
}

const hasMarkers = computed(() => props.ranges.some((range) => isFinite(range.latitude ?? NaN) && isFinite(range.longitude ?? NaN)))

const clearMarkers = () => {
  Object.values(markers).forEach((marker) => marker.remove())
  for (const key of Object.keys(markers)) {
    delete markers[key]
  }
}

const destroyMap = () => {
  if (!mapInstance.value) return
  mapInstance.value.off()
  mapInstance.value.remove()
  mapInstance.value = null
  clearMarkers()
}

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

const createMap = async () => {
  if (mapInstance.value || !mapContainer.value) {
    return
  }

  mapInstance.value = L.map(mapContainer.value, {
    center: DEFAULT_CENTER,
    zoom: 6,
    worldCopyJump: true,
    zoomAnimation: false,
    markerZoomAnimation: false,
  })

  mapInstance.value.on('resize', () => {
    mapInstance.value?.invalidateSize()
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapInstance.value as Map)

  syncMarkers()
  await nextTick()
  requestAnimationFrame(() => mapInstance.value?.invalidateSize())
}

const syncMarkers = () => {
  if (!mapInstance.value) return

  clearMarkers()

  const bounds = L.latLngBounds([])

  props.ranges
    .filter((range) => typeof range.latitude === 'number' && typeof range.longitude === 'number')
    .forEach((range) => {
      const isSelected = range.slug === props.selectedSlug
      const marker = L.marker([range.latitude as number, range.longitude as number], {
        icon: createIcon(range, isSelected),
      })

      marker.on('click', () => emit('select', range.slug))
      marker.bindTooltip(range.displayName, {
        direction: 'top',
        offset: L.point(0, -4),
        opacity: 0.95,
        className: 'range-map__tooltip',
        permanent: false,
        sticky: false,
      })
      marker.addTo(mapInstance.value as Map)
      marker.setZIndexOffset(isSelected ? 800 : 200)
      markers[range.slug] = marker
      bounds.extend([range.latitude as number, range.longitude as number])
    })

  if (bounds.isValid()) {
    mapInstance.value.fitBounds(bounds.pad(0.2), { maxZoom: 12 })
  } else {
    mapInstance.value.setView(DEFAULT_CENTER, 6)
  }
}

onMounted(() => {
  createMap()
})

onBeforeUnmount(() => {
  destroyMap()
})

onActivated(() => {
  nextTick(() => {
    mapInstance.value?.invalidateSize()
  })
})

watch(
  () => props.ranges,
  () => {
    if (!mapInstance.value) {
      return
    }
    syncMarkers()
  },
  { deep: true },
)

watch(
  () => props.selectedSlug,
  (newSlug, oldSlug) => {
    if (!mapInstance.value) {
      return
    }

    if (oldSlug && markers[oldSlug]) {
      const oldRange = props.ranges.find((r) => r.slug === oldSlug)
      if (oldRange) {
        markers[oldSlug].setIcon(createIcon(oldRange, false))
        markers[oldSlug].setZIndexOffset(200)
      }
    }

    if (newSlug && markers[newSlug]) {
      const newRange = props.ranges.find((r) => r.slug === newSlug)
      if (newRange) {
        markers[newSlug].setIcon(createIcon(newRange, true))
        markers[newSlug].setZIndexOffset(1000)
        mapInstance.value.setView(markers[newSlug].getLatLng(), Math.max(mapInstance.value.getZoom(), 8))
      }
    }
  },
)
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
