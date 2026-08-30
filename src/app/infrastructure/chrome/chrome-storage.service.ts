import { Injectable } from '@angular/core';

type StorageArea = 'local' | 'session';

@Injectable({providedIn: 'root'})
export class ChromeStorageService {
  get<T>(key: string, area: StorageArea = 'local'): Promise<T | undefined> {
    const storage = this.getArea(area);
    if (!storage) return Promise.resolve(undefined);

    return new Promise((resolve, reject) => {
      storage.get([key], (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(result[key] as T | undefined);
      });
    });
  }

  getMany<T extends object>(keys: string[], area: StorageArea = 'local'): Promise<Partial<T>> {
    const storage = this.getArea(area);
    if (!storage) return Promise.resolve({});

    return new Promise((resolve, reject) => {
      storage.get(keys, (result) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve(result as Partial<T>);
      });
    });
  }

  set(items: Record<string, unknown>, area: StorageArea = 'local'): Promise<void> {
    const storage = this.getArea(area);
    if (!storage) return Promise.resolve();

    return new Promise((resolve, reject) => {
      storage.set(items, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve();
      });
    });
  }

  remove(keys: string | string[], area: StorageArea = 'local'): Promise<void> {
    const storage = this.getArea(area);
    if (!storage) return Promise.resolve();

    return new Promise((resolve, reject) => {
      storage.remove(keys, () => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message));
          return;
        }

        resolve();
      });
    });
  }

  /** Read from session first, then local. */
  async getFromEither<T>(key: string): Promise<T | undefined> {
    const sessionValue = await this.get<T>(key, 'session');
    if (sessionValue !== undefined) return sessionValue;
    return this.get<T>(key, 'local');
  }

  /** Write to one area and remove from the other. */
  async setExclusive(key: string, value: unknown, area: StorageArea): Promise<void> {
    const other: StorageArea = area === 'session' ? 'local' : 'session';
    await this.remove(key, other);
    await this.set({ [key]: value }, area);
  }

  /** Remove a key from both storage areas. */
  async removeFromBoth(key: string): Promise<void> {
    await this.remove(key, 'local');
    await this.remove(key, 'session');
  }

  private getArea(area: StorageArea): chrome.storage.StorageArea | null {
    if (typeof chrome === 'undefined') return null;
    if (area === 'session') {
      return chrome.storage?.session ?? null;
    }
    return chrome.storage?.local ?? null;
  }

  private isAvailable(): boolean {
    return typeof chrome !== 'undefined' && !!chrome.storage?.local;
  }
}