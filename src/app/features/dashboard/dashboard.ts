import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterModule } from '@angular/router';
import { GoogleSheets } from '../../core/services/google-sheets';
import { ApplicationRow } from '../../core/models/application-row.model';
import { APPLICATION_STATUS, WORK_TYPE } from '../../core/constants/application-options.constants';
import { NORMALIZED_COUNTRY_CODES } from '../../core/constants/country-codes.constants';
import { mapSheetRowsToApplications } from '../../core/utils/application-row.utils';

const { APPLIED, INTERVIEW, OFFER, REJECTED, WITHDRAWN } = APPLICATION_STATUS;
const { REMOTE, HYBRID, ON_SITE } = WORK_TYPE;

@Component({
  selector: 'app-dashboard',
  imports: [RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Dashboard implements OnInit {
  private sheets = inject(GoogleSheets);

  isLoading = signal(true);
  error = signal('');

  allApps = signal<ApplicationRow[]>([]);
  showAllCountries = signal(false);

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
        a.status === REJECTED,
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
    const interviews = this.statusCounts().interview;
    const offers = this.statusCounts().offer;
    const total = this.totalApplications();

    if (interviews === 0 && offers === 0) return `no conversions yet`;
    if (interviews > 0 && offers === 0)
      return `${interviews} interview${interviews > 1 ? 's' : ''} from ${total} apps`;
    if (interviews === 0 && offers > 0)
      return `${offers} offer${offers > 1 ? 's' : ''} from ${total} apps`;
    return `${interviews + offers} positive from ${total} apps`;
  });

  nextInterview = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const interviews = this.allApps()
      .filter((a) => a.status === INTERVIEW && a.interview_date)
      .map((a) => ({ ...a, _date: new Date(a.interview_date!) }))
      .filter((a) => a._date >= today)
      .sort((a, b) => a._date.getTime() - b._date.getTime());
    return interviews.length > 0 ? interviews[0] : null;
  });

  recentApplications = computed(() => {
    return [...this.allApps()]
      .sort((a, b) => new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime())
      .slice(0, 5);
  });

  workTypeCounts = computed(() => {
    const apps = this.allApps();
    return {
      remote: apps.filter((a) => a.work_type === REMOTE).length,
      hybrid: apps.filter((a) => a.work_type === HYBRID).length,
      onsite: apps.filter((a) => a.work_type === ON_SITE).length,
    };
  });

  /** Convert a 2-letter ISO code to a flag emoji using Unicode regional indicators */
  private codeToFlag(code: string): string {
    return [...code.toUpperCase()]
      .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
      .join('');
  }

  /** Get flag emoji for a country name — falls back to pushpin for unknown countries */
  private getFlag(country: string): string {
    const normalizedCountry = country.trim().toLowerCase();
    const code = NORMALIZED_COUNTRY_CODES[normalizedCountry];
    return code ? this.codeToFlag(code) : '📍';
  }

  countryDistribution = computed(() => {
    const apps = this.allApps();
    const map = new Map<string, { label: string; count: number }>();

    for (const a of apps) {
      if (!a.country) continue;

      const country = a.country;
      const flag = this.getFlag(country);
      const label = `${flag} ${country}`;

      if (map.has(country)) {
        map.get(country)!.count++;
      } else {
        map.set(country, { label, count: 1 });
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
    const apps = this.allApps();
    const map = new Map<string, number>();

    for (const a of apps) {
      if (!a.platform) continue;
      map.set(a.platform, (map.get(a.platform) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
  });

  thisWeekCount = computed(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.allApps().filter((a) => new Date(a.date_applied) >= weekAgo).length;
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this.isLoading.set(true);
      
      console.log('[Dashboard] Starting loadData...');
      const rows = await this.sheets.getRows(true);
      console.log('[Dashboard] Raw rows received:', rows.length, rows);

      const apps = mapSheetRowsToApplications(rows);

      console.log('[Dashboard] Parsed apps after filter:', apps.length, apps);
      this.allApps.set(apps);
    } catch (err: any) {
      console.error('[Dashboard] Failed to load dashboard data:', err);
      this.error.set('Failed to load data. Please make sure Google Sheets is connected.');
    } finally {
      this.isLoading.set(false);
    }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (d.getFullYear() !== today.getFullYear()) {
      options.year = 'numeric';
    }
    return d.toLocaleDateString('en-US', options);
  }

  getDaysUntil(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff} days`;
  }
}
