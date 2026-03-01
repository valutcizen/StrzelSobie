<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import RangeTypeBadge from '@/components/range/RangeTypeBadge.vue'
import { useRangeStore } from '@/stores/range'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const rangeStore = useRangeStore()

const rangeSlug = computed(() => {
  const param = route.params.rangeSlug
  return typeof param === 'string' && param.length > 0 ? param : null
})

const currentOffice = computed(() => rangeStore.currentRange)
const isLoading = computed(() => rangeStore.isLoading && rangeStore.currentRangeSlug === rangeSlug.value)
const loadError = computed(() => rangeStore.lastError)

const details = computed(() => {
  const value = currentOffice.value?.extras?.details
  return typeof value === 'string' ? value : null
})

const address = computed(() => {
  const value = currentOffice.value?.extras?.address
  return typeof value === 'string' ? value : null
})

const phone = computed(() => {
  const value = currentOffice.value?.extras?.phone
  return typeof value === 'string' ? value : null
})

const coordinatesLabel = computed(() => {
  const lat = currentOffice.value?.latitude
  const lng = currentOffice.value?.longitude
  if (typeof lat === 'number' && typeof lng === 'number') {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
  return null
})

const locationLinks = computed(() => {
  const lat = currentOffice.value?.latitude
  const lng = currentOffice.value?.longitude
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return []
  }

  return [
    {
      key: 'google',
      href: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      icon: 'mdi-google-maps',
      label: t('range.actionBar.locationLinks.google'),
      testId: 'office-location-link-google',
    },
    {
      key: 'osm',
      href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`,
      icon: 'mdi-map',
      label: t('range.actionBar.locationLinks.osm'),
      testId: 'office-location-link-osm',
    },
  ]
})

const loadOffice = async () => {
  if (!rangeSlug.value) {
    router.replace({ name: 'Offices' })
    return
  }

  try {
    const range = await rangeStore.fetchRangeDetails(rangeSlug.value, { force: true })
    if (range.type !== 'office') {
      router.replace({ name: 'RangeLanding', params: { rangeSlug: range.slug } })
    }
  } catch (error) {
    const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status
    if (status === 404) {
      router.replace({ name: 'Offices' })
      return
    }
    console.error(error)
  }
}

watch(rangeSlug, () => {
  void loadOffice()
}, { immediate: true })

const goBack = () => {
  router.push({ name: 'Offices' })
}
</script>

<template>
  <v-container
    fluid
    class="py-8"
    data-testid="office-landing-view"
  >
    <v-row justify="center">
      <v-col
        cols="12"
        lg="9"
      >
        <v-card>
          <v-toolbar
            color="primary"
            density="comfortable"
          >
            <v-toolbar-title data-testid="office-landing-title">
              {{ currentOffice?.displayName ?? t('rangeLanding.loadingTitle') }}
            </v-toolbar-title>
            <v-spacer />
            <v-btn
              variant="text"
              prepend-icon="mdi-arrow-left"
              data-testid="office-back-button"
              @click="goBack"
            >
              {{ t('navigation.offices') }}
            </v-btn>
          </v-toolbar>

          <v-card-text>
            <v-alert
              v-if="loadError"
              type="error"
              variant="tonal"
              border="start"
              class="mb-6"
            >
              {{ loadError }}
            </v-alert>

            <div v-if="isLoading">
              <v-skeleton-loader type="heading, paragraph" />
            </div>

            <div v-else-if="currentOffice">
              <div class="d-flex flex-wrap align-center gap-2 mb-6">
                <RangeTypeBadge
                  :type="currentOffice.type"
                  :data-range-slug="currentOffice.slug"
                />
              </div>

              <v-row dense>
                <v-col
                  cols="12"
                  md="6"
                >
                  <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1">
                      Kontakt
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                      <div
                        class="text-caption text-medium-emphasis mb-1"
                        data-testid="office-localization-label"
                      >
                        {{ t('officeLanding.labels.location') }}
                      </div>
                      <div data-testid="office-localization">
                        {{ coordinatesLabel ?? '-' }}
                      </div>
                      <div
                        v-if="locationLinks.length > 0"
                        class="office-location-links mt-3"
                      >
                        <v-btn
                          v-for="link in locationLinks"
                          :key="link.key"
                          :href="link.href"
                          :prepend-icon="link.icon"
                          target="_blank"
                          rel="noopener"
                          variant="tonal"
                          size="small"
                          :data-testid="link.testId"
                        >
                          {{ link.label }}
                        </v-btn>
                      </div>
                      <div class="text-caption text-medium-emphasis mt-4 mb-1">
                      {{ t('officeLanding.labels.address') }}
                      </div>
                      <div data-testid="office-address">
                      {{ address ?? '-' }}
                      </div>

                      <div class="text-caption text-medium-emphasis mt-4 mb-1">
                      {{ t('officeLanding.labels.phone') }}
                      </div>
                      <div data-testid="office-phone">
                      <a
                        v-if="phone"
                        :href="`tel:${phone}`"
                      >
                        {{ phone }}
                      </a>
                      <span v-else>-</span>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col
                  cols="12"
                  md="6"
                >
                  <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1">
                      {{ t('officeLanding.labels.details') }}
                    </v-card-title>
                    <v-divider />
                    <v-card-text data-testid="office-details">
                      {{ details ?? '-' }}
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.office-location-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
