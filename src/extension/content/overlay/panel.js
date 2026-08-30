import { IFRAME_ID, RESIZER_ID, overlayState } from './state.js';
import { notifyFullscreenState, notifyOverlayOpened } from '../messaging/runtime-port.js';

/** Max wait when the iframe is still loading on first open (cold start). */
const IFRAME_READY_FALLBACK_MS = 10000;

function markIframeReady(iframe) {
  overlayState.iframeReady = true;
  if (iframe) iframe.dataset.candidexLoaded = '1';
}

function isIframeMarkedReady(iframe) {
  return overlayState.iframeReady || iframe?.dataset.candidexLoaded === '1';
}

function attachIframeLoadListener(iframe) {
  if (iframe.dataset.candidexLoadListener === '1') return;
  iframe.dataset.candidexLoadListener = '1';
  iframe.addEventListener(
    'load',
    () => {
      markIframeReady(iframe);
    },
    { once: true },
  );
}

function getAbsoluteMax() {
  const screenMax = window.innerWidth * 0.6;
  const absoluteMax = Math.max(screenMax, 800);
  return Math.min(absoluteMax, window.innerWidth * 0.9);
}

function createOverlayElements() {
  const iframe = document.createElement('iframe');
  iframe.id = IFRAME_ID;
  iframe.src = chrome.runtime.getURL('index.html');
  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.right = `-${overlayState.currentWidth}px`;
  iframe.style.width = `${overlayState.currentWidth}px`;
  iframe.style.height = '100vh';
  iframe.style.zIndex = '2147483647';
  iframe.style.border = 'none';
  iframe.style.boxShadow = '-4px 0 15px rgba(0,0,0,0.1)';
  iframe.style.transition = 'right 0.3s ease-in-out, width 0.3s ease-in-out';
  iframe.style.transform = 'translateZ(0)';
  iframe.style.colorScheme = 'light';

  const resizer = document.createElement('div');
  resizer.id = RESIZER_ID;
  resizer.style.position = 'fixed';
  resizer.style.top = '0';
  resizer.style.right = `-${overlayState.currentWidth}px`;
  resizer.style.width = '8px';
  resizer.style.height = '100vh';
  resizer.style.zIndex = '2147483648';
  resizer.style.cursor = 'ew-resize';
  resizer.style.transition = 'right 0.3s ease-in-out';

  const resizerLine = document.createElement('div');
  resizerLine.style.position = 'absolute';
  resizerLine.style.left = '3px';
  resizerLine.style.top = '50%';
  resizerLine.style.transform = 'translateY(-50%)';
  resizerLine.style.height = '40px';
  resizerLine.style.width = '4px';
  resizerLine.style.borderRadius = '4px';
  resizerLine.style.backgroundColor = 'rgba(0,0,0,0.1)';
  resizerLine.style.transition = 'background-color 0.2s';
  resizer.appendChild(resizerLine);

  let isResizing = false;
  let startX;
  let startWidth;

  resizer.addEventListener('mouseenter', () => {
    resizerLine.style.backgroundColor = 'rgba(79, 70, 229, 0.5)';
  });
  resizer.addEventListener('mouseleave', () => {
    if (!isResizing) resizerLine.style.backgroundColor = 'rgba(0,0,0,0.1)';
  });

  attachIframeLoadListener(iframe);

  document.body.appendChild(iframe);
  document.body.appendChild(resizer);

  function updateFullscreenState(isFull) {
    if (overlayState.isFullscreen !== isFull) {
      overlayState.isFullscreen = isFull;
      notifyFullscreenState(overlayState.isFullscreen);
    }
  }

  resizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    startX = e.clientX;
    startWidth = overlayState.currentWidth;
    iframe.style.transition = 'none';
    resizer.style.transition = 'none';
    iframe.style.pointerEvents = 'none';
    document.body.style.userSelect = 'none';
    resizerLine.style.backgroundColor = 'rgba(79, 70, 229, 0.8)';
  });

  let isRafScheduled = false;

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    if (!isRafScheduled) {
      isRafScheduled = true;
      requestAnimationFrame(() => {
        const diff = startX - e.clientX;
        const absoluteMax = getAbsoluteMax();
        const newWidth = Math.min(absoluteMax, Math.max(400, startWidth + diff));
        overlayState.currentWidth = newWidth;

        iframe.style.width = `${overlayState.currentWidth}px`;
        resizer.style.right = `${overlayState.currentWidth}px`;
        updateFullscreenState(overlayState.currentWidth >= absoluteMax);
        isRafScheduled = false;
      });
    }
  });

  window.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    void iframe.offsetWidth;
    iframe.style.transition = 'right 0.3s ease-in-out, width 0.3s ease-in-out';
    resizer.style.transition = 'right 0.3s ease-in-out';
    iframe.style.pointerEvents = 'auto';
    document.body.style.userSelect = '';
    resizerLine.style.backgroundColor = 'rgba(0,0,0,0.1)';
  });

  return { iframe, resizer };
}

function slideOverlayOpen() {
  const iframe = document.getElementById(IFRAME_ID);
  const resizer = document.getElementById(RESIZER_ID);
  if (!iframe) return;

  iframe.style.right = '0px';
  if (resizer) {
    resizer.style.right = `${overlayState.currentWidth}px`;
    resizer.style.display = overlayState.isFullscreen ? 'none' : 'block';
  }

  // Ask the Angular app to refresh lists when the panel becomes visible.
  notifyOverlayOpened();
}

export function closeOverlay() {
  const iframe = document.getElementById(IFRAME_ID);
  const resizer = document.getElementById(RESIZER_ID);
  if (iframe?.style.right === '0px') {
    iframe.style.right = `-${overlayState.currentWidth}px`;
    if (resizer) resizer.style.right = `-${overlayState.currentWidth}px`;
  }
}

export function openOverlay() {
  let iframe = document.getElementById(IFRAME_ID);
  let resizer = document.getElementById(RESIZER_ID);

  if (!iframe) {
    ({ iframe, resizer } = createOverlayElements());
    setTimeout(() => slideOverlayOpen(), 10);
    return;
  }

  slideOverlayOpen();
}

export function toggleOverlay() {
  const iframe = document.getElementById(IFRAME_ID);
  if (iframe) {
    if (iframe.style.right === '0px') {
      closeOverlay();
    } else {
      slideOverlayOpen();
    }
    return;
  }

  openOverlay();
}

export function ensureIframeReady() {
  return new Promise((resolve) => {
    let iframe = document.getElementById(IFRAME_ID);

    if (!iframe) {
      ({ iframe } = createOverlayElements());
    }

    if (!iframe) {
      resolve(null);
      return;
    }

    attachIframeLoadListener(iframe);

    const finish = () => resolve(iframe);

    if (isIframeMarkedReady(iframe)) {
      overlayState.iframeReady = true;
      setTimeout(finish, 0);
      return;
    }

    let settled = false;
    const resolveOnce = () => {
      if (settled) return;
      settled = true;
      markIframeReady(iframe);
      setTimeout(finish, 50);
    };

    iframe.addEventListener('load', resolveOnce, { once: true });
    setTimeout(resolveOnce, IFRAME_READY_FALLBACK_MS);
  });
}

export function setFullscreen(full) {
  const iframe = document.getElementById(IFRAME_ID);
  const resizer = document.getElementById(RESIZER_ID);
  if (!iframe) return;

  iframe.style.transition = 'none';
  if (resizer) resizer.style.transition = 'none';

  overlayState.isFullscreen = full;
  if (overlayState.isFullscreen) {
    overlayState.preFullscreenWidth = overlayState.currentWidth;
    overlayState.currentWidth = getAbsoluteMax();
    iframe.style.width = `${overlayState.currentWidth}px`;
    if (resizer) {
      resizer.style.right = `${overlayState.currentWidth}px`;
      resizer.style.display = 'block';
    }
  } else {
    overlayState.currentWidth = overlayState.preFullscreenWidth;
    iframe.style.width = `${overlayState.currentWidth}px`;
    if (resizer) {
      resizer.style.right = `${overlayState.currentWidth}px`;
      resizer.style.display = 'block';
    }
  }

  notifyFullscreenState(overlayState.isFullscreen);

  void iframe.offsetWidth;
  iframe.style.transition = 'right 0.3s ease-in-out, width 0.3s ease-in-out';
  if (resizer) resizer.style.transition = 'right 0.3s ease-in-out';
}