import { tCapture } from '../../shared/i18n/capture-messages.js';

export function resetCaptureProcessingState(shadow, host) {
  if (!host) return;

  delete host.dataset.candidexProcessing;

  const loader = shadow.getElementById('candidex-crop-loader');
  if (loader) loader.remove();

  const selection = shadow.querySelector('.candidex-selection');
  if (selection) {
    selection.style.pointerEvents = 'auto';
    selection.style.cursor = 'grab';
  }

  const handles = shadow.querySelectorAll('.candidex-handle');
  handles.forEach((handle) => {
    handle.style.display = 'block';
  });

  const toolbar = shadow.querySelector('.candidex-crop-toolbar');
  if (toolbar) {
    toolbar.style.display = 'flex';
    toolbar.style.pointerEvents = 'auto';
    toolbar.style.opacity = '1';
  }
}

/**
 * @param {ShadowRoot} shadow
 * @param {HTMLElement} host
 * @param {'timeout' | undefined} [kind] only our own known cases get a hint; technical
 *   errors stay in the console and are never shown to the user.
 */
export function showCaptureProcessingError(shadow, host, kind) {
  const loader = shadow.getElementById('candidex-crop-loader');
  if (loader) {
    loader.style.overflow = 'hidden';
    loader.innerHTML = `
      <div style="text-align: center; padding: 0 12px;">
        <div style="color: #fca5a5; font-weight: 600; margin-bottom: 6px;">${tCapture('capture.failed')}</div>
        <div id="candidex-capture-hint" style="color: #e2e8f0; font-size: 12px; line-height: 1.4; overflow-wrap: anywhere;"></div>
        <button type="button" id="candidex-capture-retry" style="
          margin-top: 12px;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          background: #6366f1;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        ">${tCapture('capture.tryAgain')}</button>
      </div>
    `;

    const hint = loader.querySelector('#candidex-capture-hint');
    if (hint) {
      if (kind === 'timeout') hint.textContent = tCapture('capture.reloadHint');
      else hint.remove();
    }

    loader.querySelector('#candidex-capture-retry')?.addEventListener('click', (e) => {
      e.stopPropagation();
      resetCaptureProcessingState(shadow, host);
    });
    return;
  }

  resetCaptureProcessingState(shadow, host);
}