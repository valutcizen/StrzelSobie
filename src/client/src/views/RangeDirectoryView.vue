<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import RangeMap from '@/components/range/RangeMap.vue'
import RangeList from '@/components/range/RangeList.vue'
import { useRangeStore } from '@/stores/range'
import type { RangeSummary } from '@/types/range'
import { getLastRangeId, setLastRangeId } from '@/utils/lastRange'

const { t } = useI18n()
const router = useRouter()
const rangeStore = useRangeStore()

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
  return [...ranges.value].sort((a, b) => {
    const typeCompare = (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99)
    if (typeCompare !== 0) return typeCompare
    return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' })
  })
})

const itemsPerPage = 10
const pageCount = computed(() => Math.max(1, Math.ceil(sortedRanges.value.length / itemsPerPage)))
const currentPage = computed(() => Math.min(page.value, pageCount.value))

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

const handleSelectRange = (slug: string) => {
  selectedSlug.value = slug
  setLastRangeId(slug)
  router.push({ name: 'RangeLanding', params: { rangeSlug: slug } })
}

onMounted(() => {
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
      <v-col cols="12">
        <h1 class="text-h5 font-weight-bold mb-1">
          {{ t('rangeDirectory.title') }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('rangeDirectory.subtitle') }}
        </p>
      </v-col>
    </v-row>

    <v-row class="mb-6">
      <v-col cols="12">
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

    <v-row>
      <v-col cols="12">
        <RangeList
          :ranges="sortedRanges"
          :selected-slug="selectedSlug"
          :page="currentPage"
          :items-per-page="itemsPerPage"
          :items-per-page-options="[10, 25, 50]"
          @select="handleSelectRange"
          @update:page="page = $event"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
