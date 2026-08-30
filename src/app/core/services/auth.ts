import { Injectable, inject, signal } from '@angular/core';

import { AuthStrategy } from './auth/auth.strategy';
import { ChromeAuthStrategy } from '../../infrastructure/chrome/chrome-auth.strategy';
import { WebFlowAuthStrategy } from './auth/web-flow-auth.strategy';
import { ChromeStorageService } from '../../infrastructure/chrome/chrome-storage.service';

interface GoogleTokenCache {
  googleToken?: string;
  googleTokenExpiry?: number;
}

interface GoogleTokenStorageShape {
  googleAuthCache?: GoogleTokenCache;
  googleToken?: string;
  googleTokenExpiry?: number;
}

@Injectable({providedIn: 'root'})
export class Auth {
  private readonly storage = inject(ChromeStorageService);

  /** Whether the user has a valid cached Google token */
  isConnected = signal(false);
  /** Whether the auth service is currently initializing */
  isInitializing = signal(true);

  /** Cached token for the current session */
  private cachedToken: string | null = null;
  private strategy: AuthStrategy;

  constructor() {
    this.strategy = this.determineStrategy();
    this.silentCheck();  // On service init, silently check if we already have a cached token
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
      return new ChromeAuthStrategy();
    }

    // Universal fallback for Opera, Edge, Brave, Vivaldi, and future browsers
    return new WebFlowAuthStrategy();
  }

  /**
   * Race a promise against a timeout.
   * Guards chrome.identity calls that can hang indefinitely when the user
   * is in a partially-signed-in or ambiguous token state.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`[Auth] ${label} timed out after ${ms}ms`)), ms)
      )
    ]);
  }

  /** Try to get a token without showing any popup */
  private async silentCheck() {
    this.isInitializing.set(true);
    try {
      const stored = await this.storage.getMany<GoogleTokenStorageShape>(
        ['googleAuthCache', 'googleToken', 'googleTokenExpiry'],
        'session'
      );
      const data = stored.googleAuthCache || {
        googleToken: stored.googleToken,
        googleTokenExpiry: stored.googleTokenExpiry,
      };
      const now = Date.now();

      if (data?.googleToken && data.googleTokenExpiry && data.googleTokenExpiry > now) {
        this.cachedToken = data.googleToken;
        this.isConnected.set(true);
        return;
      }

      this.cachedToken = null;
      this.isConnected.set(false);
    } catch {
      // No cached token or timed out: user needs to connect
      this.isConnected.set(false);
    } finally {
      this.isInitializing.set(false);
    }
  }

  /** Show the Google sign-in popup */
  async connect(): Promise<void> {
    const token = await this.strategy.requestToken(true);
    this.cachedToken = token;
    await this.saveTokenCache(token);
    this.isConnected.set(true);
  }

  /** Disconnect user and clear token cache */
  async disconnect(): Promise<void> {
    if (this.cachedToken) {
      await this.strategy.clearToken(this.cachedToken);
      this.cachedToken = null;
    }
    await this.clearTokenCache();
    this.isConnected.set(false);
  }

  /** Get a valid token: uses cache, never shows a popup during normal use */
  async getToken(): Promise<string> {
    if (this.cachedToken) return this.cachedToken;

    try {
      const token = await this.withTimeout(this.strategy.requestToken(false), 8000, 'getToken');
      this.cachedToken = token;
      await this.saveTokenCache(token);
      return token;
    } catch {
      this.isConnected.set(false);
      throw new Error('Session expired. Please reconnect.');
    }
  }

  private async saveTokenCache(token: string): Promise<void> {
    await this.storage.remove(['googleAuthCache', 'googleToken', 'googleTokenExpiry'], 'local');
    return this.storage.set(
      {
        googleAuthCache: {
          googleToken: token,
          googleTokenExpiry: Date.now() + 55 * 60 * 1000,
        } satisfies GoogleTokenCache,
      },
      'session'
    );
  }

  private async clearTokenCache(): Promise<void> {
    await this.storage.remove(['googleAuthCache', 'googleToken', 'googleTokenExpiry'], 'session');
    await this.storage.remove(['googleAuthCache', 'googleToken', 'googleTokenExpiry'], 'local');
  }
}