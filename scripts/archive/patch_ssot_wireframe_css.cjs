/**
 * Fix & Upgrade: css/admin.css
 * 1. Remove stray } at line 849
 * 2. Remove dangling block at lines 7149-7153
 * 3. Align btn-wireframe-close & box-wireframe-locked to Grade E (SSOT)
 * 4. Align card-add-time-menu to Grade C (SSOT)
 * 5. Add width: 100% to btn-wireframe-edit-time
 * 6. Sleek modern redesign: thinner borders, reduced glow, compact heights
 */

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../css/admin.css');
let css = fs.readFileSync(FILE, 'utf8');

// ─────────────────────────────────────────────────────────────────
// TASK 1a: Remove stray closing brace at line 849 (after .table-wrap td block ends at line 848)
// The rule block already closes at line 848, line 849 is an orphan }
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /font-variant-numeric: tabular-nums !important;\n\}\n\}\n\n\/\* Secondary \/ muted helper text/,
  'font-variant-numeric: tabular-nums !important;\n}\n\n/* Secondary / muted helper text'
);

// ─────────────────────────────────────────────────────────────────
// TASK 1b: Remove dangling block after .btn-wireframe-live-view:hover closing brace
// Lines 7149-7153: orphaned properties without selector
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.btn-wireframe-live-view:hover \{\n  background: #1e3a8a !important;\n  border-color: #38bdf8 !important;\n  box-shadow: 0 6px 22px rgba\(56, 189, 248, 0\.5\) !important;\n  transform: translateY\(-1px\);\n\}\n  background: #1e3a8a !important;\n  border-color: #38bdf8 !important;\n  box-shadow: 0 6px 22px rgba\(56, 189, 248, 0\.5\) !important;\n  transform: translateY\(-1px\);\n\}/,
  `.btn-wireframe-live-view:hover {
  background: #1e3a8a !important;
  border-color: #38bdf8 !important;
  box-shadow: 0 6px 22px rgba(56, 189, 248, 0.5) !important;
  transform: translateY(-1px);
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 2 + 3a: Sleek Modern .btn-wireframe-close (Grade E SSOT, hairline 1px)
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.btn-wireframe-close \{[\s\S]+?\.btn-wireframe-close:hover \{[\s\S]+?\}/,
  `.btn-wireframe-close {
  background: rgba(var(--grade-e-rgb, 255, 0, 0), 0.05) !important;
  border: 1px solid rgba(var(--grade-e-rgb, 255, 0, 0), 0.5) !important;
  color: #fca5a5 !important;
  font-weight: 700 !important;
  font-size: 0.74rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  flex: 1 !important;
  height: 100% !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
.btn-wireframe-close:hover {
  background: rgba(var(--grade-e-rgb, 255, 0, 0), 0.12) !important;
  border-color: var(--grade-e, #ff0000) !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(var(--grade-e-rgb, 255, 0, 0), 0.25) !important;
  transform: translateY(-1px);
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 2 + 3b: .box-wireframe-locked → Grade E SSOT
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.box-wireframe-locked \{[\s\S]+?\}/,
  `.box-wireframe-locked {
  background: rgba(var(--grade-e-rgb, 255, 0, 0), 0.05) !important;
  border: 1px solid rgba(var(--grade-e-rgb, 255, 0, 0), 0.3) !important;
  color: #fca5a5 !important;
  font-weight: 700 !important;
  font-size: 0.75rem !important;
  letter-spacing: 0.03em !important;
  width: 100% !important;
  height: 34px !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 6px !important;
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 2 + 3c: .card-add-time-menu → Grade C SSOT (#ffff00)
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.card-add-time-menu,\n#live-modal-add-time-menu \{[\s\S]+?\}/,
  `.card-add-time-menu,
#live-modal-add-time-menu {
  background: #0f172a !important;
  border: 2px solid var(--grade-c, #ffff00) !important;
  border-radius: 10px !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.92), 0 0 18px rgba(var(--grade-c-rgb, 255, 255, 0), 0.2) !important;
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 3d: .btn-wireframe-edit-time — add width:100%, ensure Grade C
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.btn-wireframe-edit-time \{[\s\S]+?\.btn-wireframe-edit-time:hover \{[\s\S]+?\}/,
  `.btn-wireframe-edit-time {
  background: rgba(var(--grade-c-rgb, 255, 255, 0), 0.05) !important;
  border: 1px solid rgba(var(--grade-c-rgb, 255, 255, 0), 0.5) !important;
  color: #fef08a !important;
  font-weight: 700 !important;
  font-size: 0.74rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  flex: 1 !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
.btn-wireframe-edit-time:hover {
  background: rgba(var(--grade-c-rgb, 255, 255, 0), 0.12) !important;
  border-color: var(--grade-c, #ffff00) !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(var(--grade-c-rgb, 255, 255, 0), 0.25) !important;
  transform: translateY(-1px);
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 3e: .btn-wireframe-remidi — hairline 1px, Grade C SSOT
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.btn-wireframe-remidi \{\n([\s\S]+?)\.btn-wireframe-remidi:hover \{[\s\S]+?\}\n\.btn-wireframe-remidi\.btn-dimmed \{[\s\S]+?\}/,
  `.btn-wireframe-remidi {
  background: rgba(var(--grade-c-rgb, 255, 255, 0), 0.05) !important;
  border: 1px solid rgba(var(--grade-c-rgb, 255, 255, 0), 0.5) !important;
  color: #fef08a !important;
  font-weight: 700 !important;
  font-size: 0.80rem !important;
  letter-spacing: 0.03em !important;
  flex: 1 !important;
  height: 100% !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
.btn-wireframe-remidi:hover {
  background: rgba(var(--grade-c-rgb, 255, 255, 0), 0.12) !important;
  border-color: var(--grade-c, #ffff00) !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(var(--grade-c-rgb, 255, 255, 0), 0.25) !important;
  transform: translateY(-1px);
}
.btn-wireframe-remidi.btn-dimmed {
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px dashed rgba(255, 255, 255, 0.15) !important;
  color: #64748b !important;
  box-shadow: none !important;
  cursor: not-allowed !important;
  opacity: 0.6 !important;
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 3f: .btn-wireframe-late — hairline 1px, Grade A SSOT
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.btn-wireframe-late \{[\s\S]+?\.btn-wireframe-late:hover \{[\s\S]+?\}/,
  `.btn-wireframe-late {
  background: rgba(var(--grade-a-rgb, 0, 192, 0), 0.05) !important;
  border: 1px solid rgba(var(--grade-a-rgb, 0, 192, 0), 0.5) !important;
  color: #86efac !important;
  font-weight: 700 !important;
  font-size: 0.74rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.03em !important;
  flex: 1 !important;
  height: 100% !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
.btn-wireframe-late:hover {
  background: rgba(var(--grade-a-rgb, 0, 192, 0), 0.12) !important;
  border-color: var(--grade-a, #00c000) !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(var(--grade-a-rgb, 0, 192, 0), 0.25) !important;
  transform: translateY(-1px);
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 3g: .btn-wireframe-normal — hairline 1px, Grade A SSOT
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\.btn-wireframe-normal \{[\s\S]+?\.btn-wireframe-normal:hover \{[\s\S]+?\}/,
  `.btn-wireframe-normal {
  background: rgba(var(--grade-a-rgb, 0, 192, 0), 0.05) !important;
  border: 1px solid rgba(var(--grade-a-rgb, 0, 192, 0), 0.5) !important;
  color: #86efac !important;
  font-weight: 700 !important;
  font-size: 0.80rem !important;
  letter-spacing: 0.03em !important;
  flex: 1 !important;
  height: 100% !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  box-shadow: none !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
.btn-wireframe-normal:hover {
  background: rgba(var(--grade-a-rgb, 0, 192, 0), 0.12) !important;
  border-color: var(--grade-a, #00c000) !important;
  color: #ffffff !important;
  box-shadow: 0 0 10px rgba(var(--grade-a-rgb, 0, 192, 0), 0.25) !important;
  transform: translateY(-1px);
}`
);

// ─────────────────────────────────────────────────────────────────
// TASK 3h: .btn-wireframe-live-view — Sleek tactile dark slate hero btn
// ─────────────────────────────────────────────────────────────────
css = css.replace(
  /\/\* Semantics: Deep Navy \/ Royal Blue = Live View in Row 2 \*\/\n\.btn-wireframe-live-view \{[\s\S]+?\.btn-wireframe-live-view:hover \{[\s\S]+?\}/,
  `/* Semantics: Tactical Dark Slate = Live Monitor Hero Button */
.btn-wireframe-live-view {
  background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important;
  border: 1px solid rgba(56, 189, 248, 0.4) !important;
  color: #f8fafc !important;
  font-weight: 700 !important;
  font-size: 0.82rem !important;
  letter-spacing: 0.03em !important;
  width: 100% !important;
  height: 36px !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.07) !important;
  cursor: pointer !important;
  transition: all 0.15s ease !important;
}
.btn-wireframe-live-view:hover {
  background: linear-gradient(180deg, #263348 0%, #1e293b 100%) !important;
  border-color: #38bdf8 !important;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.25), 0 1px 3px rgba(0, 0, 0, 0.4) !important;
  transform: translateY(-1px);
}`
);

// Write the patched file
fs.writeFileSync(FILE, css, 'utf8');
console.log('css/admin.css patched successfully.');
console.log('File size:', fs.statSync(FILE).size, 'bytes');
