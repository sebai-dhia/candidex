import { buildRegexResult, parseRegionLines } from './shared-patterns.js';

const ARABIC_WORK_TYPE = /(عن\s*بُعد|عن\s*بعد|هجين|في\s*الموقع|عمل\s*عن\s*بُعد)/;

export const arabicRegexProvider = {
  id: 'ar',
  extract(regionText) {
    const lines = parseRegionLines(regionText);
    const match = regionText.match(ARABIC_WORK_TYPE);
    let workType = null;
    if (match?.[1]) {
      const token = match[1];
      if (/هجين/.test(token)) workType = 'Hybrid';
      else if (/عن/.test(token)) workType = 'Remote';
      else if (/الموقع/.test(token)) workType = 'On-site';
    }

    return buildRegexResult({
      role: lines[0] || null,
      company: lines[1] || null,
      country: lines[2] || null,
      workType,
      source: 'regex-ar',
      confidenceBoost: match ? 0.3 : 0.15
    });
  }
};