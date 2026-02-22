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

const isLoading = computed(() => rangeStore.isDirectoryLoading)
const loadError = computed(() => rangeStore.directoryError)
const ranges = computed(() => rangeStore.directory)
const showRangeNotFoundNotice = computed(() => route.query.notice === 'range-not-found')

const typePriority: Record<string, number> = {
  club: 1,
  ally: 2,
  meetup: 3,
  'coming-soon': 4,
}

const sortedRanges = computed<RangeSummary[]>(() => {
  return [...ranges.value].sort((a, b) => {
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
  selectedSlug.value = slug
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
        />
      </v-col>
    </v-row>
  </v-container>
</template>
