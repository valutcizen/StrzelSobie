<template>
  <Form
    :key="formKey"
    :initial-values="initialValues"
    :validation-schema="schema"
    @submit="handleSubmit"
  >
    <template #default="{ values, isSubmitting, meta }">
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

        <Field
          v-slot="{ field, errorMessage: fieldError }"
          name="name"
        >
          <v-text-field
            :label="t('events.form.labels.name')"
            :model-value="field.value"
            :error-messages="fieldError"
            data-testid="event-form-name-input"
            @update:model-value="field.onChange($event ?? '')"
            @blur="field.onBlur"
          />
        </Field>

        <Field
          v-slot="{ field, errorMessage: fieldError }"
          name="publicDescription"
        >
          <RichTextEditor
            :label="t('events.form.labels.publicDescription')"
            :model-value="field.value"
            :error-messages="fieldError"
            data-testid="event-form-public-description-editor"
            @update:model-value="field.onChange"
            @blur="field.onBlur"
          />
        </Field>

        <Field
          v-slot="{ field, errorMessage: fieldError }"
          name="memberDescription"
        >
          <RichTextEditor
            :label="t('events.form.labels.memberDescription')"
            :model-value="field.value ?? ''"
            :error-messages="fieldError"
            data-testid="event-form-member-description-editor"
            @update:model-value="field.onChange"
            @blur="field.onBlur"
          />
        </Field>

        <v-row dense>
          <v-col cols="12" md="4">
            <Field
              v-slot="{ field, errorMessage: fieldError }"
              name="eventDate"
            >
              <v-text-field
                :label="t('events.form.labels.eventDate')"
                type="date"
                :model-value="field.value"
                :error-messages="fieldError"
                data-testid="event-form-date-input"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
            </Field>
          </v-col>
          <v-col cols="12" md="4">
            <Field
              v-slot="{ field, errorMessage: fieldError }"
              name="startTime"
            >
              <v-text-field
                :label="t('events.form.labels.startTime')"
                type="time"
                :model-value="field.value"
                :error-messages="fieldError"
                data-testid="event-form-start-time-input"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
            </Field>
          </v-col>
          <v-col cols="12" md="4">
            <Field
              v-slot="{ field, errorMessage: fieldError }"
              name="endTime"
            >
              <v-text-field
                :label="t('events.form.labels.endTime')"
                type="time"
                :model-value="field.value"
                :error-messages="fieldError"
                data-testid="event-form-end-time-input"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
            </Field>
          </v-col>
        </v-row>

        <Field
          v-slot="{ field, errorMessage: fieldError }"
          name="registrationDeadline"
        >
          <v-text-field
            :label="t('events.form.labels.registrationDeadline')"
            type="date"
            :model-value="field.value ?? ''"
            :error-messages="fieldError"
            data-testid="event-form-registration-deadline-input"
            @update:model-value="field.onChange"
            @blur="field.onBlur"
          />
        </Field>

        <v-divider class="my-4" />

        <Field
          v-slot="{ field, errorMessage: fieldError }"
          name="audience"
        >
          <v-radio-group
            :model-value="field.value"
            :error-messages="fieldError"
            data-testid="event-form-audience-group"
            @update:model-value="field.onChange"
          >
            <template #label>
              <span class="text-subtitle-2">{{ t('events.form.labels.audience') }}</span>
            </template>
            <v-radio
              :label="t('events.form.options.audience.public')"
              :value="EventAudience.Public"
            />
            <v-radio
              :label="t('events.form.options.audience.membersOnly')"
              :value="EventAudience.MembersOnly"
            />
          </v-radio-group>
        </Field>

        <Field
          v-slot="{ field, errorMessage: fieldError }"
          name="capacityType"
        >
          <v-radio-group
            :model-value="field.value"
            :error-messages="fieldError"
            data-testid="event-form-capacity-group"
            @update:model-value="field.onChange"
          >
            <template #label>
              <span class="text-subtitle-2">{{ t('events.form.labels.capacity') }}</span>
            </template>
            <v-radio
              :label="t('events.form.options.capacity.unlimited')"
              :value="EventCapacityType.Unlimited"
            />
            <v-radio
              :label="t('events.form.options.capacity.limited')"
              :value="EventCapacityType.Limited"
            />
          </v-radio-group>
        </Field>

        <v-row
          v-if="values.capacityType === EventCapacityType.Limited"
          dense
        >
          <v-col cols="12" md="6">
            <Field
              v-slot="{ field, errorMessage: fieldError }"
              name="capacityLimit"
            >
              <v-text-field
                :label="t('events.form.labels.slots')"
                type="number"
                min="1"
                :model-value="field.value"
                :error-messages="fieldError"
                data-testid="event-form-slots-input"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
            </Field>
          </v-col>
          <v-col cols="12" md="6">
            <Field
              v-slot="{ field, errorMessage: fieldError }"
              name="waitlistLimit"
            >
              <v-text-field
                :label="t('events.form.labels.waitlistSlots')"
                type="number"
                min="0"
                :model-value="field.value"
                :error-messages="fieldError"
                data-testid="event-form-waitlist-input"
                @update:model-value="field.onChange"
                @blur="field.onBlur"
              />
            </Field>
          </v-col>
        </v-row>

        <Field
          v-if="values.audience === EventAudience.MembersOnly"
          v-slot="{ field }"
          name="guestPolicy"
        >
          <v-switch
            :model-value="field.value === EventGuestPolicy.GuestsAllowed"
            color="primary"
            :label="t('events.form.labels.allowGuests')"
            data-testid="event-form-guest-policy-switch"
            @update:model-value="(value) => field.onChange(value ? EventGuestPolicy.GuestsAllowed : EventGuestPolicy.NoGuests)"
          />
        </Field>

        <Field
          v-slot="{ field }"
          name="registrationType"
        >
          <input
            type="hidden"
            v-bind="field"
          >
        </Field>
      </v-card-text>

      <v-card-actions class="px-6 pb-6">
        <v-spacer />
        <v-btn
          variant="text"
          data-testid="event-form-cancel-button"
          @click="emit('cancel')"
        >
          {{ t('common.actions.cancel') }}
        </v-btn>
        <v-btn
          :loading="isSubmitting || submitting"
          :disabled="!meta.valid"
          color="primary"
          type="submit"
          data-testid="event-form-submit-button"
        >
          {{ submitLabel }}
        </v-btn>
      </v-card-actions>
    </template>
  </Form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Field, Form } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import {
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
} from '@strzel-sobie/common/models'
import RichTextEditor from '@/components/common/RichTextEditor.vue'

export type EventFormValues = {
  name: string
  publicDescription: string
  memberDescription: string | null
  eventDate: string
  startTime: string
  endTime: string
  registrationDeadline: string | null
  registrationType: EventRegistrationType
  audience: EventAudience
  capacityType: EventCapacityType
  capacityLimit: number | null
  waitlistLimit: number | null
  guestPolicy: EventGuestPolicy | null
}

withDefaults(
  defineProps<{
    formKey?: number | string
    initialValues: EventFormValues
    submitLabel: string
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  {
    formKey: 0,
    submitting: false,
    errorMessage: null,
  },
)

const emit = defineEmits<{
  (event: 'submit', values: EventFormValues): void
  (event: 'cancel'): void
}>()

const { t } = useI18n()

const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

const schema = computed(() =>
  yup.object({
    name: yup.string().trim().required(t('events.form.validation.required')),
    publicDescription: yup.string().trim().required(t('events.form.validation.required')),
    memberDescription: yup.string().nullable(),
    eventDate: yup
      .string()
      .matches(dateRegex, t('events.form.validation.invalidDate'))
      .required(t('events.form.validation.required')),
    startTime: yup
      .string()
      .matches(timeRegex, t('events.form.validation.invalidTime'))
      .required(t('events.form.validation.required')),
    endTime: yup
      .string()
      .matches(timeRegex, t('events.form.validation.invalidTime'))
      .required(t('events.form.validation.required'))
      .test('after-start', t('events.form.validation.endAfterStart'), function (value) {
        const { startTime } = this.parent as { startTime?: string }
        if (!value || !startTime || !timeRegex.test(startTime) || !timeRegex.test(value)) {
          return true
        }
        const [startHours, startMinutes] = startTime.split(':').map(Number)
        const [endHours, endMinutes] = value.split(':').map(Number)
        return endHours > startHours || (endHours === startHours && endMinutes > startMinutes)
      }),
    registrationDeadline: yup
      .string()
      .nullable()
      .test('valid-date', t('events.form.validation.invalidDate'), (value) => {
        if (!value) return true
        return dateRegex.test(value)
      }),
    registrationType: yup
      .mixed<EventRegistrationType>()
      .oneOf([EventRegistrationType.Notice, EventRegistrationType.RegistrationRequired])
      .required(),
    audience: yup
      .mixed<EventAudience>()
      .oneOf([EventAudience.Public, EventAudience.MembersOnly])
      .required(t('events.form.validation.required')),
    capacityType: yup
      .mixed<EventCapacityType>()
      .oneOf([EventCapacityType.Unlimited, EventCapacityType.Limited])
      .required(t('events.form.validation.required')),
    capacityLimit: yup
      .number()
      .nullable()
      .when('capacityType', {
        is: EventCapacityType.Limited,
        then: (schema) =>
          schema
            .typeError(t('events.form.validation.required'))
            .min(1, t('events.form.validation.minSlots'))
            .required(t('events.form.validation.required')),
        otherwise: (schema) => schema.nullable(),
      }),
    waitlistLimit: yup
      .number()
      .nullable()
      .when('capacityType', {
        is: EventCapacityType.Limited,
        then: (schema) =>
          schema
            .typeError(t('events.form.validation.required'))
            .min(0, t('events.form.validation.minWaitlist'))
            .required(t('events.form.validation.required')),
        otherwise: (schema) => schema.nullable(),
      }),
    guestPolicy: yup
      .mixed<EventGuestPolicy>()
      .nullable()
      .when('audience', {
        is: EventAudience.MembersOnly,
        then: (schema) =>
          schema.oneOf([EventGuestPolicy.GuestsAllowed, EventGuestPolicy.NoGuests]),
        otherwise: (schema) => schema.nullable(),
      }),
  }),
)

const handleSubmit: SubmissionHandler = (values) => {
  emit('submit', values as EventFormValues)
}
</script>
