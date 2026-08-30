import { AuthStrategy } from '../../core/services/auth/auth.strategy';

/**
 * Strategy for standard Google Chrome.
 * Uses the built-in `chrome.identity.getAuthToken` which seamlessly integrates
 * with the user's browser-level Google account profile.
 */
export class ChromeAuthStrategy implements AuthStrategy {
  requestToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (result: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
          return;
        }

        // Manifest V3 returns a GetAuthTokenResult object { token: string }
        // Older versions return a plain string
        const token = typeof result === 'string' ? result : result?.token;

        if (token) {
          resolve(token);
        } else {
          reject('No token returned from Chrome Identity.');
        }
      });
    });
  }

  clearToken(token: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        resolve();
      });
    });
  }
}