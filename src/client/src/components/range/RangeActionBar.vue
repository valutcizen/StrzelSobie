<template>
  <v-sheet
    class="range-action-bar px-4 py-4"
    elevation="1"
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
          color="primary"
          variant="outlined"
          prepend-icon="mdi-map-outline"
          data-testid="range-back-to-map-button"
          @click="$emit('back-to-map')"
        >
          {{ t('range.actionBar.backToMap') }}
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="approximateLocation"
      type="info"
      variant="tonal"
      border="start"
      class="mt-4 mb-0"
      data-testid="range-approximate-location-alert"
    >
      {{ t('range.location.approximateMessage') }}
    </v-alert>

    <div
      v-else-if="linkSections.length"
      class="mt-4 location-links"
    >
      <div
        v-for="section in linkSections"
        :key="section.key"
        class="location-section"
      >
        <p class="text-body-2 text-medium-emphasis mb-2">
          {{ section.label }}
        </p>
        <div class="location-link-grid">
          <v-btn
            v-for="link in section.links"
            :key="link.testId"
            :href="link.href"
            target="_blank"
            rel="noopener"
            size="small"
            color="primary"
            variant="tonal"
            :prepend-icon="link.icon"
            :data-testid="link.testId"
            class="location-link-btn"
          >
            {{ t(`range.actionBar.locationLinks.${link.key}`) }}
          </v-btn>
        </div>
      </div>
    </div>

    <v-alert
      v-if="!allowsReservations"
      type="info"
      variant="tonal"
      border="start"
      class="mt-3 mb-0"
      data-testid="range-action-alert"
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
  approximateLocation?: boolean
  coordinates?: {
    lat: number
    lng: number
  } | null
  parkingCoordinates?: {
    lat: number
    lng: number
  } | null
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

type MapCoordinates = {
  lat: number
  lng: number
}

const buildLinks = (coords: MapCoordinates, prefix: 'location' | 'parking') => {
  const { lat, lng } = coords
  const baseTestId = prefix === 'parking' ? 'range-parking-link' : 'range-location-link'
  return [
    {
      key: 'google',
      href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      icon: 'mdi-google-maps',
      testId: `${baseTestId}-google`,
    },
    {
      key: 'osm',
      href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
      icon: 'mdi-map',
      testId: `${baseTestId}-osm`,
    },
  ]
}

const linkSections = computed(() => {
  const sections: Array<{
    key: 'location' | 'parking'
    label: string
    links: ReturnType<typeof buildLinks>
  }> = []

  if (props.coordinates) {
    sections.push({
      key: 'location',
      label: t('range.actionBar.locationLabel'),
      links: buildLinks(props.coordinates, 'location'),
    })
  }

  if (props.parkingCoordinates) {
    sections.push({
      key: 'parking',
      label: t('range.actionBar.parkingLabel'),
      links: buildLinks(props.parkingCoordinates, 'parking'),
    })
  }

  return sections
})
</script>

<style scoped>
.range-action-bar {
  background: linear-gradient(135deg, rgba(25, 118, 210, 0.12), rgba(25, 118, 210, 0.04));
  border: 1px solid rgba(25, 118, 210, 0.18);
}

.location-links {
  gap: 14px;
}

.location-section + .location-section {
  margin-top: 14px;
  padding-top: 8px;
  border-top: 1px solid rgba(25, 118, 210, 0.12);
}

.location-link-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
}

.location-link-btn {
  min-width: 150px;
}
</style>
