import { cancelAiCapture } from './capture-lifecycle.js';
import { ensureIframeReady } from '../overlay/panel.js';
import { CAPTURE_ROOT_ID } from '../overlay/state.js';
import { extractJobDataFromCapture } from './review-card-extraction.js';
import { loadCaptureLocale } from '../../shared/i18n/capture-messages.js';
import { isolateCaptureHost } from '../../shared/i18n/capture-locale-ui.js';
import { requestSaveAiJob } from '../messaging/runtime-port.js';
import { buildReviewCardShell, bindReviewCardValues } from './review/review-card-dom.js';
import { wireReviewCardInteractions } from './review/review-card-interactions.js';

export async function handleAiCaptureSuccess(payload, shadow, { onRetake }) {
  const host = document.getElementById(CAPTURE_ROOT_ID);
  if (!host) return;

  const selection = shadow.querySelector('.candidex-selection');
  if (!selection) return;

  await loadCaptureLocale();

  const { jobData, extractionMeta, extractionError } = await extractJobDataFromCapture(payload);

  if (!document.getElementById(CAPTURE_ROOT_ID)) return;

  const overlay = shadow.getElementById('candidex-capture-overlay');

  if (overlay) {
    overlay.style.transition = 'opacity 0.2s ease';
    overlay.style.opacity = '0';
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  if (!document.getElementById(CAPTURE_ROOT_ID)) return;

  const loader = shadow.getElementById('candidex-crop-loader');
  if (loader) loader.remove();

  const toolbar = shadow.querySelector('.candidex-crop-toolbar');
  selection.style.pointerEvents = 'auto';
  selection.style.cursor = 'grab';
  if (toolbar) {
    toolbar.style.pointerEvents = 'auto';
    toolbar.style.opacity = '1';
  }
  delete host.dataset.candidexProcessing;

  if (overlay) {
    overlay.style.display = 'none';
  }

  host.style.pointerEvents = 'auto';
  host.style.width = '100vw';
  host.style.height = '100vh';
  host.style.left = '0';
  host.style.top = '0';
  host.style.transform = 'none';

  const scrim = document.createElement('div');
  scrim.className = 'candidex-scrim';
  scrim.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.25s ease;
    z-index: 999999;
    overflow: hidden;
  `;
  shadow.appendChild(scrim);

  requestAnimationFrame(() => {
    scrim.style.opacity = '1';
  });

  const card = document.createElement('div');
  card.className = 'candidex-review-card';
  isolateCaptureHost(card);
  if (payload.jobLink) {
    card.dataset.jobLink = String(payload.jobLink);
  }

  card.appendChild(
    buildReviewCardShell({
      jobData,
      extractionError,
      extractionMeta
    }));
  bindReviewCardValues(card, {
    role: jobData.role || '',
    company: jobData.company || '',
    country: jobData.country || '',
    workType: jobData.workType || '',
    platform: payload.platform || ''
  });

  card.style.position = 'relative';
  card.style.width = '760px';
  card.style.maxWidth = 'calc(100vw - 32px)';
  card.style.overflow = 'visible';

  scrim.appendChild(card);
  wireReviewCardInteractions({
    card,
    scrim,
    shadow,
    payload,
    onRetake,
    requestSaveAiJob,
    ensureIframeReady,
    cancelAiCapture,
  });
}