const MAX_ATTRS = 20;

/**
 * Text of everything visible inside the region, in reading order. Walks the real DOM
 * (not points on screen) so it also reaches open shadow roots, where many job boards
 * render their content. `host` is our own overlay and is skipped.
 */
export function extractTextFromRegion(host, rx, ry, rw, rh) {
  const region = { left: rx, top: ry, right: rx + rw, bottom: ry + rh };
  const lines = [];
  const attrs = [];
  const range = document.createRange();

  const visit = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node === host || (node.nodeType === Node.ELEMENT_NODE && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.tagName))
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT
    });
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.shadowRoot) visit(node.shadowRoot);
        // Custom elements often carry job data (address, workplace type) in attributes.
        if (node.tagName.includes('-') && attrs.length < MAX_ATTRS && overlaps(node.getBoundingClientRect(), region)) {
          for (const attr of node.attributes) {
            if (attr.value.length > 2 && attr.value.length < 300 && !/^(class|style|id)$/i.test(attr.name)) {
              attrs.push(`${attr.name}: ${attr.value}`);
            }
          }
        }
        continue;
      }
      const text = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (text.length < 2) continue;
      range.selectNodeContents(node);
      const hit = Array.from(range.getClientRects()).find((r) => r.width > 0 && r.height > 0 && overlaps(r, region));
      if (hit) lines.push({ text, top: hit.top, left: hit.left });
    }
  };

  try {
    visit(document.body);
  } catch (e) {
    console.error('Error in extractTextFromRegion:', e);
  }

  lines.sort((x, y) => Math.round(x.top / 4) - Math.round(y.top / 4) || x.left - y.left);
  // Attribute data goes first so the model's input length cap never cuts it off.
  return [...new Set([...attrs, ...lines.map((l) => l.text)])].join('\n').substring(0, 4000);
}

function overlaps(r, region) {
  return r.right > region.left && r.left < region.right && r.bottom > region.top && r.top < region.bottom;
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