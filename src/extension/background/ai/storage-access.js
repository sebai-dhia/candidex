/**
 * Restrict chrome.storage.local to extension pages and the service worker.
 * Content scripts cannot read API keys after this runs.
 * Extension pages (Angular popup/iframe) remain trusted.
 */
export async function lockStorageToTrustedContexts() {
  if (!chrome?.storage?.local?.setAccessLevel) {
    return;
  }

  try {
    await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  } catch (error) {
    console.warn('[Candidex] Unable to lock storage to trusted contexts:', error);
  }
}