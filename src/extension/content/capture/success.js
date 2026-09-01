import { CAPTURE_ROOT_ID } from '../overlay/state.js';
import { loadCaptureLocale, tCapture } from '../../shared/i18n/capture-messages.js';

export async function showSuccessCheckmark() {
  const root = document.getElementById(CAPTURE_ROOT_ID);
  if (!root?.shadowRoot) return;
  const shadow = root.shadowRoot;

  await loadCaptureLocale();

  const card = shadow.querySelector('.candidex-review-card');
  if (card) card.remove();

  const successLayer = document.createElement('div');
  successLayer.className = 'candidex-success-layer';
  successLayer.innerHTML = `
    <div class="candidex-success-badge">
      <svg width="58" height="58" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3.25" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <div class="candidex-success-title">${tCapture('capture.savedTitle')}</div>
    <div class="candidex-success-subtitle">${tCapture('capture.savedSubtitle')}</div>
    <style>
      .candidex-success-layer {
        position: fixed;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: rgba(15, 23, 42, 0.94);
        z-index: 2147483649;
        animation: cdx-fade-in 0.2s ease;
      }
      .candidex-success-badge {
        width: 108px;
        height: 108px;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.35);
        box-shadow: 0 0 0 14px rgba(16, 185, 129, 0.08);
      }
      .candidex-success-title {
        margin-top: 4px;
        font-weight: 700;
        color: #ecfdf5;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 16px;
        line-height: 1.2;
        text-align: center;
      }
      .candidex-success-subtitle {
        color: rgba(236, 253, 245, 0.8);
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        line-height: 1.35;
        text-align: center;
        max-width: 260px;
      }
      @keyframes cdx-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    </style>
  `;
  shadow.appendChild(successLayer);

  setTimeout(() => {
    root.remove();
  }, 1800);
}