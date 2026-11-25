// scripts/apply_css_single_accent_sweep.mjs
// Sweep remaining client CSS files to adopt the Single Product Accent SSOT (#38bdf8) with dark text

import fs from 'fs';
import path from 'path';

console.log('🚀 Sweeping client CSS files for Single Product Accent (#38bdf8)...\n');

let totalModifications = 0;

function updateFile(filePath, replacements) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ File not found: ${filePath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let fileMods = 0;

  for (const { target, replacement } of replacements) {
    if (typeof target === 'string') {
      if (content.includes(target)) {
        const count = content.split(target).length - 1;
        content = content.replaceAll(target, replacement);
        fileMods += count;
      }
    } else if (target instanceof RegExp) {
      const matches = content.match(target);
      if (matches) {
        fileMods += matches.length;
        content = content.replace(target, replacement);
      }
    }
  }

  if (fileMods > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`  ✔ [${filePath}] applied ${fileMods} replacement(s).`);
    totalModifications += fileMods;
  } else {
    console.log(`  - [${filePath}] no matching targets found.`);
  }
}

// ── 1. css/auth.css ──
console.log('▶ Step 1: Updating css/auth.css...');
updateFile('css/auth.css', [
  {
    target: `background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #fff;`,
    replacement: `background: var(--primary-tactical, #38bdf8);
      color: #090d16;`
  }
]);

// ── 2. css/result.css ──
console.log('\n▶ Step 2: Updating css/result.css...');
updateFile('css/result.css', [
  {
    target: `.ans-section-btn.active {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      border-color: #38bdf8;
      color: #ffffff;
      box-shadow: 0 2px 10px rgba(2, 132, 199, 0.4);
    }`,
    replacement: `.ans-section-btn.active {
      background: var(--primary-tactical, #38bdf8);
      border-color: #38bdf8;
      color: #090d16;
      font-weight: 800;
      box-shadow: 0 2px 10px rgba(56, 189, 248, 0.4);
    }`
  },
  {
    target: `background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%) !important;
      color: #ffffff !important;`,
    replacement: `background: var(--primary-tactical, #38bdf8) !important;
      color: #090d16 !important;`
  }
]);

// ── 3. css/test.css ──
console.log('\n▶ Step 3: Updating css/test.css...');
updateFile('css/test.css', [
  {
    target: `.vk-key.vk-shift.active {
      background: #0284c7 !important;
      border-color: #38bdf8 !important;
      color: #ffffff !important;
    }`,
    replacement: `.vk-key.vk-shift.active {
      background: var(--primary-tactical, #38bdf8) !important;
      border-color: #38bdf8 !important;
      color: #090d16 !important;
    }`
  },
  {
    target: `background: linear-gradient(135deg, #0284c7, #0369a1) !important;
      border: 1px solid #38bdf8 !important;
      color: #ffffff !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      box-shadow: 0 2px 0 #0369a1 !important;`,
    replacement: `background: var(--primary-tactical, #38bdf8) !important;
      border: 1px solid #38bdf8 !important;
      color: #090d16 !important;
      font-size: 16px !important;
      font-weight: 800 !important;
      box-shadow: 0 2px 0 rgba(56, 189, 248, 0.5) !important;`
  },
  {
    target: `.vk-key.vk-enter:active {
      transform: none !important;
      background: #0284c7 !important;
    }`,
    replacement: `.vk-key.vk-enter:active {
      transform: none !important;
      background: var(--primary-tactical, #38bdf8) !important;
      filter: brightness(0.9) !important;
    }`
  },
  {
    target: `background: linear-gradient(135deg, #0284c7, #0369a1) !important;
  border: 1px solid #38bdf8 !important;
  color: #ffffff !important;
  font-family: var(--fm-font-display, 'Inter', sans-serif) !important;
  font-size: 12px !important;
  font-weight: 800 !important;`,
    replacement: `background: var(--primary-tactical, #38bdf8) !important;
  border: 1px solid #38bdf8 !important;
  color: #090d16 !important;
  font-family: var(--fm-font-display, 'Inter', sans-serif) !important;
  font-size: 12px !important;
  font-weight: 800 !important;`
  },
  {
    target: `background: linear-gradient(135deg, #0284c7, #0369a1) !important;
  border: 1px solid #38bdf8 !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35) !important;`,
    replacement: `background: var(--primary-tactical, #38bdf8) !important;
  border: 1px solid #38bdf8 !important;
  color: #090d16 !important;
  box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35) !important;`
  }
]);

// ── 4. css/dashboard.css ──
console.log('\n▶ Step 4: Updating css/dashboard.css...');
updateFile('css/dashboard.css', [
  {
    target: `body.dashboard-page .next-test-go-btn.is-start,
body.dashboard-page .next-test-go-btn.is-start-green,
body.dashboard-page .next-asm-go-btn.is-start,
body.dashboard-page .next-asm-go-btn.is-start-green {
  background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%) !important;
  border: 1.5px solid #38bdf8 !important;
  box-shadow: 189, 248, 0.45) !important;
  color: #ffffff !important;
}`,
    replacement: `body.dashboard-page .next-test-go-btn.is-start,
body.dashboard-page .next-test-go-btn.is-start-green,
body.dashboard-page .next-asm-go-btn.is-start,
body.dashboard-page .next-asm-go-btn.is-start-green {
  background: var(--primary-tactical, #38bdf8) !important;
  border: 1.5px solid #38bdf8 !important;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.45) !important;
  color: #090d16 !important;
  font-weight: 800 !important;
}`
  },
  {
    target: `body.dashboard-page .btn-submit-code {
  width: 90px !important;
  height: 38px !important;
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%) !important;
  border: none !important;
  border-radius: 8px !important;
  color: #ffffff !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
}`,
    replacement: `body.dashboard-page .btn-submit-code {
  width: 90px !important;
  height: 38px !important;
  background: var(--primary-tactical, #38bdf8) !important;
  border: none !important;
  border-radius: 8px !important;
  color: #090d16 !important;
  font-size: 12px !important;
  font-weight: 800 !important;
  text-transform: uppercase !important;
  cursor: pointer !important;
  flex-shrink: 0 !important;
}`
  },
  {
    target: `  border-radius: 8px !important;
  background: #0284c7 !important;
  border: 1px solid #38bdf8 !important;
  color: #ffffff !important;`,
    replacement: `  border-radius: 8px !important;
  background: var(--primary-tactical, #38bdf8) !important;
  border: 1px solid #38bdf8 !important;
  color: #090d16 !important;
  font-weight: 800 !important;`
  },
  {
    target: `.classes-selector-modal-footer .classes-selector-btn-confirm:hover {
  background: #0369a1 !important;`,
    replacement: `.classes-selector-modal-footer .classes-selector-btn-confirm:hover {
  background: var(--primary-tactical, #38bdf8) !important;`
  },
  {
    target: `  border-radius: 10px !important;
  background: linear-gradient(135deg, #0284c7, #0369a1) !important;
  border: 1px solid #38bdf8 !important;
  color: #ffffff !important;`,
    replacement: `  border-radius: 10px !important;
  background: var(--primary-tactical, #38bdf8) !important;
  border: 1px solid #38bdf8 !important;
  color: #090d16 !important;
  font-weight: 800 !important;`
  },
  {
    target: `.component-selector-modal-footer .component-selector-btn-confirm:hover {
  background: linear-gradient(135deg, #0369a1, #0284c7) !important;`,
    replacement: `.component-selector-modal-footer .component-selector-btn-confirm:hover {
  background: var(--primary-tactical, #38bdf8) !important;`
  }
]);

// ── 5. css/tutor.css ──
console.log('\n▶ Step 5: Updating css/tutor.css...');
updateFile('css/tutor.css', [
  {
    target: `border-color: #0284c7 !important;
  background: #0284c7 !important;`,
    replacement: `border-color: var(--primary-tactical, #38bdf8) !important;
  background: var(--primary-tactical, #38bdf8) !important;
  color: #090d16 !important;`
  },
  {
    target: `border-bottom: 3px solid #0284c7 !important;`,
    replacement: `border-bottom: 3px solid var(--primary-tactical, #38bdf8) !important;`
  },
  {
    target: `background: #0284c7 !important;
  border-color: #0284c7 !important;`,
    replacement: `background: var(--primary-tactical, #38bdf8) !important;
  border-color: var(--primary-tactical, #38bdf8) !important;
  color: #090d16 !important;`
  }
]);

console.log(`\n🎉 Client CSS Single Accent Sweep complete! Total replacements: ${totalModifications}`);
