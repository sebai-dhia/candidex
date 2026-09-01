import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  HostListener,
  effect,
  untracked,
  ElementRef,
  Injector,
  afterNextRender,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApplicationRepository } from '../../core/repositories/application.repository';
import { ApplicationRow } from '../../../domain/application/application-row.model';
import { APPLICATION_FILTER_OPTIONS, APPLICATION_STATUS, APPLICATION_STATUSES } from '../../core/constants/application-options.constants';
import { formatApplicationDate } from '../../core/utils/date.utils';
import { LocaleService } from '../../core/services/i18n/locale.service';
import { filterMessageKey, statusMessageKey } from '../../core/utils/display-labels';
import { TooltipDirective } from '../../shared/tooltip/tooltip.directive';
import { queryTrackingApplications } from './tracking-query';

const { APPLIED, INTERVIEW } = APPLICATION_STATUS;

@Component({
  selector: 'app-tracking',
  imports: [FormsModule, RouterModule, TooltipDirective],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Tracking {
  private applications = inject(ApplicationRepository);
  private locale = inject(LocaleService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);
  private injector = inject(Injector);

  /** Exposed so OnPush templates re-check when language changes. */
  readonly uiLocale = this.locale.locale;

  t = (key: string, params?: Record<string, string | number>) => this.locale.t(key, params);

  isLoading = signal(false);
  isRefreshing = computed(() => this.applications.isRefreshing());
  isSaving = signal(false);
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

  /** Row id pending scroll/highlight from ?focus= */
  private pendingFocusId = signal<string | null>(null);
  /** Row currently highlighted after View existing */
  highlightedAppId = signal<string | null>(null);
  private focusGeneration = 0;

  /** True when status or interview date differs from the selected row. */
  hasChanges = computed(() => {
    const app = this.selectedApp();
    if (!app) return false;

    const status = this.newStatus();
    const originalStatus = app.status || APPLIED;
    if (status !== originalStatus) return true;

    const normalizeDate = (value: string | null | undefined) => (value || '').trim();
    if (status === INTERVIEW) {
      return normalizeDate(this.newInterviewDate()) !== normalizeDate(app.interview_date);
    }

    // Leaving Interview is already a status change above; when still non-Interview, date is unused.
    return false;
  });

  // Computed filtered list — search + status filter + sort
  filteredApplications = computed(() =>
    queryTrackingApplications(this.allApplications(), {
      searchQuery: this.searchQuery(),
      activeFilter: this.activeFilter(),
      sortOrder: this.sortOrder()
    })
  );

  statuses = [...APPLICATION_STATUSES];
  filterOptions = [...APPLICATION_FILTER_OPTIONS];

  constructor() {
    const destroyRef = inject(DestroyRef);
    const escapeHandler = (event: Event) => this.onEscapeKey(event);
    window.addEventListener('keydown', escapeHandler, { capture: true });
    destroyRef.onDestroy(() => window.removeEventListener('keydown', escapeHandler, { capture: true }));

    effect(() => {
      this.allApplications.set(this.applications.applications());
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const focus = params.get('focus')?.trim() || null;
      this.pendingFocusId.set(focus);
    });

    effect(() => {
      const id = this.pendingFocusId();
      const apps = this.allApplications();
      const loading = this.isLoading();
      if (!id || loading || apps.length === 0) return;

      if (!apps.some((app) => app.id === id)) {
        untracked(() => {
          this.pendingFocusId.set(null);
          void this.clearFocusQuery();
        });
        return;
      }

      untracked(() => {
        void this.scrollToFocusedApp(id);
      });
    });

    void this.loadData();
  }

  /** Click outside the open editor closes it (same as Cancel). */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.selectedApp() || this.isSaving()) return;

    const target = event.target as HTMLElement | null;
    if (!target) return;

    // Stay open when interacting with the editor itself.
    if (target.closest('.compact-row.editing')) return;
    // Let another row's click handler switch selection without closing first.
    if (target.closest('.compact-row')) return;

    this.closeEditor();
  }

  onEscapeKey(event: Event): void {
    if (!(event instanceof KeyboardEvent)) return;
    if (event.key !== 'Escape' && event.code !== 'Escape') return;

    if (this.confirmingDelete()) {
      event.preventDefault();
      event.stopPropagation();
      this.confirmingDelete.set(false);
      return;
    }

    if (this.statusDropdownOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.statusDropdownOpen.set(false);
      return;
    }

    if (this.selectedApp()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeEditor();
      return;
    }

    if (this.mainFilterDropdownOpen()) {
      event.preventDefault();
      event.stopPropagation();
      this.mainFilterDropdownOpen.set(false);
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  onDocumentEnter(event: Event): void {
    if (!this.selectedApp()) return;
    this.onEditorEnter(event);
  }

  onEditorEnter(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A') return;
    if (target.tagName === 'TEXTAREA') return;
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'date') return;
    if (this.statusDropdownOpen()) return;

    if (this.confirmingDelete()) {
      event.preventDefault();
      this.confirmDeleteFromKeyboard();
      return;
    }

    if (!this.hasChanges() || this.isSaving()) return;

    event.preventDefault();
    void this.updateStatus();
  }

  confirmDeleteFromKeyboard(): void {
    const app = this.selectedApp();
    if (!app || this.isSaving() || !this.confirmingDelete()) return;
    void this.deleteApp(app, new Event('keydown'));
  }

  statusLabel(status: string | null | undefined): string {
    const key = statusMessageKey(status);
    return key ? this.t(key) : status || '';
  }

  filterLabel(filter: string | null | undefined): string {
    const key = filterMessageKey(filter);
    return key ? this.t(key) : filter || '';
  }

  async loadData() {
    try {
      if (this.applications.applications().length === 0 && !this.applications.isRefreshing()) {
        this.isLoading.set(true);
      }
      await this.applications.loadApplications();
      this.error.set('');
    } catch (err: any) {
      console.error('Failed to load tracking data:', err);
      this.error.set(this.t('tracking.loadFailed'));
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
    this.closeEditor();
  }

  private closeEditor() {
    this.selectedApp.set(null);
    this.confirmingDelete.set(false);
    this.statusDropdownOpen.set(false);
  }

  formatDate(dateStr: string): string {
    return formatApplicationDate(dateStr, this.locale.locale());
  }

  toggleSort() {
    this.sortOrder.set(this.sortOrder() === 'desc' ? 'asc' : 'desc');
  }

  private async scrollToFocusedApp(id: string) {
    const generation = ++this.focusGeneration;
    this.pendingFocusId.set(null);
    this.searchQuery.set('');
    this.activeFilter.set('All');
    this.mainFilterDropdownOpen.set(false);
    this.closeEditor();
    this.highlightedAppId.set(null);

    await new Promise<void>((resolve) => {
      afterNextRender(() => resolve(), { injector: this.injector });
    });
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    if (generation !== this.focusGeneration) return;

    const row = this.host.nativeElement.querySelector(
      `[data-app-id="${CSS.escape(id)}"]`,
    ) as HTMLElement | null;
    if (!row) {
      void this.clearFocusQuery();
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scroller = this.findScrollParent(row);

    if (reduceMotion || !scroller) {
      row.scrollIntoView({ behavior: 'auto', block: 'center' });
      this.highlightedAppId.set(id);
      this.scheduleHighlightClear(id, generation, 500);
      return;
    }

    // If already on screen, light it immediately; otherwise wait until it enters view mid-scroll.
    if (this.isRowInView(scroller, row)) {
      this.highlightedAppId.set(id);
    }

    await this.animateScrollToRow(scroller, row, id, generation);
    if (generation !== this.focusGeneration) return;

    // Ensure lit after arrival, then fade out shortly after scroll stops.
    this.highlightedAppId.set(id);
    this.scheduleHighlightClear(id, generation, 500);
  }

  private scheduleHighlightClear(id: string, generation: number, delayMs: number) {
    setTimeout(() => {
      if (generation !== this.focusGeneration) return;
      if (this.highlightedAppId() === id) {
        this.highlightedAppId.set(null);
      }
      void this.clearFocusQuery();
    }, delayMs);
  }

  private findScrollParent(el: HTMLElement): HTMLElement | null {
    let node: HTMLElement | null = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      const canScrollY =
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        node.scrollHeight > node.clientHeight + 1;
      if (canScrollY) return node;
      node = node.parentElement;
    }
    return null;
  }

  private isRowInView(scroller: HTMLElement, row: HTMLElement): boolean {
    const rowRect = row.getBoundingClientRect();
    const view = scroller.getBoundingClientRect();
    const margin = 12;
    return rowRect.bottom > view.top + margin && rowRect.top < view.bottom - margin;
  }

  /**
   * Ease-out scroll that slows near the row.
   * Starts soft highlight as soon as the row enters the viewport.
   */
  private animateScrollToRow(scroller: HTMLElement, row: HTMLElement, id: string, generation: number): Promise<void> {
    const start = scroller.scrollTop;
    const rowRect = row.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const rowCenter = rowRect.top + rowRect.height / 2;
    const viewCenter = scrollerRect.top + scroller.clientHeight / 2;
    const delta = rowCenter - viewCenter;
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const target = Math.min(maxScroll, Math.max(0, start + delta));
    const distance = Math.abs(target - start);

    if (distance < 2) {
      return Promise.resolve();
    }

    const duration = Math.min(1400, Math.max(480, distance * 0.85));

    return new Promise((resolve) => {
      const t0 = performance.now();

      const tick = (now: number) => {
        if (generation !== this.focusGeneration) {
          resolve();
          return;
        }

        const t = Math.min(1, (now - t0) / duration);
        // Quintic ease-out: decelerates as it approaches the row.
        const eased = 1 - Math.pow(1 - t, 5);
        scroller.scrollTop = start + (target - start) * eased;

        if (this.highlightedAppId() !== id && this.isRowInView(scroller, row)) {
          this.highlightedAppId.set(id);
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          scroller.scrollTop = target;
          resolve();
        }
      };

      requestAnimationFrame(tick);
    });
  }

  private clearFocusQuery(): Promise<boolean> {
    if (!this.route.snapshot.queryParamMap.has('focus')) {
      return Promise.resolve(true);
    }
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { focus: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  async updateStatus() {
    const app = this.selectedApp();
    if (!app || !this.hasChanges() || this.isSaving()) return;

    try {
      this.isSaving.set(true);
      this.statusDropdownOpen.set(false);
      this.error.set('');

      const updates: Partial<ApplicationRow> = {
        status: this.newStatus(),
      };

      if (this.newStatus() === INTERVIEW) {
        updates.interview_date = this.newInterviewDate();
      } else {
        updates.interview_date = '';
      }

      await this.applications.updateApplication(app.id, updates);

      this.successMessage.set(this.t('tracking.statusUpdated'));
      setTimeout(() => this.successMessage.set(''), 3000);

      this.selectedApp.set(null);
    } catch (err: any) {
      console.error('Failed to update status:', err);
      this.error.set(
        this.t('tracking.updateFailed', {
          message: err?.message || this.t('form.unknownError'),
        }),
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteApp(app: ApplicationRow, event: Event) {
    event.stopPropagation();
    if (this.isSaving()) return;

    try {
      this.isSaving.set(true);
      this.error.set('');

      await this.applications.deleteApplication(app.id);

      this.successMessage.set(this.t('tracking.deleted'));
      setTimeout(() => this.successMessage.set(''), 3000);
    } catch (err: any) {
      console.error('Failed to delete application:', err);
      this.error.set(
        this.t('tracking.deleteFailed', {message: err?.message || this.t('form.unknownError')})
      );
    } finally {
      this.isSaving.set(false);
    }
  }
}