/**
 * @param {ShadowRoot | DocumentFragment} shadow
 */
export function dismissDuplicateOverlay(shadow) {
  const layer = shadow.querySelector('.candidex-duplicate-layer');
  layer?.remove();

  const card = shadow.querySelector('.candidex-review-card');
  card?.classList.remove('candidex-review-card--dup-locked');

  const saveBtn = shadow.querySelector('.candidex-btn-save');
  if (saveBtn && !saveBtn.dataset.cdxSaved) {
    saveBtn.disabled = false;
  }
}

/**
 * @param {ShadowRoot | DocumentFragment} shadow
 * @returns {boolean}
 */
export function isDuplicateOverlayVisible(shadow) {
  return Boolean(shadow?.querySelector('.candidex-duplicate-layer'));
}