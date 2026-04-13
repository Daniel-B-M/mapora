const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export interface CountryDTO {
  codigoIso: string;
  nombre: string;
  infoGeneral: string[];
  lugaresTuristicos: string[];
  images: { src: string; alt: string }[];
  videos: { src: string; alt: string; thumbnail: string }[];
}

/** Caché de países completos (con media) ya fetched */
const fullCache = new Map<string, CountryDTO>();

/** Mapa directo meshName → ISO. Los mesh names están en español (minúsculas). */
const MESH_TO_ISO: Record<string, string> = {
  'namibia': 'NA', 'esuatini': 'SZ', 'botsuana': 'BW', 'sudáfrica': 'ZA',
  'angola': 'AO', 'zambia': 'ZM', 'tanzania': 'TZ', 'kenia': 'KE',
  'marruecos': 'MA', 'túnez': 'TN', 'argelia': 'DZ', 'libia': 'LY',
  'cabo verde': 'CV', 'gambia': 'GM', 'senegal': 'SN', 'camerún': 'CM',
  'nigeria': 'NG', 'ghana': 'GH', 'togo': 'TG', 'guinea ecuatorial': 'GQ',
  'liberia': 'LR', 'costa de marfil': 'CI', 'sierra leona': 'SL',
  'guinea': 'GN', 'guinea-bisáu': 'GW', 'mauritania': 'MR', 'malí': 'ML',
  'burkina faso': 'BF', 'níger': 'NE', 'chad': 'TD', 'egipto': 'EG',
  'santo tomé y príncipe': 'ST', 'benín': 'BJ', 'gabón': 'GA',
  'república centroafricana': 'CF', 'etiopía': 'ET', 'sudán': 'SD',
  'sudán del sur': 'SS', 'israel': 'IL', 'nepal': 'NP', 'india': 'IN',
  'mongolia': 'MN', 'palestina': 'PS', 'afganistán': 'AF', 'turquía': 'TR',
  'chipre': 'CY', 'corea del norte': 'KP', 'pakistán': 'PK',
  'sri lanka': 'LK', 'bután': 'BT', 'myanmar': 'MM', 'camboya': 'KH',
  'bangladés': 'BD', 'tailandia': 'TH', 'república checa': 'CZ',
  'san marino': 'SM', 'italia': 'IT', 'montenegro': 'ME',
  'liechtenstein': 'LI', 'eslovenia': 'SI', 'alemania': 'DE',
  'austria': 'AT', 'portugal': 'PT', 'bélgica': 'BE', 'luxemburgo': 'LU',
  'serbia': 'RS', 'hungría': 'HU', 'albania': 'AL',
  'macedonia del norte': 'MK', 'rumanía': 'RO', 'lituania': 'LT',
  'islas åland': 'AX', 'letonia': 'LV', 'suiza': 'CH',
  'países bajos': 'NL', 'finlandia': 'FI', 'yemen': 'YE', 'qatar': 'QA',
  'arabia saudita': 'SA', 'singapur': 'SG', 'malasia': 'MY',
  'jordania': 'JO', 'baréin': 'BH', 'francia': 'FR', 'guatemala': 'GT',
  'nicaragua': 'NI', 'méxico': 'MX', 'belice': 'BZ', 'el salvador': 'SV',
  'haití': 'HT', 'república dominicana': 'DO', 'costa rica': 'CR',
  'honduras': 'HN', 'cuba': 'CU', 'groenlandia': 'GL', 'canadá': 'CA',
  'estados unidos': 'US', 'gibraltar': 'GI', 'mónaco': 'MC', 'malta': 'MT',
  'islandia': 'IS', 'islas feroe': 'FO', 'irlanda': 'IE',
  'reino unido': 'GB', 'dinamarca': 'DK', 'suecia': 'SE', 'estonia': 'EE',
  'ruanda': 'RW', 'república democrática del congo': 'CD', 'congo': 'CG',
  'turkmenistán': 'TM', 'noruega': 'NO', 'japón': 'JP', 'china': 'CN',
  'brunéi': 'BN', 'timor oriental': 'TL', 'maldivas': 'MV',
  'mozambique': 'MZ', 'yibuti': 'DJ', 'papúa nueva guinea': 'PG',
  'australia': 'AU', 'nueva zelanda': 'NZ', 'nueva caledonia': 'NC',
  'azerbaiyán': 'AZ', 'kuwait': 'KW', 'rusia': 'RU', 'uganda': 'UG',
  'zimbabue': 'ZW', 'burundi': 'BI', 'malaui': 'MW', 'tayikistán': 'TJ',
  'bahamas': 'BS', 'panamá': 'PA', 'líbano': 'LB', 'siria': 'SY',
  'irán': 'IR', 'emiratos árabes unidos': 'AE', 'vaticano': 'VA',
  'croacia': 'HR', 'bosnia y herzegovina': 'BA',
  // Latinoamérica
  'brasil': 'BR', 'uruguay': 'UY', 'argentina': 'AR', 'chile': 'CL',
  'paraguay': 'PY', 'colombia': 'CO', 'bolivia': 'BO', 'perú': 'PE',
  'venezuela': 'VE', 'surinam': 'SR', 'guyana': 'GY',
  'guayana francesa': 'GF', 'ecuador': 'EC',
  // Territorios con datos en DB
  'akrotiri': 'XU',
};

/**
 * Busca un país completo (con imágenes y videos) por mesh name.
 * Usa el mapa ISO directo y cachea el resultado.
 */
export async function getCountryByMeshName(meshName: string): Promise<CountryDTO | null> {
  const iso = MESH_TO_ISO[meshName.toLowerCase()];
  if (!iso) return null;

  if (fullCache.has(iso)) return fullCache.get(iso)!;

  const res = await fetch(`${API_BASE}/api/countries/${iso}`);
  if (!res.ok) return null;

  const data: CountryDTO = await res.json();
  fullCache.set(iso, data);
  return data;
}
