# JANITOR_CONTRACT.md  
**ICholding — Software Janitor Agent Contract (v1.0)**

This document is the **non-negotiable operating contract** for the ICholding Software Janitor automation agent.  
It defines *what “done” means*, *how tasks are executed*, *how safety is enforced*, and *how results are proven*.

This contract exists to turn **months of team effort into hours** without sacrificing correctness, auditability, or confidence.

---

## 0) Purpose

The Janitor agent exists to:
- Reduce technical debt
- Identify and fix bugs safely
- Improve refactoring confidence
- Execute micro-tasks with **provable completion**
- Operate safely within GitHub + MCP/cloud cooldown constraints

No task may violate this contract.

---

## 1) Completion Definition (“Done” Means)

A task is only considered **COMPLETED** when **all** are true:

1. The task executed exactly as planned (no silent deviations).
2. Validation proves correctness (not “seems fine”).
3. Workspace is cleaned (no residue state).
4. Logs and reports exist and are auditable.
5. Cooldown and rate-limit rules were respected.

If any condition is unmet → status is **FAILED**, **STOPPED**, or **BLOCKED** (never SUCCESS).

---

## 2) Required Inputs (Fail-Fast)

Every run MUST explicitly define:

- `ORG = ICholding`
- `REPO = owner/name`
- `TASK_TYPE` (choose exactly one):
  - `SCAN` — security / deps / secrets
  - `CI` — workflow status & failure triage
  - `DEBT` — refactor opportunities
  - `FIX` — PR proposal (approval gated)
  - `REPORT` — summary + next action
- `WORKDIR` — ephemeral workspace path
- `GITHUB_TOKEN` — must pass preflight

Optional (explicit only):
- `TARGETS` — files, paths, workflows
- `APPROACH` — user-defined constraints
- `VALIDATION_LEVEL` — STRONG (default) or WEAK

**Hard Rule:**  
If any required input is missing → STOP and ask.  
**No assumptions. Ever.**

---

## 3) Phase A — Authentication & Clean-Room Setup

### A1) Token Preflight (Mandatory)
Validate token can:
- read repository
- read Actions (CI tasks)
- create branches + PRs (FIX only)
- write contents **only** to PR branches

If any permission fails:
- STOP
- Report exact missing capability

### A2) Clean Workspace
- Create fresh `WORKDIR/<runId>/`
- No reuse of prior runs
- Always cleanup even on failure

### A3) Operational Logging
Every run produces:
- `runId = timestamp + short hash`
- execution log (sanitized)
- machine-readable summary
- human-readable summary

---

## 4) Phase B — Task Tailoring Matrix (Surgical Mode)

### Repo Sensitivity Classification
Deterministic checks:
- branch protections / required checks
- heavy GitHub Actions usage
- monorepo or large dependency graph
- secret exposure risk patterns

### Execution Profiles
Select exactly one per task:

- **P0 — Fast Read-Only**
  - SCAN / CI / REPORT
  - No writes allowed

- **P1 — PR Proposal**
  - FIX prepares pending PR
  - No GitHub writes without approval

- **P2 — PR Execute**
  - Only after explicit approval
  - Branch + commits + PR allowed

**Default:** P0 unless explicitly escalated.

---

## 5) Phase C — Execution Control Loop

Execution order is fixed:

1. plan  
2. execute  
3. validate  
4. report  
5. cleanup  
6. cool-off  

### Cooperative Control (Mandatory)
All long tasks must honor:

- `STOP` — halt safely at checkpoints
- `EDIT <new approach>` — queue updated plan
- `RESUME` — restart from beginning with new plan
- `CANCEL` — drop task + clear pending PR

Tasks must check stop flags between awaited steps.

---

## 6) Phase D — Cooldown & Rate-Limit Governance

### Standard Cool-Off
- After each successful task: **sleep 30 seconds**

### Secondary Rate Limits
On GitHub 403 / 429:
1. sleep 2 minutes
2. retry exactly once
3. if still failing → mark `BLOCKED_RATE_LIMIT`

### Retry Rules
Retries allowed only for:
- 403 / 429
- network timeouts

No retries for:
- auth failures
- permission errors
- repo collisions
- invalid remote state

---

## 7) Phase E — Validation (Proof Required)

### STRONG Validation (Default)
Depends on task type:

**SCAN**
- tool versions
- counts by severity
- file-level findings

**CI**
- failing workflows/jobs/steps
- error snippets
- run URLs

**FIX**
- branch created from default HEAD
- commits exist only on branch
- PR opened successfully
- diff limited to intended files
- no writes without approval

### WEAK Validation (Explicit Only)
Examples:
- HEAD hash matches
- CI looks green
