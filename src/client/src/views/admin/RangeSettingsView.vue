<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Field, Form, type SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { useAuthStore } from '@/stores/auth'
import { http } from '@/services/http'
import RecordFormDialog from '@/components/calendar/RecordFormDialog.vue'

interface RangeSettingsResponse {
  slug: string
  name: string
  totalTracks: number
  operatingHours: {
    openTime: string
    closeTime: string
  }
}

interface UpdateRangeSettingsPayload {
  totalTracks: number
  operatingHours: {
    openTime: string
    closeTime: string
  }
}

const authStore = useAuthStore()
const rangeSlug = computed(() => authStore.defaultRangeSlug)

const isLoading = ref(false)
const isSaving = ref(false)
const lastError = ref<string | null>(null)
const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})
const recordDialogOpen = ref(false)

const schema = yup.object({
  totalTracks: yup.number().min(1, 'Minimalna liczba torów to 1').required('Pole jest wymagane'),
  openTime: yup.string().required('Pole jest wymagane'),
  closeTime: yup.string().required('Pole jest wymagane'),
})

const initialValues = ref({
  totalTracks: 1,
  openTime: '08:00',
  closeTime: '20:00',
})
const formKey = ref(0)

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbar.open = true
  snackbar.message = message
  snackbar.color = color
}

const loadRangeSettings = async () => {
  if (!rangeSlug.value) {
    return
  }

  isLoading.value = true
  lastError.value = null

  try {
    const { data } = await http.get<RangeSettingsResponse>(`/ranges/${rangeSlug.value}`)
    initialValues.value = {
      totalTracks: data.totalTracks,
      openTime: data.operatingHours.openTime,
      closeTime: data.operatingHours.closeTime,
    }
    formKey.value += 1
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : 'Nie udało się pobrać ustawień strzelnicy.'
  } finally {
    isLoading.value = false
  }
}

const submitSettings: SubmissionHandler = async (values) => {
  if (!rangeSlug.value) {
    return
  }

  isSaving.value = true
  lastError.value = null

  const payload = values as yup.InferType<typeof schema>

  try {
    const requestBody: UpdateRangeSettingsPayload = {
      totalTracks: Number(payload.totalTracks),
      operatingHours: {
        openTime: payload.openTime,
        closeTime: payload.closeTime,
      },
    }

    await http.patch(`/ranges/${rangeSlug.value}`, requestBody)
    showSnackbar('Ustawienia strzelnicy zostały zapisane.')
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : 'Nie udało się zapisać ustawień strzelnicy.'
    showSnackbar('Nie udało się zapisać ustawień.', 'error')
  } finally {
    isSaving.value = false
  }
}

const handleRecordSubmitted = async () => {
  showSnackbar('Dodano rezerwację zewnętrzną.')
  recordDialogOpen.value = false
}

onMounted(() => {
  loadRangeSettings()
})
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Ustawienia strzelnicy</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          @click="loadRangeSettings"
        >
          Odśwież
        </v-btn>
      </v-card-title>

      <v-progress-linear
        v-if="isLoading"
        indeterminate
        color="primary"
      />

      <v-alert
        v-if="lastError"
        type="error"
        variant="tonal"
        border="start"
        class="mx-4 mt-4"
      >
        {{ lastError }}
      </v-alert>

      <Form
        :key="formKey"
        :initial-values="initialValues"
        :validation-schema="schema"
        @submit="submitSettings"
      >
        <template #default="{ submitForm }">
          <v-card-text>
            <v-row>
              <v-col
                cols="12"
                md="4"
              >
                <Field
                  v-slot="{ field, errorMessage }"
                  name="totalTracks"
                >
                  <v-text-field
                    v-bind="field"
                    :error-messages="errorMessage"
                    label="Łączna liczba torów"
                    type="number"
                    min="1"
                  />
                </Field>
              </v-col>
              <v-col
                cols="12"
                md="4"
              >
                <Field
                  v-slot="{ field, errorMessage }"
                  name="openTime"
                >
                  <v-text-field
                    v-bind="field"
                    :error-messages="errorMessage"
                    label="Godzina otwarcia"
                    type="time"
                  />
                </Field>
              </v-col>
              <v-col
                cols="12"
                md="4"
              >
                <Field
                  v-slot="{ field, errorMessage }"
                  name="closeTime"
                >
                  <v-text-field
                    v-bind="field"
                    :error-messages="errorMessage"
                    label="Godzina zamknięcia"
                    type="time"
                  />
                </Field>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions class="justify-space-between">
            <v-btn
              variant="text"
              prepend-icon="mdi-clipboard-plus"
              @click="recordDialogOpen = true"
            >
              Dodaj rezerwację zewnętrzną
            </v-btn>
            <v-btn
              color="primary"
              :loading="isSaving"
              @click="submitForm"
            >
              Zapisz zmiany
            </v-btn>
          </v-card-actions>
        </template>
      </Form>
    </v-card>

    <RecordFormDialog
      :open="recordDialogOpen"
      :range-slug="rangeSlug"
      @update:open="recordDialogOpen = $event"
      @submitted="handleRecordSubmitted"
    />

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>
