const PLATFORM_MAP = {
  'linkedin.com': 'LinkedIn',
  'indeed.com': 'Indeed',
  'greenhouse.io': 'Greenhouse',
  'jobs.lever.co': 'Lever',
  'ashbyhq.com': 'Ashby',
  'wellfound.com': 'Wellfound',
  'glassdoor.com': 'Glassdoor',
  'careers.google.com': 'Google Careers',
  'tanitjobs.com': 'TanitJobs',
};

export function inferPlatform(url) {
  if (!url) return 'Other';

  try {
    const hostname = new URL(url).hostname;

    for (const [domain, name] of Object.entries(PLATFORM_MAP)) {
      if (hostname.includes(domain)) return name;
    }

    const cleanHost = hostname.replace(/^www\./, '');
    const parts = cleanHost.split('.');
    if (parts.length >= 2) {
      const domainName = parts[parts.length - 2];
      if (domainName && domainName.length > 2) {
        return domainName.charAt(0).toUpperCase() + domainName.slice(1);
      }
    }
  } catch (e) {
    console.error('[inferPlatform] Error parsing URL:', e);
  }

  return 'Other';
}