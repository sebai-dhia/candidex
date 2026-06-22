chrome.action.onClicked.addListener((tab) => {
  if (tab.id && tab.url) {
    // Prevent execution on restricted URLs
    const restrictedProtocols = ['chrome:', 'edge:', 'opera:', 'about:', 'chrome-extension:'];
    const isRestricted = restrictedProtocols.some(protocol => tab.url.startsWith(protocol));

    if (isRestricted) {
      console.warn('Candidex cannot be opened on restricted browser pages. Please try on a normal website.');
      return;
    }

    chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' }).catch((err) => {
      console.warn('Content script not ready, injecting now...');
      
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_OVERLAY' });
      }).catch(e => console.error("Script injection failed:", e));
    });
  }
});
