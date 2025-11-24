import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { UserRoleEnum, type UserRole } from '@/types/auth'
import { getLastRangeId } from '@/utils/lastRange'

interface AppRouteMeta {
  requiresAuth?: boolean
  requiredRoles?: UserRole[]
  requiredRangeRoles?: UserRole[]
  layout?: 'auth' | 'app'
}

type AppRouteRecordRaw = RouteRecordRaw & { meta?: AppRouteMeta }

const routes: AppRouteRecordRaw[] = [
  {
    path: '/',
    name: 'Root',
    redirect: () => {
      const storedRange = getLastRangeId()
      if (storedRange) {
        return `/${storedRange}`
      }

      return { name: 'RangeDirectory' }
    },
  },
  {
    path: '/auth',
    name: 'Auth',
    component: () => import('@/views/AuthView.vue'),
    meta: { layout: 'auth', requiresAuth: false },
  },
  {
    path: '/map',
    name: 'RangeDirectory',
    component: () => import('@/views/RangeDirectoryView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/:rangeSlug',
    name: 'RangeLanding',
    component: () => import('@/views/RangeLandingView.vue'),
    meta: { requiresAuth: false },
    props: true,
  },
  {
    path: '/:rangeSlug/calendar',
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
    meta: { requiresAuth: true, requiredRoles: [UserRoleEnum.ClubCommunityAdministrator] },
  },
  {
    path: '/admin/range-users',
    name: 'RangeUserManagement',
    component: () => import('@/views/admin/RangeUserManagementView.vue'),
    meta: {
      requiresAuth: true,
      requiredRoles: [UserRoleEnum.ClubCommunityAdministrator],
      requiredRangeRoles: [UserRoleEnum.ShootingRangeAdministrator],
    },
  },
  {
    path: '/admin/verify-users',
    name: 'UserVerification',
    component: () => import('@/views/admin/UserVerificationView.vue'),
    meta: { requiresAuth: true, requiredRoles: [UserRoleEnum.Confirmator] },
  },
  {
    path: '/admin/range-settings',
    name: 'RangeSettings',
    component: () => import('@/views/admin/RangeSettingsView.vue'),
    meta: {
      requiresAuth: true,
      requiredRoles: [UserRoleEnum.ClubCommunityAdministrator],
      requiredRangeRoles: [UserRoleEnum.ShootingRangeAdministrator],
    },
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

export default router

export type { AppRouteMeta }
