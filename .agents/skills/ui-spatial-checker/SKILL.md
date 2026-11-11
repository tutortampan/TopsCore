---
name: ui-spatial-checker
description: >-
  Automated spatial and visual layout validator for TopsCore LMS.
  Use this skill whenever UI layouts, CSS, or tables are modified to verify strict 100vh lock, 10px container gap, 50px lower panel height, dynamic single-line column text, and centered loading states.
---

# UI Spatial & Visual Invariant Checker

This skill provides an automated audit runner to verify that TopsCore LMS screens strictly comply with spatial layout rules:
- **Rule 15**: 100vh Viewport Lock & `calc(100vh - 60px)` Banner Deduction.
- **Rule 20**: Universal Lower Panel Architecture (50px height) & 10px Container Gap.
- **Rule 21**: Dynamic Column Sizing, Single-Line Non-Wrapped Text (`white-space: nowrap !important`), and Zero Dead Empty Space.
- **Rule 22**: Centered Loading States & Pure English Messaging.

## When to Use

Activate this skill:
1. Whenever modifying `css/admin.css` or table components in `js/admin/`.
2. Before submitting UI change proposals or concluding implementation turns.
3. In CI/CD or local test suites to ensure zero spatial regressions.

## Execution

Run the automated spatial audit script:

```bash
node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs
```

Or via npm:

```bash
npm run check:spatial
```

## Validation Checklist

The audit verifies:
- [x] Root `html` and `body` locked to `100vh` without outer page scroll.
- [x] `#admin-console` set to `calc(100vh - 60px)`.
- [x] Lower panel and summary footers standardized to 50px height.
- [x] Containers maintain 10px spacing.
- [x] Table cells enforce tabular numbers and nowrap text.
- [x] Student summary footer is clean with no useless `Avg: ... pts` under Actions.
- [x] Loading spinners are centered and messaging is in direct English.
