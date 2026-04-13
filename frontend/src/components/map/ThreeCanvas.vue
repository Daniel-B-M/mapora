<script setup lang="ts">
import { ref } from 'vue';
import { useThreeScene } from '@/composables/useThreeScene';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const { sceneManager, isLoading, loadError, selectedMeshName, cameraDistance } = useThreeScene(canvasRef);

useKeyboardShortcuts({
  onResetCamera: () => sceneManager.resetCamera(),
});

let lastTap = 0;
function handleTouchEnd() {
  const now = Date.now();
  if (now - lastTap < 300) sceneManager.resetCamera();
  lastTap = now;
}

function setVisited(meshName: string, visited: boolean) {
  sceneManager.setVisited(meshName, visited);
}

function getMeshNames(): string[] {
  return sceneManager.getMeshNames();
}

function highlightMesh(meshName: string) {
  sceneManager.highlightMesh(meshName);
}

function clearHighlight() {
  sceneManager.clearHighlight();
}

function focusOnMesh(meshName: string) {
  sceneManager.focusOnMesh(meshName);
}

defineExpose({ sceneManager, selectedMeshName, isLoading, cameraDistance, setVisited, getMeshNames, highlightMesh, clearHighlight, focusOnMesh });
</script>

<template>
  <div class="relative w-full h-full">
    <canvas ref="canvasRef" class="block w-full h-full" @touchend="handleTouchEnd" />

    <Transition name="fade">
      <div
        v-if="isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-black"
      >
        <div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p class="mt-4 text-white/60 text-sm tracking-widest uppercase">Cargando mapa...</p>
      </div>
    </Transition>

    <div
      v-if="loadError"
      class="absolute inset-0 flex items-center justify-center bg-black"
    >
      <p class="text-red-400 text-sm">{{ loadError }}</p>
    </div>
  </div>
</template>

<style scoped>
.fade-leave-active {
  transition: opacity 0.6s ease;
}
.fade-leave-to {
  opacity: 0;
}
</style>
