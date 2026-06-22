import {
  Component,
  ChangeDetectionStrategy,
  HostListener,
  inject,
  signal,
  ChangeDetectorRef,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

import { Auth } from './core/services/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {
  auth = inject(Auth);
  isFullscreen = false;
  isConnecting = signal(false);
  private cdr = inject(ChangeDetectorRef);

  @HostListener('window:keydown.escape')
  onEscapeKey() {
    this.closeOverlay();
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    if (event.data?.action === 'FULLSCREEN_STATE_CHANGED') {
      this.isFullscreen = event.data.isFullscreen;
      this.cdr.detectChanges();
    }
  }

  async connectGoogle() {
    this.isConnecting.set(true);
    try {
      await this.auth.connect();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      this.isConnecting.set(false);
      this.cdr.detectChanges();
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    window.parent.postMessage(
      { action: 'TOGGLE_FULLSCREEN', isFullscreen: this.isFullscreen },
      '*',
    );
  }

  closeOverlay() {
    window.parent.postMessage({ action: 'CLOSE_OVERLAY' }, '*');
  }
}
