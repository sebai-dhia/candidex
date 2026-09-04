export const EXTRACTION_PROMPT = `You are a strict JSON data extractor for job postings.
Analyze the provided text context and extract the following fields. Return ONLY a valid JSON object. No markdown, no backticks, no extra text.

Rules:
- Detect the language of the input automatically; extract fields regardless of language.
- Prefer the most likely company name visible in the text near the job title or breadcrumb.
- Do not discard short uppercase company names or abbreviations if they are the most plausible company label.
- If multiple candidates exist, choose the one that best matches a company name rather than a location, role, or navigation label.
- For the role field (job title):
  - role is the job headline occupation — what the person is hired to do, including specialty or scope that defines the job.
  - When the headline is a compound title (main role plus a specialty/scope clause separated by punctuation such as – | : ·), keep the full headline. Do not shorten it to only the first clause.
  - Job-board headlines often glue posting metadata onto the title. Keep the occupation and specialty; drop only the metadata, even when it appears on the same line.
  - Treat as metadata (never part of role): gender/inclusivity tags; years of experience; work arrangement (remote / hybrid / on-site / "% remote" and equivalents in any language); location; salary; contract type; urgency; open headcount; posting age.
  - Keep seniority and specialization that define the job itself (Senior, Junior, Lead, Confirmé, Full Stack, tech stack names, team or domain scope after a separator, etc.).
  - Prefer the visible job headline over a shorter paraphrase from the description body.
  - work arrangement belongs in workType, not in role.
- For the country field (job location):
  - When both city and country appear (e.g. "Ariana, Tunisie", "Paris, France"), return them together in country as "City, Country". Do not drop the city.
  - When only a country is visible (e.g. "Tunisie", "France"), return just the country name.
  - When company and location appear as "Company - City, Country", split company from location and put the full "City, Country" string in country.
  - If you infer separate city and country values, still return a single country string formatted as "City, Country".
  - If the job is fully remote / work from anywhere with no country or city restriction, set country to "Anywhere". Do not leave it null and do not copy "Remote" into country — work arrangement belongs in workType.
  - If remote but restricted to a country (e.g. "Remote, France"), return that country (with city when known).
- For workType, always return one of: Remote, Hybrid, On-site (English enum). Map localized labels:
  - French: Hybride → Hybrid, Télétravail → Remote, Présentiel → On-site
  - Arabic: عن بُعد → Remote, هجين → Hybrid, في الموقع → On-site
  - Chinese: 远程 → Remote, 混合 → Hybrid, 现场 → On-site
- Look for labeled fields such as "Mode de travail : Hybride" on French job boards.
- If a field cannot be inferred with reasonable confidence, return null for that field. Do not guess.

Required JSON Structure:
{
  "company": "Company Name or null",
  "role": "Full occupation/specialty title from the headline (no glued posting metadata), or null",
  "country": "City, Country when both are known (e.g. Ariana, Tunisie), Country alone, Anywhere when fully remote with no geographic restriction, or null",
  "workType": "Remote, Hybrid, or On-site (or null)"
}`;

/**
 * Build user message for provider adapters.
 * @param {{ regionText?: string, pageMeta?: { title?: string, ogTitle?: string } | null }} input
 */
export function buildExtractionUserMessage(input) {
  const text = (input?.regionText || '').substring(0, 1500);
  const hints = [];

  if (input?.pageMeta?.title) {
    hints.push(`- title: ${input.pageMeta.title}`);
  }
  if (input?.pageMeta?.ogTitle && input.pageMeta.ogTitle !== input?.pageMeta?.title) {
    hints.push(`- og:title: ${input.pageMeta.ogTitle}`);
  }

  const hintBlock =
    hints.length > 0 ? `\n\nOptional page hints:\n${hints.join('\n')}` : '';

  return `Extract from this captured text:\n\n${text}${hintBlock}`;
}