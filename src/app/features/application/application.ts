import { Component, inject, OnInit, HostListener, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { GoogleSheets } from '../../core/services/google-sheets';
import {
  APPLICATION_COUNTRIES,
  APPLICATION_PLATFORMS,
  APPLICATION_STATUSES,
  CUSTOM_OPTION,
  DEFAULT_APPLICATION_VALUES,
  WORK_TYPES,
} from '../../core/constants/application-options.constants';

type DropdownStateKey = 'platformOpen' | 'statusOpen' | 'countryOpen' | 'workTypeOpen';
type CustomOptionsStorageKey = 'customPlatforms' | 'customCountries';

@Component({
  selector: 'app-application',
  imports: [ReactiveFormsModule],
  templateUrl: './application.component.html',
  styleUrl: './application.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Application implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly sheets = inject(GoogleSheets);

  applicationForm!: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Controlled lists
  platforms: string[] = [...APPLICATION_PLATFORMS];
  statuses: string[] = [...APPLICATION_STATUSES];
  countries: string[] = [...APPLICATION_COUNTRIES];
  workTypes: string[] = [...WORK_TYPES];
  showCustomPlatform = false;
  showCustomCountry = false;

  // Custom dropdown state
  platformOpen = false;
  statusOpen = false;
  countryOpen = false;
  workTypeOpen = false;

  private readonly customPlatformStorageKey = 'customPlatforms';
  private readonly customCountryStorageKey = 'customCountries';

  // Close dropdowns when clicking outside
  @HostListener('document:click')
  onDocumentClick() {
    this.platformOpen = false;
    this.statusOpen = false;
    this.countryOpen = false;
    this.workTypeOpen = false;
  }

  togglePlatform(event: Event) {
    this.toggleDropdown('platformOpen', event);
  }

  selectPlatform(value: string, event: Event) {
    this.selectOption('platform', value, 'platformOpen', event);
  }

  toggleStatus(event: Event) {
    this.toggleDropdown('statusOpen', event);
  }

  selectStatus(value: string, event: Event) {
    this.selectOption('status', value, 'statusOpen', event);
  }

  toggleCountry(event: Event) {
    this.toggleDropdown('countryOpen', event);
  }

  selectCountry(value: string, event: Event) {
    this.selectOption('country', value, 'countryOpen', event);
  }

  toggleWorkType(event: Event) {
    this.toggleDropdown('workTypeOpen', event);
  }

  selectWorkType(value: string, event: Event) {
    this.selectOption('work_type', value, 'workTypeOpen', event);
  }

  private toggleDropdown(dropdown: DropdownStateKey, event: Event) {
    event.stopPropagation();
    const wasOpen = this[dropdown];
    this.closeAllDropdowns();
    this[dropdown] = !wasOpen;
  }

  private selectOption(controlName: string, value: string, dropdown: DropdownStateKey, event: Event) {
    event.stopPropagation();
    this.applicationForm.get(controlName)!.setValue(value);
    this[dropdown] = false;
  }

  private closeAllDropdowns() {
    this.platformOpen = false;
    this.statusOpen = false;
    this.countryOpen = false;
    this.workTypeOpen = false;
  }

  ngOnInit() {
    const defaultValues = this.getDefaultFormValues();

    this.applicationForm = this.fb.group({
      role: [defaultValues.role, Validators.required],
      company: [defaultValues.company, Validators.required],
      platform: [defaultValues.platform, Validators.required],
      custom_platform: [defaultValues.custom_platform],
      job_link: [defaultValues.job_link],
      company_link: [defaultValues.company_link],
      country: [defaultValues.country, Validators.required],
      custom_country: [defaultValues.custom_country],
      work_type: [defaultValues.work_type, Validators.required],
      date_applied: [defaultValues.date_applied, Validators.required],
      status: [defaultValues.status, Validators.required],
      notes: [defaultValues.notes],
    });

    this.watchCustomOption('platform', 'custom_platform', (visible) => {
      this.showCustomPlatform = visible;
    });
    this.watchCustomOption('country', 'custom_country', (visible) => {
      this.showCustomCountry = visible;
    });

    this.loadCustomPlatforms();
    this.loadCustomCountries();
    this.detectUserCountry();
  }

  private getDefaultFormValues() {
    return {
      role: '',
      company: '',
      platform: DEFAULT_APPLICATION_VALUES.PLATFORM,
      custom_platform: '',
      job_link: '',
      company_link: '',
      country: DEFAULT_APPLICATION_VALUES.COUNTRY,
      custom_country: '',
      work_type: DEFAULT_APPLICATION_VALUES.WORK_TYPE,
      date_applied: this.getDateInputValue(),
      status: DEFAULT_APPLICATION_VALUES.STATUS,
      notes: '',
    };
  }

  private getDateInputValue(): string {
    return new Date().toISOString().split('T')[0];
  }

  private watchCustomOption(
    sourceControlName: string,
    customControlName: string,
    setVisibility: (visible: boolean) => void,
  ) {
    this.applicationForm.get(sourceControlName)!.valueChanges.subscribe((value: string) => {
      const customControl = this.applicationForm.get(customControlName)!;
      const isCustomOption = value === CUSTOM_OPTION;

      setVisibility(isCustomOption);

      if (isCustomOption) {
        customControl.setValidators(Validators.required);
      } else {
        customControl.clearValidators();
        customControl.setValue('');
      }

      customControl.updateValueAndValidity();
    });
  }

  loadCustomPlatforms() {
    this.loadCustomOptions(
      this.customPlatformStorageKey,
      () => this.platforms,
      (options) => {
        this.platforms = options;
      },
    );
  }

  saveCustomPlatform(platformName: string) {
    this.saveCustomOption(this.customPlatformStorageKey, platformName, this.platforms);
  }

  loadCustomCountries() {
    this.loadCustomOptions(
      this.customCountryStorageKey,
      () => this.countries,
      (options) => {
        this.countries = options;
      },
    );
  }

  saveCustomCountry(countryName: string) {
    this.saveCustomOption(this.customCountryStorageKey, countryName, this.countries);
  }

  private loadCustomOptions(
    storageKey: CustomOptionsStorageKey,
    getOptions: () => string[],
    setOptions: (options: string[]) => void,
  ) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([storageKey], (result: any) => {
        const customOptions = result[storageKey] as string[] | undefined;
        if (!Array.isArray(customOptions)) return;

        const baseOptions = getOptions().filter((option) => option !== CUSTOM_OPTION);
        const newOptions = customOptions.filter(
          (option) => !baseOptions.some((base) => this.sameOption(base, option)),
        );

        if (newOptions.length > 0) {
          setOptions([...baseOptions, ...newOptions, CUSTOM_OPTION]);
        }
      });
    }
  }

  private saveCustomOption(
    storageKey: CustomOptionsStorageKey,
    optionName: string,
    currentOptions: string[],
  ) {
    const cleanName = optionName.trim();
    if (!cleanName || currentOptions.some((option) => this.sameOption(option, cleanName))) return;
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    chrome.storage.local.get([storageKey], (result: any) => {
      const customOptions = (result[storageKey] as string[]) || [];
      if (customOptions.some((option) => this.sameOption(option, cleanName))) return;

      chrome.storage.local.set({ [storageKey]: [...customOptions, cleanName] });
    });
  }

  private sameOption(firstOption: string, secondOption: string): boolean {
    return firstOption.toLowerCase() === secondOption.toLowerCase();
  }

  async detectUserCountry() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data && data.country_name) {
          const userCountry = data.country_name;
          const otherCountries = this.countries.filter(
            (c) => c.toLowerCase() !== userCountry.toLowerCase() && c !== CUSTOM_OPTION,
          );
          this.countries = [userCountry, ...otherCountries, CUSTOM_OPTION];

          // Only update the form value if the user hasn't explicitly changed it yet
          if (!this.applicationForm.get('country')?.dirty) {
            this.applicationForm.patchValue({ country: userCountry });
          }
        }
      }
    } catch (e) {
      console.warn('Could not detect user country automatically', e);
    }
  }

  async onSubmit() {
    if (this.applicationForm.invalid) return;

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      const v = this.applicationForm.value;

      const id = this.createApplicationId();

      const platform = this.resolveCustomOptionValue(v.platform, v.custom_platform);

      if (v.platform === CUSTOM_OPTION && v.custom_platform) {
        this.saveCustomPlatform(v.custom_platform);
      }

      const country = this.resolveCustomOptionValue(v.country, v.custom_country);

      if (v.country === CUSTOM_OPTION && v.custom_country) {
        this.saveCustomCountry(v.custom_country);
      }

      // Row order matches header: id, role, company, platform, job_link, company_link, date_applied, status, interview_date, notes
      const rowData = [
        id,
        v.role,
        v.company,
        platform,
        v.job_link || '',
        v.company_link || '',
        v.date_applied,
        v.status,
        '', // interview_date — only set during response tracking
        v.notes || '',
        country || '',
        v.work_type || '',
      ];

      await this.sheets.appendRow(rowData);

      this.successMessage.set('Application saved successfully!');
      this.applicationForm.reset(this.getDefaultFormValues());

      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Submission error:', error);
      this.errorMessage.set('Failed to save: ' + (error.message || 'Unknown error'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private createApplicationId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  }

  private resolveCustomOptionValue(selectedValue: string, customValue: string): string {
    return selectedValue === CUSTOM_OPTION ? customValue : selectedValue;
  }
}
