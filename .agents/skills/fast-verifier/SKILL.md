---
name: fast-verifier
description: >-
  Ultra-fast codebase and preflight verifier for TopsCore LMS. Triggered by /verify, /test-fast, or whenever the user asks to run quick verification tests, syntax checks, or verify zero regressions across the codebase.
---

# Fast Preflight Verifier (`/verify` / `/test-fast`)

This skill provides an ultra-fast (< 1.5s) in-process AST syntax and safeguard verification runner for TopsCore LMS without spawning slow headless browsers or external processes.

## Trigger Shortcuts
- `/verify`
- `/test-fast`

## Execution
Run the smart fast preflight script:
```powershell
npm.cmd run test:fast
```

## What it Verifies
1. **In-Process AST Syntax Engine**: Scans all 50+ JavaScript files in `< 0.2s` for zero syntax errors.
2. **CSS Build Pipeline**: Validates and minifies `style.css`, `dashboard.css`, `result.css`, `test.css`, `auth.css`, and `admin.css`.
3. **Repetitive Mastery & Dashboard Synchronization Safeguards**:
   - Forgiven & manual override attempt metadata selection.
   - Section tagging and heuristic classification (Words vs Phrases).
   - Self-healing balancer for 14-attempt payloads.
   - Backend symmetric partitioning (7 Words + 7 Phrases).
