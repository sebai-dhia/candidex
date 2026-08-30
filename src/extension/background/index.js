import { registerActionListener } from './action.js';
import { registerMessageListener } from './messages.js';
import { registerPortRelay } from './port-relay.js';
import { lockStorageToTrustedContexts } from './ai/storage-access.js';

registerActionListener();
registerMessageListener();
registerPortRelay();
void lockStorageToTrustedContexts();