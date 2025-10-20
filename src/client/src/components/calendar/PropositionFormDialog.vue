<template>
  <v-dialog
    :model-value="open"
    max-width="480"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>Zaproponuj termin</v-card-title>
      <Form
        :initial-values="initialValues"
        :key="formKey"
        :validation-schema="schema"
        @submit="submitProposition"
      >
        <template #default="{ isSubmitting, meta }">
          <v-card-text>
            <Field
              name="start"
              v-slot="{ field, errorMessage }"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Początek"
                type="datetime-local"
              />
            </Field>
            <Field
              name="end"
              v-slot="{ field, errorMessage }"
            >
              <v-text-field
                v-bind="field"
                :error-messages="errorMessage"
                label="Koniec"
                type="datetime-local"
              />
            </Field>
            <Field
              name="participants"
              v-slot="{ field, errorMessage }"
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
              name="tracks"
              v-slot="{ field, errorMessage }"
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
            <v-btn variant="text" @click="closeDialog">Anuluj</v-btn>
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
import { splitDateTimeLocalValue, toDateTimeLocalInput } from '../../utils/datetime'

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
  start: yup.string().required(),
  end: yup.string().required(),
  participants: yup.number().min(1).required(),
  tracks: yup.number().min(1).required(),
})

interface PropositionFormValues {
  start: string
  end: string
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

const initialValues = computed(() => ({
  start: toDateTimeLocalInput(props.selectedSlot?.start ?? null),
  end: toDateTimeLocalInput(props.selectedSlot?.end ?? null),
  participants: 1,
  tracks: 1,
}))

const formKey = computed(() => (props.selectedSlot ? `${props.selectedSlot.start}-${props.selectedSlot.end}` : 'default'))

const onDialogToggle = (value: boolean) => {
  emit('update:open', value)
}

const closeDialog = () => {
  emit('update:open', false)
}

const submitProposition: SubmissionHandler = async (values, _ctx) => {
  const { start, end, participants, tracks } = values as PropositionFormValues
  if (!props.rangeSlug) {
    return
  }

  const startParts = splitDateTimeLocalValue(start)
  const endParts = splitDateTimeLocalValue(end)

  const payload: CreatePropositionPayload = {
    eventDate: startParts.date,
    startTime: startParts.time,
    endTime: endParts.time,
    numParticipants: Number(participants),
    tracksRequested: Number(tracks),
  }

  await http.post(`/ranges/${props.rangeSlug}/propositions`, payload)
  emit('submitted')
  closeDialog()
}
</script>
