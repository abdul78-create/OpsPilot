# OpsPilot AI - Engineering Principles

These 10 engineering principles govern all architectural, design, and code contributions to **OpsPilot AI - Autonomous DevOps Platform**.

---

## 1. Zero Code Duplication (DRY)
Reusable logic, contracts, constants, and utilities must be extracted into `@shared/` or common modules. No redundant logic or magic strings across files.

## 2. Zero Hardcoded Secrets & Configuration Leaks
No passwords, API tokens, encryption keys, or host URIs may be hardcoded. All settings must be injected via `@nestjs/config` and validated at startup using Joi schemas (`env.validation.ts`).

## 3. Mandatory OpenAPI / Swagger Documentation
Every REST endpoint, DTO, query parameter, and HTTP response contract must be fully annotated using `@nestjs/swagger` decorators (`@ApiOperation`, `@ApiResponse`, `@ApiProperty`).

## 4. Test-Driven Quality Enforcement
Every core repository, service, and utility must include unit test specs (`*.spec.ts`). All changes must pass `npm run test` before merging.

## 5. Strict Prisma Database Migrations
All database schema changes must be declared in `prisma/schema.prisma` and applied strictly using Prisma migration commands (`npm run prisma:migrate`). No ad-hoc manual SQL schema edits.

## 6. Zero Breaking API Changes Without Versioning
API changes that break backward compatibility must be isolated under a new API version directory (`src/v2/`). Existing `/v1/` endpoints must remain stable.

## 7. High Cohesion & Loose Coupling
Feature modules must be encapsulated and self-contained. Services communicate via injected repository abstractions (Dependency Inversion), not direct ORM instances.

## 8. Composition Over Inheritance
Prefer modular composition, interfaces, mixins, and dependency injection over deep class inheritance hierarchies.

## 9. Automated Quality Gate Compliance
All pull requests and local changes must pass `npm run build`, `npm run lint`, and `npm run test` with zero warnings or errors.

## 10. Zero Placeholder & Speculative Implementations
No dummy modules, stubbed endpoints, or empty feature folders are permitted. Every file in the repository must serve an active, implemented purpose.
