/**
 * Self-contained (it is also serialized into the page by chrome.scripting):
 * the http(s) iframes of the current document with their viewport boxes.
 */
export function listIframes() {
  return Array.from(document.querySelectorAll('iframe[src]'))
    .map((el) => {
      const box = el.getBoundingClientRect();
      return { src: el.src, left: box.left, top: box.top, right: box.right, bottom: box.bottom };
    })
    .filter((f) => /^https?:/.test(f.src) && f.right > f.left && f.bottom > f.top);
}

/** Cross-origin iframe sites of this page as permission patterns ("https://host/*"). */
export function crossOriginIframePatterns() {
  const sites = new Set();
  for (const frame of listIframes()) {
    try {
      const { origin } = new URL(frame.src);
      if (origin !== location.origin) sites.add(`${origin}/*`);
    } catch {
      // ignore unparsable src
    }
  }
  return [...sites];
}