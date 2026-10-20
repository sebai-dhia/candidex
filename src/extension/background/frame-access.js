/**
 * Cross-origin iframes (ATS embeds such as people-jobs.com → revolutpeople.com)
 * are unreadable from the page: only a script running inside the frame can see
 * its text, and Chrome allows that only with host permission for the frame's site.
 * The permission is optional and requested per site by the panel (an extension
 * page) when the user clicks capture — the user gesture Chrome requires.
 */
import { listIframes } from '../shared/list-iframes.js';

/** Runs in every frame; only subframes whose origin matches an iframe answer. */
function readFrameText(rect, iframes) {
  if (window === window.top) return null;
  const mine = iframes.find((f) => new URL(f.src).origin === location.origin);
  if (!mine) return null;

  const inner = {
    left: Math.max(rect.left, mine.left) - mine.left,
    top: Math.max(rect.top, mine.top) - mine.top,
    right: Math.min(rect.right, mine.right) - mine.left,
    bottom: Math.min(rect.bottom, mine.bottom) - mine.top
  };
  if (inner.right <= inner.left || inner.bottom <= inner.top) return null;

  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const lines = [];
  let largest = null;
  let smallest = Infinity;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.replace(/\s+/g, ' ').trim();
    if (text.length < 2 || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(node.parentElement?.tagName)) continue;
    range.selectNodeContents(node);
    const hit = Array.from(range.getClientRects()).find(
      (r) => r.width > 0 && r.height > 0 && r.right > inner.left && r.left < inner.right && r.bottom > inner.top && r.top < inner.bottom
    );
    if (!hit) continue;
    lines.push({ text, top: hit.top, left: hit.left });
    // Job boards often render the title as a styled span, not a heading: size is the reliable cue.
    const size = parseFloat(getComputedStyle(node.parentElement).fontSize) || 0;
    if (!largest || size > largest.size) largest = { text, size };
    smallest = Math.min(smallest, size);
  }
  lines.sort((a, b) => a.top - b.top || a.left - b.left);
  return {
    text: lines.map((l) => l.text).join('\n'),
    title: document.title,
    largest: largest && largest.size > smallest ? largest.text : null
  };
}

/** Sites of the tab's cross-origin iframes, as permission patterns. */
export async function crossOriginFrameOrigins(tab) {
  try {
    const [{ result: iframes }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: listIframes
    });
    const pageOrigin = new URL(tab.url).origin;
    return [...new Set((iframes || []).map((f) => new URL(f.src).origin))]
      .filter((origin) => origin !== pageOrigin)
      .map((origin) => `${origin}/*`);
  } catch (error) {
    console.warn('[Candidex] Could not list iframes:', error?.message || error);
    return [];
  }
}

/** Text, document title and largest text of the cross-origin iframes under `rect` (viewport coords), when access was granted. */
export async function readIframeText(tabId, rect, iframes) {
  const empty = { text: '', title: null, largest: null };
  const isBox = (b) => b && ['left', 'top', 'right', 'bottom'].every((k) => Number.isFinite(b[k]));
  const safeIframes = (Array.isArray(iframes) ? iframes : []).filter(
    (f) => isBox(f) && typeof f.src === 'string' && /^https?:\/\//.test(f.src)
  );
  if (!isBox(rect) || safeIframes.length === 0) return empty;
  iframes = safeIframes;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: readFrameText,
      args: [rect, iframes]
    });
    const frames = results.map((r) => r.result).filter(Boolean);
    return {
      text: frames.map((f) => f.text).filter(Boolean).join('\n'),
      title: frames.find((f) => f.title)?.title || null,
      largest: frames.find((f) => f.largest)?.largest || null
    };
  } catch (error) {
    console.warn('[Candidex] Could not read iframe text:', error?.message || error);
    return empty;
  }
}
