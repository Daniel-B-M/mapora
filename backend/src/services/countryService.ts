import { Country, type ICountry } from '../models/Country';
import { searchImages } from './pexelsService';
import { searchVideos } from './vimeoService';

export interface CountryMedia {
  src: string;
  alt: string;
  thumbnail?: string;
}

export interface CountryDTO {
  codigoIso: string;
  nombre: string;
  infoGeneral: string[];
  lugaresTuristicos: string[];
  images: CountryMedia[];
  videos: CountryMedia[];
}

/** Caché en memoria: iso → CountryDTO (se llena bajo demanda) */
const mediaCache = new Map<string, CountryDTO>();

function buildBaseDTO(c: ICountry): Omit<CountryDTO, 'images' | 'videos'> {
  const { nombre: monedaNombre, codigo: monedaCodigo, simbolo } = c.moneda;
  const idiomaLabel = c.idiomas.length > 1 ? 'Idiomas' : 'Idioma';
  const sitios = c.lugares_turisticos.slice(0, 3);

  return {
    codigoIso: c.codigo_iso,
    nombre: c.pais,
    infoGeneral: [
      `Nombre: ${c.pais}`,
      `Moneda: ${monedaNombre} (${monedaCodigo}, ${simbolo})`,
      `${idiomaLabel}: ${c.idiomas.join(', ')}`,
    ],
    lugaresTuristicos: sitios.map((l) => `${l.nombre} — ${l.tipo}`),
  };
}

async function fetchMedia(c: ICountry): Promise<{ images: CountryMedia[]; videos: CountryMedia[] }> {
  const sitios = c.lugares_turisticos.slice(0, 3);

  const [pexelsResults, youtubeResults] = await Promise.all([
    searchImages(sitios.map((l) => l.nombre)),
    searchVideos(sitios.map((l) => l.nombre)),
  ]);

  return {
    images: sitios.map((l, i) => {
      const found = pexelsResults[i];
      return { src: found?.url ?? '', alt: found?.alt ?? l.nombre };
    }),
    videos: sitios.map((l, i) => {
      const found = youtubeResults[i];
      return {
        src: found ? `https://player.vimeo.com/video/${found.videoId}` : '',
        alt: found?.title ?? l.nombre,
        thumbnail: found?.thumbnail ?? '',
      };
    }),
  };
}

/** Lista básica (sin media) — barata, sin llamadas externas */
export async function getAllLatam(): Promise<Omit<CountryDTO, 'images' | 'videos'>[]> {
  const countries = await Country.find({}).lean();
  return countries.map((c) => buildBaseDTO(c as unknown as ICountry));
}

/** País completo con media — bajo demanda, con caché */
export async function getCountryByIso(iso: string): Promise<CountryDTO | null> {
  const key = iso.toUpperCase();

  if (mediaCache.has(key)) return mediaCache.get(key)!;

  const c = await Country.findOne({ codigo_iso: key }).lean();
  if (!c) return null;

  const base = buildBaseDTO(c as unknown as ICountry);
  const media = await fetchMedia(c as unknown as ICountry);
  const dto: CountryDTO = { ...base, ...media };

  mediaCache.set(key, dto);
  return dto;
}
