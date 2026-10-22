import { registerActionListener } from './action.js';
import { registerMessageListener } from './messages.js';
import { registerPortRelay } from './port-relay.js';
import { lockStorageToTrustedContexts } from './ai/storage-access.js';

import { clearLegacyBadge } from './ai-engine-health.js';

registerActionListener();
clearLegacyBadge();
registerMessageListener();
registerPortRelay();
void lockStorageToTrustedContexts();