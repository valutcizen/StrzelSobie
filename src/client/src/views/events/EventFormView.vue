<template>
  <v-container
    class="py-8"
    fluid
    data-testid="event-form-view"
  >
    <v-row justify="center">
      <v-col cols="12" lg="8">
        <v-card>
          <v-toolbar
            color="primary"
            density="comfortable"
          >
            <v-toolbar-title data-testid="event-form-title">
              {{ isEdit ? t('events.form.editTitle') : t('events.form.createTitle') }}
            </v-toolbar-title>
            <v-spacer />
            <v-btn
              v-if="isEdit"
              icon="mdi-refresh"
              variant="text"
              :disabled="isLoading"
              :aria-label="t('events.form.actions.refresh')"
              data-testid="event-form-refresh-button"
              @click="loadEvent(true)"
            />
          </v-toolbar>

          <v-progress-linear
            v-if="isLoading"
            indeterminate
            color="primary"
          />

          <EventForm
            :form-key="formKey"
            :initial-values="initialValues"
            :submit-label="submitLabel"
            :submitting="isSaving"
            :error-message="errorMessage"
            @submit="handleSubmit"
            @cancel="handleCancel"
          />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import {
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
  type CreateEventCommand,
  type EventDetailsDto,
  type UpdateEventCommand,
} from '@strzel-sobie/common/models'
import EventForm, { type EventFormValues } from '@/components/events/EventForm.vue'
import { http } from '@/services/http'
import { toDateOnly } from '@/utils/datetime'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const isLoading = ref(false)
const isSaving = ref(false)
const errorMessage = ref<string | null>(null)
const formKey = ref(0)

const rangeSlug = computed(() => {
  const param = route.params.rangeSlug
  return typeof param === 'string' ? param : ''
})

const eventSlug = computed(() => {
  const param = route.params.eventSlug
  return typeof param === 'string' ? param : null
})

const isEdit = computed(() => Boolean(eventSlug.value))

const submitLabel = computed(() =>
  isEdit.value ? t('common.actions.save') : t('common.actions.create'),
)

const initialValues = ref<EventFormValues>({
  name: '',
  publicDescription: '',
  memberDescription: null,
  eventDate: toDateOnly(new Date()),
  startTime: '09:00',
  endTime: '10:00',
  registrationDeadline: null,
  registrationType: EventRegistrationType.RegistrationRequired,
  audience: EventAudience.Public,
  capacityType: EventCapacityType.Unlimited,
  capacityLimit: null,
  waitlistLimit: null,
  guestPolicy: null,
})

const mapDetailsToFormValues = (event: EventDetailsDto): EventFormValues => ({
  name: event.name,
  publicDescription: event.publicDescription,
  memberDescription: event.memberDescription ?? null,
  eventDate: event.eventDate,
  startTime: event.startTime,
  endTime: event.endTime,
  registrationDeadline: event.registrationDeadline ?? null,
  registrationType: event.registrationType,
  audience: event.audience,
  capacityType: event.capacityType,
  capacityLimit: event.capacityLimit ?? null,
  waitlistLimit: event.waitlistLimit ?? null,
  guestPolicy: event.guestPolicy ?? null,
})

const normalizePayload = (values: EventFormValues) => {
  const toNullableNumber = (value: number | string | null) => {
    if (value === null) {
      return null
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null
    }
    const trimmed = value.trim()
    if (trimmed === '') {
      return null
    }
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
  }

  const payload = {
    name: values.name.trim(),
    publicDescription: values.publicDescription.trim(),
    memberDescription: values.memberDescription?.trim() || null,
    eventDate: values.eventDate,
    startTime: values.startTime,
    endTime: values.endTime,
    registrationType: values.registrationType,
    audience: values.audience,
    capacityType: values.capacityType,
    capacityLimit: toNullableNumber(values.capacityLimit),
    waitlistLimit: toNullableNumber(values.waitlistLimit),
    guestPolicy: values.guestPolicy ?? null,
    registrationDeadline: values.registrationDeadline?.trim() || null,
  }

  if (values.capacityType === EventCapacityType.Unlimited) {
    payload.capacityLimit = null
    payload.waitlistLimit = null
  }

  if (values.audience === EventAudience.Public) {
    payload.guestPolicy = null
  } else if (!payload.guestPolicy) {
    payload.guestPolicy = EventGuestPolicy.NoGuests
  }

  return payload
}

const loadEvent = async (force = false) => {
  if (!isEdit.value || !rangeSlug.value || !eventSlug.value) {
    return
  }

  if (!force && initialValues.value.name) {
    return
  }

  isLoading.value = true
  errorMessage.value = null

  try {
    const { data } = await http.get<EventDetailsDto>(
      `/ranges/${rangeSlug.value}/events/${eventSlug.value}`,
    )
    initialValues.value = mapDetailsToFormValues(data)
    formKey.value += 1
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('events.form.errors.loadFailed')
  } finally {
    isLoading.value = false
  }
}

const handleSubmit = async (values: EventFormValues) => {
  if (!rangeSlug.value) {
    return
  }

  isSaving.value = true
  errorMessage.value = null

  try {
    if (isEdit.value && eventSlug.value) {
      const payload = normalizePayload(values) as UpdateEventCommand
      await http.patch(`/ranges/${rangeSlug.value}/events/${eventSlug.value}`, payload)
      await router.push({
        name: 'EventDetail',
        params: { rangeSlug: rangeSlug.value, eventSlug: eventSlug.value },
      })
    } else {
      const payload = normalizePayload(values) as CreateEventCommand
      const { data } = await http.post<EventDetailsDto>(
        `/ranges/${rangeSlug.value}/events`,
        payload,
      )
      await router.push({
        name: 'EventDetail',
        params: { rangeSlug: rangeSlug.value, eventSlug: data.slug },
      })
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t('events.form.errors.saveFailed')
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  if (isEdit.value && rangeSlug.value && eventSlug.value) {
    router.push({
      name: 'EventDetail',
      params: { rangeSlug: rangeSlug.value, eventSlug: eventSlug.value },
    })
    return
  }

  if (rangeSlug.value) {
    router.push({ name: 'RangeLanding', params: { rangeSlug: rangeSlug.value } })
  } else {
    router.push({ name: 'RangeDirectory' })
  }
}

if (isEdit.value) {
  void loadEvent(true)
}
</script>
