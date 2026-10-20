import { registerActionListener } from './action.js';
import { registerMessageListener } from './messages.js';
import { registerPortRelay } from './port-relay.js';
import { lockStorageToTrustedContexts } from './ai/storage-access.js';

import { registerBadgeSync } from './ai-engine-health.js';

registerActionListener();
registerBadgeSync();
registerMessageListener();
registerPortRelay();
void lockStorageToTrustedContexts();