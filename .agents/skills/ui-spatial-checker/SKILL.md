---
name: ui-spatial-checker
description: >-
  Automated spatial and visual layout validator for TopsCore LMS.
  Use this skill whenever UI layouts, CSS, or tables are modified to verify strict 100vh lock, 10px container gap, 40px Sub Panel (lower panel) height, dynamic single-line column text, and centered loading states.
---

# UI Spatial & Visual Invariant Checker

This skill provides an automated audit runner to verify that TopsCore LMS screens strictly comply with spatial layout rules from [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md):
- **§1.1 & §1.8**: 100vh Viewport Lock & `calc(100vh - 80px)` Banner Deduction (`AGENTS.md` §2.28 & §2.32).
- **§1.2 & §1.3**: Universal Sub Panel (Lower Panel 40px height) & 10px Container Gap.
- **§1.4**: Centered Loading States & Pure English Messaging.
- **§1.5**: Floating Window Architecture (60px Title Area, 40px Toolbar Area, 60px CTA Area, and 80vh max-height).
- **§4.1 & §4.2**: Dynamic Column Sizing, Single-Line Non-Wrapped Text (`white-space: nowrap !important` with Vocab phrase wrap exception), and Zero Dead Space.

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
- [x] `#admin-console` set to `calc(100vh - 80px)`.
- [x] Floating window Title Area (60px) titles strictly enforce 16px Outfit, ALL CAPS (`text-transform: uppercase !important`), centered alignment, and zero subtitle clutter.
- [x] Floating window heights standardized to 75vh – 80vh maximum.
- [x] Sub Panel (lower panel) and summary footers standardized to 40px height.
- [x] Containers maintain 10px spacing.
- [x] Table cells enforce tabular numbers and nowrap text.
- [x] Student summary footer is clean with no useless `Avg: ... pts` under Actions.
- [x] Loading spinners are centered and messaging is in direct English.
