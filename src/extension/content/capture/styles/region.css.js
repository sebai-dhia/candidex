export const REGION_CSS = `.candidex-selection {
  position: absolute;
  border: 2px dashed #6366f1;
  background-color: rgba(99, 102, 241, 0.05);
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
  display: none;
  pointer-events: auto;
}
.candidex-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: #6366f1;
  border: 1.5px solid #ffffff;
  border-radius: 2px;
  z-index: 10;
  display: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
}
.candidex-handle-tl { top: -4px; left: -4px; cursor: nwse-resize; }
.candidex-handle-tr { top: -4px; right: -4px; cursor: nesw-resize; }
.candidex-handle-br { bottom: -4px; right: -4px; cursor: nwse-resize; }
.candidex-handle-bl { bottom: -4px; left: -4px; cursor: nesw-resize; }

.candidex-crop-toolbar {
  position: absolute;
  display: none;
  gap: 8px;
  background-color: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 6px 12px;
  border-radius: 8px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  z-index: 100;
  pointer-events: auto;
  font-family: system-ui, -apple-system, sans-serif;
}
.candidex-toolbar-btn {
  background: none;
  border: none;
  color: #f8fafc;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
}
.candidex-btn-recapture {
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.candidex-btn-recapture:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
.candidex-btn-extract {
  background-color: #6366f1;
}
.candidex-btn-extract:hover {
  background-color: #4f46e5;
  transform: translateY(-1px);
}
.candidex-btn-extract:active {
  transform: translateY(0) scale(0.97);
}
`;