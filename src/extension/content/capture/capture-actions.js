import { getContentPrefs } from '../../shared/storage/content-prefs.js';
import { loadCaptureLocale } from '../../shared/i18n/capture-messages.js';
import { showConsentPrompt } from './consent.js';
import { startAiCaptureOverlay } from './region-select.js';

export function startAiCaptureWithConsent() {
  const start = () => {
    startAiCaptureOverlay();
  };

  void getContentPrefs().then(async (prefs) => {
    await loadCaptureLocale();
    if (prefs.aiConsentGiven) {
      start();
    } else {
      await showConsentPrompt(start);
    }
  });
}