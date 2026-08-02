export const OrganizationPermissions = {
  READ: 'org:read',
  UPDATE: 'org:update',
  DELETE: 'org:delete',
  BILLING: 'org:billing',
  MEMBER_READ: 'member:read',
  MEMBER_UPDATE: 'member:update',
  MEMBER_DELETE: 'member:delete',
  INVITE: 'member:invite',
} as const;

export const ProjectPermissions = {
  CREATE: 'project:create',
  READ: 'project:read',
  UPDATE: 'project:update',
  DELETE: 'project:delete',
} as const;

export const EnvironmentPermissions = {
  CREATE: 'env:create',
  READ: 'env:read',
  UPDATE: 'env:update',
  DELETE: 'env:delete',
  DEPLOY: 'env:deploy',
} as const;

export const SecretPermissions = {
  CREATE: 'secret:create',
  READ: 'secret:read',
  UPDATE: 'secret:update',
  DELETE: 'secret:delete',
  ROTATE: 'secret:rotate',
  REVEAL: 'secret:reveal',
} as const;

export const PipelinePermissions = {
  CREATE: 'pipeline:create',
  READ: 'pipeline:read',
  UPDATE: 'pipeline:update',
  DELETE: 'pipeline:delete',
  TRIGGER: 'pipeline:trigger',
  CANCEL: 'pipeline:cancel',
} as const;
