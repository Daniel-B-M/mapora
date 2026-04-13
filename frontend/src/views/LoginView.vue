<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import BaseHeadline from '@/components/ui/BaseHeadline.vue';

const router = useRouter();
const auth = useAuthStore();

const isRegister = ref(false);
const error = ref('');
const loading = ref(false);

const email = ref('');
const password = ref('');
const username = ref('');
const nombre_completo = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    if (isRegister.value) {
      await auth.register({ username: username.value, email: email.value, password: password.value, nombre_completo: nombre_completo.value });
    } else {
      await auth.login(email.value, password.value);
    }
    router.push({ name: 'home' });
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Error inesperado';
  } finally {
    loading.value = false;
  }
}

function toggleMode() {
  isRegister.value = !isRegister.value;
  error.value = '';
}
</script>

<template>
  <div class="login-bg">
    <div class="login-card">
      <BaseHeadline text="MAPORA" class="login-headline" />
      <p class="login-subtitle">{{ isRegister ? 'Crea tu cuenta' : 'Inicia sesión para explorar' }}</p>

      <form class="login-form" @submit.prevent="submit">
        <template v-if="isRegister">
          <div class="field">
            <label>Username</label>
            <input v-model="username" type="text" placeholder="tu_usuario" required />
          </div>
          <div class="field">
            <label>Nombre completo</label>
            <input v-model="nombre_completo" type="text" placeholder="Tu nombre" />
          </div>
        </template>

        <div class="field">
          <label>Email</label>
          <input v-model="email" type="email" placeholder="correo@ejemplo.com" required />
        </div>
        <div class="field">
          <label>Contraseña</label>
          <input v-model="password" type="password" placeholder="••••••••" required />
        </div>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button type="submit" class="login-btn" :disabled="loading">
          {{ loading ? 'Cargando...' : isRegister ? 'Registrarse' : 'Ingresar' }}
        </button>
      </form>

      <p class="login-toggle">
        {{ isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?' }}
        <button @click="toggleMode">{{ isRegister ? 'Inicia sesión' : 'Regístrate' }}</button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-bg {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #202126;
  padding: 1.5rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: linear-gradient(145deg, #26272d, #1e1f24);
  border: 1px solid rgba(100, 160, 255, 0.12);
  border-radius: 1.25rem;
  padding: 2.5rem 2rem;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.5),
    0 0 60px rgba(11, 100, 244, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
}

.login-headline {
  font-size: 3rem;
  letter-spacing: 0.3em;
}

.login-subtitle {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin: 0;
}

.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

.field input {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.6rem;
  padding: 0.7rem 0.9rem;
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.field input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}

.field input:focus {
  border-color: rgba(11, 100, 244, 0.6);
}

.login-error {
  font-size: 0.78rem;
  color: #ff6b6b;
  margin: 0;
  text-align: center;
}

.login-btn {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, #0b64f4, #3d8ef7);
  border: none;
  border-radius: 2rem;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 20px rgba(11, 100, 244, 0.3);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 28px rgba(11, 100, 244, 0.45);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-toggle {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}

.login-toggle button {
  background: none;
  border: none;
  color: #3d8ef7;
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0 0.25rem;
  text-decoration: underline;
}

/* ─── Responsive ─────────────────────────────────────────── */
@media (max-width: 480px) {
  .login-card {
    padding: 2rem 1.25rem;
    border-radius: 1rem;
  }

  .login-headline {
    font-size: 2.25rem;
  }

  .login-subtitle {
    font-size: 0.72rem;
  }

  .field input {
    padding: 0.65rem 0.8rem;
    font-size: 1rem; /* Prevents iOS auto-zoom on focus */
  }

  .login-btn {
    padding: 0.85rem;
    font-size: 0.82rem;
  }
}
</style>
