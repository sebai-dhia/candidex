/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, beforeEach } from 'vitest';

import { bindReviewCardValues, buildReviewCardShell } from './review-card-dom.js';

describe('review-card DOM binding', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('binds hostile extraction strings as literal input values', () => {
    const card = document.createElement('div');
    card.appendChild(
      buildReviewCardShell({
        jobData: {
          confidence: { role: 0.9, company: 0.9, country: 0.2, workType: 0 },
        },
        extractionError: null,
        extractionMeta: { usedFallback: false },
      }),
    );

    const hostile = `"><img src=x onerror=alert(1)>`;
    bindReviewCardValues(card, {
      role: hostile,
      company: `Acme</div><script>alert(1)</script>`,
      country: `Tunisia" onfocus="alert(1)`,
      workType: 'Remote',
      platform: `LinkedIn' onclick='alert(1)`,
    });

    const roleInput = card.querySelector('#cdx-input-role');
    const companyInput = card.querySelector('#cdx-input-company');
    const countryInput = card.querySelector('#cdx-input-country');
    const platformInput = card.querySelector('#cdx-input-platform');

    expect(roleInput.value).toBe(hostile);
    expect(companyInput.value).toContain('</script>');
    expect(countryInput.value).toContain('onfocus');
    expect(platformInput.value).toContain('onclick');
    expect(card.innerHTML).not.toContain('onerror=alert');
    expect(card.querySelectorAll('img').length).toBe(0);
  });
});