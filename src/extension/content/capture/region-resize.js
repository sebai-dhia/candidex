/**
 * Apply corner-handle resize deltas to a selection rect.
 * Handles use tl/tr/br/bl (not compass letters) to match DOM dataset values.
 * @param {'tl'|'tr'|'br'|'bl'} handle
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {number} dx
 * @param {number} dy
 */
export function applyHandleResize(handle, rect, dx, dy) {
  let { left, top, width, height } = rect;

  if (handle === 'tr' || handle === 'br') {
    width = Math.max(20, rect.width + dx);
  }
  if (handle === 'tl' || handle === 'bl') {
    const potentialWidth = rect.width - dx;
    if (potentialWidth >= 20) {
      left = rect.left + dx;
      width = potentialWidth;
    }
  }
  if (handle === 'bl' || handle === 'br') {
    height = Math.max(20, rect.height + dy);
  }
  if (handle === 'tl' || handle === 'tr') {
    const potentialHeight = rect.height - dy;
    if (potentialHeight >= 20) {
      top = rect.top + dy;
      height = potentialHeight;
    }
  }

  return { left, top, width, height };
}