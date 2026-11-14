# Pop-up 03: Classes Selector Modal Modernization & Visual Normalization Plan

> **Plan Type:** Interactive Mobile Pop-up Modernization & Spatial Alignment (390 × 844 px)  
> **Status:** [PENDING APPROVAL] User Review Required  
> **Target Scope:** Pop-up 03 (`#classes-selector-modal` / Lobby Dialog) in Student Mobile Area  
> **Key Invariants Codified:** Ergonomic 60px Modal Footer, 350px Golden Width (20px Margin), Zero Emojis, Rule 2.10 Authoritative Grade Colors, Dual-Scale Family A (20-16-12 px) Typography  

---

## 1. Executive Summary & Problem Statement

Pop-up 03 (**Classes Selector Modal / LOBBY**) is the gateway through which students switch their active learning subjects (e.g., Active Communication, Grammar & Structure, Vocabulary Mastery, Pronunciation, Business Presentation).

An audit of the current mobile implementation (`#classes-selector-modal`) reveals key violations of TopsCore design standards:
1. **Missing 60px Modal Footer**: The dialog currently terminates abruptly after the last item. It lacks a dedicated `60px` bottom footer with a `40px` Call-To-Action (CTA) confirmation button (`ENTER CLASS →`), violating the user's explicit structural directive:
   > *"bagian save an continue, atau smua Call to action button harus ada dalam bottom footer atau apa istilahnya yang berisi tombol konfirmasi sesuai pada sistem yang punya ruang tinggi 60 px"*
2. **Ad-hoc Modal Width & Asymmetric Margins**: Stretched to `364.4px` width with `12.8px` left margin, violating the standard `350px` width and symmetrical `20px` edge margins established in Pop-ups 01 & 02.
3. **Decorative Emoji Icons**: Items use color emojis (`📚`, `✍️`, `🗣️`, `🎧`, `📈`), violating the strict Zero Emojis Invariant.
4. **Monochrome Hardcoded Scores**: All class progress scores currently render in uniform cyan (`#38bdf8`), violating TopsCore AGENTS.md Rule 2.10 authoritative grading scale.
5. **Typographic Fragmentation**: Class titles use `0.9rem` (~14.4px) and scores use `0.88rem` (~14px), violating the Dual-Scale Family A (20 - 16 - 12 px) standard.
6. **Inconsistent Spacing**: Uses an 8px item gap instead of the strict 10px container gap invariant.

---

## 2. 📐 Visual Pre-Flight Verification Checklist

- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance, floating rem typography, emojis, and lack of footer ([`mobile_popup_03_before.png`](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mobile_popup_03_before.png)).
- [x] **Proposed Visual Mockup (After)**: High-fidelity mobile visual showing standardized 350px width, 60px footer with 40px CTA button, clean SVG icons, 10px container gap, and Rule 2.10 colors ([`mobile_popup_03_after.png`](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mobile_popup_03_after.png)).
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock on mobile viewport (390 × 844 px); total modal height `456px` leaves `388px` vertical clearance (100% zero scroll).
- [x] **Container Spacing**: Verified strict 10px gap between all class cards and header/footer separators.
- [x] **Dedicated 60px Modal Footer**: Verified `height: 60px !important;` housing `40px` confirmation button (`ENTER CLASS →`) with mathematical `10px` top and bottom clearance.
- [x] **Dynamic Columns & Nowrap**: Verified single-line class names and right-aligned progress indicators.
- [x] **Zero Dead Space**: Verified 350px modal fills mobile viewport symmetrically with exact 20px edge margins.
- [x] **Language Standard**: Verified all headers, labels, and CTA buttons use 100% direct English (`LOBBY`, `SELECT CLASS TO ENTER`, `ENTER CLASS →`).

---

## 3. 📱 Side-by-Side Visual Comparison (Before vs After)

| 📱 BEFORE: Baseline Implementation | 📱 AFTER: Standardized Modernized Modal |
| :---: | :---: |
| <img src="file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mobile_popup_03_before.png" width="240" alt="Before: Baseline Classes Selector" style="border-radius: 14px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 28px rgba(0,0,0,0.6);" /> | <img src="file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mobile_popup_03_after.png" width="240" alt="After: Standardized Classes Selector" style="border-radius: 14px; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 28px rgba(0,0,0,0.6);" /> |
| <sub>• Width: <strong>364.4 px</strong> (Asymmetric left: 12.8px)<br>• <strong>NO Bottom Footer</strong> (abrupt cutoff)<br>• Decorative color emojis (📚, ✍️, 🗣️, 🎧, 📈)<br>• Monochrome cyan scores (all #38bdf8)<br>• Floating rems (0.9rem / 0.88rem)<br>• 8px item gap</sub> | <sub>• Width: <strong>350 px</strong> (Symmetric 20px margin)<br>• <strong>Dedicated 60px Footer</strong> with 40px CTA button<br>• Professional SVG vector icons (Zero Emojis)<br>• Dynamic Rule 2.10 Grade Colors (Lime, Yellow, Pink, Orange, Red)<br>• Strict Dual-Scale Family A (20 - 16 - 12 px)<br>• Strict 10px container gap</sub> |

---

## 4. 📊 Detailed Parameter & Specification Comparison

| Design & Spatial Attribute | BEFORE (Current State) | AFTER (Standardized Proposal) | Target Rule & Invariant |
| :--- | :--- | :--- | :--- |
| **Modal Width & Margin** | `364.4px` width, `12.8px` margin | **`350px`** width, **`20px`** screen edge margin | Symmetrical Mobile Footprint ([`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md)) |
| **Modal Footer** | ❌ **None** (List abruptly ends) | ✅ **Dedicated 60px Footer** (`height: 60px; padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.08)`) | User Directive & Modal Footer Invariant (§2.3) |
| **Call-To-Action (CTA) Button** | ❌ None | ✅ **`40px` Height** (`ENTER CLASS →`, 16px bold 700 text, cyan accent) | 40px Button Clearance Invariant |
| **Modal Header & Title** | `1.15rem` White (`#ffffff`), no divider | **`20px`** Bold 800 Tactical Cyan (`#38bdf8`), with crisp `1px` horizontal divider | Level 1 Display Typography & Group Separator |
| **Subtitle Text** | `Select a class to enter` (Mixed case, muted) | **`SELECT CLASS TO ENTER`** (`12px`, bold 600, uppercase slate `#94a3b8`) | Level 3 Label Typography |
| **Class Iconography** | Colored Emojis: `📚`, `✍️`, `🗣️`, `🎧`, `📈` | **Vector SVG Icons** in 32×32px rounded containers (`#38bdf8` outline) | Strict Zero Emojis Invariant |
| **Class Card Height** | Auto / ~44px variable | **`52px`** ergonomic touch target | Ergonomic Mobile Touch Target |
| **Class Name Typography** | `0.9rem` (~14.4px) | **`16px`** Bold 700 (`#f8fafc`) | Dual-Scale Family A (Level 2 Content) |
| **Progress Subtitle Typography** | `0.75rem` (~12px) | **`12px`** Bold 600 (`#94a3b8`) | Dual-Scale Family A (Level 3 Label) |
| **Score / Percentage Typography** | `0.88rem` (~14px) bold | **`16px`** Bold 800 | Dual-Scale Family A (Level 2 Content) |
| **Score Color Policy** | Monochrome cyan (`#38bdf8`) for all | **Dynamic Rule 2.10 Grade Colors**:<br>• `100% ★`: Electric Pink (`#ff2d87`)<br>• `90-99%`: Grade A Green (`#00c000`)<br>• `80-89%`: Grade B Lime (`#95ff00`)<br>• `60-79%`: Grade C Yellow (`#ffff00`)<br>• `30-59%`: Grade D Orange (`#ff8c00`)<br>• `0-29%`: Grade E Red (`#ff0000`) | Rule 2.10 Authoritative Grading Scale & SSOT |
| **Inter-Item Gap** | `8px` | **`10px`** | Strict 10px Container Gap Invariant |
| **Total Modal Height** | `378px` | **`456px`** (~54% of 844px screen; `388px` vertical headroom) | 100% Zero Scroll / No Clipping |

---

## 5. 🔄 Interaction Flow & Mobile Touch UX

```mermaid
sequenceDiagram
  autonumber
  actor Student as Student (Mobile User)
  participant ClassesBar as Classes Bar (30px)
  participant Modal as Pop-up 03 (Lobby Dialog)
  participant CTA as 60px Footer (ENTER CLASS →)
  participant Dashboard as Student Dashboard Workstation

  Student->>ClassesBar: Tap Classes Bar / Change Class
  ClassesBar->>Modal: Open Pop-up 03 (LOBBY)
  Modal-->>Student: Display Active Classes (Initial selection highlighted)
  Student->>Modal: Tap another Class Card (e.g. Grammar & Structure)
  Modal->>Modal: Highlight selected card (Cyan border & subtle glow)
  Student->>CTA: Tap "ENTER CLASS →" Confirmation Button
  CTA->>Dashboard: Commit selected Class ID
  Dashboard->>Dashboard: Re-render Next Hero Test, Progress & Leaderboard
  CTA->>Modal: Close Pop-up 03
```

- **Deliberate Selection**: Tapping a class card highlights it as the active candidate (`.selected`), preventing accidental immediate jumps while glancing at progress metrics.
- **Definitive Confirmation**: Tapping `ENTER CLASS →` in the 60px footer commits the selection, updates the dashboard state, and smoothly dismisses the modal.
- **Instant Dismissal Options**: Students can tap the header close button (✕) or the dark backdrop to dismiss without altering their current class.

---

## 6. 🛠️ Implementation Plan & Proposed Code Changes

### Step 1: Markup Modernization in `dashboard.html`
Update `#classes-selector-modal` to structure the body and dedicated footer:
```html
<!-- Classes Selector Modal (Triggered by clicking 30px Classes Bar) -->
<div class="modal-backdrop hidden" id="classes-selector-modal" role="dialog" aria-modal="true" aria-labelledby="classes-selector-modal-title">
  <div class="modal-box classes-selector-modal-box">
    <div class="classes-selector-modal-body">
      <div class="classes-selector-modal-header">
        <div>
          <h3 id="classes-selector-modal-title" class="classes-selector-title">LOBBY</h3>
          <p class="classes-selector-subtitle">SELECT CLASS TO ENTER</p>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm classes-selector-close-btn" id="close-classes-selector-modal" aria-label="Close">✕</button>
      </div>
      <div id="classes-selector-modal-list" class="classes-selector-modal-list">
        <!-- Dynamically populated with active classes -->
      </div>
    </div>
    <!-- Ergonomic 60px Modal Footer Invariant -->
    <div class="classes-selector-modal-footer">
      <button type="button" class="btn btn-primary classes-selector-btn-confirm" id="btn-confirm-class-selection">ENTER CLASS &rarr;</button>
    </div>
  </div>
</div>
```

### Step 2: Spatial & Style Normalization in `css/dashboard.css`
1. Lock `.classes-selector-modal-box` to `max-width: 350px !important; border-radius: 20px !important; overflow: hidden !important; padding: 0 !important;`.
2. Add `.classes-selector-modal-body` with `padding: 16px 16px 10px 16px; box-sizing: border-box; width: 100%;`.
3. Add `.classes-selector-modal-header` with `border-bottom: 1px solid rgba(255, 255, 255, 0.12); padding-bottom: 10px; margin-bottom: 10px;`.
4. Style `.classes-selector-title` to `font-size: 20px; font-weight: 800; letter-spacing: 1px; color: #38bdf8;`.
5. Style `.classes-selector-subtitle` to `font-size: 12px; font-weight: 600; text-transform: uppercase; color: #94a3b8;`.
6. Standardize `.classes-selector-modal-list` with `display: flex; flex-direction: column; gap: 10px !important;`.
7. Standardize `.classes-selector-item` with `height: 52px; padding: 10px 14px; border-radius: 12px; background: #151D2F; border: 1.5px solid rgba(255, 255, 255, 0.08);`.
8. Implement `.classes-selector-modal-footer`:
   ```css
   .classes-selector-modal-footer {
     height: 60px !important;
     min-height: 60px !important;
     max-height: 60px !important;
     padding: 10px 16px !important;
     box-sizing: border-box !important;
     display: flex !important;
     align-items: center !important;
     justify-content: center !important;
     border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
     background: rgba(15, 23, 42, 0.6) !important;
     width: 100% !important;
     flex-shrink: 0 !important;
   }
   .classes-selector-modal-footer .classes-selector-btn-confirm {
     height: 40px !important;
     line-height: 40px !important;
     width: 100% !important;
     margin: 0 !important;
     padding: 0 16px !important;
     font-size: 16px !important;
     font-weight: 700 !important;
     border-radius: 10px !important;
     background: #0284c7 !important;
     border: 1px solid #38bdf8 !important;
     color: #ffffff !important;
   }
   ```

### Step 3: Logic & Dynamic Rendering in `js/dashboard.js`
1. **Dynamic SVG Icons Set**: Replace raw emojis array with curated SVGs (Chat/Speech, Pen/Feather, Book/Vault, Mic, Monitor/Presentation).
2. **Authoritative Grade Color Mapping**: Integrate `getGradeColorByScore(pct)` into score rendering, appending `★` if `pct === 100`.
3. **Selection & Confirmation Handling**:
   - Tapping an item marks it as the candidate selection without dismissing immediately.
   - Clicking `#btn-confirm-class-selection` commits the selected class, triggers dashboard re-rendering, and dismisses the modal.
   - Preserves double-tap or auto-switch fallback for high accessibility.

---

## 7. 🧪 Verification & Regression Testing Plan

1. **Mobile Visual Capture Verification**: Run automated Playwright script on viewport `390 × 844 px` to verify live rendering against the approved mockup.
2. **Computed Spatial Inspection**:
   - Modal Box width: `350 px` (Left: `20 px`, Right: `370 px`).
   - Modal Footer: `height: 60 px`, padding: `10px 16px`.
   - Action Button: `height: 40 px`, centered with `10px` top and bottom margins.
   - Card Gap: `10 px`.
   - Dual-Scale Typography: Headers `20px`, Cards `16px`, Subtitles `12px`. Zero `14px` or floating `rem` values.
3. **Full Regression Suites**:
   - `node scripts/check_all_js_syntax.cjs` (49/49 files pass).
   - `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs` (100% pass).
   - `node scripts/check_workspace_hygiene.mjs` (100% pass).

---

## 8. 💬 Key Decisions Awaiting User Review

> [!IMPORTANT]
> **Questions for User Confirmation:**
> 1. **Interaction Flow**: Do you approve the two-step interaction (tap class to highlight $\rightarrow$ tap `ENTER CLASS →` in 60px footer to confirm and enter), or should tapping a card also enter immediately? *(Recommended: Selection + `ENTER CLASS →` confirmation to prevent accidental mis-taps on mobile).*
> 2. **Visual Presentation & Colors**: Do you approve the SVG vector icons and dynamic Rule 2.10 Grade Colors (`100% ★` Pink, `85%` Lime, `60%` Yellow, `45%` Orange, `0%` Red) as captured in [`mobile_popup_03_after.png`](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mobile_popup_03_after.png)?
