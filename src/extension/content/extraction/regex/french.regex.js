import { extractWorkTypeFromText } from '../../../shared/normalize-result.js';
import { buildRegexResult, parseRegionLines, splitCompanyAndCountry } from './shared-patterns.js';

const LOCATION_HINT = /\b(Tunisie|Tunisia|France|Remote|Hybrid|Hybride|On-?site|Tunis|Paris|Ariana|Nabeul|Sfax|Sousse)\b/i;
const FRENCH_SIGNAL = /mode\s+de\s+travail|hybride|t[ée]l[ée]travail|pr[ée]s(?:entiel)?|type\s+d.?emploi/i;

export const frenchRegexProvider = {
  id: 'fr',
  extract(regionText) {
    const lines = parseRegionLines(regionText);
    const workType = extractWorkTypeFromText(regionText);
    const { company, country } = splitCompanyAndCountry(
      lines[1] || '',
      lines[2] || '',
      LOCATION_HINT
    );

    return buildRegexResult({
      role: lines[0] || null,
      company: company || null,
      country: country || null,
      workType,
      source: 'regex-fr',
      confidenceBoost: FRENCH_SIGNAL.test(regionText) ? 0.35 : 0.2
    });
  }
};