import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  /** Whether the user has a valid cached Google token */
  isConnected = signal(false);

  /** Cached token for the current session */
  private cachedToken: string | null = null;

  constructor() {
    // On service init, silently check if we already have a cached token
    this.silentCheck();
  }

  /** Try to get a token without showing any popup */
  private async silentCheck() {
    try {
      const token = await this.requestToken(false);
      this.cachedToken = token;
      this.isConnected.set(true);
    } catch {
      // No cached token — user needs to connect
      this.isConnected.set(false);
    }
  }

  /** Show the Google sign-in popup (called once from the Connect screen) */
  async connect(): Promise<void> {
    const token = await this.requestToken(true);
    this.cachedToken = token;
    this.isConnected.set(true);
  }

  /** Get a valid token — uses cache, never shows a popup during normal use */
  async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    // Try silent refresh first
    try {
      const token = await this.requestToken(false);
      this.cachedToken = token;
      return token;
    } catch {
      // Token expired or revoked — force re-auth
      this.isConnected.set(false);
      throw new Error('Session expired. Please reconnect.');
    }
  }

  /** Low-level Chrome identity call */
  private requestToken(interactive: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else if (token) {
          resolve(token);
        } else {
          reject('No token returned');
        }
      });
    });
  }
}