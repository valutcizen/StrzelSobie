<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import RangeList from '@/components/range/RangeList.vue'
import { useRangeStore } from '@/stores/range'
import type { RangeSummary } from '@/types/range'
import { setLastRangeId } from '@/utils/lastRange'

const { t } = useI18n()
const router = useRouter()
const rangeStore = useRangeStore()

const page = ref(1)
const selectedSlug = ref<string | null>(null)
const mode = ref<'office' | 'meetup'>('office')

const isLoading = computed(() => rangeStore.isDirectoryLoading)
const loadError = computed(() => rangeStore.directoryError)
const ranges = computed(() => rangeStore.directory)

const modeOptions = computed(() => [
  { value: 'office' as const, label: t('rangeDirectory.offices.modeOffices') },
  { value: 'meetup' as const, label: t('rangeDirectory.offices.modeMeetups') },
])

const sortedRanges = computed<RangeSummary[]>(() => {
  return [...ranges.value].sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl', { sensitivity: 'base' }))
})

const itemsPerPage = 10
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRanges.value.length / itemsPerPage)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))

const loadRanges = async () => {
  try {
    await rangeStore.fetchDirectory({
      sort: 'name',
      types: [mode.value],
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
  void loadRanges()
})

watch(pageCount, (next) => {
  if (page.value > next) {
    page.value = next
  }
})

const handleSelect = (slug: string) => {
  selectedSlug.value = slug
  if (mode.value === 'office') {
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
