import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/auth',
    },
    {
      path: '/auth',
      name: 'Auth',
      component: () => import('../views/AuthView.vue'),
      meta: { layout: 'auth' },
    },
    {
      path: '/:rangeSlug',
      name: 'Calendar',
      component: () => import('../views/CalendarView.vue'),
    },
  ],
});

export default router;