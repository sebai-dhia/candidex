(function() {
  const IFRAME_ID = 'candidex-overlay-iframe';
  const RESIZER_ID = 'candidex-overlay-resizer';
  let currentWidth = 400; // Default minimum width
  let isFullscreen = false;
  let preFullscreenWidth = 400;
  
  function toggleOverlay() {
    let iframe = document.getElementById(IFRAME_ID);
    let resizer = document.getElementById(RESIZER_ID);
    
    if (iframe) {
      if (iframe.style.right === '0px') {
        // Close it
        iframe.style.right = `-${currentWidth}px`;
        if (resizer) resizer.style.right = `-${currentWidth}px`;
      } else {
        // Open it
        iframe.style.right = '0px';
        if (resizer) {
          resizer.style.right = `${currentWidth}px`;
          resizer.style.display = isFullscreen ? 'none' : 'block';
        }
      }
    } else {
      // Create iframe
      iframe = document.createElement('iframe');
      iframe.id = IFRAME_ID;
      iframe.src = chrome.runtime.getURL('index.html');
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.right = `-${currentWidth}px`;
      iframe.style.width = `${currentWidth}px`;
      iframe.style.height = '100vh';
      iframe.style.zIndex = '2147483647';
      iframe.style.border = 'none';
      iframe.style.boxShadow = '-4px 0 15px rgba(0,0,0,0.1)';
      iframe.style.transition = 'right 0.3s ease-in-out, width 0.3s ease-in-out';
      iframe.style.transform = 'translateZ(0)'; // Hardware acceleration to prevent tearing on resize
      iframe.style.colorScheme = 'light';
      
      // Create resizer handle
      resizer = document.createElement('div');
      resizer.id = RESIZER_ID;
      resizer.style.position = 'fixed';
      resizer.style.top = '0';
      resizer.style.right = `-${currentWidth}px`;
      resizer.style.width = '8px';
      resizer.style.height = '100vh';
      resizer.style.zIndex = '2147483648';
      resizer.style.cursor = 'ew-resize';
      resizer.style.transition = 'right 0.3s ease-in-out';
      
      // Visual indicator for resizer
      let resizerLine = document.createElement('div');
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

      resizer.addEventListener('mouseenter', () => resizerLine.style.backgroundColor = 'rgba(79, 70, 229, 0.5)'); // Indigo
      resizer.addEventListener('mouseleave', () => { if (!isResizing) resizerLine.style.backgroundColor = 'rgba(0,0,0,0.1)'; });
      
      document.body.appendChild(iframe);
      document.body.appendChild(resizer);
      
      // Dragging logic for resizing
      let isResizing = false;
      let startX, startWidth;
      
      function getAbsoluteMax() {
        let screenMax = window.innerWidth * 0.6;
        let absoluteMax = Math.max(screenMax, 800);
        return Math.min(absoluteMax, window.innerWidth * 0.9);
      }

      function updateFullscreenState(isFull) {
        if (isFullscreen !== isFull) {
          isFullscreen = isFull;
          iframe.contentWindow.postMessage({ action: 'FULLSCREEN_STATE_CHANGED', isFullscreen }, '*');
        }
      }
      
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault(); // Prevent text selection from starting
        isResizing = true;
        startX = e.clientX;
        startWidth = currentWidth;
        iframe.style.transition = 'none'; // Disable transition for smooth dragging
        resizer.style.transition = 'none';
        iframe.style.pointerEvents = 'none'; // Prevent iframe from swallowing mouse events
        document.body.style.userSelect = 'none'; // Prevent text selection on the host page
        resizerLine.style.backgroundColor = 'rgba(79, 70, 229, 0.8)';
      });
      
      let isRafScheduled = false;

      window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        
        // Use requestAnimationFrame to sync DOM updates with screen refresh
        if (!isRafScheduled) {
          isRafScheduled = true;
          requestAnimationFrame(() => {
            let diff = startX - e.clientX;
            
            let absoluteMax = getAbsoluteMax();
            let newWidth = Math.min(absoluteMax, Math.max(400, startWidth + diff)); // Enforce 400px min, adaptive max
            currentWidth = newWidth;
            
            iframe.style.width = `${currentWidth}px`;
            resizer.style.right = `${currentWidth}px`;
            
            // Auto-detect fullscreen state
            updateFullscreenState(currentWidth >= absoluteMax);
            
            isRafScheduled = false;
          });
        }
      });
      
      window.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          
          // Force a CSS reflow before re-enabling transition to prevent the release jitter
          void iframe.offsetWidth;
          
          iframe.style.transition = 'right 0.3s ease-in-out, width 0.3s ease-in-out';
          resizer.style.transition = 'right 0.3s ease-in-out';
          iframe.style.pointerEvents = 'auto'; // Re-enable pointer events
          document.body.style.userSelect = ''; // Restore text selection
          resizerLine.style.backgroundColor = 'rgba(0,0,0,0.1)';
        }
      });
      
      // Trigger slide-in slightly after creation
      setTimeout(() => {
        iframe.style.right = '0px';
        resizer.style.right = `${currentWidth}px`;
      }, 10);
    }
  }

  function setFullscreen(full) {
    let iframe = document.getElementById(IFRAME_ID);
    let resizer = document.getElementById(RESIZER_ID);
    if (!iframe) return;

    // Disable transition so it snaps instantly (no flash/gap)
    iframe.style.transition = 'none';
    if (resizer) resizer.style.transition = 'none';

    isFullscreen = full;
    if (isFullscreen) {
      preFullscreenWidth = currentWidth;
      
      let screenMax = window.innerWidth * 0.6;
      let absoluteMax = Math.max(screenMax, 800);
      absoluteMax = Math.min(absoluteMax, window.innerWidth * 0.9);
      
      currentWidth = absoluteMax;
      iframe.style.width = `${currentWidth}px`;
      if (resizer) {
        resizer.style.right = `${currentWidth}px`;
        resizer.style.display = 'block'; // Ensure resizer is visible so they can drag back
      }
    } else {
      currentWidth = preFullscreenWidth;
      iframe.style.width = `${currentWidth}px`;
      if (resizer) {
        resizer.style.right = `${currentWidth}px`;
        resizer.style.display = 'block';
      }
    }

    // Inform Angular in case it was called programmatically from somewhere else (redundant but safe)
    iframe.contentWindow.postMessage({ action: 'FULLSCREEN_STATE_CHANGED', isFullscreen }, '*');

    // Force a CSS reflow so the browser applies the width change instantly
    // BEFORE we re-enable the transition. This completely eliminates the jitter.
    void iframe.offsetWidth;

    // Re-enable transition for future open/close slides
    iframe.style.transition = 'right 0.3s ease-in-out, width 0.3s ease-in-out';
    if (resizer) resizer.style.transition = 'right 0.3s ease-in-out';
  }

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'TOGGLE_OVERLAY') {
      toggleOverlay();
    }
  });

  // Listen for messages from the Angular app inside the iframe
  window.addEventListener('message', (event) => {
    if (!event.data) return;
    
    if (event.data.action === 'CLOSE_OVERLAY') {
      let iframe = document.getElementById(IFRAME_ID);
      let resizer = document.getElementById(RESIZER_ID);
      if (iframe && iframe.style.right === '0px') {
        iframe.style.right = `-${currentWidth}px`;
        if (resizer) resizer.style.right = `-${currentWidth}px`;
      }
    } else if (event.data.action === 'TOGGLE_FULLSCREEN') {
      setFullscreen(event.data.isFullscreen);
    }
  });

  // UX Improvement: Allow Escape key to close the overlay from the host page
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      let iframe = document.getElementById(IFRAME_ID);
      if (iframe && iframe.style.right === '0px') {
        let resizer = document.getElementById(RESIZER_ID);
        iframe.style.right = `-${currentWidth}px`;
        if (resizer) resizer.style.right = `-${currentWidth}px`;
      }
    }
  });
})();
