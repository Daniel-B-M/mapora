const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

export interface PexelsImage {
  url: string;
  alt: string;
}

/**
 * Busca una imagen en Pexels para la query dada.
 * Retorna la URL de la foto en tamaño large2x, o null si no hay resultados.
 */
export async function searchImage(query: string): Promise<PexelsImage | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn('PEXELS_API_KEY no definida');
    return null;
  }

  const url = `${PEXELS_API_URL}?query=${encodeURIComponent(query)}&per_page=1&locale=es-ES`;

  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: apiKey } });
  } catch (err) {
    console.warn(`Pexels: no se pudo conectar para query "${query}":`, err);
    return null;
  }

  if (!res.ok) {
    console.warn(`Pexels error ${res.status} para query: ${query}`);
    return null;
  }

  const data = await res.json() as {
    photos: Array<{ src: { large2x: string }; alt: string }>;
  };

  const photo = data.photos[0];
  if (!photo) return null;

  return {
    url: photo.src.large2x,
    alt: photo.alt || query,
  };
}

/**
 * Busca imágenes para una lista de queries en paralelo.
 * Las queries sin resultado retornan null en su posición.
 */
export async function searchImages(queries: string[]): Promise<(PexelsImage | null)[]> {
  return Promise.all(queries.map((q) => searchImage(q)));
}
