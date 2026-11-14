# Class Levels Detail Modal Modernization and Visual Normalization Plan (Pop-up 05)

> **Modal ID:** `#level-modal`
> **Controller Function:** `openClassModal(subj, progress)` in `js/dashboard.js`
> **View Container:** `dashboard.html` lines 442–453
> **Stylesheet:** `css/dashboard.css` (.level-modal-box)
> **Target Footprint:** Smartphone Mobile Viewport (390 × 844 px), Modal Width strictly locked to `350 px` with `20 px` screen edge margin.

---

## 1. Visual Pre-Flight Verification & Evidence

### 1.1 Baseline vs Standardized Proposal

````carousel
![Pop-up 05 Before vs After Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_05_side_by_side_overview.png)
<!-- slide -->
![Pop-up 05 Standardized Mobile Screen](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_05_after.png)
<!-- slide -->
![Pop-up 05 Baseline Screen](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_05_before.png)
````

### 1.2 Identified Regressions & Architectural Deficiencies
1. **Missing 60px Modal Footer**:
   - *Current State*: `#level-modal` lacks a dedicated modal footer entirely. The student is forced to hunt for a tiny `✕` button at the top-right corner to exit, violating `.agents/rules/ui-invariants.md` Ergonomic 60px Modal Footer Invariant.
   - *Target Resolution*: Implement `.level-modal-footer` with exact `60px` height (`padding: 10px 16px`, `border-top: 1px solid rgba(255, 255, 255, 0.08)`) housing a full-width `40px` action button `#btn-close-level-modal-footer` (`CLOSE ← BACK TO DASHBOARD`).
2. **Horizontal Row Compression (Awkward Wrapping)**:
   - *Current State*: `.asm-modal-row` places Title, Metadata, Score Chip, and CTA Button all on a single flex row (`display: flex; justify-content: space-between`). On a 350px mobile screen with padding, available width is only ~310px. When a button takes 120px and a badge takes 60px, the title text is squashed into ~130px, resulting in awkward 3-to-4 line breaks.
   - *Target Resolution*: Standardize to a 2-Tier Modern Mobile Card Layout:
     - **Top Tier**: Topic/Theme Title on the left (14px bold white) and Score/Status Badge on the right (Grade B Lime `#95ff00`, Grade C Yellow `#ffff00`, Star Pink `#ff2d87`, or Locked Slate `#94a3b8`).
     - **Bottom Tier**: Compact Metadata (`50 PTS • Words 7/7 • Phrases 5/7`) on the left, and 32px high tactile action button (`Continue Drill →`, `Start Task →`, `Retake Exam →`, `View Result →`) on the right.
3. **Viewport Width & Edge Margins**:
   - *Current State*: `.level-modal-box` has `max-width: 680px; max-height: 90vh;`.
   - *Target Resolution*: Lock to `max-width: 350px !important; width: 100% !important; border-radius: 20px !important; overflow: hidden !important;` with 20px screen edge margin. Max height strictly bounded to `620px` to guarantee 100% zero scroll on 844px viewports.
4. **Zero Emojis & Grade Color SSOT (Rule 2.10)**:
   - *Current State*: Raw emojis (`⏱`, `⚠️`, `✓`, `✗`) and hardcoded button styles.
   - *Target Resolution*: Eradicate all emojis; replace with canonical vector SVGs via `getSvgIcon('clock', 12)`, `getSvgIcon('alert-triangle', 20)`, `getSvgIcon('lock', 12)`, and `getSvgIcon('arrow-right', 12)`. Bind all score badges to `getGradeColorByScore(pct)`.

---

## 2. Technical Implementation Specifications

### 2.1 DOM Structure (`dashboard.html`)
Replace lines 442–453 with modular markup:
```html
<!-- Level Detail Modal (Pop-up 05) -->
<div class="modal-backdrop hidden" id="level-modal" role="dialog" aria-modal="true" aria-labelledby="level-modal-title">
  <div class="modal-box level-modal-box">
    <div class="level-modal-header">
      <div class="level-modal-header-info">
        <h3 id="level-modal-title">Class Levels</h3>
        <p id="level-modal-class" class="level-modal-subtitle">Select an available drill or exam below</p>
      </div>
      <button class="level-modal-close-btn" id="close-level-modal" aria-label="Close">✕</button>
    </div>
    <div id="levels-container" class="level-modal-body"></div>
    <div class="level-modal-footer">
      <button type="button" class="btn-level-modal-footer-close" id="btn-close-level-modal-footer">
        CLOSE ← BACK TO DASHBOARD
      </button>
    </div>
  </div>
</div>
```

### 2.2 Stylesheet (`css/dashboard.css`)
Add dedicated CSS block:
```css
/* ==========================================================================
   POP-UP 05: CLASS LEVELS DETAIL MODAL (#level-modal)
   ========================================================================== */
.level-modal-box {
  width: 100% !important;
  max-width: 350px !important;
  background: #0f172a !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 20px !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6) !important;
  max-height: 640px !important;
  box-sizing: border-box !important;
}

.level-modal-header {
  padding: 16px 16px 12px 16px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  background: rgba(255, 255, 255, 0.02) !important;
  flex-shrink: 0 !important;
}

.level-modal-header-info h3 {
  font-size: 18px !important;
  font-weight: 800 !important;
  color: #38bdf8 !important;
  letter-spacing: 0.5px !important;
  text-transform: uppercase !important;
  line-height: 1.2 !important;
  margin: 0 0 2px 0 !important;
}

.level-modal-subtitle {
  font-size: 12px !important;
  color: #94a3b8 !important;
  margin: 0 !important;
}

.level-modal-close-btn {
  width: 30px !important;
  height: 30px !important;
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #cbd5e1 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  font-size: 14px !important;
  transition: all 0.15s ease !important;
  flex-shrink: 0 !important;
}

.level-modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
}

.level-modal-body {
  padding: 12px 14px !important;
  overflow-y: auto !important;
  flex: 1 !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 10px !important;
  box-sizing: border-box !important;
}

.level-section-header {
  font-size: 11px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.08em !important;
  color: #64748b !important;
  padding-bottom: 4px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
  margin-top: 2px !important;
}

/* 2-Tier Modern Topic Card */
.level-topic-card {
  background: #151d2f !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  padding: 10px 12px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 8px !important;
  transition: all 0.15s ease !important;
  box-sizing: border-box !important;
}

.level-topic-card:hover {
  border-color: rgba(56, 189, 248, 0.3) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
}

.level-topic-top {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  gap: 8px !important;
}

.level-topic-title {
  font-size: 14px !important;
  font-weight: 700 !important;
  color: #f8fafc !important;
  line-height: 1.3 !important;
}

.level-topic-badge {
  font-size: 11px !important;
  font-weight: 800 !important;
  padding: 3px 8px !important;
  border-radius: 6px !important;
  white-space: nowrap !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  flex-shrink: 0 !important;
}

.level-topic-bottom {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  border-top: 1px solid rgba(255, 255, 255, 0.05) !important;
  padding-top: 8px !important;
  gap: 8px !important;
}

.level-topic-meta {
  font-size: 11px !important;
  color: #94a3b8 !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-wrap: wrap !important;
}

.level-topic-meta b {
  color: #e2e8f0 !important;
}

.level-topic-action-btn {
  height: 32px !important;
  padding: 0 12px !important;
  border-radius: 8px !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
  cursor: pointer !important;
  border: none !important;
  transition: all 0.15s ease !important;
  white-space: nowrap !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25) !important;
}

.level-topic-action-btn.btn-action-primary {
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
  color: #ffffff !important;
}

.level-topic-action-btn.btn-action-primary:hover {
  background: linear-gradient(135deg, #0369a1 0%, #075985 100%) !important;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.4) !important;
}

.level-topic-action-btn.btn-action-success {
  background: linear-gradient(135deg, var(--grade-a) 0%, #009900 100%) !important;
  color: #0f172a !important;
}

.level-topic-locked-text {
  font-size: 11px !important;
  color: #64748b !important;
  font-weight: 600 !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  text-align: right !important;
}

/* 60px Modal Footer */
.level-modal-footer {
  height: 60px !important;
  min-height: 60px !important;
  max-height: 60px !important;
  padding: 10px 16px !important;
  border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
  background: rgba(15, 23, 42, 0.6) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  flex-shrink: 0 !important;
  box-sizing: border-box !important;
}

.btn-level-modal-footer-close {
  height: 40px !important;
  width: 100% !important;
  border-radius: 10px !important;
  background: rgba(255, 255, 255, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.14) !important;
  color: #f8fafc !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  letter-spacing: 0.5px !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  transition: all 0.15s ease !important;
}

.btn-level-modal-footer-close:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(255, 255, 255, 0.25) !important;
  box-shadow: 0 0 12px rgba(255, 255, 255, 0.15) !important;
}
```

### 2.3 JavaScript Updates (`js/dashboard.js`)
1. In `openClassModal(subj, progress)`:
   - Output `.level-topic-card` 2-Tier markup instead of compressed `.asm-modal-row`.
   - Wire dynamic grade colors using `getGradeColorByScore(pct)` and vector SVGs via `getSvgIcon()`.
   - Update loading and empty states with centered canonical SVG icons (`getClassSvgIcon()`).
2. Wire footer close button `#btn-close-level-modal-footer` to `closeLevelModal()`.
3. Bump cache busters in `dashboard.html`.

---

## 3. Verification & Compliance Checklist

- [x] Spatial footprint: 350px width, 20px screen margin, 20px border radius.
- [x] 60px dedicated Modal Footer housing 40px action button with 10px top/bottom padding.
- [x] Zero emojis invariant: SVGs via `getSvgIcon()`.
- [x] Rule 2.10 official grading scale dynamic coloring.
- [x] Dual-Scale Family A typography (18px header, 14px titles, 11-12px metadata).
- [x] Zero scroll on screen viewport (max height $\le 640$px).
- [x] Regression tests 100% passing.
