import { APPLICATION_STATUS, CUSTOM_OPTION, WORK_TYPE } from '../constants/application-options.constants';

const STATUS_KEYS: Record<string, string> = {
  [APPLICATION_STATUS.APPLIED]: 'status.applied',
  [APPLICATION_STATUS.INTERVIEW]: 'status.interview',
  [APPLICATION_STATUS.OFFER]: 'status.offer',
  [APPLICATION_STATUS.REJECTED]: 'status.rejected',
  [APPLICATION_STATUS.WITHDRAWN]: 'status.withdrawn',
};

const WORK_TYPE_KEYS: Record<string, string> = {
  [WORK_TYPE.REMOTE]: 'workType.remote',
  [WORK_TYPE.HYBRID]: 'workType.hybrid',
  [WORK_TYPE.ON_SITE]: 'workType.onsite',
};

/** Map a stored English status to an i18n key (Sheets stays English). */
export function statusMessageKey(status: string | null | undefined): string | null {
  if (!status) return null;
  return STATUS_KEYS[status] ?? null;
}

/** Map a stored English work type to an i18n key (Sheets stays English). */
export function workTypeMessageKey(workType: string | null | undefined): string | null {
  if (!workType) return null;
  return WORK_TYPE_KEYS[workType] ?? null;
}

/** Display label key for platform options that are not brand names. */
export function platformMessageKey(platform: string | null | undefined): string | null {
  if (!platform) return null;
  if (platform === CUSTOM_OPTION) return 'common.other';
  if (platform === 'Company Site') return 'platform.companySite';
  return null;
}

/** Display label key for tracking filter options. */
export function filterMessageKey(filter: string | null | undefined): string | null {
  if (!filter) return null;
  if (filter === 'All') return 'filter.all';
  return statusMessageKey(filter);
}