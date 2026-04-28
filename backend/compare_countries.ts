import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '.env') });

const CountrySchema = new mongoose.Schema(
  {
    pais: { type: String, required: true },
    codigo_iso: { type: String, required: true },
  },
  { collection: 'latam' },
);

const Country = mongoose.model('Country', CountrySchema);

const MESH_TO_ISO: Record<string, string> = {
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
  'guatemala': 'GT', 'nicaragua': 'NI', 'méxico': 'MX',
  'belice': 'BZ', 'el salvador': 'SV', 'haití': 'HT',
  'república dominicana': 'DO', 'costa rica': 'CR', 'honduras': 'HN',
  'cuba': 'CU', 'groenlandia': 'GL', 'canadá': 'CA',
  'estados unidos': 'US', 'bahamas': 'BS', 'panamá': 'PA',
  'jamaica': 'JM', 'puerto rico': 'PR',
  'papua nueva guinea': 'PG', 'australia': 'AU', 'nueva zelanda': 'NZ',
  'nueva caledonia': 'NC', 'fiyi': 'FJ', 'islas salomon': 'SB',
  'brasil': 'BR', 'uruguay': 'UY', 'argentina': 'AR',
  'chile': 'CL', 'paraguay': 'PY', 'colombia': 'CO',
  'bolivia': 'BO', 'perú': 'PE', 'venezuela': 'VE',
  'surinam': 'SR', 'guyana': 'GY', 'guayana francesa': 'GF',
  'ecuador': 'EC',
};

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('No MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to DB');

  const dbCountries = await Country.find({}).lean();
  console.log(`Found ${dbCountries.length} countries in DB`);

  const glbIsos = Object.values(MESH_TO_ISO).map(iso => iso.toUpperCase());
  const dbIsos = dbCountries.map(c => c.codigo_iso.toUpperCase());

  // Countries in DB that are not in GLB
  const dbNotGlb = dbCountries.filter(c => !glbIsos.includes(c.codigo_iso.toUpperCase()));
  
  // Countries in GLB that are not in DB
  const glbNotDbSet = new Set<string>();
  Object.entries(MESH_TO_ISO).forEach(([name, iso]) => {
    if (!dbIsos.includes(iso.toUpperCase())) {
      glbNotDbSet.add(`${name} (${iso})`);
    }
  });

  console.log('\\n--- Paises en DB pero NO en GLB (sobran en DB) ---');
  if (dbNotGlb.length === 0) {
    console.log('Ninguno');
  } else {
    dbNotGlb.forEach(c => console.log(`- ${c.pais} (${c.codigo_iso})`));
  }

  console.log('\\n--- Paises en GLB pero NO en DB (faltan en DB) ---');
  if (glbNotDbSet.size === 0) {
    console.log('Ninguno');
  } else {
    glbNotDbSet.forEach(item => console.log(`- ${item}`));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
