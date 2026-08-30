import { Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';

type TooltipPlacement = 'top' | 'bottom' | 'auto';

const SHOW_DELAY_MS = 280;
const HIDE_DELAY_MS = 60;
const GAP_PX = 8;
const VIEWPORT_PAD = 8;

@Directive({
  selector: '[appTooltip]',
  standalone: true
})
export class TooltipDirective implements OnChanges, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private tip: HTMLDivElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  /** Tooltip label shown on hover/focus. Also used as aria-label when the host has none. */
  @Input({ alias: 'appTooltip', required: true }) text = '';

  /** Preferred side; `auto` flips when there is not enough space. */
  @Input() tooltipPlacement: TooltipPlacement = 'auto';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['text']) {
      this.syncAriaLabel();
      if (this.tip) {
        this.tip.textContent = this.text;
        this.positionTip();
      }
    }
  }

  ngOnDestroy(): void {
    this.clearShow();
    this.clearHide();
    this.destroyTip();
  }

  @HostListener('mouseenter')
  @HostListener('focus')
  onShowTrigger(): void {
    this.clearHide();
    if (!this.text.trim()) return;
    this.clearShow();
    this.showTimer = setTimeout(() => this.render(), SHOW_DELAY_MS);
  }

  @HostListener('mouseleave')
  @HostListener('blur')
  onHideTrigger(): void {
    this.clearShow();
    this.clearHide();
    this.hideTimer = setTimeout(() => this.destroyTip(), HIDE_DELAY_MS);
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.clearShow();
    this.destroyTip();
  }

  @HostListener('click')
  onClick(): void {
    // Drop tip when the control activates (menus, toggles, etc.).
    this.clearShow();
    this.destroyTip();
  }

  private syncAriaLabel(): void {
    const el = this.host.nativeElement;
    const label = this.text.trim();
    if (label) {
      el.setAttribute('aria-label', label);
    }
    // Never leave a native title — it races our custom tip with the OS black box.
    el.removeAttribute('title');
  }

  private render(): void {
    if (this.tip || !this.text.trim()) return;

    const tip = document.createElement('div');
    tip.className = 'cx-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.textContent = this.text.trim();
    document.body.appendChild(tip);
    this.tip = tip;
    this.positionTip();
    // Next frame so CSS transition can fade in from opacity 0.
    requestAnimationFrame(() => tip.classList.add('cx-tooltip--visible'));
  }

  private positionTip(): void {
    const tip = this.tip;
    if (!tip) return;

    const hostRect = this.host.nativeElement.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const preferBottom =
      this.tooltipPlacement === 'bottom' ||
      (this.tooltipPlacement === 'auto' &&
        hostRect.top < tipRect.height + GAP_PX + VIEWPORT_PAD);

    let top = preferBottom
      ? hostRect.bottom + GAP_PX
      : hostRect.top - tipRect.height - GAP_PX;

    let left = hostRect.left + hostRect.width / 2 - tipRect.width / 2;
    left = Math.min(
      Math.max(left, VIEWPORT_PAD),
      window.innerWidth - tipRect.width - VIEWPORT_PAD
    );

    if (top < VIEWPORT_PAD) {
      top = hostRect.bottom + GAP_PX;
    } else if (top + tipRect.height > window.innerHeight - VIEWPORT_PAD) {
      top = hostRect.top - tipRect.height - GAP_PX;
    }

    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
    tip.dataset['placement'] = top >= hostRect.bottom ? 'bottom' : 'top';
  }

  private destroyTip(): void {
    if (!this.tip) return;
    this.tip.remove();
    this.tip = null;
  }

  private clearShow(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }

  private clearHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}