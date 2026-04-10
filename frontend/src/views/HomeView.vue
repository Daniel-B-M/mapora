<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import ThreeCanvas from '@/components/map/ThreeCanvas.vue';
import BaseHeadline from '@/components/ui/BaseHeadline.vue';
import CountryModal from '@/components/ui/CountryModal.vue';
import { getCountryByMesh } from '@/data/dummyCountries';
import { getCountryByMeshName } from '@/services/countryApi';
import { useAuthStore } from '@/stores/auth';
import type { CountryData } from '@/types/country';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const router = useRouter();
const auth = useAuthStore();

const threeCanvasRef = ref<InstanceType<typeof ThreeCanvas> | null>(null);
const isModalOpen = ref(false);
const activeCountry = ref<CountryData | null>(null);
const loadingCountry = ref(false);

// Título visible solo cuando la cámara está en zoom por defecto o más lejos (≥ 2.6)
const showTitle = computed(() => {
  const d = threeCanvasRef.value?.cameraDistance ?? Infinity;
  return d >= 2.6;
});

// --- Visited: set local de meshNames ---
const visitedMeshNames = ref<Set<string>>(
  new Set(auth.user?.progreso.paises_visitados ?? [])
);

/** Colorea en el modelo 3D todos los países ya visitados */
function applyVisitedColors() {
  for (const meshName of visitedMeshNames.value) {
    threeCanvasRef.value?.setVisited(meshName, true);
  }
}

/** Persiste el estado visitado en la DB (solo si está autenticado) */
async function persistVisited(meshName: string, visited: boolean) {
  if (!auth.isAuthenticated) return;
  try {
    await fetch(`${API_BASE}/api/users/me/visited`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ meshName, visited }),
    });
  } catch (err) {
    console.warn('[Mapora] Error al guardar visitado:', err);
  }
}

/** Observar cambios en el mesh seleccionado para abrir el modal */
watch(
  () => threeCanvasRef.value?.selectedMeshName,
  async (meshName) => {
    if (!meshName) return;

    const base = getCountryByMesh(meshName);
    // Aplicar estado visitado local al abrir el modal
    base.visited = visitedMeshNames.value.has(meshName);
    activeCountry.value = base;
    loadingCountry.value = true;
    isModalOpen.value = true;

    try {
      const apiData = await getCountryByMeshName(meshName);
      if (apiData) {
        activeCountry.value = {
          ...base,
          meshName,
          displayName: apiData.nombre,
          infoGeneral: apiData.infoGeneral,
          lugaresTuristicos: apiData.lugaresTuristicos,
          images: apiData.images.length ? apiData.images : base.images,
          videos: apiData.videos.length ? apiData.videos : base.videos,
          visited: visitedMeshNames.value.has(meshName),
        };
      }
    } catch (err) {
      console.warn('[Mapora] API no disponible, usando dummy data:', err);
    } finally {
      loadingCountry.value = false;
    }
  },
);

/** Cuando el modelo 3D termina de cargar, aplicar colores de visitados */
watch(
  () => threeCanvasRef.value?.isLoading,
  (loading) => {
    if (loading === false) applyVisitedColors();
  },
);

/** Al cerrar sesión, restaurar todos los colores y limpiar el set */
watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (!authenticated) {
      for (const meshName of visitedMeshNames.value) {
        threeCanvasRef.value?.setVisited(meshName, false);
      }
      visitedMeshNames.value.clear();
    }
  },
);

function closeModal() {
  isModalOpen.value = false;
}

async function toggleVisited(meshName: string) {
  if (!activeCountry.value || activeCountry.value.meshName !== meshName) return;

  const newVisited = !activeCountry.value.visited;

  // 1. Actualizar estado local
  if (newVisited) {
    visitedMeshNames.value.add(meshName);
  } else {
    visitedMeshNames.value.delete(meshName);
  }

  // 2. Actualizar modal
  activeCountry.value = { ...activeCountry.value, visited: newVisited };

  // 3. Colorear mesh en el 3D
  threeCanvasRef.value?.setVisited(meshName, newVisited);

  // 4. Actualizar localStorage + guardar en DB
  auth.updateVisited(meshName, newVisited);
  await persistVisited(meshName, newVisited);
}

</script>

<template>
  <main class="relative w-full h-screen overflow-hidden" style="background-color: #202126;">
    <!-- Auth button top-right -->
    <div class="absolute top-4 right-4 z-20 flex items-center gap-2">
      <template v-if="auth.isAuthenticated">
        <span class="auth-username">{{ auth.user?.username }}</span>
        <button class="auth-btn" @click="auth.logout()">Salir</button>
      </template>
      <button v-else class="auth-btn auth-btn--login" @click="router.push({ name: 'login' })">
        Iniciar sesión
      </button>
    </div>

    <!-- Map Title overlay -->
    <Transition name="title-fade">
      <div
        v-if="showTitle"
        class="absolute top-16 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none w-full text-center"
      >
        <BaseHeadline
          text="MAPORA"
          class="text-6xl md:text-[8rem] tracking-[0.2em] font-medium opacity-95"
        />
      </div>
    </Transition>

    <!-- 3D Scene Background -->
    <div class="w-full h-full relative z-0">
      <ThreeCanvas ref="threeCanvasRef" />
    </div>

    <!-- Country info modal -->
    <CountryModal
      :open="isModalOpen"
      :country="activeCountry"
      :loading="loadingCountry"
      @close="closeModal"
      @toggle-visited="toggleVisited"
    />
  </main>
</template>

<style scoped>
.auth-btn {
  padding: 0.4rem 1rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 2rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.auth-btn:hover {
  background: rgba(255, 255, 255, 0.13);
  color: #fff;
}

.auth-btn--login {
  border-color: rgba(11, 100, 244, 0.5);
  color: #7eb3ff;
}

.auth-btn--login:hover {
  background: rgba(11, 100, 244, 0.15);
  border-color: rgba(11, 100, 244, 0.8);
  color: #fff;
}

.auth-username {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
}

.title-fade-enter-active { transition: opacity 0.5s ease; }
.title-fade-leave-active { transition: opacity 0.3s ease; }
.title-fade-enter-from,
.title-fade-leave-to    { opacity: 0; }
</style>
