const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface CountryDTO {
  codigoIso: string;
  nombre: string;
  infoGeneral: string[];
  lugaresTuristicos: string[];
  images: { src: string; alt: string }[][];
  videos: { src: string; alt: string; thumbnail: string }[];
}

/** Caché de países completos (con media) ya fetched */
const fullCache = new Map<string, CountryDTO>();

/** Mapa directo meshName → ISO. Los mesh names están en español (minúsculas).
 *  IMPORTANTE: Three.js emite mesh.name desde el NODE name del GLB, no desde el
 *  mesh geometry name. Los node names nunca tienen sufijo .001 aunque el mesh sí lo tenga.
 *  Fuente de verdad: node names de frontend/public/mapaMundi.glb.
 *  Los nombres del GLB deben coincidir exactamente con las keys de este mapa.
 */
const MESH_TO_ISO: Record<string, string> = {
  // ── África ────────────────────────────────────────────────
  'namibia': 'NA', 'esuatini': 'SZ', 'botsuana': 'BW',
  'sudáfrica': 'ZA', 'angola': 'AO', 'zambia': 'ZM',
  'tanzania': 'TZ', 'kenia': 'KE', 'marruecos': 'MA',
  'túnez': 'TN', 'argelia': 'DZ', 'libia': 'LY',
  'cabo verde': 'CV', 'gambia': 'GM', 'senegal': 'SN',
  'camerun': 'CM', 'nigeria': 'NG', 'ghana': 'GH',
  'togo': 'TG', 'guinea.ecuatorial': 'GQ', 'liberia': 'LR',
  'costa de marfil': 'CI', 'sierra leona': 'SL', 'guinea': 'GN',
  'guinea bisau': 'GW', 'mauritania': 'MR', 'malí': 'ML',
  'burkina faso': 'BF', 'níger': 'NE', 'chad': 'TD',
  'egipto': 'EG', 'santo tomé y príncipe': 'ST', 'benin': 'BJ',
  'gabon': 'GA', 'republica centroafricana': 'CF', 'etiopia': 'ET',
  'sudan': 'SD', 'sudán del sur': 'SS', 'ruanda': 'RW',
  'rd del congo': 'CD', 'congo': 'CG', 'uganda': 'UG',
  'zimbabue': 'ZW', 'burundi': 'BI', 'malaui': 'MW',
  'mozanbique': 'MZ', 'yibuti': 'DJ', 'eritrea': 'ER',
  'somalia': 'SO', 'madagascar': 'MG', 'zahara occidental': 'EH',

  // ── Asia ──────────────────────────────────────────────────
  'israel': 'IL', 'nepal': 'NP', 'india': 'IN',
  'mongolia': 'MN', 'palestina': 'PS', 'afganistán': 'AF',
  'turquia': 'TR', 'chipre': 'CY', 'corea del norte': 'KP',
  'corea del sur': 'KR', 'pakistan': 'PK', 'sri lanka': 'LK',
  'bután': 'BT', 'birmania': 'MM', 'camboya': 'KH',
  'bangladesh': 'BD', 'tailandia': 'TH', 'japón': 'JP',
  'china': 'CN', 'brunei': 'BN', 'timor oriental': 'TL',
  'maldivas': 'MV', 'azerbaiyan': 'AZ', 'kuwait': 'KW',
  'tayikistán': 'TJ', 'turmekistan': 'TM', 'libano': 'LB',
  'siria': 'SY', 'iran': 'IR', 'jordania': 'JO',
  'baréin': 'BH', 'catar': 'QA', 'arabia saudita': 'SA',
  'singapur': 'SG', 'malasia': 'MY', 'yemen': 'YE',
  'emiratos arabes unidos': 'AE', 'irak': 'IQ', 'oman': 'OM',
  'armenia': 'AM', 'georgia': 'GE', 'kazajistan': 'KZ',
  'uzbekistan': 'UZ', 'kirguistán': 'KG', 'laos': 'LA',
  'vietnam': 'VN', 'filipinas': 'PH', 'indonesia': 'ID',
  'aksai chin': 'CN', 'cisjordania': 'PS',

  // ── Europa ────────────────────────────────────────────────
  'chequia': 'CZ', 'san marino': 'SM', 'italia': 'IT',
  'montenegro': 'ME', 'liechtenstein': 'LI', 'eslovenia': 'SI',
  'alemania': 'DE', 'austria': 'AT', 'portugal': 'PT',
  'belgica': 'BE', 'luxemburgo': 'LU', 'serbia': 'RS',
  'hungria': 'HU', 'albania': 'AL', 'macedonia del norte': 'MK',
  'rumania': 'RO', 'lituania': 'LT', 'letonia': 'LV',
  'suiza': 'CH', 'paises bajos': 'NL', 'finlandia': 'FI',
  'francia': 'FR', 'gibraltar': 'GI', 'mónaco': 'MC',
  'malta': 'MT', 'islandia': 'IS', 'irlanda': 'IE',
  'reino unido': 'GB', 'dinamarca': 'DK', 'suecia': 'SE',
  'estonia': 'EE', 'noruega': 'NO', 'rusia': 'RU',
  'vaticano': 'VA', 'croacia': 'HR', 'bosnia y herzegovia': 'BA',
  'bielorrusia': 'BY', 'espana': 'ES', 'grecia': 'GR',
  'bulgaria': 'BG', 'eslovaquia': 'SK', 'polonia': 'PL',
  'ucrania': 'UA', 'moldavia': 'MD',

  // ── América del Norte y Central ───────────────────────────
  'guatemala': 'GT', 'nicaragua': 'NI', 'méxico': 'MX',
  'belice': 'BZ', 'el salvador': 'SV', 'haití': 'HT',
  'república dominicana': 'DO', 'costa rica': 'CR', 'honduras': 'HN',
  'cuba': 'CU', 'groenlandia': 'GL', 'canadá': 'CA',
  'estados unidos': 'US', 'bahamas': 'BS', 'panamá': 'PA',
  'jamaica': 'JM', 'puerto rico': 'PR',

  // ── Oceanía ───────────────────────────────────────────────
  'papua nueva guinea': 'PG', 'australia': 'AU', 'nueva zelanda': 'NZ',
  'nueva caledonia': 'NC', 'fiyi': 'FJ', 'islas salomon': 'SB',

  // ── Latinoamérica ─────────────────────────────────────────
  'brasil': 'BR', 'uruguay': 'UY', 'argentina': 'AR',
  'chile': 'CL', 'paraguay': 'PY', 'colombia': 'CO',
  'bolivia': 'BO', 'perú': 'PE', 'venezuela': 'VE',
  'surinam': 'SR', 'guyana': 'GY', 'guayana francesa': 'GF',
  'ecuador': 'EC',
};

/**
 * Busca un país completo (con imágenes y videos) por mesh name.
 * Usa el mapa ISO directo y cachea el resultado.
 */
export async function getCountryByMeshName(meshName: string): Promise<CountryDTO | null> {
  const iso = MESH_TO_ISO[meshName.toLowerCase().replace(/_/g, ' ')];
  if (!iso) return null;

  if (fullCache.has(iso)) return fullCache.get(iso)!;

  const res = await fetch(`${API_BASE}/api/countries/${iso}`);
  if (!res.ok) return null;

  const data: CountryDTO = await res.json();
  fullCache.set(iso, data);
  return data;
}
