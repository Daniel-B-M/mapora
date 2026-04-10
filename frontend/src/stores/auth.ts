import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  perfil: { nombre_completo: string; pais_origen: string };
  progreso: { paises_visitados: string[]; total_visitados: number; color_marcador: string };
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<UserProfile | null>(JSON.parse(localStorage.getItem('user') ?? 'null'));

  const isAuthenticated = computed(() => !!token.value);

  function setSession(newToken: string, newUser: UserProfile) {
    token.value = newToken;
    user.value = newUser;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  }

  function clearSession() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  async function login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Error al iniciar sesión');

    setSession(data.token, data.user);
  }

  async function register(payload: {
    username: string;
    email: string;
    password: string;
    nombre_completo?: string;
    pais_origen?: string;
  }) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Error al registrarse');

    setSession(data.token, data.user);
  }

  function logout() {
    clearSession();
  }

  function updateVisited(meshName: string, visited: boolean) {
    if (!user.value) return;
    const list = user.value.progreso.paises_visitados;
    if (visited) {
      if (!list.includes(meshName)) list.push(meshName);
    } else {
      const idx = list.indexOf(meshName);
      if (idx !== -1) list.splice(idx, 1);
    }
    // Persistir en localStorage
    localStorage.setItem('user', JSON.stringify(user.value));
  }

  return { token, user, isAuthenticated, login, register, logout, updateVisited };
});
