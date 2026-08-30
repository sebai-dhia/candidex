import { emptyResult, mergeExtractionResults } from '../../../shared/normalize-result.js';
import { arabicRegexProvider } from './arabic.regex.js';
import { chineseRegexProvider } from './chinese.regex.js';
import { englishRegexProvider } from './english.regex.js';
import { frenchRegexProvider } from './french.regex.js';

const REGISTRY = [
  englishRegexProvider,
  frenchRegexProvider,
  arabicRegexProvider,
  chineseRegexProvider,
];

/**
 * Run all language regex providers and merge highest-confidence per field.
 * @param {{ regionText?: string }} context
 */
export function extractWithRegexPipeline(context) {
  const regionText = context?.regionText || '';
  return REGISTRY.map((provider) => provider.extract(regionText)).reduce(
    (accumulator, result) => mergeExtractionResults(accumulator, result),
    emptyResult('regex'),
  );
}

export { REGISTRY };
