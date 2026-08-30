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

export function showCaptureProcessingError(shadow, host, message) {
  const loader = shadow.getElementById('candidex-crop-loader');
  if (loader) {
    loader.innerHTML = `
      <div style="text-align: center; padding: 0 12px;">
        <div style="color: #fca5a5; font-weight: 600; margin-bottom: 6px;">Capture failed</div>
        <div style="color: #e2e8f0; font-size: 0.82rem; line-height: 1.4;">${message}</div>
        <button type="button" id="candidex-capture-retry" style="
          margin-top: 12px;
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          background: #6366f1;
          color: white;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        ">Try again</button>
      </div>
    `;

    loader.querySelector('#candidex-capture-retry')?.addEventListener('click', (e) => {
      e.stopPropagation();
      resetCaptureProcessingState(shadow, host);
    });
    return;
  }

  resetCaptureProcessingState(shadow, host);
}