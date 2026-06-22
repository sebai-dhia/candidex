import { Component, inject, OnInit, HostListener, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { GoogleSheets } from '../../core/services/google-sheets';

@Component({
  selector: 'app-application',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './application.component.html',
  styleUrl: './application.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Application implements OnInit {
  private fb = inject(FormBuilder);
  private sheets = inject(GoogleSheets);

  applicationForm!: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Controlled lists
  platforms = ['LinkedIn', 'Indeed', 'Glassdoor', 'Company Site', 'Other'];
  statuses = ['Applied', 'Interview', 'Offer', 'Rejected', 'Withdrawn'];
  countries = [
    'Tunisia',
    'France',
    'Germany',
    'UAE',
    'Saudi Arabia',
    'Qatar',
    'Canada',
    'USA',
    'Morocco',
    'UK',
    'Australia',
    'Other',
  ];
  workTypes = ['On-site', 'Hybrid', 'Remote'];
  showCustomPlatform = false;
  showCustomCountry = false;

  // Custom dropdown state
  platformOpen = false;
  statusOpen = false;
  countryOpen = false;
  workTypeOpen = false;

  // Close dropdowns when clicking outside
  @HostListener('document:click')
  onDocumentClick() {
    this.platformOpen = false;
    this.statusOpen = false;
    this.countryOpen = false;
    this.workTypeOpen = false;
  }

  togglePlatform(event: Event) {
    event.stopPropagation();
    const wasOpen = this.platformOpen;
    this.closeAllDropdowns();
    this.platformOpen = !wasOpen;
  }

  selectPlatform(value: string, event: Event) {
    event.stopPropagation();
    this.applicationForm.get('platform')!.setValue(value);
    this.platformOpen = false;
  }

  toggleStatus(event: Event) {
    event.stopPropagation();
    const wasOpen = this.statusOpen;
    this.closeAllDropdowns();
    this.statusOpen = !wasOpen;
  }

  selectStatus(value: string, event: Event) {
    event.stopPropagation();
    this.applicationForm.get('status')!.setValue(value);
    this.statusOpen = false;
  }

  toggleCountry(event: Event) {
    event.stopPropagation();
    const wasOpen = this.countryOpen;
    this.closeAllDropdowns();
    this.countryOpen = !wasOpen;
  }

  selectCountry(value: string, event: Event) {
    event.stopPropagation();
    this.applicationForm.get('country')!.setValue(value);
    this.countryOpen = false;
  }

  toggleWorkType(event: Event) {
    event.stopPropagation();
    const wasOpen = this.workTypeOpen;
    this.closeAllDropdowns();
    this.workTypeOpen = !wasOpen;
  }

  selectWorkType(value: string, event: Event) {
    event.stopPropagation();
    this.applicationForm.get('work_type')!.setValue(value);
    this.workTypeOpen = false;
  }

  private closeAllDropdowns() {
    this.platformOpen = false;
    this.statusOpen = false;
    this.countryOpen = false;
    this.workTypeOpen = false;
  }

  ngOnInit() {
    const today = new Date().toISOString().split('T')[0];

    this.applicationForm = this.fb.group({
      role: ['', Validators.required],
      company: ['', Validators.required],
      platform: ['LinkedIn', Validators.required],
      custom_platform: [''], // Only used when platform === 'Other'
      job_link: [''], // Optional per PROJECT.md
      company_link: [''], // Optional per PROJECT.md
      country: ['Tunisia', Validators.required],
      custom_country: [''], // Only used when country === 'Other'
      work_type: ['Remote', Validators.required],
      date_applied: [today, Validators.required],
      status: ['Applied', Validators.required],
      notes: [''], // Optional per PROJECT.md
    });

    // Watch platform changes to show/hide custom input
    this.applicationForm.get('platform')!.valueChanges.subscribe((val: string) => {
      this.showCustomPlatform = val === 'Other';
      if (val === 'Other') {
        this.applicationForm.get('custom_platform')!.setValidators(Validators.required);
      } else {
        this.applicationForm.get('custom_platform')!.clearValidators();
        this.applicationForm.get('custom_platform')!.setValue('');
      }
      this.applicationForm.get('custom_platform')!.updateValueAndValidity();
    });

    // Watch country changes to show/hide custom input
    this.applicationForm.get('country')!.valueChanges.subscribe((val: string) => {
      this.showCustomCountry = val === 'Other';
      if (val === 'Other') {
        this.applicationForm.get('custom_country')!.setValidators(Validators.required);
      } else {
        this.applicationForm.get('custom_country')!.clearValidators();
        this.applicationForm.get('custom_country')!.setValue('');
      }
      this.applicationForm.get('custom_country')!.updateValueAndValidity();
    });

    this.loadCustomPlatforms();
    this.loadCustomCountries();
    this.detectUserCountry();
  }

  loadCustomPlatforms() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['customPlatforms'], (result: any) => {
        if (result['customPlatforms'] && Array.isArray(result['customPlatforms'])) {
          const customPlatforms = result['customPlatforms'] as string[];
          const basePlatforms = this.platforms.filter((p) => p !== 'Other');

          // Only add platforms that aren't already in the list
          const newPlatforms = customPlatforms.filter((cp) => !basePlatforms.includes(cp));

          if (newPlatforms.length > 0) {
            this.platforms = [...basePlatforms, ...newPlatforms, 'Other'];
          }
        }
      });
    }
  }

  saveCustomPlatform(platformName: string) {
    if (!platformName) return;
    const cleanName = platformName.trim();

    // Check if it already exists in our current platform list (case-insensitive)
    const exists = this.platforms.some((p) => p.toLowerCase() === cleanName.toLowerCase());
    if (exists) return;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['customPlatforms'], (result: any) => {
        const customPlatforms = (result['customPlatforms'] as string[]) || [];
        // Only save if we don't already have it in storage
        if (!customPlatforms.some((p: string) => p.toLowerCase() === cleanName.toLowerCase())) {
          customPlatforms.push(cleanName);
          chrome.storage.local.set({ customPlatforms: customPlatforms });
        }
      });
    }
  }

  loadCustomCountries() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['customCountries'], (result: any) => {
        if (result['customCountries'] && Array.isArray(result['customCountries'])) {
          const customCountries = result['customCountries'] as string[];
          const baseCountries = this.countries.filter((c) => c !== 'Other');

          const newCountries = customCountries.filter(
            (cc) => !baseCountries.some((bc) => bc.toLowerCase() === cc.toLowerCase()),
          );

          if (newCountries.length > 0) {
            this.countries = [...baseCountries, ...newCountries, 'Other'];
          }
        }
      });
    }
  }

  saveCustomCountry(countryName: string) {
    if (!countryName) return;
    const cleanName = countryName.trim();

    const exists = this.countries.some((c) => c.toLowerCase() === cleanName.toLowerCase());
    if (exists) return;

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['customCountries'], (result: any) => {
        const customCountries = (result['customCountries'] as string[]) || [];
        if (!customCountries.some((c: string) => c.toLowerCase() === cleanName.toLowerCase())) {
          customCountries.push(cleanName);
          chrome.storage.local.set({ customCountries: customCountries });
        }
      });
    }
  }

  async detectUserCountry() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        if (data && data.country_name) {
          const userCountry = data.country_name;
          const otherCountries = this.countries.filter(
            (c) => c.toLowerCase() !== userCountry.toLowerCase() && c !== 'Other',
          );
          this.countries = [userCountry, ...otherCountries, 'Other'];

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

      // Generate a simple unique ID (timestamp-based)
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

      // Resolve platform: use custom value when 'Other' is selected
      const platform = v.platform === 'Other' ? v.custom_platform : v.platform;

      if (v.platform === 'Other' && v.custom_platform) {
        this.saveCustomPlatform(v.custom_platform);
      }

      // Resolve country: use custom value when 'Other' is selected
      const country = v.country === 'Other' ? v.custom_country : v.country;

      if (v.country === 'Other' && v.custom_country) {
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
      this.applicationForm.reset({
        role: '',
        company: '',
        platform: 'LinkedIn',
        custom_platform: '',
        job_link: '',
        company_link: '',
        country: 'Tunisia',
        custom_country: '',
        work_type: 'Remote',
        date_applied: new Date().toISOString().split('T')[0],
        status: 'Applied',
        notes: '',
      });

      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: any) {
      console.error('Submission error:', error);
      this.errorMessage.set('Failed to save: ' + (error.message || 'Unknown error'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
