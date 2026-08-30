import messages from './messages.json';
import { MAX_PATH_LENGTH, MAX_TEXT_FIELD_LENGTH } from './ports.js';

const MSG = messages;

/**
 * @param {unknown} value
 * @param {number} max
 * @returns {string | null}
 */
function asBoundedString(value, max) {
  if (typeof value !== 'string') return null;
  if (value.length > max) return null;
  return value;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function optionalText(value) {
  if (value == null) return '';
  if (typeof value !== 'string') return '';
  return value.slice(0, MAX_TEXT_FIELD_LENGTH);
}

/**
 * @param {unknown} payload
 * @returns {{
 *   role: string,
 *   company: string,
 *   country: string,
 *   workType: string,
 *   platform: string,
 *   notes: string,
 *   jobLink: string,
 *   allowDuplicate: boolean,
 * } | null}
 */
export function parseAiCapturePayload(payload) {
  if (!payload || typeof payload !== 'object') return null;

  const data = /** @type {Record<string, unknown>} */ (payload);
  const role = optionalText(data.role).trim();
  const company = optionalText(data.company).trim();
  if (!role || !company) return null;

  return {
    role,
    company,
    country: optionalText(data.country).trim(),
    workType: optionalText(data.workType).trim(),
    platform: optionalText(data.platform).trim(),
    notes: optionalText(data.notes).trim(),
    jobLink: optionalText(data.jobLink).trim(),
    allowDuplicate: !!data.allowDuplicate,
  };
}

/**
 * @param {unknown} path
 * @returns {string | null}
 */
export function parseNavigatePath(path) {
  const value = asBoundedString(path, MAX_PATH_LENGTH);
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.includes('://') || value.includes('\\')) return null;
  return value;
}

/**
 * Validate a panel←→content runtime message.
 * Returns a normalized message or null when rejected.
 * @param {unknown} raw
 * @returns {Record<string, unknown> | null}
 */
export function parseRuntimeMessage(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const message = /** @type {Record<string, unknown>} */ (raw);
  const action = message.action;
  if (typeof action !== 'string') return null;

  switch (action) {
    case MSG.SAVE_AI_JOB: {
      const payload = parseAiCapturePayload(message.payload);
      if (!payload) return null;
      return { action, payload };
    }
    case MSG.SAVE_AI_JOB_RESPONSE: {
      return {
        action,
        success: !!message.success,
        duplicate: !!message.duplicate,
        error: optionalText(message.error),
        existing:
          message.existing && typeof message.existing === 'object'
            ? {
                id: optionalText(/** @type {Record<string, unknown>} */ (message.existing).id),
                role: optionalText(/** @type {Record<string, unknown>} */ (message.existing).role),
                company: optionalText(
                  /** @type {Record<string, unknown>} */ (message.existing).company
                ),
                date_applied: optionalText(
                  /** @type {Record<string, unknown>} */ (message.existing).date_applied
                )
              }
            : undefined
      };
    }
    case MSG.NAVIGATE: {
      const path = parseNavigatePath(message.path);
      if (!path) return null;
      return { action, path };
    }
    case MSG.FULLSCREEN_STATE_CHANGED:
      return { action, isFullscreen: !!message.isFullscreen };
    case MSG.TOGGLE_FULLSCREEN:
      return { action, isFullscreen: !!message.isFullscreen };
    case MSG.OVERLAY_OPENED:
    case MSG.CLOSE_OVERLAY:
    case MSG.START_AI_CAPTURE:
    case MSG.ESCAPE_PRESSED:
    case MSG.PANEL_HELLO:
    case MSG.CONTENT_HELLO:
      return { action };
    default:
      return null;
  }
}