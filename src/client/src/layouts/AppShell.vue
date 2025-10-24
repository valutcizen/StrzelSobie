<template>
  <div class="d-flex flex-column" style="height: 100vh;">
    <v-navigation-drawer
      v-model="drawer"
      :rail="isRail"
      :permanent="!isSmallScreen"
      :temporary="isSmallScreen"
      color="primary"
      class="app-shell-navigation"
      theme="dark"
    >
      <v-list
        density="compact"
        nav
      >
        <RoleBasedLink
          icon="mdi-calendar"
          label="Kalendarz"
          :to="{ name: 'Calendar', params: { rangeSlug: authStore.defaultRangeSlug } }"
        />
        <RoleBasedLink
          icon="mdi-account-group"
          label="Zarządzanie użytkownikami"
          :to="{ name: 'UserManagement' }"
          :roles="['Club/Community Administrator']"
        />
        <RoleBasedLink
          icon="mdi-account-check"
          label="Weryfikacja użytkowników"
          :to="{ name: 'UserVerification' }"
          :roles="['Confirmator']"
        />
        <RoleBasedLink
          icon="mdi-target-account"
          label="Ustawienia strzelnicy"
          :to="{ name: 'RangeSettings' }"
          :roles="['Shooting Range Administrator']"
        />
      </v-list>
      <template #append>
        <div class="app-shell-navigation__controls">
          <v-btn
            v-if="!isSmallScreen"
            variant="text"
            color="white"
            size="small"
            :icon="isRail ? 'mdi-chevron-double-right' : 'mdi-chevron-double-left'"
            :aria-label="isRail ? 'Rozwiń menu' : 'Zwiń menu'"
            @click="toggleRail"
          />
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar
      color="primary"
      density="comfortable"
    >
      <v-app-bar-nav-icon
        class="d-inline-flex d-sm-none"
        variant="text"
        @click.stop="drawer = !drawer"
      />
      <v-toolbar-title>Strzel Sobie</v-toolbar-title>
      <v-spacer />
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
            aria-label="Menu użytkownika"
          />
        </template>
        <v-list density="compact">
          <v-list-item
            :to="{ name: 'Profile' }"
            prepend-icon="mdi-account"
          >
            <v-list-item-title>Mój profil</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1" />
          <v-list-item
            prepend-icon="mdi-logout"
            @click="handleLogout"
          >
            <v-list-item-title>Wyloguj</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main class="bg-grey-lighten-5 flex-grow-1">
      <slot />
    </v-main>

    <AppFooter />
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import RoleBasedLink from '@/components/navigation/RoleBasedLink.vue'
import AppFooter from '@/components/common/AppFooter.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const display = useDisplay()
const isSmallScreen = computed(() => display.smAndDown.value)
const drawer = ref(!isSmallScreen.value)
const isRail = ref(!isSmallScreen.value)

watch(isSmallScreen, (isSmall) => {
  drawer.value = !isSmall
  isRail.value = !isSmall
}, { immediate: true })

const handleLogout = async () => {
  await authStore.logout()
  await router.push({ name: 'Auth' })
}

const toggleRail = () => {
  if (isSmallScreen.value) {
    return
  }
  isRail.value = !isRail.value
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
  justify-content: center;
  padding-inline: 0;
}

.app-shell-navigation__controls {
  display: flex;
  justify-content: center;
  padding: 12px 8px;
}

</style>
