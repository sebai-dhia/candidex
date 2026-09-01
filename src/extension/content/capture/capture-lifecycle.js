import { CONSENT_OVERLAY_ID, CAPTURE_ROOT_ID, IFRAME_ID } from '../overlay/state.js';
import { dismissDuplicateOverlay, isDuplicateOverlayVisible } from './duplicate-overlay.js';

export function isCaptureActive() {
  return Boolean(document.getElementById(CAPTURE_ROOT_ID));
}

export function isConsentVisible() {
  return Boolean(document.getElementById(CONSENT_OVERLAY_ID));
}

export function releaseSidebarFocus() {
  const iframe = document.getElementById(IFRAME_ID);
  if (!iframe) return;

  try {
    iframe.contentWindow?.blur();
  } catch {
    // Cross-origin or detached frame — safe to ignore.
  }

  iframe.blur();
  window.focus();
}

export function cancelAiCapture() {
  const root = document.getElementById(CAPTURE_ROOT_ID);
  if (root) {
    root.dispatchEvent(new CustomEvent('candidex-capture-settled'));
    root.remove();
  }

  const consent = document.getElementById(CONSENT_OVERLAY_ID);
  if (consent) consent.remove();

  const iframe = document.getElementById(IFRAME_ID);
  if (iframe) iframe.style.opacity = '1';

  releaseSidebarFocus();
}

export function handleCaptureEscape(event) {
  if (event.key !== 'Escape' && event.code !== 'Escape') return false;
  if (!isConsentVisible() && !isCaptureActive()) return false;

  const root = document.getElementById(CAPTURE_ROOT_ID);
  const shadow = root?.shadowRoot;
  if (shadow) {
    if (isDuplicateOverlayVisible(shadow)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      dismissDuplicateOverlay(shadow);
      return true;
    }

    const workTypeDropdown = shadow.querySelector('#cdx-dropdown-worktype.open');
    if (workTypeDropdown) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      workTypeDropdown.classList.remove('open');
      return true;
    }
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  cancelAiCapture();
  return true;
}

export function registerCaptureEscapeHandler() {
  window.addEventListener('keydown', handleCaptureEscape, true);
}

export function bindCaptureEscapeTarget(host, shadow) {
  if (!host) return;

  if (!host.dataset.candidexEscapeBound) {
    host.tabIndex = -1;
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');

    const onKeyDown = (event) => {
      handleCaptureEscape(event);
    };

    host.addEventListener('keydown', onKeyDown);
    shadow?.addEventListener('keydown', onKeyDown);
    host.dataset.candidexEscapeBound = 'true';
  }

  releaseSidebarFocus();
  requestAnimationFrame(() => {
    host.focus({ preventScroll: true });
  });
}