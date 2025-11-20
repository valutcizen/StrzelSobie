<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Field, Form, type SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import RecordFormDialog from '@/components/calendar/RecordFormDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import type { OperatingHours, RangeDetails } from '@/types/range'

const { t } = useI18n()
const authStore = useAuthStore()
const rangeStore = useRangeStore()

const rangeSlug = computed(() => authStore.defaultRangeSlug)
const defaultOpenTime = '08:00'
const defaultCloseTime = '20:00'
const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

type DayKey = (typeof dayOrder)[number]

interface DayFormValue {
  isOpen: boolean
  open: string
  close: string
}

type FormOperatingHours = Record<DayKey, DayFormValue>

const createDefaultOperatingHours = (): FormOperatingHours =>
  dayOrder.reduce((acc, day) => {
    acc[day] = {
      isOpen: day !== 'sunday',
      open: defaultOpenTime,
      close: defaultCloseTime,
    }
    return acc
  }, {} as FormOperatingHours)

type RangeSettingsFormValues = {
  totalTracks: number
  operatingHours: FormOperatingHours
}

const formKey = ref(0)
const isLoading = ref(false)
const isSaving = ref(false)
const lastError = ref<string | null>(null)
const recordDialogOpen = ref(false)
const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const initialValues = ref<RangeSettingsFormValues>({
  totalTracks: 1,
  operatingHours: createDefaultOperatingHours(),
})

const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/

const isClosingAfterOpening = (open: string, close: string) => {
  const [openHours, openMinutes] = open.split(':').map(Number)
  const [closeHours, closeMinutes] = close.split(':').map(Number)
  const openTotal = openHours * 60 + openMinutes
  const closeTotal = closeHours * 60 + closeMinutes
  return closeTotal > openTotal
}

const daySchema = (dayLabel: string) =>
  yup
    .object({
      isOpen: yup.boolean().required(),
      open: yup
        .string()
        .when('isOpen', {
          is: true,
          then: (schema) =>
            schema
              .required(t('admin.rangeSettings.validation.required'))
              .matches(timeRegex, t('admin.rangeSettings.validation.invalidTime')),
          otherwise: (schema) => schema.default(defaultOpenTime),
        }),
      close: yup
        .string()
        .when('isOpen', {
          is: true,
          then: (schema) =>
            schema
              .required(t('admin.rangeSettings.validation.required'))
              .matches(timeRegex, t('admin.rangeSettings.validation.invalidTime')),
          otherwise: (schema) => schema.default(defaultCloseTime),
        }),
    })
    .test(
      'valid-range',
      t('admin.rangeSettings.validation.closeAfterOpen', { day: dayLabel }),
      (value) => {
        if (!value?.isOpen) {
          return true
        }

        if (!value.open || !value.close) {
          return false
        }

        return isClosingAfterOpening(value.open, value.close)
      },
    )

const schema = yup.object({
  totalTracks: yup
    .number()
    .typeError(t('admin.rangeSettings.validation.required'))
    .min(1, t('admin.rangeSettings.validation.minTracks'))
    .required(t('admin.rangeSettings.validation.required')),
  operatingHours: yup.object(
    dayOrder.reduce((acc, day) => {
      acc[day] = daySchema(t(`rangeLanding.days.${day}`))
      return acc
    }, {} as Record<DayKey, ReturnType<typeof daySchema>>),
  ),
})

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbar.open = true
  snackbar.message = message
  snackbar.color = color
}

const mapRangeToFormValues = (range: RangeDetails): RangeSettingsFormValues => ({
  totalTracks: range.totalTracks,
  operatingHours: dayOrder.reduce((acc, day) => {
    const entry = range.operatingHours?.[day] ?? null
    acc[day] = {
      isOpen: entry !== null,
      open: entry?.open ?? defaultOpenTime,
      close: entry?.close ?? defaultCloseTime,
    }
    return acc
  }, {} as FormOperatingHours),
})

const mapFormToOperatingHours = (values: RangeSettingsFormValues): OperatingHours =>
  Object.entries(values.operatingHours).reduce((acc, [day, value]) => {
    acc[day] = value.isOpen
      ? { open: value.open ?? defaultOpenTime, close: value.close ?? defaultCloseTime }
      : null
    return acc
  }, {} as OperatingHours)

const loadRangeSettings = async (force = false) => {
  if (!rangeSlug.value) {
    return
  }

  isLoading.value = true
  lastError.value = null

  try {
    const range = await rangeStore.fetchRangeDetails(rangeSlug.value, { force })
    initialValues.value = mapRangeToFormValues(range)
    formKey.value += 1
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : t('common.feedback.operationFailed')
  } finally {
    isLoading.value = false
  }
}

const submitSettings: SubmissionHandler = async (rawValues) => {
  const values = rawValues as RangeSettingsFormValues
  if (!rangeSlug.value) {
    return
  }

  isSaving.value = true
  lastError.value = null

  try {
    const payload = {
      totalTracks: Number(values.totalTracks),
      operatingHours: mapFormToOperatingHours(values),
    }

    await rangeStore.updateRange(rangeSlug.value, payload)
    const updated = await rangeStore.fetchRangeDetails(rangeSlug.value, { force: true })
    initialValues.value = mapRangeToFormValues(updated)
    formKey.value += 1
    showSnackbar(t('admin.rangeSettings.successMessage'))
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : t('admin.rangeSettings.errorMessage')
    showSnackbar(t('admin.rangeSettings.errorMessage'), 'error')
  } finally {
    isSaving.value = false
  }
}

const handleRecordSubmitted = () => {
  showSnackbar(t('calendar.snackbar.recordSaved'))
  recordDialogOpen.value = false
}

onMounted(() => {
  void loadRangeSettings(true)
})
</script>

<template>
  <v-container

    fluid

    data-testid="range-settings-view"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('admin.rangeSettings.title') }}</span>

        <v-btn

          color="primary"

          variant="tonal"

          prepend-icon="mdi-refresh"

          :disabled="isLoading"

          data-testid="range-settings-refresh-button"

          @click="loadRangeSettings(true)"
        >
          {{ t('admin.rangeSettings.refreshAction') }}
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
        <template #default="{ values }">
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

                    :label="t('admin.rangeSettings.totalTracksLabel')"

                    type="number"

                    min="1"

                    :model-value="field.value"

                    :error-messages="errorMessage"

                    data-testid="range-settings-total-tracks-input"

                    @update:model-value="field.onChange"

                    @blur="field.onBlur"
                  />
                </Field>
              </v-col>
            </v-row>



            <v-divider class="my-6" />



            <v-row>
              <v-col cols="12">
                <h3 class="text-subtitle-1 font-weight-medium">
                  {{ t('admin.rangeSettings.operatingHoursHeading') }}
                </h3>
              </v-col>
            </v-row>



            <v-row>
              <v-col

                v-for="day in dayOrder"

                :key="day"

                cols="12"

                md="6"
              >
                <v-sheet

                  rounded="lg"

                  class="pa-4"

                  color="grey-lighten-4"
                >
                  <div class="d-flex align-center justify-space-between mb-2">
                    <span class="text-subtitle-2">

                      {{ t(`rangeLanding.days.${day}`) }}

                    </span>

                    <Field

                      v-slot="{ field }"

                      :name="`operatingHours.${day}.isOpen`"
                    >
                      <v-switch

                        density="compact"

                        inset

                        color="primary"

                        hide-details

                        :model-value="field.value"

                        :label="

                          field.value

                            ? t('admin.rangeSettings.openLabel')

                            : t('admin.rangeSettings.closedLabel')

                        "

                        :data-testid="`range-settings-${day}-is-open-switch`"

                        @update:model-value="field.onChange"

                        @blur="field.onBlur"
                      />
                    </Field>
                  </div>

                  <v-row

                    class="mt-2"

                    dense
                  >
                    <v-col cols="6">
                      <Field

                        v-slot="{ field, errorMessage }"

                        :name="`operatingHours.${day}.open`"
                      >
                        <v-text-field

                          type="time"

                          :label="t('admin.rangeSettings.openTimeLabel')"

                          :model-value="field.value"

                          :disabled="!values.operatingHours[day].isOpen"

                          :error-messages="errorMessage"

                          :data-testid="`range-settings-${day}-open-time-input`"

                          @update:model-value="field.onChange"

                          @blur="field.onBlur"
                        />
                      </Field>
                    </v-col>

                    <v-col cols="6">
                      <Field

                        v-slot="{ field, errorMessage }"

                        :name="`operatingHours.${day}.close`"
                      >
                        <v-text-field

                          type="time"

                          :label="t('admin.rangeSettings.closeTimeLabel')"

                          :model-value="field.value"

                          :disabled="!values.operatingHours[day].isOpen"

                          :error-messages="errorMessage"

                          :data-testid="`range-settings-${day}-close-time-input`"

                          @update:model-value="field.onChange"

                          @blur="field.onBlur"
                        />
                      </Field>
                    </v-col>
                  </v-row>
                </v-sheet>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="justify-space-between flex-wrap">
            <v-btn

              variant="text"

              prepend-icon="mdi-clipboard-plus"

              data-testid="range-settings-record-action-button"

              @click="recordDialogOpen = true"
            >
              {{ t('admin.rangeSettings.recordAction') }}
            </v-btn>

            <v-btn

              color="primary"

              :loading="isSaving"

              type="submit"

              data-testid="range-settings-submit-button"
            >
              {{ t('admin.rangeSettings.submitAction') }}
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

      data-testid="range-settings-snackbar"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>
