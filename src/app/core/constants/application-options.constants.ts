export const APPLICATION_STATUS = {
  APPLIED: 'Applied',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
} as const;

export const APPLICATION_FILTER = {
  ALL: 'All',
} as const;

export const WORK_TYPE = {
  ON_SITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
} as const;

export const CUSTOM_OPTION = 'Other';

export const APPLICATION_STATUSES = [
  APPLICATION_STATUS.APPLIED,
  APPLICATION_STATUS.INTERVIEW,
  APPLICATION_STATUS.OFFER,
  APPLICATION_STATUS.REJECTED,
  APPLICATION_STATUS.WITHDRAWN,
] as const;

export const APPLICATION_FILTER_OPTIONS = [APPLICATION_FILTER.ALL, ...APPLICATION_STATUSES] as const;

export const APPLICATION_PLATFORMS = ['LinkedIn', 'Indeed', 'Glassdoor', 'Company Site', CUSTOM_OPTION] as const;

export const APPLICATION_COUNTRIES = [
  'Tunisia',
  'France',
  'Germany',
  'UAE',
  'Saudi Arabia',
  'Qatar',
  'Canada',
  'USA',
  'Morocco',
  'UK',
  'Australia',
  CUSTOM_OPTION,
] as const;

export const WORK_TYPES = [WORK_TYPE.ON_SITE, WORK_TYPE.HYBRID, WORK_TYPE.REMOTE] as const;

export const DEFAULT_APPLICATION_VALUES = {
  PLATFORM: APPLICATION_PLATFORMS[0],
  COUNTRY: APPLICATION_COUNTRIES[0],
  WORK_TYPE: WORK_TYPE.REMOTE,
  STATUS: APPLICATION_STATUS.APPLIED,
} as const;