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

  it('returns null outside TanitJobs', () => {
    expect(resolveJobLink('https://www.linkedin.com/jobs/view/1', offerRoot)).toBeNull();
  });

  it('returns null on completed offer page (tab URL is already correct)', () => {
    expect(resolveJobLink(REAL_OFFER, offerRoot)).toBeNull();
  });

  it('resolves CTA on intermediate list/search only', () => {
    expect(resolveJobLink(INTERMEDIATE, offerRoot)).toBe(REAL_OFFER);
  });
});