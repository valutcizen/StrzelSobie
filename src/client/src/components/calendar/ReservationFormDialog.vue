<template>
  <v-dialog
    :model-value="open"
    max-width="560"
    data-testid="reservation-form-dialog"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>{{ t('calendar.reservationDialog.title') }}</v-card-title>
      <Form
        :key="formKey"
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitReservation"
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
              {{ submissionError.message }}
              <div
                v-if="submissionError.forceRequired"
                class="mt-2 text-body-2"
              >
                {{ t('calendar.reservationDialog.forceSuggestion') }}
              </div>
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
                data-testid="reservation-form-date-input"
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
                data-testid="reservation-form-start-time-input"
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
                data-testid="reservation-form-end-time-input"
              />
            </Field>

            <template v-if="!isConversion">
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
                  data-testid="reservation-form-firing-line-select"
                />
              </Field>

              <Field
                v-slot="{ field, errorMessage }"
                name="trackNos"
              >
                <div>
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
                    data-testid="reservation-form-track-nos-select"
                    @update:model-value="(value) => field.onChange(value)"
                  />
                  <div class="d-flex gap-2 mt-1">
                    <v-btn
                      size="small"
                      variant="text"
                      data-testid="reservation-form-track-select-all"
                      @click="field.onChange(allTrackNosForLine(values.firingLineId))"
                    >
                      {{ t('calendar.forms.wholeLineLabel') }}
                    </v-btn>
                    <v-btn
                      size="small"
                      variant="text"
                      data-testid="reservation-form-track-clear"
                      @click="field.onChange([])"
                    >
                      {{ t('common.actions.clear') }}
                    </v-btn>
                  </div>
                </div>
              </Field>
            </template>

            <template v-else>
              <Field
                v-slot="{ field, errorMessage }"
                name="templateId"
              >
                <v-select
                  v-bind="field"
                  clearable
                  :items="templateItems"
                  item-title="title"
                  item-value="value"
                  :error-messages="errorMessage"
                  :label="t('calendar.reservationDialog.templateLabel')"
                  data-testid="reservation-form-template-select"
                  @update:model-value="applyTemplate"
                />
              </Field>
              <Field
                v-slot="{ field, errorMessage }"
                name="adminMessage"
              >
                <v-textarea
                  v-bind="field"
                  :error-messages="errorMessage"
                  :label="t('calendar.reservationDialog.adminMessageLabel')"
                  auto-grow
                  rows="3"
                  data-testid="reservation-form-admin-message-input"
                />
              </Field>
            </template>

            <v-switch
              v-if="canUseForce"
              :model-value="force"
              class="mt-4"
              color="primary"
              :label="t('calendar.reservationDialog.forceLabel')"
              :messages="
                submissionError?.forceRequired
                  ? [t('calendar.reservationDialog.forceHint')]
                  : undefined
              "
              data-testid="reservation-form-force-switch"
              @update:model-value="setForce"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              data-testid="reservation-form-cancel-button"
              @click="closeDialog"
            >
              {{ t('common.actions.cancel') }}
            </v-btn>
            <v-btn
              :disabled="!meta.valid"
              :loading="isSubmitting"
              color="primary"
              type="submit"
              data-testid="reservation-form-submit-button"
            >
              {{ t('common.actions.save') }}
            </v-btn>
          </v-card-actions>
        </template>
      </Form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Form, Field } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { isAxiosError } from 'axios'
import { http } from '../../services/http'
import { ensureTimePrecision } from '../../utils/datetime'
import { format, parseISO } from 'date-fns'
import { useI18n } from 'vue-i18n'
import type {
  CreateReservationCommand,
  CreateReservationFromPropositionCommand,
  CreatedReservationDto,
  MessageTemplateDto,
  RangeDetailsDto,
} from '@strzel-sobie/common'

const props = withDefaults(
  defineProps<{
    open: boolean
    rangeSlug: string
    propositionId?: number | null
    defaultStart?: string | null
    defaultEnd?: string | null
    defaultFiringLineId?: number | null
    defaultTrackNos?: number[]
    canUseForce?: boolean
    firingLines?: RangeDetailsDto['firingLines']
  }>(),
  {
    propositionId: null,
    defaultStart: null,
    defaultEnd: null,
    defaultFiringLineId: null,
    defaultTrackNos: () => [],
    canUseForce: false,
    firingLines: () => [],
  },
)

const { t } = useI18n()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
  'submit-error': [error: ReservationSubmissionError]
}>()

const isConversion = computed(() => props.propositionId !== null && props.propositionId !== undefined)

const schema = computed(() =>
  yup.object({
    date: yup.string().required(),
    startTime: yup.string().required(),
    endTime: yup.string().required(),
    firingLineId: yup.number().when([], {
      is: () => !isConversion.value,
      then: (s) => s.min(1).required(),
      otherwise: (s) => s.nullable(),
    }),
    trackNos: yup.array().when([], {
      is: () => !isConversion.value,
      then: (s) => s.min(1).required(),
      otherwise: (s) => s.default([]),
    }),
    templateId: yup.number().nullable(),
    adminMessage: yup.string().when([], {
      is: () => isConversion.value,
      then: (s) => s.required().min(1),
      otherwise: (s) => s.default(''),
    }),
  }),
)

interface ReservationFormValues {
  date: string
  startTime: string
  endTime: string
  firingLineId: number | null
  trackNos: number[]
  templateId: number | null
  adminMessage: string
}

export interface ReservationSubmissionError {
  message: string
  code?: string
  forceRequired?: boolean
}

interface ReservationErrorResponse {
  code?: string
  message?: string
  forceRequired?: boolean
}

const submissionError = ref<ReservationSubmissionError | null>(null)
const force = ref(false)
const defaultErrorMessage = t('calendar.reservationDialog.defaultError')
const templates = ref<MessageTemplateDto[]>([])

const firingLineItems = computed(() =>
  (props.firingLines ?? []).map((line) => ({
    value: line.id,
    title: `${line.name} (${line.lengthMeters}m, ${line.tracksCount})`,
  })),
)

const templateItems = computed(() =>
  templates.value.map((template) => ({
    value: template.id,
    title: template.name,
  })),
)

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

const allTrackNosForLine = (firingLineId: number | null | undefined): number[] =>
  trackItems(firingLineId).map((item) => item.value)

const setForce = (value: boolean | null) => {
  force.value = props.canUseForce ? Boolean(value) : false
}

watch(
  () => props.canUseForce,
  (canUseForce) => {
    if (!canUseForce && force.value) {
      force.value = false
    }
  },
)

const mapSubmissionError = (error: unknown): ReservationSubmissionError => {
  if (isAxiosError(error)) {
    const data = error.response?.data as ReservationErrorResponse | undefined
    const code = data?.code
    const forceRequired = Boolean(data?.forceRequired)

    const translatedMessage = (() => {
      switch (code) {
        case 'reservation_force_required':
          return t('calendar.errors.reservationForceRequired')
        case 'reservation_conflict':
          return t('calendar.errors.reservationConflict')
        case 'invalid_reservation_time':
          return t('calendar.errors.invalidReservationTime')
        case 'invalid_time_window':
          return t('calendar.errors.invalidReservationTime')
        case 'proposition_not_found':
          return t('calendar.reservationDialog.propositionNotFound')
        case 'proposition_closed':
          return t('calendar.errors.propositionClosed')
        case 'range_closed':
          return t('calendar.errors.rangeClosed')
        case 'message_template_not_found':
          return t('calendar.errors.templateNotFound')
        default:
          return data?.message ?? defaultErrorMessage
      }
    })()

    return {
      message: translatedMessage,
      code,
      forceRequired,
    }
  }

  return {
    message: defaultErrorMessage,
  }
}

const toDateInputValue = (isoValue: string | null | undefined) => {
  if (!isoValue) {
    return ''
  }
  try {
    return format(parseISO(isoValue), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

const toTimeInputValue = (isoValue: string | null | undefined) => {
  if (!isoValue) {
    return ''
  }
  try {
    return format(parseISO(isoValue), 'HH:mm')
  } catch {
    const [, timePart] = isoValue.split('T')
    return ensureTimePrecision(timePart ?? '')
  }
}

const initialValues = computed<ReservationFormValues>(() => {
  const defaultFiringLineId = props.defaultFiringLineId ?? props.firingLines[0]?.id ?? null
  const defaultTrackNos =
    props.defaultTrackNos.length > 0 ? props.defaultTrackNos : allTrackNosForLine(defaultFiringLineId).slice(0, 1)

  return {
    date: toDateInputValue(props.defaultStart ?? null),
    startTime: toTimeInputValue(props.defaultStart ?? null),
    endTime: toTimeInputValue(props.defaultEnd ?? null),
    firingLineId: defaultFiringLineId,
    trackNos: defaultTrackNos,
    templateId: null,
    adminMessage: '',
  }
})

const formKey = computed(() =>
  [
    props.propositionId ?? 'direct',
    props.defaultStart ?? 'start',
    props.defaultEnd ?? 'end',
    props.defaultFiringLineId ?? 'line',
    (props.defaultTrackNos ?? []).join(','),
  ].join('-'),
)

const loadTemplates = async () => {
  if (!props.rangeSlug || !isConversion.value) {
    templates.value = []
    return
  }

  try {
    const { data } = await http.get<MessageTemplateDto[]>(
      `/ranges/${props.rangeSlug}/message-templates?includeInactive=false`,
    )
    templates.value = data
  } catch {
    templates.value = []
  }
}

watch(
  () => [props.open, props.rangeSlug, isConversion.value],
  ([open]) => {
    if (open) {
      void loadTemplates()
    }
  },
)

const applyTemplate = (templateId: number | null) => {
  if (!templateId) {
    return
  }

  const template = templates.value.find((item) => item.id === templateId)
  if (!template) {
    return
  }

  const textarea = document.querySelector(
    '[data-testid="reservation-form-admin-message-input"] textarea',
  ) as HTMLTextAreaElement | null
  if (textarea) {
    textarea.value = template.content
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

const onDialogToggle = (value: boolean) => {
  if (!value) {
    submissionError.value = null
    force.value = false
  }
  emit('update:open', value)
}

const closeDialog = () => {
  submissionError.value = null
  force.value = false
  emit('update:open', false)
}

const submitReservation: SubmissionHandler = async (values, _ctx) => {
  if (!props.rangeSlug) {
    return
  }

  submissionError.value = null

  const formValues = values as ReservationFormValues
  const eventDate = formValues.date
  const startTime = ensureTimePrecision(formValues.startTime)
  const endTime = ensureTimePrecision(formValues.endTime)

  const requestConfig = force.value && props.canUseForce ? { params: { force: 'true' } } : undefined

  try {
    if (isConversion.value && props.propositionId) {
      const payload: CreateReservationFromPropositionCommand = {
        propositionId: props.propositionId,
        eventDate,
        startTime,
        endTime,
        adminMessage: (formValues.adminMessage ?? '').trim(),
        templateId: formValues.templateId ?? undefined,
      }

      await http.post<CreatedReservationDto>(
        `/ranges/${props.rangeSlug}/reservations`,
        payload,
        requestConfig,
      )
    } else {
      const payload: CreateReservationCommand = {
        eventDate,
        startTime,
        endTime,
        firingLineId: Number(formValues.firingLineId),
        trackNos: (formValues.trackNos ?? []).map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0),
      }

      await http.post<CreatedReservationDto>(
        `/ranges/${props.rangeSlug}/reservations`,
        payload,
        requestConfig,
      )
    }
  } catch (error) {
    const normalizedError = mapSubmissionError(error)
    submissionError.value = normalizedError
    emit('submit-error', normalizedError)
    if (normalizedError.forceRequired && props.canUseForce) {
      force.value = true
    }
    return
  }

  emit('submitted')
  closeDialog()
}
</script>
