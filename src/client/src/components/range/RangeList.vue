<template>
  <v-card
    rounded="lg"
    elevation="1"
    data-testid="range-list"
  >
    <v-card-title class="d-flex align-center justify-space-between">
      <span class="text-subtitle-1 font-weight-semibold">
        {{ t('rangeDirectory.list.title') }}
      </span>
      <v-chip
        size="small"
        prepend-icon="mdi-counter"
        variant="tonal"
      >
        {{ ranges.length }}
      </v-chip>
    </v-card-title>
    <v-divider />

    <v-card-text class="pb-0">
      <v-alert
        v-if="ranges.length === 0"
        type="info"
        variant="tonal"
        border="start"
        class="mb-0"
      >
        {{ t('rangeDirectory.list.empty') }}
      </v-alert>

      <v-list
        v-else
        nav
        density="comfortable"
        class="range-list"
      >
        <v-list-item
          v-for="range in paginatedRanges"
          :key="range.slug"
          :active="range.slug === selectedSlug"
          :aria-label="range.displayName"
          rounded="lg"
          class="mb-2"
          data-testid="range-list-item"
          @click="$emit('select', range.slug)"
        >
          <template #prepend>
            <v-avatar color="primary" size="36" class="mr-2">
              <span class="text-button">{{ range.displayName.charAt(0).toUpperCase() }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="font-weight-semibold">
            {{ range.displayName }}
          </v-list-item-title>
          <v-list-item-subtitle class="d-flex flex-wrap align-center gap-2 mt-1">
            <RangeTypeBadge :type="range.type" />
            <v-chip
              size="x-small"
              variant="flat"
              :color="range.allowsReservations ? 'success' : 'warning'"
            >
              {{
                range.allowsReservations
                  ? t('rangeDirectory.list.allowsReservations')
                  : t('rangeDirectory.list.noReservations')
              }}
            </v-chip>
          </v-list-item-subtitle>
          <template #append>
            <v-btn
              variant="text"
              color="primary"
              prepend-icon="mdi-open-in-new"
              data-testid="range-list-details-button"
              @click.stop="$emit('select', range.slug)"
            >
              {{ t('rangeDirectory.list.detailsCta') }}
            </v-btn>
          </template>
        </v-list-item>
      </v-list>
    </v-card-text>

    <v-divider />
    <v-card-actions
      v-if="pageCount > 1"
      class="justify-center"
    >
      <v-pagination
        :model-value="page"
        :length="pageCount"
        total-visible="5"
        density="comfortable"
        @update:model-value="$emit('update:page', $event)"
      />
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import RangeTypeBadge from '@/components/range/RangeTypeBadge.vue'
import type { RangeSummary } from '@/types/range'

interface Props {
  ranges: RangeSummary[]
  selectedSlug?: string | null
  page: number
  itemsPerPage: number
}

defineEmits<{
  (event: 'select', slug: string): void
  (event: 'update:page', value: number): void
}>()

const props = defineProps<Props>()
const { t } = useI18n()

const pageCount = computed(() => Math.max(1, Math.ceil(props.ranges.length / props.itemsPerPage)))

const paginatedRanges = computed(() => {
  const currentPage = Math.min(props.page, pageCount.value)
  const start = (currentPage - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return props.ranges.slice(start, end)
})
</script>

<style scoped>
.range-list :deep(.v-list-item--active) {
  background-color: rgba(25, 118, 210, 0.08);
}
</style>
