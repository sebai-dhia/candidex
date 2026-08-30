export const COMPANY_LOCATION_SPLIT = /^(.+?)\s*[-–—]\s*(.+)$/;

export function parseRegionLines(text) {
  return (text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 2);
}

export function splitCompanyAndCountry(line, nextLine, locationHint) {
  let company = line;
  let country = null;

  const split = line.match(COMPANY_LOCATION_SPLIT);
  if (split?.[1] && split?.[2]) {
    company = split[1].trim();
    country = split[2].trim();
  } else if (/[-–—]\s*$/.test(line)) {
    company = line.replace(/\s*[-–—]\s*$/, '').trim();
    if (nextLine && locationHint.test(nextLine)) {
      country = nextLine;
    }
  }

  if (!country && nextLine && locationHint.test(nextLine)) {
    country = nextLine;
  }

  return { company, country };
}

export function buildRegexResult({ role, company, country, workType, source, confidenceBoost = 0.25 }) {
  return {
    company,
    role,
    country,
    workType,
    confidence: {
      company: company ? confidenceBoost : 0,
      role: role ? confidenceBoost : 0,
      country: country ? confidenceBoost : 0,
      workType: workType ? 0.8 : 0,
    },
    source
  };
}