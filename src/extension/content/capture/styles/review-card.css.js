export const REVIEW_CARD_CSS = `.candidex-review-card {
  position: absolute;
  width: 440px;
  background-color: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 20px 30px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  padding: 20px 24px;
  color: #1e293b;
  font-family: system-ui, -apple-system, sans-serif;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 14px;
  pointer-events: auto;
  animation: cdx-fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes cdx-fade-in-up {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.candidex-card-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 12px;
  margin-bottom: 4px;
  cursor: move;
  user-select: none;
}
.candidex-card-title {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 16px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: #0f172a;
}
.candidex-card-subtitle {
  font-size: 12px;
  color: #64748b;
  flex: 1;
  min-width: 0;
}
.candidex-header-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 16px;
}
.candidex-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-grow: 1;
  width: 100%;
}
.candidex-form-label {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.candidex-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.candidex-form-input {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-family: system-ui, -apple-system, sans-serif;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
  flex-grow: 1;
  width: 100%;
}
.candidex-form-input::placeholder {
  color: #94a3b8;
}
.candidex-form-input:focus {
  outline: none;
  border-color: #6366f1;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.candidex-select-wrapper {
  position: relative;
  flex-grow: 1;
  width: 100%;
}
.candidex-select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  display: flex;
  align-items: center;
  color: #6366f1;
}
.candidex-form-select {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  padding: 8px 42px 8px 12px;
  border-radius: 7px;
  font-size: 13px;
  cursor: pointer;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  background-image: none;
}
.candidex-form-select:focus {
  border-color: #6366f1;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.candidex-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.candidex-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
}
.candidex-badge::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}
.candidex-badge-high {
  background-color: #ecfdf5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
.candidex-badge-high::before {
  background-color: #10b981;
}
.candidex-badge-low {
  background-color: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}
.candidex-badge-low::before {
  background-color: #f59e0b;
}
.candidex-badge-none {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
.candidex-badge-none::before {
  background-color: #ef4444;
}
.candidex-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px 24px;
  margin-bottom: 12px;
}
.candidex-col-span-2 {
  grid-column: span 2;
}
.candidex-form-row {
  display: flex;
  gap: 12px;
  align-items: flex-start; /* Better for grid layout */
  width: 100%;
}
.candidex-field-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  border-radius: 8px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #6366f1;
  flex-shrink: 0;
}
.candidex-field-icon svg {
  width: 18px !important;
  height: 18px !important;
}
.candidex-input-wrapper.candidex-align-start {
  align-items: flex-start;
}
.candidex-input-wrapper.candidex-align-start .candidex-field-icon {
  margin-top: 2px;
}
.candidex-header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.candidex-overall-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}
.candidex-conf-dot {
  width: 6px;
  height: 6px;
  background-color: #10b981;
  border-radius: 50%;
}
.candidex-privacy-box {
  display: flex;
  gap: 12px;
  background-color: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 8px;
  padding: 10px 14px;
  margin-top: 6px;
  color: #4c1d95;
  font-size: 12px;
}
.candidex-privacy-icon {
  color: #8b5cf6;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.candidex-privacy-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.candidex-privacy-title {
  font-weight: 700;
}
.candidex-privacy-desc {
  color: #6d28d9;
  font-size: 11px;
}
.candidex-btn-retake {
  border: 1px solid #e2e8f0;
  color: #475569;
  background-color: #ffffff;
  margin-inline-end: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.candidex-btn-retake:hover {
  background-color: #f1f5f9;
  color: #0f172a;
  border-color: #cbd5e1;
}
.candidex-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 6px;
  border-top: 1px solid #f1f5f9;
  padding-top: 12px;
}
.candidex-btn {
  background: none;
  border: none;
  padding: 8px 18px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 700;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s ease;
}
.candidex-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.candidex-btn-save {
  background-color: #6366f1;
  color: #ffffff;
  box-shadow: 0 1px 3px rgba(99, 102, 241, 0.3);
}
.candidex-btn-save:hover {
  background-color: #4f46e5;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);
}
.candidex-btn-save:active {
  transform: translateY(0);
}
.candidex-btn-discard {
  border: 1px solid #e2e8f0;
  color: #475569;
  background-color: #f1f5f9;
}
.candidex-btn-discard:hover {
  background-color: #e2e8f0;
  color: #0f172a;
}
.candidex-error-message {
  display: none;
  color: #ef4444;
  font-size: 11px;
  font-weight: 500;
  margin-top: 4px;
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  padding: 6px 10px;
}
.candidex-review-card--dup-locked {
  position: relative;
  overflow: hidden;
}
.candidex-duplicate-layer {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px 24px;
  border-radius: inherit;
  background: rgba(15, 23, 42, 0.48);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  animation: cdx-dup-fade-in 0.2s ease;
}
.candidex-duplicate-dialog {
  width: min(100%, 460px);
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 14px;
  padding: 28px 24px 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
  text-align: center;
  color: #92400e;
  animation: cdx-dup-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.candidex-duplicate-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 14px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fef3c7;
  color: #d97706;
}
.candidex-duplicate-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.25;
  color: #78350f;
}
.candidex-duplicate-text {
  margin: 0 0 10px;
  line-height: 1.45;
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}
.candidex-duplicate-date {
  margin: 0 0 18px;
  line-height: 1.4;
  font-size: 12px;
  font-weight: 500;
  color: #b45309;
}
.candidex-duplicate-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}
.candidex-btn-dup-secondary,
.candidex-btn-dup-primary {
  cursor: pointer;
  min-height: 44px;
  min-width: 130px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.candidex-btn-dup-secondary {
  border: 1px solid #d97706;
  background: #fff;
  color: #92400e;
}
.candidex-btn-dup-secondary:hover {
  background: #fef3c7;
}
.candidex-btn-dup-secondary:focus-visible,
.candidex-btn-dup-primary:focus-visible {
  outline: 2px solid #d97706;
  outline-offset: 2px;
}
.candidex-btn-dup-primary {
  border: 1px solid #d97706;
  background: #d97706;
  color: #fff;
}
.candidex-btn-dup-primary:hover {
  background: #b45309;
  border-color: #b45309;
}
@keyframes cdx-dup-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes cdx-dup-pop {
  from { transform: translateY(8px) scale(0.98); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .candidex-duplicate-layer,
  .candidex-duplicate-dialog {
    animation: none;
  }
}
.candidex-extraction-status {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  white-space: nowrap;
  text-align: right;
  opacity: 1;
  transition: opacity 0.35s ease;
}
.candidex-extraction-status-warn {
  color: #c2410c;
}
.candidex-extraction-status-error {
  color: #b91c1c;
}
.cdx-extraction-banner-leaving {
  opacity: 0 !important;
  pointer-events: none;
}
/* â”€â”€ Custom Dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
.cdx-dropdown {
  position: relative;
  flex-grow: 1;
  width: 100%;
  user-select: none;
}
.cdx-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #0f172a;
  padding: 8px 12px;
  border-radius: 7px;
  font-size: 13px;
  font-family: system-ui, -apple-system, sans-serif;
  cursor: pointer;
  width: 100%;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
}
.cdx-dropdown-trigger:hover {
  border-color: #c7d2fe;
}
.cdx-dropdown-placeholder {
  color: #94a3b8;
}
.cdx-dropdown.open .cdx-dropdown-trigger {
  border-color: #6366f1;
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
.cdx-dropdown-chevron {
  color: #6366f1;
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
  width: 16px !important;
  height: 16px !important;
}
.cdx-dropdown.open .cdx-dropdown-chevron {
  transform: rotate(180deg);
}
.cdx-dropdown-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.06);
  z-index: 9999;
  overflow: hidden;
  animation: cdx-dd-open 0.15s cubic-bezier(0.16,1,0.3,1);
}
@keyframes cdx-dd-open {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.cdx-dropdown.open .cdx-dropdown-menu {
  display: block;
}
.cdx-dropdown-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-family: system-ui, -apple-system, sans-serif;
  color: #0f172a;
  cursor: pointer;
  transition: background-color 0.12s ease;
}
.cdx-dropdown-option:hover {
  background-color: #f5f3ff;
  color: #4338ca;
}
.cdx-dropdown-option.selected {
  background-color: #eef2ff;
  color: #4338ca;
  font-weight: 600;
}
.cdx-dropdown-option .cdx-opt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #6366f1;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.cdx-dropdown-option.selected .cdx-opt-dot {
  opacity: 1;
}
`;