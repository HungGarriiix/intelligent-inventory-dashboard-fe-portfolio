export const AGING_THRESHOLD_DAYS = 90;
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_ACTION_LENGTH = 500;
export const MAX_NOTES_LENGTH = 2000;
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
export const CSV_DATE_FORMAT = 'YYYY-MM-DD';

export const VALIDATION_MESSAGES = {
  emailInvalid: 'Invalid email address.',
  passwordRequired: 'Password is required.',
  vehicleIdRequired: 'The vehicleId field is required.',
  userIdRequired: 'The userId field is required.',
  actionRequired: 'Action label is required.',
  actionTooLong: `Action label must be ${MAX_ACTION_LENGTH} characters or fewer.`,
  notesTooLong: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
  invalidRequestBody: 'Request body must be a JSON object.',
} as const;
