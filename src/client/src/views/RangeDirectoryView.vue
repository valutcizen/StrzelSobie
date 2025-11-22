<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import RangeMap from '@/components/range/RangeMap.vue'
import RangeList from '@/components/range/RangeList.vue'
import { useRangeStore } from '@/stores/range'
import type { RangeSummary } from '@/types/range'
import { getLastRangeId, setLastRangeId } from '@/utils/lastRange'

type SortOption = 'name' | 'type'

const { t } = useI18n()
const router = useRouter()
const rangeStore = useRangeStore()

const sortBy = ref<SortOption>('name')
const selectedTypes = ref<string[]>([])
const page = ref(1)
const selectedSlug = ref<string | null>(getLastRangeId())

const isLoading = computed(() => rangeStore.isDirectoryLoading)
const loadError = computed(() => rangeStore.directoryError)
const ranges = computed(() => rangeStore.directory)

const typePriority: Record<string, number> = {
  club: 1,
  ally: 2,
  'coming-soon': 3,
}

const sortedRanges = computed<RangeSummary[]>(() => {
  const filtered = selectedTypes.value.length
    ? ranges.value.filter((range) => selectedTypes.value.includes(range.type))
    : ranges.value

  return [...filtered].sort((a, b) => {
    if (sortBy.value === 'type') {
      return (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99)
    }
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  })
})

const itemsPerPage = 6
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRanges.value.length / itemsPerPage)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))

const loadRanges = async () => {
  try {
    await rangeStore.fetchDirectory({
      sort: sortBy.value === 'name' ? 'name' : 'type_priority',
      types: selectedTypes.value,
    })
    if (!selectedSlug.value && ranges.value.length > 0) {
      selectedSlug.value = ranges.value[0].slug
    }
  } catch (error) {
    console.error(error)
  }
}

const handleSelectRange = (slug: string) => {
  selectedSlug.value = slug
  setLastRangeId(slug)
  router.push({ name: 'RangeLanding', params: { rangeSlug: slug } })
}

onMounted(() => {
  loadRanges()
})

watch([sortBy, selectedTypes], () => {
  page.value = 1
  loadRanges()
})

watch(
  () => ranges.value.length,
  (length) => {
    if (length > 0 && !selectedSlug.value) {
      selectedSlug.value = ranges.value[0].slug
    }
  },
)

watch(pageCount, (next) => {
  if (page.value > next) {
    page.value = next
  }
})
</script>

<template>
  <v-container
    fluid
    class="py-8"
    data-testid="range-directory-view"
  >
    <v-row class="mb-4">
      <v-col
        cols="12"
        md="6"
      >
        <h1 class="text-h5 font-weight-bold mb-1">
          {{ t('rangeDirectory.title') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('rangeDirectory.subtitle') }}
        </p>
      </v-col>
      <v-col
        cols="12"
        md="6"
        class="d-flex flex-column flex-sm-row align-end justify-end gap-3"
      >
        <v-select
          v-model="sortBy"
          :items="[
            { title: t('rangeDirectory.sort.name'), value: 'name' },
            { title: t('rangeDirectory.sort.type'), value: 'type' },
          ]"
          density="comfortable"
          variant="outlined"
          hide-details
          class="flex-sm-0"
          style="max-width: 260px;"
          data-testid="range-directory-sort"
          :label="t('rangeDirectory.sort.label')"
        />
        <v-chip-group
          v-model="selectedTypes"
          column
          filter
          multiple
          class="flex-1"
          data-testid="range-directory-type-filters"
        >
          <v-chip
            value="club"
            variant="tonal"
            prepend-icon="mdi-target"
          >
            {{ t('rangeTypes.club') }}
          </v-chip>
          <v-chip
            value="ally"
            variant="tonal"
            prepend-icon="mdi-handshake"
          >
            {{ t('rangeTypes.ally') }}
          </v-chip>
          <v-chip
            value="coming-soon"
            variant="tonal"
            prepend-icon="mdi-calendar-clock"
          >
            {{ t('rangeTypes.coming-soon') }}
          </v-chip>
        </v-chip-group>
      </v-col>
    </v-row>

    <v-row>
      <v-col
        cols="12"
        md="5"
        class="d-flex flex-column gap-4"
      >
        <v-alert
          v-if="loadError"
          type="error"
          variant="tonal"
          border="start"
          data-testid="range-directory-error"
        >
          {{ loadError }}
        </v-alert>

        <v-skeleton-loader
          v-if="isLoading && ranges.length === 0"
          type="card, list-item-two-line@3"
        />

        <RangeList
          v-else
          :ranges="sortedRanges"
          :selected-slug="selectedSlug"
          :page="currentPage"
          :items-per-page="itemsPerPage"
          @select="handleSelectRange"
          @update:page="page = $event"
        />
      </v-col>
      <v-col
        cols="12"
        md="7"
      >
        <RangeMap
          :ranges="sortedRanges"
          :selected-slug="selectedSlug"
          @select="handleSelectRange"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
