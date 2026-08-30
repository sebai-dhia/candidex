export function extractTextFromRegion(host, shadow, rx, ry, rw, rh) {
  const oldHostPointerEvents = host.style.pointerEvents;
  host.style.pointerEvents = 'none';

  const overlayEl = shadow.getElementById('candidex-capture-overlay');
  const oldOverlayPointer = overlayEl ? overlayEl.style.pointerEvents : '';
  if (overlayEl) overlayEl.style.pointerEvents = 'none';

  const selectionEl = shadow.querySelector('.candidex-selection');
  const oldSelectionPointer = selectionEl ? selectionEl.style.pointerEvents : '';
  if (selectionEl) selectionEl.style.pointerEvents = 'none';

  const texts = [];
  const step = 14;
  const seen = new WeakSet();

  try {
    for (let px = rx; px < rx + rw; px += step) {
      for (let py = ry; py < ry + rh; py += step) {
        const el = document.elementFromPoint(px, py);
        if (!el || seen.has(el)) continue;
        seen.add(el);
        const text = (el.innerText || el.textContent || '').trim();
        if (text && text.length > 1 && text.length < 500) {
          texts.push(text);
        }
      }
    }
  } catch (e) {
    console.error('Error in extractTextFromRegion:', e);
  } finally {
    host.style.pointerEvents = oldHostPointerEvents;
    if (overlayEl) overlayEl.style.pointerEvents = oldOverlayPointer;
    if (selectionEl) selectionEl.style.pointerEvents = oldSelectionPointer;
  }

  return [...new Set(texts)].join('\n').substring(0, 4000);
}

export function extractPageMeta() {
  const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const data = JSON.parse(script.textContent || '');
      const schemas = Array.isArray(data) ? data : [data];
      for (const schema of schemas) {
        if (schema['@type'] === 'JobPosting') {
          return { jsonLd: schema };
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  const getMetaContent = (name) =>
    document.querySelector(`meta[property='${name}'], meta[name='${name}']`)?.content || null;

  return {
    jsonLd: null,
    title: document.title,
    ogTitle: getMetaContent('og:title'),
    ogDescription: getMetaContent('og:description'),
  };
}