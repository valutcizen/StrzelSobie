import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { UserRole } from '../types/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: { name: 'calendar', params: { rangeSlug: 'dobczyce' } },
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../views/AuthView.vue'),
    meta: {
      requiresGuest: true,
      layout: 'auth',
    },
  },
  {
    path: '/:rangeSlug',
    name: 'calendar',
    component: () => import('../views/CalendarView.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      layout: 'app',
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: {
      requiresAuth: true,
      layout: 'app',
    },
  },
  {
    path: '/admin/users',
    name: 'admin-users',
    component: () => import('../views/admin/UserManagementView.vue'),
    meta: {
      requiresAuth: true,
      roles: ['Club/Community Administrator'] as UserRole[],
      layout: 'app',
    },
  },
  {
    path: '/admin/verify-users',
    name: 'admin-verify-users',
    component: () => import('../views/admin/UserVerificationView.vue'),
    meta: {
      requiresAuth: true,
      roles: ['Confirmator'] as UserRole[],
      layout: 'app',
    },
  },
  {
    path: '/admin/range-settings',
    name: 'admin-range-settings',
    component: () => import('../views/admin/RangeSettingsView.vue'),
    meta: {
      requiresAuth: true,
      roles: ['Shooting Range Administrator'] as UserRole[],
      layout: 'app',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
    meta: {
      layout: 'app',
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const authStore = useAuthStore()

  if (!authStore.isInitialized) {
    await authStore.bootstrap()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return next({ name: 'auth', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    return next({
      name: 'calendar',
      params: { rangeSlug: authStore.defaultRangeSlug ?? 'dobczyce' },
    })
  }

  const requiredRoles = Array.isArray(to.meta.roles) ? (to.meta.roles as UserRole[]) : null

  if (requiredRoles && requiredRoles.length > 0 && !authStore.hasAnyRole(requiredRoles)) {
    return next({
      name: 'calendar',
      params: { rangeSlug: authStore.defaultRangeSlug ?? 'dobczyce' },
    })
  }

  return next()
})

export default router
