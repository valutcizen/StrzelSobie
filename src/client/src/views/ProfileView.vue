<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import { http } from '@/services/http'
import { getRoleTranslationKey } from '@/utils/roles'
import { UserRoleEnum, type UserRole } from '@/types/auth'
import type {
  UpsertAdminContactProfileCommand,
  UpsertAdminContactProfileOverrideCommand,
  RangeSummaryDto,
} from '@strzel-sobie/common'

const authStore = useAuthStore()
const rangeStore = useRangeStore()
const route = useRoute()
const { t } = useI18n()
const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))

const canManageAdminContactProfile = computed(
  () =>
    authStore.hasAnyRole([
      UserRoleEnum.ShootingRangeAdministrator,
      UserRoleEnum.ClubCommunityAdministrator,
    ]) || authStore.hasAnyRangeRole([UserRoleEnum.ShootingRangeAdministrator]),
)

const ranges = ref<RangeSummaryDto[]>([])
const selectedRangeId = ref<number | null>(null)
const loadingRanges = ref(false)

const globalProfileForm = reactive({
  displayName: '',
  email: '',
  phoneNumber: '',
  isHiddenGlobally: false,
})

const overrideForm = reactive({
  displayName: '',
  email: '',
  phoneNumber: '',
  isHiddenInRange: false,
})

const isSavingGlobal = ref(false)
const isSavingOverride = ref(false)
const globalFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const overrideFeedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

const userId = computed(() => {
  const raw = authStore.user?.id
  if (!raw) {
    return null
  }
  const numeric = Number(raw)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null
})

const toNullableString = (value: string) => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

const loadRanges = async () => {
  if (!canManageAdminContactProfile.value) {
    return
  }

  loadingRanges.value = true
  try {
    if (rangeStore.directory.length === 0) {
      await rangeStore.fetchDirectory()
    }
    ranges.value = rangeStore.directory

    const routeRangeSlug = typeof route.params.rangeSlug === 'string' ? route.params.rangeSlug : null
    const queryRangeSlug = typeof route.query.rangeSlug === 'string' ? route.query.rangeSlug : null
    const preferredSlug = routeRangeSlug ?? queryRangeSlug ?? authStore.defaultRangeSlug
    const preferredRange = rangeStore.directory.find((item) => item.slug === preferredSlug)

    selectedRangeId.value = preferredRange?.id ?? rangeStore.directory[0]?.id ?? null
  } catch {
    ranges.value = []
    selectedRangeId.value = null
  } finally {
    loadingRanges.value = false
  }
}

const submitGlobalProfile = async () => {
  if (!userId.value) {
    return
  }

  isSavingGlobal.value = true
  globalFeedback.value = null

  const payload: UpsertAdminContactProfileCommand = {
    displayName: toNullableString(globalProfileForm.displayName),
    email: toNullableString(globalProfileForm.email),
    phoneNumber: toNullableString(globalProfileForm.phoneNumber),
    isHiddenGlobally: globalProfileForm.isHiddenGlobally,
  }

  try {
    await http.patch(`/users/${userId.value}/admin-contact-profile`, payload)
    globalFeedback.value = {
      type: 'success',
      message: t('profile.adminContactProfile.success'),
    }
  } catch (error) {
    globalFeedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : t('profile.adminContactProfile.error'),
    }
  } finally {
    isSavingGlobal.value = false
  }
}

const submitRangeOverride = async () => {
  if (!userId.value || !selectedRangeId.value) {
    return
  }

  isSavingOverride.value = true
  overrideFeedback.value = null

  const payload: UpsertAdminContactProfileOverrideCommand = {
    rangeId: selectedRangeId.value,
    displayName: toNullableString(overrideForm.displayName),
    email: toNullableString(overrideForm.email),
    phoneNumber: toNullableString(overrideForm.phoneNumber),
    isHiddenInRange: overrideForm.isHiddenInRange,
  }

  try {
    await http.patch(
      `/users/${userId.value}/admin-contact-profile-overrides/${selectedRangeId.value}`,
      payload,
    )
    overrideFeedback.value = {
      type: 'success',
      message: t('profile.adminContactOverride.success'),
    }
  } catch (error) {
    overrideFeedback.value = {
      type: 'error',
      message: error instanceof Error ? error.message : t('profile.adminContactOverride.error'),
    }
  } finally {
    isSavingOverride.value = false
  }
}

onMounted(() => {
  if (!authStore.user) {
    void authStore.fetchUser()
  }

  void loadRanges()
})
</script>

<template>
  <v-container data-testid="profile-view">
    <v-row justify="center">
      <v-col
        cols="12"
        md="8"
        lg="6"
      >
        <v-card
          v-if="authStore.user"
          :title="t('profile.title')"
          data-testid="profile-card"
          class="mb-4"
        >
          <v-card-text>
            <div data-testid="profile-email">
              <strong>{{ t('profile.emailLabel') }}:</strong> {{ authStore.user.email }}
            </div>
            <div
              class="mt-4"
              data-testid="profile-roles"
            >
              <strong>{{ t('profile.rolesHeading') }}:</strong>
              <v-chip-group>
                <v-chip
                  v-for="role in authStore.user.roles"
                  :key="role"
                >
                  {{ translateRole(role) }}
                </v-chip>
              </v-chip-group>
            </div>
          </v-card-text>
        </v-card>

        <v-card
          v-if="canManageAdminContactProfile"
          class="mb-4"
          :title="t('profile.adminContactProfile.title')"
          data-testid="profile-admin-contact-card"
        >
          <v-card-text>
            <p class="text-medium-emphasis text-body-2 mb-4">
              {{ t('profile.adminContactProfile.hint') }}
            </p>
            <v-alert
              v-if="globalFeedback"
              :type="globalFeedback.type"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              {{ globalFeedback.message }}
            </v-alert>
            <v-text-field
              v-model="globalProfileForm.displayName"
              :label="t('profile.adminContactProfile.displayNameLabel')"
              data-testid="profile-admin-display-name-input"
            />
            <v-text-field
              v-model="globalProfileForm.email"
              :label="t('profile.adminContactProfile.emailLabel')"
              type="email"
              data-testid="profile-admin-email-input"
            />
            <v-text-field
              v-model="globalProfileForm.phoneNumber"
              :label="t('profile.adminContactProfile.phoneLabel')"
              data-testid="profile-admin-phone-input"
            />
            <v-switch
              v-model="globalProfileForm.isHiddenGlobally"
              :label="t('profile.adminContactProfile.hiddenGloballyLabel')"
              color="primary"
              data-testid="profile-admin-hidden-globally-switch"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="isSavingGlobal"
              data-testid="profile-admin-contact-submit"
              @click="submitGlobalProfile"
            >
              {{ t('common.actions.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-card
          v-if="canManageAdminContactProfile"
          :title="t('profile.adminContactOverride.title')"
          data-testid="profile-admin-override-card"
        >
          <v-card-text>
            <p class="text-medium-emphasis text-body-2 mb-4">
              {{ t('profile.adminContactOverride.hint') }}
            </p>
            <v-alert
              v-if="overrideFeedback"
              :type="overrideFeedback.type"
              variant="tonal"
              border="start"
              class="mb-4"
            >
              {{ overrideFeedback.message }}
            </v-alert>
            <v-select
              v-model="selectedRangeId"
              :items="ranges"
              item-title="displayName"
              item-value="id"
              :loading="loadingRanges"
              :label="t('profile.adminContactOverride.rangeLabel')"
              data-testid="profile-admin-override-range-select"
            />
            <v-text-field
              v-model="overrideForm.displayName"
              :label="t('profile.adminContactOverride.displayNameLabel')"
              data-testid="profile-admin-override-display-name-input"
            />
            <v-text-field
              v-model="overrideForm.email"
              :label="t('profile.adminContactOverride.emailLabel')"
              type="email"
              data-testid="profile-admin-override-email-input"
            />
            <v-text-field
              v-model="overrideForm.phoneNumber"
              :label="t('profile.adminContactOverride.phoneLabel')"
              data-testid="profile-admin-override-phone-input"
            />
            <v-switch
              v-model="overrideForm.isHiddenInRange"
              :label="t('profile.adminContactOverride.hiddenInRangeLabel')"
              color="primary"
              data-testid="profile-admin-hidden-in-range-switch"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              color="primary"
              :loading="isSavingOverride"
              :disabled="!selectedRangeId"
              data-testid="profile-admin-override-submit"
              @click="submitRangeOverride"
            >
              {{ t('common.actions.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>

        <v-skeleton-loader
          v-if="!authStore.user"
          type="card"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
