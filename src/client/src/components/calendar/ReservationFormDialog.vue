<template>
  <v-dialog
    :model-value="open"
    max-width="480"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>Nowa rezerwacja</v-card-title>
      <Form
        :key="formKey"
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitReservation"
      >
        <template #default="{ isSubmitting, meta, values, setFieldValue }">
          <v-card-text>
            <Field
              v-slot="{ field, errorMessage }"
              name="start"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Początek"
                type="datetime-local"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="end"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Koniec"
                type="datetime-local"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="tracks"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Liczba torów"
                min="1"
                type="number"
              />
            </Field>
            <Field
              v-if="!isConversion"
              v-slot="{ field, errorMessage }"
              name="participants"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Liczba uczestników"
                min="1"
                type="number"
              />
            </Field>
            <div v-if="!isConversion">
              <v-switch
                :model-value="values.isPublic"
                class="mt-4"
                color="primary"
                label="Publiczna"
                @update:model-value="setFieldValue('isPublic', $event)"
              />
              <v-switch
                :disabled="!values.isPublic"
                :model-value="values.isOpenForJoining"
                color="primary"
                label="Otwarta na dołączenie"
                @update:model-value="setFieldValue('isOpenForJoining', $event)"
              />
            </div>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeDialog"
            >
              Anuluj
            </v-btn>
            <v-btn
              :disabled="!meta.valid"
              :loading="isSubmitting"
              color="primary"
              type="submit"
            >
              Zapisz
            </v-btn>
          </v-card-actions>
        </template>
      </Form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Form, Field } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { http } from '../../services/http'
import { splitDateTimeLocalValue, toDateTimeLocalInput } from '../../utils/datetime'

const props = withDefaults(
  defineProps<{
    open: boolean
    rangeSlug: string
    propositionId?: number | null
    defaultStart?: string | null
    defaultEnd?: string | null
  }>(),
  {
    propositionId: null,
    defaultStart: null,
    defaultEnd: null,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const isConversion = computed(() => props.propositionId !== null && props.propositionId !== undefined)

const schema = computed(() =>
  yup.object({
    start: yup.string().required(),
    end: yup.string().required(),
    tracks: yup.number().min(1).required(),
    participants: isConversion.value ? yup.number().min(1).optional() : yup.number().min(1).required(),
    isPublic: yup.boolean().required(),
    isOpenForJoining: yup.boolean().required(),
  }),
)

interface ReservationFormValues {
  start: string
  end: string
  tracks: number
  participants?: number
  isPublic: boolean
  isOpenForJoining: boolean
}

interface CreateReservationPayload {
  eventDate: string
  startTime: string
  endTime: string
  numParticipants: number
  tracksRequested: number
  isPublic: boolean
  isJoinable: boolean
}

interface ConvertReservationPayload {
  propositionId: number
  startTime?: string
  endTime?: string
  tracksRequested?: number
}

const initialValues = computed(() => ({
  start: toDateTimeLocalInput(props.defaultStart ?? null),
  end: toDateTimeLocalInput(props.defaultEnd ?? null),
  tracks: 1,
  participants: 1,
  isPublic: true,
  isOpenForJoining: false,
}))

const formKey = computed(
  () => `${props.propositionId ?? 'direct'}-${props.defaultStart ?? 'start'}-${props.defaultEnd ?? 'end'}`,
)

const onDialogToggle = (value: boolean) => {
  emit('update:open', value)
}

const closeDialog = () => {
  emit('update:open', false)
}

const submitReservation: SubmissionHandler = async (values, _ctx) => {
  if (!props.rangeSlug) {
    return
  }

  const formValues = values as ReservationFormValues

  if (isConversion.value && props.propositionId) {
    const payload: ConvertReservationPayload = {
      propositionId: props.propositionId,
    }

    if (formValues.start) {
      payload.startTime = splitDateTimeLocalValue(formValues.start).time
    }

    if (formValues.end) {
      payload.endTime = splitDateTimeLocalValue(formValues.end).time
    }

    if (formValues.tracks) {
      payload.tracksRequested = Number(formValues.tracks)
    }

    await http.post(`/ranges/${props.rangeSlug}/reservations`, payload)
  } else {
    const startParts = splitDateTimeLocalValue(formValues.start)
    const endParts = splitDateTimeLocalValue(formValues.end)

    const payload: CreateReservationPayload = {
      eventDate: startParts.date,
      startTime: startParts.time,
      endTime: endParts.time,
      numParticipants: Number(formValues.participants ?? 1),
      tracksRequested: Number(formValues.tracks),
      isPublic: Boolean(formValues.isPublic),
      isJoinable: Boolean(formValues.isOpenForJoining),
    }

    await http.post(`/ranges/${props.rangeSlug}/reservations`, payload)
  }

  emit('submitted')
  closeDialog()
}
</script>
