# TopsCore LMS — AI Continuation System & Documentation Templates

> **Purpose:** Ensures the project remains 100% restartable across AI agent sessions. Every returning or fresh agent continues from known state without relying on ephemeral conversation history.

---

## 1. Required State Files

### 1.1 `docs/CURRENT_STATE.md` (The Single Restart Point)
A new agent MUST read this file first. It captures the live phase, completed milestones, in-progress tasks, database migrations, and next exact action.

Template:
```markdown
# CURRENT STATE

Last Updated: YYYY-MM-DD HH:mm UTC
Current Phase: <phase>
Current Task: <task>
Status: NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETE

## Completed
- ...

## In Progress
- ...

## Not Started
- ...

## Current Architecture
- ...

## Database State
- Latest migration: ...
- Tables created: ...
- RLS status: ...

## Frontend State
- Pages completed: ...

## Backend State
- Edge Functions completed: ...

## Tests
- Last command: ...
- Last result: PASS / FAIL

## Known Issues
- ...

## Blockers
- ...

## Next Exact Action
1. ...
```

---

## 2. Changelog, Decisions & Session Logs

### 2.1 `docs/CHANGELOG.md`
Records every meaningful code, schema, config, or documentation change:
```markdown
## [YYYY-MM-DD HH:mm] — <short title>
**Agent/Session:** <identifier>
**Phase:** <phase>
**Status:** PASS | FAIL | BLOCKED

### Why
- ...
### Changed
- ...
### Files
- ...
### Database
- ...
### Tests
- command: `...`
- result: `PASS` / `FAIL`
```

### 2.2 `docs/DECISIONS.md`
Permanent architectural decision records (ADRs). Never rewrite history; mark superseded decisions as `SUPERSEDED` and add new ADRs.

### 2.3 `docs/SESSION_LOG.md`
Chronological trajectory record per working session.

### 2.4 `docs/BLOCKERS.md`
Unresolved blockers and specification conflicts. Never hide a blocker inside a generic TODO.

---

## 3. Historical Bootstrap Agent Command
The initial prompt used when bootstrapping the repository:
```text
Read AGENTS.md first and treat it as the execution contract.
Before changing application code:
1. inspect the entire repository structure;
2. read docs/CURRENT_STATE.md if it exists;
3. read docs/CHANGELOG.md, docs/DECISIONS.md, docs/TODO.md, and docs/BLOCKERS.md;
4. compare the existing implementation with AGENTS.md;
5. identify the smallest safe next task;
6. implement only that task;
7. run verification;
8. update all required state/change documentation;
9. report PASS/FAIL/BLOCKED with exact evidence and the next action.
```

