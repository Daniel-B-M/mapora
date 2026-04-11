const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

export interface PexelsImage {
  url: string;
  alt: string;
}

/**
 * Busca N imágenes en Pexels para una query dada.
 * Retorna un array de hasta `count` resultados.
 */
export async function searchImagesForPlace(query: string, count = 3): Promise<PexelsImage[]> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('PEXELS_API_KEY no definida');
    return [];
  }

  const url = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=${count}&locale=es-ES`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: apiKey } });
  } catch (err) {
    console.warn(`Pexels: no se pudo conectar para query "${query}":`, err);
    return [];
  }

  if (!res.ok) {
    console.warn(`Pexels error ${res.status} para query: ${query}`);
    return [];
  }

  const data = await res.json() as {
    photos: Array<{ src: { large2x: string }; alt: string }>;
  };

  return data.photos.map((p) => ({ url: p.src.large2x, alt: p.alt || query }));
}

/**
 * Busca N imágenes para cada query en paralelo.
 * Retorna un array de arrays, uno por query.
 */
export async function searchImagesPerPlace(queries: string[], count = 3): Promise<PexelsImage[][]> {
  return Promise.all(queries.map((q) => searchImagesForPlace(q, count)));
}
