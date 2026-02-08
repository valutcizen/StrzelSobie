<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Field, Form, type SubmissionHandler } from 'vee-validate'
import * as yup from 'yup'
import { useRoute, useRouter } from 'vue-router'
import RangeLocationPicker from '@/components/range/RangeLocationPicker.vue'
import RangeParkingLocationModal from '@/components/range/RangeParkingLocationModal.vue'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import type { OperatingHours, RangeDetails, UpdateRangePayload } from '@/types/range'
import { UserRoleEnum } from '@/types/auth'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const rangeStore = useRangeStore()

const rangeSlug = computed(() => {
  const querySlug = route.query.rangeSlug
  if (typeof querySlug === 'string' && querySlug.trim().length > 0) {
    return querySlug.trim()
  }
  return authStore.defaultRangeSlug
})

const hasRangeSlug = computed(() => Boolean(rangeSlug.value))
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
  displayName: string
  type: RangeDetails['type']
  allowMemberEvents: boolean
  mapLogoUrl: string | null
  location: {
    lat: number | null
    lng: number | null
  } | null
  publicDescription: string | null
  memberDescription: string | null
  totalTracks: number
  operatingHours: FormOperatingHours
}

const formKey = ref(0)
const isLoading = ref(false)
const isSaving = ref(false)
const isSavingParking = ref(false)
const isDeleting = ref(false)
const lastError = ref<string | null>(null)
const isParkingModalOpen = ref(false)
const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const rangeTypeOptions = computed(() => [
  { value: 'club', label: t('rangeTypes.club') },
  { value: 'ally', label: t('rangeTypes.ally') },
  { value: 'coming-soon', label: t('rangeTypes.coming-soon') },
  { value: 'meetup', label: t('rangeTypes.meetup') },
])

const canDeleteRange = computed(() => authStore.hasRole(UserRoleEnum.ClubCommunityAdministrator))

const initialValues = ref<RangeSettingsFormValues>({
  displayName: '',
  type: 'club',
  allowMemberEvents: false,
  mapLogoUrl: null,
  location: null,
  publicDescription: null,
  memberDescription: null,
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
  displayName: yup.string().required(t('admin.rangeSettings.validation.required')),
  type: yup
    .mixed<RangeDetails['type']>()
    .oneOf(['club', 'ally', 'coming-soon', 'meetup'])
    .required(t('admin.rangeSettings.validation.required')),
  allowMemberEvents: yup.boolean().required(),
  mapLogoUrl: yup
    .string()
    .nullable()
    .test(
      'valid-map-logo-url',
      t('admin.rangeSettings.validation.invalidUrl'),
      (value) => {
        if (!value || value.trim().length === 0) {
          return true
        }

        try {
          const url = new URL(value.trim())
          return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
          return false
        }
      },
    ),
  location: yup
    .object({
      lat: yup.number().nullable(),
      lng: yup.number().nullable(),
    })
    .nullable(),
  publicDescription: yup.string().nullable(),
  memberDescription: yup.string().nullable(),
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
  displayName: range.displayName,
  type: range.type ?? 'club',
  allowMemberEvents: range.extras?.allowMemberEvents ?? false,
  mapLogoUrl: range.extras?.mapLogoUrl ?? null,
  location:
    typeof range.latitude === 'number' && typeof range.longitude === 'number'
      ? { lat: range.latitude, lng: range.longitude }
      : null,
  publicDescription: range.publicDescription ?? null,
  memberDescription: range.memberDescription ?? null,
  totalTracks: range.totalTracks ?? 1,
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
  isLoading.value = true
  lastError.value = null

  if (!rangeSlug.value) {
    isLoading.value = false
    lastError.value = t('admin.rangeSettings.slugRequired')
    return
  }

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

const toNullableString = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}

const toNullableNumber = (value: number | string | null | undefined) => {
  if (value === undefined) {
    return undefined
  }

  const normalized =
    typeof value === 'string'
      ? value.trim() === ''
        ? null
        : Number(value)
      : value

  if (normalized === null) {
    return null
  }

  return Number.isFinite(normalized as number) ? (normalized as number) : undefined
}

const updateLocationCoordinate = (
  current: RangeSettingsFormValues['location'],
  key: 'lat' | 'lng',
  rawValue: string | number | null,
) => {
  const normalized =
    typeof rawValue === 'string'
      ? rawValue.trim() === ''
        ? null
        : Number(rawValue)
      : Number.isFinite(rawValue as number)
        ? (rawValue as number)
        : null
  const next = {
    lat: current?.lat ?? null,
    lng: current?.lng ?? null,
    [key]: normalized,
  }

  return next.lat === null && next.lng === null ? null : (next as RangeSettingsFormValues['location'])
}

const submitSettings: SubmissionHandler = async (rawValues) => {
  const values = rawValues as RangeSettingsFormValues
  if (!rangeSlug.value) {
    return
  }

  isSaving.value = true
  lastError.value = null

  try {
    const latitude = values.location ? toNullableNumber(values.location.lat) ?? null : null
    const longitude = values.location ? toNullableNumber(values.location.lng) ?? null : null

    const payload: UpdateRangePayload = {
      displayName: values.displayName.trim(),
      type: values.type,
      allowMemberEvents: values.allowMemberEvents,
      mapLogoUrl: toNullableString(values.mapLogoUrl),
      latitude,
      longitude,
      publicDescription: toNullableString(values.publicDescription),
      memberDescription: toNullableString(values.memberDescription),
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

const deleteRange = async () => {
  if (!rangeSlug.value || !canDeleteRange.value) {
    return
  }

  const confirmed = window.confirm(t('admin.rangeSettings.deleteConfirm'))
  if (!confirmed) {
    return
  }

  isDeleting.value = true
  lastError.value = null

  try {
    await rangeStore.deleteRange(rangeSlug.value)
    showSnackbar(t('admin.rangeSettings.deleteSuccess'))
    await router.push({ name: 'RangeDirectory' })
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : t('admin.rangeSettings.deleteError')
    showSnackbar(t('admin.rangeSettings.deleteError'), 'error')
  } finally {
    isDeleting.value = false
  }
}

const parkingLocation = computed(() => {
  const parking =
    rangeStore.currentRange?.parkingLocation ?? rangeStore.currentRange?.extras?.parkingLocation ?? null

  if (!parking || parking.latitude === null || parking.longitude === null) {
    return null
  }

  return {
    latitude: parking.latitude,
    longitude: parking.longitude,
  }
})

const handleParkingSave = async (location: { latitude: number; longitude: number } | null) => {
  if (!rangeSlug.value) {
    return
  }

  isSavingParking.value = true

  try {
    await rangeStore.updateParkingLocation(rangeSlug.value, location)
    showSnackbar(t('admin.rangeSettings.parking.successMessage'))
    isParkingModalOpen.value = false
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : t('admin.rangeSettings.parking.errorMessage')
    showSnackbar(t('admin.rangeSettings.parking.errorMessage'), 'error')
  } finally {
    isSavingParking.value = false
  }
}

onMounted(() => {
  void loadRangeSettings(true)
})

watch(
  () => route.query.rangeSlug,
  () => {
    lastError.value = null
    void loadRangeSettings(true)
  },
)
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

          :disabled="isLoading || !hasRangeSlug"

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



      <v-alert
        v-if="!hasRangeSlug && !isLoading"
        type="info"
        variant="tonal"
        border="start"
        class="mx-4 mt-4"
      >
        {{ t('admin.rangeSettings.slugHint') }}
      </v-alert>



      <Form
        v-if="hasRangeSlug"

        :key="formKey"

        :initial-values="initialValues"

        :validation-schema="schema"

        @submit="submitSettings"
      >
        <template #default="{ values }">
          <v-card-text>
            <v-row class="mb-4">
              <v-col

                cols="12"
                md="4"
              >
                <Field

                  v-slot="{ field, errorMessage }"

                  name="displayName"
                >
                  <v-text-field

                    :label="t('admin.rangeSettings.displayNameLabel')"

                    :model-value="field.value"

                    :error-messages="errorMessage"

                    data-testid="range-settings-display-name-input"

                    @update:model-value="field.onChange"

                    @blur="field.onBlur"
                  />
                </Field>
              </v-col>

              <v-col

                cols="12"
                md="4"
              >
                <Field

                  v-slot="{ field, errorMessage }"

                  name="type"
                >
                  <v-select

                    :label="t('admin.rangeSettings.rangeTypeLabel')"

                    :items="rangeTypeOptions"

                    item-title="label"

                    item-value="value"

                    :model-value="field.value"

                    :error-messages="errorMessage"

                    data-testid="range-settings-range-type-select"

                    @update:model-value="field.onChange"
                  />
                </Field>
              </v-col>

              <v-col
                cols="12"
                md="4"
              >
                <Field
                  v-slot="{ field, errorMessage }"
                  name="allowMemberEvents"
                >
                  <v-switch
                    :label="t('admin.rangeSettings.allowMemberEventsLabel')"
                    :model-value="field.value"
                    :error-messages="errorMessage"
                    color="primary"
                    inset
                    data-testid="range-settings-allow-member-events-switch"
                    @update:model-value="field.onChange"
                  />
                </Field>
              </v-col>

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

              <v-col
                cols="12"
                md="8"
              >
                <Field
                  v-slot="{ field, errorMessage }"
                  name="mapLogoUrl"
                >
                  <v-text-field
                    :label="t('admin.rangeSettings.mapLogoUrlLabel')"
                    :hint="t('admin.rangeSettings.mapLogoUrlHint')"
                    persistent-hint
                    :model-value="field.value ?? ''"
                    :error-messages="errorMessage"
                    data-testid="range-settings-map-logo-url-input"
                    @update:model-value="field.onChange"
                    @blur="field.onBlur"
                  />
                </Field>
              </v-col>
            </v-row>

            <v-row class="mb-4">
              <v-col

                cols="12"
              >
                <Field

                  v-slot="{ field }"

                  name="location"
                >
                  <div>
                    <div class="d-flex align-center justify-space-between mb-2 flex-wrap gap-2">
                      <div>
                        <h3 class="text-subtitle-1 font-weight-medium mb-1">
                          {{ t('admin.rangeSettings.locationHeading') }}
                        </h3>
                        <p class="text-body-2 text-medium-emphasis mb-0">
                          {{ t('admin.rangeSettings.locationHint') }}
                        </p>
                      </div>
                      <v-btn

                        variant="text"

                        size="small"

                        prepend-icon="mdi-map-marker-off-outline"

                        data-testid="range-settings-clear-location-button"

                        @click="field.onChange(null)"
                      >
                        {{ t('admin.rangeSettings.clearLocation') }}
                      </v-btn>
                    </div>

                    <RangeLocationPicker

                      :model-value="field.value"

                      @update:model-value="field.onChange"
                    />

                    <v-row class="mt-3" dense>
                      <v-col cols="12" md="6">
                        <v-text-field
                          :label="t('admin.rangeSettings.latitudeLabel')"
                          type="number"
                          inputmode="decimal"
                          :model-value="values.location?.lat ?? ''"
                          data-testid="range-settings-latitude-input"
                          @update:model-value="
                            (val) => field.onChange(updateLocationCoordinate(field.value, 'lat', val))
                          "
                        />
                      </v-col>
                      <v-col cols="12" md="6">
                        <v-text-field
                          :label="t('admin.rangeSettings.longitudeLabel')"
                          type="number"
                          inputmode="decimal"
                          :model-value="values.location?.lng ?? ''"
                          data-testid="range-settings-longitude-input"
                          @update:model-value="
                            (val) => field.onChange(updateLocationCoordinate(field.value, 'lng', val))
                          "
                        />
                      </v-col>
                    </v-row>

                  </div>
                </Field>
              </v-col>
            </v-row>

            <v-row class="mb-4">
              <v-col cols="12">
                <v-sheet
                  border
                  rounded="lg"
                  class="pa-4"
                  data-testid="range-settings-parking-section"
                >
                  <div class="d-flex align-start justify-space-between flex-wrap gap-2">
                    <div>
                      <h3 class="text-subtitle-1 font-weight-medium mb-1">
                        {{ t('admin.rangeSettings.parking.heading') }}
                      </h3>
                      <p class="text-body-2 text-medium-emphasis mb-2">
                        {{ t('admin.rangeSettings.parking.hint') }}
                      </p>
                      <p
                        class="text-body-2 mb-0"
                        data-testid="range-settings-parking-summary"
                      >
                        <template v-if="parkingLocation">
                          {{
                            t('admin.rangeSettings.parking.coordinates', {
                              lat: parkingLocation.latitude,
                              lng: parkingLocation.longitude,
                            })
                          }}
                        </template>
                        <template v-else>
                          {{ t('admin.rangeSettings.parking.empty') }}
                        </template>
                      </p>
                    </div>

                    <v-btn
                      color="primary"
                      variant="outlined"
                      :disabled="isLoading || isSavingParking || !hasRangeSlug"
                      data-testid="range-settings-parking-open-modal"
                      @click="isParkingModalOpen = true"
                    >
                      {{ t('admin.rangeSettings.parking.editAction') }}
                    </v-btn>
                  </div>
                </v-sheet>
              </v-col>
            </v-row>

            <v-divider class="my-6" />

            <h3 class="text-subtitle-1 font-weight-medium mb-4">
              {{ t('admin.rangeSettings.operatingHoursHeading') }}
            </h3>

            <v-table

              density="compact"

              class="operating-hours-table"
            >
              <thead>
                <tr>
                  <th>{{ t('admin.rangeSettings.dayColumn') }}</th>
                  <th>{{ t('admin.rangeSettings.statusColumn') }}</th>
                  <th>{{ t('admin.rangeSettings.openTimeLabel') }}</th>
                  <th>{{ t('admin.rangeSettings.closeTimeLabel') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr

                  v-for="day in dayOrder"

                  :key="day"
                >
                  <td class="text-capitalize">
                    {{ t(`rangeLanding.days.${day}`) }}
                  </td>
                  <td class="switch-cell">
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
                  </td>
                  <td>
                    <Field

                      v-slot="{ field, errorMessage }"

                      :name="`operatingHours.${day}.open`"
                    >
                      <v-text-field

                        type="time"

                        density="compact"

                        hide-details="auto"

                        :model-value="field.value"

                        :disabled="!values.operatingHours[day].isOpen"

                        :error-messages="errorMessage"

                        :data-testid="`range-settings-${day}-open-time-input`"

                        class="time-input"

                        @update:model-value="field.onChange"

                        @blur="field.onBlur"
                      />
                    </Field>
                  </td>
                  <td>
                    <Field

                      v-slot="{ field, errorMessage }"

                      :name="`operatingHours.${day}.close`"
                    >
                      <v-text-field

                        type="time"

                        density="compact"

                        hide-details="auto"

                        :model-value="field.value"

                        :disabled="!values.operatingHours[day].isOpen"

                        :error-messages="errorMessage"

                        :data-testid="`range-settings-${day}-close-time-input`"

                        class="time-input"

                        @update:model-value="field.onChange"

                        @blur="field.onBlur"
                      />
                    </Field>
                  </td>
                </tr>
              </tbody>
            </v-table>

            <v-divider class="my-6" />

            <v-row>
              <v-col

                cols="12"
                md="6"
              >
                <Field

                  v-slot="{ field, errorMessage }"

                  name="publicDescription"
                >
                  <v-textarea

                    :label="t('admin.rangeSettings.publicDescriptionLabel')"

                    :hint="t('admin.rangeSettings.publicDescriptionHint')"

                    persistent-hint

                    auto-grow

                    :model-value="field.value ?? ''"

                    :error-messages="errorMessage"

                    data-testid="range-settings-public-description-textarea"

                    @update:model-value="field.onChange"

                    @blur="field.onBlur"
                  />
                </Field>
              </v-col>

              <v-col

                cols="12"
                md="6"
              >
                <Field

                  v-slot="{ field, errorMessage }"

                  name="memberDescription"
                >
                  <v-textarea

                    :label="t('admin.rangeSettings.memberDescriptionLabel')"

                    :hint="t('admin.rangeSettings.memberDescriptionHint')"

                    persistent-hint

                    auto-grow

                    :model-value="field.value ?? ''"

                    :error-messages="errorMessage"

                    data-testid="range-settings-member-description-textarea"

                    @update:model-value="field.onChange"

                    @blur="field.onBlur"
                  />
                </Field>
              </v-col>
            </v-row>
          </v-card-text>

          <v-card-actions class="justify-end">
            <v-btn

              v-if="canDeleteRange"

              color="error"

              variant="text"

              :loading="isDeleting"

              :disabled="isSaving || isDeleting || !hasRangeSlug"

              data-testid="range-settings-delete-button"

              @click="deleteRange"
            >
              {{ t('admin.rangeSettings.deleteAction') }}
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

    <RangeParkingLocationModal
      v-model="isParkingModalOpen"
      :initial-location="parkingLocation"
      :saving="isSavingParking"
      @save="handleParkingSave"
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

<style scoped>
.operating-hours-table th,
.operating-hours-table td {
  vertical-align: middle;
}

.switch-cell {
  white-space: nowrap;
}

.time-input {
  max-width: 140px;
}
</style>
