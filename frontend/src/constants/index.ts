export const MAPA_MUNDI_MODEL_PATH = '/mapaMundi.glb';

// En dev, el backend corre aparte (localhost:3000). En producción, frontend y
// backend se sirven bajo el mismo dominio (ver vercel.json → services), así
// que las llamadas deben ser relativas salvo que VITE_API_URL diga lo contrario.
export const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '');
