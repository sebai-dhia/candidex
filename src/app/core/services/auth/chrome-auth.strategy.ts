import { AuthStrategy } from './auth.strategy';

/**
 * Strategy for standard Google Chrome.
 * Uses the built-in `chrome.identity.getAuthToken` which seamlessly integrates
 * with the user's browser-level Google account profile.
 */
export class ChromeAuthStrategy implements AuthStrategy {
  requestToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else if (token) {
          resolve(token);
        } else {
          reject('No token returned from Chrome Identity.');
        }
      });
    });
  }
}
