const VIMEO_API_URL = 'https://api.vimeo.com/videos';

export interface VimeoVideo {
  videoId: string;
  thumbnail: string;
  title: string;
}

export async function searchVideo(query: string): Promise<VimeoVideo | null> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    console.warn('VIMEO_ACCESS_TOKEN no definida');
    return null;
  }

  const params = new URLSearchParams({
    query,
    per_page: '1',
    sort: 'relevant',
    filter: 'embeddable',
    filter_embeddable: 'true',
    fields: 'uri,name,pictures',
  });

  let res: Response;
  try {
    res = await fetch(`${VIMEO_API_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
      },
    });
  } catch (err) {
    console.warn(`Vimeo: no se pudo conectar para query "${query}":`, err);
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    console.warn(`Vimeo error ${res.status} para query: ${query}\n${body}`);
    return null;
  }

  const data = await res.json() as {
    data: Array<{
      uri: string;
      name: string;
      pictures: { sizes: Array<{ width: number; link: string }> };
    }>;
  };

  const video = data.data?.[0];
  if (!video) return null;

  const videoId = video.uri.replace('/videos/', '');

  // Thumbnail de mayor resolución disponible
  const sizes = video.pictures?.sizes ?? [];
  const thumbnail = sizes[sizes.length - 1]?.link ?? '';

  return { videoId, thumbnail, title: video.name };
}

export async function searchVideos(queries: string[]): Promise<(VimeoVideo | null)[]> {
  return Promise.all(queries.map((q) => searchVideo(q)));
}
