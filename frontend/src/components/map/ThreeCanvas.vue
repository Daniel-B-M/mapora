<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { ISO_TO_MESH, MESH_TO_ISO } from '@/services/countryApi';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';

const containerRef = ref<HTMLDivElement | null>(null);
const isLoading = ref(true);
const loadError = ref<string | null>(null);
const selectedMeshName = ref<string | null>(null);
const cameraDistance = ref<number>(Infinity);

const globeInst = shallowRef<any>(null);
const visitedMeshNames = new Set<string>();
const highlightedMeshName = ref<string | null>(null);

const viewMode = ref<'progress' | 'realistic'>('progress');
const starFieldRef = shallowRef<any>(null);
let stylizedMaterial: THREE.MeshBasicMaterial | null = null;

// Colores
const defaultColor = '#505050';
const visitedColor = '#22a84a';
const highlightColor = '#4a90ff';

let lastTap = 0;
let touchGestureWasMulti = false;

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length > 1) touchGestureWasMulti = true;
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    if (!touchGestureWasMulti) {
      const now = Date.now();
      if (now - lastTap < 300) resetCamera();
      lastTap = now;
    }
    touchGestureWasMulti = false;
  }
}

function resetCamera() {
  if (globeInst.value) {
    globeInst.value.pointOfView({ lat: 0, lng: 0, altitude: 2.5 }, 1000);
  }
}

useKeyboardShortcuts({
  onResetCamera: () => resetCamera(),
});

function getPolygonColor(feat: any) {
  if (viewMode.value === 'realistic') return 'rgba(0,0,0,0)';

  const iso = feat.properties.ISO_A2;
  const meshName = ISO_TO_MESH[iso];

  if (meshName && meshName === highlightedMeshName.value) return highlightColor;
  if (meshName && visitedMeshNames.has(meshName)) return visitedColor;
  return defaultColor;
}

function getPolygonSideColor() {
  if (viewMode.value === 'realistic') return '#2b2a22'; // Un tono tierra oscuro para el relieve
  return '#303030';
}

onMounted(async () => {
  if (!containerRef.value) return;

  // --- Usar la textura proporcionada por el usuario ---
  const textureLoader = new THREE.TextureLoader();
  const earthDayTexture = textureLoader.load('/4k_earth_daymap.jpg');
  earthDayTexture.colorSpace = THREE.SRGBColorSpace;
  // Desactivar mipmaps para evitar la línea (seam) en el antimeridiano (Rusia/Alaska)
  earthDayTexture.generateMipmaps = false;
  earthDayTexture.minFilter = THREE.LinearFilter;
  
  const earthNightTexture = textureLoader.load('/4k_earth_nightmap.jpg');
  earthNightTexture.colorSpace = THREE.SRGBColorSpace;
  // Desactivar mipmaps para evitar la línea (seam) en el antimeridiano (Rusia/Alaska)
  earthNightTexture.generateMipmaps = false;
  earthNightTexture.minFilter = THREE.LinearFilter;

  const sunDirection = new THREE.Vector3(1, 0, 0);

  stylizedMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

  stylizedMaterial.onBeforeCompile = (shader) => {
    stylizedMaterial!.userData.shader = shader; // Guardamos ref para acceder luego
    shader.uniforms.tGlobe = { value: earthDayTexture };
    shader.uniforms.tNightGlobe = { value: earthNightTexture };
    shader.uniforms.uSunDirection = { value: sunDirection };
    
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vSpherePos;
      `
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      // Calculamos la posición global manualmente para evitar errores si Three.js no define worldPosition
      vec4 wPos = modelMatrix * vec4(position, 1.0);
      vSpherePos = normalize(wPos.xyz);
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
      #include <common>
      varying vec3 vSpherePos;
      uniform sampler2D tGlobe;
      uniform sampler2D tNightGlobe;
      uniform vec3 uSunDirection;
      `
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
      #include <color_fragment>
      vec3 dir = normalize(vSpherePos);
      
      // Matemática esférica pura para espacio de mundo en globe.gl
      // X = sin(lng), Z = cos(lng) -> atan(X, Z) = lng
      float u = 0.5 + atan(dir.x, dir.z) / (2.0 * 3.14159265);
      float v = 0.5 + asin(dir.y) / 3.14159265;

      // UVs Esféricas
      vec4 dayTexColor = texture2D(tGlobe, vec2(u, v));
      vec4 nightTexColor = texture2D(tNightGlobe, vec2(u, v));
      
      // Potenciar el mapa de día (más brillo y viveza)
      // Ajustamos el gamma (pow) para levantar los tonos medios y multiplicamos para dar más luz
      vec3 vibrantDayColor = pow(dayTexColor.rgb, vec3(0.85)) * 1.15;
      
      // Cálculo de iluminación manual (Sol)
      vec3 normal = normalize(vSpherePos);
      vec3 sunDir = normalize(uSunDirection);
      
      // dot product determina qué lado mira al sol (1.0) y cuál le da la espalda (-1.0)
      float sunDot = dot(normal, sunDir);
      
      // Iluminación Volumétrica: La luz del sol baña toda la esfera gradualmente.
      // Al extender el límite inferior hasta -0.35, creamos una luz crepuscular natural.
      // Esto hace que la geografía sea ligeramente visible en el atardecer (transición), 
      // pero caiga a 0% absoluto (negro total) en la noche profunda.
      float sunlight = smoothstep(-0.35, 1.0, sunDot);
      vec3 shadedDayColor = vibrantDayColor * sunlight;
      
      // La textura de noche se alinea con esta misma oscuridad profunda
      float nightMix = smoothstep(0.1, -0.35, sunDot);
      
      // Luces de ciudad puras, sin luz ambiente global artificial
      vec3 warmNightColor = nightTexColor.rgb * vec3(1.3, 1.1, 0.8);
      
      // Mezcla limpia final
      diffuseColor.rgb = shadedDayColor + (warmNightColor * nightMix);
      `
    );
  };

  const GlobeConstructor = Globe as any;
  const globe = GlobeConstructor()(containerRef.value)
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereColor('#4a90ff')
    .atmosphereAltitude(0.15)
    .polygonAltitude(0.007)
    .polygonCapColor(getPolygonColor)
    .polygonSideColor(getPolygonSideColor)
    .polygonStrokeColor(() => '#222222')
    .onPolygonHover((feat: any) => {
      containerRef.value!.style.cursor = feat ? 'pointer' : 'default';
    })
    .onPolygonClick((feat: any) => {
      const iso = feat.properties.ISO_A2;
      const meshName = ISO_TO_MESH[iso];
      if (meshName) {
        selectedMeshName.value = meshName;
      }
    });

  globeInst.value = globe;

  // Agregar fondo de estrellas con partículas
  const scene = globe.scene();
  const starsGeometry = new THREE.BufferGeometry();
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const colorObj = new THREE.Color();

  for (let i = 0; i < count; i++) {
    // Generar posiciones en una esfera inmensa para que queden muy por detrás del globo
    const r = 4000 + Math.random() * 2000;
    const theta = 2 * Math.PI * Math.random();
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    // Colores aleatorios para las estrellas (blancos, azulados)
    colorObj.setHSL(Math.random() * 0.2 + 0.5, Math.random() * 0.3, Math.random() * 0.5 + 0.5);
    colors[i * 3] = colorObj.r;
    colors[i * 3 + 1] = colorObj.g;
    colors[i * 3 + 2] = colorObj.b;
  }

  starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const starsMaterial = new THREE.PointsMaterial({
    size: 10.0,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const starField = new THREE.Points(starsGeometry, starsMaterial);
  starFieldRef.value = starField;
  scene.add(starField);


  // Trackear la distancia de la cámara
  const controls = globe.controls();
  controls.addEventListener('change', () => {
    // La altitud en globe.gl se correlaciona con la distancia
    const pov = globe.pointOfView();
    cameraDistance.value = pov.altitude;
  });

  // Ajustar tamaño cuando cambia la ventana
  const resizeObserver = new ResizeObserver(() => {
    if (containerRef.value) {
      globe.width(containerRef.value.clientWidth);
      globe.height(containerRef.value.clientHeight);
    }
  });
  resizeObserver.observe(containerRef.value);

  try {
    const res = await fetch('/countries-50m.geojson');
    if (!res.ok) throw new Error('Failed to load GeoJSON');
    const geojson = await res.json();
    globe.polygonsData(geojson.features);
  } catch (err) {
    console.error(err);
    loadError.value = "Error cargando datos del globo";
  } finally {
    isLoading.value = false;
    // Set vista inicial
    globe.pointOfView({ lat: 0, lng: 0, altitude: 2.5 });
  }

  let animationFrameId: number;
  
  function getSunDirection() {
    const now = new Date();
    // 1. Día del año
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / 86400000);
    
    // 2. Declinación Solar (Latitud del Sol, entre Trópico de Cáncer y Capricornio)
    const declinationDeg = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));
    const sunLat = declinationDeg * (Math.PI / 180);
    
    // 3. Longitud del Sol basada en UTC (A las 12:00 UTC está sobre Longitud 0)
    const timeInHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLngDeg = (12 - timeInHours) * 15;
    const sunLng = sunLngDeg * (Math.PI / 180);
    
    // 4. Coordenadas esféricas a vector 3D (X=sin(lng), Z=cos(lng), Y=sin(lat))
    const x = Math.sin(sunLng) * Math.cos(sunLat);
    const y = Math.sin(sunLat);
    const z = Math.cos(sunLng) * Math.cos(sunLat);
    
    return new THREE.Vector3(x, y, z).normalize();
  }

  function animate() {
    if (viewMode.value === 'realistic' && stylizedMaterial?.userData?.shader) {
      sunDirection.copy(getSunDirection());
    }
    animationFrameId = requestAnimationFrame(animate);
  }
  animate();

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrameId);
    resizeObserver.disconnect();
    if (containerRef.value) {
      containerRef.value.innerHTML = '';
    }
  });
});

function setVisited(meshName: string, visited: boolean) {
  if (visited) {
    visitedMeshNames.add(meshName);
  } else {
    visitedMeshNames.delete(meshName);
  }
  // Re-evaluar colores
  if (globeInst.value) {
    // Pequeño hack para forzar repintado: volver a aplicar la función
    globeInst.value.polygonCapColor(getPolygonColor);
  }
}

function getMeshNames(): string[] {
  // Retornar solo los nombres en español que tenemos mapeados
  return Object.keys(MESH_TO_ISO);
}

function highlightMesh(meshName: string) {
  highlightedMeshName.value = meshName;
  if (globeInst.value) {
    globeInst.value.polygonCapColor(getPolygonColor);
  }
}

function clearHighlight() {
  highlightedMeshName.value = null;
  if (globeInst.value) {
    globeInst.value.polygonCapColor(getPolygonColor);
  }
}

function focusOnMesh(meshName: string) {
  if (!globeInst.value) return;
  const iso = MESH_TO_ISO[meshName];
  if (!iso) return;
  
  const polygons = globeInst.value.polygonsData();
  const feat = polygons.find((f: any) => f.properties.ISO_A2 === iso);
  
  if (feat) {
    // Calcular el centroide básico del polígono
    const bbox = feat.bbox;
    if (bbox) {
      const lng = (bbox[0] + bbox[2]) / 2;
      const lat = (bbox[1] + bbox[3]) / 2;
      globeInst.value.pointOfView({ lat, lng, altitude: 1.0 }, 1000);
    } else {
      // Si no hay bbox, usar el primer punto (aproximación)
      let coords = feat.geometry.coordinates[0];
      if (feat.geometry.type === 'MultiPolygon') {
        coords = coords[0];
      }
      if (coords && coords[0]) {
        const [lng, lat] = coords[0];
        globeInst.value.pointOfView({ lat, lng, altitude: 1.0 }, 1000);
      }
    }
  }
}

// Dummy sceneManager object just to avoid breaking HomeView if it uses it directly anywhere else
// HomeView uses: sceneManager.resetCamera(), sceneManager.setVisited()... Wait, HomeView imports these from the exposed methods of ThreeCanvas.
// Let's ensure we expose them.
const sceneManager = {
  resetCamera
};

function toggleMode() {
  viewMode.value = viewMode.value === 'progress' ? 'realistic' : 'progress';
  if (globeInst.value) {
    if (viewMode.value === 'realistic' && stylizedMaterial) {
      globeInst.value.polygonCapMaterial(stylizedMaterial);
      globeInst.value.polygonSideMaterial(null); // Las paredes usan el color de getPolygonSideColor
      globeInst.value.globeMaterial(stylizedMaterial); // ¡Océanos comparten el ciclo día/noche!
    } else {
      globeInst.value.polygonCapMaterial(null);
      globeInst.value.polygonSideMaterial(null);
      // Restauramos el material original del globo (internamente re-crea un MeshPhongMaterial o similar)
      globeInst.value.globeMaterial(null);
      globeInst.value.globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg'); // Océanos oscuros
    }

    // Forzamos la actualización pasando una nueva referencia de función anónima
    globeInst.value.polygonCapColor((f: any) => getPolygonColor(f));
    globeInst.value.polygonSideColor(() => getPolygonSideColor());
  }
}

defineExpose({
  sceneManager,
  selectedMeshName,
  isLoading,
  cameraDistance,
  setVisited,
  getMeshNames,
  highlightMesh,
  clearHighlight,
  focusOnMesh
});
</script>

<template>
  <div class="relative w-full h-full">
    <div ref="containerRef" class="block w-full h-full" @touchstart="handleTouchStart" @touchend="handleTouchEnd"></div>

    <Transition name="fade">
      <div
        v-if="isLoading"
        class="absolute inset-0 flex flex-col items-center justify-center bg-[#202126]"
      >
        <div class="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p class="mt-4 text-white/60 text-sm tracking-widest uppercase">Cargando globo...</p>
      </div>
    </Transition>

    <div
      v-if="loadError"
      class="absolute inset-0 flex items-center justify-center bg-black"
    >
      <p class="text-red-400 text-sm">{{ loadError }}</p>
    </div>

    <!-- Toggle Mode Button -->
    <button 
      class="absolute bottom-6 left-6 px-5 py-2.5 bg-[#202126]/80 backdrop-blur-md text-white/90 rounded-full text-sm font-semibold shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:bg-[#2a2b30] transition-all border border-white/10 flex items-center gap-2 z-10"
      @click="toggleMode"
    >
      <span>{{ viewMode === 'progress' ? 'Modo Realista' : 'Modo Progreso' }}</span>
    </button>
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
