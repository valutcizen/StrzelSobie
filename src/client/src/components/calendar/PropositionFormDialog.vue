<template>
  <v-dialog
    :model-value="open"
    max-width="480"
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
        <template #default="{ isSubmitting, meta }">
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
              name="tracks"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                :label="t('calendar.forms.tracksLabel')"
                min="1"
                type="number"
                data-testid="proposition-form-tracks-input"
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
import type { CreatePropositionCommand, CreatedPropositionDto } from '@strzel-sobie/common'
import { isAxiosError } from 'axios'

export interface SelectedSlot {
  start: string
  end: string
}

interface PropositionFormDialogProps {
  open: boolean
  rangeSlug: string
  selectedSlot: SelectedSlot | null
}

const props = defineProps<PropositionFormDialogProps>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const schema = yup.object({
  date: yup.string().required(),
  startTime: yup.string().required(),
  endTime: yup.string().required(),
  tracks: yup.number().min(1).required(),
})

const { t } = useI18n()
const submissionError = ref<string | null>(null)
const defaultErrorMessage = t('calendar.propositionDialog.defaultError')

interface PropositionFormValues {
  date: string
  startTime: string
  endTime: string
  tracks: number
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

const initialValues = computed(() => {
  const fallback = defaultTimeValues()
  const selectedStart = props.selectedSlot?.start ?? null
  const selectedEnd = props.selectedSlot?.end ?? null

  const date = toDateInputValue(selectedStart) || fallback.date
  const startTime = ensureTimePrecision(toTimeInputValue(selectedStart) || fallback.startTime)
  const endTime = ensureTimePrecision(toTimeInputValue(selectedEnd) || fallback.endTime)

  return {
    date,
    startTime,
    endTime,
    tracks: 1,
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
      case 'invalid_time_window':
        return defaultErrorMessage
      default:
        return payload?.message ?? defaultErrorMessage
    }
  }

  return defaultErrorMessage
}

const submitProposition: SubmissionHandler = async (values, _ctx) => {
  const { date, startTime, endTime, tracks } = values as PropositionFormValues
  if (!props.rangeSlug) {
    return
  }

  submissionError.value = null

  const payload: CreatePropositionCommand = {
    eventDate: date,
    startTime: ensureTimePrecision(startTime),
    endTime: ensureTimePrecision(endTime),
    tracksRequested: Number(tracks),
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
