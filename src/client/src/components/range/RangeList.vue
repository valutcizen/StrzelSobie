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

      <v-data-table
        v-else
        :headers="headers"
        :items="ranges"
        :items-per-page="itemsPerPage"
        :items-per-page-options="itemsPerPageOptions"
        :page="page"
        hover
        fixed-header
        density="comfortable"
        class="range-table"
        item-value="slug"
        :item-class="rowClass"
        data-testid="range-list-table"
        @click:row="handleRowClick"
        @update:page="$emit('update:page', $event)"
      >
        <template #item.displayName="{ item }">
          <span
            class="font-weight-semibold"
            data-testid="range-list-name"
            :data-range-slug="item.slug"
          >
            {{ item.displayName }}
          </span>
        </template>

        <template #item.type="{ item }">
          <RangeTypeBadge
            :type="item.type"
            :data-range-slug="item.slug"
          />
        </template>

        <template
          v-if="showVoivodeship"
          #item.voivodeship="{ item }"
        >
          <span data-testid="range-list-voivodeship">
            {{ getVoivodeshipLabel(item) }}
          </span>
        </template>

        <template
          v-if="props.showReservations !== false"
          #item.allowsReservations="{ item }"
        >
          <v-chip
            size="small"
            :color="item.allowsReservations ? 'success' : 'warning'"
            variant="tonal"
          >
            {{
              item.allowsReservations
                ? t('rangeDirectory.list.allowsReservations')
                : t('rangeDirectory.list.noReservations')
            }}
          </v-chip>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            variant="text"
            color="primary"
            prepend-icon="mdi-open-in-new"
            :data-testid="`range-list-details-button-${item.slug}`"
            @click.stop="$emit('select', item.slug)"
          >
            {{
              item.type === 'meetup'
                ? t('rangeDirectory.list.detailsCtaMeetup')
                : t('rangeDirectory.list.detailsCta')
            }}
          </v-btn>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { VOIVODESHIP_LABELS, type Voivodeship } from '@/constants/voivodeships'
import RangeTypeBadge from '@/components/range/RangeTypeBadge.vue'
import type { RangeSummary } from '@/types/range'

interface Props {
  ranges: RangeSummary[]
  selectedSlug?: string | null
  showVoivodeship?: boolean
  showReservations?: boolean
  page: number
  itemsPerPage: number
  itemsPerPageOptions?: number[]
}

const props = defineProps<Props>()
const { t } = useI18n()
const emit = defineEmits<{
  (event: 'select', slug: string): void
  (event: 'update:page', value: number): void
}>()

const itemsPerPageOptions = computed(() => props.itemsPerPageOptions ?? [10, 25, 50])

const normalizeVoivodeship = (value: unknown): Voivodeship | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? (trimmed as Voivodeship) : null
}

const getVoivodeshipLabel = (range: RangeSummary): string => {
  const value = normalizeVoivodeship(range.extras?.voivodeship)
  if (!value) {
    return t('rangeDirectory.list.emptyVoivodeship')
  }

  return VOIVODESHIP_LABELS[value] ?? value
}

const headers = computed(() => {
  const base = [
    { title: t('rangeDirectory.list.headers.name'), key: 'displayName', sortable: false },
    { title: t('rangeDirectory.list.headers.type'), key: 'type', sortable: false, width: 160 },
  ]

  if (props.showVoivodeship) {
    base.push({
      title: t('rangeDirectory.list.headers.voivodeship'),
      key: 'voivodeship',
      sortable: false,
      width: 210,
    })
  }

  if (props.showReservations !== false) {
    base.push({
      title: t('rangeDirectory.list.headers.reservations'),
      key: 'allowsReservations',
      sortable: false,
      width: 200,
    })
  }

  base.push({ title: '', key: 'actions', sortable: false, width: 160 })

  return base
})

const handleRowClick = (_event: unknown, row: { item: RangeSummary }) => {
  const slug = row?.item?.slug
  if (slug) {
    emit('select', slug)
  }
}

const rowClass = (item: RangeSummary) => (item.slug === props.selectedSlug ? 'range-row-selected' : '')
</script>

<style scoped>
.range-table :deep(thead) {
  background-color: rgba(25, 118, 210, 0.06);
}

.range-table :deep(.range-row-selected) {
  background-color: rgba(25, 118, 210, 0.08) !important;
}
</style>
