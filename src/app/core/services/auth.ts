import { Injectable, signal } from '@angular/core';
import { AuthStrategy } from './auth/auth.strategy';
import { ChromeAuthStrategy } from './auth/chrome-auth.strategy';
import { WebFlowAuthStrategy } from './auth/web-flow-auth.strategy';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  /** Whether the user has a valid cached Google token */
  isConnected = signal(false);

  /** Cached token for the current session */
  private cachedToken: string | null = null;
  private strategy: AuthStrategy;

  constructor() {
    this.strategy = this.determineStrategy();
    
    // On service init, silently check if we already have a cached token
    this.silentCheck();
  }

  /** Detect browser and return the optimal auth strategy */
  private determineStrategy(): AuthStrategy {
    const ua = navigator.userAgent;
    
    // Chromium-based browsers all include "Chrome/" in the user agent,
    // so we must check that it's Chrome AND NOT one of the derivatives.
    const isOpera = ua.includes('OPR/') || ua.includes('Opera/');
    const isEdge = ua.includes('Edg/');
    const isVivaldi = ua.includes('Vivaldi/');
    // @ts-ignore - Brave hides its UA, but exposes a brave object on navigator
    const isBrave = navigator.brave !== undefined;

    const isPureChrome = ua.includes('Chrome/') && !isOpera && !isEdge && !isVivaldi && !isBrave;

    if (isPureChrome) {
      console.log('[Auth] Pure Google Chrome detected -> Using Native Chrome Strategy');
      return new ChromeAuthStrategy();
    }
    
    // Universal fallback for Opera, Edge, Brave, Vivaldi, and future browsers
    console.log('[Auth] Non-Chrome browser detected -> Using Universal Web Flow Strategy');
    return new WebFlowAuthStrategy();
  }

  /** Try to get a token without showing any popup */
  private async silentCheck() {
    try {
      const token = await this.strategy.requestToken(false);
      this.cachedToken = token;
      this.isConnected.set(true);
    } catch {
      // No cached token — user needs to connect
      this.isConnected.set(false);
    }
  }

  /** Show the Google sign-in popup (called once from the Connect screen) */
  async connect(): Promise<void> {
    const token = await this.strategy.requestToken(true);
    this.cachedToken = token;
    this.isConnected.set(true);
  }

  /** Get a valid token — uses cache, never shows a popup during normal use */
  async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    // Try silent refresh first
    try {
      const token = await this.strategy.requestToken(false);
      this.cachedToken = token;
      return token;
    } catch {
      // Token expired or revoked — force re-auth
      this.isConnected.set(false);
      throw new Error('Session expired. Please reconnect.');
    }
  }
}