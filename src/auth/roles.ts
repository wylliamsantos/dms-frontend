export const APP_ROLES = {
  OWNER: 'ROLE_OWNER',
  ADMIN: 'ROLE_ADMIN',
  REVIEWER: 'ROLE_REVIEWER',
  VIEWER: 'ROLE_VIEWER',
  LEGACY_VIEWER: 'ROLE_DOCUMENT_VIEWER'
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const PERMISSIONS = {
  search: [APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.REVIEWER, APP_ROLES.VIEWER, APP_ROLES.LEGACY_VIEWER],
  uploadDocument: [APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.REVIEWER],
  reviewWorkflow: [APP_ROLES.OWNER, APP_ROLES.ADMIN, APP_ROLES.REVIEWER],
  manageCategories: [APP_ROLES.OWNER, APP_ROLES.ADMIN]
} as const;

export function hasAnyRole(roles: string[], requiredRoles: readonly string[]) {
  return requiredRoles.some((role) => roles.includes(role));
}
