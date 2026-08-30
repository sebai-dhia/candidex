import { tCapture, workTypeDisplayLabel } from '../../../shared/i18n/capture-messages.js';

/**
 * Wire dropdown, drag, dismiss, and save interactions for the review card.
 */
export function wireReviewCardInteractions({
  card,
  scrim,
  shadow,
  payload,
  onRetake,
  requestSaveAiJob,
  ensureIframeReady,
  cancelAiCapture,
}) {
  scheduleExtractionBannerDismiss(card);
  card.addEventListener('click', (e) => e.stopPropagation());

  wireWorkTypeDropdown(card, shadow);
  const cleanupDragEvents = wireCardDrag(card, scrim);

  const dismissCapture = () => {
    cleanupDragEvents();
    cancelAiCapture();
  };

  scrim.addEventListener('click', () => {
    dismissCapture();
  });

  const retakeBtn = card.querySelector('.candidex-btn-retake');
  const discardBtn = card.querySelector('.candidex-btn-discard');
  const saveBtn = card.querySelector('.candidex-btn-save');
  const errorDiv = card.querySelector('.candidex-error-message');

  if (retakeBtn) {
    retakeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissCapture();
      onRetake();
    });
  }

  discardBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dismissCapture();
  });

  saveBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (errorDiv) errorDiv.style.display = 'none';

    const role = shadow.getElementById('cdx-input-role')?.value.trim() || '';
    const company = shadow.getElementById('cdx-input-company')?.value.trim() || '';
    const country = shadow.getElementById('cdx-input-country')?.value.trim() || '';
    const workType = shadow.getElementById('cdx-select-worktype')?.value || '';
    const platform = shadow.getElementById('cdx-input-platform')?.value.trim() || '';
    const notes = shadow.getElementById('cdx-textarea-notes')?.value.trim() || '';

    if (!role || !company) {
      if (errorDiv) {
        errorDiv.innerText = tCapture('capture.roleCompanyRequired');
        errorDiv.style.display = 'block';
      }
      return;
    }

    if (saveBtn) {
      saveBtn.innerText = tCapture('capture.saving');
      saveBtn.disabled = true;
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
        jobLink: payload.jobLink,
      });
      cleanupDragEvents();
    } catch (error) {
      console.error('[Candidex] Save request failed:', error);
      if (saveBtn) {
        saveBtn.innerText = tCapture('capture.save');
        saveBtn.disabled = false;
      }
      if (errorDiv) {
        errorDiv.innerText = tCapture('capture.openFailed');
        errorDiv.style.display = 'block';
      }
    }
  });
}

function scheduleExtractionBannerDismiss(root, delayMs = 5000) {
  const banner = root.querySelector('.candidex-extraction-status');
  if (!banner) return;

  window.setTimeout(() => {
    banner.classList.add('cdx-extraction-banner-leaving');
  }, delayMs);
}

function wireWorkTypeDropdown(card, shadow) {
  const dropdown = card.querySelector('#cdx-dropdown-worktype');
  const hiddenSelect = shadow.getElementById('cdx-select-worktype') || card.querySelector('#cdx-select-worktype');
  if (!dropdown || !hiddenSelect) return;

  hiddenSelect.value = dropdown.dataset.value || '';

  dropdown.querySelector('.cdx-dropdown-trigger')?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  dropdown.querySelectorAll('.cdx-dropdown-option').forEach((opt) => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const val = opt.dataset.value;
      const labelEl = dropdown.querySelector('.cdx-dropdown-label');
      if (labelEl) {
        labelEl.textContent = workTypeDisplayLabel(val);
        labelEl.classList.remove('cdx-dropdown-placeholder');
      }
      hiddenSelect.value = val;
      dropdown.dataset.value = val;
      dropdown.querySelectorAll('.cdx-dropdown-option').forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
      dropdown.classList.remove('open');
    });
  });

  document.addEventListener('click', () => dropdown.classList.remove('open'));
}

function wireCardDrag(card, scrim) {
  const cardHeader = card.querySelector('.candidex-card-header');
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let cardStartX = 0;
  let cardStartY = 0;

  cardHeader?.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('textarea')) {
      return;
    }
    isDragging = true;

    if (card.style.position !== 'absolute') {
      const rect = card.getBoundingClientRect();
      card.style.position = 'absolute';
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.margin = '0';
      scrim.style.alignItems = 'flex-start';
      scrim.style.justifyContent = 'flex-start';
    }

    cardStartX = parseInt(card.style.left, 10);
    cardStartY = parseInt(card.style.top, 10);
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    e.preventDefault();
    e.stopPropagation();
  });

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    let newLeft = cardStartX + dx;
    let newTop = cardStartY + dy;

    newLeft = Math.max(10, Math.min(window.innerWidth - card.offsetWidth - 10, newLeft));
    newTop = Math.max(10, Math.min(window.innerHeight - card.offsetHeight - 10, newTop));

    card.style.left = `${newLeft}px`;
    card.style.top = `${newTop}px`;
  };

  const handleMouseUp = () => {
    isDragging = false;
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  return () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };
}