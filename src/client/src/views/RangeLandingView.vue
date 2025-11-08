<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const rangeStore = useRangeStore()

const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const rangeSlug = computed(() => {
  const param = route.params.rangeSlug
  if (typeof param === 'string' && param.length > 0) {
    return param
  }
  return authStore.defaultRangeSlug
})

const isLoading = computed(() => rangeStore.isLoading && rangeStore.currentRangeSlug === rangeSlug.value)
const hasRangeData = computed(() => Boolean(rangeStore.currentRange))
const lastError = computed(() => rangeStore.lastError)

const operatingHoursRows = computed(() => {
  const range = rangeStore.currentRange
  if (!range) {
    return []
  }

  const keys = Array.from(
    new Set([...dayOrder, ...Object.keys(range.operatingHours ?? {})]),
  )

  return keys.map((key) => {
    const entry = range.operatingHours?.[key] ?? null
    return {
      key,
      label: t(`rangeLanding.days.${key}`, key),
      isOpen: entry !== null,
      open: entry?.open ?? '',
      close: entry?.close ?? '',
    }
  })
})

const fetchRange = async (slug: string, force = false) => {
  if (!slug) {
    return
  }

  try {
    await rangeStore.fetchRangeDetails(slug, { force })
  } catch (error) {
    console.error(t('rangeLanding.errors.fetchFailed'), error)
  }
}

const handleRefresh = () => {
  if (rangeSlug.value) {
    fetchRange(rangeSlug.value, true)
  }
}

const handleOpenCalendar = () => {
  if (!rangeSlug.value) {
    return
  }

  router.push({ name: 'Calendar', params: { rangeSlug: rangeSlug.value } })
}

watch(
  rangeSlug,
  (slug, previousSlug) => {
    if (slug && slug !== previousSlug) {
      fetchRange(slug)
    }
  },
  { immediate: true },
)
</script>

<template>
  <v-container
    class="py-8"
    fluid
    data-testid="range-landing-view"
  >
    <v-row justify="center">
      <v-col
        cols="12"
        lg="8"
      >
        <v-card>
          <v-toolbar
            color="primary"
            density="comfortable"
          >
            <v-toolbar-title data-testid="range-landing-title">
              {{ rangeStore.currentRange?.displayName ?? t('rangeLanding.loadingTitle') }}
            </v-toolbar-title>
            <v-spacer />
            <v-btn
              icon="mdi-refresh"
              variant="text"
              :disabled="isLoading"
              :aria-label="t('rangeLanding.actions.refresh')"
              data-testid="range-landing-refresh-button"
              @click="handleRefresh"
            />
          </v-toolbar>

          <v-card-text>
            <v-alert
              v-if="lastError"
              type="error"
              variant="tonal"
              border="start"
              class="mb-6"
            >
              {{ lastError }}
            </v-alert>

            <div v-if="isLoading">
              <v-skeleton-loader
                type="heading, paragraph"
                class="mb-4"
              />
              <v-skeleton-loader type="table-tbody" />
            </div>

            <div v-else-if="hasRangeData">
              <div class="d-flex flex-column flex-md-row align-md-center justify-space-between mb-6">
                <div>
                  <p class="text-subtitle-1 mb-2">
                    {{ t('rangeLanding.totalTracks', { count: rangeStore.currentRange?.totalTracks ?? 0 }) }}
                  </p>
                  <p class="text-body-2 text-medium-emphasis mb-0">
                    {{ t('rangeLanding.description') }}
                  </p>
                </div>
                <v-btn
                  color="primary"
                  prepend-icon="mdi-calendar-clock"
                  class="mt-4 mt-md-0"
                  data-testid="range-landing-open-calendar-button"
                  @click="handleOpenCalendar"
                >
                  {{ t('rangeLanding.actions.openCalendar') }}
                </v-btn>
              </div>

              <v-card
                variant="tonal"
                class="mb-6"
              >
                <v-card-title class="text-subtitle-1">
                  {{ t('rangeLanding.operatingHours.title') }}
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-table
                    density="comfortable"
                    data-testid="range-landing-operating-hours-table"
                  >
                    <tbody>
                      <tr
                        v-for="row in operatingHoursRows"
                        :key="row.key"
                      >
                        <td class="text-capitalize">
                          {{ row.label }}
                        </td>
                        <td>
                          <span v-if="row.isOpen">
                            {{ row.open }} – {{ row.close }}
                          </span>
                          <span
                            v-else
                            class="text-medium-emphasis"
                          >
                            {{ t('rangeLanding.operatingHours.closed') }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-card>
            </div>

            <div v-else>
              <v-alert
                type="info"
                variant="tonal"
                border="start"
              >
                {{ t('rangeLanding.emptyState') }}
              </v-alert>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.text-capitalize {
  text-transform: capitalize;
}
</style>
