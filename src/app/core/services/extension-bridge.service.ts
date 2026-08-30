import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { EXTENSION_MSG } from '../constants/extension-messages.constants';
import { ApplicationRepository } from '../repositories/application.repository';
import { isDuplicateApplicationError } from '../../../domain/application/application-duplicate.utils';
import { parseRuntimeMessage } from '../../../contracts/extension-messaging/validate.js';
import { PORT_PANEL } from '../../../contracts/extension-messaging/ports.js';

@Injectable({ providedIn: 'root' })
export class ExtensionBridgeService {
  private readonly applications = inject(ApplicationRepository);
  private readonly router = inject(Router);
  private panelPort: chrome.runtime.Port | null = null;

  readonly isFullscreen = signal(false);

  constructor() {
    this.connectPanelPort();
  }

  closeOverlay(): void {
    this.postToContent({ action: EXTENSION_MSG.CLOSE_OVERLAY });
  }

  toggleFullscreen(): void {
    const next = !this.isFullscreen();
    this.isFullscreen.set(next);
    this.postToContent({ action: EXTENSION_MSG.TOGGLE_FULLSCREEN, isFullscreen: next });
  }

  startAiCapture(): void {
    this.postToContent({ action: EXTENSION_MSG.START_AI_CAPTURE });
  }

  handleEscapeKey(): void {
    this.postToContent({ action: EXTENSION_MSG.ESCAPE_PRESSED });
  }

  /**
   * Handle privileged messages from the content script via the background port relay.
   * Window postMessage is ignored for business actions.
   */
  async handlePortMessage(raw: unknown): Promise<boolean> {
    const message = parseRuntimeMessage(raw);
    if (!message) return false;

    if (message.action === EXTENSION_MSG.FULLSCREEN_STATE_CHANGED) {
      this.isFullscreen.set(!!message.isFullscreen);
      return true;
    }

    if (message.action === EXTENSION_MSG.OVERLAY_OPENED) {
      void this.applications.refreshApplications().catch((error: unknown) => {
        console.error('[ExtensionBridge] Failed to refresh applications:', error);
      });
      return true;
    }

    if (message.action === EXTENSION_MSG.NAVIGATE) {
      const path = typeof message.path === 'string' ? message.path : '';
      if (path) {
        void this.router.navigateByUrl(path).catch((error: unknown) => {
          console.error('[ExtensionBridge] Navigation failed:', error);
        });
      }
      return true;
    }

    if (message.action === EXTENSION_MSG.SAVE_AI_JOB) {
      await this.saveAiJob(message.payload);
      return true;
    }

    return false;
  }

  /**
   * Legacy window.message handler — ignores SAVE_AI_JOB / NAVIGATE from any parent frame.
   * Only used as a no-op compatibility shim during migration.
   */
  async handleParentMessage(event: MessageEvent): Promise<boolean> {
    if (event.source !== window.parent) return false;
    const action = event.data?.action;
    if (
      action === EXTENSION_MSG.SAVE_AI_JOB ||
      action === EXTENSION_MSG.NAVIGATE ||
      action === EXTENSION_MSG.OVERLAY_OPENED ||
      action === EXTENSION_MSG.FULLSCREEN_STATE_CHANGED
    ) {
      console.warn('[ExtensionBridge] Ignoring sensitive postMessage; use runtime port.');
      return true;
    }
    return false;
  }

  private async saveAiJob(payload: unknown): Promise<void> {
    const parsed = parseRuntimeMessage({
      action: EXTENSION_MSG.SAVE_AI_JOB,
      payload,
    });
    if (!parsed || parsed.action !== EXTENSION_MSG.SAVE_AI_JOB) {
      this.postToContent({
        action: EXTENSION_MSG.SAVE_AI_JOB_RESPONSE,
        success: false,
        error: 'Invalid capture payload',
      });
      return;
    }

    try {
      await this.applications.createFromAiCapture(parsed.payload as {
        role?: string;
        company?: string;
        platform?: string;
        jobLink?: string;
        notes?: string;
        country?: string;
        workType?: string;
        allowDuplicate?: boolean;
      });
      this.postToContent({ action: EXTENSION_MSG.SAVE_AI_JOB_RESPONSE, success: true });
    } catch (error: unknown) {
      if (isDuplicateApplicationError(error)) {
        this.postToContent({
          action: EXTENSION_MSG.SAVE_AI_JOB_RESPONSE,
          success: false,
          duplicate: true,
          existing: {
            id: error.existing.id,
            role: error.existing.role,
            company: error.existing.company,
            date_applied: error.existing.date_applied
          }
        });
        return;
      }

      const message = error instanceof Error ? error.message : 'Failed to save';
      console.error('[ExtensionBridge] Failed to save AI job:', error);
      this.postToContent({
        action: EXTENSION_MSG.SAVE_AI_JOB_RESPONSE,
        success: false,
        error: message
      });
    }
  }

  private connectPanelPort(): void {
    if (typeof chrome === 'undefined' || !chrome?.runtime?.connect) return;

    try {
      this.panelPort = chrome.runtime.connect({ name: PORT_PANEL });
      this.panelPort.onMessage.addListener((raw) => {
        void this.handlePortMessage(raw);
      });
      this.panelPort.onDisconnect.addListener(() => {
        this.panelPort = null;
        window.setTimeout(() => this.connectPanelPort(), 500);
      });
    } catch (error: unknown) {
      console.error('[ExtensionBridge] Failed to open panel port:', error);
    }
  }

  private postToContent(message: Record<string, unknown>): void {
    if (!this.panelPort) {
      this.connectPanelPort();
    }
    try {
      this.panelPort?.postMessage(message);
    } catch (error: unknown) {
      console.error('[ExtensionBridge] Failed to post to content:', error);
      this.panelPort = null;
    }
  }
}