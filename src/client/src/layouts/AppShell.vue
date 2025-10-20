<template>
  <div class="app-shell">
    <v-navigation-drawer app permanent>
      <v-list density="comfortable" nav>
        <RoleBasedLink
          v-for="item in navigationItems"
          :key="item.label"
          :icon="item.icon"
          :label="item.label"
          :roles="item.roles"
          :to="item.to"
        />
      </v-list>
    </v-navigation-drawer>

    <v-app-bar color="primary" density="comfortable" dark>
      <v-app-bar-title>{{ t('app.title') }}</v-app-bar-title>
      <v-spacer />

      <v-menu>
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
          >
            <v-icon>mdi-account-circle</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            :title="userEmail ?? '—'"
            subtitle="Strzel Sobie"
          />
          <v-divider />
          <v-list-item
            :title="t('navigation.profile')"
            :to="{ name: 'profile' }"
            link
          />
          <v-list-item
            :title="t('app.logout')"
            @click="handleLogout"
          />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <slot />
    </v-main>

    <v-footer app class="justify-center">
      <span class="text-caption">
        {{ t('app.title') }} · {{ t('app.privacyPolicy') }}
      </span>
    </v-footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import RoleBasedLink from '../components/navigation/RoleBasedLink.vue'
import { useAuthStore } from '../stores/auth'
import type { UserRole } from '../types/auth'

const authStore = useAuthStore()
const router = useRouter()
const { t } = useI18n()

const { user, defaultRangeSlug } = storeToRefs(authStore)

const fallbackRangeSlug = computed(() => defaultRangeSlug.value ?? 'dobczyce')

interface NavigationItem {
  icon: string
  label: string
  to: RouteLocationRaw
  roles?: UserRole[]
}

const navigationItems = computed<NavigationItem[]>(() => [
  {
    icon: 'mdi-calendar',
    label: t('navigation.calendar'),
    to: { name: 'calendar', params: { rangeSlug: fallbackRangeSlug.value } },
  },
  {
    icon: 'mdi-account',
    label: t('navigation.profile'),
    to: { name: 'profile' },
  },
  {
    icon: 'mdi-account-multiple',
    label: t('navigation.userManagement'),
    to: { name: 'admin-users' },
    roles: ['Club/Community Administrator'] as UserRole[],
  },
  {
    icon: 'mdi-account-check',
    label: t('navigation.userVerification'),
    to: { name: 'admin-verify-users' },
    roles: ['Confirmator'] as UserRole[],
  },
  {
    icon: 'mdi-office-building',
    label: t('navigation.rangeSettings'),
    to: { name: 'admin-range-settings' },
    roles: ['Shooting Range Administrator'] as UserRole[],
  },
])

const userEmail = computed(() => user.value?.email ?? '')

const handleLogout = async () => {
  await authStore.logout()
  await router.push({ name: 'auth' })
}
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
}
</style>
