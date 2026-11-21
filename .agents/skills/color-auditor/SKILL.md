---
name: color-auditor
description: >-
  Universal single-source color token and contrast auditor for TopsCore LMS. Triggered by /check-color, /audit-color, or whenever semantic colors, grades, themes, or text contrasts are verified or modified.
---

# Color Token & Contrast Auditor (`/check-color`)

This skill verifies strict adherence to the TopsCore Single-Source of Truth (SSOT) Color Governance and the "Rubah Satu Maka Rubah Semua" global propagation protocol.

## Trigger Shortcuts
- `/check-color`
- `/audit-color`

## Execution
Run the color governance audit test:
```powershell
npm.cmd run test:color-ssot
```

## Governed Color Rules
1. **Grade Color Vault**:
   - ★ Excellent (100%): Vibrant Purple (`--grade-star: #c084fc`)
   - A Very Good (90%–99%): Pure Green (`--grade-a: #00c000`)
   - B Good (80%–89%): Electric Lime (`--grade-b: #95ff00`)
   - C Enough (60%–79%): Pure Yellow (`--grade-c: #ffff00`)
   - D Less (30%–59%): Dark Orange (`--grade-d: #ff8c00`)
   - E Fail (0%–29%): Pure Red (`--grade-e: #ff0000`)
2. **One-Touch Semantic Propagation**:
   - All red elements (delete, alert, error) MUST link to Grade E (`var(--grade-e)` / `.text-fail`).
   - All yellow elements (warning, pending) MUST link to Grade C (`var(--grade-c)` / `.text-warning`).
   - All green elements (success, online, active) MUST link to Grade A (`var(--grade-a)` / `.text-success`).
3. **Contrast Invariant**:
   - Dark backgrounds (Electric Pink, Navy, Slate) MUST use crisp white text (`#ffffff`).
   - Light backgrounds (Tactical Blue, Dark Orange, Electric Lime) MUST use dark slate text (`#0f172a`).
