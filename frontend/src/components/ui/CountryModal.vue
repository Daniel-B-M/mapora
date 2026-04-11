<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import type { CountryData, CountryMedia } from '@/types/country';

interface Props {
  /** Si el modal está visible */
  open: boolean;
  /** Datos del país a mostrar */
  country: CountryData | null;
  /** Si los datos reales aún están cargando */
  loading?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  toggleVisited: [meshName: string];
}>();

const router = useRouter();
const auth = useAuthStore();

const isVisited = computed(() => props.country?.visited ?? false);

const showConfirm = ref(false);
const showAuthPrompt = ref(false);

function requestToggle() {
  if (!auth.isAuthenticated) {
    showAuthPrompt.value = true;
  } else {
    showConfirm.value = true;
  }
}

function confirmToggle() {
  showConfirm.value = false;
  if (props.country) emit('toggleVisited', props.country.meshName);
}

function cancelToggle() {
  showConfirm.value = false;
}

/** Nombres de sitios sin la categoría (antes del " — ") */
const sitioNames = computed(() =>
  (props.country?.lugaresTuristicos ?? []).map((s) => s.split(' — ')[0].trim()),
);

/* ─── Lightbox state ─────────────────────────────────────── */
const lightboxImages = ref<CountryMedia[]>([]);
const lightboxIndex = ref(0);
const lightboxType = ref<'image' | 'video'>('image');

const lightboxSrc = computed(() => lightboxImages.value[lightboxIndex.value]?.src ?? null);
const lightboxAlt = computed(() => lightboxImages.value[lightboxIndex.value]?.alt ?? '');

function preloadImages(images: CountryMedia[]) {
  images.forEach((img) => {
    const el = new Image();
    el.src = img.src;
  });
}

function openLightbox(images: CountryMedia[], index = 0, type: 'image' | 'video' = 'image') {
  lightboxImages.value = images;
  lightboxIndex.value = index;
  lightboxType.value = type;
  if (type === 'image') preloadImages(images);
}

function closeLightbox() {
  lightboxImages.value = [];
}

function prevImage() {
  if (lightboxIndex.value > 0) lightboxIndex.value--;
}

function nextImage() {
  if (lightboxIndex.value < lightboxImages.value.length - 1) lightboxIndex.value++;
}

function onKeydown(e: KeyboardEvent) {
  if (lightboxSrc.value) {
    if (e.key === 'Escape') { closeLightbox(); e.stopPropagation(); }
    else if (e.key === 'ArrowLeft') prevImage();
    else if (e.key === 'ArrowRight') nextImage();
  } else if (props.open && e.key === 'Escape') {
    emit('close');
  }
}

// Limpiar lightbox cuando se cierra el modal
watch(() => props.open, (isOpen) => {
  if (!isOpen) closeLightbox();
});

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));

function onOverlayClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('close');
  }
}

</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open && country"
        id="country-modal-overlay"
        class="modal-overlay"
        @click="onOverlayClick"
      >
        <div class="modal-container" role="dialog" aria-modal="true" :aria-label="`Información de ${country.displayName}`">
          <!-- Close button -->
          <button
            id="country-modal-close"
            class="modal-close"
            aria-label="Cerrar modal"
            @click="emit('close')"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>

          <!-- Title -->
          <h2 class="modal-title">{{ country.displayName }}</h2>

          <!-- Content grid: images left, videos right -->
          <div class="modal-grid">
            <!-- Images column -->
            <div class="modal-column">
              <div class="media-mosaic">
                <div class="media-large" :class="{ 'media-clickable': !loading }" @click="!loading && openLightbox(country.images[0], 0)">
                  <div v-if="loading" class="skeleton" />
                  <img v-else :src="country.images[0]?.[0]?.src" :alt="country.images[0]?.[0]?.alt ?? ''" class="media-img" />
                  <span v-if="!loading" class="media-label">{{ sitioNames[0] }}</span>
                  <div v-if="!loading" class="expand-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                  </div>
                </div>
                <div class="media-row">
                  <div class="media-small" :class="{ 'media-clickable': !loading }" @click="!loading && openLightbox(country.images[1], 0)">
                    <div v-if="loading" class="skeleton" />
                    <img v-else :src="country.images[1]?.[0]?.src" :alt="country.images[1]?.[0]?.alt ?? ''" class="media-img" />
                    <span v-if="!loading" class="media-label">{{ sitioNames[1] }}</span>
                    <div v-if="!loading" class="expand-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </div>
                  </div>
                  <div class="media-small" :class="{ 'media-clickable': !loading }" @click="!loading && openLightbox(country.images[2], 0)">
                    <div v-if="loading" class="skeleton" />
                    <img v-else :src="country.images[2]?.[0]?.src" :alt="country.images[2]?.[0]?.alt ?? ''" class="media-img" />
                    <span v-if="!loading" class="media-label">{{ sitioNames[2] }}</span>
                    <div v-if="!loading" class="expand-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round">
                        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div class="info-block">
                <template v-if="loading">
                  <div class="skeleton skeleton--text" />
                  <div class="skeleton skeleton--text" style="width:80%" />
                  <div class="skeleton skeleton--text" style="width:60%" />
                </template>
                <template v-else-if="country.infoGeneral.length">
                  <h3 class="info-title">Información</h3>
                  <ul class="info-list">
                    <li v-for="item in country.infoGeneral" :key="item" class="info-item">{{ item }}</li>
                  </ul>
                </template>
              </div>
            </div>

            <!-- Videos column -->
            <div class="modal-column">
              <div class="media-mosaic">
                <div class="media-large media-large--video" :class="{ 'media-clickable': !loading }" @click="!loading && openLightbox([country.videos[0]], 0, 'video')">
                  <div v-if="loading" class="skeleton" />
                  <img v-else :src="country.videos[0]?.thumbnail || country.videos[0]?.src" :alt="country.videos[0]?.alt ?? ''" class="media-img" />
                  <span v-if="!loading" class="media-label">{{ sitioNames[0] }}</span>
                  <div v-if="!loading" class="play-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
                <div class="media-row">
                  <div class="media-small media-small--video" :class="{ 'media-clickable': !loading }" @click="!loading && openLightbox([country.videos[1]], 0, 'video')">
                    <div v-if="loading" class="skeleton" />
                    <img v-else :src="country.videos[1]?.thumbnail || country.videos[1]?.src" :alt="country.videos[1]?.alt ?? ''" class="media-img" />
                    <span v-if="!loading" class="media-label">{{ sitioNames[1] }}</span>
                    <div v-if="!loading" class="play-icon play-icon--sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                  <div class="media-small media-small--video" :class="{ 'media-clickable': !loading }" @click="!loading && openLightbox([country.videos[2]], 0, 'video')">
                    <div v-if="loading" class="skeleton" />
                    <img v-else :src="country.videos[2]?.thumbnail || country.videos[2]?.src" :alt="country.videos[2]?.alt ?? ''" class="media-img" />
                    <span v-if="!loading" class="media-label">{{ sitioNames[2] }}</span>
                    <div v-if="!loading" class="play-icon play-icon--sm">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                  </div>
                </div>
              </div>
              <div class="info-block">
                <template v-if="loading">
                  <div class="skeleton skeleton--text" />
                  <div class="skeleton skeleton--text" style="width:70%" />
                  <div class="skeleton skeleton--text" style="width:85%" />
                </template>
                <template v-else-if="country.lugaresTuristicos.length">
                  <h3 class="info-title">Sitios de interés</h3>
                  <ul class="info-list">
                    <li v-for="lugar in country.lugaresTuristicos" :key="lugar" class="info-item">{{ lugar }}</li>
                  </ul>
                </template>
              </div>
            </div>
          </div>

          <!-- Visited button -->
          <div class="modal-footer">
            <button
              id="country-modal-visited-btn"
              class="visited-btn"
              :class="{ 'visited-btn--active': isVisited }"
              @click="requestToggle"
            >
              <svg v-if="isVisited" class="visited-icon" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ isVisited ? 'VISITADO' : 'MARCAR COMO VISITADO' }}
            </button>
          </div>

          <!-- Auth prompt -->
          <Transition name="confirm">
            <div v-if="showAuthPrompt" class="confirm-overlay" @click.self="showAuthPrompt = false">
              <div class="confirm-box">
                <p class="confirm-msg">
                  Necesitas iniciar sesión o registrarte para marcar países como visitados.
                </p>
                <div class="confirm-actions">
                  <button class="confirm-btn confirm-btn--cancel" @click="showAuthPrompt = false">Cancelar</button>
                  <button class="confirm-btn confirm-btn--ok" @click="showAuthPrompt = false; emit('close'); router.push({ name: 'login' })">
                    Iniciar sesión
                  </button>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Confirm dialog -->
          <Transition name="confirm">
            <div v-if="showConfirm" class="confirm-overlay" @click.self="cancelToggle">
              <div class="confirm-box">
                <p class="confirm-msg">
                  {{ isVisited
                    ? `¿Quitar "${country?.displayName}" de tus países visitados?`
                    : `¿Marcar "${country?.displayName}" como visitado?` }}
                </p>
                <div class="confirm-actions">
                  <button class="confirm-btn confirm-btn--cancel" @click="cancelToggle">Cancelar</button>
                  <button class="confirm-btn confirm-btn--ok" @click="confirmToggle">Confirmar</button>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Lightbox overlay (expande imagen/video en primer plano) -->
        <Transition name="lightbox">
          <div
            v-if="lightboxSrc"
            id="lightbox-overlay"
            class="lightbox-overlay"
            @click="closeLightbox"
          >
            <button class="lightbox-close" aria-label="Cerrar vista expandida" @click.stop="closeLightbox">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>

            <iframe
              v-if="lightboxType === 'video'"
              :src="`${lightboxSrc}?autoplay=1&rel=0`"
              class="lightbox-iframe"
              allow="autoplay; encrypted-media"
              allowfullscreen
              @click.stop
            />
            <!-- Fila: prev | imagen | next -->
            <div v-else class="lightbox-row" @click.stop>
              <button
                class="lightbox-nav"
                :class="{ 'lightbox-nav--hidden': lightboxIndex === 0 }"
                aria-label="Imagen anterior"
                @click.stop="prevImage"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>

              <Transition name="img-fade" mode="out-in">
                <img
                  :key="lightboxIndex"
                  :src="lightboxSrc"
                  :alt="lightboxAlt"
                  class="lightbox-media"
                />
              </Transition>

              <button
                class="lightbox-nav"
                :class="{ 'lightbox-nav--hidden': lightboxIndex === lightboxImages.length - 1 }"
                aria-label="Imagen siguiente"
                @click.stop="nextImage"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <div class="lightbox-footer" @click.stop>
              <p v-if="lightboxAlt" class="lightbox-caption">{{ lightboxAlt }}</p>
              <p v-if="lightboxImages.length > 1" class="lightbox-counter">
                {{ lightboxIndex + 1 }} / {{ lightboxImages.length }}
              </p>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Overlay ───────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 1.5rem;
}

/* ─── Container ─────────────────────────────────────────── */
.modal-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(
    145deg,
    #202126,
    #202126
  );
  border: 1px solid rgba(100, 160, 255, 0.15);
  border-radius: 1.25rem;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.5),
    0 0 60px rgba(11, 100, 244, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 2rem 2rem 1.5rem;
}

/* ─── Close button ──────────────────────────────────────── */
.modal-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: scale(1.1);
}

/* ─── Title ─────────────────────────────────────────────── */
.modal-title {
  font-family: 'Boldonse', sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: #fff;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0 0 1.5rem;
  text-shadow: 0 2px 20px rgba(11, 100, 244, 0.3);
}

/* ─── Content grid ──────────────────────────────────────── */
.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.modal-column {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ─── Media mosaic layout ───────────────────────────────── */
.media-mosaic {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.media-large {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  border-radius: 0.75rem;
  overflow: hidden;
  background: #50aaf040;
  border: 2px solid #50aaf04d;
}

.media-large--video {
  background: #dcdcdc40;
  border-color: #8c8c8c40;
}

.media-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.media-small {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 0.6rem;
  overflow: hidden;
  background: #50aaf033;
  border: 2px solid #50aaf040;
}

.media-small--video {
  background: #dcdcdc40;
  border-color: #8c8c8c40;
}

.media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.35s ease;
}

.media-large:hover .media-img,
.media-small:hover .media-img {
  transform: scale(1.06);
}

/* ─── Media labels ──────────────────────────────────────── */
.media-label {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90%;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #ffffff;
  text-shadow:
    -1px -1px 0 #000,
     1px -1px 0 #000,
    -1px  1px 0 #000,
     1px  1px 0 #000,
    0 2px 8px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  text-transform: uppercase;
}

/* ─── Play icon for videos ──────────────────────────────── */
.play-icon {
  position: absolute;
  bottom: 0.6rem;
  right: 0.6rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.play-icon--sm {
  width: 30px;
  height: 30px;
  bottom: 0.4rem;
  right: 0.4rem;
}

/* ─── Skeleton loader ───────────────────────────────────── */
.skeleton {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton--text {
  height: 0.75rem;
  width: 100%;
  border-radius: 4px;
  margin-bottom: 0.35rem;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ─── Info bullet lists ─────────────────────────────────── */
.info-block {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.info-title {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #ffffffdd;
  margin: 0;
  padding: 0 0.25rem;
}

.info-list {
  list-style: none;
  margin: 0;
  padding: 0 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.info-item {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.72rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.65);
}

.info-item::before {
  content: '●';
  color: #ffffff;
  font-size: 0.45rem;
  flex-shrink: 0;
  margin-top: 0.1em;
}

/* ─── Footer / Visited button ───────────────────────────── */
.modal-footer {
  display: flex;
  justify-content: center;
  margin-top: 1.25rem;
}

.visited-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 2.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #fff;
  background: linear-gradient(135deg, #1a7a3a, #22a84a);
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  box-shadow:
    0 4px 20px rgba(34, 168, 74, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.25s ease;
}

.visited-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 6px 28px rgba(34, 168, 74, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.visited-btn:active {
  transform: translateY(0);
}

.visited-btn--active {
  background: linear-gradient(135deg, #0b64f4, #3d8ef7);
  box-shadow:
    0 4px 20px rgba(11, 100, 244, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.visited-btn--active:hover {
  box-shadow:
    0 6px 28px rgba(11, 100, 244, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.visited-icon {
  flex-shrink: 0;
}

/* ─── Confirm dialog ────────────────────────────────────── */
.confirm-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  border-radius: 1.25rem;
}

.confirm-box {
  background: #26272d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1.5rem 1.75rem;
  max-width: 320px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.confirm-msg {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  line-height: 1.5;
  margin: 0;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.confirm-btn {
  padding: 0.5rem 1.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border: none;
  border-radius: 2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn--cancel {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}

.confirm-btn--cancel:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.confirm-btn--ok {
  background: linear-gradient(135deg, #1a7a3a, #22a84a);
  color: #fff;
  box-shadow: 0 4px 16px rgba(34, 168, 74, 0.3);
}

.confirm-btn--ok:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(34, 168, 74, 0.45);
}

.confirm-enter-active { transition: opacity 0.2s ease; }
.confirm-leave-active { transition: opacity 0.15s ease; }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }

/* ─── Animations ────────────────────────────────────────── */
.modal-enter-active {
  transition: opacity 0.8s ease;
}
.modal-leave-active {
  transition: opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  animation: modal-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-leave-active .modal-container {
  animation: modal-slide-out 0.2s ease-in;
}

@keyframes modal-slide-in {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes modal-slide-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(15px) scale(0.97);
  }
}

/* ─── Responsive ────────────────────────────────────────── */
@media (max-width: 640px) {
  .modal-container {
    padding: 1.25rem;
  }

  .modal-title {
    font-size: 1.4rem;
  }

  .modal-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
}

/* ─── Scrollbar styling ─────────────────────────────────── */
.modal-container::-webkit-scrollbar {
  width: 6px;
}

.modal-container::-webkit-scrollbar-track {
  background: transparent;
}

.modal-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}

/* ─── Media clickable ───────────────────────────────────── */
.media-clickable {
  cursor: pointer;
}

.expand-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.media-clickable:hover .expand-icon {
  opacity: 1;
}

/* ─── Lightbox ──────────────────────────────────────────── */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  cursor: zoom-out;
  padding: 2rem;
}

.lightbox-close {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  transform: scale(1.1);
}

.lightbox-media {
  max-width: 90vw;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 0.75rem;
  box-shadow:
    0 20px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.06);
  cursor: default;
}

.lightbox-iframe {
  width: 90vw;
  max-width: 960px;
  height: 54vw;
  max-height: 540px;
  border: none;
  border-radius: 0.75rem;
  box-shadow:
    0 20px 80px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 255, 255, 0.06);
}

.lightbox-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.lightbox-nav {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  transform: scale(1.08);
}

.lightbox-nav--hidden {
  visibility: hidden;
  pointer-events: none;
}

.lightbox-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  margin-top: 1rem;
}

.lightbox-caption {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.05em;
  text-align: center;
  margin: 0;
}

.lightbox-counter {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.1em;
  margin: 0;
}

/* ─── Image fade transition ─────────────────────────────── */
.img-fade-enter-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.img-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.img-fade-enter-from {
  opacity: 0;
  transform: scale(0.97);
}
.img-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

/* ─── Lightbox animations ───────────────────────────────── */
.lightbox-enter-active {
  transition: opacity 0.5s ease;
}
.lightbox-leave-active {
  transition: opacity 0.2s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

.lightbox-enter-active .lightbox-media {
  animation: lightbox-zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.lightbox-leave-active .lightbox-media {
  animation: lightbox-zoom-out 0.2s ease-in;
}

@keyframes lightbox-zoom-in {
  from {
    opacity: 0;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes lightbox-zoom-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.9);
  }
}
</style>
