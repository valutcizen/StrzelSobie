<template>
  <v-chip
    size="small"
    :color="chipColor"
    variant="tonal"
    class="range-type-chip font-weight-semibold text-uppercase"
    :prepend-icon="chipIcon"
    data-testid="range-type-badge"
  >
    {{ label }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RangeDetails } from '@/types/range'

interface Props {
  type: RangeDetails['type']
}

const props = defineProps<Props>()
const { t } = useI18n()

const label = computed(() => t(`rangeTypes.${props.type ?? 'unknown'}`))

const chipColor = computed(() => {
  switch (props.type) {
    case 'club':
      return 'success'
    case 'ally':
      return 'info'
    case 'coming-soon':
      return 'warning'
    default:
      return 'primary'
  }
})

const chipIcon = computed(() => {
  switch (props.type) {
    case 'club':
      return 'mdi-target'
    case 'ally':
      return 'mdi-handshake-outline'
    case 'coming-soon':
      return 'mdi-clock-outline'
    default:
      return 'mdi-map-marker'
  }
})
</script>

<style scoped>
.range-type-chip {
  letter-spacing: 0.04em;
}
</style>
