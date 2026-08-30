import { registerMessaging } from './messaging/bridge.js';
import { registerCaptureEscapeHandler } from './capture/capture-lifecycle.js';

registerCaptureEscapeHandler();
registerMessaging();