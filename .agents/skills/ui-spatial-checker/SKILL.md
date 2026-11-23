---
name: ui-spatial-checker
description: >-
  Master visual, table, typography, color, card, padding, and layout auditor for TopsCore LMS. Triggered by /check-ui, /audit-ui, or whenever any UI element, screen, or screenshot is inspected or modified to verify 100% compliance across all UI rules (Colors, Tables, Cards, Fonts, Padding, Sizes, Buttons, 100vh lock, and 10px gaps).
---

# Master UI & Visual Invariant Auditor (`/check-ui`)

This skill serves as the **single authoritative master auditor** for all user interface, layout, typography, table, card, color, and spatial rules across TopsCore LMS.

## Trigger Shortcuts
- **`/check-ui`** *(or `/audit-ui`, `/check-all`)*

## Execution
Run the full comprehensive UI audit runner:
```powershell
npm.cmd run check:ui
```
*(Executes all 5 UI verification suites in ~2.5s: fast preflight, spatial invariants, 11 pillars of table standardization, color token SSOT, and typography scale).*

---

## The Complete UI Invariants Checklist (All-in-One SSOT)

Whenever `/check-ui` is invoked on a live screen, component, or screenshot, inspect **all 8 core dimensions**:

### 1. Spacing, Container Gaps & 4-Way Panel Perimeter (Strict 10px Lock)
- Exactly **10px gap** NOT ONLY between individual elements (cards, containers, buttons, tables), but ALSO as the strict **4-way perimeter clearance to surrounding panels**:
  - **Top Panel**: 10px gap from top toolbar / nav tabs / header.
  - **Bottom Panel (Sub Panel 40px)**: 10px gap from the bottom Sub Panel.
  - **Side Panels**: 10px gap from the left Sidebar and right viewport edge.
- Zero double gaps (20px–30px) and zero phantom dead spaces or 0px flush edges.

### 2. Card & Panel Internal Padding (Strict 10px Lock)
- Exactly **10px padding** inside cards, containers, and table wrapper areas.
- No bulky 20px–30px padding on compact workstation cards.

### 3. Dual-Scale Typography & Font Sizes (Inter SSOT)
- **Single-Font Architecture**: 100% **`Inter`** (`--font-sans`, `--fm-font-display`). Zero Outfit font.
- **Hierarchy Scale**:
  - `20px`: Major Page Header / Workspace Title.
  - `16px`: Title Area (60px header), Modal Titles (ALL CAPS `text-transform: uppercase`).
  - `14px`: Modal CTA Buttons (36px–40px), Passages, Dropdowns.
  - `12px`: Table body data cells (`td`), table headers (`th`), Sub Panel buttons (30px), badges, form inputs.
- **Strict Zero Sub-12px Font**: No microscopic text below 12px anywhere.
- **Tabular Numbers**: Numeric columns enforce monospace/tabular alignment.

### 4. Table & Datagrid Standardization (11 Pillars)
- **Two-Tier Sticky Headers**: Super-Header (30px) + Sub-Header (30px) = exactly 60px height. Solid background, no muddy opacity.
- **Gridlines**: Crisp white Excel gridlines (`rgba(255, 255, 255, 0.12)`).
- **Zero Truncation**: Single-line non-wrapped text (`white-space: nowrap !important;`), zero ellipsis.
- **Summary Footer**: Exactly 40px height (`.datagrid-summary-row`).
- **Master Edit Mode**: Centered 24px input/select height.

### 5. Color Tokens & Semantic SSOT ("Rubah Satu Maka Rubah Semua")
- **Grade Vault**:
  - ★ Excellent (100%): Purple (`#c084fc`)
  - A Very Good (90%–99%): Pure Green (`#00c000`)
  - B Good (80%–89%): Electric Lime (`#95ff00`)
  - C Enough (60%–79%): Pure Yellow (`#ffff00`)
  - D Less (30%–59%): Dark Orange (`#ff8c00`)
  - E Fail (0%–29%): Pure Red (`#ff0000`)
- **Semantic Precision**: Red actions (delete, alert) link to Grade E (`#ff0000`). Yellow warnings link to Grade C (`#ffff00`). Green active states link to Grade A (`#00c000`).
- **Optimal Text Contrast**: Dark surfaces (Navy, Slate, Pink) enforce crisp white text (`#ffffff`). Light surfaces (Tactical Blue, Orange, Lime) enforce dark slate text (`#0f172a`).

### 6. Button Sizes & CTA Spatial Golden Rules
- **In-Panel / Toolbar Buttons**: Strictly **30px** height (`height: 30px !important; line-height: 28px !important;`).
- **Modal CTA Buttons**: Strictly **36px–40px** height (`height: 36px` to `40px !important;`).
- **Ghost-to-Solid Invariant**: Standby transparent ghost outline $\to$ hover/active solid filled matte mode (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); text-shadow: none;`). Stationary hover (`transform: none`).
- **CTA Distribution Invariant**:
  - 1 button: Centered.
  - 2 buttons: Flush opposite ends (`CLOSE` at far LEFT, primary action at far RIGHT).
  - 3 buttons: Left (`CLOSE`), Center, Right.
  - Tombol penutup/pembatalan di kiri **WAJIB bernama `CLOSE`** (DILARANG menggunakan `Cancel`).

### 7. Viewport & 100vh Screen Lock
- Root `html` and `body` strictly locked to `100vh` without outer page scroll.
- `#admin-console` set to `calc(100vh - 50px)` for the 50px locked base banner.
- Sub Panel (Lower Panel) strictly locked to **40px** height.
- Modals bound to **75vh–80vh** max-height with internal scroll in `.modal-body`.

### 8. Language Purity & Zero Clutter
- **100% English**: All labels, headings, buttons, and notifications must be pure English.
- **Zero Subtitle Clutter**: Title Area of modals contains ONLY Icon and 16px ALL CAPS title. Zero subtitles, zero pills, and no top-right `✕` close button.
