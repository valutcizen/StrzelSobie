<template>
  <v-dialog
    :model-value="open"
    max-width="480"
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
        <template #default="{ isSubmitting, meta, values, setFieldValue }">
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
                data-testid="reservation-form-tracks-input"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="participants"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                :label="t('calendar.forms.participantsLabel')"
                min="1"
                type="number"
                data-testid="reservation-form-participants-input"
              />
            </Field>
            <div>
              <v-switch
                :model-value="values.isPublic"
                class="mt-4"
                color="primary"
                :label="t('calendar.reservationDialog.isPublic')"
                data-testid="reservation-form-is-public-switch"
                @update:model-value="(value) => {
                  setFieldValue('isPublic', value)
                  if (!value) {
                    setFieldValue('isOpenForJoining', false)
                  }
                }"
              />
              <v-switch
                :disabled="!values.isPublic"
                :model-value="values.isOpenForJoining"
                color="primary"
                :label="t('calendar.reservationDialog.isOpenForJoining')"
                data-testid="reservation-form-is-open-for-joining-switch"
                @update:model-value="(value) =>
                  setFieldValue('isOpenForJoining', values.isPublic ? value : false)"
              />
            </div>
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
} from '@strzel-sobie/common'

const props = withDefaults(
  defineProps<{
    open: boolean
    rangeSlug: string
    propositionId?: number | null
    defaultStart?: string | null
    defaultEnd?: string | null
    defaultTracks?: number | null
    defaultParticipants?: number | null
    defaultIsPublic?: boolean | null
    defaultIsOpenForJoining?: boolean | null
    canUseForce?: boolean
  }>(),
  {
    propositionId: null,
    defaultStart: null,
    defaultEnd: null,
    defaultTracks: 1,
    defaultParticipants: 1,
    defaultIsPublic: true,
    defaultIsOpenForJoining: false,
    canUseForce: false,
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
    tracks: yup.number().min(1).required(),
    participants: yup.number().min(1).required(),
    isPublic: yup.boolean().required(),
    isOpenForJoining: yup.boolean().required(),
  }),
)

interface ReservationFormValues {
  date: string
  startTime: string
  endTime: string
  tracks: number
  participants: number
  isPublic: boolean
  isOpenForJoining: boolean
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
          return 'Termin koliduje z inną rezerwacją. Zmień parametry lub zapisz z wymuszeniem.'
        case 'reservation_conflict':
          return 'Termin koliduje z inną rezerwacją. Zmień termin, aby kontynuować.'
        case 'invalid_reservation_time':
          return 'Podany zakres czasu jest nieprawidłowy.'
        case 'invalid_time_window':
          return 'Podany zakres czasu jest nieprawidłowy.'
        case 'proposition_not_found':
          return t('calendar.reservationDialog.propositionNotFound')
        case 'proposition_closed':
          return 'Propozycja nie jest już dostępna do konwersji.'
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

const initialValues = computed(() => {
  const isPublicDefault =
    typeof props.defaultIsPublic === 'boolean' ? props.defaultIsPublic : true
  const isJoinableDefault =
    typeof props.defaultIsOpenForJoining === 'boolean'
      ? props.defaultIsOpenForJoining && isPublicDefault
      : false

  return {
    date: toDateInputValue(props.defaultStart ?? null),
    startTime: toTimeInputValue(props.defaultStart ?? null),
    endTime: toTimeInputValue(props.defaultEnd ?? null),
    tracks: props.defaultTracks ?? 1,
    participants: props.defaultParticipants ?? 1,
    isPublic: isPublicDefault,
    isOpenForJoining: isJoinableDefault,
  }
})

const formKey = computed(() =>
  [
    props.propositionId ?? 'direct',
    props.defaultStart ?? 'start',
    props.defaultEnd ?? 'end',
    props.defaultTracks ?? 'tracks',
    props.defaultParticipants ?? 'participants',
    typeof props.defaultIsPublic === 'boolean' ? String(props.defaultIsPublic) : 'public',
    typeof props.defaultIsOpenForJoining === 'boolean'
      ? String(props.defaultIsOpenForJoining)
      : 'joinable',
  ].join('-'),
)

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
  const tracksValue = Number(formValues.tracks ?? props.defaultTracks ?? 1)
  const participantsValue = Number(
    formValues.participants ?? props.defaultParticipants ?? 1,
  )
  const isPublicValue = Boolean(formValues.isPublic)
  const isOpenForJoiningValue = isPublicValue
    ? Boolean(formValues.isOpenForJoining)
    : false

  const requestConfig = force.value && props.canUseForce ? { params: { force: 'true' } } : undefined

  try {
    if (isConversion.value && props.propositionId) {
      const payload: CreateReservationFromPropositionCommand = {
        propositionId: props.propositionId,
        eventDate,
        startTime,
        endTime,
        tracksRequested: tracksValue,
        numParticipants: participantsValue,
        isPublic: isPublicValue,
        isJoinable: isOpenForJoiningValue,
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
        numParticipants: participantsValue,
        tracksRequested: tracksValue,
        isPublic: isPublicValue,
        isJoinable: isOpenForJoiningValue,
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
