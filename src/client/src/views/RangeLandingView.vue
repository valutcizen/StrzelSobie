<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { enUS, pl as plLocale } from 'date-fns/locale'
import RangeActionBar from '@/components/range/RangeActionBar.vue'
import RangeTypeBadge from '@/components/range/RangeTypeBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import { UserRoleEnum } from '@/types/auth'
import { setLastRangeId } from '@/utils/lastRange'
import { http } from '@/services/http'
import { toDateOnly } from '@/utils/datetime'
import type { CalendarEventsDto } from '@strzel-sobie/common'

const { t, locale } = useI18n()
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
const isBookingUnavailableNotice = computed(
  () => currentRange.value?.type !== 'meetup' && !currentRange.value?.allowsReservations,
)
const currentRange = computed(() => rangeStore.currentRange)
const isMeetupRange = computed(() => currentRange.value?.type === 'meetup')
const dateLocale = computed(() => (locale.value === 'pl' ? plLocale : enUS))
const coordinates = computed(() => {
  const range = rangeStore.currentRange
  if (typeof range?.latitude !== 'number' || typeof range.longitude !== 'number') {
    return null
  }
  return { lat: range.latitude, lng: range.longitude }
})
const parkingCoordinates = computed(() => {
  const parking =
    rangeStore.currentRange?.parkingLocation ?? rangeStore.currentRange?.extras?.parkingLocation ?? null

  if (!parking) {
    return null
  }

  if (typeof parking.latitude !== 'number' || typeof parking.longitude !== 'number') {
    return null
  }

  return { lat: parking.latitude, lng: parking.longitude }
})
const canSeeMemberDescription = computed(() =>
  authStore.hasAnyRole([
    UserRoleEnum.Member,
    UserRoleEnum.Coordinator,
    UserRoleEnum.ShootingRangeAdministrator,
    UserRoleEnum.ClubCommunityAdministrator,
  ]),
)
const canCreateEvents = computed(() => {
  const allowMemberEvents = currentRange.value?.extras?.allowMemberEvents ?? false

  if (authStore.hasAnyRole([UserRoleEnum.ClubCommunityAdministrator])) {
    return true
  }

  if (authStore.hasAnyRangeRole([UserRoleEnum.ShootingRangeAdministrator])) {
    return true
  }

  return allowMemberEvents && authStore.hasRole(UserRoleEnum.Member)
})

const meetupEvents = ref<CalendarEventsDto['events']>([])
const meetupEventsLoading = ref(false)
const meetupEventsError = ref<string | null>(null)

const operatingHoursRows = computed(() => {
  const range = rangeStore.currentRange
  if (!range) {
    return []
  }

  const keys = Array.from(new Set([...dayOrder, ...Object.keys(range.operatingHours ?? {})]))

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
    setLastRangeId(slug)
    if (rangeStore.currentRange?.type === 'meetup') {
      void loadMeetupEvents(slug)
    }
  } catch (error) {
    const status = (error as { response?: { status?: unknown } } | null | undefined)?.response?.status
    if (status === 404) {
      router.replace({ name: 'RangeDirectory', query: { notice: 'range-not-found' } })
      return
    }
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

const handleCreateEvent = () => {
  if (!rangeSlug.value) {
    return
  }

  router.push({ name: 'EventCreate', params: { rangeSlug: rangeSlug.value } })
}

const handleBackToMap = () => {
  router.push({ name: 'RangeDirectory' })
}

const loadMeetupEvents = async (slug: string) => {
  if (!slug) {
    return
  }

  meetupEventsLoading.value = true
  meetupEventsError.value = null

  try {
    const start = new Date()
    start.setMonth(start.getMonth() - 6)
    const end = new Date()
    end.setMonth(end.getMonth() + 18)
    const { data } = await http.get<CalendarEventsDto>(`/ranges/${slug}/events`, {
      params: {
        startDate: toDateOnly(start),
        endDate: toDateOnly(end),
      },
    })
    meetupEvents.value = data.events ?? []
  } catch (error) {
    meetupEventsError.value =
      error instanceof Error ? error.message : t('rangeLanding.eventsLoadFailed')
  } finally {
    meetupEventsLoading.value = false
  }
}

const formatEventDateTime = (value: string, formatString: string) => {
  try {
    return format(parseISO(value), formatString, { locale: dateLocale.value })
  } catch {
    return value
  }
}

const meetupEventCards = computed(() =>
  [...meetupEvents.value]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((event) => ({
      id: event.id,
      slug: event.slug,
      name: event.name,
      startLabel: formatEventDateTime(event.startTime, 'PPpp'),
      endLabel: formatEventDateTime(event.endTime, 'p'),
      audience: event.audience,
    })),
)

watch(
  rangeSlug,
  (slug, previousSlug) => {
    if (slug && slug !== previousSlug) {
      fetchRange(slug)
    }
  },
  { immediate: true },
)

watch(
  () => currentRange.value?.type,
  (nextType) => {
    if (nextType === 'meetup' && rangeSlug.value) {
      void loadMeetupEvents(rangeSlug.value)
    }
  },
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
        lg="9"
      >
        <v-card>
          <v-toolbar
            color="primary"
            density="comfortable"
          >
            <v-toolbar-title data-testid="range-landing-title">
              {{ currentRange?.displayName ?? t('rangeLanding.loadingTitle') }}
            </v-toolbar-title>
            <v-spacer />
            <v-chip
              v-if="currentRange"
              class="mr-2"
              variant="elevated"
              prepend-icon="mdi-map-marker"
              data-testid="range-slug-chip"
            >
              {{ currentRange.slug }}
            </v-chip>
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

            <v-alert
              v-if="isBookingUnavailableNotice"
              type="info"
              variant="tonal"
              border="start"
              class="mb-6"
              data-testid="range-booking-unavailable-alert"
            >
              {{ t('rangeLanding.bookingUnavailableNotice') }}
            </v-alert>

            <div v-if="isLoading">
              <v-skeleton-loader
                type="heading, paragraph"
                class="mb-4"
              />
              <v-skeleton-loader type="table-tbody" />
            </div>

            <div v-else-if="hasRangeData">
              <div class="d-flex flex-column gap-4 mb-6">
                <div class="d-flex flex-wrap align-center gap-2 meta-row">
                  <RangeTypeBadge
                    class="meta-chip"
                    :type="(currentRange?.type ?? 'club')"
                    :data-range-slug="currentRange?.slug"
                  />
                  <v-chip
                    size="small"
                    :color="currentRange?.allowsReservations ? 'success' : 'warning'"
                    variant="elevated"
                    class="meta-chip"
                    :prepend-icon="currentRange?.allowsReservations ? 'mdi-check-circle' : 'mdi-alert-outline'"
                    data-testid="range-booking-status-chip"
                  >
                    {{
                      currentRange?.allowsReservations
                        ? t('rangeLanding.bookingStatus.open')
                        : t('rangeLanding.bookingStatus.closed')
                    }}
                  </v-chip>
                </div>

                <RangeActionBar
                  v-if="!isMeetupRange"
                  :allows-reservations="currentRange?.allowsReservations ?? false"
                  :range-type="(currentRange?.type ?? 'club')"
                  :coordinates="coordinates"
                  :parking-coordinates="parkingCoordinates"
                  @open-calendar="handleOpenCalendar"
                  @back-to-map="handleBackToMap"
                />

                <div
                  v-else
                  class="d-flex flex-column flex-sm-row gap-2"
                >
                  <v-btn
                    color="primary"
                    prepend-icon="mdi-map-outline"
                    data-testid="range-back-to-map-button"
                    @click="handleBackToMap"
                  >
                    {{ t('rangeLanding.actions.backToMap') }}
                  </v-btn>
                </div>
                <v-btn
                  v-if="canCreateEvents"
                  color="primary"
                  prepend-icon="mdi-calendar-plus"
                  data-testid="range-create-event-button"
                  @click="handleCreateEvent"
                >
                  {{ t('rangeLanding.actions.createEvent') }}
                </v-btn>
              </div>

              <v-row class="mb-4" dense>
                <v-col cols="12" md="7">
                  <v-card variant="tonal">
                    <v-card-title class="text-subtitle-1">
                      {{ t('rangeLanding.publicDescription.title') }}
                    </v-card-title>
                    <v-divider />
                    <v-card-text data-testid="range-public-description">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div
                        v-if="currentRange?.publicDescription"
                        class="range-description"
                        v-html="currentRange.publicDescription"
                      />
                      <p
                        v-else
                        class="text-medium-emphasis mb-0"
                      >
                        {{ t('rangeLanding.publicDescription.empty') }}
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>
                <v-col cols="12" md="5">
                  <v-card variant="outlined">
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
                </v-col>
              </v-row>

              <v-card
                v-if="isMeetupRange"
                variant="outlined"
                class="mb-4"
                data-testid="range-landing-events-card"
              >
                <v-card-title class="text-subtitle-1">
                  {{ t('rangeLanding.events.title') }}
                </v-card-title>
                <v-divider />
                <v-card-text>
                  <v-alert
                    v-if="meetupEventsError"
                    type="error"
                    variant="tonal"
                    border="start"
                    class="mb-4"
                  >
                    {{ meetupEventsError }}
                  </v-alert>

                  <v-progress-linear
                    v-if="meetupEventsLoading"
                    indeterminate
                    color="primary"
                    class="mb-4"
                  />

                  <v-list
                    v-if="!meetupEventsLoading && meetupEventCards.length > 0"
                    density="comfortable"
                  >
                    <v-list-item
                      v-for="event in meetupEventCards"
                      :key="event.slug"
                      :to="{ name: 'EventDetail', params: { rangeSlug: currentRange?.slug, eventSlug: event.slug } }"
                      data-testid="range-landing-event-item"
                    >
                      <v-list-item-title>{{ event.name }}</v-list-item-title>
                      <v-list-item-subtitle>
                        {{ event.startLabel }} · {{ event.endLabel }}
                      </v-list-item-subtitle>
                      <template #append>
                        <v-chip
                          size="x-small"
                          variant="tonal"
                          :color="event.audience === 'Public' ? 'success' : 'primary'"
                        >
                          {{ event.audience === 'Public' ? t('events.detail.audience.public') : t('events.detail.audience.membersOnly') }}
                        </v-chip>
                      </template>
                    </v-list-item>
                  </v-list>

                  <v-alert
                    v-else-if="!meetupEventsLoading"
                    type="info"
                    variant="tonal"
                    border="start"
                  >
                    {{ t('rangeLanding.events.empty') }}
                  </v-alert>
                </v-card-text>
              </v-card>

              <v-card
                v-if="canSeeMemberDescription"
                variant="outlined"
                color="primary"
                data-testid="range-member-description-card"
              >
                <v-card-title class="text-subtitle-1 d-flex align-center gap-2">
                  <v-icon color="primary">
                    mdi-shield-account
                  </v-icon>
                  {{ t('rangeLanding.memberDescription.title') }}
                </v-card-title>
                <v-divider />
                <v-card-text data-testid="range-member-description">
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <div
                    v-if="currentRange?.memberDescription"
                    class="range-description"
                    v-html="currentRange.memberDescription"
                  />
                  <p
                    v-else
                    class="text-medium-emphasis mb-0"
                  >
                    {{ t('rangeLanding.memberDescription.empty') }}
                  </p>
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

.meta-chip {
  background: #f6f9ff;
  border: 1px solid rgba(25, 118, 210, 0.16);
  color: #0f3b68;
}

.meta-row {
  align-items: center;
}

.range-description :deep(a) {
  color: #1976d2;
  text-decoration: underline;
}
</style>
