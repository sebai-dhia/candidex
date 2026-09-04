/**
 * Country / location normalization shared by extension + Angular.
 * Identity = ISO 3166-1 alpha-2; display names are locale-specific elsewhere.
 */

/** @type {Record<string, string>} ISO → English canonical name */
export const CODE_TO_ENGLISH = {
  TN: 'Tunisia',
  MA: 'Morocco',
  DZ: 'Algeria',
  EG: 'Egypt',
  LY: 'Libya',
  SD: 'Sudan',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  KW: 'Kuwait',
  BH: 'Bahrain',
  OM: 'Oman',
  YE: 'Yemen',
  JO: 'Jordan',
  LB: 'Lebanon',
  SY: 'Syria',
  IQ: 'Iraq',
  PS: 'Palestine',
  IR: 'Iran',
  TR: 'Turkey',
  FR: 'France',
  DE: 'Germany',
  GB: 'United Kingdom',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IE: 'Ireland',
  PL: 'Poland',
  CZ: 'Czechia',
  RO: 'Romania',
  GR: 'Greece',
  HU: 'Hungary',
  HR: 'Croatia',
  BG: 'Bulgaria',
  SK: 'Slovakia',
  SI: 'Slovenia',
  LT: 'Lithuania',
  LV: 'Latvia',
  EE: 'Estonia',
  LU: 'Luxembourg',
  MT: 'Malta',
  IS: 'Iceland',
  RS: 'Serbia',
  UA: 'Ukraine',
  RU: 'Russia',
  BY: 'Belarus',
  MD: 'Moldova',
  AL: 'Albania',
  MK: 'North Macedonia',
  ME: 'Montenegro',
  BA: 'Bosnia and Herzegovina',
  XK: 'Kosovo',
  CY: 'Cyprus',
  MC: 'Monaco',
  LI: 'Liechtenstein',
  AD: 'Andorra',
  SM: 'San Marino',
  VA: 'Vatican City',
  GE: 'Georgia',
  AM: 'Armenia',
  AZ: 'Azerbaijan',
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  VE: 'Venezuela',
  EC: 'Ecuador',
  BO: 'Bolivia',
  PY: 'Paraguay',
  UY: 'Uruguay',
  GY: 'Guyana',
  SR: 'Suriname',
  PA: 'Panama',
  CR: 'Costa Rica',
  NI: 'Nicaragua',
  HN: 'Honduras',
  SV: 'El Salvador',
  GT: 'Guatemala',
  BZ: 'Belize',
  CU: 'Cuba',
  JM: 'Jamaica',
  HT: 'Haiti',
  DO: 'Dominican Republic',
  TT: 'Trinidad and Tobago',
  BS: 'Bahamas',
  BB: 'Barbados',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  KP: 'North Korea',
  IN: 'India',
  PK: 'Pakistan',
  AF: 'Afghanistan',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  TW: 'Taiwan',
  HK: 'Hong Kong',
  MO: 'Macau',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  NP: 'Nepal',
  BT: 'Bhutan',
  MM: 'Myanmar',
  KH: 'Cambodia',
  LA: 'Laos',
  MN: 'Mongolia',
  KZ: 'Kazakhstan',
  UZ: 'Uzbekistan',
  TM: 'Turkmenistan',
  TJ: 'Tajikistan',
  KG: 'Kyrgyzstan',
  MV: 'Maldives',
  BN: 'Brunei',
  TL: 'Timor-Leste',
  AU: 'Australia',
  NZ: 'New Zealand',
  FJ: 'Fiji',
  PG: 'Papua New Guinea',
  WS: 'Samoa',
  TO: 'Tonga',
  VU: 'Vanuatu',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',
  GH: 'Ghana',
  ET: 'Ethiopia',
  TZ: 'Tanzania',
  SN: 'Senegal',
  CI: "Cote d'Ivoire",
  UG: 'Uganda',
  CM: 'Cameroon',
  ZW: 'Zimbabwe',
  ZM: 'Zambia',
  MZ: 'Mozambique',
  AO: 'Angola',
  BW: 'Botswana',
  NA: 'Namibia',
  ML: 'Mali',
  NE: 'Niger',
  TD: 'Chad',
  BF: 'Burkina Faso',
  GN: 'Guinea',
  BJ: 'Benin',
  TG: 'Togo',
  RW: 'Rwanda',
  BI: 'Burundi',
  SO: 'Somalia',
  ER: 'Eritrea',
  DJ: 'Djibouti',
  SS: 'South Sudan',
  MW: 'Malawi',
  MG: 'Madagascar',
  MU: 'Mauritius',
  GA: 'Gabon',
  CD: 'Democratic Republic of the Congo',
  CG: 'Republic of the Congo',
  LR: 'Liberia',
  SL: 'Sierra Leone',
  GQ: 'Equatorial Guinea',
  GM: 'Gambia',
  GW: 'Guinea-Bissau',
  LS: 'Lesotho',
  SZ: 'Eswatini',
  MR: 'Mauritania',
  CV: 'Cabo Verde',
  KM: 'Comoros',
  SC: 'Seychelles',
  CF: 'Central African Republic'
};

/**
 * Extra multilingual / alternate aliases → ISO (lowercase keys).
 * English names from CODE_TO_ENGLISH are auto-indexed in buildAliasIndex().
 * @type {Record<string, string>}
 */
const EXTRA_ALIASES = {
  tunisie: 'TN',
  تونس: 'TN',
  突尼斯: 'TN',
  maroc: 'MA',
  المغرب: 'MA',
  摩洛哥: 'MA',
  algérie: 'DZ',
  algerie: 'DZ',
  الجزائر: 'DZ',
  阿尔及利亚: 'DZ',
  égypte: 'EG',
  egypte: 'EG',
  مصر: 'EG',
  埃及: 'EG',
  فرنسا: 'FR',
  法国: 'FR',
  allemagne: 'DE',
  deutschland: 'DE',
  ألمانيا: 'DE',
  德国: 'DE',
  uk: 'GB',
  'royaume-uni': 'GB',
  'united kingdom': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  المملكة: 'GB',
  'المملكة المتحدة': 'GB',
  英国: 'GB',
  uae: 'AE',
  'united arab emirates': 'AE',
  'émirats arabes unis': 'AE',
  'emirats arabes unis': 'AE',
  الإمارات: 'AE',
  'الإمارات العربية المتحدة': 'AE',
  阿联酋: 'AE',
  'arabie saoudite': 'SA',
  السعودية: 'SA',
  沙特: 'SA',
  'saudi arabia': 'SA',
  قطر: 'QA',
  卡塔尔: 'QA',
  كندا: 'CA',
  加拿大: 'CA',
  usa: 'US',
  us: 'US',
  'états-unis': 'US',
  'etats-unis': 'US',
  'united states': 'US',
  'united states of america': 'US',
  أمريكا: 'US',
  الولايات: 'US',
  美国: 'US',
  pologne: 'PL',
  بولندا: 'PL',
  波兰: 'PL',
  singapour: 'SG',
  سنغافورة: 'SG',
  新加坡: 'SG',
  ukraine: 'UA',
  أوكرانيا: 'UA',
  乌克兰: 'UA',
  chine: 'CN',
  الصين: 'CN',
  中国: 'CN',
  espagne: 'ES',
  españa: 'ES',
  اسبانيا: 'ES',
  إسبانيا: 'ES',
  西班牙: 'ES',
  italie: 'IT',
  إيطاليا: 'IT',
  意大利: 'IT',
  belgique: 'BE',
  بلجيكا: 'BE',
  比利时: 'BE',
  suisse: 'CH',
  سويسرا: 'CH',
  瑞士: 'CH',
  'pays-bas': 'NL',
  hollande: 'NL',
  هولندا: 'NL',
  荷兰: 'NL',
  turquie: 'TR',
  تركيا: 'TR',
  土耳其: 'TR',
  ouzbékistan: 'UZ',
  ouzbekistan: 'UZ',
  أوزبكستان: 'UZ',
  乌兹别克斯坦: 'UZ',
  "côte d'ivoire": 'CI',
  "cote d'ivoire": 'CI',
  'ivory coast': 'CI',
  'czech republic': 'CZ',
  tchéquie: 'CZ',
  tchequie: 'CZ',
  'congo (drc)': 'CD',
  'dr congo': 'CD',
  australie: 'AU',
  أستراليا: 'AU',
  澳大利亚: 'AU'
};

/** @type {Record<string, string> | null} */
let aliasIndexCache = null;

function buildAliasIndex() {
  if (aliasIndexCache) return aliasIndexCache;

  /** @type {Record<string, string>} */
  const index = {};

  for (const [code, english] of Object.entries(CODE_TO_ENGLISH)) {
    index[english.toLowerCase()] = code;
    index[code.toLowerCase()] = code;
  }

  for (const [alias, code] of Object.entries(EXTRA_ALIASES)) {
    index[alias.toLowerCase()] = code;
  }

  aliasIndexCache = index;
  return index;
}

/**
 * @param {string} text
 */
export function titleCaseWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[\u0600-\u06FF\u4e00-\u9fff]+$/u.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * @param {string} token
 * @returns {string | null}
 */
function lookupCountryToken(token) {
  const key = String(token || '')
    .trim()
    .toLowerCase()
    .replace(/\./g, '');
  if (!key) return null;

  const index = buildAliasIndex();
  if (index[key]) return index[key];

  // ISO alpha-2
  if (/^[a-z]{2}$/i.test(key) && CODE_TO_ENGLISH[key.toUpperCase()]) {
    return key.toUpperCase();
  }

  return null;
}

/** Sentinel used when a job is worldwide / work-from-anywhere (not an ISO country). */
export const ANYWHERE_CODE = 'ANYWHERE';

/** Sentinel used when a location string cannot be parsed. */
export const UNKNOWN_CODE = 'UNKNOWN';

const ANYWHERE_EXACT = new Set([
  'anywhere',
  'worldwide',
  'world wide',
  'work from anywhere',
  'wfa',
  'remote',
  'fully remote',
  'full remote',
  'fullremote',
  '100 percent remote',
  'remote only',
  'remoteonly',
  'global',
  'distributed',
  'teletravail',
  'full teletravail',
  'fully teletravail',
  '100 percent teletravail',
  'a distance',
  'partout',
  'monde entier',
  'en remote',
  'عن بعد',
  'عن بُعد',
  'من أي مكان',
  'العمل عن بعد',
  '远程',
  '全球',
  '任意地点',
  '远程办公'
]);

/**
 * Normalize a location string for anywhere / worldwide matching.
 * @param {string | null | undefined} text
 */
function normalizeAnywhereKey(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/%/g, ' percent ')
    .replace(/[-–—,;:/_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True when the location means work-from-anywhere, not a specific country.
 * Whole-string match only — "Remote, France" still parses as France first.
 * @param {string | null | undefined} raw
 */
export function isAnywhereLocation(raw) {
  const key = normalizeAnywhereKey(raw);
  if (!key) return false;
  if (ANYWHERE_EXACT.has(key)) return true;
  return (
    /^(?:fully|full|100 percent)?\s*(?:remote|teletravail)(?:\s+only)?$/.test(key) ||
    /^work from anywhere$/.test(key) ||
    /^(?:worldwide|world wide)(?:\s+remote)?$/.test(key) ||
    /^(?:remote|teletravail)\s+(?:worldwide|world wide|anywhere)$/.test(key)
  );
}

function isRemoteWorkType(workType) {
  const key = String(workType || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
  return key === 'remote' || key === 'teletravail';
}

/**
 * Group an application into a country, Anywhere, or Unknown bucket.
 * Remote jobs with a real country stay on that country.
 * @param {string | null | undefined} country
 * @param {string | null | undefined} workType
 * @returns {{ code: string, group: 'country' | 'anywhere' | 'unknown' } | null}
 */
export function classifyLocationGroup(country, workType) {
  const parsed = parseCountryLocation(country);
  if (parsed.countryCode && parsed.countryCode !== ANYWHERE_CODE) {
    return { code: parsed.countryCode, group: 'country' };
  }
  if (parsed.countryCode === ANYWHERE_CODE || isAnywhereLocation(country)) {
    return { code: ANYWHERE_CODE, group: 'anywhere' };
  }

  const empty = !String(country || '').trim() || String(country).trim().toLowerCase() === 'null';
  if (isRemoteWorkType(workType) && empty) {
    return { code: ANYWHERE_CODE, group: 'anywhere' };
  }
  if (!empty) {
    return { code: UNKNOWN_CODE, group: 'unknown' };
  }
  return null;
}

/**
 * Parse a free-text location into ISO country + optional city.
 * @param {string | null | undefined} raw
 * @returns {{ countryCode: string | null, city: string | null, englishName: string | null }}
 */
export function parseCountryLocation(raw) {
  const empty = { countryCode: null, city: null, englishName: null };
  const text = String(raw || '').trim();
  if (!text || text.toLowerCase() === 'null') return empty;

  // Exact alias / ISO / English name
  const direct = lookupCountryToken(text);
  if (direct) {
    return {
      countryCode: direct,
      city: null,
      englishName: CODE_TO_ENGLISH[direct] || null
    };
  }

  // "City, Country"
  if (text.includes(',')) {
    const parts = text
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const countryPart = parts[parts.length - 1];
      const cityPart = parts.slice(0, -1).join(', ');
      const code = lookupCountryToken(countryPart);
      if (code) {
        return {
          countryCode: code,
          city: titleCaseWords(cityPart) || null,
          englishName: CODE_TO_ENGLISH[code] || null
        };
      }
    }
  }

  // "City Country" — last token(s) match a country alias
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    for (let take = Math.min(3, words.length - 1); take >= 1; take -= 1) {
      const countryCandidate = words.slice(-take).join(' ');
      const code = lookupCountryToken(countryCandidate);
      if (code) {
        const cityPart = words.slice(0, -take).join(' ');
        return {
          countryCode: code,
          city: titleCaseWords(cityPart) || null,
          englishName: CODE_TO_ENGLISH[code] || null
        };
      }
    }
  }

  // Contained alias with word boundaries (avoid matching "om" inside "Some…")
  const index = buildAliasIndex();
  const lower = text.toLowerCase();
  /** @type {{ code: string, alias: string }[]} */
  const hits = [];
  for (const [alias, code] of Object.entries(index)) {
    if (alias.length < 3 && !/^[\u0600-\u06FF\u4e00-\u9fff]/u.test(alias)) continue;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[\\s,\\-–—])${escaped}(?:$|[\\s,\\-–—])`, 'i');
    if (pattern.test(` ${lower} `) || lower === alias) {
      hits.push({ code, alias });
    }
  }
  if (hits.length) {
    hits.sort((a, b) => b.alias.length - a.alias.length);
    const { code, alias } = hits[0];
    const cityGuess = text
      .replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '')
      .replace(/[,\-–—]/g, ' ')
      .trim();
    return {
      countryCode: code,
      city: cityGuess ? titleCaseWords(cityGuess) : null,
      englishName: CODE_TO_ENGLISH[code] || null
    };
  }

  if (isAnywhereLocation(text)) {
    return {
      countryCode: ANYWHERE_CODE,
      city: null,
      englishName: 'Anywhere'
    };
  }

  return empty;
}

/**
 * Build a Sheets-friendly location string (English country name).
 * @param {string | null | undefined} raw
 */
export function formatCanonicalCountry(raw) {
  const parsed = parseCountryLocation(raw);
  if (parsed.countryCode === ANYWHERE_CODE) return 'Anywhere';
  if (!parsed.countryCode || !parsed.englishName) {
    const fallback = String(raw || '').trim();
    return fallback || null;
  }
  if (parsed.city) return `${parsed.city}, ${parsed.englishName}`;
  return parsed.englishName;
}

/**
 * @param {string} code
 * @returns {string}
 */
export function codeToFlagEmoji(code) {
  const upper = String(code || '').toUpperCase();
  if (upper === ANYWHERE_CODE) return '🌐';
  if (!/^[A-Z]{2}$/.test(upper)) return '📍';
  const A = 0x1f1e6;
  return String.fromCodePoint(...[...upper].map((ch) => A + ch.charCodeAt(0) - 65));
}