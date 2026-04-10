import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '@/views/HomeView.vue';
import LoginView from '@/views/LoginView.vue';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  // Si ya está autenticado no tiene sentido ir al login
  if (to.name === 'login' && auth.isAuthenticated) return { name: 'home' };
});

export default router;
