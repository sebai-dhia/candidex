import { describe, expect, it } from 'vitest';
import {isTanitJobsHost, isTanitJobsIntermediateUrl, isTanitJobsJobOfferUrl, isTanitJobsOfferLinkText, pickTanitJobsOfferHref, resolveJobLink } from './job-link.js';

const REAL_OFFER = 'https://www.tanitjobs.com/job/2040736/d%C3%A9veloppeur-fullstack-angular-spring-boot/';
const REAL_OFFER_HREF = '/job/2040736/développeur-fullstack-angular-spring-boot/';
const INTERMEDIATE ='https://www.tanitjobs.com/jobs/?listing_type%5Bequal%5D=Job&action=search&keywords%5Ball_words%5D=java&GooglePlace%5Blocation%5D%5Bvalue%5D=&GooglePlace%5Blocation%5D%5Bradius%5D=50';

describe('isTanitJobsHost', () => {
  it('matches tanitjobs hosts', () => {
    expect(isTanitJobsHost('tanitjobs.com')).toBe(true);
    expect(isTanitJobsHost('www.tanitjobs.com')).toBe(true);
    expect(isTanitJobsHost('jobs.tanitjobs.com')).toBe(true);
  });

  it('rejects other hosts', () => {
    expect(isTanitJobsHost('linkedin.com')).toBe(false);
    expect(isTanitJobsHost('nottanitjobs.com')).toBe(false);
  });
});

describe('isTanitJobsJobOfferUrl', () => {
  it('accepts completed /job/{id}/… pages', () => {
    expect(isTanitJobsJobOfferUrl(REAL_OFFER)).toBe(true);
    expect(
      isTanitJobsJobOfferUrl(
        'https://www.tanitjobs.com/job/2040736/développeur-fullstack-angular-spring-boot/',
      )
    ).toBe(true);
    expect(isTanitJobsJobOfferUrl('https://www.tanitjobs.com/job/2040736')).toBe(true);
  });

  it('rejects list/search URLs', () => {
    expect(isTanitJobsJobOfferUrl(INTERMEDIATE)).toBe(false);
    expect(isTanitJobsJobOfferUrl('https://www.tanitjobs.com/jobs/')).toBe(false);
  });
});

describe('isTanitJobsIntermediateUrl', () => {
  it('flags list/search only', () => {
    expect(isTanitJobsIntermediateUrl(INTERMEDIATE)).toBe(true);
    expect(isTanitJobsIntermediateUrl('https://www.tanitjobs.com/jobs/')).toBe(true);
    expect(isTanitJobsIntermediateUrl(REAL_OFFER)).toBe(false);
  });
});

describe('isTanitJobsOfferLinkText', () => {
  it('matches the full-offer CTA variants', () => {
    expect(isTanitJobsOfferLinkText("Voir l'offre complète ↗")).toBe(true);
    expect(isTanitJobsOfferLinkText('Voir l’offre complète')).toBe(true);
    expect(isTanitJobsOfferLinkText('voire offre complete')).toBe(true);
  });

  it('rejects unrelated labels', () => {
    expect(isTanitJobsOfferLinkText('Postuler maintenant')).toBe(false);
  });
});

describe('pickTanitJobsOfferHref', () => {
  it('returns only real /job/{id}/… hrefs', () => {
    expect(
      pickTanitJobsOfferHref(
        [
          { text: 'Postuler maintenant', href: '/apply/1' },
          {
            text: "Voir l'offre complète ↗",
            href: REAL_OFFER_HREF
          }
        ],
        INTERMEDIATE
      )
    ).toBe(REAL_OFFER);
  });

  it('rejects CTA hrefs that still point at /jobs list', () => {
    expect(
      pickTanitJobsOfferHref(
        [{ text: "Voir l'offre complète", href: '/jobs/?q=java' }],
        INTERMEDIATE
      )
    ).toBeNull();
  });
});

describe('resolveJobLink', () => {
  const offerRoot = {
    querySelectorAll: () => [
      {
        textContent: "Voir l'offre complète ↗",
        getAttribute: () => REAL_OFFER_HREF
      }
    ]
  };

  it('resolves LinkedIn search mode with currentJobId parameter', () => {
    expect(
      resolveJobLink(
        'https://www.linkedin.com/jobs/search/?currentJobId=4461592016&geoId=102509662&keywords=AI-Native'
      )
    ).toBe('https://www.linkedin.com/jobs/view/4461592016/');
  });

  it('resolves LinkedIn collections URL with currentJobId parameter', () => {
    expect(
      resolveJobLink(
        'https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4461592016'
      )
    ).toBe('https://www.linkedin.com/jobs/view/4461592016/');
  });

  it('canonicalizes LinkedIn direct view URL with tracking parameters', () => {
    expect(
      resolveJobLink(
        'https://www.linkedin.com/jobs/view/4461592016/?alternateChannel=search&refId=abc&trackingId=xyz'
      )
    ).toBe('https://www.linkedin.com/jobs/view/4461592016/');
  });

  it('resolves LinkedIn search URL by querying DOM anchor when currentJobId is not in URL', () => {
    const root = {
      querySelector: (selector) => {
        if (selector === 'a[href*="/jobs/view/"]') {
          return {
            getAttribute: () => '/jobs/view/4461592016/?refId=123'
          };
        }
        return null;
      }
    };
    expect(
      resolveJobLink('https://www.linkedin.com/jobs/search/?keywords=Developer', root)
    ).toBe('https://www.linkedin.com/jobs/view/4461592016/');
  });

  it('resolves Indeed search URL with vjk parameter', () => {
    expect(
      resolveJobLink('https://www.indeed.com/jobs?q=developer&l=Remote&vjk=7d4b6ef12a3c')
    ).toBe('https://www.indeed.com/viewjob?jk=7d4b6ef12a3c');
  });

  it('resolves Glassdoor job URL with jl parameter', () => {
    expect(
      resolveJobLink('https://www.glassdoor.com/Job/jobs.htm?jl=1008923412&pos=101')
    ).toBe('https://www.glassdoor.com/job-listing?jl=1008923412');
  });

  it('returns null on TanitJobs completed offer page', () => {
    expect(resolveJobLink(REAL_OFFER, offerRoot)).toBeNull();
  });

  it('resolves TanitJobs CTA on intermediate list/search', () => {
    expect(resolveJobLink(INTERMEDIATE, offerRoot)).toBe(REAL_OFFER);
  });
});