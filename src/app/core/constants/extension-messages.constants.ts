import messages from '../../../contracts/extension-messaging/messages.json';

/** Message actions shared between the Angular app and content script. */
export const EXTENSION_MSG = messages;

export type ExtensionMessageAction = keyof typeof EXTENSION_MSG;