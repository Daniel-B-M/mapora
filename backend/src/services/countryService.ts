import { Country, type ICountry } from '../models/Country';
import { searchImagesPerPlace } from './pexelsService';
import { searchVideo, searchVideos, type VimeoVideo } from './vimeoService';
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
  const queries = sitios.map((l) => l.nombre_en ?? l.nombre);

  const [pexelsResults, vimeoResults] = await Promise.all([
    searchImagesPerPlace(queries, 3),
    searchVideos(queries),
  ]);

  // Para los sitios sin video, intentar traducir y reintentar en background
  const finalVideos: (VimeoVideo | null)[] = [...vimeoResults];
  const translationPromises = sitios.map(async (l, i) => {
    if (finalVideos[i] !== null) return; // ya tiene video, nada que hacer
    if (l.nombre_en) return; // ya tiene nombre en inglés pero Vimeo no encontró nada

    const nombreEn = await translatePlaceName(l.nombre);
    if (!nombreEn) return;

    // Guardar nombre_en siempre — aunque Vimeo no encuentre nada, evita retraducciones
    await Country.updateOne(
      { codigo_iso: c.codigo_iso, 'lugares_turisticos.nombre': l.nombre },
      { $set: { 'lugares_turisticos.$.nombre_en': nombreEn } },
    );

    const retried = await searchVideo(nombreEn);
    if (retried) {
      finalVideos[i] = retried;
      console.log(`[AutoTranslate] "${l.nombre}" → "${nombreEn}" encontró video (${c.codigo_iso})`);
    } else {
      console.log(`[AutoTranslate] "${l.nombre}" → "${nombreEn}" sin video en Vimeo (${c.codigo_iso})`);
    }
  });

  await Promise.all(translationPromises);

  return {
    images: sitios.flatMap((l, i) =>
      (pexelsResults[i] ?? []).map((img) => ({ src: img.url, alt: img.alt || l.nombre }))
    ),
    videos: sitios.map((l, i) => {
      const found = finalVideos[i];
      return {
        src: found ? `https://player.vimeo.com/video/${found.videoId}` : '',
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
