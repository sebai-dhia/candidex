import { getCachedCaptureLocale } from './capture-messages.js';

/** Canonical work-type values stored in the sheet. */
export const CAPTURE_WORK_TYPES = ['Remote', 'Hybrid', 'On-site'];

/**
 * Text direction for capture overlay chrome — follows extension locale, not host page.
 * @returns {'ltr' | 'rtl'}
 */
export function getCaptureTextDirection() {
  return getCachedCaptureLocale() === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Isolate injected capture UI from host-page translation and direction.
 * @param {HTMLElement} host
 */
export function isolateCaptureHost(host) {
  if (!host) return;
  host.setAttribute('translate', 'no');
  host.classList.add('notranslate');
  host.dir = getCaptureTextDirection();
}