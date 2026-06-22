import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GoogleSheets } from '../../core/services/google-sheets';
import { ApplicationRow } from '../../core/models/application-row.model';
import {
  APPLICATION_FILTER_OPTIONS,
  APPLICATION_STATUSES,
  APPLICATION_STATUS,
} from '../../core/constants/application-options.constants';
import { mapSheetRowsToApplications } from '../../core/utils/application-row.utils';

const { APPLIED, INTERVIEW } = APPLICATION_STATUS;

@Component({
  selector: 'app-tracking',
  imports: [FormsModule, RouterModule],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tracking implements OnInit {
  private sheets = inject(GoogleSheets);

  isLoading = signal(true);
  error = signal('');
  successMessage = signal('');

  // All applications fetched from the sheet
  allApplications = signal<ApplicationRow[]>([]);

  // Search & filter state
  searchQuery = signal('');
  activeFilter = signal('All');
  mainFilterDropdownOpen = signal(false);

  // Sort state ('desc' = Newest first, 'asc' = Oldest first)
  sortOrder = signal<'desc' | 'asc'>('desc');

  // Selected application for editing
  selectedApp = signal<ApplicationRow | null>(null);

  // Form state for updating
  newStatus = signal('');
  newInterviewDate = signal('');
  confirmingDelete = signal(false);
  statusDropdownOpen = signal(false);

  // Computed filtered list — search + status filter + sort
  filteredApplications = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.activeFilter();
    let apps = [...this.allApplications()];

    // Status filter
    if (filter !== 'All') {
      apps = apps.filter((a) => a.status === filter);
    }

    // Search filter
    if (query) {
      apps = apps.filter(
        (app) =>
          (app.company && app.company.toLowerCase().includes(query)) ||
          (app.role && app.role.toLowerCase().includes(query)),
      );
    }

    // Sort
    apps.sort((a, b) => {
      const timeA = new Date(a.date_applied).getTime();
      const timeB = new Date(b.date_applied).getTime();
      return this.sortOrder() === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return apps;
  });

  statuses = [...APPLICATION_STATUSES];
  filterOptions = [...APPLICATION_FILTER_OPTIONS];

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    try {
      this.isLoading.set(true);
      const rows = await this.sheets.getRows();

      const apps = mapSheetRowsToApplications(rows);

      this.allApplications.set(apps);
    } catch (err: any) {
      console.error('Failed to load tracking data:', err);
      this.error.set('Failed to load data. Please make sure Google Sheets is connected.');
    } finally {
      this.isLoading.set(false);
    }
  }

  selectApp(app: ApplicationRow) {
    this.selectedApp.set(app);
    this.newStatus.set(app.status || APPLIED);
    this.newInterviewDate.set(app.interview_date || '');
    this.successMessage.set('');
    this.error.set('');
    this.confirmingDelete.set(false);
    this.statusDropdownOpen.set(false);
  }

  cancelEdit(event: Event) {
    event.stopPropagation();
    this.selectedApp.set(null);
    this.confirmingDelete.set(false);
    this.statusDropdownOpen.set(false);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays}d ago`;

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    if (date.getFullYear() !== today.getFullYear()) {
      options.year = 'numeric';
    }
    return date.toLocaleDateString('en-US', options);
  }

  toggleSort() {
    this.sortOrder.set(this.sortOrder() === 'desc' ? 'asc' : 'desc');
  }

  async updateStatus() {
    const app = this.selectedApp();
    if (!app) return;

    try {
      this.isLoading.set(true);
      this.error.set('');

      const updates: Partial<ApplicationRow> = {
        status: this.newStatus(),
      };

      if (this.newStatus() === INTERVIEW) {
        updates.interview_date = this.newInterviewDate();
      }

      await this.sheets.updateApplication(app.id, updates);

      this.successMessage.set('Status updated successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);

      // Reload data to reflect changes
      await this.loadData();

      // Keep selected app updated or close it
      this.selectedApp.set(null);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      this.error.set('Failed to update: ' + (err.message || 'Unknown error'));
      this.isLoading.set(false);
    }
  }

  async deleteApp(app: ApplicationRow, event: Event) {
    event.stopPropagation();

    try {
      this.isLoading.set(true);
      this.error.set('');

      await this.sheets.deleteApplication(app.id);

      this.successMessage.set('Application deleted successfully!');
      setTimeout(() => this.successMessage.set(''), 3000);

      await this.loadData();
    } catch (err: any) {
      console.error('Failed to delete application:', err);
      this.error.set('Failed to delete: ' + (err.message || 'Unknown error'));
      this.isLoading.set(false);
    }
  }
}
