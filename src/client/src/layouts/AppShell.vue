<template>
  <div
    class="d-flex flex-column"
    style="height: 100vh;"
  >
    <v-app-bar
      color="primary"
      density="comfortable"
      app
    >
      <v-app-bar-nav-icon
        variant="text"
        @click.stop="toggleNav"
      />
      <v-toolbar-title>{{ t('app.title') }}</v-toolbar-title>
      <v-spacer />
      <LanguageSwitcher class="mr-2" />
      <span
        v-if="authStore.user"
        class="mr-4 d-none d-md-inline-flex"
      >
        {{ authStore.user.email }}
      </span>
      <v-menu>
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
          icon="mdi-target"
          :label="t('navigation.rangeInfo')"
          :to="{ name: 'RangeLanding', params: { rangeSlug: authStore.defaultRangeSlug } }"
        />
        <RoleBasedLink
          icon="mdi-calendar"
          :label="t('navigation.calendar')"
          :to="{ name: 'Calendar', params: { rangeSlug: authStore.defaultRangeSlug } }"
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
      </v-list>
    </v-navigation-drawer>

    <v-main class="bg-grey-lighten-5 flex-grow-1">
      <slot />
    </v-main>

    <AppFooter />
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
import { UserRoleEnum } from '@/types/auth'

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const display = useDisplay()
const isSmallScreen = computed(() => display.smAndDown.value)
const drawer = ref(!isSmallScreen.value)
// Keep the drawer expanded on small screens to show labels; allow rail only on larger viewports.
const isRail = ref(false)

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
</script>

<style scoped>
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
