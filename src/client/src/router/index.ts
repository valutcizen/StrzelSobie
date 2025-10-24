import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import type { UserRole } from '@/types/auth'
import { useAuthStore } from '@/stores/auth'

interface AppRouteMeta {
  requiresAuth?: boolean
  requiredRoles?: UserRole[]
  layout?: 'auth' | 'app'
}

type AppRouteRecordRaw = RouteRecordRaw & { meta?: AppRouteMeta }

const routes: AppRouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => ({ name: 'Calendar', params: { rangeSlug: 'dobczyce' } }),
  },
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
  {
    path: '/:rangeSlug',
    name: 'Calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true },
    props: true,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('@/views/admin/UserManagementView.vue'),
    meta: { requiresAuth: true, requiredRoles: ['Club/Community Administrator'] },
  },
  {
    path: '/admin/verify-users',
    name: 'UserVerification',
    component: () => import('@/views/admin/UserVerificationView.vue'),
    meta: { requiresAuth: true, requiredRoles: ['Confirmator'] },
  },
  {
    path: '/admin/range-settings',
    name: 'RangeSettings',
    component: () => import('@/views/admin/RangeSettingsView.vue'),
    meta: { requiresAuth: true, requiredRoles: ['Shooting Range Administrator'] },
  },
  {
    path: '/privacy',
    name: 'PrivacyPolicy',
    component: () => import('@/views/PrivacyPolicyView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some((record) => (record.meta as AppRouteMeta | undefined)?.requiresAuth)

  if (to.name === 'Auth' && authStore.isAuthenticated) {
    return { name: 'Calendar', params: { rangeSlug: authStore.defaultRangeSlug } }
  }

  if (!requiresAuth) {
    return true
  }

  try {
    await authStore.fetchUser()
  } catch (error) {
    if (to.name !== 'Auth') {
      return { name: 'Auth', query: { redirect: to.fullPath } }
    }
    return true
  }

  if (!authStore.isAuthenticated) {
    return { name: 'Auth', query: { redirect: to.fullPath } }
  }

  const requiredRoles = to.meta?.requiredRoles
  if (requiredRoles && requiredRoles.length > 0 && !authStore.hasAnyRole(requiredRoles)) {
    return { name: 'Calendar', params: { rangeSlug: authStore.defaultRangeSlug } }
  }

  return true
})

export default router
