import { setAiConsentGiven } from '../../shared/storage/content-prefs.js';
import { CONSENT_OVERLAY_ID } from '../overlay/state.js';
import { cancelAiCapture, handleCaptureEscape, releaseSidebarFocus } from './capture-lifecycle.js';
import { isolateCaptureHost } from '../../shared/i18n/capture-locale-ui.js';
import { loadCaptureLocale, tCapture } from '../../shared/i18n/capture-messages.js';

export async function showConsentPrompt(onAccept) {
  if (document.getElementById(CONSENT_OVERLAY_ID)) return;

  await loadCaptureLocale();

  const overlay = document.createElement('div');
  overlay.id = CONSENT_OVERLAY_ID;
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
  overlay.style.backdropFilter = 'blur(2px)';
  overlay.style.zIndex = '2147483647';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  isolateCaptureHost(overlay);

  const dialog = document.createElement('div');
  dialog.style.backgroundColor = 'white';
  dialog.style.boxSizing = 'border-box';
  dialog.style.padding = '1.5rem';
  dialog.style.borderRadius = '0.75rem';
  dialog.style.width = '45rem';
  dialog.style.maxWidth = '45rem';
  dialog.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  dialog.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  const title = document.createElement('h3');
  title.innerText = tCapture('capture.consentTitle');
  title.style.margin = '0 0 0.75rem 0';
  title.style.fontSize = '1.75rem';
  title.style.color = '#0f172a';

  const body = document.createElement('p');
  body.innerText = tCapture('capture.consentBody');
  body.style.margin = '0 0 1.5rem 0';
  body.style.color = '#475569';
  body.style.lineHeight = '1.45';
  body.style.fontSize = '1.25rem';

  const btnContainer = document.createElement('div');
  btnContainer.style.display = 'flex';
  btnContainer.style.justifyContent = 'flex-end';
  btnContainer.style.gap = '12px';

  const cancelBtn = document.createElement('button');
  cancelBtn.innerText = tCapture('capture.consentCancel');
  cancelBtn.style.padding = '8px 16px';
  cancelBtn.style.border = '1px solid #cbd5e1';
  cancelBtn.style.backgroundColor = 'white';
  cancelBtn.style.borderRadius = '6px';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.style.fontWeight = '500';
  cancelBtn.style.color = '#334155';
  cancelBtn.onclick = () => cancelAiCapture();

  const acceptBtn = document.createElement('button');
  acceptBtn.innerText = tCapture('capture.consentAccept');
  acceptBtn.style.padding = '8px 16px';
  acceptBtn.style.border = 'none';
  acceptBtn.style.backgroundColor = '#6366f1';
  acceptBtn.style.color = 'white';
  acceptBtn.style.borderRadius = '6px';
  acceptBtn.style.cursor = 'pointer';
  acceptBtn.style.fontWeight = '500';
  acceptBtn.onclick = () => {
    void setAiConsentGiven().then(() => {
      overlay.remove();
      onAccept();
    });
  };

  btnContainer.appendChild(cancelBtn);
  btnContainer.appendChild(acceptBtn);
  dialog.appendChild(title);
  dialog.appendChild(body);
  dialog.appendChild(btnContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  overlay.tabIndex = -1;
  releaseSidebarFocus();
  requestAnimationFrame(() => overlay.focus({ preventScroll: true }));

  overlay.addEventListener('keydown', (event) => {
    handleCaptureEscape(event);
  });
}