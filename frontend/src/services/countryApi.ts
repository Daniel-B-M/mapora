const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface CountryDTO {
  codigoIso: string;
  nombre: string;
  infoGeneral: string[];
  lugaresTuristicos: string[];
  images: { src: string; alt: string }[];
  videos: { src: string; alt: string; thumbnail: string }[];
}

interface CountryBasic {
  codigoIso: string;
  nombre: string;
}

/** Caché del listado básico: nombre/iso → basic info */
let basicCache: Map<string, CountryBasic> | null = null;

/** Caché de países completos (con media) ya fetched */
const fullCache = new Map<string, CountryDTO>();

/** Elimina tildes y diacríticos para comparaciones robustas */
function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Carga la lista básica una sola vez (sin imágenes ni videos) */
async function fetchBasicList(): Promise<Map<string, CountryBasic>> {
  if (basicCache) return basicCache;

  const res = await fetch(`${API_BASE}/api/countries/latam`);
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const data: CountryBasic[] = await res.json();
  basicCache = new Map(data.map((c) => [c.codigoIso, c]));
  return basicCache;
}

/** Resuelve el ISO a partir del meshName */
async function resolveIso(meshName: string): Promise<string | null> {
  const map = await fetchBasicList();

  const upper = meshName.toUpperCase();
  if (map.has(upper)) return upper;

  // Quita sufijos tipo "_1", "_2" que algunos modelos agregan
  const clean = meshName.replace(/_\d+$/, '');
  const normalized = stripAccents(clean.toLowerCase().trim());

  for (const country of map.values()) {
    if (stripAccents(country.nombre.toLowerCase()) === normalized) return country.codigoIso;
  }

  return null;
}

/**
 * Busca un país completo (con imágenes y videos) por mesh name.
 * Solo llama a la API de media la primera vez — después usa caché.
 */
export async function getCountryByMeshName(meshName: string): Promise<CountryDTO | null> {
  const iso = await resolveIso(meshName);
  if (!iso) return null;

  if (fullCache.has(iso)) return fullCache.get(iso)!;

  const res = await fetch(`${API_BASE}/api/countries/${iso}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);

  const data: CountryDTO = await res.json();
  fullCache.set(iso, data);
  return data;
}
