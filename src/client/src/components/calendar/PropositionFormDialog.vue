<template>
  <v-dialog
    :model-value="open"
    max-width="480"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>Zaproponuj termin</v-card-title>
      <Form
        :key="formKey"
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitProposition"
      >
        <template #default="{ isSubmitting, meta }">
          <v-card-text>
            <Field
              v-slot="{ field, errorMessage }"
              name="date"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Data"
                type="date"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="startTime"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Początek"
                type="time"
              />
            </Field>
            <Field
              v-slot="{ field, errorMessage }"
              name="endTime"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Koniec"
                type="time"
              />
            </Field>
            <Field
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
              Wyślij
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
import { ensureTimePrecision, toDateInputValue, toTimeInputValue } from '../../utils/datetime'

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
  participants: yup.number().min(1).required(),
  tracks: yup.number().min(1).required(),
})

interface PropositionFormValues {
  date: string
  startTime: string
  endTime: string
  participants: number
  tracks: number
}

interface CreatePropositionPayload {
  eventDate: string
  startTime: string
  endTime: string
  numParticipants: number
  tracksRequested: number
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
    participants: 1,
    tracks: 1,
  }
})

const formKey = computed(() => (props.selectedSlot ? `${props.selectedSlot.start}-${props.selectedSlot.end}` : 'default'))

const onDialogToggle = (value: boolean) => {
  emit('update:open', value)
}

const closeDialog = () => {
  emit('update:open', false)
}

const submitProposition: SubmissionHandler = async (values, _ctx) => {
  const { date, startTime, endTime, participants, tracks } = values as PropositionFormValues
  if (!props.rangeSlug) {
    return
  }

  const payload: CreatePropositionPayload = {
    eventDate: date,
    startTime: ensureTimePrecision(startTime),
    endTime: ensureTimePrecision(endTime),
    numParticipants: Number(participants),
    tracksRequested: Number(tracks),
  }

  await http.post(`/ranges/${props.rangeSlug}/propositions`, payload)
  emit('submitted')
  closeDialog()
}
</script>
