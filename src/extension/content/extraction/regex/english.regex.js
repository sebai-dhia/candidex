import { extractWorkTypeFromText } from '../../../shared/normalize-result.js';
import { buildRegexResult, parseRegionLines, splitCompanyAndCountry } from './shared-patterns.js';

const LOCATION_HINT = /\b(Tunisie|Tunisia|France|Remote|Hybrid|Hybride|On-?site|London|Paris|Tunis|Ariana)\b/i;
const WORK_TYPE_PATTERN = /\b(Remote|Hybrid|On-site|On site|Work type|Work mode)\b/i;

export const englishRegexProvider = {
  id: 'en',
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
      source: 'regex-en',
      confidenceBoost: WORK_TYPE_PATTERN.test(regionText) ? 0.3 : 0.25
    });
  }
};