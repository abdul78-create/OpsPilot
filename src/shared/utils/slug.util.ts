import { BadRequestException } from '@nestjs/common';

export const RESERVED_SLUGS = new Set([
  'admin',
  'administrator',
  'api',
  'app',
  'auth',
  'billing',
  'config',
  'dashboard',
  'docs',
  'health',
  'internal',
  'login',
  'logout',
  'metrics',
  'organizations',
  'projects',
  'register',
  'root',
  'settings',
  'support',
  'system',
  'user',
  'users',
  'v1',
  'v2',
]);

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start
    .replace(/-+$/, ''); // Trim - from end
}

export function validateSlug(slug: string): void {
  if (!slug || slug.length < 2) {
    throw new BadRequestException('Slug must be at least 2 characters long');
  }

  if (slug.length > 50) {
    throw new BadRequestException('Slug cannot exceed 50 characters');
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new BadRequestException(
      'Slug must contain only lowercase alphanumeric characters and hyphens',
    );
  }

  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    throw new BadRequestException(`Slug '${slug}' is reserved and cannot be used`);
  }
}
