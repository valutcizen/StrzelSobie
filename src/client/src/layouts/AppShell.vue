<template>
  <div
    class="d-flex flex-column"
    style="height: 100vh;"
  >
    <v-app-bar
      color="primary"
      app
      :height="appBarHeight"
    >
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="toggleNav"
      />
      <img
        src="data:image/png;base64,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"
        alt="Logo"
        class="logo"
        :height="logoHeight"
      >
      <div class="app-title">
        <v-toolbar-title class="app-title__main">{{ t('app.title') }}</v-toolbar-title>
        <div class="app-title__subtitle">
          {{ t('app.subtitle') }}
        </div>
      </div>
      <v-spacer />
      <LanguageSwitcher class="mr-2" />
      <span
        v-if="authStore.user"
        class="mr-4 d-none d-md-inline-flex"
      >
        {{ authStore.user.email }}
      </span>
      <v-menu v-if="authStore.user">
        <template #activator="{ props }">
          <v-btn
            icon="mdi-account-circle"
            variant="text"
            v-bind="props"
            :aria-label="t('userMenu.label')"
            data-testid="user-menu-button"
          />
        </template>
        <v-list density="compact">
          <v-list-item
            :to="{ name: 'Profile' }"
            prepend-icon="mdi-account"
          >
            <v-list-item-title>{{ t('userMenu.profile') }}</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1" />
          <v-list-item
            prepend-icon="mdi-logout"
            data-testid="logout-button"
            @click="handleLogout"
          >
            <v-list-item-title>{{ t('userMenu.logout') }}</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-btn
        v-else
        color="secondary"
        variant="text"
        prepend-icon="mdi-login"
        data-testid="login-button"
        @click="router.push({ name: 'Auth' })"
      >
        {{ t('userMenu.login') }}
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :rail="isRail"
      :permanent="!isSmallScreen"
      :temporary="isSmallScreen"
      color="primary"
      class="app-shell-navigation"
      theme="dark"
      app
    >
      <v-list
        density="compact"
        nav
      >
        <RoleBasedLink
          icon="mdi-map"
          :label="t('navigation.directory')"
          :to="{ name: 'RangeDirectory' }"
        />
        <RoleBasedLink
          icon="mdi-target"
          :label="t('navigation.rangeInfo')"
          :to="{ name: 'RangeLanding', params: { rangeSlug: lastRangeSlug } }"
        />
        <RoleBasedLink
          icon="mdi-calendar"
          :label="t('navigation.calendar')"
          :to="{ name: 'Calendar', params: { rangeSlug: lastRangeSlug } }"
        />
        <RoleBasedLink
          icon="mdi-account-group"
          :label="t('navigation.userManagement')"
          :to="{ name: 'UserManagement' }"
          :roles="[UserRoleEnum.ClubCommunityAdministrator]"
        />
        <RoleBasedLink
          icon="mdi-account-cog"
          :label="t('navigation.rangeUserManagement')"
          :to="{ name: 'RangeUserManagement' }"
          :roles="[UserRoleEnum.ClubCommunityAdministrator]"
          :range-roles="[UserRoleEnum.ShootingRangeAdministrator]"
        />
        <RoleBasedLink
          icon="mdi-account-check"
          :label="t('navigation.userVerification')"
          :to="{ name: 'UserVerification' }"
          :roles="[UserRoleEnum.Confirmator]"
        />
        <RoleBasedLink
          icon="mdi-target-account"
          :label="t('navigation.rangeSettings')"
          :to="{ name: 'RangeSettings' }"
          :roles="[UserRoleEnum.ClubCommunityAdministrator]"
          :range-roles="[UserRoleEnum.ShootingRangeAdministrator]"
        />
        <v-list-item
          v-if="canCreateRange"
          prepend-icon="mdi-plus-circle"
          data-testid="nav-create-range-button"
          @click="openCreateRangeDialog"
        >
          <v-list-item-title>{{ t('admin.rangeSettings.newRange.cta') }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-5 flex-grow-1">
      <slot />
    </v-main>

    <AppFooter />

    <v-dialog
      v-model="isCreateRangeDialogOpen"
      max-width="480"
    >
      <v-card>
        <v-card-title>{{ t('admin.rangeSettings.newRange.title') }}</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ t('admin.rangeSettings.newRange.description') }}
          </p>
          <v-text-field
            v-model="newRangeSlug"
            :label="t('admin.rangeSettings.newRange.slugLabel')"
            :hint="t('admin.rangeSettings.newRange.slugHint')"
            prepend-inner-icon="mdi-link-variant"
            persistent-hint
            autocomplete="off"
            data-testid="nav-create-range-slug-input"
          />
          <v-alert
            v-if="createRangeError"
            type="error"
            variant="tonal"
            border="start"
            class="mt-2 mb-0"
          >
            {{ createRangeError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="closeCreateRangeDialog"
          >
            {{ t('common.actions.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="!newRangeSlug.trim() || isCreatingRange"
            :loading="isCreatingRange"
            @click="handleCreateRangeConfirm"
          >
            {{ t('common.actions.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import RoleBasedLink from '@/components/navigation/RoleBasedLink.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import { UserRoleEnum } from '@/types/auth'
import { getLastRangeId } from '@/utils/lastRange'

const { t } = useI18n()
const authStore = useAuthStore()
const rangeStore = useRangeStore()
const router = useRouter()
const display = useDisplay()
const isSmallScreen = computed(() => display.smAndDown.value)
const appBarHeight = computed(() => (display.mdAndUp.value ? 128 : 80))
const logoHeight = computed(() => (display.mdAndUp.value ? 120 : 64))
const drawer = ref(!isSmallScreen.value)
// Keep the drawer expanded on small screens to show labels; allow rail only on larger viewports.
const isRail = ref(false)
const isCreateRangeDialogOpen = ref(false)
const newRangeSlug = ref('')
const isCreatingRange = ref(false)
const createRangeError = ref<string | null>(null)

const lastRangeSlug = computed(() => rangeStore.currentRangeSlug ?? getLastRangeId() ?? authStore.defaultRangeSlug)
const canCreateRange = computed(() => authStore.hasAnyRole([UserRoleEnum.ClubCommunityAdministrator]))

watch(
  isSmallScreen,
  (isSmall) => {
    drawer.value = !isSmall
    isRail.value = isSmall ? false : isRail.value
  },
  { immediate: true },
)

const handleLogout = async () => {
  await authStore.logout()
  await router.push({ name: 'Auth' })
}

const toggleNav = () => {
  if (isSmallScreen.value) {
    drawer.value = !drawer.value
  } else {
    isRail.value = !isRail.value
  }
}

const openCreateRangeDialog = () => {
  newRangeSlug.value = ''
  createRangeError.value = null
  isCreateRangeDialogOpen.value = true
}

const closeCreateRangeDialog = () => {
  isCreateRangeDialogOpen.value = false
}

const handleCreateRangeConfirm = async () => {
  const slug = newRangeSlug.value.trim()
  if (!slug) {
    return
  }

  isCreatingRange.value = true
  createRangeError.value = null

  try {
    await rangeStore.createRange({ slug, displayName: slug })
    await router.push({ name: 'RangeSettings', query: { rangeSlug: slug } })
    isCreateRangeDialogOpen.value = false
    if (isSmallScreen.value) {
      drawer.value = false
    }
  } catch (error) {
    const message =
      (error as { response?: { data?: { error?: string } } } | undefined)?.response?.data?.error ??
      (error instanceof Error ? error.message : t('common.feedback.operationFailed'))
    createRangeError.value = message
  } finally {
    isCreatingRange.value = false
  }
}
</script>

<style scoped>
.logo {
  margin-right: 16px;
  align-self: center;
  max-height: 100%;
  width: auto;
  display: block;
}

.app-title {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  gap: 4px;
}

.app-title__main {
  line-height: 1.1;
}

.app-title__subtitle {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.95rem;
  line-height: 1.2;
  font-weight: 500;
}

.app-shell-navigation {
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.92);
}

.app-shell-navigation :deep(.v-list) {
  gap: 4px;
  padding-inline: 8px;
}

.app-shell-navigation :deep(.v-list-item) {
  border-radius: 8px;
  color: inherit;
}

.app-shell-navigation :deep(.v-list-item:hover) {
  background-color: rgba(255, 255, 255, 0.12);
}

.app-shell-navigation :deep(.v-list-item--active) {
  background-color: rgba(255, 255, 255, 0.24);
}

.app-shell-navigation :deep(.v-list-item-title),
.app-shell-navigation :deep(.v-icon) {
  color: inherit;
}

.app-shell-navigation.v-navigation-drawer--rail :deep(.v-list-item-title) {
  display: none;
}

.app-shell-navigation.v-navigation-drawer--rail :deep(.v-list-item) {
  padding-inline: 0;
}
</style>
