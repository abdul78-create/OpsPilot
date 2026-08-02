# OpsPilot Permanent Development Directive v2.0

## Mission
Build **OpsPilot** as a real commercial SaaS product.
Optimize ONLY for software that a real customer can sign up for, use, and rely on.

---

## 95/5 Rule
- Spend **95%** of the session writing production code and executing runtime verification.
- Spend **5%** writing the report.
- Zero new planning documents, ADRs, PRDs, or non-essential UI features.

---

## Golden Rule & Forbidden Phrases
**If you claim a feature is built, it must actually work.**
Never report something as complete if it is only UI, mock data, simulated, placeholder, hardcoded, or visual prototype.

**PERMANENT FORBIDDEN PHRASES:**
Never say "Complete", "Production Ready", "Commercial Ready", or "Nothing Missing" unless every claim is backed by runtime evidence.

## Full Production Milestone Rule (Permanent)
Every sprint must complete an entire production milestone. Do NOT stop after implementing one feature.
Continue implementing every closely related task until either:
1. The milestone is genuinely complete OR
2. A real blocker prevents further work.

---

## Evidence Levels & Execution Rule
**Never mark a workflow step as complete because the code exists. Mark it complete ONLY after execution evidence exists.**

Every completed feature must include at least one automated integration test. A feature without an automated integration test cannot be reported as complete.

Evidence Levels:
- **Level 0** — Idea
- **Level 1** — Code written
- **Level 2** — Unit tests passed
- **Level 3** — Integration tests passed
- **Level 4** — Running locally verified
- **Level 5** — Running inside Docker verified
- **Level 6** — End-to-end customer workflow demonstrated with stdout / exit codes / DB rows
- **Level 7** — Used successfully by a real external user (reachable app endpoint / live traffic)

Customer-facing status MUST always specify feature-by-feature Evidence Levels.

**EVIDENCE LEVEL ELEVATION RULE:**
NO FEATURE MAY INCREASE ITS EVIDENCE LEVEL WITHOUT NEW RUNTIME EVIDENCE.
Writing code cannot move Level 1 → Level 4.
Passing unit/integration tests cannot move Level 3 → Level 6.
Only live runtime execution evidence can increase evidence levels.

## Security Testing Rule (Permanent)
**Every security-sensitive feature must have both a positive and a negative test.**
Automated tests for authentication, encryption, and authorization must explicitly verify that valid requests succeed AND that invalid/tampered/missing credentials are strictly rejected (e.g. valid HMAC signature → 200, modified body / invalid signature → 401).

---

## Recovery Rule (Permanent)
**Every long-running operation must answer:**
*If the server crashes here, how is the operation recovered?*
Every worker and execution service must implement startup state reconciliation to recover or cleanly fail orphaned jobs left in `RUNNING` or `QUEUED` states after process restarts.

---

## Evidence Rule (Permanent)
**Never infer execution. Never assume execution. Never report execution.**

Every execution claim MUST include one of:
- exit code
- stdout
- stderr
- filesystem evidence
- API response
- database row
- queue state
- container id

If no evidence exists, report: **NOT VERIFIED.**

---

## Implementation Report Template
Every turn report MUST strictly use this structure:

```text
═══════════════════════════════════════
OPSPILOT IMPLEMENTATION REPORT
═══════════════════════════════════════

FEATURE
-------
What exactly was built?

FILES
-----
Which files changed?

RUNTIME EVIDENCE & FEATURE EVIDENCE LEVELS
------------------------------------------
What commands actually executed?
What exit codes were returned?
What HTTP endpoints were verified?
What database rows changed?
What Docker containers actually ran?

Feature Evidence Breakdown:
| Feature             | Evidence Level |
| ------------------- | -------------- |
| [Feature Name]      | Level X        |

WHAT IS STILL NOT REAL?
-----------------------
List every mocked/simulated component. Do not hide them.

SELF REVIEW
-----------
Did I build exactly what I claimed? (YES / PARTIAL / NO)
If PARTIAL: What is missing?

NEXT TASK
---------
Exactly one task. No planning. No future roadmap. No new features. Only the next reliability dependency.
```

---

## Reality Check (End of Every Report)
Every report MUST finish with these exact questions answered YES or NO:

```text
Can a developer push a GitHub repository and obtain a successful build?
YES / NO

Can a developer download an artifact?
YES / NO

Can a developer deploy?
YES / NO

Would I demo this to a paying customer today?
YES / NO

What single missing capability prevents "YES"?
______________________
```
