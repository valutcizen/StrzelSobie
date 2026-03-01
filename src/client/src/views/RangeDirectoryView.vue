<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import RangeMap from '@/components/range/RangeMap.vue'
import { useRangeStore } from '@/stores/range'
import type { RangeSummary } from '@/types/range'
import { getLastRangeId, setLastRangeId } from '@/utils/lastRange'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const rangeStore = useRangeStore()

const selectedSlug = ref<string | null>(getLastRangeId())
const mapMode = ref<'open-club' | 'club-ranges' | 'ranges' | 'all'>('all')

const isLoading = computed(() => rangeStore.isDirectoryLoading)
const loadError = computed(() => rangeStore.directoryError)
const ranges = computed(() => rangeStore.directory)
const showRangeNotFoundNotice = computed(() => route.query.notice === 'range-not-found')

const typePriority: Record<string, number> = {
  club: 1,
  ally: 2,
  'coming-soon': 3,
  office: 4,
  meetup: 5,
}

const mapModeOptions = computed(() => [
  { value: 'open-club' as const, label: t('rangeDirectory.mapModes.openClub') },
  { value: 'club-ranges' as const, label: t('rangeDirectory.mapModes.clubRanges') },
  { value: 'ranges' as const, label: t('rangeDirectory.mapModes.ranges') },
  { value: 'all' as const, label: t('rangeDirectory.mapModes.all') },
])

const modeFilteredRanges = computed<RangeSummary[]>(() => {
  return ranges.value.filter((range) => {
    if (mapMode.value === 'open-club') {
      return range.type === 'club'
    }
    if (mapMode.value === 'club-ranges') {
      return range.type === 'club' || range.type === 'coming-soon'
    }
    if (mapMode.value === 'ranges') {
      return range.type === 'club' || range.type === 'ally' || range.type === 'coming-soon'
    }
    return true
  })
})

const sortedRanges = computed<RangeSummary[]>(() => {
  return [...modeFilteredRanges.value].sort((a, b) => {
    const typeCompare = (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99)
    if (typeCompare !== 0) return typeCompare
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  })
})

const loadRanges = async () => {
  try {
    await rangeStore.fetchDirectory({
      sort: 'type_priority',
    })
    if (!selectedSlug.value && ranges.value.length > 0) {
      selectedSlug.value = ranges.value[0].slug
    }
  } catch (error) {
    console.error(error)
  }
}

// Kick off loading immediately so the initial render shows the loading state.
void loadRanges()

const handleSelectRange = (slug: string) => {
  const selectedRange = ranges.value.find((range) => range.slug === slug)
  selectedSlug.value = slug
  if (selectedRange?.type === 'office') {
    router.push({ name: 'OfficeLanding', params: { rangeSlug: slug } })
    return
  }

  setLastRangeId(slug)
  router.push({ name: 'RangeLanding', params: { rangeSlug: slug } })
}

watch(
  () => ranges.value.length,
  (length) => {
    if (length > 0 && !selectedSlug.value) {
      selectedSlug.value = ranges.value[0].slug
    }
  },
)
</script>

<template>
  <v-container
    fluid
    class="py-8"
    data-testid="range-directory-view"
  >
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h5 font-weight-bold mb-1">
          {{ t('rangeDirectory.mapTitle') }}
        </h1>
      </v-col>
    </v-row>

    <v-row class="mb-6">
      <v-col cols="12">
        <v-alert
          v-if="showRangeNotFoundNotice"
          type="info"
          variant="tonal"
          border="start"
          class="mb-4"
          data-testid="range-directory-not-found-notice"
        >
          {{ t('rangeDirectory.notices.rangeNotFound') }}
        </v-alert>

        <v-alert
          v-if="loadError"
          type="error"
          variant="tonal"
          border="start"
          class="mb-4"
          data-testid="range-directory-error"
        >
          {{ loadError }}
        </v-alert>

        <v-skeleton-loader
          v-if="isLoading && ranges.length === 0"
          type="image, heading, table-tbody"
        />

        <RangeMap
          v-else
          :ranges="sortedRanges"
          :selected-slug="selectedSlug"
          @select="handleSelectRange"
        >
          <template #controls>
            <div class="range-directory-map-controls">
              <v-select
                v-model="mapMode"
                :label="t('rangeDirectory.mapModes.label')"
                :items="mapModeOptions"
                item-title="label"
                item-value="value"
                density="comfortable"
                hide-details
                data-testid="range-directory-map-mode"
              />
            </div>
          </template>
        </RangeMap>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.range-directory-map-controls {
  width: min(100%, 320px);
}
</style>
