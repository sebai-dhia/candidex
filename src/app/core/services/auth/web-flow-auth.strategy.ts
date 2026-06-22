import { AuthStrategy } from './auth.strategy';

/**
 * Strategy for Opera, Edge, Brave, and other Chromium browsers.
 * Uses `chrome.identity.launchWebAuthFlow` to open a standard web login popup,
 * bypassing the need for a browser-level Google profile.
 */
export class WebFlowAuthStrategy implements AuthStrategy {
  private readonly clientId = '737956559797-8g3krms69sqnvteq4kbub11hfb6qfuro.apps.googleusercontent.com';
  private readonly scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');

  requestToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      const redirectUri = chrome.identity.getRedirectURL();
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${this.scope}`;

      chrome.identity.launchWebAuthFlow(
        { url: authUrl, interactive },
        (responseUrl) => {
          if (chrome.runtime.lastError || !responseUrl) {
            reject(chrome.runtime.lastError?.message || 'Authentication failed or was cancelled');
            return;
          }

          // Extract the token from the URL hash (e.g. #access_token=xyz&token_type=Bearer...)
          const url = new URL(responseUrl);
          const params = new URLSearchParams(url.hash.substring(1));
          const token = params.get('access_token');
          
          if (token) {
            resolve(token);
          } else {
            reject('No access token found in Google response');
          }
        }
      );
    });
  }
}
