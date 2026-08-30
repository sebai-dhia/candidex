export const IFRAME_ID = 'candidex-overlay-iframe';
export const RESIZER_ID = 'candidex-overlay-resizer';
export const CAPTURE_ROOT_ID = 'candidex-capture-root';
export const CONSENT_OVERLAY_ID = 'candidex-consent-overlay';

export const overlayState = {
  currentWidth: 400,
  isFullscreen: false,
  preFullscreenWidth: 400,
  /** True after the extension iframe has fired its first load event. */
  iframeReady: false,
};