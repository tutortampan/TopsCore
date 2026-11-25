// scripts/apply_single_accent_standardization.mjs
// Single Product Accent SSOT Standardization (#38bdf8 / Tactical Cyan)

import fs from 'fs';
import path from 'path';

console.log('🚀 Initiating Single Product Accent SSOT Consolidation (#38bdf8)...\n');

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

// ── 1. css/style.css: Root tokens and Button styles ──
console.log('▶ Step 1: Standardizing css/style.css...');
updateFile('css/style.css', [
  {
    target: `  /* Accent gradient */
  --clr-accent-1: #6366f1;
  /* indigo */
  --clr-accent-2: #8b5cf6;
  /* violet */
  --clr-accent-3: #06b6d4;
  /* cyan */
  --clr-primary: #6366f1;
  /* alias for accent-1 — used by pill filters, progress bars, admin highlights */
  --grad-primary: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);
  --grad-glow: radial-gradient(ellipse at top, rgba(99, 102, 241, 0.25) 0%, transparent 70%);`,
    replacement: `  /* Accent gradient & Single Product Accent SSOT (#38bdf8 / Tactical Cyan) */
  --primary-tactical: #38bdf8;
  --primary-tactical-rgb: 56, 189, 248;
  --clr-primary: var(--primary-tactical);
  --clr-accent-1: var(--primary-tactical);
  --clr-accent-2: #8b5cf6;
  --clr-accent-3: var(--primary-tactical);
  --clr-info: var(--primary-tactical);
  --grad-primary: linear-gradient(135deg, #38bdf8 0%, rgba(56, 189, 248, 0.85) 100%);
  --grad-glow: radial-gradient(ellipse at top, rgba(56, 189, 248, 0.25) 0%, transparent 70%);`
  },
  {
    target: `  --rainbow-step-6: var(--clr-accent-1);
  --rainbow-step-6-rgb: 99, 102, 241;`,
    replacement: `  --rainbow-step-6: #4f46e5;
  --rainbow-step-6-rgb: 79, 70, 229;`
  },
  {
    target: `/* Primary button (Tactical Blue / Cyan) */
.btn-primary,
.btn-tactical {
  background: var(--grad-primary);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.35);
}`,
    replacement: `/* Primary button (Tactical Cyan: Single Accent SSOT #38bdf8) */
.btn-primary,
.btn-tactical {
  background: var(--primary-tactical) !important;
  color: #090d16 !important;
  font-weight: 700 !important;
  border: 1px solid var(--primary-tactical) !important;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.35) !important;
}`
  },
  {
    target: `.btn-primary:hover:not([disabled]):not(:disabled),
.btn-tactical:hover:not([disabled]):not(:disabled) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
}`,
    replacement: `.btn-primary:hover:not([disabled]):not(:disabled),
.btn-tactical:hover:not([disabled]):not(:disabled) {
  filter: brightness(0.92) !important;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.5) !important;
}`
  }
]);

// ── 2. js/grading.js: btnPrimary and single accent ──
console.log('\n▶ Step 2: Updating js/grading.js...');
updateFile('js/grading.js', [
  {
    target: `  // 4. Action Buttons (Primary CTA & Permanent Danger)
  btnPrimary: '#0284c7', // Primary Action CTA (Save, Proceed, Submit)`,
    replacement: `  // 4. Action Buttons (Primary CTA & Permanent Danger) - Single Accent SSOT (#38bdf8)
  btnPrimary: '#38bdf8', // Primary Action CTA (Save, Proceed, Submit)
  btnPrimaryText: '#090d16', // High-contrast dark text on #38bdf8 (WCAG AAA 9.8:1)`
  }
]);

// ── 3. js/admin/desk.js: Settings desk ──
console.log('\n▶ Step 3: Updating js/admin/desk.js...');
updateFile('js/admin/desk.js', [
  {
    target: `${"${renderColorItem('btnPrimary', 'Primary Action (CTA Button)', 'Tactical Blue', 'Modal Save Buttons · Proceed CTAs · Create Class &amp; Submit Exam', colorSettings.btnPrimary || '#0284c7')}"}`,
    replacement: `${"${renderColorItem('btnPrimary', 'Primary Action (CTA Button)', 'Tactical Cyan', 'Modal Save Buttons · Proceed CTAs · Create Class &amp; Submit Exam', colorSettings.btnPrimary || '#38bdf8')}"}`
  },
  {
    target: `background:#0284c7;border:1px solid #38bdf8;color:#ffffff;`,
    replacement: `background:#38bdf8;border:1px solid #38bdf8;color:#090d16;`
  },
  {
    target: `var(--clr-primary, #6366f1)`,
    replacement: `var(--primary-tactical, #38bdf8)`
  }
]);

// ── 4. js/admin/admin-deck.js: Buttons ──
console.log('\n▶ Step 4: Updating js/admin/admin-deck.js...');
updateFile('js/admin/admin-deck.js', [
  {
    target: `background:#0284c7;border:1px solid #38bdf8;color:#ffffff;`,
    replacement: `background:#38bdf8;border:1px solid #38bdf8;color:#090d16;`
  }
]);

// ── 5. js/admin/app.js: Navigation and modal action buttons ──
console.log('\n▶ Step 5: Updating js/admin/app.js...');
updateFile('js/admin/app.js', [
  {
    target: `background: #0284c7 !important; border: 1px solid #38bdf8 !important; color: #ffffff !important; box-shadow: 0 0 10px rgba(56,189,248,0.45) !important;`,
    replacement: `background: #38bdf8 !important; border: 1px solid #38bdf8 !important; color: #090d16 !important; box-shadow: 0 0 10px rgba(56,189,248,0.45) !important;`
  },
  {
    target: `{ border: '#38bdf8', bg: '#0284c7', text: '#ffffff', glow: 'rgba(56,189,248,0.45)' }`,
    replacement: `{ border: '#38bdf8', bg: '#38bdf8', text: '#090d16', glow: 'rgba(56,189,248,0.45)' }`
  },
  {
    target: `background: #0284c7; border: 1px solid #38bdf8; color: #ffffff;`,
    replacement: `background: #38bdf8; border: 1px solid #38bdf8; color: #090d16;`
  },
  {
    target: `gap: 8px !important; border-radius: 6px !important; background: #0284c7 !important;
                    border: 1px solid #38bdf8 !important; color: #ffffff !important;`,
    replacement: `gap: 8px !important; border-radius: 6px !important; background: #38bdf8 !important;
                    border: 1px solid #38bdf8 !important; color: #090d16 !important;`
  }
]);

// ── 6. js/admin/student-management.js: Dossier and batch transfer buttons ──
console.log('\n▶ Step 6: Updating js/admin/student-management.js...');
updateFile('js/admin/student-management.js', [
  {
    target: `background:#0284c7;border:1px solid #38bdf8;color:#ffffff;`,
    replacement: `background:#38bdf8;border:1px solid #38bdf8;color:#090d16;`
  },
  {
    target: `color:#0284c7;background:rgba(2,132,199,0.08);padding:4px 10px;border-radius:4px;border:1px solid rgba(2,132,199,0.2);`,
    replacement: `color:#38bdf8;background:rgba(56,189,248,0.08);padding:4px 10px;border-radius:4px;border:1px solid rgba(56,189,248,0.25);`
  },
  {
    target: `<strong style="color:#0284c7; font-family:monospace;">`,
    replacement: `<strong style="color:#38bdf8; font-family:monospace;">`
  },
  {
    target: `border: 1px solid #0284c7; color: #0284c7;`,
    replacement: `border: 1px solid #38bdf8; color: #38bdf8;`
  },
  {
    target: `background: linear-gradient(135deg, #0284c7, #0369a1); border: 1px solid #38bdf8; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-size: 14px; padding: 8px 18px; border-radius: 6px; cursor: pointer; color: #ffffff;`,
    replacement: `background: #38bdf8; border: 1px solid #38bdf8; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-size: 14px; padding: 8px 18px; border-radius: 6px; cursor: pointer; color: #090d16;`
  }
]);

// ── 7. js/admin/vocab-vault.js ──
console.log('\n▶ Step 7: Updating js/admin/vocab-vault.js...');
updateFile('js/admin/vocab-vault.js', [
  {
    target: `background:#0284c7;border:1px solid #38bdf8;color:#ffffff;`,
    replacement: `background:#38bdf8;border:1px solid #38bdf8;color:#090d16;`
  }
]);

// ── 8. js/admin/tests-access.js ──
console.log('\n▶ Step 8: Updating js/admin/tests-access.js...');
updateFile('js/admin/tests-access.js', [
  {
    target: `border:1px solid \${isExcused ? '#0284c7' : 'rgba(255,255,255,0.15)'}; background:\${isExcused ? '#0284c7' : 'transparent'}; color:\${isExcused ? '#ffffff' : '#94a3b8'};`,
    replacement: `border:1px solid \${isExcused ? '#38bdf8' : 'rgba(255,255,255,0.15)'}; background:\${isExcused ? '#38bdf8' : 'transparent'}; color:\${isExcused ? '#090d16' : '#94a3b8'};`
  },
  {
    target: `const colorMap = { PRESENT: 'var(--grade-a, #00c000)', EXCUSED: '#0284c7', SICK: '#ea580c', ABSENT: 'var(--grade-e, #ff0000)' };`,
    replacement: `const colorMap = { PRESENT: 'var(--grade-a, #00c000)', EXCUSED: 'var(--primary-tactical, #38bdf8)', SICK: '#ea580c', ABSENT: 'var(--grade-e, #ff0000)' };`
  }
]);

// ── 9. js/admin/tests-management.js ──
console.log('\n▶ Step 9: Updating js/admin/tests-management.js...');
updateFile('js/admin/tests-management.js', [
  {
    target: `.tac-drawer-action-btn:hover {
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: #ffffff;
        border-color: #38bdf8;
        box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
        transform: translateY(-1px);
      }`,
    replacement: `.tac-drawer-action-btn:hover {
        background: #38bdf8;
        color: #090d16;
        border-color: #38bdf8;
        box-shadow: 0 4px 14px rgba(56, 189, 248, 0.35);
        transform: translateY(-1px);
      }`
  },
  {
    target: `.tac-drawer-filter-btn.active {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
        font-weight: 700;
      }`,
    replacement: `.tac-drawer-filter-btn.active {
        background: #38bdf8;
        border-color: #38bdf8;
        color: #090d16;
        font-weight: 700;
      }`
  }
]);

// ── 10. js/admin/exam-rules.js ──
console.log('\n▶ Step 10: Updating js/admin/exam-rules.js...');
updateFile('js/admin/exam-rules.js', [
  {
    target: `background:#0284c7; border:1px solid #38bdf8; color:#fff;`,
    replacement: `background:#38bdf8; border:1px solid #38bdf8; color:#090d16;`
  }
]);

// ── 11. js/admin/modules.js ──
console.log('\n▶ Step 11: Updating js/admin/modules.js...');
updateFile('js/admin/modules.js', [
  {
    target: `this.style.background='#0284c7'; this.style.borderColor='#0284c7'; this.style.color='#ffffff'; this.style.boxShadow='0 0 10px rgba(56, 189, 248, 0.45)';`,
    replacement: `this.style.background='#38bdf8'; this.style.borderColor='#38bdf8'; this.style.color='#090d16'; this.style.boxShadow='0 0 10px rgba(56, 189, 248, 0.45)';`
  }
]);

// ── 12. js/admin/system-architecture.js & system-glossary.js ──
console.log('\n▶ Step 12: Updating system architecture and glossary...');
updateFile('js/admin/system-architecture.js', [
  {
    target: `{ key: 'themeBg', label: 'Theme Banner Accent', token: '--theme-hex', hex: '#0284c7' }`,
    replacement: `{ key: 'themeBg', label: 'Theme Banner Accent', token: '--theme-hex', hex: '#38bdf8' }`
  },
  {
    target: `(tokens.themeBg || '#0284c7')`,
    replacement: `(tokens.themeBg || '#38bdf8')`
  }
]);

updateFile('js/admin/system-glossary.js', [
  {
    target: `\${isAct ? 'background:#0284c7; border-color:#38bdf8; color:#fff;' : 'border-color:#334155; color:#94a3b8;'}`,
    replacement: `\${isAct ? 'background:#38bdf8; border-color:#38bdf8; color:#090d16;' : 'border-color:#334155; color:#94a3b8;'}`
  },
  {
    target: `background:\${_isDirty ? '#0284c7' : '#1e293b'}; border:1px solid \${_isDirty ? '#38bdf8' : '#334155'}; color:#fff;`,
    replacement: `background:\${_isDirty ? '#38bdf8' : '#1e293b'}; border:1px solid \${_isDirty ? '#38bdf8' : '#334155'}; color:\${_isDirty ? '#090d16' : '#94a3b8'};`
  }
]);

// ── 13. js/dashboard.js ──
console.log('\n▶ Step 13: Updating js/dashboard.js...');
updateFile('js/dashboard.js', [
  {
    target: `confirmButtonColor: '#6366f1'`,
    replacement: `confirmButtonColor: '#38bdf8'`
  },
  {
    target: `const retakeBtnBg = isRemedialAction ? 'var(--grade-c)' : '#0284c7';
            const retakeBtnBorder = isRemedialAction ? 'var(--grade-c)' : '#0284c7';
            const retakeTextColor = isRemedialAction ? '#0F172A' : '#ffffff';`,
    replacement: `const retakeBtnBg = isRemedialAction ? 'var(--grade-c)' : 'var(--primary-tactical, #38bdf8)';
            const retakeBtnBorder = isRemedialAction ? 'var(--grade-c)' : 'var(--primary-tactical, #38bdf8)';
            const retakeTextColor = isRemedialAction ? '#0F172A' : '#090d16';`
  }
]);

// ── 14. js/test.js ──
console.log('\n▶ Step 14: Updating js/test.js...');
updateFile('js/test.js', [
  {
    target: `style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#fff;font-weight:700;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;"`,
    replacement: `style="background:#38bdf8;color:#090d16;font-weight:700;padding:10px 24px;border:none;border-radius:8px;cursor:pointer;"`
  },
  {
    target: `<span style="font-size:12px;background:#0284c7;color:#ffffff;padding:2px 6px;border-radius:4px;font-weight:700;">ACTIVE</span>`,
    replacement: `<span style="font-size:12px;background:#38bdf8;color:#090d16;padding:2px 6px;border-radius:4px;font-weight:800;">ACTIVE</span>`
  },
  {
    target: `wordCounter.innerHTML = \`<span style="color:\${isDone ? 'var(--clr-success)' : '#0284c7'}; font-weight:800;">\${words}</span> / \${targetPhraseWords} words\`;`,
    replacement: `wordCounter.innerHTML = \`<span style="color:\${isDone ? 'var(--clr-success)' : 'var(--primary-tactical, #38bdf8)'}; font-weight:800;">\${words}</span> / \${targetPhraseWords} words\`;`
  },
  {
    target: `border:1px solid #38bdf8; background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color:#fff;`,
    replacement: `border:1px solid #38bdf8; background:#38bdf8; color:#090d16;`
  }
]);

// ── 15. css/admin.css: Update fallbacks and references ──
console.log('\n▶ Step 15: Updating css/admin.css...');
updateFile('css/admin.css', [
  {
    target: `var(--fm-accent-tactical, #6366f1)`,
    replacement: `var(--fm-accent-tactical, #38bdf8)`
  },
  {
    target: `var(--clr-primary, #6366f1)`,
    replacement: `var(--primary-tactical, #38bdf8)`
  },
  {
    target: `.btn-primary:hover {
  background: #7dd3fc;
  border-color: #7dd3fc;
}`,
    replacement: `.btn-primary:hover {
  background: var(--fm-accent-tactical, #38bdf8);
  filter: brightness(0.92);
  border-color: var(--fm-accent-tactical, #38bdf8);
}`
  }
]);

console.log(`\n🎉 Single Accent SSOT Consolidation finished! Total replacements applied: ${totalModifications}`);
