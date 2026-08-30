export const OVERLAY_CSS = `
#candidex-capture-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(15, 23, 42, 0.45);
  cursor: crosshair;
  user-select: none;
  pointer-events: auto;
}
.candidex-instruction {
  position: absolute;
  top: 32px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f8fafc;
  padding: 10px 20px;
  border-radius: 9999px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.95rem;
  font-weight: 500;
  pointer-events: none;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.2s ease;
}`;