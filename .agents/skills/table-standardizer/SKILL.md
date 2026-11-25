---
name: table-standardizer
description: >-
  Universal datagrid and table matrix standardizer for TopsCore LMS. Triggered by /check-table, /fix-table, /audit-table, or whenever datagrid tables, column alignments, headers, or footers are reviewed, audited, or edited.
---

# Table Matrix Standardizer (`/check-table` / `/fix-table`)

This skill enforces the 13 Pillars of Universal Table Standardization and the Single-Pass Table Editing Protocol for TopsCore LMS.

## Trigger Shortcuts
- `/check-table`
- `/fix-table`
- `/audit-table`

## Execution
Run the universal table standardization test:
```powershell
npm.cmd run test:table
```

## The 13 Pillars of Table Standardization
1. **Uniform 12px Font Size**: Table body cells and headers enforce 12px Inter.
2. **Superscript Tag Standard (1.0em)**: Tags/ordinal numbers (`1st`, `2nd`, `3rd`, `th`) scaled cleanly at 1.0em.
3. **Table Spatial Margins & Viewport Lock**: Strict 10px spacing around the table, zero outer page scroll.
4. **Two-Tier Sticky Header Locking**: Super-Header locked at `top: 0` (30px), Sub-Header locked at `top: 30px` (30px), total 60px height.
5. **Small Table Anti-Ballooning & Zero Scrollbar**: Micro-tables bound tightly without empty space.
6. **Sort Icon Modernization**: Pure directional indicators (`▲` / `▼`), no idle clutter `⇅`.
7. **Live Monitor & Pure English**: 100% English messaging and semantic badges.
8. **Curriculum & Topics Harmonization**: Standardized column widths across matrices.
9. **Universal Master Edit Mode White Excel Gridlines**: Crisp `1px solid rgba(255, 255, 255, 0.45)` gridlines during Master Edit Mode (`rgba(255, 255, 255, 0.12)` when subtle/read-only).
10. **Universal Zero-Truncation Invariant**: Single-line non-wrapped text (`white-space: nowrap !important;`), zero ellipsis/clipping.
11. **Level Promotion Passing Threshold**: Minimum score **$\ge 60\%$** (Grade D *Enough* on CEC / Grade C *Enough* on TOP), Grade F (forgiven), or Grade R (remedial).
12. **Super-Header & Sub-Header Exact Group Color Match**: Header borders and text themes matching parent quadrants.
13. **Universal Zero False-Red & Code-After-Numbering Sequence**: Pending grades render neutral slate (`#64748b`), never red; entity codes immediately follow numbering before long descriptive titles; demographics enforce standard `Male`/`Female` (strictly zero `Mister`/`Miss`); legends dock in Sub Panel (`setBottomInfobar`).
