<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import RangeList from '@/components/range/RangeList.vue'
import { VOIVODESHIP_LABELS, type Voivodeship } from '@/constants/voivodeships'
import { useRangeStore } from '@/stores/range'
import type { RangeSummary } from '@/types/range'
import { setLastRangeId } from '@/utils/lastRange'

const { t } = useI18n()
const router = useRouter()
const rangeStore = useRangeStore()

const page = ref(1)
const selectedSlug = ref<string | null>(null)
const mode = ref<'office' | 'all'>('office')
const selectedVoivodeshipFilter = ref<'all' | 'empty' | Voivodeship>('all')
const sortMode = ref<'default' | 'name-asc' | 'name-desc' | 'voivodeship-asc' | 'voivodeship-desc'>('default')

const isLoading = computed(() => rangeStore.isDirectoryLoading)
const loadError = computed(() => rangeStore.directoryError)
const ranges = computed(() => rangeStore.directory)

const modeOptions = computed(() => [
  { value: 'office' as const, label: t('rangeDirectory.offices.modeOffices') },
  { value: 'all' as const, label: t('rangeDirectory.offices.modeAll') },
])

const normalizeVoivodeship = (value: unknown): Voivodeship | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? (trimmed as Voivodeship) : null
}

const compareVoivodeship = (a: RangeSummary, b: RangeSummary, direction: 'asc' | 'desc') => {
  const aValue = normalizeVoivodeship(a.extras?.voivodeship)
  const bValue = normalizeVoivodeship(b.extras?.voivodeship)
  const aLabel = aValue ? VOIVODESHIP_LABELS[aValue] ?? aValue : ''
  const bLabel = bValue ? VOIVODESHIP_LABELS[bValue] ?? bValue : ''

  if (!aLabel && !bLabel) return 0
  if (!aLabel) return 1
  if (!bLabel) return -1

  const cmp = aLabel.localeCompare(bLabel, 'pl', { sensitivity: 'base' })
  return direction === 'desc' ? -cmp : cmp
}

const voivodeshipFilterOptions = computed(() => {
  const values = new Set<Voivodeship>()
  for (const range of ranges.value) {
    const normalized = normalizeVoivodeship(range.extras?.voivodeship)
    if (normalized) {
      values.add(normalized)
    }
  }

  const sorted = [...values].sort((a, b) =>
    (VOIVODESHIP_LABELS[a] ?? a).localeCompare(VOIVODESHIP_LABELS[b] ?? b, 'pl', { sensitivity: 'base' }),
  )

  return [
    { value: 'all' as const, label: t('rangeDirectory.catalog.filters.allVoivodeships') },
    { value: 'empty' as const, label: t('rangeDirectory.catalog.filters.emptyVoivodeship') },
    ...sorted.map((value) => ({ value, label: VOIVODESHIP_LABELS[value] ?? value })),
  ]
})

const sortOptions = computed(() => [
  { value: 'default' as const, label: t('rangeDirectory.catalog.sort.default') },
  { value: 'name-asc' as const, label: t('rangeDirectory.catalog.sort.nameAsc') },
  { value: 'name-desc' as const, label: t('rangeDirectory.catalog.sort.nameDesc') },
  { value: 'voivodeship-asc' as const, label: t('rangeDirectory.catalog.sort.voivodeshipAsc') },
  { value: 'voivodeship-desc' as const, label: t('rangeDirectory.catalog.sort.voivodeshipDesc') },
])

const filteredRanges = computed<RangeSummary[]>(() => {
  return ranges.value.filter((range) => {
    const normalized = normalizeVoivodeship(range.extras?.voivodeship)
    if (selectedVoivodeshipFilter.value === 'all') {
      return true
    }
    if (selectedVoivodeshipFilter.value === 'empty') {
      return normalized === null
    }

    return normalized === selectedVoivodeshipFilter.value
  })
})

const sortedRanges = computed<RangeSummary[]>(() => {
  return [...filteredRanges.value].sort((a, b) => {
    if (sortMode.value === 'voivodeship-asc' || sortMode.value === 'voivodeship-desc') {
      const direction = sortMode.value === 'voivodeship-asc' ? 'asc' : 'desc'
      const voivodeshipCompare = compareVoivodeship(a, b, direction)
      if (voivodeshipCompare !== 0) {
        return voivodeshipCompare
      }
    }

    if (sortMode.value === 'name-desc') {
      return -a.displayName.localeCompare(b.displayName, 'pl', { sensitivity: 'base' })
    }

    return a.displayName.localeCompare(b.displayName, 'pl', { sensitivity: 'base' })
  })
})

const itemsPerPage = 10
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRanges.value.length / itemsPerPage)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))

const loadRanges = async () => {
  try {
    const types = mode.value === 'all' ? ['office', 'meetup'] : ['office']
    await rangeStore.fetchDirectory({
      sort: 'name',
      types,
    })
    selectedSlug.value = sortedRanges.value[0]?.slug ?? null
  } catch (error) {
    console.error(error)
  }
}

void loadRanges()

watch(mode, () => {
  page.value = 1
  selectedSlug.value = null
  selectedVoivodeshipFilter.value = 'all'
  void loadRanges()
})

watch([selectedVoivodeshipFilter, sortMode], () => {
  page.value = 1
})

watch(pageCount, (next) => {
  if (page.value > next) {
    page.value = next
  }
})

const handleSelect = (slug: string) => {
  selectedSlug.value = slug
  const selected = sortedRanges.value.find((range) => range.slug === slug)
  if (selected?.type === 'office') {
    router.push({ name: 'OfficeLanding', params: { rangeSlug: slug } })
    return
  }

  setLastRangeId(slug)
  router.push({ name: 'RangeLanding', params: { rangeSlug: slug } })
}
</script>

<template>
  <v-container
    fluid
    class="py-8"
    data-testid="offices-view"
  >
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h5 font-weight-bold mb-1">
          {{ t('rangeDirectory.officesTitle') }}
        </h1>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col
        cols="12"
        md="4"
      >
        <v-select
          v-model="mode"
          :label="t('rangeDirectory.offices.modeLabel')"
          :items="modeOptions"
          item-title="label"
          item-value="value"
          data-testid="offices-mode-select"
        />
      </v-col>
      <v-col
        cols="12"
        md="4"
      >
        <v-select
          v-model="selectedVoivodeshipFilter"
          :label="t('rangeDirectory.catalog.filters.voivodeshipLabel')"
          :items="voivodeshipFilterOptions"
          item-title="label"
          item-value="value"
          data-testid="offices-voivodeship-filter"
        />
      </v-col>
      <v-col
        cols="12"
        md="4"
      >
        <v-select
          v-model="sortMode"
          :label="t('rangeDirectory.catalog.sort.label')"
          :items="sortOptions"
          item-title="label"
          item-value="value"
          data-testid="offices-voivodeship-sort"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <v-alert
          v-if="loadError"
          type="error"
          variant="tonal"
          border="start"
          class="mb-4"
          data-testid="offices-error"
        >
          {{ loadError }}
        </v-alert>

        <v-skeleton-loader
          v-if="isLoading && ranges.length === 0"
          type="heading, table-tbody"
        />

        <RangeList
          v-else
          :ranges="sortedRanges"
          :show-voivodeship="true"
          :show-reservations="false"
          :selected-slug="selectedSlug"
          :page="currentPage"
          :items-per-page="itemsPerPage"
          :items-per-page-options="[10, 25, 50]"
          @select="handleSelect"
          @update:page="page = $event"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
