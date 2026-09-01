import { MSG } from '../../shared/constants.js';
import { loadCaptureLocale, tCapture, getCachedCaptureLocale } from '../../shared/i18n/capture-messages.js';
import { getCaptureTextDirection } from '../../shared/i18n/capture-locale-ui.js';
import { onEnterSubmit, onEscape } from '../../shared/keyboard.js';
import { isCaptureActive, isConsentVisible, cancelAiCapture, handleCaptureEscape } from '../capture/capture-lifecycle.js';
import { dismissDuplicateOverlay } from '../capture/duplicate-overlay.js';
import { startAiCaptureWithConsent } from '../capture/capture-actions.js';
import { showCaptureProcessingError } from '../capture/processing-state.js';
import { handleAiCaptureSuccess } from '../capture/review-card.js';
import { showSuccessCheckmark } from '../capture/success.js';
import { closeOverlay, openOverlay, ensureIframeReady, setFullscreen, toggleOverlay } from '../overlay/panel.js';
import { CAPTURE_ROOT_ID, IFRAME_ID } from '../overlay/state.js';
import { onPanelMessage, requestNavigate, requestSaveAiJob } from './runtime-port.js';

export function registerMessaging() {
  ensurePanelPortHandlers();

  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === MSG.TOGGLE_OVERLAY) {
      toggleOverlay();
      return;
    }

    if (request.action === MSG.CAPTURE_AREA_FAILED) {
      const root = document.getElementById(CAPTURE_ROOT_ID);
      if (!root?.shadowRoot) return;

      root.dispatchEvent(new CustomEvent('candidex-capture-settled'));
      showCaptureProcessingError(
        root.shadowRoot,
        root,
        request.error || 'Screenshot capture failed.'
      );
      return;
    }

    if (request.action === MSG.AI_SCREENSHOT_READY) {
      const root = document.getElementById(CAPTURE_ROOT_ID);
      if (root?.shadowRoot) {
        root.dispatchEvent(new CustomEvent('candidex-capture-settled'));
        handleAiCaptureSuccess(request.payload, root.shadowRoot, {
          onRetake: startAiCaptureWithConsent
        });
        return;
      }

      const iframe = document.getElementById(IFRAME_ID);
      if (iframe) {
        if (iframe.style.right !== '0px') openOverlay();
        // Screenshot preview remains local to the capture overlay; no sensitive sheet write here.
      }
    }
  });

  window.addEventListener('keydown', (event) => {
    handleCaptureEscape(event);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' && event.code !== 'Escape') return;
    if (isConsentVisible() || isCaptureActive()) return;
    closeOverlay();
  });
}

function ensurePanelPortHandlers() {
  onPanelMessage((message) => {
    if (message.action === MSG.CLOSE_OVERLAY) {
      closeOverlay();
      return;
    }
    if (message.action === MSG.TOGGLE_FULLSCREEN) {
      setFullscreen(!!message.isFullscreen);
      return;
    }
    if (message.action === MSG.START_AI_CAPTURE) {
      closeOverlay();
      setTimeout(() => startAiCaptureWithConsent(), 320);
      return;
    }
    if (message.action === MSG.ESCAPE_PRESSED) {
      if (isConsentVisible() || isCaptureActive()) {
        cancelAiCapture();
      } else {
        closeOverlay();
      }
      return;
    }
    if (message.action === MSG.SAVE_AI_JOB_RESPONSE) {
      handleSaveAiJobResponse(message);
    }
  });
}

/**
 * @param {Record<string, unknown>} eventData
 */
function handleSaveAiJobResponse(eventData) {
  const root = document.getElementById(CAPTURE_ROOT_ID);
  if (!root?.shadowRoot) return;

  const shadow = root.shadowRoot;
  const saveBtn = shadow.querySelector('.candidex-btn-save');
  const errorDiv = shadow.querySelector('.candidex-error-message');

  void loadCaptureLocale().then(() => {
    if (eventData.success) {
      dismissDuplicateOverlay(shadow);
      if (saveBtn) {
        saveBtn.innerText = tCapture('capture.saved');
        saveBtn.disabled = true;
      }
      void showSuccessCheckmark();
      return;
    }

    if (eventData.duplicate && eventData.existing) {
      showDuplicateConfirm(shadow, eventData.existing);
      return;
    }

    dismissDuplicateOverlay(shadow);
    if (saveBtn) {
      saveBtn.innerText = tCapture('capture.save');
      saveBtn.disabled = false;
    }

    if (!errorDiv) return;

    errorDiv.classList.remove('candidex-duplicate-warning');
    errorDiv.textContent = '';
    errorDiv.innerText = eventData.error || tCapture('capture.saveFailed');
    errorDiv.style.display = 'block';
  });
}

/**
 * @param {ShadowRoot} shadow
 * @returns {string}
 */
function readJobLink(shadow) {
  const card = shadow.querySelector('.candidex-review-card');
  return card?.dataset?.jobLink || '';
}

/**
 * @param {ShadowRoot} shadow
 * @param {{ id?: string, role?: string, company?: string, date_applied?: string }} existing
 */
function showDuplicateConfirm(shadow, existing) {
  dismissDuplicateOverlay(shadow);

  const card = shadow.querySelector('.candidex-review-card');
  const saveBtn = shadow.querySelector('.candidex-btn-save');
  if (!card) return;

  if (saveBtn) {
    saveBtn.innerText = tCapture('capture.save');
    saveBtn.disabled = true;
  }

  card.classList.add('candidex-review-card--dup-locked');

  const role = existing.role || '';
  const company = existing.company || '';
  const isRtl = getCaptureTextDirection() === 'rtl';
  const appliedLabel = formatDuplicateAppliedDate(existing.date_applied);

  const layer = document.createElement('div');
  layer.className = 'candidex-duplicate-layer';
  layer.setAttribute('role', 'alertdialog');
  layer.setAttribute('aria-modal', 'true');
  layer.setAttribute('aria-labelledby', 'cdx-dup-title');
  layer.setAttribute('aria-describedby', 'cdx-dup-desc');

  const dialog = document.createElement('div');
  dialog.className = 'candidex-duplicate-dialog';
  dialog.dir = isRtl ? 'rtl' : 'ltr';

  const icon = document.createElement('div');
  icon.className = 'candidex-duplicate-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  `;

  const title = document.createElement('h3');
  title.id = 'cdx-dup-title';
  title.className = 'candidex-duplicate-title';
  title.textContent = tCapture('capture.duplicateTitle');

  const desc = document.createElement('p');
  desc.id = 'cdx-dup-desc';
  desc.className = 'candidex-duplicate-text';
  desc.textContent = tCapture('capture.duplicateWarning', {
    role: isolateBidi(role),
    company: isolateBidi(company),
  });

  dialog.append(icon, title, desc);

  if (appliedLabel) {
    const dateEl = document.createElement('p');
    dateEl.className = 'candidex-duplicate-date';
    dateEl.textContent = tCapture('capture.duplicateAppliedOn', {
      date: isolateBidi(appliedLabel),
    });
    dialog.appendChild(dateEl);
  }

  const actions = document.createElement('div');
  actions.className = 'candidex-duplicate-actions';

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'candidex-btn candidex-btn-dup-secondary';
  viewBtn.textContent = tCapture('capture.viewExisting');

  const anywayBtn = document.createElement('button');
  anywayBtn.type = 'button';
  anywayBtn.className = 'candidex-btn candidex-btn-dup-primary';
  anywayBtn.textContent = tCapture('capture.saveAnyway');

  actions.append(viewBtn, anywayBtn);
  dialog.appendChild(actions);
  layer.appendChild(dialog);

  layer.addEventListener('click', (e) => e.stopPropagation());

  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const focusId = existing.id ? encodeURIComponent(String(existing.id)) : '';
    const path = focusId ? `/track?focus=${focusId}` : '/track';
    cancelAiCapture();
    openOverlay();
    void (async () => {
      await ensureIframeReady();
      try {
        requestNavigate(path);
      } catch (error) {
        console.error('[Candidex] Navigate failed:', error);
      }
    })();
  });

  anywayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissDuplicateOverlay(shadow);
    void saveAiJobFromReviewCard(shadow, true);
  });

  onEnterSubmit(layer, () => {
    dismissDuplicateOverlay(shadow);
    void saveAiJobFromReviewCard(shadow, true);
    return true;
  });
  onEscape(layer, () => {
    dismissDuplicateOverlay(shadow);
    return true;
  });

  card.appendChild(layer);
  requestAnimationFrame(() => {
    anywayBtn.focus();
  });
}

/**
 * @param {string | undefined} dateStr
 * @returns {string}
 */
function formatDuplicateAppliedDate(dateStr) {
  const raw = String(dateStr || '').trim();
  if (!raw) return '';

  const parts = raw.split('-');
  let date;
  if (parts.length >= 3) {
    const dayPart = parts[2].split(/[T\s]/)[0];
    date = new Date(+parts[0], +parts[1] - 1, +dayPart);
  } else {
    date = new Date(raw);
  }
  if (Number.isNaN(date.getTime())) return '';

  const locale = getCachedCaptureLocale();
  const tags = { en: 'en-US', fr: 'fr-FR', ar: 'ar', zh: 'zh-CN' };
  const tag = tags[locale] || 'en-US';
  const today = new Date();
  /** @type {Intl.DateTimeFormatOptions} */
  const options = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== today.getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString(tag, options);
}

/**
 * @param {string} value
 * @returns {string}
 */
function isolateBidi(value) {
  return `\u2068${String(value || '')}\u2069`;
}

/**
 * @param {ShadowRoot} shadow
 * @param {boolean} allowDuplicate
 */
async function saveAiJobFromReviewCard(shadow, allowDuplicate) {
  const saveBtn = shadow.querySelector('.candidex-btn-save');
  const errorDiv = shadow.querySelector('.candidex-error-message');
  const role = shadow.getElementById('cdx-input-role')?.value.trim() || '';
  const company = shadow.getElementById('cdx-input-company')?.value.trim() || '';
  const country = shadow.getElementById('cdx-input-country')?.value.trim() || '';
  const workType = shadow.getElementById('cdx-select-worktype')?.value || '';
  const platform = shadow.getElementById('cdx-input-platform')?.value.trim() || '';
  const notes = shadow.getElementById('cdx-textarea-notes')?.value.trim() || '';

  if (!role || !company) {
    dismissDuplicateOverlay(shadow);
    if (errorDiv) {
      errorDiv.classList.remove('candidex-duplicate-warning');
      errorDiv.textContent = '';
      errorDiv.innerText = tCapture('capture.roleCompanyRequired');
      errorDiv.style.display = 'block';
    }
    return;
  }

  if (saveBtn) {
    saveBtn.innerText = tCapture('capture.saving');
    saveBtn.disabled = true;
  }
  if (errorDiv) {
    errorDiv.style.display = 'none';
    errorDiv.classList.remove('candidex-duplicate-warning');
    errorDiv.textContent = '';
  }

  try {
    await ensureIframeReady();
    requestSaveAiJob({
      role,
      company,
      country,
      workType,
      platform,
      notes,
      jobLink: readJobLink(shadow),
      allowDuplicate: !!allowDuplicate
    });
  } catch (error) {
    console.error('[Candidex] Save request failed:', error);
    if (saveBtn && errorDiv) {
      saveBtn.innerText = tCapture('capture.save');
      saveBtn.disabled = false;
      errorDiv.innerText = tCapture('capture.openFailed');
      errorDiv.style.display = 'block';
    }
  }
}