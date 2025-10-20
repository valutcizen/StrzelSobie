<template>
  <v-container>
    <v-card>
      <v-card-title>{{ t('admin.rangeSettings.title') }}</v-card-title>
      <Form
        :initial-values="initialValues"
        :validation-schema="settingsSchema"
        @submit="updateSettings"
      >
        <template #default="{ isSubmitting, meta }">
          <v-card-text>
            <v-alert
              v-if="lastError"
              class="mb-4"
              type="error"
              variant="tonal"
            >
              {{ lastError }}
            </v-alert>

            <v-row>
              <v-col cols="12">
                <div class="text-subtitle-1 font-weight-medium">
                  {{ rangeDisplayName || 'Strzelnica' }}
                </div>
              </v-col>
              <v-col cols="12" md="4">
                <Field
                  name="totalTracks"
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
              </v-col>
              <v-col cols="12" md="8">
                <Field
                  name="operatingHours"
                  v-slot="{ field, errorMessage }"
                >
                  <v-textarea
                    v-bind="field"
                    :error-messages="errorMessage"
                    rows="8"
                    label="Godziny otwarcia (JSON)"
                    hint="Przykład: { &quot;monday&quot;: { &quot;open&quot;: &quot;09:00&quot;, &quot;close&quot;: &quot;18:00&quot; } }"
                    persistent-hint
                  />
                </Field>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              :disabled="!meta.valid"
              :loading="isSubmitting"
              color="primary"
              type="submit"
            >
              Zapisz ustawienia
            </v-btn>
            <v-btn
              color="secondary"
              variant="tonal"
              @click="isRecordDialogOpen = true"
            >
              Dodaj rezerwację zewnętrzną
            </v-btn>
          </v-card-actions>
        </template>
      </Form>
    </v-card>
  </v-container>

  <RecordFormDialog
    v-model:open="isRecordDialogOpen"
    :range-slug="currentRangeSlug"
    @submitted="onRecordSubmitted"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Form, Field } from 'vee-validate'
import type { SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { http } from '../../services/http'
import RecordFormDialog from '../../components/calendar/RecordFormDialog.vue'
import { useAuthStore } from '../../stores/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const isRecordDialogOpen = ref(false)
const lastError = ref<string | null>(null)
const currentRangeSlug = computed(() => authStore.defaultRangeSlug ?? 'dobczyce')
const rangeDisplayName = ref<string>('')

const initialValues = ref({
  totalTracks: 1,
  operatingHours: '',
})

const settingsSchema = yup.object({
  totalTracks: yup.number().min(1).required(),
  operatingHours: yup.string().optional(),
})

interface RangeSettingsFormValues {
  totalTracks: number
  operatingHours: string
}

const fetchSettings = async () => {
  if (!currentRangeSlug.value) {
    return
  }

  try {
    const { data } = await http.get<{ success: boolean; result?: { displayName: string; totalTracks: number; operatingHours: Record<string, { open: string; close: string } | null> | null } }>(
      `/ranges/${currentRangeSlug.value}`,
    )

    if (!data.success || !data.result) {
      lastError.value = 'Nie udało się pobrać danych strzelnicy.'
      return
    }

    const { displayName, totalTracks, operatingHours } = data.result

    rangeDisplayName.value = displayName
    initialValues.value = {
      totalTracks,
      operatingHours: operatingHours ? JSON.stringify(operatingHours, null, 2) : '',
    }
    lastError.value = null
  } catch (error) {
    console.warn('Unable to load range settings', error)
    lastError.value = 'Nie udało się załadować ustawień strzelnicy.'
  }
}

const updateSettings: SubmissionHandler = async (values, _ctx) => {
  if (!currentRangeSlug.value) {
    return
  }

  try {
    const formValues = values as RangeSettingsFormValues
    const payload: Record<string, unknown> = {
      totalTracks: Number(formValues.totalTracks),
    }

    const trimmedOperatingHours = formValues.operatingHours?.trim()

    if (trimmedOperatingHours) {
      try {
        payload.operatingHours = JSON.parse(trimmedOperatingHours)
      } catch (parseError) {
        lastError.value = 'Nieprawidłowy format JSON dla godzin otwarcia.'
        return
      }
    }

    await http.patch(`/ranges/${currentRangeSlug.value}`, payload)
    lastError.value = null
    await fetchSettings()
  } catch (error) {
    console.warn('Unable to update range settings', error)
    lastError.value = 'Nie udało się zapisać ustawień strzelnicy.'
  }
}

const onRecordSubmitted = async () => {
  await fetchSettings()
  isRecordDialogOpen.value = false
}

onMounted(() => {
  void fetchSettings()
})
</script>
