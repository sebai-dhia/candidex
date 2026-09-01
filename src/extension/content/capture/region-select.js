import { MSG } from '../../shared/constants.js';
import { bindCaptureEscapeTarget } from './capture-lifecycle.js';
import { IFRAME_ID, CAPTURE_ROOT_ID } from '../overlay/state.js';
import { showCaptureProcessingError } from './processing-state.js';
import { CAPTURE_OVERLAY_STYLES } from './styles.js';
import { extractTextFromRegion, extractPageMeta } from './region-text.js';
import { resolveJobLink } from '../../shared/job-link.js';
import { applyHandleResize } from './region-resize.js';
import { loadCaptureLocale, tCapture } from '../../shared/i18n/capture-messages.js';
import { isolateCaptureHost } from '../../shared/i18n/capture-locale-ui.js';

const CAPTURE_RESPONSE_TIMEOUT_MS = 20000;

export async function startAiCaptureOverlay() {
  if (document.getElementById(CAPTURE_ROOT_ID)) return;

  await loadCaptureLocale();

  // Create host container
  const host = document.createElement('div');
  host.id = CAPTURE_ROOT_ID;
  host.style.position = 'fixed';
  host.style.top = '0';
  host.style.left = '0';
  host.style.width = '100vw';
  host.style.height = '100vh';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'auto';
  isolateCaptureHost(host);
  document.body.appendChild(host);

  // Attach Shadow DOM
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CAPTURE_OVERLAY_STYLES;
  shadow.appendChild(style);

  // Create the overlay container
  const overlay = document.createElement('div');
  overlay.id = 'candidex-capture-overlay';
  shadow.appendChild(overlay);

  // Instruction text
  const instruction = document.createElement('div');
  instruction.className = 'candidex-instruction';
  instruction.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
    ${tCapture('capture.instruction')}
  `;
  overlay.appendChild(instruction);

  // Selection box
  const selection = document.createElement('div');
  selection.className = 'candidex-selection';

  // Add 4 corner handles
  const createHandle = (dir) => {
    const handle = document.createElement('div');
    handle.className = `candidex-handle candidex-handle-${dir}`;
    handle.dataset.direction = dir;
    return handle;
  };
  selection.appendChild(createHandle('tl'));
  selection.appendChild(createHandle('tr'));
  selection.appendChild(createHandle('br'));
  selection.appendChild(createHandle('bl'));

  overlay.appendChild(selection);

  // Create floating crop action toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'candidex-crop-toolbar';
  toolbar.innerHTML = `
    <button class="candidex-toolbar-btn candidex-btn-recapture">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
      </svg>
      ${tCapture('capture.recapture')}
    </button>
    <button class="candidex-toolbar-btn candidex-btn-extract">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275Z"/>
      </svg>
      ${tCapture('capture.extract')}
    </button>
  `;
  overlay.appendChild(toolbar);

  bindCaptureEscapeTarget(host, shadow);

  let startX, startY;
  let isSelecting = false;
  let activeHandle = null;
  let dragStartRect = null;
  let dragStartMouse = null;
  let inAdjustMode = false;
  function updateToolbarPosition() {
    const left = parseInt(selection.style.left);
    const top = parseInt(selection.style.top);
    const width = parseInt(selection.style.width);
    const height = parseInt(selection.style.height);

    toolbar.style.left = `${left + width / 2}px`;
    toolbar.style.transform = 'translateX(-50%)';

    if (top + height + 60 > window.innerHeight) {
      toolbar.style.top = `${Math.max(10, top - 50)}px`;
    } else {
      toolbar.style.top = `${top + height + 10}px`;
    }
    toolbar.style.display = 'flex';
  }

  // Handles mousedown registration
  const handles = selection.querySelectorAll('.candidex-handle');
  handles.forEach((h) => {
    h.addEventListener('mousedown', (e) => {
      if (host.dataset.candidexProcessing === 'true') {
        e.stopPropagation();
        e.preventDefault();
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      activeHandle = h.dataset.direction;
      dragStartRect = {
        left: parseInt(selection.style.left, 10),
        top: parseInt(selection.style.top, 10),
        width: parseInt(selection.style.width, 10),
        height: parseInt(selection.style.height, 10)
      };
      dragStartMouse = { x: e.clientX, y: e.clientY };
    });
  });

  // Make selection drag-movable
  selection.addEventListener('mousedown', (e) => {
    if (host.dataset.candidexProcessing === 'true') {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    if (e.target.closest?.('.candidex-handle')) return;
    e.stopPropagation();
    e.preventDefault();
    activeHandle = 'move';
    dragStartRect = {
      left: parseInt(selection.style.left),
      top: parseInt(selection.style.top),
      width: parseInt(selection.style.width),
      height: parseInt(selection.style.height)
    };
    dragStartMouse = { x: e.clientX, y: e.clientY };
    selection.style.cursor = 'grabbing';
  });

  overlay.addEventListener('mousedown', (e) => {
    if (inAdjustMode || host.dataset.candidexProcessing === 'true') return;
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    selection.style.left = `${startX}px`;
    selection.style.top = `${startY}px`;
    selection.style.width = '0px';
    selection.style.height = '0px';
    selection.style.display = 'block';
    instruction.style.opacity = '0';
  });

  window.addEventListener('mousemove', (e) => {
    if (host.dataset.candidexProcessing === 'true') return;
    if (isSelecting) {
      const currentX = e.clientX;
      const currentY = e.clientY;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selection.style.left = `${left}px`;
      selection.style.top = `${top}px`;
      selection.style.width = `${width}px`;
      selection.style.height = `${height}px`;
    } else if (activeHandle) {
      const dx = e.clientX - dragStartMouse.x;
      const dy = e.clientY - dragStartMouse.y;
      let newLeft = dragStartRect.left;
      let newTop = dragStartRect.top;
      let newWidth = dragStartRect.width;
      let newHeight = dragStartRect.height;

      if (activeHandle === 'move') {
        newLeft = dragStartRect.left + dx;
        newTop = dragStartRect.top + dy;
      } else {
        const resized = applyHandleResize(activeHandle, dragStartRect, dx, dy);
        newLeft = resized.left;
        newTop = resized.top;
        newWidth = resized.width;
        newHeight = resized.height;
      }

      selection.style.left = `${newLeft}px`;
      selection.style.top = `${newTop}px`;
      selection.style.width = `${newWidth}px`;
      selection.style.height = `${newHeight}px`;

      updateToolbarPosition();
    }
  });

  window.addEventListener('mouseup', () => {
    if (host.dataset.candidexProcessing === 'true') return;
    if (isSelecting) {
      isSelecting = false;
      const width = parseInt(selection.style.width);
      const height = parseInt(selection.style.height);

      if (width > 20 && height > 20) {
        inAdjustMode = true;
        overlay.style.cursor = 'default';
        selection.style.cursor = 'grab';
        handles.forEach(h => h.style.display = 'block');
        updateToolbarPosition();
      } else {
        selection.style.display = 'none';
        instruction.style.opacity = '1';
      }
    } else if (activeHandle) {
      if (activeHandle === 'move') {
        selection.style.cursor = 'grab';
      }
      activeHandle = null;
    }
  });

  // Toolbar buttons actions
  toolbar.querySelector('.candidex-btn-recapture').addEventListener('click', (e) => {
    e.stopPropagation();
    inAdjustMode = false;
    overlay.style.cursor = 'crosshair';
    selection.style.display = 'none';
    handles.forEach(h => h.style.display = 'none');
    toolbar.style.display = 'none';
    instruction.style.opacity = '1';
  });

  toolbar.querySelector('.candidex-btn-extract').addEventListener('click', (e) => {
    e.stopPropagation();

    const left = parseInt(selection.style.left);
    const top = parseInt(selection.style.top);
    const width = parseInt(selection.style.width);
    const height = parseInt(selection.style.height);

    // Hide adjust UI
    handles.forEach(h => h.style.display = 'none');
    toolbar.style.display = 'none';
    host.dataset.candidexProcessing = 'true';
    selection.style.cursor = 'default';
    selection.style.pointerEvents = 'none';

    // Hide the extension iframe temporarily if it's visible so it doesn't get caught in the screenshot
    const iframe = document.getElementById(IFRAME_ID);
    let wasOpen = false;
    if (iframe && iframe.style.right === '0px') {
      wasOpen = true;
      iframe.style.opacity = '0';
    }

    const regionText = extractTextFromRegion(host, shadow, left, top, width, height);
    const pageMeta = extractPageMeta();
    const jobLink = resolveJobLink(window.location.href);

    // Setup processing loader inside selection frame
    const loader = document.createElement('div');
    loader.id = 'candidex-crop-loader';
    loader.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background-color: rgba(15, 23, 42, 0.7);
      color: #f8fafc;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 500;
      border-radius: inherit;
      pointer-events: none;
    `;
    loader.innerHTML = `
      <div style="display: flex; gap: 4px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; background-color: #6366f1; border-radius: 50%; animation: cdx-pulse 1.2s infinite ease-in-out;"></div>
        <div style="width: 8px; height: 8px; background-color: #6366f1; border-radius: 50%; animation: cdx-pulse 1.2s infinite ease-in-out 0.2s;"></div>
        <div style="width: 8px; height: 8px; background-color: #6366f1; border-radius: 50%; animation: cdx-pulse 1.2s infinite ease-in-out 0.4s;"></div>
      </div>
      <div>${tCapture('capture.processing')}</div>
      <style>
        @keyframes cdx-pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.4; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      </style>
    `;
    selection.appendChild(loader);

    let captureSettled = false;
    const failCapture = (message) => {
      if (captureSettled) return;
      captureSettled = true;
      showCaptureProcessingError(shadow, host, message);
    };

    const responseTimeoutId = setTimeout(() => {
      failCapture('Capture took too long. Reload the page and try again.');
    }, CAPTURE_RESPONSE_TIMEOUT_MS);

    const finishCaptureRequest = () => {
      if (wasOpen && iframe) iframe.style.opacity = '1';
    };

    setTimeout(() => {
      chrome.runtime
        .sendMessage({
          action: MSG.CAPTURE_AREA,
          rect: {
            x: left,
            y: top,
            width: width,
            height: height,
            devicePixelRatio: window.devicePixelRatio,
          },
          regionText: regionText,
          pageMeta: pageMeta,
          jobLink: jobLink || undefined
        })
        .then((response) => {
          if (captureSettled) return;
          if (response?.success === false) {
            clearTimeout(responseTimeoutId);
            captureSettled = true;
            showCaptureProcessingError(
              shadow,
              host,
              response.error || 'Screenshot capture failed.'
            );
          }
        })
        .catch((err) => {
          clearTimeout(responseTimeoutId);
          failCapture(err?.message || 'Could not reach the extension background.');
        })
        .finally(finishCaptureRequest);
    }, 50);

    host.addEventListener(
      'candidex-capture-settled',
      () => {
        clearTimeout(responseTimeoutId);
        captureSettled = true;
      },
      { once: true }
    );
  });
}