<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const showHelp = ref(false);
const showAbout = ref(false);

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
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
          images: (() => { const c = chunkArray(apiData.images, 3); return c.length >= 3 ? c : base.images; })(),
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

    <!-- Help button + shortcuts panel -->
    <div class="absolute bottom-6 right-6 z-20 flex flex-col items-end gap-2">
      <!-- About row -->
      <div class="relative flex items-end gap-2">
        <Transition name="help-fade">
          <div v-if="showAbout" class="help-panel help-panel--narrow absolute right-full mr-2 bottom-0">
            <p class="help-section-label">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>
              Acerca de Mapora
            </p>
            <p class="about-text">
              Mapora es un mapa interactivo en 3D donde puedes explorar el mundo y llevar un registro de los países que has visitado.
            </p>
            <p class="about-text" style="margin-top: 0.5rem;">
              Crea una cuenta para guardar tu progreso y ver cuántos países has recorrido.
            </p>
          </div>
        </Transition>
        <button class="help-btn" @click="showAbout = !showAbout; showHelp = false" :class="{ 'help-btn--active': showAbout }">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8h.01M12 12v4"/></svg>
        </button>
      </div>
      <!-- Help row -->
      <div class="relative flex items-end gap-2">
        <Transition name="help-fade">
          <div v-if="showHelp" class="help-panel absolute right-full mr-2 bottom-0">
          <p class="help-section-label">
            <!-- Monitor icon -->
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            Escritorio
          </p>
          <ul class="help-list">
            <li>
              <span class="help-key">
                <!-- Mouse icon -->
                <svg width="11" height="13" viewBox="0 0 24 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1" width="18" height="28" rx="9"/><line x1="12" y1="1" x2="12" y2="14"/></svg>
                Clic + arrastrar
              </span>
              <span class="help-desc">Mover mapa</span>
            </li>
            <li>
              <span class="help-key">
                <!-- Scroll wheel icon -->
                <svg width="11" height="13" viewBox="0 0 24 36" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="1" width="18" height="28" rx="9"/><line x1="12" y1="1" x2="12" y2="14"/><rect x="10" y="5" width="4" height="6" rx="2" fill="currentColor" stroke="none"/></svg>
                Scroll
              </span>
              <span class="help-desc">Zoom</span>
            </li>
            <li>
              <span class="help-key">
                <!-- Keyboard key icon -->
                <svg width="13" height="11" viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="22" height="18" rx="3"/><line x1="8" y1="7" x2="8" y2="7" stroke-width="3" stroke-linecap="round"/><line x1="12" y1="7" x2="12" y2="7" stroke-width="3" stroke-linecap="round"/><line x1="16" y1="7" x2="16" y2="7" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="13" x2="16" y2="13" stroke-width="2.5" stroke-linecap="round"/></svg>
                F
              </span>
              <span class="help-desc">Restablecer vista</span>
            </li>
          </ul>

          <p class="help-section-label" style="margin-top: 0.85rem;">
            <!-- Phone icon -->
            <svg width="10" height="13" viewBox="0 0 20 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="1" width="18" height="26" rx="4"/><line x1="8" y1="23" x2="12" y2="23" stroke-width="2.5"/></svg>
            Móvil
          </p>
          <ul class="help-list">
            <li>
              <span class="help-key">
                <!-- Single finger icon -->
                <svg width="10" height="13" viewBox="0 0 20 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 1v16"/><path d="M6 8c0-2.2 1.8-4 4-4s4 1.8 4 4v8a4 4 0 0 1-8 0V8z"/></svg>
                1 dedo
              </span>
              <span class="help-desc">Mover mapa</span>
            </li>
            <li>
              <span class="help-key">
                <!-- Two fingers icon -->
                <svg width="14" height="13" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1v14"/><path d="M5 8c0-1.7 1.3-3 3-3s3 1.3 3 3v6a3 3 0 0 1-6 0V8z"/><path d="M20 1v14"/><path d="M17 8c0-1.7 1.3-3 3-3s3 1.3 3 3v6a3 3 0 0 1-6 0V8z"/></svg>
                2 dedos
              </span>
              <span class="help-desc">Zoom</span>
            </li>
            <li>
              <span class="help-key">
                <!-- Double tap icon -->
                <svg width="10" height="13" viewBox="0 0 20 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 1v16"/><path d="M6 8c0-2.2 1.8-4 4-4s4 1.8 4 4v8a4 4 0 0 1-8 0V8z"/></svg>
                Doble tap
              </span>
              <span class="help-desc">Restablecer vista</span>
            </li>
          </ul>
        </div>
        </Transition>
        <button class="help-btn" @click="showHelp = !showHelp; showAbout = false" :class="{ 'help-btn--active': showHelp }">?</button>
      </div>
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

/* Help button */
.help-btn {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.help-btn:hover {
  background: rgba(255, 255, 255, 0.13);
  color: #fff;
}
.help-btn--active {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

/* Help panel */
.help-panel {
  background: rgba(20, 20, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  backdrop-filter: blur(12px);
  padding: 1rem 1.2rem;
  min-width: 15rem;
}
.help-section-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 0.6rem;
}
.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.help-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.help-key {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 0.3rem;
  padding: 0.15rem 0.5rem;
  white-space: nowrap;
}
.help-desc {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.45);
}

.help-panel--narrow {
  min-width: 0;
  width: 15rem;
}

.about-text {
  font-size: 0.75rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
}

/* Help panel transition */
.help-fade-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.help-fade-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.help-fade-enter-from,
.help-fade-leave-to { opacity: 0; transform: translateY(6px); }
</style>
