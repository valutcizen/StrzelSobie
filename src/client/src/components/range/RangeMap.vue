<template>
  <v-sheet
    class="range-map"
    rounded="lg"
    elevation="1"
    data-testid="range-map"
  >
    <div
      v-if="$slots.controls"
      class="range-map__controls"
    >
      <slot name="controls" />
    </div>
    <div class="range-map__frame">
      <div
        ref="mapElementRef"
        class="range-map__canvas"
      />
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
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { computed, ref, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import L, { type DivIcon, type Map as LeafletMap } from 'leaflet'
import type { RangeSummary } from '@/types/range'
import type { RangeType } from '@strzel-sobie/common'

interface Props {
  ranges: RangeSummary[]
  selectedSlug?: string | null
}

const emit = defineEmits<{
  (event: 'select', slug: string): void
}>()

const props = defineProps<Props>()
const { t } = useI18n()

const mapElementRef = ref<HTMLElement | null>(null)
const mapInstance = ref<LeafletMap | null>(null)
const markerClusterLayer = ref<L.LayerGroup | null>(null)
const markerClusterPluginPromise = ref<Promise<void> | null>(null)
const mapResizeObserver = ref<ResizeObserver | null>(null)
const mapClusterClickHandler = ref<((event: L.LeafletEvent) => void) | null>(null)

const POLAND_BOUNDS = {
  latMin: 49.0,
  latMax: 54.8,
  lngMin: 14.07,
  lngMax: 24.15,
}

const polandLeafletBounds = L.latLngBounds(
  [POLAND_BOUNDS.latMin, POLAND_BOUNDS.lngMin],
  [POLAND_BOUNDS.latMax, POLAND_BOUNDS.lngMax],
)

const POLAND_INTERACTION_PADDING = {
  north: 0.9,
  south: 0.2,
  west: 0.2,
  east: 0.2,
}

const polandInteractionBounds = L.latLngBounds(
  [POLAND_BOUNDS.latMin - POLAND_INTERACTION_PADDING.south, POLAND_BOUNDS.lngMin - POLAND_INTERACTION_PADDING.west],
  [POLAND_BOUNDS.latMax + POLAND_INTERACTION_PADDING.north, POLAND_BOUNDS.lngMax + POLAND_INTERACTION_PADDING.east],
)

type MarkerWithRangeType = L.Marker & {
  options: L.MarkerOptions & { rangeType?: RangeType }
}

const createDefaultLogoDataUri = (svgContent: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${svgContent}</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const DEFAULT_CLUB_LOGO = createDefaultLogoDataUri(
  '<rect width="80" height="80" rx="20" fill="#1f2937"/><circle cx="40" cy="40" r="23" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="40" cy="40" r="13" fill="none" stroke="#ffffff" stroke-width="6"/><circle cx="40" cy="40" r="4.5" fill="#ffffff"/>',
)

const typeStyleMap: Record<RangeType, { bgColor: string; logoUrl?: string; iconClass?: string; iconColor?: string; innerBgColor?: string }> = {
  club: { bgColor: '#2e7d32', logoUrl: DEFAULT_CLUB_LOGO },
  ally: { bgColor: '#1565c0', iconClass: 'mdi mdi-handshake-outline', iconColor: '#0d47a1', innerBgColor: '#dbeafe' },
  'coming-soon': { bgColor: '#ef6c00', logoUrl: DEFAULT_CLUB_LOGO },
  meetup: { bgColor: '#00695c', logoUrl: DEFAULT_CLUB_LOGO },
  office: { bgColor: '#00897b', logoUrl: DEFAULT_CLUB_LOGO },
}

const validRanges = computed(() =>
  props.ranges.filter(
    (range) => Number.isFinite(range.latitude) && Number.isFinite(range.longitude),
  ),
)
const hasMarkers = computed(() => validRanges.value.length > 0)

const normalizeRangeType = (value: string | undefined): RangeType => {
  if (value === 'club' || value === 'ally' || value === 'coming-soon' || value === 'meetup' || value === 'office') {
    return value
  }

  return 'club'
}

const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const getRangeLogoUrl = (range: RangeSummary, type: RangeType): string => {
  const customLogo = typeof range.extras?.mapLogoUrl === 'string' ? range.extras.mapLogoUrl.trim() : ''
  if (customLogo.length > 0) {
    return customLogo
  }
  return typeStyleMap[type].logoUrl ?? DEFAULT_CLUB_LOGO
}

const hasCustomRangeLogo = (range: RangeSummary): boolean =>
  typeof range.extras?.mapLogoUrl === 'string' && range.extras.mapLogoUrl.trim().length > 0

const hasApproximateLocation = (range: RangeSummary): boolean => range.extras?.approximateLocation ?? false

const createIcon = (range: RangeSummary, isSelected: boolean): DivIcon => {
  const type = normalizeRangeType(range.type)
  const style = typeStyleMap[type]
  const logoUrl = escapeHtmlAttribute(getRangeLogoUrl(range, type))
  const size = 80
  const shadow = isSelected ? '0 10px 24px rgba(0, 0, 0, 0.32)' : '0 7px 18px rgba(0, 0, 0, 0.25)'
  const centerContent = hasCustomRangeLogo(range) || !style.iconClass
    ? `<img src="${logoUrl}" alt="" width="56" height="56" style="display:block; object-fit:cover; border-radius:50%;" />`
    : `<i class="${style.iconClass}" style="font-size:36px; color:${style.iconColor ?? '#1f2937'}; line-height:1;"></i>`
  const innerBgColor = style.innerBgColor ?? 'rgba(255,255,255,0.97)'
  const isApproximateLocation = hasApproximateLocation(range)

  const pin = isApproximateLocation
    ? `
      <div style="width:${size}px;height:${size}px;position: relative;">
        <div style="
          width:${size}px;
          height:${size}px;
          background: ${style.bgColor};
          border:2px solid #ffffff;
          border-radius: 50%;
          box-shadow:${shadow};
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        ">
          <div style="width:60px; height:60px; border-radius:50%; background:${innerBgColor}; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            ${centerContent}
          </div>
        </div>
      </div>
    `
    : `
      <div style="width:${size}px;height:${size + 6}px;position: relative;">
        <div style="
          width:${size}px;
          height:${size}px;
          background: ${style.bgColor};
          border:2px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow:${shadow};
          display:flex;
          align-items:center;
          justify-content:center;
          overflow:hidden;
        ">
          <div style="transform: rotate(45deg); width:60px; height:60px; border-radius:50%; background:${innerBgColor}; display:flex; align-items:center; justify-content:center; overflow:hidden;">
            ${centerContent}
          </div>
        </div>
      </div>
    `

  return L.divIcon({
    html: pin,
    className: 'leaflet-div-icon range-map__pin',
    iconSize: isApproximateLocation ? [size, size] : [size, size + 12],
    iconAnchor: isApproximateLocation ? [size / 2, size / 2] : [size / 2, size + 12],
  })
}

const getMarkerZIndex = (range: RangeSummary, isSelected: boolean): number => {
  let baseZIndex = 0
  switch (normalizeRangeType(range.type)) {
    case 'club':
      baseZIndex = 300
      break
    case 'ally':
      baseZIndex = 200
      break
    case 'coming-soon':
      baseZIndex = 100
      break
    case 'meetup':
      baseZIndex = 250
      break
    case 'office':
      baseZIndex = 280
      break
    default:
      baseZIndex = 150 // Default for unknown types
  }

  return isSelected ? baseZIndex + 700 : baseZIndex // Selected marker always on top
}

const createClusterIcon = (cluster: L.MarkerCluster): DivIcon => {
  const markers = cluster.getAllChildMarkers() as MarkerWithRangeType[]
  const byType = markers.reduce<Record<RangeType, number>>(
    (acc, marker) => {
      const type = normalizeRangeType(marker.options.rangeType)
      acc[type] += 1
      return acc
    },
    { club: 0, ally: 0, 'coming-soon': 0, meetup: 0, office: 0 },
  )

  const dominantType = (Object.entries(byType) as Array<[RangeType, number]>)
    .sort((a, b) => b[1] - a[1])[0][0]

  const count = cluster.getChildCount()
  const size = count < 10 ? 44 : count < 100 ? 50 : 56

  return L.divIcon({
    html: `
      <div style="
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        background:${typeStyleMap[dominantType].bgColor};
        border:3px solid rgba(255,255,255,0.95);
        box-shadow:0 10px 24px rgba(0,0,0,0.22);
        color:#ffffff;
        font-weight:700;
        font-size:${count < 10 ? 16 : 15}px;
        display:flex;
        align-items:center;
        justify-content:center;
      ">${count}</div>
    `,
    className: 'range-map__cluster',
    iconSize: [size, size],
  })
}

const ensureMarkerClusterPlugin = async () => {
  if (typeof L.markerClusterGroup === 'function') {
    return
  }

  if (!markerClusterPluginPromise.value) {
    markerClusterPluginPromise.value = (async () => {
      ;(window as unknown as { L?: typeof L }).L = L
      await import('leaflet.markercluster')
    })()
  }

  try {
    await markerClusterPluginPromise.value
  } catch (error) {
    console.warn('Failed to load leaflet.markercluster plugin, falling back to plain markers.', error)
  }
}

const ensureClusterLayer = () => {
  if (!mapInstance.value || markerClusterLayer.value) {
    return
  }

  if (typeof L.markerClusterGroup === 'function') {
    const clusterLayer = L.markerClusterGroup({
      animate: false,
      animateAddingMarkers: false,
      maxClusterRadius: 88,
      disableClusteringAtZoom: 11,
      spiderfyOnMaxZoom: false,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: false,
      iconCreateFunction: createClusterIcon,
    })

    mapClusterClickHandler.value = (event: L.LeafletEvent) => {
      if (!mapInstance.value) {
        return
      }

      const cluster = (event as unknown as { layer?: L.MarkerCluster }).layer
      if (!cluster) {
        return
      }

      const nextZoom = Math.min(mapInstance.value.getZoom() + 2, 16)
      mapInstance.value.setView(cluster.getLatLng(), nextZoom, { animate: false })
    }

    clusterLayer.on('clusterclick', mapClusterClickHandler.value)
    markerClusterLayer.value = clusterLayer as unknown as L.LayerGroup
  } else {
    markerClusterLayer.value = L.layerGroup()
  }

  mapInstance.value.addLayer(markerClusterLayer.value as unknown as L.Layer)
}

const syncMarkers = () => {
  if (!markerClusterLayer.value) {
    return
  }

  markerClusterLayer.value.clearLayers()

  for (const range of validRanges.value) {
    const isSelected = range.slug === props.selectedSlug
    const marker = L.marker([range.latitude as number, range.longitude as number], {
      icon: createIcon(range, isSelected),
      zIndexOffset: getMarkerZIndex(range, isSelected),
    }) as MarkerWithRangeType

    marker.options.rangeType = normalizeRangeType(range.type)
    marker.bindTooltip(range.displayName, {
      direction: 'bottom',
      offset: L.point(0, 18),
      opacity: 1,
      className: 'range-map__tooltip',
    })
    marker.on('mouseover', () => {
      marker.openTooltip()
    })
    marker.on('mouseout', () => {
      marker.closeTooltip()
    })
    marker.on('click', () => emit('select', range.slug))

    markerClusterLayer.value.addLayer(marker)
  }
}

const invalidateMapSize = () => {
  if (!mapInstance.value) {
    return
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mapInstance.value?.invalidateSize({ pan: false, debounceMoveend: true })
    })
  })
}

const initializeMap = async () => {
  if (!mapElementRef.value || mapInstance.value) {
    return
  }

  mapInstance.value = L.map(mapElementRef.value, {
    maxBounds: polandInteractionBounds,
    maxBoundsViscosity: 0.85,
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  }).addTo(mapInstance.value as unknown as L.Map)
  mapInstance.value.fitBounds(polandLeafletBounds, { padding: [0, 0], animate: false })

  await ensureMarkerClusterPlugin()
  ensureClusterLayer()
  syncMarkers()
  invalidateMapSize()
}

onMounted(() => {
  void initializeMap()

  if (typeof ResizeObserver === 'function' && mapElementRef.value) {
    mapResizeObserver.value = new ResizeObserver(() => {
      invalidateMapSize()
    })
    mapResizeObserver.value.observe(mapElementRef.value)
  }
})

watch(() => props.ranges, () => {
  nextTick(() => {
    if (!mapInstance.value) {
      return
    }
    invalidateMapSize()
    syncMarkers()
  })
}, { deep: true })

watch(() => props.selectedSlug, () => {
  if (!mapInstance.value) return
  syncMarkers()
})

onBeforeUnmount(() => {
  if (mapInstance.value) {
    if (markerClusterLayer.value) {
      if (mapClusterClickHandler.value) {
        ;(markerClusterLayer.value as unknown as { off: (event: string, handler: (event: L.LeafletEvent) => void) => void })
          .off('clusterclick', mapClusterClickHandler.value)
      }
      mapInstance.value.removeLayer(markerClusterLayer.value as unknown as L.Layer)
    }
    mapInstance.value.remove()
    mapInstance.value = null
  }
  mapClusterClickHandler.value = null
  mapResizeObserver.value?.disconnect()
  mapResizeObserver.value = null
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
  height: min(68vh, calc(100vh - var(--app-bar-height, 96px) - var(--app-footer-height, 48px) - 96px));
  min-height: 320px;
  z-index: 1;
}

.range-map__controls {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 550;
  width: min(100% - 24px, 320px);
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 20px rgba(17, 24, 39, 0.2);
}

.range-map__canvas {
  width: 100%;
  height: 100%;
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

:deep(.range-map__popup .leaflet-popup-content-wrapper) {
  background-color: rgba(31, 41, 55, 0.92);
  color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

:deep(.range-map__popup .leaflet-popup-content) {
  margin: 6px 10px;
  font-size: 12px;
  line-height: 1.25;
}

:deep(.range-map__popup .leaflet-popup-tip) {
  background-color: rgba(31, 41, 55, 0.92);
}

:deep(.range-map__pin.leaflet-div-icon) {
  background: transparent;
  border: none;
  box-shadow: none;
}

:deep(.range-map__cluster.leaflet-div-icon) {
  background: transparent;
  border: none;
}
</style>
