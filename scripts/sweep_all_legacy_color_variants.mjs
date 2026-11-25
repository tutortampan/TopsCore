// scripts/sweep_all_legacy_color_variants.mjs
// Master Universal Sweep for All Remaining Legacy Color Variants across TopsCore

import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Master Universal Legacy Color Sweep across TopsCore...\n');

let totalModifications = 0;
let filesModifiedCount = 0;

// Universal Mapping Table: Legacy Hex -> Canonical Token
const COLOR_MAPPINGS = [
  // ── 1. PURPLE LEGACY -> #a855f7 (Grade Star / Alumni / Gimmick) ──
  { hexes: ['#c084fc', '#C084FC', '#8b5cf6', '#8B5CF6', '#a78bfa', '#A78BFA'], token: 'var(--grade-star, #a855f7)', raw: '#a855f7' },

  // ── 2. GREEN LEGACY -> #00c000 (Grade A / Passed / Hadir) ──
  { hexes: ['#15803d', '#15803D', '#86efac', '#86EFAC', '#4ade80', '#4ADE80', '#22c55e', '#22C55E', '#16a34a', '#16A34A', '#10b981', '#10B981'], token: 'var(--grade-a, #00c000)', raw: '#00c000' },

  // ── 3. YELLOW LEGACY -> #ffff00 (Grade C / Remedial / Warning) ──
  { hexes: ['#eab308', '#EAB308', '#facc15', '#FACC15', '#f59e0b', '#F59E0B', '#fef08a', '#FEF08A', '#fef3c7', '#FEF3C7'], token: 'var(--grade-c, #ffff00)', raw: '#ffff00' },

  // ── 4. RED LEGACY -> #ff0000 (Grade E / Failed / Danger) ──
  { hexes: ['#ef4444', '#EF4444', '#dc2626', '#DC2626', '#f87171', '#F87171', '#b91c1c', '#B91C1C', '#fca5a5', '#FCA5A5', '#fecaca', '#FECACA'], token: 'var(--grade-e, #ff0000)', raw: '#ff0000' },

  // ── 5. ORANGE LEGACY -> #ff8c00 (Grade D / Sick / Pillar B / Less) ──
  { hexes: ['#ea580c', '#EA580C', '#c2410c', '#C2410C', '#fdba74', '#FDBA74', '#fb923c', '#FB923C', '#f97316', '#F97316'], token: 'var(--grade-d, #ff8c00)', raw: '#ff8c00' },

  // ── 6. BLUE / INDIGO / CYAN LEGACY -> #38bdf8 (Tactical Cyan / Single Accent) ──
  { hexes: ['#0284c7', '#0284C7', '#0369a1', '#0369A1', '#6366f1', '#6366F1', '#3b82f6', '#3B82F6', '#2563eb', '#2563EB', '#06b6d4', '#06B6D4', '#0ea5e9', '#0EA5E9', '#7dd3fc', '#7DD3FC', '#e0f2fe', '#E0F2FE', '#00e5ff', '#00E5FF'], token: 'var(--primary-tactical, #38bdf8)', raw: '#38bdf8' },

  // ── 7. PINK LEGACY -> #ff2d87 (Pillar A / Phrases / Milestone) ──
  { hexes: ['#f472b6', '#F472B6', '#ec4899', '#EC4899'], token: 'var(--quad-a, #ff2d87)', raw: '#ff2d87' }
];

// Files to process
const allFiles = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir)) {
    if (['node_modules', '.git', '.system_generated', 'dist'].includes(item)) continue;
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      if (item !== 'brain' && item !== 'scripts') walk(p);
    } else if (p.endsWith('.js') || p.endsWith('.css') || p.endsWith('.html')) {
      if (!p.endsWith('.min.js') && !p.endsWith('.min.css')) {
        allFiles.push(p);
      }
    }
  }
}

walk('css');
walk('js');
for (const f of fs.readdirSync('.')) {
  if ((f.endsWith('.html') || f.endsWith('.js')) && !fs.statSync(f).isDirectory()) {
    allFiles.push(f);
  }
}

// Special dictionary files where literal raw hexes are expected instead of CSS var(...)
const RAW_HEX_EXEMPT_FILES = ['js/grading.js'];

allFiles.forEach(file => {
  const isRawExempt = RAW_HEX_EXEMPT_FILES.some(ex => file.replace(/\\/g, '/').endsWith(ex));
  let content = fs.readFileSync(file, 'utf8');
  let fileMods = 0;

  COLOR_MAPPINGS.forEach(({ hexes, token, raw }) => {
    hexes.forEach(hex => {
      // Don't replace if it's already inside a var(...) fallback for that token!
      // Example: var(--grade-star, #c084fc) -> var(--grade-star, #a855f7)
      const replacement = isRawExempt ? raw : token;

      // Handle cases where hex is already inside var(--xxx, HEX)
      const varPattern = new RegExp(`var\\((--[a-z0-9-]+),\\s*${hex}\\)`, 'gi');
      content = content.replace(varPattern, (match, varName) => {
        fileMods++;
        return `var(${varName}, ${raw})`;
      });

      // Handle standalone occurrences of hex
      if (content.includes(hex)) {
        const parts = content.split(hex);
        const count = parts.length - 1;
        fileMods += count;
        content = parts.join(replacement);
      }
    });
  });

  if (fileMods > 0) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`  ✔ [${file}] applied ${fileMods} replacement(s).`);
    totalModifications += fileMods;
    filesModifiedCount++;
  }
});

// Post-sweep cleanup for any doubled var wrappers e.g. var(--grade-a, var(--grade-a, #00c000))
console.log('\n▶ Cleaning up nested var() wrappers...');
allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let cleaned = content;
  cleaned = cleaned.replace(/var\((--[a-z0-9-]+),\s*var\(\1,\s*(#[a-f0-9]{6})\)\)/gi, 'var($1, $2)');
  cleaned = cleaned.replace(/var\((--[a-z0-9-]+),\s*var\(--[a-z0-9-]+,\s*(#[a-f0-9]{6})\)\)/gi, 'var($1, $2)');
  if (cleaned !== content) {
    fs.writeFileSync(file, cleaned, 'utf8');
    console.log(`  ✔ [${file}] cleaned nested var() expressions.`);
  }
});

console.log(`\n🎉 MASTER SWEEP COMPLETED! Total replacements: ${totalModifications} across ${filesModifiedCount} files.`);
