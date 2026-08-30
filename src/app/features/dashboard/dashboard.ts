import { Component, inject, signal, computed, ChangeDetectionStrategy, effect } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ApplicationRepository } from '../../core/repositories/application.repository';
import { ApplicationRow } from '../../../domain/application/application-row.model';
import { APPLICATION_STATUS, WORK_TYPE } from '../../core/constants/application-options.constants';
import { formatApplicationDate, getRelativeDateLabel, parseLocalDate } from '../../core/utils/date.utils';
import { compareApplicationsByRecency } from '../../../domain/application/application-row.utils';
import { codeToFlagEmoji, parseCountryLocation } from '../../../domain/country/country-normalize.js';
import { aggregatePlatformCounts } from '../../core/utils/platform.utils';
import { statusMessageKey } from '../../core/utils/display-labels';
import { LocaleService } from '../../core/services/i18n/locale.service';
import { localizedCountryName } from '../../core/i18n/country-display-names';
import { TooltipDirective } from '../../shared/tooltip/tooltip.directive';

const { APPLIED, INTERVIEW, OFFER, REJECTED, WITHDRAWN } = APPLICATION_STATUS;
const { REMOTE, HYBRID, ON_SITE } = WORK_TYPE;

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule, TooltipDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard {
  private applications = inject(ApplicationRepository);
  private locale = inject(LocaleService);
  private router = inject(Router);

  isLoading = signal(false);
  error = signal('');

  allApps = signal<ApplicationRow[]>([]);
  showAllCountries = signal(false);
  activeInterviewIndex = signal(0);

  t = (key: string, params?: Record<string, string | number>) => this.locale.t(key, params);

  constructor() {
    effect(() => {
      this.allApps.set(this.applications.applications());
    });
    void this.loadData();
  }

  // Computed metrics
  totalApplications = computed(() => this.allApps().length);

  statusCounts = computed(() => {
    const apps = this.allApps();
    return {
      applied: apps.filter((a) => a.status === APPLIED).length,
      interview: apps.filter((a) => a.status === INTERVIEW).length,
      offer: apps.filter((a) => a.status === OFFER).length,
      rejected: apps.filter((a) => a.status === REJECTED).length,
      withdrawn: apps.filter((a) => a.status === WITHDRAWN).length,
    };
  });

  respondedCount = computed(() => {
    return this.allApps().filter(
      (a) =>
        a.status === INTERVIEW ||
        a.status === OFFER ||
        a.status === REJECTED
    ).length;
  });

  responseRate = computed(() => {
    const total = this.totalApplications();
    if (total === 0) return 0;
    return Math.round((this.respondedCount() / total) * 100);
  });

  interviewCount = computed(() => {
    return this.statusCounts().interview;
  });

  successCount = computed(() => {
    return this.allApps().filter((a) => a.status === INTERVIEW || a.status === OFFER).length;
  });

  successRate = computed(() => {
    const total = this.totalApplications();
    if (total === 0) return 0;
    return Math.round((this.successCount() / total) * 100);
  });

  successLabel = computed(() => {
    // Depend on locale so labels refresh when language changes.
    this.locale.locale();
    const interviews = this.statusCounts().interview;
    const offers = this.statusCounts().offer;
    const total = this.totalApplications();

    if (interviews === 0 && offers === 0) return this.t('dashboard.noConversions');
    if (interviews > 0 && offers === 0) {
      const key = interviews === 1 ? 'dashboard.interviewOfTotal' : 'dashboard.interviewsOfTotal';
      return this.t(key, { count: interviews, total });
    }
    if (interviews === 0 && offers > 0) {
      const key = offers === 1 ? 'dashboard.offerOfTotal' : 'dashboard.offersOfTotal';
      return this.t(key, { count: offers, total });
    }
    const positive = interviews + offers;
    const key = positive === 1 ? 'dashboard.positiveOfTotal' : 'dashboard.positivesOfTotal';
    return this.t(key, { count: positive, total });
  });

  /** Past interview dates stay on the Upcoming card for this many days, then drop off. */
  private static readonly PAST_INTERVIEW_VISIBLE_DAYS = 3;

  upcomingInterviews = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oldestVisible = new Date(today);
    oldestVisible.setDate(
      oldestVisible.getDate() - Dashboard.PAST_INTERVIEW_VISIBLE_DAYS
    );

    return this.allApps()
      .filter((a) => a.status === INTERVIEW)
      .map((a) => {
        const _date = parseLocalDate(a.interview_date?.trim() || '');
        return { ...a, _date };
      })
      .filter((a) => {
        if (!a.interview_date?.trim() || Number.isNaN(a._date.getTime())) return false;
        // Future + today, or past within the last 3 days only
        return a._date.getTime() >= oldestVisible.getTime();
      })
      .sort((a, b) => a._date.getTime() - b._date.getTime());
  });

  /** Alias kept for template convenience */
  nextInterview = computed(() => {
    const list = this.upcomingInterviews();
    return list.length > 0 ? list[0] : null;
  });

  activeInterview = computed(() => {
    const list = this.upcomingInterviews();
    const idx = Math.min(this.activeInterviewIndex(), list.length - 1);
    return list[idx] ?? null;
  });

  interviewUrgency = computed(() => {
    const interview = this.activeInterview();
    if (!interview) return 'normal';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((interview._date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 1) return 'urgent';   // red — today or tomorrow (or past within window)
    if (diff <= 4) return 'soon';     // orange — within 4 days
    return 'normal';                  // green-ish amber
  });

  /** Label for the interview card: Upcoming vs Recent when the date has passed. */
  interviewCardLabel = computed(() => {
    const interview = this.activeInterview();
    if (!interview || Number.isNaN(interview._date.getTime())) {
      return this.t('dashboard.upcoming');
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (interview._date.getTime() < today.getTime()) {
      return this.t('dashboard.recentInterview');
    }
    return this.t('dashboard.upcoming');
  });

  prevInterview() {
    const max = this.upcomingInterviews().length - 1;
    this.activeInterviewIndex.update((i) => (i > 0 ? i - 1 : max));
  }

  nextInterviewSlide() {
    const max = this.upcomingInterviews().length - 1;
    this.activeInterviewIndex.update((i) => (i < max ? i + 1 : 0));
  }

  viewInterviewInTrack(): void {
    const interview = this.activeInterview();
    if (!interview?.id) return;
    void this.router.navigate(['/track'], { queryParams: { focus: interview.id } });
  }

  recentApplications = computed(() => {
    return [...this.allApps()]
      .sort((a, b) => compareApplicationsByRecency(a, b, 'desc'))
      .slice(0, 5);
  });

  workTypeCounts = computed(() => {
    const apps = this.allApps();
    return {
      remote: apps.filter((a) => a.work_type === REMOTE).length,
      hybrid: apps.filter((a) => a.work_type === HYBRID).length,
      onsite: apps.filter((a) => a.work_type === ON_SITE).length
    };
  });

  /** Convert a 2-letter ISO code to a flag emoji using Unicode regional indicators */
  private codeToFlag(code: string): string {
    return codeToFlagEmoji(code);
  }

  countryDistribution = computed(() => {
    const apps = this.allApps();
    const locale = this.locale.locale();
    const map = new Map<string, { code: string; label: string; count: number }>();

    for (const a of apps) {
      if (!a.country) continue;

      const parsed = parseCountryLocation(a.country);
      const code = parsed.countryCode || 'UNKNOWN';
      const name =
        code === 'UNKNOWN'
          ? this.locale.t('dashboard.unknownCountry')
          : localizedCountryName(code, locale);
      const flag = code === 'UNKNOWN' ? '📍' : this.codeToFlag(code);
      const label = `${flag} ${name}`;

      if (map.has(code)) {
        map.get(code)!.count++;
      } else {
        map.set(code, { code, label, count: 1 });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  });

  topCountries = computed(() => {
    const all = this.countryDistribution();
    return this.showAllCountries() ? all : all.slice(0, 4);
  });

  hiddenCountryCount = computed(() => {
    const total = this.countryDistribution().length;
    return total > 4 ? total - 4 : 0;
  });

  toggleCountries() {
    this.showAllCountries.update((v) => !v);
  }

  topPlatforms = computed(() => {
    return aggregatePlatformCounts(this.allApps().map((a) => a.platform)).slice(0, 4);
  });

  thisWeekCount = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.allApps().filter((a) => new Date(a.date_applied) >= weekAgo).length;
  });

  async loadData() {
    const showSpinner =
      this.applications.applications().length === 0 && !this.applications.isRefreshing();
    try {
      if (showSpinner) this.isLoading.set(true);

      await this.applications.loadApplications();
      this.error.set('');
    } catch (err: any) {
      console.error('[Dashboard] Failed to load dashboard data:', err);
      if (err?.status === 0) {
        this.error.set(this.t('dashboard.errorNetwork'));
      } else {
        this.error.set(this.t('dashboard.errorLoad', { message: err?.message || '' }));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  statusLabel(status: string | null | undefined): string {
    const key = statusMessageKey(status);
    return key ? this.t(key) : status || '';
  }

  formatDate(dateStr: string): string {
    return formatApplicationDate(dateStr, this.locale.locale());
  }

  getDaysUntil(dateStr: string): string {
    return getRelativeDateLabel(dateStr, this.t);
  }
}