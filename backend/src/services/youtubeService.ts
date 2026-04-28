const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

export interface YoutubeVideo {
  videoId: string;
  thumbnail: string;
  title: string;
}

export async function searchVideo(query: string, lang = 'es'): Promise<YoutubeVideo | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.warn('[Video] YOUTUBE_API_KEY no definida');
    return null;
  }

  const prefix = lang === 'es' ? 'viajando a' : 'visiting';
  const fullQuery = `${prefix} ${query}`;

  const params = new URLSearchParams({
    key: apiKey,
    q: fullQuery,
    part: 'snippet',
    type: 'video',
    maxResults: '1',
    safeSearch: 'strict',
    videoEmbeddable: 'true',
    relevanceLanguage: lang,
  });

  let res: Response;
  try {
    res = await fetch(`${YOUTUBE_API_URL}?${params}`);
  } catch (err) {
    console.warn(`YouTube: no se pudo conectar para query "${query}":`, err);
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    console.warn(`[Video] YouTube API error ${res.status} para query: "${fullQuery}"\n${body}`);
    return null;
  }

  const data = await res.json() as {
    items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        thumbnails: { high?: { url: string }; default?: { url: string } };
      };
    }>;
  };

  const item = data.items?.[0];
  if (!item) {
    console.warn(`[Video] YouTube devolvió vacío para query: "${fullQuery}"`);
    return null;
  }

  return {
    videoId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? '',
  };
}

export async function searchVideos(queries: string[]): Promise<(YoutubeVideo | null)[]> {
  return Promise.all(queries.map((q) => searchVideo(q)));
}
