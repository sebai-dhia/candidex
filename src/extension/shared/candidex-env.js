/**
 * Build-time flag injected by esbuild `define` (`__CANDIDEX_DEV__`) in
 * scripts/build-extension.mjs. Falls back to `globalThis` for vitest stubs.
 * @returns {boolean}
 */
export function isCandidexDev() {
  // `typeof` is safe when the free identifier is undeclared (vitest / unbundled).
  if (typeof __CANDIDEX_DEV__ !== 'undefined') {
    return __CANDIDEX_DEV__ === true;
  }
  return globalThis.__CANDIDEX_DEV__ === true;
}

/** @param {...unknown} args */
export function candidexDevLog(...args) {
  if (isCandidexDev()) console.log(...args);
}

/** @param {...unknown} args */
export function candidexDevInfo(...args) {
  if (isCandidexDev()) console.info(...args);
}