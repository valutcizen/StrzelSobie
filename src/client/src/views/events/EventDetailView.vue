<template>
  <v-container
    class="py-8"
    fluid
    data-testid="event-detail-view"
  >
    <v-row justify="center">
      <v-col cols="12" lg="9">
        <v-card>
          <v-toolbar
            color="primary"
            density="comfortable"
          >
            <v-toolbar-title data-testid="event-detail-title">
              {{ eventDetails?.name ?? t('events.detail.loadingTitle') }}
            </v-toolbar-title>
            <v-spacer />
            <v-btn
              icon="mdi-refresh"
              variant="text"
              :disabled="isLoading"
              :aria-label="t('events.detail.actions.refresh')"
              data-testid="event-detail-refresh-button"
              @click="loadEvent(true)"
            />
          </v-toolbar>

          <v-card-text>
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              {{ errorMessage }}
            </v-alert>

            <v-alert
              v-if="eventDetails?.status === EventStatus.Cancelled"
              type="warning"
              variant="tonal"
              border="start"
              class="mb-4"
              data-testid="event-detail-cancelled-alert"
            >
              {{ t('events.detail.status.cancelled') }}
            </v-alert>

            <v-progress-linear
              v-if="isLoading"
              indeterminate
              color="primary"
              class="mb-4"
            />

            <template v-if="eventDetails">
              <div class="d-flex flex-wrap gap-2 mb-4">
                <v-chip
                  size="small"
                  variant="tonal"
                  color="primary"
                  data-testid="event-detail-audience-chip"
                >
                  {{ audienceLabel }}
                </v-chip>
                <v-chip
                  size="small"
                  variant="tonal"
                  :color="registrationOpen ? 'success' : 'warning'"
                  data-testid="event-detail-registration-chip"
                >
                  {{ registrationOpen ? t('events.detail.registration.open') : t('events.detail.registration.closed') }}
                </v-chip>
              </div>

              <v-row dense>
                <v-col cols="12" md="7">
                  <v-card variant="tonal">
                    <v-card-title class="text-subtitle-1">
                      {{ t('events.detail.sections.description') }}
                    </v-card-title>
                    <v-divider />
                    <v-card-text data-testid="event-detail-public-description">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div
                        v-if="eventDetails.publicDescription"
                        class="event-description"
                        v-html="eventDetails.publicDescription"
                      />
                      <p
                        v-else
                        class="text-medium-emphasis mb-0"
                      >
                        {{ t('events.detail.emptyDescription') }}
                      </p>
                    </v-card-text>
                  </v-card>

                  <v-card
                    v-if="showMemberDescription"
                    variant="outlined"
                    color="primary"
                    class="mt-4"
                  >
                    <v-card-title class="text-subtitle-1 d-flex align-center gap-2">
                      <v-icon color="primary">
                        mdi-shield-account
                      </v-icon>
                      {{ t('events.detail.sections.memberDescription') }}
                    </v-card-title>
                    <v-divider />
                    <v-card-text data-testid="event-detail-member-description">
                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <div
                        v-if="eventDetails.memberDescription"
                        class="event-description"
                        v-html="eventDetails.memberDescription"
                      />
                      <p
                        v-else
                        class="text-medium-emphasis mb-0"
                      >
                        {{ t('events.detail.emptyMemberDescription') }}
                      </p>
                    </v-card-text>
                  </v-card>
                </v-col>

                <v-col cols="12" md="5">
                  <v-card variant="outlined">
                    <v-card-title class="text-subtitle-1">
                      {{ t('events.detail.sections.details') }}
                    </v-card-title>
                    <v-divider />
                    <v-card-text>
                      <v-list density="compact">
                        <v-list-item>
                          <template #prepend>
                            <v-icon>mdi-calendar-clock</v-icon>
                          </template>
                          <v-list-item-title>{{ formattedEventDate }}</v-list-item-title>
                          <v-list-item-subtitle>{{ formattedEventTime }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item>
                          <template #prepend>
                            <v-icon>mdi-calendar-alert</v-icon>
                          </template>
                          <v-list-item-title>{{ registrationDeadlineLabel }}</v-list-item-title>
                          <v-list-item-subtitle>{{ t('events.detail.labels.registrationDeadline') }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item>
                          <template #prepend>
                            <v-icon>mdi-account-multiple</v-icon>
                          </template>
                          <v-list-item-title>{{ capacityLabel }}</v-list-item-title>
                          <v-list-item-subtitle>{{ t('events.detail.labels.capacity') }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="remainingSlotsLabel">
                          <template #prepend>
                            <v-icon>mdi-seat</v-icon>
                          </template>
                          <v-list-item-title>{{ remainingSlotsLabel }}</v-list-item-title>
                          <v-list-item-subtitle>{{ t('events.detail.labels.remainingSlots') }}</v-list-item-subtitle>
                        </v-list-item>
                        <v-list-item v-if="waitlistLabel">
                          <template #prepend>
                            <v-icon>mdi-timer-sand</v-icon>
                          </template>
                          <v-list-item-title>{{ waitlistLabel }}</v-list-item-title>
                          <v-list-item-subtitle>{{ t('events.detail.labels.waitlist') }}</v-list-item-subtitle>
                        </v-list-item>
                      </v-list>
                    </v-card-text>
                  </v-card>

                  <v-alert
                    v-if="signupStatusLabel"
                    type="success"
                    variant="tonal"
                    border="start"
                    class="mt-4"
                    data-testid="event-detail-signup-status"
                  >
                    {{ signupStatusLabel }}
                  </v-alert>

                  <div class="mt-4 d-flex flex-column gap-2">
                    <v-btn
                      :disabled="signupDisabled"
                      color="primary"
                      data-testid="event-detail-signup-button"
                      @click="handleSignupClick"
                    >
                      {{ signupActionLabel }}
                    </v-btn>
                    <v-btn
                      v-if="canManageEvent"
                      variant="outlined"
                      color="primary"
                      data-testid="event-detail-edit-button"
                      @click="openEdit"
                    >
                      {{ t('events.detail.actions.edit') }}
                    </v-btn>
                  </div>
                </v-col>
              </v-row>

              <ParticipantList
                v-if="canManageEvent && participantsReady"
                class="mt-6"
                :participants="eventDetails.participants ?? []"
                :waitlist="eventDetails.waitlist ?? []"
              />
            </template>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <SignUpDialog
      :open="signupDialogOpen"
      :event-name="eventDetails?.name ?? ''"
      :guest-policy="eventDetails?.guestPolicy ?? null"
      :loading="signupLoading"
      @update:open="signupDialogOpen = $event"
      @confirm="handleSignupConfirm"
    />

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      timeout="3000"
      data-testid="event-detail-snackbar"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { format, parseISO } from 'date-fns'
import { enUS, pl as plLocale } from 'date-fns/locale'
import {
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
  EventSignupStatus,
  EventStatus,
  type CreateEventSignupCommand,
  type EventDetailsDto,
  type EventSignupResultDto,
} from '@strzel-sobie/common/models'
import ParticipantList from '@/components/events/ParticipantList.vue'
import SignUpDialog from '@/components/events/SignUpDialog.vue'
import { http } from '@/services/http'
import { useAuthStore } from '@/stores/auth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { UserRoleEnum } from '@/types/auth'
import { combineDateAndTime } from '@/utils/datetime'

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const authDialogStore = useAuthDialogStore()

const eventDetails = ref<EventDetailsDto | null>(null)
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const signupDialogOpen = ref(false)
const signupLoading = ref(false)
const signupOverride = ref<EventSignupStatus | null>(null)

const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const rangeSlug = computed(() => {
  const param = route.params.rangeSlug
  return typeof param === 'string' ? param : ''
})

const eventSlug = computed(() => {
  const param = route.params.eventSlug
  return typeof param === 'string' ? param : ''
})

const dateLocale = computed(() => (locale.value === 'pl' ? plLocale : enUS))

const loadEvent = async (force = false) => {
  if (!rangeSlug.value || !eventSlug.value) {
    return
  }

  if (!force && eventDetails.value && !errorMessage.value) {
    return
  }

  isLoading.value = true
  errorMessage.value = null

  try {
    const { data } = await http.get<EventDetailsDto>(
      `/ranges/${rangeSlug.value}/events/${eventSlug.value}`,
    )
    eventDetails.value = data
    signupOverride.value = null
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('events.detail.errors.loadFailed')
  } finally {
    isLoading.value = false
  }
}

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbar.open = true
  snackbar.message = message
  snackbar.color = color
}

const showMemberDescription = computed(() => Boolean(eventDetails.value?.memberDescription))

const formattedEventDate = computed(() => {
  if (!eventDetails.value) {
    return ''
  }
  try {
    return format(parseISO(eventDetails.value.eventDate), 'PPPP', { locale: dateLocale.value })
  } catch {
    return eventDetails.value.eventDate
  }
})

const formattedEventTime = computed(() => {
  if (!eventDetails.value) {
    return ''
  }
  const start = combineDateAndTime(eventDetails.value.eventDate, eventDetails.value.startTime)
  const end = combineDateAndTime(eventDetails.value.eventDate, eventDetails.value.endTime)
  try {
    return `${format(parseISO(start), 'p', { locale: dateLocale.value })} – ${format(parseISO(end), 'p', { locale: dateLocale.value })}`
  } catch {
    return `${eventDetails.value.startTime} – ${eventDetails.value.endTime}`
  }
})

const registrationDeadlineLabel = computed(() => {
  const deadline = eventDetails.value?.registrationDeadline
  if (!deadline) {
    return t('events.detail.registrationDeadline.none')
  }
  try {
    return format(parseISO(deadline), 'PP', { locale: dateLocale.value })
  } catch {
    return deadline
  }
})

const audienceLabel = computed(() => {
  if (!eventDetails.value) {
    return ''
  }
  return eventDetails.value.audience === EventAudience.Public
    ? t('events.detail.audience.public')
    : t('events.detail.audience.membersOnly')
})

const participantsCount = computed(() => eventDetails.value?.participants?.length ?? null)
const waitlistCount = computed(() => eventDetails.value?.waitlist?.length ?? null)

const capacityLabel = computed(() => {
  if (!eventDetails.value) {
    return ''
  }
  if (eventDetails.value.capacityType === EventCapacityType.Unlimited) {
    return t('events.detail.capacity.unlimited')
  }
  const limit = eventDetails.value.capacityLimit ?? 0
  return t('events.detail.capacity.limited', { count: limit })
})

const remainingSlotsLabel = computed(() => {
  if (!eventDetails.value) {
    return null
  }
  if (
    eventDetails.value.capacityType !== EventCapacityType.Limited ||
    eventDetails.value.capacityLimit === null ||
    participantsCount.value === null
  ) {
    return null
  }

  const remaining = Math.max(0, eventDetails.value.capacityLimit - participantsCount.value)
  return t('events.detail.capacity.remaining', { count: remaining })
})

const waitlistLabel = computed(() => {
  if (!eventDetails.value) {
    return null
  }
  if (eventDetails.value.waitlistLimit === null) {
    return null
  }

  if (waitlistCount.value === null) {
    return t('events.detail.waitlist.available', { count: eventDetails.value.waitlistLimit })
  }

  const remaining = Math.max(0, eventDetails.value.waitlistLimit - waitlistCount.value)
  return t('events.detail.waitlist.remaining', { count: remaining })
})

const registrationOpen = computed(() => {
  if (!eventDetails.value) {
    return false
  }
  if (eventDetails.value.status !== EventStatus.Active) {
    return false
  }
  if (eventDetails.value.registrationType !== EventRegistrationType.RegistrationRequired) {
    return false
  }
  if (!eventDetails.value.registrationDeadline) {
    return true
  }
  const deadline = new Date(eventDetails.value.registrationDeadline)
  if (Number.isNaN(deadline.getTime())) {
    return true
  }
  return Date.now() <= deadline.getTime()
})

const isEventFull = computed(() => {
  if (!eventDetails.value || participantsCount.value === null) {
    return false
  }
  if (eventDetails.value.capacityType !== EventCapacityType.Limited) {
    return false
  }
  if (eventDetails.value.capacityLimit === null) {
    return false
  }
  return participantsCount.value >= eventDetails.value.capacityLimit
})

const isWaitlistFull = computed(() => {
  if (!eventDetails.value || waitlistCount.value === null) {
    return false
  }
  if (eventDetails.value.waitlistLimit === null) {
    return false
  }
  return waitlistCount.value >= eventDetails.value.waitlistLimit
})

const hasWaitlist = computed(() => eventDetails.value?.waitlistLimit !== null)

const signupStatusFromDetails = computed(() => {
  if (!eventDetails.value || !authStore.user) {
    return null
  }
  const userId = Number(authStore.user.id)
  const participantMatch = eventDetails.value.participants?.some((item) => item.userId === userId)
  if (participantMatch) {
    return EventSignupStatus.Confirmed
  }
  const waitlistMatch = eventDetails.value.waitlist?.some((item) => item.userId === userId)
  if (waitlistMatch) {
    return EventSignupStatus.Waitlisted
  }
  return null
})

const signupStatus = computed(() => signupOverride.value ?? signupStatusFromDetails.value)

const signupStatusLabel = computed(() => {
  if (signupStatus.value === EventSignupStatus.Confirmed) {
    return t('events.detail.signup.confirmed')
  }
  if (signupStatus.value === EventSignupStatus.Waitlisted) {
    return t('events.detail.signup.waitlisted')
  }
  return null
})

const signupActionLabel = computed(() => {
  if (signupStatus.value) {
    return t('events.detail.actions.cancelRegistration')
  }
  if (isEventFull.value && hasWaitlist.value && !isWaitlistFull.value) {
    return t('events.detail.actions.joinWaitlist')
  }
  return t('events.detail.actions.signUp')
})

const signupDisabled = computed(() => {
  if (signupStatus.value) {
    return false
  }
  if (!registrationOpen.value) {
    return true
  }
  if (isEventFull.value && (!hasWaitlist.value || isWaitlistFull.value)) {
    return true
  }
  return false
})

const canManageEvent = computed(() => {
  if (!eventDetails.value || !authStore.user) {
    return false
  }

  const isOrganizer = String(eventDetails.value.createdBy) === authStore.user.id
  if (isOrganizer) {
    return true
  }

  return (
    authStore.hasAnyRole([UserRoleEnum.ClubCommunityAdministrator]) ||
    authStore.hasAnyRangeRole([UserRoleEnum.ShootingRangeAdministrator])
  )
})

const participantsReady = computed(
  () =>
    Array.isArray(eventDetails.value?.participants) &&
    Array.isArray(eventDetails.value?.waitlist),
)

const handleSignupClick = () => {
  if (signupStatus.value) {
    void cancelSignup()
    return
  }

  if (!authStore.isAuthenticated) {
    authDialogStore.open({ tab: 'login', redirectPath: route.fullPath })
    return
  }

  signupDialogOpen.value = true
}

const handleSignupConfirm = async ({ guests }: { guests: number }) => {
  if (!eventDetails.value || !rangeSlug.value || !eventSlug.value) {
    return
  }

  signupLoading.value = true

  try {
    const payload: CreateEventSignupCommand = {}
    if (eventDetails.value.guestPolicy === EventGuestPolicy.GuestsAllowed && guests > 0) {
      payload.guests = guests
    }
    const { data } = await http.post<EventSignupResultDto>(
      `/ranges/${rangeSlug.value}/events/${eventSlug.value}/signups`,
      payload,
    )
    signupOverride.value = data.status
    signupDialogOpen.value = false
    showSnackbar(t('events.detail.signup.success'))
    if (canManageEvent.value) {
      await loadEvent(true)
    }
  } catch (error) {
    showSnackbar(
      error instanceof Error ? error.message : t('events.detail.errors.signupFailed'),
      'error',
    )
  } finally {
    signupLoading.value = false
  }
}

const cancelSignup = async () => {
  if (!rangeSlug.value || !eventSlug.value) {
    return
  }

  try {
    await http.delete(`/ranges/${rangeSlug.value}/events/${eventSlug.value}/signups/me`)
    signupOverride.value = null
    showSnackbar(t('events.detail.signup.cancelled'))
    if (canManageEvent.value) {
      await loadEvent(true)
    }
  } catch (error) {
    showSnackbar(
      error instanceof Error ? error.message : t('events.detail.errors.cancelFailed'),
      'error',
    )
  }
}

const openEdit = () => {
  if (!rangeSlug.value || !eventSlug.value) {
    return
  }

  router.push({
    name: 'EventEdit',
    params: { rangeSlug: rangeSlug.value, eventSlug: eventSlug.value },
  })
}

watch(
  [rangeSlug, eventSlug],
  () => {
    void loadEvent(true)
  },
  { immediate: true },
)
</script>

<style scoped>
.event-description :deep(a) {
  color: #1976d2;
  text-decoration: underline;
}
</style>
