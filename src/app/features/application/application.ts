import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApplicationRepository } from '../../core/repositories/application.repository';
import { CustomOptionsStorageService } from '../../core/services/storage/custom-options-storage.service';
import {
  APPLICATION_COUNTRIES,
  APPLICATION_PLATFORMS,
  APPLICATION_STATUSES,
  APPLICATION_STATUS,
  CUSTOM_OPTION,
  DEFAULT_APPLICATION_VALUES,
  WORK_TYPES,
} from '../../core/constants/application-options.constants';
import { LocaleService } from '../../core/services/i18n/locale.service';
import { ApplicationRow } from '../../../domain/application/application-row.model';
import { applicationCountryLabels } from '../../core/utils/application-countries';
import { isDuplicateApplicationError } from '../../../domain/application/application-duplicate.utils';
import { formatApplicationDate } from '../../core/utils/date.utils';
import { localizedCountryName } from '../../core/i18n/country-display-names';
import { platformMessageKey, statusMessageKey, workTypeMessageKey } from '../../core/utils/display-labels';
import { canonicalizePlatformLabel, aggregatePlatformCounts, insertPlatformBeforeCompanySite, pickTopFrequentPlatform } from '../../core/utils/platform.utils';

/**
 * Maps browser locale region subtags (e.g. "TN" from "ar-TN") to ISO codes
 * for form defaults.
 */
const LOCALE_REGION_CODES = new Set(['TN','FR', 'DE', 'AE', 'SA', 'QA', 'CA', 'US', 'MA', 'GB', 'AU']);

type DropdownStateKey = 'platformOpen' | 'statusOpen' | 'countryOpen' | 'workTypeOpen';

@Component({
  selector: 'app-application',
  imports: [ReactiveFormsModule],
  templateUrl: './application.component.html',
  styleUrl: './application.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Application implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly applications = inject(ApplicationRepository);
  private readonly customOptions = inject(CustomOptionsStorageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly locale = inject(LocaleService);
  private readonly router = inject(Router);

  /** Exposed so OnPush templates re-check when language changes. */
  readonly uiLocale = this.locale.locale;

  t = (key: string, params?: Record<string, string | number>) => this.locale.t(key, params);

  applicationForm!: FormGroup;
  isSubmitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  duplicateMatch = signal<ApplicationRow | null>(null);

  // Controlled lists
  platforms: string[] = [...APPLICATION_PLATFORMS];
  statuses: string[] = [...APPLICATION_STATUSES];
  countries: string[] = [...APPLICATION_COUNTRIES];
  workTypes: string[] = [...WORK_TYPES];
  showCustomPlatform = false;
  showCustomCountry = false;
  showInterviewDate = false;

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
      interview_date: [defaultValues.interview_date],
      notes: [defaultValues.notes],
    });

    this.watchCustomOption('platform', 'custom_platform', (visible) => {
      this.showCustomPlatform = visible;
    });
    this.watchCustomOption('country', 'custom_country', (visible) => {
      this.showCustomCountry = visible;
    });
    this.watchInterviewDate();

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
      interview_date: '',
      notes: ''
    };
  }

  private watchInterviewDate() {
    this.applicationForm.get('status')!.valueChanges.subscribe((status: string) => {
      const isInterview = status === APPLICATION_STATUS.INTERVIEW;
      this.showInterviewDate = isInterview;

      if (!isInterview) {
        this.applicationForm.get('interview_date')!.setValue('');
      }
    });
  }

  private getDateInputValue(): string {
    return new Date().toISOString().split('T')[0];
  }

  private watchCustomOption(sourceControlName: string, customControlName: string, setVisibility: (visible: boolean) => void) {
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

  async loadCustomPlatforms() {
    const [storedPlatforms, apps] = await Promise.all([
      this.customOptions.getPlatforms(APPLICATION_PLATFORMS),
      this.applications.listApplications().catch(() => [])
    ]);

    const frequent = pickTopFrequentPlatform(aggregatePlatformCounts(apps.map((app) => app.platform)));
    this.platforms = insertPlatformBeforeCompanySite(storedPlatforms, frequent);
    this.cdr.detectChanges();
  }

  saveCustomPlatform(platformName: string): Promise<void> {
    return this.customOptions.savePlatform(platformName, this.platforms);
  }

  async loadCustomCountries() {
    const base = applicationCountryLabels(this.locale.locale());
    this.countries = await this.customOptions.getCountries(base);

    const defaultCountry = localizedCountryName('TN', this.locale.locale());
    if (defaultCountry && this.countries.includes(defaultCountry) && !this.applicationForm.get('country')?.dirty) {
      this.applicationForm.patchValue({ country: defaultCountry });
    }

    this.cdr.detectChanges();
  }

  saveCustomCountry(countryName: string): Promise<void> {
    return this.customOptions.saveCountry(countryName, this.countries);
  }

  detectUserCountry() {
    try {
      // Detect country locally from the browser locale — no external network request.
      const locale = navigator.language || navigator.languages?.[0] || '';
      const region = locale.split('-')[1]?.toUpperCase();
      if (!region || !LOCALE_REGION_CODES.has(region)) return;

      const userCountry = localizedCountryName(region, this.locale.locale());
      if (!userCountry || !this.countries.some((c) => c === userCountry)) return;

      const otherCountries = this.countries.filter(
        (c) => c.toLowerCase() !== userCountry.toLowerCase() && c !== CUSTOM_OPTION
      );
      this.countries = [userCountry, ...otherCountries, CUSTOM_OPTION];

      // Only update the form value if the user hasn't explicitly changed it yet
      if (!this.applicationForm.get('country')?.dirty) {
        this.applicationForm.patchValue({ country: userCountry });
      }
    } catch {
      // Silently ignore — country field will keep its default value
    }
  }

  statusLabel(status: string | null | undefined): string {
    const key = statusMessageKey(status);
    return key ? this.t(key) : status || '';
  }

  workTypeLabel(workType: string | null | undefined): string {
    const key = workTypeMessageKey(workType);
    return key ? this.t(key) : workType || '';
  }

  platformLabel(platform: string | null | undefined): string {
    const key = platformMessageKey(platform);
    return key ? this.t(key) : platform || '';
  }

  countryLabel(country: string | null | undefined): string {
    if (!country) return '';
    if (country === CUSTOM_OPTION) return this.t('common.other');
    return country;
  }

  async onSubmit() {
    if (this.applicationForm.invalid) return;
    await this.saveApplication(false);
  }

  async saveAnyway() {
    if (this.applicationForm.invalid) return;
    await this.saveApplication(true);
  }

  viewExisting() {
    const dup = this.duplicateMatch();
    void this.router.navigate(['/track'], {
      queryParams: dup?.id ? { focus: dup.id } : undefined
    });
  }

  formatDuplicateDate(dateStr: string | null | undefined): string {
    return formatApplicationDate(dateStr || '', this.locale.locale());
  }

  /** Keep Latin/date tokens from scrambling Arabic sentence order. */
  isolateBidi(value: string | null | undefined): string {
    return `\u2068${value || ''}\u2069`;
  }

  private async saveApplication(allowDuplicate: boolean) {
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    if (!allowDuplicate) {
      this.duplicateMatch.set(null);
    }

    try {
      const v = this.applicationForm.value;

      const platform = canonicalizePlatformLabel(this.resolveCustomOptionValue(v.platform, v.custom_platform));

      if (v.platform === CUSTOM_OPTION && platform) {
        await this.saveCustomPlatform(platform);
      }

      const country = this.resolveCustomOptionValue(v.country, v.custom_country);

      if (v.country === CUSTOM_OPTION && v.custom_country) {
        await this.saveCustomCountry(v.custom_country);
      }
      await this.applications.createApplication(
        {
          role: v.role,
          company: v.company,
          platform,
          job_link: v.job_link || '',
          company_link: v.company_link || '',
          date_applied: v.date_applied,
          status: v.status,
          interview_date: v.status === APPLICATION_STATUS.INTERVIEW ? v.interview_date || '' : '',
          notes: v.notes || '',
          country: country || '',
          work_type: v.work_type || ''
        },
        { allowDuplicate }
      );

      this.duplicateMatch.set(null);
      this.successMessage.set(this.t('form.saved'));
      this.applicationForm.reset(this.getDefaultFormValues());

      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (error: unknown) {
      if (isDuplicateApplicationError(error)) {
        this.duplicateMatch.set(error.existing);
      } else {
        console.error('Submission error:', error);
        const message = error instanceof Error ? error.message : this.t('form.unknownError');
        this.errorMessage.set(this.t('form.saveFailed', { message }));
      }
    } finally {
      this.isSubmitting.set(false);
      this.cdr.detectChanges();
    }
  }

  private resolveCustomOptionValue(selectedValue: string, customValue: string): string {
    return selectedValue === CUSTOM_OPTION ? customValue : selectedValue;
  }
}