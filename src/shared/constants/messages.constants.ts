export const MESSAGES = {
  HEALTH_CHECK_SUCCESS: 'System is healthy and operational',
  USER_CREATED: 'User successfully created',
  USER_UPDATED: 'User successfully updated',
  USER_DELETED: 'User successfully deleted',
  USER_FOUND: 'User retrieved successfully',
  USERS_RETRIEVED: 'Users retrieved successfully',
  USER_NOT_FOUND: 'User not found',
  USER_EMAIL_EXISTS: 'A user with this email address already exists',
  INTERNAL_SERVER_ERROR: 'An unexpected internal server error occurred',
  VALIDATION_ERROR: 'Request validation failed',
} as const;
