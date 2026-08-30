import { tCapture, workTypeDisplayLabel } from '../../../shared/i18n/capture-messages.js';
import { CAPTURE_WORK_TYPES } from '../../../shared/i18n/capture-locale-ui.js';

function calculateOverallConfidence(confidence) {
  if (!confidence) return 80;
  const values = Object.values(confidence).filter((v) => typeof v === 'number');
  if (values.length === 0) return 80;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100);
}

function getConfidenceBadge(conf) {
  if (conf === undefined || conf === null) return '';
  if (conf >= 0.8) {
    return `<span class="candidex-badge candidex-badge-high">${tCapture('capture.highConfidence')}</span>`;
  }
  if (conf > 0) {
    return `<span class="candidex-badge candidex-badge-low">${tCapture('capture.reviewNeeded')}</span>`;
  }
  return `<span class="candidex-badge candidex-badge-none">${tCapture('capture.notFound')}</span>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildExtractionStatus(error, meta) {
  if (error) {
    return `<div class="candidex-extraction-status candidex-extraction-status-error" role="alert">
      ${tCapture('capture.extractionFailed', { error: escapeHtml(error) })}
    </div>`;
  }

  if (meta?.usedFallback) {
    const detail = meta.aiError ? `: ${escapeHtml(meta.aiError)}` : '';
    return `<div class="candidex-extraction-status candidex-extraction-status-warn" role="status">
      ${tCapture('capture.aiFailed')}${detail}
    </div>`;
  }

  return '';
}

function buildWorkTypeOptionsMarkup() {
  const options = CAPTURE_WORK_TYPES.map(
    (value) =>
      `<option value="${value}">${workTypeDisplayLabel(value)}</option>`,
  ).join('');
  const dropdownOptions = CAPTURE_WORK_TYPES.map(
    (value) =>
      `<div class="cdx-dropdown-option" data-value="${value}"><span class="cdx-opt-dot"></span>${workTypeDisplayLabel(value)}</div>`,
  ).join('');
  return { options, dropdownOptions };
}

/**
 * Build static review-card markup. Dynamic field values are applied afterwards
 * via bindReviewCardValues (never interpolated into attributes).
 * @param {{ jobData: Record<string, any>, extractionError?: string|null, extractionMeta?: Record<string, any> }} args
 */
export function buildReviewCardShell({ jobData, extractionError, extractionMeta }) {
  const overallConfVal = calculateOverallConfidence(jobData.confidence);
  const extractionStatus = buildExtractionStatus(extractionError, extractionMeta);
  const { options: workTypeOptions, dropdownOptions: workTypeDropdownOptions } =
    buildWorkTypeOptionsMarkup();
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="candidex-card-header">
      <div class="candidex-header-top-row">
        <div class="candidex-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          ${tCapture('capture.reviewTitle')}
        </div>
        <div class="candidex-overall-badge">
          <span class="candidex-conf-dot"></span>
          <span class="candidex-conf-text">${tCapture('capture.overallConfidence', { value: overallConfVal })}</span>
        </div>
      </div>
      <div class="candidex-header-meta-row">
        <div class="candidex-card-subtitle">${tCapture('capture.reviewSubtitle')}</div>
        ${extractionStatus}
      </div>
    </div>

    <div class="candidex-form-grid">
      <div class="candidex-form-group">
        <div class="candidex-label-row">
          <label class="candidex-form-label">${tCapture('capture.jobTitle')}</label>
          ${getConfidenceBadge(jobData.confidence?.role)}
        </div>
        <div class="candidex-input-wrapper">
          <div class="candidex-field-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect width="20" height="14" x="2" y="6" rx="2"/><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <input type="text" id="cdx-input-role" class="candidex-form-input" placeholder="${tCapture('capture.placeholderRole')}" value="" />
        </div>
      </div>

      <div class="candidex-form-group">
        <div class="candidex-label-row">
          <label class="candidex-form-label">${tCapture('capture.company')}</label>
          ${getConfidenceBadge(jobData.confidence?.company)}
        </div>
        <div class="candidex-input-wrapper">
          <div class="candidex-field-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 18h12"/><path d="M6 14h12"/><path d="M6 10h12"/><path d="M6 6h12"/>
            </svg>
          </div>
          <input type="text" id="cdx-input-company" class="candidex-form-input" placeholder="${tCapture('capture.placeholderCompany')}" value="" />
        </div>
      </div>

      <div class="candidex-form-group">
        <div class="candidex-label-row">
          <label class="candidex-form-label">${tCapture('capture.location')}</label>
          ${getConfidenceBadge(jobData.confidence?.country)}
        </div>
        <div class="candidex-input-wrapper">
          <div class="candidex-field-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <input type="text" id="cdx-input-country" class="candidex-form-input" placeholder="${tCapture('capture.placeholderLocation')}" value="" />
        </div>
      </div>

      <div class="candidex-form-group">
        <div class="candidex-label-row">
          <label class="candidex-form-label">${tCapture('capture.workType')}</label>
          ${getConfidenceBadge(jobData.confidence?.workType)}
        </div>
        <div class="candidex-input-wrapper">
          <div class="candidex-field-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <select id="cdx-select-worktype" style="display:none">
            <option value="">${tCapture('capture.selectWorkType')}</option>
            ${workTypeOptions}
          </select>
          <div class="cdx-dropdown" id="cdx-dropdown-worktype" data-value="">
            <div class="cdx-dropdown-trigger">
              <span class="cdx-dropdown-label cdx-dropdown-placeholder">${tCapture('capture.selectWorkType')}</span>
              <svg class="cdx-dropdown-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </div>
            <div class="cdx-dropdown-menu">
              ${workTypeDropdownOptions}
            </div>
          </div>
        </div>
      </div>

      <div class="candidex-form-group candidex-col-span-2">
        <div class="candidex-label-row">
          <label class="candidex-form-label">${tCapture('capture.platform')}</label>
        </div>
        <div class="candidex-input-wrapper">
          <div class="candidex-field-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <input type="text" id="cdx-input-platform" class="candidex-form-input" placeholder="${tCapture('capture.placeholderPlatform')}" value="" />
        </div>
      </div>

      <div class="candidex-form-group candidex-col-span-2">
        <div class="candidex-label-row">
          <label class="candidex-form-label">${tCapture('capture.notes')}</label>
        </div>
        <div class="candidex-input-wrapper candidex-align-start">
          <div class="candidex-field-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
          </div>
          <textarea id="cdx-textarea-notes" class="candidex-form-input" style="resize: vertical; min-height: 60px;" placeholder="${tCapture('capture.placeholderNotes')}"></textarea>
        </div>
      </div>
    </div>

    <div class="candidex-privacy-box">
      <div class="candidex-privacy-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <div class="candidex-privacy-content">
        <div class="candidex-privacy-title">${tCapture('capture.privacyTitle')}</div>
        <div class="candidex-privacy-desc">${tCapture('capture.privacyDesc')}</div>
      </div>
    </div>

    <div class="candidex-error-message"></div>

    <div class="candidex-card-actions">
      <button class="candidex-btn candidex-btn-retake">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle>
        </svg>
        ${tCapture('capture.retake')}
      </button>
      <button class="candidex-btn candidex-btn-discard">${tCapture('capture.discard')}</button>
      <button class="candidex-btn candidex-btn-save">${tCapture('capture.save')}</button>
    </div>
  `;

  const fragment = document.createDocumentFragment();
  while (wrap.firstChild) {
    fragment.appendChild(wrap.firstChild);
  }
  return fragment;
}

/**
 * Apply untrusted extraction values through DOM properties, never attribute interpolation.
 * @param {HTMLElement} card
 * @param {{ role: string, company: string, country: string, workType: string, platform: string }} values
 */
export function bindReviewCardValues(card, values) {
  const roleInput = card.querySelector('#cdx-input-role');
  const companyInput = card.querySelector('#cdx-input-company');
  const countryInput = card.querySelector('#cdx-input-country');
  const platformInput = card.querySelector('#cdx-input-platform');
  const hiddenSelect = card.querySelector('#cdx-select-worktype');
  const dropdown = card.querySelector('#cdx-dropdown-worktype');

  if (roleInput) roleInput.value = values.role || '';
  if (companyInput) companyInput.value = values.company || '';
  if (countryInput) countryInput.value = values.country || '';
  if (platformInput) platformInput.value = values.platform || '';

  const workType = values.workType || '';
  if (hiddenSelect) hiddenSelect.value = workType;
  if (dropdown) {
    dropdown.dataset.value = workType;
    const labelEl = dropdown.querySelector('.cdx-dropdown-label');
    if (labelEl) {
      if (workType) {
        labelEl.textContent = workTypeDisplayLabel(workType);
        labelEl.classList.remove('cdx-dropdown-placeholder');
      } else {
        labelEl.textContent = tCapture('capture.selectWorkType');
        labelEl.classList.add('cdx-dropdown-placeholder');
      }
    }
    dropdown.querySelectorAll('.cdx-dropdown-option').forEach((opt) => {
      opt.classList.toggle('selected', opt.dataset.value === workType);
    });
  }
}