import { Injectable, inject } from '@angular/core';

import { CUSTOM_OPTION } from '../../constants/application-options.constants';
import { canonicalizePlatformLabel, platformIdentityKey, preferPlatformLabel } from '../../utils/platform.utils';
import { ChromeStorageService } from '../../../infrastructure/chrome/chrome-storage.service';

type CustomOptionsStorageKey = 'customPlatforms' | 'customCountries';

@Injectable({providedIn: 'root'})
export class CustomOptionsStorageService {
  private readonly storage = inject(ChromeStorageService);

  async getPlatforms(baseOptions: readonly string[]): Promise<string[]> {
    const options = await this.getOptions('customPlatforms', baseOptions);
    return this.dedupePlatformOptions(options);
  }

  getCountries(baseOptions: readonly string[]): Promise<string[]> {
    return this.getOptions('customCountries', baseOptions);
  }

  savePlatform(platformName: string, currentOptions: readonly string[]): Promise<void> {
    return this.saveOption('customPlatforms', canonicalizePlatformLabel(platformName),currentOptions);
  }

  saveCountry(countryName: string, currentOptions: readonly string[]): Promise<void> {
    return this.saveOption('customCountries', countryName, currentOptions);
  }

  private async getOptions(storageKey: CustomOptionsStorageKey, baseOptions: readonly string[]): Promise<string[]> {
    const customOptions = await this.storage.get<string[]>(storageKey);
    if (!Array.isArray(customOptions)) return [...baseOptions];

    const optionsWithoutCustom = baseOptions.filter((option) => option !== CUSTOM_OPTION);
    const newOptions = customOptions.filter(
      (option) => !optionsWithoutCustom.some((base) => this.sameOption(base, option))
    );

    return [...optionsWithoutCustom, ...newOptions, CUSTOM_OPTION];
  }

  private async saveOption(storageKey: CustomOptionsStorageKey, optionName: string, currentOptions: readonly string[]): Promise<void> {
    const cleanName = optionName.trim().replace(/\s+/g, ' ');
    if (!cleanName || currentOptions.some((option) => this.sameOption(option, cleanName))) return;

    const customOptions = (await this.storage.get<string[]>(storageKey)) || [];
    if (customOptions.some((option) => this.sameOption(option, cleanName))) return;

    await this.storage.set({ [storageKey]: [...customOptions, cleanName] });
  }

  /** Collapse case/spacing duplicates in the platform dropdown list. */
  private dedupePlatformOptions(options: string[]): string[] {
    const map = new Map<string, string>();
    const order: string[] = [];

    for (const option of options) {
      if (option === CUSTOM_OPTION) continue;
      const key = platformIdentityKey(option);
      if (!key) continue;

      if (map.has(key)) {
        map.set(key, preferPlatformLabel(map.get(key)!, option));
      } else {
        map.set(key, canonicalizePlatformLabel(option));
        order.push(key);
      }
    }

    return [...order.map((key) => map.get(key)!), CUSTOM_OPTION];
  }

  private sameOption(firstOption: string, secondOption: string): boolean {
    return (
      firstOption.trim().replace(/\s+/g, ' ').toLowerCase() ===
      secondOption.trim().replace(/\s+/g, ' ').toLowerCase()
    );
  }
}