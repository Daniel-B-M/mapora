import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import { SceneManager } from '@/three/core/SceneManager';
import { MAPA_MUNDI_MODEL_PATH } from '@/constants';
import { MAX_PIXEL_RATIO } from '@/three/utils/constants';

const DRAG_THRESHOLD_PX = 5;

export function useThreeScene(canvasRef: Ref<HTMLCanvasElement | null>) {
  const sceneManager = new SceneManager();
  const isLoading = ref(true);
  const loadError = ref<string | null>(null);
  const selectedMeshName = ref<string | null>(null);
  const cameraDistance = ref<number>(Infinity);
  let resizeObserver: ResizeObserver | null = null;

  let pointerDownX = 0;
  let pointerDownY = 0;

  function onPointerDown(e: PointerEvent) {
    pointerDownX = e.clientX;
    pointerDownY = e.clientY;
  }

  function onPointerUp(e: PointerEvent) {
    const dx = e.clientX - pointerDownX;
    const dy = e.clientY - pointerDownY;
    if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD_PX) return; // fue un drag, no un click

    const mesh = sceneManager.selectAt(e.clientX, e.clientY);
    if (mesh) e.preventDefault(); // evita el click sintético que abriría el lightbox del modal recién abierto
    selectedMeshName.value = mesh?.name ?? null;
  }

  onMounted(async () => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    sceneManager.init(canvas, pixelRatio);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    resizeObserver = new ResizeObserver(() => {
      sceneManager.resize(canvas.clientWidth, canvas.clientHeight);
    });
    resizeObserver.observe(canvas);

    sceneManager.controls.addEventListener('change', () => {
      cameraDistance.value = sceneManager.controls.getDistance();
    });

    sceneManager.startLoop();

    try {
      await sceneManager.loadModel(MAPA_MUNDI_MODEL_PATH);
    } catch (e) {
      loadError.value = 'No se pudo cargar el modelo 3D.';
      console.error(e);
    } finally {
      isLoading.value = false;
    }
  });

  onBeforeUnmount(() => {
    const canvas = canvasRef.value;
    canvas?.removeEventListener('pointerdown', onPointerDown);
    canvas?.removeEventListener('pointerup', onPointerUp);
    resizeObserver?.disconnect();
    sceneManager.dispose();
  });

  return { sceneManager, isLoading, loadError, selectedMeshName, cameraDistance };
}
