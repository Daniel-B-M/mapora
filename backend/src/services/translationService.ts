/**
 * Traduce un nombre de lugar turístico al inglés usando MyMemory (gratis, sin API key).
 * Límite: 5000 palabras/día por IP — más que suficiente para este uso.
 */
export async function translatePlaceName(name: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(name)}&langpair=es|en`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json() as {
      responseStatus: number;
      responseData: { translatedText: string };
    };

    if (data.responseStatus !== 200) return null;

    const translated = data.responseData.translatedText.trim();
    return translated || null;
  } catch (err) {
    console.warn(`[Translation] Error traduciendo "${name}":`, err);
    return null;
  }
}
