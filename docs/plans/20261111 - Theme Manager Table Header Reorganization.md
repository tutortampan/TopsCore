# TopsCore Implementation Plan — Theme Manager Table Header Reorganization

**Date:** 2026-11-11  
**Target:** Vocabulary Vault — Theme & Topic Manager Table Header & Column Layout  
**Author:** Pair Programming Agent & User  

---

## 1. Problem Statement & Objectives

In the Theme & Topic Manager table (`#theme-manager-flat-table` in `js/admin/vocab-vault.js`):
1. The composite identifier column `CODE` (e.g. `1G1`) was placed at the far right edge (Column 18), detached from its source components (`LVL`, `TH-CD`, `TP-CD`).
2. Theme Code (`TH-CD`) and Topic Code (`TP-CD`) were placed after the entity names, rather than functioning as prefixes or logical identifiers.
3. The super-header had a redundant `CODE` super-header over `CODE` sub-header, and used technical jargon `MULTI-TENANT` instead of `PROGRAM ACCESS`.
4. Summary metrics were split: `WORDS` and `PHRASES` were trailing breakdown columns, while `TOTAL` had a solitary `SUMMARY` super-header.

**Objective:**
Reorganize the 19 columns into a seamless, hierarchically consistent flow:
- **First 6 Columns (HIERARCHY & IDENTITY)**: `LVL` | `TH-CD` | `THEME` | `TP-CD` | `TOPIC NAME` | `CODE`
- **Next 4 Columns (WORDS BREAKDOWN)**: `VERB` | `NOUN` | `ADJ` | `OTH`
- **Next 4 Columns (PHRASES BREAKDOWN)**: `EXP` | `PRV` | `IDM` | `OTH`
- **Next 3 Columns (METRICS SUMMARY)**: `WORDS` | `PHRASES` | `TOTAL`
- **Column 18 (PROGRAM ACCESS)**: `PROGRAMS` (Assigned institutions/programs)
- **Column 19 (ACTION)**: `ACT` (Delete topic mini-button, edit-mode only)

---

## 2. Proposed Column Sequence Reference

| Col Index | Sub-Header | Super-Header | Description & Type |
|:---:|:---|:---|:---|
| 0 | `LVL` | `HIERARCHY & IDENTITY` | Level number/label (1ST) |
| 1 | `TH-CD` | `HIERARCHY & IDENTITY` | Theme letter code (G) |
| 2 | `THEME` | `HIERARCHY & IDENTITY` | Theme name (General) |
| 3 | `TP-CD` | `HIERARCHY & IDENTITY` | Topic number code (1) |
| 4 | `TOPIC` | `HIERARCHY & IDENTITY` | Topic name (Time Name) |
| 5 | `CODE` | `HIERARCHY & IDENTITY` | Dynamic composite code (`${lvl}${thCode}${tpCode}`) |
| 6 | `VERB` | `WORDS BREAKDOWN` | Verb count |
| 7 | `NOUN` | `WORDS BREAKDOWN` | Noun count |
| 8 | `ADJ` | `WORDS BREAKDOWN` | Adjective count |
| 9 | `OTH` | `WORDS BREAKDOWN` | Other words count (adverbs, prepositions) |
| 10 | `EXP` | `PHRASES BREAKDOWN` | Expression count |
| 11 | `PRV` | `PHRASES BREAKDOWN` | Proverb count |
| 12 | `IDM` | `PHRASES BREAKDOWN` | Idiom count |
| 13 | `OTH` | `PHRASES BREAKDOWN` | Other phrases count (phrasal verbs, collocations) |
| 14 | `WORDS` | `METRICS SUMMARY` | Subtotal single words (highlighted blue) |
| 15 | `PHRASES` | `METRICS SUMMARY` | Subtotal phrases (highlighted purple) |
| 16 | `TOTAL` | `METRICS SUMMARY` | Grand total vocabulary (highlighted teal/green) |
| 17 | `PROGRAMS` | `PROGRAM ACCESS` | Assigned programs badges + assign modal button |
| 18 | `ACT` | `ACTION` | Topic delete mini-button (edit mode only) |

---

## 3. Implementation Steps

1. **Step 1: Update Table Structure in `js/admin/vocab-vault.js`**:
   - Reorder `thead` super-headers:
     - `HIERARCHY & IDENTITY` (`colspan="6"`)
     - `WORDS BREAKDOWN` (`colspan="4"`)
     - `PHRASES BREAKDOWN` (`colspan="4"`)
     - `METRICS SUMMARY` (`colspan="3"`)
     - `PROGRAM ACCESS` (`colspan="1"`)
     - `ACTION` (`colspan="1"`, edit-mode-only)
   - Reorder `thead` sub-headers to match columns 0–18.
   - Reorder `tbody` row `<td>` rendering in `buildTableBodyHtml` to match exact sequence.
2. **Step 2: Update Playwright Verification Script**:
   - Update cell index mappings in `scripts/verify_merged_theme_topics.mjs`.
3. **Step 3: Automated Execution & Verification**:
   - Run verification script via Playwright.
   - Confirm table rendering, cell alignments, sticky headers, and composite code calculations.
4. **Step 4: Documentation & State Update**:
   - Update `docs/CURRENT_STATE.md` and `docs/CHANGELOG.md`.

---

## 4. Verification Plan

- Run `node scripts/verify_merged_theme_topics.mjs` to verify:
  - 19 columns render properly.
  - Level 1 row extracts correct `TH-CD`, `THEME`, `TP-CD`, `TOPIC`, and composite `CODE`.
  - Metrics `verb`, `noun`, `words`, and `total` are accurately extracted from the new column indices.
  - No JavaScript runtime errors or broken layouts.

