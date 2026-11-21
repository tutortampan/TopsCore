---
name: workspace-hygiene
description: >-
  Workspace hygiene auditor and temporary artifact cleaner for TopsCore LMS. Triggered by /clean, /hygiene, or whenever checking for lingering one-off scripts, scratch files, or completed plans.
---

# Workspace Hygiene & Cleaner (`/clean` / `/hygiene`)

This skill audits repository hygiene in accordance with `AGENTS.md` §5.3 and `.agents/rules/agent-workflow.md` §6 to prevent residual file bloat.

## Trigger Shortcuts
- `/clean`
- `/hygiene`

## Execution
Run the hygiene audit script:
```powershell
npm.cmd run check:hygiene
```

## Hygiene Rules Enforced
1. **One-Off Script Eradication**: Temporary scripts in `scripts/` must be cleaned up once their diagnostic task is concluded. Only permanent test suites registered in `package.json` are retained.
2. **Plan Lifecycle Auto-Purge**: Plans in `docs/plans/` that have completed implementation must be archived to `docs/archive/plans_completed/`.
3. **Scratch Files Isolation**: Debug scratch files must reside exclusively in the brain scratch directory (`<appDataDir>/brain/<conversation-id>/scratch/`), never in the workspace root.
