/**
 * Patch js/admin/tests-access.js:
 * Task 4: Replace hardcoded colors with SSOT tokens in template strings
 */

const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '../js/admin/tests-access.js');
let js = fs.readFileSync(FILE, 'utf8');

// ─── 4a: Modal header btn #btn-live-modal-add-time — #ffe600 → SSOT CSS vars ───
// Replace the solid yellow background button with a sleek Grade C outline
js = js.replace(
  `style="padding:5px 12px; font-size:0.8rem; font-weight:900; background:#ffe600 !important; border:1px solid #d4c000 !important; color:#0f172a !important; border-radius:6px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 10px rgba(255,230,0,0.35); cursor:pointer;"`,
  `style="padding:5px 12px; font-size:0.78rem; font-weight:700; background:rgba(var(--grade-c-rgb, 255,255,0), 0.07); border:1px solid rgba(var(--grade-c-rgb, 255,255,0), 0.5); color:var(--grade-c, #ffff00); border-radius:6px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; letter-spacing:0.03em;"`
);

// ─── 4b: Modal time popover border/background (inline style on div) ─────────────
// inline style on div#live-modal-add-time-menu
js = js.replace(
  `style="position:absolute; right:0; top:calc(100% + 6px); background:#0f172a; border:2px solid #ffe600; border-radius:10px; box-shadow:0 16px 36px rgba(0,0,0,0.92), 0 0 18px rgba(255,230,0,0.28); z-index:99999; width:220px; padding:8px; display:none; flex-direction:column; gap:6px;"`,
  `style="position:absolute; right:0; top:calc(100% + 6px); background:#0f172a; border:2px solid var(--grade-c, #ffff00); border-radius:10px; box-shadow:0 16px 36px rgba(0,0,0,0.92), 0 0 14px rgba(var(--grade-c-rgb, 255,255,0), 0.18); z-index:99999; width:220px; padding:8px; display:none; flex-direction:column; gap:6px;"`
);

// ─── 4c: Modal header banner div background #ffe600 & color #ffe600 ──────────────
js = js.replace(
  `style="background:#ffe600; color:#0f172a; font-weight:900; font-size:0.72rem; padding:5px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">\n                   <span>⏱️ ADJUST SESSION TIME</span>\n                   <span style="font-size:0.65rem; background:#0f172a; color:#ffe600; padding:1px 5px; border-radius:3px;">LIVE</span>`,
  `style="background:rgba(var(--grade-c-rgb, 255,255,0), 0.12); border:1px solid rgba(var(--grade-c-rgb, 255,255,0), 0.4); color:var(--grade-c, #ffff00); font-weight:800; font-size:0.70rem; padding:5px 8px; border-radius:5px; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; justify-content:space-between;">\n                   <span>⏱️ ADJUST SESSION TIME</span>\n                   <span style="font-size:0.63rem; background:rgba(var(--grade-c-rgb,255,255,0),0.15); color:var(--grade-c, #ffff00); padding:1px 5px; border-radius:3px;">LIVE</span>`
);

// ─── 4d: Modal add-time preset buttons green: rgba(16,185,129,...) → Grade A ────
js = js.replaceAll(
  `style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#34d399; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;"`,
  `style="background:rgba(var(--grade-a-rgb, 0,192,0), 0.08); border:1px solid rgba(var(--grade-a-rgb, 0,192,0), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;"`
);

// ─── 4e: Modal reduce-time preset buttons red: rgba(239,68,68,...) → Grade E ────
js = js.replaceAll(
  `style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;"`,
  `style="background:rgba(var(--grade-e-rgb, 255,0,0), 0.08); border:1px solid rgba(var(--grade-e-rgb, 255,0,0), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;"`
);

// ─── 4f: Modal custom btn #btn-add-time-custom ───────────────────────────────────
js = js.replace(
  `style="width:100%; text-align:center; background:rgba(255,230,0,0.1); border:1px dashed #ffe600; color:#ffe600; padding:6px 8px; border-radius:6px; font-size:0.74rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px;"`,
  `style="width:100%; text-align:center; background:rgba(var(--grade-c-rgb, 255,255,0), 0.07); border:1px dashed rgba(var(--grade-c-rgb, 255,255,0), 0.5); color:var(--grade-c, #ffff00); padding:6px 8px; border-radius:6px; font-size:0.73rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px;"`
);

// ─── 4g: Card popover TIME button (line 1007) — add width:100%, SSOT inline fallback ──
js = js.replace(
  '<button type="button" class="btn btn-wireframe-edit-time btn-card-add-time" data-theme="${code}" title="Edit Exam Time (+ / -)">',
  '<button type="button" class="btn btn-wireframe-edit-time btn-card-add-time" data-theme="${code}" style="width:100%;" title="Edit Exam Time (+ / -)">'
);

// ─── 4h: Card popover menu border #ffe600 → SSOT ─────────────────────────────────
js = js.replace(
  `style="display:none; position:absolute; left:50%; transform:translateX(-50%); bottom:calc(100% + 8px); background:#0f172a; border:2px solid #ffe600; border-radius:10px; box-shadow:0 16px 36px rgba(0,0,0,0.92), 0 0 18px rgba(255,230,0,0.28); z-index:99999; width:220px; padding:8px; flex-direction:column; gap:6px;"`,
  `style="display:none; position:absolute; left:50%; transform:translateX(-50%); bottom:calc(100% + 8px); background:#0f172a; border:2px solid var(--grade-c, #ffff00); border-radius:10px; box-shadow:0 16px 36px rgba(0,0,0,0.92), 0 0 14px rgba(var(--grade-c-rgb, 255,255,0), 0.18); z-index:99999; width:220px; padding:8px; flex-direction:column; gap:6px;"`
);

// ─── 4i: Card popover menu header banner bg:#ffe600 → SSOT ───────────────────────
js = js.replace(
  `<div style="background:#ffe600; color:#0f172a; font-weight:900; font-size:0.72rem; padding:5px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">`,
  `<div style="background:rgba(var(--grade-c-rgb, 255,255,0), 0.12); border:1px solid rgba(var(--grade-c-rgb, 255,255,0), 0.4); color:var(--grade-c, #ffff00); font-weight:800; font-size:0.70rem; padding:5px 8px; border-radius:5px; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; justify-content:space-between;">`
);

// ─── 4j: Card popover inner LIVE tag color:#ffe600 → SSOT ────────────────────────
js = js.replace(
  `<span style="font-size:0.65rem; background:#0f172a; color:#ffe600; padding:1px 5px; border-radius:3px;">SESSION</span>`,
  `<span style="font-size:0.63rem; background:rgba(var(--grade-c-rgb,255,255,0),0.12); color:var(--grade-c, #ffff00); padding:1px 5px; border-radius:3px;">SESSION</span>`
);

// ─── 4k: Card popover add-time options (card version): rgba(16,185,129) → Grade A ─
js = js.replaceAll(
  `style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#34d399; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer;"`,
  `style="background:rgba(var(--grade-a-rgb, 0,192,0), 0.08); border:1px solid rgba(var(--grade-a-rgb, 0,192,0), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer;"`
);

// ─── 4l: Card popover reduce-time options (card version): rgba(239,68,68) → Grade E ─
js = js.replaceAll(
  `style="background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); color:#f87171; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer;"`,
  `style="background:rgba(var(--grade-e-rgb, 255,0,0), 0.08); border:1px solid rgba(var(--grade-e-rgb, 255,0,0), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size:0.73rem; font-weight:700; cursor:pointer;"`
);

// ─── 4m: Card custom time btn border:#ffe600 → SSOT ─────────────────────────────
js = js.replace(
  `style="width:100%; text-align:center; background:rgba(255,230,0,0.1); border:1px dashed #ffe600; color:#ffe600; padding:6px 8px; border-radius:6px; font-size:0.74rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px;"`,
  `style="width:100%; text-align:center; background:rgba(var(--grade-c-rgb, 255,255,0), 0.07); border:1px dashed rgba(var(--grade-c-rgb, 255,255,0), 0.5); color:var(--grade-c, #ffff00); padding:6px 8px; border-radius:6px; font-size:0.73rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px;"`
);

// ─── 4n: Student btn-add-time inline yellow ───────────────────────────────────────
js = js.replace(
  `style="background:rgba(255,230,0,0.15); border:1px solid #ffe600; color:#ffe600; font-weight:800; font-size:0.75rem; padding:5px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; cursor:pointer;"`,
  `style="background:rgba(var(--grade-c-rgb, 255,255,0), 0.07); border:1px solid rgba(var(--grade-c-rgb, 255,255,0), 0.5); color:var(--grade-c, #ffff00); font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; cursor:pointer;"`
);

// ─── 4o: Student quick-box add-time button solid yellow → Grade C outline ────────
js = js.replace(
  `btnAddTime.style.cssText = 'background:#ffe600; border:1px solid #d4c000; color:#0f172a; font-weight:900; font-size:0.78rem; padding:6px 12px; border-radius:6px; cursor:pointer; box-shadow:0 2px 8px rgba(255,230,0,0.3);';`,
  `btnAddTime.style.cssText = 'background:rgba(var(--grade-c-rgb, 255,255,0), 0.07); border:1px solid rgba(var(--grade-c-rgb, 255,255,0), 0.5); color:var(--grade-c, #ffff00); font-weight:700; font-size:0.78rem; padding:6px 12px; border-radius:6px; cursor:pointer; letter-spacing:0.02em;';`
);

fs.writeFileSync(FILE, js, 'utf8');
console.log('js/admin/tests-access.js patched successfully.');
console.log('File size:', fs.statSync(FILE).size, 'bytes');
