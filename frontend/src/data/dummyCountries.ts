import type { CountryData } from '@/types/country';

/**
 * Datos dummy de ejemplo para el modal de país.
 * Se utilizan mientras no haya conexión con el backend.
 * La key del record es el nombre del mesh en el modelo 3D.
 */
export const DUMMY_COUNTRIES: Record<string, CountryData> = {
  default: {
    meshName: 'default',
    displayName: 'País Seleccionado',
    images: [
      [{ src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80', alt: 'Paisaje montañoso' }],
      [{ src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&q=80', alt: 'Ciudad al atardecer' }],
      [{ src: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80', alt: 'Arquitectura histórica' }],
    ],
    videos: [
      { src: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?w=600&q=80', alt: 'Video cultural' },
      { src: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80', alt: 'Video naturaleza' },
      { src: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80', alt: 'Video aventura' },
    ],
    infoGeneral: [],
    lugaresTuristicos: [],
    visited: false,
  },
};

/**
 * Obtiene datos de un país por nombre de mesh.
 * Si el mesh no tiene datos propios, retorna los datos default
 * con el displayName ajustado al nombre del mesh.
 */
export function getCountryByMesh(meshName: string): CountryData {
  if (DUMMY_COUNTRIES[meshName]) {
    return DUMMY_COUNTRIES[meshName];
  }

  return {
    ...DUMMY_COUNTRIES.default,
    meshName,
    displayName: meshName,
  };
}
