# Dual-Scale Typography Architecture & Pop-Up Windows 1 & 2 Normalization Plan

> **Phase:** Phase 474  
> **Status:** PENDING USER REVIEW & APPROVAL  
> **Artifact Type:** Architectural Implementation Plan & Visual Pre-Flight  

---

## 1. Goal Description

Establish an authoritative, harmonious, and unambiguous typographic foundation across TopsCore LMS by codifying and enforcing a **Dual-Scale Typography Architecture**:

1. **Family A: Standard UI & Content Hierarchy (`20px – 16px – 12px`)**:
   - The universal rule for all text prose, table data cells, table headers, form inputs, buttons, chips, subtitles, captions, and dialogs.
   - **Zero Tolerance Policy**: Eradicates all ambiguous intermediate font sizes (`14px`, `13px`, `15px`), micro-fonts (`sub-12px`: 8px, 9px, 10px, 11px), and floating rem approximations (`0.75rem`, `0.82rem`, `0.88rem`, `0.9rem`).
2. **Family B: Hero Metric & Display Scale (`25px – 30px – 35px – 40px`)**:
   - Strictly reserved for high-impact numerical indicators, focal counters, large countdown timers, and final report card score percentages (`100% ★`, `14 / 40`).
   - Strictly **forbidden** for regular sentence prose, buttons, and content labels.

This plan normalizes **Pop-Up Window 1 (Incomplete Submit Modal)** and **Pop-Up Window 2 (Ready to Submit Modal)** in `css/test.css` and `test.html` to strictly conform to this dual-scale model, providing an exact side-by-side Before & After comparison.

---

## 2. Visual Pre-Flight Protocol & Baseline Snapshots

### 📸 Current State Visual Baseline

- Pop-Up Window 1 (Incomplete Submit Modal): `popup_01_test_incomplete_submit.png`
- Pop-Up Window 2 (Ready to Submit Modal): `popup_02_test_complete_submit.png`

---

## 3. Detailed Side-by-Side Typography Mapping

### ⚠️ Pop-Up Window 1: Incomplete Submit Modal (`#hazard-incomplete-wrap`)

| Component Element | Current State (Before) | Proposed State (After) | Family & Scale Assignment | Architectural Rationale & Visual Impact |
| :--- | :---: | :---: | :---: | :--- |
| **Top Action Button** (`.hazard-btn-giveup`) | `1.45rem` (~23.2px)<br>weight: `900` | **`20px`**<br>weight: `800` | **Family A: Level 1**<br>*(20px Display)* | Normalizes from arbitrary 23.2px down to authoritative 20px. Height remains locked at 64px–66px. Renders crisp, bold, and proportionally balanced with the container. |
| **Warning Header Title** (`.hazard-warning-title`) | `1.05rem` (~16.8px)<br>weight: `800` | **`16px`**<br>weight: `700` | **Family A: Level 2**<br>*(16px Title)* | Replaces the floating 16.8px with standard 16px Title. Letter-spacing calibrated to `0.5px` for optimal dark-slate legibility. |
| **Strip Subtitle Label** (`.hazard-counter-label`) | `0.82rem` (~13.1px)<br>weight: `750` | **`12px`**<br>weight: `700` | **Family A: Level 3**<br>*(12px Rest)* | **Eliminates the legacy 13.1px odd size**. Aligns seamlessly with the universal 12px label standard across all TopsCore dashboards and dialogs. |
| **Counter Numbers** (`.hazard-counter-value-white`) | `2.35rem` (~37.6px)<br>weight: `950` | **`35px`**<br>weight: `900` | **Family B: Metric Large**<br>*(35px Counter)* | **Preserves high-impact numerical visual dominance**. Instead of flattening to 20px (which would make the counter appear shrunken and timid), it anchors to the formal 35px Metric Scale. |
| **Counter Divider Slash** (`.hazard-counter-slash`) | `1.5rem` (~24px)<br>weight: `700` | **`20px`**<br>weight: `700` | **Family A: Level 1**<br>*(20px Display)* | Harmonizes the slash separator proportionally with the 35px numbers. |
| **Bottom Action Button** (`.hazard-btn-back-neon`) | `1.35rem` (~21.6px)<br>weight: `900` | **`20px`**<br>weight: `800` | **Family A: Level 1**<br>*(20px Display)* | Creates perfect symmetry with the top button (**20px vs 20px**), establishing visual harmony across the 3-Tier Hazard layout. |

---

### ✅ Pop-Up Window 2: Ready to Submit Modal (`#hazard-complete-wrap`)

| Component Element | Current State (Before) | Proposed State (After) | Family & Scale Assignment | Architectural Rationale & Visual Impact |
| :--- | :---: | :---: | :---: | :--- |
| **Ready Heading** (`.hazard-ready-heading`) | `1.35rem` (~21.6px)<br>weight: `900` | **`20px`**<br>weight: `800` | **Family A: Level 1**<br>*(20px Display)* | Standardizes from 21.6px to clean 20px Display. Header remains authoritative and uplifting. |
| **Completion Message** (`.hazard-ready-sub`) | `0.9rem` (~14.4px)<br>weight: `400` | **`12px`**<br>weight: `500` | **Family A: Level 3**<br>*(12px Rest)* | **Eliminates the legacy 14.4px violation**. Replaces it with crisp 12px medium body copy. Emphasized count (`40`) remains white bold. |
| **Submit Action Button** (`#confirm-submit-btn`) | `1.35rem` (~21.6px)<br>weight: `900` | **`20px`**<br>weight: `800` | **Family A: Level 1**<br>*(20px Display)* | Locks primary confirmation button font to 20px, consistent across all student action triggers. |
| **Cancel Button** (`.hazard-btn-neutral`) | `0.95rem` (~15.2px)<br>weight: `800` | **`16px`**<br>weight: `700` | **Family A: Level 2**<br>*(16px Title)* | **Eliminates the awkward 15.2px size**. Elevates secondary dismissal button to standard 16px, cleanly tiered below the 20px submit button. |

---

## 4. User Review Required & Design Invariants

- **Family A (`20 – 16 – 12`)**: All text, buttons, labels, and tables. Zero 14px, zero 13px, zero 15px.
- **Family B (`25 – 30 – 35 – 40`)**: Numbers, focal counters, timers, and scores only.
In Pop-Up 1, the counter `14 / 40` will anchor to **`35px`** (Family B). This preserves the bold visual impact of the test progress without breaking the content rules.

---

## 5. Proposed Changes (Code Diffs)

### Component: Student Test Room Styles (`css/test.css`)

```diff
 /* TIER 1: GIVE UP! Button (RED ACCENT) */
 .hazard-btn-giveup {
   height: 66px;
   min-height: 66px;
   background: #141A28 !important;
   color: var(--grade-e) !important;
   border: 1.8px solid var(--grade-e) !important;
   border-radius: 16px;
-  font-size: 1.45rem;
-  font-weight: 900;
+  font-size: 20px;
+  font-weight: 800;
   letter-spacing: 1.5px;
   text-transform: uppercase;
 }

 .hazard-warning-title {
-  font-size: 1.05rem;
-  font-weight: 800;
+  font-size: 16px;
+  font-weight: 700;
   color: var(--grade-c);
   letter-spacing: 0.8px;
   text-transform: uppercase;
   margin-bottom: 2px;
   line-height: 1.2;
 }

 .hazard-counter-label {
-  font-size: 0.82rem;
-  font-weight: 750;
+  font-size: 12px;
+  font-weight: 700;
   color: #94A3B8;
   letter-spacing: 1px;
   text-transform: uppercase;
 }

 .hazard-counter-value-white {
-  font-size: 2.35rem;
-  font-weight: 950;
+  font-size: 35px;
+  font-weight: 900;
   line-height: 1;
   letter-spacing: 0.5px;
   color: #FFFFFF;
 }

 .hazard-counter-slash {
-  font-size: 1.5rem;
+  font-size: 20px;
   font-weight: 700;
   color: #64748B;
   margin: 0 4px;
 }

 /* TIER 3: BACK TO THE TEST Button (GREEN ACCENT) */
 .hazard-btn-back-neon {
   height: 66px;
   min-height: 66px;
   background: #141A28 !important;
   color: var(--grade-a) !important;
   border: 1.8px solid var(--grade-a) !important;
   border-radius: 16px;
-  font-size: 1.35rem;
-  font-weight: 900;
+  font-size: 20px;
+  font-weight: 800;
   letter-spacing: 1.2px;
   text-transform: uppercase;
 }

 /* Ready State */
 .hazard-ready-heading {
-  font-size: 1.35rem;
-  font-weight: 900;
+  font-size: 20px;
+  font-weight: 800;
   color: var(--grade-a);
   margin-bottom: 4px;
   text-transform: uppercase;
 }

 .hazard-ready-sub {
-  font-size: 0.9rem;
+  font-size: 12px;
   color: #94A3B8;
   margin: 0;
 }

 .hazard-btn-neutral {
   height: 48px;
   background: #1A2540;
   border: 1px solid rgba(255, 255, 255, 0.12);
   color: #CBD5E1;
   border-radius: 12px;
-  font-size: 0.95rem;
-  font-weight: 800;
+  font-size: 16px;
+  font-weight: 700;
 }
```

---

## 6. Verification Plan

1. **Spatial Invariant Checker**: `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs`
2. **Universal Color Token SSOT Audit**: `node scripts/test_universal_color_token_ssot.mjs`
3. **Whole Codebase JS Syntax Validation**: `node scripts/check_all_js_syntax.cjs`
4. **CSS Verification**: Verify zero occurrences of legacy rem sizes in `#submit-modal`.
