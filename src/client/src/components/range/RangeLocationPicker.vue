<template>
  <div class="location-picker">
    <div
      ref="mapContainer"
      class="location-picker__map"
      data-testid="range-settings-location-map"
    />
  </div>
</template>

<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import L, { type Map, type Marker } from 'leaflet'

interface Coords {
  lat: number | null
  lng: number | null
}

const props = defineProps<{
  modelValue: Coords | null
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', value: Coords | null): void
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const mapInstance = ref<Map | null>(null)
let marker: Marker | null = null

const DEFAULT_CENTER: [number, number] = [52.0, 19.5]
const DEFAULT_ZOOM = 6

const createMap = () => {
  if (mapInstance.value || !mapContainer.value) return

  mapInstance.value = L.map(mapContainer.value, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    worldCopyJump: true,
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapInstance.value)

  mapInstance.value.on('click', (event) => {
    const { lat, lng } = event.latlng
    emit('update:modelValue', { lat, lng })
    setMarker(lat, lng)
  })

  mapInstance.value.on('zoom', () => marker?.update())
  mapInstance.value.on('resize', () => mapInstance.value?.invalidateSize())
}

const setMarker = (lat: number, lng: number) => {
  if (!mapInstance.value) return

  if (!marker) {
    marker = L.marker([lat, lng], { draggable: true })
    marker.on('dragend', () => {
      const pos = marker?.getLatLng()
      if (!pos) return
      emit('update:modelValue', { lat: pos.lat, lng: pos.lng })
    })
    marker.addTo(mapInstance.value)
  } else {
    marker.setLatLng([lat, lng])
  }
}

const removeMarker = () => {
  marker?.remove()
  marker = null
}

const syncFromModel = () => {
  if (!mapInstance.value) return
  if (props.modelValue?.lat != null && props.modelValue?.lng != null) {
    const { lat, lng } = props.modelValue
    setMarker(lat, lng)
    mapInstance.value.setView([lat, lng], Math.max(mapInstance.value.getZoom(), 11))
  } else {
    removeMarker()
    mapInstance.value.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
  }
}

onMounted(() => {
  createMap()
  syncFromModel()
})

onBeforeUnmount(() => {
  mapInstance.value?.remove()
  removeMarker()
})

watch(
  () => props.modelValue,
  () => {
    if (!mapInstance.value) {
      createMap()
    }
    syncFromModel()
  },
  { deep: true },
)
</script>

<style scoped>
.location-picker {
  border: 1px solid rgba(25, 118, 210, 0.18);
  border-radius: 12px;
  overflow: hidden;
}

.location-picker__map {
  width: 100%;
  height: 320px;
}
</style>
