<template>
  <v-dialog
    :model-value="open"
    max-width="480"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>Dodaj rezerwację zewnętrzną</v-card-title>
      <Form
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitRecord"
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

interface RecordFormDialogProps {
  open: boolean
  rangeSlug: string
}

const props = defineProps<RecordFormDialogProps>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submitted: []
}>()

const schema = yup.object({
  start: yup.string().required(),
  end: yup.string().required(),
  participants: yup.number().min(1).required(),
})

interface RecordFormValues {
  start: string
  end: string
  participants: number
}

interface CreateRecordPayload {
  eventDate: string
  startTime: string
  endTime: string
  numParticipants: number
}

const initialValues = computed(() => ({
  start: toDateTimeLocalInput(null),
  end: toDateTimeLocalInput(null),
  participants: 1,
}))

const onDialogToggle = (value: boolean) => {
  emit('update:open', value)
}

const closeDialog = () => {
  emit('update:open', false)
}

const submitRecord: SubmissionHandler = async (values, _ctx) => {
  const payload = values as RecordFormValues
  if (!props.rangeSlug) {
    return
  }

  const startParts = splitDateTimeLocalValue(payload.start)
  const endParts = splitDateTimeLocalValue(payload.end)

  const recordPayload: CreateRecordPayload = {
    eventDate: startParts.date,
    startTime: startParts.time,
    endTime: endParts.time,
    numParticipants: Number(payload.participants),
  }

  await http.post(`/ranges/${props.rangeSlug}/records`, recordPayload)
  emit('submitted')
  closeDialog()
}
</script>
