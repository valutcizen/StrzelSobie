<template>
  <v-dialog
    :model-value="open"
    max-width="480"
    @update:model-value="onDialogToggle"
  >
    <v-card>
      <v-card-title>Zapisz bez rezerwacji</v-card-title>
      <Form
        :key="formKey"
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitRecord"
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
import { computed, ref, watch } from 'vue'
import { Form, Field } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { http } from '../../services/http'
import { ensureTimePrecision } from '../../utils/datetime'
import { format } from 'date-fns'
import type { CreateRecordCommand, CreatedRecordDto } from '@strzel-sobie/common'

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
  date: yup.string().required(),
  startTime: yup.string().required(),
  endTime: yup.string().required(),
  participants: yup.number().min(1).required(),
})

interface RecordFormValues {
  date: string
  startTime: string
  endTime: string
  participants: number
}

const formKey = ref(0)

const defaultTimeValues = () => {
  const start = new Date()
  start.setMinutes(0, 0, 0)
  const end = new Date(start)
  end.setHours(end.getHours() + 1)

  return {
    date: format(start, 'yyyy-MM-dd'),
    startTime: format(start, 'HH:mm'),
    endTime: format(end, 'HH:mm'),
  }
}

const initialValues = computed(() => {
  void formKey.value
  return {
    ...defaultTimeValues(),
    participants: 1,
  }
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      formKey.value += 1
    }
  },
)

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

  const recordPayload: CreateRecordCommand = {
    eventDate: payload.date,
    startTime: ensureTimePrecision(payload.startTime),
    endTime: ensureTimePrecision(payload.endTime),
    numParticipants: Number(payload.participants),
  }

  await http.post<CreatedRecordDto>(`/ranges/${props.rangeSlug}/records`, recordPayload)
  emit('submitted')
  closeDialog()
}
</script>
