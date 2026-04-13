import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  AMBIENT_LIGHT_INTENSITY,
  CAMERA_FAR,
  CAMERA_FOV,
  CAMERA_NEAR,
  CAMERA_POSITION_X,
  CAMERA_POSITION_Y,
  CAMERA_POSITION_Z,
  DIRECTIONAL_LIGHT_INTENSITY,
  DIRECTIONAL_LIGHT_X,
  DIRECTIONAL_LIGHT_Y,
  DIRECTIONAL_LIGHT_Z,
  MODEL_TARGET_SIZE,
  ORBIT_DAMPING_FACTOR,
  ZOOM_OUT_MAX_STEPS,
  ZOOM_IN_MAX_STEPS,
} from '@/three/utils/constants';

export class SceneManager {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer!: THREE.WebGLRenderer;
  public controls!: OrbitControls;
  private composer!: EffectComposer;
  private outlinePass!: OutlinePass;
  private animationId: number | null = null;
  private meshes: THREE.Mesh[] = [];
  private originalMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private selectedMesh: THREE.Mesh | null = null;
  private highlightedMesh: THREE.Mesh | null = null;

  // ── Animación de cámara (focus) ────────────────────────────
  private focusTarget    = new THREE.Vector3();
  private focusCamPos   = new THREE.Vector3();
  private isFocusing    = false;
  private readonly FOCUS_LERP_ALPHA = 0.05;  // 0-1: menor = más suave
  private raycaster = new THREE.Raycaster();
  private readonly selectionMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a90ff,
    roughness: 0.4,
    metalness: 0.1,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });

  private readonly visitedMaterial = new THREE.MeshStandardMaterial({
    color: 0x22a84a,
    roughness: 0.6,
    metalness: 0.05,
  });

  private visitedMeshNames = new Set<string>();

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, CAMERA_NEAR, CAMERA_FAR);
    this.camera.position.set(CAMERA_POSITION_X, CAMERA_POSITION_Y, CAMERA_POSITION_Z);
    this.setupLighting();
  }

  init(canvas: HTMLCanvasElement, pixelRatio: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.resize(canvas.clientWidth, canvas.clientHeight);

    this.setupEnvironment();
    this.setupComposer(canvas.clientWidth, canvas.clientHeight);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = ORBIT_DAMPING_FACTOR;
    this.controls.enableRotate = false;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.screenSpacePanning = false; // pan en plano XZ, bloquea paneo vertical de forma nativa

    this.controls.target.set(0, 0, 0);

    const initialDistance = this.camera.position.distanceTo(this.controls.target);
    this.controls.maxDistance = initialDistance * Math.pow(1 / 0.95, ZOOM_OUT_MAX_STEPS);
    this.controls.minDistance = initialDistance * Math.pow(0.95, ZOOM_IN_MAX_STEPS);

    // Cancelar cualquier animación de foco cuando el usuario empieza a interactuar
    this.controls.addEventListener('start', () => {
      this.isFocusing = false;
    });

    this.controls.update();
  }

  async loadModel(url: string): Promise<THREE.Group> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;

    this.applyClayMaterial(model);

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = MODEL_TARGET_SIZE / maxDim;

    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));

    this.scene.add(model);

    this.meshes = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) this.meshes.push(child);
    });

    return model;
  }

  selectAt(clientX: number, clientY: number): THREE.Mesh | null {
    // Si había highlight del buscador, limpiarlo antes de procesar el click
    this.clearHighlight();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);
    const intersects = this.raycaster.intersectObjects(this.meshes, false);
    const hit = intersects[0]?.object as THREE.Mesh | undefined;

    // Restaurar material del mesh previamente seleccionado
    if (this.selectedMesh) {
      const restoreMaterial = this.visitedMeshNames.has(this.selectedMesh.name)
        ? this.visitedMaterial
        : this.originalMaterials.get(this.selectedMesh.uuid) as THREE.Material;
      if (restoreMaterial) this.selectedMesh.material = restoreMaterial;
      if (this.selectedMesh === hit) {
        // Click en el mismo mesh → deseleccionar
        this.selectedMesh = null;
        this.outlinePass.selectedObjects = [];
        return null;
      }
      this.selectedMesh = null;
    }

    if (!hit) {
      this.outlinePass.selectedObjects = [];
      return null;
    }

    // Guardar material original si no está guardado aún
    if (!this.originalMaterials.has(hit.uuid)) {
      this.originalMaterials.set(hit.uuid, hit.material);
    }
    hit.material = this.selectionMaterial;
    this.selectedMesh = hit;
    this.outlinePass.selectedObjects = [hit];
    return hit;
  }

  clearSelection() {
    if (this.selectedMesh) {
      const restoreMaterial = this.visitedMeshNames.has(this.selectedMesh.name)
        ? this.visitedMaterial
        : this.originalMaterials.get(this.selectedMesh.uuid) as THREE.Material;
      if (restoreMaterial) this.selectedMesh.material = restoreMaterial;
      this.selectedMesh = null;
    }
    this.outlinePass.selectedObjects = [];
  }

  setVisited(meshName: string, visited: boolean) {
    const mesh = this.meshes.find((m) => m.name === meshName);
    if (!mesh) return;

    // Guardar material original si aún no está guardado
    if (!this.originalMaterials.has(mesh.uuid)) {
      this.originalMaterials.set(mesh.uuid, mesh.material);
    }

    if (visited) {
      this.visitedMeshNames.add(meshName);
      // Solo colorear si no está actualmente seleccionado
      if (this.selectedMesh !== mesh) mesh.material = this.visitedMaterial;
    } else {
      this.visitedMeshNames.delete(meshName);
      if (this.selectedMesh !== mesh) {
        const original = this.originalMaterials.get(mesh.uuid);
        if (original) mesh.material = original as THREE.Material;
      }
    }
  }

  /** Devuelve los nombres de todos los meshes cargados en la escena */
  getMeshNames(): string[] {
    return this.meshes.map((m) => m.name).filter(Boolean);
  }

  /**
   * Resalta un mesh por nombre (material azul + outline) sin disparar la selección
   * del modal. Llama a clearHighlight() antes de resaltar uno nuevo.
   */
  highlightMesh(meshName: string) {
    // Quitar highlight previo si lo hay
    this.clearHighlight();

    const mesh = this.meshes.find((m) => m.name === meshName);
    if (!mesh) return;

    // Guardar material original si aún no está guardado
    if (!this.originalMaterials.has(mesh.uuid)) {
      this.originalMaterials.set(mesh.uuid, mesh.material);
    }

    mesh.material = this.selectionMaterial;
    this.outlinePass.selectedObjects = [mesh];
    this.highlightedMesh = mesh;
  }

  /** Elimina el highlight de búsqueda sin cerrar el modal */
  clearHighlight() {
    if (!this.highlightedMesh) return;
    const restoreMaterial = this.visitedMeshNames.has(this.highlightedMesh.name)
      ? this.visitedMaterial
      : (this.originalMaterials.get(this.highlightedMesh.uuid) as THREE.Material);
    if (restoreMaterial) this.highlightedMesh.material = restoreMaterial;
    // Solo limpiar outline si no hay mesh seleccionado por click
    if (!this.selectedMesh) this.outlinePass.selectedObjects = [];
    this.highlightedMesh = null;
  }

  resetCamera() {
    if (!this.camera || !this.controls) return;
    // Animar suavemente de vuelta a la vista inicial (mismo lerp que focusOnMesh)
    this.focusTarget.set(0, 0, 0);
    this.focusCamPos.set(CAMERA_POSITION_X, CAMERA_POSITION_Y, CAMERA_POSITION_Z);
    this.isFocusing = true;
  }

  /**
   * Anima suavemente la cámara hacia el centro del mesh dado.
   * La distancia se escala según el tamaño del bounding box del mesh.
   */
  focusOnMesh(meshName: string) {
    if (!this.camera || !this.controls) return;
    const mesh = this.meshes.find((m) => m.name === meshName);
    if (!mesh) return;

    // Centro del mesh en coordenadas de mundo
    const box = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Tamaño para calcular distancia de zoom
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Distancia mínima para encuadrar el mesh bien
    const fovRad = (this.camera.fov * Math.PI) / 180;
    let distance = (maxDim / 2) / Math.tan(fovRad / 2) * 1.8;

    // Respetar límites del OrbitControls
    distance = Math.max(distance, this.controls.minDistance);
    distance = Math.min(distance, this.controls.maxDistance * 0.6);

    // Mantener mismo ángulo de vista que la cámara actual (dirección normalizada cámara→target)
    const currentDir = this.camera.position.clone()
      .sub(this.controls.target).normalize();

    this.focusTarget.copy(center);
    this.focusCamPos.copy(center).addScaledVector(currentDir, distance);
    this.isFocusing = true;
  }

  /** Paso de lerp ejecutado en cada frame del render loop */
  private _stepFocusLerp() {
    if (!this.isFocusing) return;

    const a = this.FOCUS_LERP_ALPHA;
    this.controls.target.lerp(this.focusTarget, a);
    this.camera.position.lerp(this.focusCamPos, a);

    // Terminamos cuando estamos suficientemente cerca
    const dTarget = this.controls.target.distanceTo(this.focusTarget);
    const dCam   = this.camera.position.distanceTo(this.focusCamPos);
    if (dTarget < 0.001 && dCam < 0.001) {
      this.controls.target.copy(this.focusTarget);
      this.camera.position.copy(this.focusCamPos);
      this.isFocusing = false;
    }
  }

  resize(width: number, height: number) {
    if (!this.renderer || width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer?.setSize(width, height);
  }

  startLoop(onFrame?: () => void) {
    const tick = () => {
      this.controls?.update();
      onFrame?.();
      this._stepFocusLerp();
      this.composer.render();
      this.animationId = requestAnimationFrame(tick);
    };
    tick();
  }

  stopLoop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose() {
    this.stopLoop();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  private setupComposer(width: number, height: number) {
    const size = new THREE.Vector2(width, height);

    this.outlinePass = new OutlinePass(size, this.scene, this.camera);
    this.outlinePass.edgeStrength = 6.0;
    this.outlinePass.edgeGlow = 1.0;
    this.outlinePass.edgeThickness = 2.0;
    this.outlinePass.visibleEdgeColor.set(0x4a90ff);
    this.outlinePass.hiddenEdgeColor.set(0x4a90ff);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(this.outlinePass);
    this.composer.addPass(new OutputPass());
  }

  private setupEnvironment() {
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    new EXRLoader().load('/forest.exr', (texture) => {
      const envTexture = pmremGenerator.fromEquirectangular(texture).texture;
      this.scene.environment = envTexture;
      texture.dispose();
      pmremGenerator.dispose();
    });
  }

  private applyClayMaterial(model: THREE.Group) {
    const shades = [0x505050, 0x646464, 0x787878, 0x8c8c8c];

    const meshes: THREE.Mesh[] = [];
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });

    // Pre-calcular bounding boxes y sets de vértices por mesh
    const PRECISION = 20; // 1/20 = 0.05 unidades de tolerancia
    const boxes = meshes.map((mesh) => new THREE.Box3().setFromObject(mesh).expandByScalar(0.05));

    const getVertexKeys = (mesh: THREE.Mesh): Set<string> => {
      const set = new Set<string>();
      const pos = mesh.geometry.attributes.position;
      const mat = mesh.matrixWorld;
      const v = new THREE.Vector3();
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(mat);
        set.add(`${Math.round(v.x * PRECISION)},${Math.round(v.z * PRECISION)}`);
      }
      return set;
    };

    const vertexSets = meshes.map(getVertexKeys);

    // Construir grafo de adyacencia
    const adjacency: Set<number>[] = meshes.map(() => new Set());
    for (let i = 0; i < meshes.length; i++) {
      for (let j = i + 1; j < meshes.length; j++) {
        if (!boxes[i].intersectsBox(boxes[j])) continue;
        for (const key of vertexSets[i]) {
          if (vertexSets[j].has(key)) {
            adjacency[i].add(j);
            adjacency[j].add(i);
            break;
          }
        }
      }
    }

    // Liberar sets de vértices — ya no se necesitan
    vertexSets.length = 0;

    // Greedy graph coloring
    const colorIndices = new Array(meshes.length).fill(-1);
    for (let i = 0; i < meshes.length; i++) {
      const usedByNeighbors = new Set<number>();
      for (const n of adjacency[i]) {
        if (colorIndices[n] !== -1) usedByNeighbors.add(colorIndices[n]);
      }
      const available = shades.findIndex((_, c) => !usedByNeighbors.has(c));
      colorIndices[i] = available !== -1 ? available : shades.length - 1;
    }

    // 4 materiales compartidos, uno por tono
    const materials = shades.map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.0 }),
    );
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x222222 });

    meshes.forEach((mesh, i) => {
      mesh.material = materials[colorIndices[i]];
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const edges = new THREE.EdgesGeometry(mesh.geometry, 30);
      const lines = new THREE.LineSegments(edges, edgeMaterial);
      mesh.add(lines);
    });
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
    const directionalLight = new THREE.DirectionalLight(0xffffff, DIRECTIONAL_LIGHT_INTENSITY);
    directionalLight.position.set(DIRECTIONAL_LIGHT_X, DIRECTIONAL_LIGHT_Y, DIRECTIONAL_LIGHT_Z);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
  }
}
