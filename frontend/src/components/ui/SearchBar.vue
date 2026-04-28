<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  suggestions: { meshName: string; displayName: string }[];
}>();

const emit = defineEmits<{
  select: [meshName: string];
}>();

const query = ref('');
const focused = ref(false);
const activeIndex = ref(-1);

function normalize(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const filtered = computed(() => {
  const q = normalize(query.value.trim());
  if (!q) return [];
  return props.suggestions
    .filter((s) => normalize(s.displayName).includes(q))
    .slice(0, 7);
});

const showDropdown = computed(() => focused.value && filtered.value.length > 0);

function select(item: { meshName: string; displayName: string }) {
  emit('select', item.meshName);
  query.value = '';
  activeIndex.value = -1;
}

function onKeydown(e: KeyboardEvent) {
  if (!showDropdown.value) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex.value = Math.min(activeIndex.value + 1, filtered.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex.value = Math.max(activeIndex.value - 1, 0);
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault();
    select(filtered.value[activeIndex.value]);
  } else if (e.key === 'Escape') {
    query.value = '';
    activeIndex.value = -1;
  }
}

function onBlur() {
  // Pequeño delay para que el click en una sugerencia se procese antes
  setTimeout(() => { focused.value = false; activeIndex.value = -1; }, 150);
}
</script>

<template>
  <div class="search-wrapper">
    <!-- Dropdown de sugerencias (arriba del input) -->
    <Transition name="dropdown-fade">
      <ul v-if="showDropdown" class="suggestions">
        <li
          v-for="(item, i) in filtered"
          :key="item.meshName"
          class="suggestion-item"
          :class="{ 'suggestion-item--active': i === activeIndex }"
          @mousedown.prevent="select(item)"
        >
          {{ item.displayName }}
        </li>
      </ul>
    </Transition>

    <!-- Input -->
    <div class="search-bar" :class="{ 'search-bar--focused': focused }">
      <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Buscar país..."
        autocomplete="off"
        spellcheck="false"
        @focus="focused = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <button v-if="query" class="clear-btn" @mousedown.prevent="query = ''; activeIndex = -1">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.search-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 22rem;
}

/* ── Input ── */
.search-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 2rem;
  padding: 0.55rem 0.9rem;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s ease, background 0.2s ease;
}

.search-bar--focused {
  background: rgba(255, 255, 255, 0.10);
  border-color: rgba(11, 100, 244, 0.5);
}

.search-icon {
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
}

.search-bar input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: color 0.15s ease;
}
.clear-btn:hover { color: rgba(255, 255, 255, 0.7); }

/* ── Dropdown ── */
.suggestions {
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  list-style: none;
  margin: 0;
  padding: 0.35rem;
  background: rgba(20, 20, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.suggestion-item {
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 0.5rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  letter-spacing: 0.02em;
}

.suggestion-item:hover,
.suggestion-item--active {
  background: rgba(11, 100, 244, 0.18);
  color: #fff;
}

/* ── Transition ── */
.dropdown-fade-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-fade-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-fade-enter-from,
.dropdown-fade-leave-to { opacity: 0; transform: translateY(4px); }

/* ── Responsive ── */
@media (max-width: 480px) {
  .search-wrapper {
    max-width: 100%;
  }

  .search-bar input {
    font-size: 1rem; /* Evita zoom en iOS */
  }
}
</style>
