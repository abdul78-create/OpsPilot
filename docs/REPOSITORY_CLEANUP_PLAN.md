# OpsPilot Repository Cleanup Plan

**Date:** 2026-09-03  
**Status:** PROPOSED & CONTROLLED  
**Objective:** Eliminate temporary verification scripts, scratch files, and production failure-masking constructs while preserving 100% of real production code, Prisma schema/migrations, configurations, and permanent automated tests.

---

## 1. Inventory Summary

| Category | File Count | Primary Locations |
| :--- | :--- | :--- |
| **Backend Source Files** | ~120 | `src/` |
| **Frontend Source Files** | ~140 | `frontend/src/` |
| **Prisma Schema & Migrations** | 1 schema, 12 migrations | `prisma/` |
| **Automated Unit & Spec Tests** | 62 test suites | `src/**/*.spec.ts` |
| **E2E Integration Test Suite** | 16 test suites | `test/` |
| **Temporary Scratch Files** | 12 files | `<artifact-dir>/scratch/` |
| **Operational & QA Scripts** | 27 files | `scripts/` |
| **Documentation & Architecture** | 9 files | `docs/` |
| **Database Backups & Dumps** | 3 files | `backups/` |
| **Infrastructure Configurations** | ~15 files | `infrastructure/`, `docker-compose*.yml` |

---

## 2. File Classification Matrix

### A. Production Source Code (KEEP_PRODUCTION)
- All files under `src/core/` (security guards, database prisma, event bus, config, filters, interceptors, worker state-machine)
- All files under `src/v1/modules/` (auth, organizations, projects, repositories, pipelines, runs, worker, artifacts, deployments, observability, secrets, ai-orchestration, log-streaming, webhooks, audit-logs, health)
- All files under `frontend/src/` (app pages, components, layout, stores, hooks, lib API client, styles)
- `prisma/schema.prisma` and all migration SQL in `prisma/migrations/`

### B. Permanent Test Suites (KEEP_TEST)
- All `src/**/*.spec.ts` (62 suites, 296 unit/integration tests)
- `test/jest-e2e.json` and all existing specs under `test/`
- `scripts/e2e-test.ps1` (Operational CI/CD loop test runner with container & database assertions)
- **NEW**: `test/reality-pipeline-flow.e2e-spec.ts` (Permanent Jest/Supertest automated E2E regression suite migrated from temporary audit runners)

### C. Legitimate QA & Operational Fixtures (KEEP_QA / KEEP_CONFIGURATION)
- `prisma/seed.js` (Default database seed fixture)
- `prisma/seed-qa.js` (QA Workspace, Organization, Owner User fixture)
- `prisma/prisma-cleanup.js` (Startup migration metadata recovery utility)
- `scripts/promote-user.sql` (Operational SQL utility to promote user to OWNER/ADMIN)
- `scripts/verify-email.sql` (Operational SQL utility to mark email as verified)
- `scripts/migrate.sh` (Container entrypoint database migration executor)
- `backups/*.sql` (Disaster recovery verification database dumps — isolated in `.gitignore`)

### D. Authoritative Documentation (KEEP_DOCUMENTATION)
- `docs/E2E_REALITY_AUDIT.md` (Authoritative full-stack reality audit report)
- `docs/ARCHITECTURE.md` (System architecture, event bus, and isolation boundary documentation)
- `docs/API_DOCUMENTATION.md` (API routes and contract documentation)
- `docs/DEPLOYMENT_GUIDE.md` (Production deployment documentation)
- `docs/DEVELOPER_GUIDE.md` (Local development setup guide)
- `docs/ENGINEERING_PRINCIPLES.md` (Design and reliability principles)
- `docs/LOAD_RELIABILITY_REPORT.md` (Load and stress test report)
- `docs/RELEASE_CHECKLIST.md` (Production release gates)
- `docs/RENDER_DEPLOYMENT_GUIDE.md` (Render cloud deployment guide)
- `docs/REPOSITORY_CLEANUP_PLAN.md` (This cleanup plan)
- `docs/REPOSITORY_CLEANUP_REPORT.md` (Final cleanup verification report)

### E. Production Failure-Masking Constructs (DELETE_FAKE_PRODUCTION_CODE)
- `src/v1/modules/repositories/services/repository-scanner.service.ts` (Line 92: `|| true` in monorepo test command generation)
- `src/v1/modules/pipelines/workflow-compiler.service.ts` (Lines 25, 28, 31, 37, 38: `|| echo "No test script configured"` and `|| true` in generated YAML templates)

### F. Temporary Scratch Scripts & Output Dumps (DELETE_TEMPORARY / DELETE_GENERATED_OUTPUT)
*(All test logic migrated into `test/reality-pipeline-flow.e2e-spec.ts` before deletion)*
- `scratch/e2e_reality_audit.js` → MIGRATED & DELETED
- `scratch/verify_dynamic_yaml_execution.js` → MIGRATED & DELETED
- `scratch/test_patch.js` → DELETED (Temporary route testing)
- `scratch/check_run.js` → DELETED (Temporary debug script)
- `scratch/check_db.js` → DELETED (Temporary DB check)
- `scratch/check_mem.js` → DELETED (Temporary memory check)
- `scratch/check-qa-user.js` → DELETED (Temporary user check)
- `scratch/contract_audit.js` → DELETED (Temporary route audit)
- `scratch/list_endpoints.js` → DELETED (Temporary endpoint dump)
- `scratch/audit_flow.js` → DELETED (Temporary flow script)
- `scratch/endpoints.json` → DELETED (Generated JSON)
- `scratch/e2e_reality_audit_results.json` → DELETED (Generated JSON)

### G. Sprint Manual Acceptance Scripts (REVIEW_REQUIRED)
The 23 standalone acceptance runners in `scripts/` (e.g. `adversarial-docker-runner-chaos.js`, `canary-traffic-live-acceptance.js`, `golden-path-e2e.js`, etc.) are historical milestone verification scripts. They are non-destructive and do not run during standard CI (`npm test`).  
**Recommendation:** Retain in `scripts/` as manual operator diagnostic utilities or archive into `scripts/archive/` without deleting.

---

## 3. Execution Sequence

1. **Step 1: Test Logic Migration**: Create `test/reality-pipeline-flow.e2e-spec.ts` containing the automated assertions for dynamic YAML commands (success, failure exit 42, multi-stage skip, artifact generation, rollback).
2. **Step 2: Remove Failure Masking in Production**: Fix `repository-scanner.service.ts` and `workflow-compiler.service.ts` to eliminate `|| true` and `|| echo ...`.
3. **Step 3: Scratch Files Deletion**: Remove confirmed temporary scripts and JSON dumps from `scratch/`.
4. **Step 4: Update `.gitignore`**: Verify `.gitignore` comprehensively covers `dist/`, `out/`, `.next/`, `scratch/`, `backups/*.sql`, `coverage/`, and local logs.
5. **Step 5: Full Build & Test Verification**: Execute `npm test`, `npm run build`, `npm run test:e2e`, and frontend TypeScript check.
6. **Step 6: Final Documentation**: Produce `docs/REPOSITORY_CLEANUP_REPORT.md`.
