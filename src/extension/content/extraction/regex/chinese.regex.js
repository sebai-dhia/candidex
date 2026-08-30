import { buildRegexResult, parseRegionLines } from './shared-patterns.js';

const CHINESE_WORK_TYPE = /(远程|混合|现场|居家办公|到岗)/;

export const chineseRegexProvider = {
  id: 'zh',
  extract(regionText) {
    const lines = parseRegionLines(regionText);
    const match = regionText.match(CHINESE_WORK_TYPE);
    let workType = null;
    if (match?.[1]) {
      const token = match[1];
      if (token === '远程' || token === '居家办公') workType = 'Remote';
      else if (token === '混合') workType = 'Hybrid';
      else workType = 'On-site';
    }

    return buildRegexResult({
      role: lines[0] || null,
      company: lines[1] || null,
      country: lines[2] || null,
      workType,
      source: 'regex-zh',
      confidenceBoost: match ? 0.3 : 0.15
    });
  }
};