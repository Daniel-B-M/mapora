import { Country, type ICountry } from '../models/Country';
import { searchImagesPerPlace } from './pexelsService';
import { searchVideo, YouTubeQuotaError, type YoutubeVideo } from './youtubeService';
import { translatePlaceName } from './translationService';

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
  images: CountryMedia[][];
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

async function resolveVideo(
  c: ICountry,
  index: number,
): Promise<YoutubeVideo | null> {
  const lugar = c.lugares_turisticos[index];

  const tag = `[Video] ${c.codigo_iso}/${lugar.nombre}`;

  // Ya tiene video guardado en DB — lo sirve directamente
  if (lugar.video_id) {
    console.log(`${tag} — sirviendo desde DB (${lugar.video_id})`);
    return { videoId: lugar.video_id, title: lugar.video_title ?? '', thumbnail: lugar.video_thumbnail ?? '' };
  }

  const attempts = lugar.video_search_attempts ?? 0;

  // Sin video y ya se intentó 2 veces → no reintenta más
  if (lugar.video_id === null && attempts >= 2) {
    console.warn(`${tag} — sin video tras ${attempts} intentos, no se reintenta`);
    return null;
  }

  if (lugar.video_id === null) {
    console.log(`${tag} — DB tiene null (intento ${attempts + 1}/2), reintentando búsqueda`);
  }

  // Intento 1: buscar en español (incluye nombre del país para evitar ambigüedades)
  const queryEs = `${lugar.nombre} ${c.pais}`;
  let found: YoutubeVideo | null = null;

  try {
    found = await searchVideo(queryEs, 'es');
    if (found) {
      console.log(`${tag} — encontrado en YouTube ES (${found.videoId})`);
    } else {
      // Intento 2: buscar en inglés
      let queryEn = lugar.nombre_en;

      if (!queryEn) {
        queryEn = await translatePlaceName(lugar.nombre) ?? undefined;
        if (queryEn) {
          await Country.updateOne(
            { codigo_iso: c.codigo_iso, 'lugares_turisticos.nombre': lugar.nombre },
            { $set: { 'lugares_turisticos.$.nombre_en': queryEn } },
          );
        }
      }

      if (queryEn) {
        found = await searchVideo(`${queryEn} ${c.pais}`, 'en');
        if (found) {
          console.log(`${tag} — encontrado en YouTube EN (${found.videoId})`);
        } else {
          console.warn(`${tag} — YouTube no encontró nada ni en ES ni en EN`);
        }
      } else {
        console.warn(`${tag} — YouTube no encontró nada en ES y no hay traducción al EN`);
      }
    }
  } catch (err) {
    if (err instanceof YouTubeQuotaError) {
      // Quota agotada: no guardar null ni gastar intentos, reintentar mañana
      return null;
    }
    throw err;
  }

  // Persistir resultado en DB e incrementar contador de intentos
  await Country.updateOne(
    { codigo_iso: c.codigo_iso, 'lugares_turisticos.nombre': lugar.nombre },
    {
      $set: {
        'lugares_turisticos.$.video_id': found?.videoId ?? null,
        'lugares_turisticos.$.video_title': found?.title ?? '',
        'lugares_turisticos.$.video_thumbnail': found?.thumbnail ?? '',
        'lugares_turisticos.$.video_search_attempts': attempts + 1,
      },
    },
  );

  return found;
}

async function fetchMedia(c: ICountry): Promise<{ images: CountryMedia[][]; videos: CountryMedia[] }> {
  const sitios = c.lugares_turisticos.slice(0, 3);
  const queries = sitios.map((l) => l.nombre_en ?? l.nombre);

  const [pexelsResults, videoResults] = await Promise.all([
    searchImagesPerPlace(queries, 3),
    Promise.all(sitios.map((_, i) => resolveVideo(c, i))),
  ]);

  return {
    images: sitios.map((l, i) =>
      (pexelsResults[i] ?? []).map((img) => ({ src: img.url, alt: img.alt || l.nombre }))
    ),
    videos: sitios.map((l, i) => {
      const found = videoResults[i];
      return {
        src: found ? `https://www.youtube.com/embed/${found.videoId}` : '',
        alt: found?.title ?? l.nombre,
        thumbnail: found?.thumbnail ?? '',
      };
    }),
  };
}

export function clearCountryCache(iso: string) {
  mediaCache.delete(iso.toUpperCase());
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
