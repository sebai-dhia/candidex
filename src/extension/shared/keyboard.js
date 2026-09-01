/**
 * @param {HTMLElement} el
 * @param {(event: KeyboardEvent) => boolean | void} handler
 * @param {{ ignoreTextarea?: boolean }} [options]
 * @returns {() => void}
 */
export function onEnterSubmit(el, handler, { ignoreTextarea = true } = {}) {
  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.code !== 'Enter') return;

    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
    if (ignoreTextarea && target.tagName === 'TEXTAREA') return;
    if (target.tagName === 'INPUT') {
      const type = target.type;
      if (type === 'date' || type === 'checkbox' || type === 'button') return;
    }

    if (handler(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  el.addEventListener('keydown', onKeyDown);
  return () => el.removeEventListener('keydown', onKeyDown);
}

/**
 * @param {HTMLElement} el
 * @param {(event: KeyboardEvent) => boolean | void} handler
 * @returns {() => void}
 */
export function onEscape(el, handler) {
  const onKeyDown = (event) => {
    if (event.key !== 'Escape' && event.code !== 'Escape') return;

    if (handler(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  el.addEventListener('keydown', onKeyDown);
  return () => el.removeEventListener('keydown', onKeyDown);
}