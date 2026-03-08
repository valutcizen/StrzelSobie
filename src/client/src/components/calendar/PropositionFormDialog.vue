<template>
  <v-dialog
    :model-value="open"
    max-width="560"
    data-testid="proposition-form-dialog"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>{{ t('calendar.propositionDialog.title') }}</v-card-title>
      <Form
        :key="formKey"
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitProposition"
      >
        <template #default="{ isSubmitting, meta, values }">
          <v-card-text>
            <v-alert
              v-if="submissionError"
              type="error"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              {{ submissionError }}
            </v-alert>
            <Field
              v-slot="{ field, errorMessage }"
              name="date"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                :label="t('calendar.forms.dateLabel')"
                type="date"
                data-testid="proposition-form-date-input"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="startTime"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                :label="t('calendar.forms.startTimeLabel')"
                type="time"
                data-testid="proposition-form-start-time-input"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="endTime"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                :label="t('calendar.forms.endTimeLabel')"
                type="time"
                data-testid="proposition-form-end-time-input"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="firingLineId"
            >
              <v-select
                v-bind="field"
                :items="firingLineItems"
                item-title="title"
                item-value="value"
                :error-messages="errorMessage"
                :label="t('calendar.forms.firingLineLabel')"
                data-testid="proposition-form-firing-line-select"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="trackNos"
            >
              <v-select
                :model-value="field.value"
                multiple
                chips
                closable-chips
                :items="trackItems(values.firingLineId)"
                item-title="title"
                item-value="value"
                :error-messages="errorMessage"
                :label="t('calendar.forms.trackNosLabel')"
                data-testid="proposition-form-track-nos-select"
                @update:model-value="(value) => field.onChange(value)"
              />
            </Field>
            <Field
              v-slot="{ field }"
              name="hasCoordinatorLicenseInGroup"
            >
              <v-checkbox
                :model-value="field.value"
                :disabled="isCoordinator"
                :label="t('calendar.propositionDialog.coordinatorDeclarationLabel')"
                data-testid="proposition-form-coordinator-checkbox"
                @update:model-value="(value) => field.onChange(Boolean(value))"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="targetAdminUserId"
            >
              <v-select
                :model-value="field.value"
                clearable
                :items="adminTargetItems"
                item-title="title"
                item-value="value"
                :error-messages="errorMessage"
                :label="t('calendar.propositionDialog.targetAdminLabel')"
                data-testid="proposition-form-target-admin-select"
                @update:model-value="(value) => field.onChange(value ?? null)"
              />
            </Field>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              data-testid="proposition-form-cancel-button"
              @click="closeDialog"
            >
              {{ t('common.actions.cancel') }}
            </v-btn>
            <v-btn
              :disabled="!meta.valid"
              :loading="isSubmitting"
              color="primary"
              type="submit"
              data-testid="proposition-form-submit-button"
            >
              {{ t('calendar.propositionDialog.submit') }}
            </v-btn>
          </v-card-actions>
        </template>
      </Form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Form, Field } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { useI18n } from 'vue-i18n'
import { http } from '../../services/http'
import { ensureTimePrecision, toDateInputValue, toTimeInputValue } from '../../utils/datetime'
import type { CreatePropositionCommand, CreatedPropositionDto, RangeDetailsDto } from '@strzel-sobie/common'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { UserRoleEnum } from '@/types/auth'

export interface SelectedSlot {
  start: string
  end: string
}

interface PropositionFormDialogProps {
  open: boolean
  rangeSlug: string
  selectedSlot: SelectedSlot | null
  firingLines: RangeDetailsDto['firingLines']
  adminContacts: RangeDetailsDto['administratorContacts']
}

const props = defineProps<PropositionFormDialogProps>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const authStore = useAuthStore()
const isCoordinator = computed(() => authStore.hasRole(UserRoleEnum.Coordinator))

const schema = yup.object({
  date: yup.string().required(),
  startTime: yup.string().required(),
  endTime: yup.string().required(),
  firingLineId: yup.number().min(1).required(),
  trackNos: yup.array().min(1).required(),
  hasCoordinatorLicenseInGroup: yup.boolean().required(),
  targetAdminUserId: yup.number().nullable(),
})

const { t } = useI18n()
const submissionError = ref<string | null>(null)
const defaultErrorMessage = t('calendar.propositionDialog.defaultError')

interface PropositionFormValues {
  date: string
  startTime: string
  endTime: string
  firingLineId: number | null
  trackNos: number[]
  hasCoordinatorLicenseInGroup: boolean
  targetAdminUserId: number | null
}

const defaultTimeValues = () => {
  const start = new Date()
  start.setMinutes(0, 0, 0)

  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  const startIso = start.toISOString()
  const endIso = end.toISOString()

  return {
    date: toDateInputValue(startIso),
    startTime: ensureTimePrecision(toTimeInputValue(startIso)),
    endTime: ensureTimePrecision(toTimeInputValue(endIso)),
  }
}

const firingLineItems = computed(() =>
  (props.firingLines ?? []).map((line) => ({
    value: line.id,
    title: `${line.name} (${line.lengthMeters}m, ${line.tracksCount})`,
  })),
)

const adminTargetItems = computed(() => [
  {
    value: null,
    title: t('calendar.propositionDialog.targetAdminNone'),
  },
  ...(props.adminContacts ?? []).map((contact) => ({
    value: contact.userId,
    title: contact.displayName ?? contact.email ?? `#${contact.userId}`,
  })),
])

const trackItems = (firingLineId: number | null | undefined) => {
  const line = (props.firingLines ?? []).find((item) => item.id === firingLineId)
  if (!line) {
    return []
  }

  return Array.from({ length: line.tracksCount }, (_, index) => ({
    value: index + 1,
    title: `${index + 1}`,
  }))
}

const initialValues = computed<PropositionFormValues>(() => {
  const fallback = defaultTimeValues()
  const selectedStart = props.selectedSlot?.start ?? null
  const selectedEnd = props.selectedSlot?.end ?? null

  const date = toDateInputValue(selectedStart) || fallback.date
  const startTime = ensureTimePrecision(toTimeInputValue(selectedStart) || fallback.startTime)
  const endTime = ensureTimePrecision(toTimeInputValue(selectedEnd) || fallback.endTime)
  const firingLineId = props.firingLines[0]?.id ?? null
  const defaultTrackNo = firingLineId ? [1] : []

  return {
    date,
    startTime,
    endTime,
    firingLineId,
    trackNos: defaultTrackNo,
    hasCoordinatorLicenseInGroup: isCoordinator.value,
    targetAdminUserId: null,
  }
})

const formKey = computed(() => (props.selectedSlot ? `${props.selectedSlot.start}-${props.selectedSlot.end}` : 'default'))

const onDialogToggle = (value: boolean) => {
  if (!value) {
    submissionError.value = null
  }
  emit('update:open', value)
}

const closeDialog = () => {
  submissionError.value = null
  emit('update:open', false)
}

const mapSubmissionError = (error: unknown): string => {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { code?: string; message?: string } | undefined
    switch (payload?.code) {
      case 'range_closed':
        return t('calendar.errors.rangeClosed')
      case 'coordinator_declaration_required':
        return t('calendar.errors.coordinatorDeclarationRequired')
      case 'member_role_required':
        return t('calendar.errors.memberRoleRequired')
      case 'invalid_target_admin':
        return t('calendar.errors.invalidTargetAdmin')
      case 'invalid_time_window':
        return t('calendar.errors.invalidReservationTime')
      default:
        return payload?.message ?? defaultErrorMessage
    }
  }

  return defaultErrorMessage
}

const submitProposition: SubmissionHandler = async (values, _ctx) => {
  const { date, startTime, endTime } = values as PropositionFormValues
  const firingLineId = Number((values as PropositionFormValues).firingLineId)
  const trackNos = ((values as PropositionFormValues).trackNos ?? [])
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
  if (!props.rangeSlug) {
    return
  }

  submissionError.value = null

  const payload: CreatePropositionCommand = {
    eventDate: date,
    startTime: ensureTimePrecision(startTime),
    endTime: ensureTimePrecision(endTime),
    firingLineId,
    trackNos,
    hasCoordinatorLicenseInGroup: isCoordinator.value
      ? true
      : Boolean((values as PropositionFormValues).hasCoordinatorLicenseInGroup),
    targetAdminUserId: (values as PropositionFormValues).targetAdminUserId ?? undefined,
  }

  try {
    await http.post<CreatedPropositionDto>(`/ranges/${props.rangeSlug}/propositions`, payload)
  } catch (error) {
    submissionError.value = mapSubmissionError(error)
    return
  }

  emit('submitted')
  closeDialog()
}
</script>
