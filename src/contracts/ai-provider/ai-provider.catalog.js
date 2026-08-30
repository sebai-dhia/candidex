import catalog from './ai-provider.catalog.json';

/** @readonly */
export const AI_PROVIDER_CATALOG = catalog;

/** @param {string} providerId */
export function getProviderDefinition(providerId) {
  return AI_PROVIDER_CATALOG.find((entry) => entry.id === providerId) || null;
}

export function getProviderHostPermissions() {
  return AI_PROVIDER_CATALOG.map((entry) => entry.hostPermission);
}