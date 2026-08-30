import { CANDIDEX_WEB_FLOW_OAUTH_CLIENT_ID } from '../../config/oauth-clients';
import { AuthStrategy } from './auth.strategy';

/**
 * Strategy for Opera, Edge, Brave, and other Chromium browsers.
 * Uses `chrome.identity.launchWebAuthFlow` to open a standard web login popup,
 * bypassing the need for a browser-level Google profile.
 */
export class WebFlowAuthStrategy implements AuthStrategy {
  private readonly clientId = CANDIDEX_WEB_FLOW_OAUTH_CLIENT_ID;
  private readonly scope = encodeURIComponent('https://www.googleapis.com/auth/drive.file');

  requestToken(interactive: boolean): Promise<string> {
    if (!this.clientId) {
      return Promise.reject(
        new Error('Missing CANDIDEX_WEB_FLOW_OAUTH_CLIENT_ID. Copy .env.example to .env and rebuild.')
      )
    }

    return new Promise((resolve, reject) => {
      const redirectUri = chrome.identity.getRedirectURL();
      let authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${this.clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${this.scope}`;
      
      if (interactive) {
        authUrl += '&prompt=select_account';
      }

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

  async clearToken(token: string): Promise<void> {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (e) {
      console.warn('Failed to revoke token:', e);
    }
  }
}