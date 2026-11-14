// scripts/build_admin_css.mjs
// TopsCore — Master Admin CSS Sync Engine
// Automatically consolidates modular files from css/admin/ into css/admin.css

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const ADMIN_CSS_DIR = path.join(ROOT_DIR, 'css', 'admin');
const TARGET_CSS_PATH = path.join(ROOT_DIR, 'css', 'admin.css');
const TARGET_MIN_CSS_PATH = path.join(ROOT_DIR, 'css', 'admin.min.css');

export function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

// Ordered list of modular stylesheets to preserve CSS cascade and specificity
const MODULE_FILES = [
  'admin-layout.css',
  'admin-tables.css',
  'admin-views.css',
  'admin-modals.css',
  'admin-editmode.css'
];

export function buildCoreCssMin() {
  const coreFiles = ['style.css', 'dashboard.css', 'result.css', 'test.css', 'auth.css'];
  for (const file of coreFiles) {
    const srcPath = path.join(ROOT_DIR, 'css', file);
    const minPath = path.join(ROOT_DIR, 'css', file.replace('.css', '.min.css'));
    if (fs.existsSync(srcPath)) {
      const raw = fs.readFileSync(srcPath, 'utf8');
      const min = minifyCss(raw);
      fs.writeFileSync(minPath, min, 'utf8');
      console.log(`[build:css] Minified css/${file} -> css/${file.replace('.css', '.min.css')} (${(raw.length / 1024).toFixed(1)} KB -> ${(min.length / 1024).toFixed(1)} KB, -${((1 - min.length / raw.length) * 100).toFixed(1)}%)`);
    }
  }
}

export function buildAdminCss() {
  buildCoreCssMin();
  const parts = [];
  
  parts.push(`/* ============================================================
   TopsCore — ADMIN CONSOLE MASTER STYLESHEET
   Football Manager-Inspired Matte Management Workstation
   Auto-synchronized from modular source files in css/admin/:
   - admin-layout.css   (Workstation shell, 100vh lock, sidebar, topbar, sub-panel, banner)
   - admin-tables.css   (Data tables, DataGrid, attendance matrix, spreadsheet, sticky headers)
   - admin-views.css    (Curriculum tree, classes hub, test sessions, live monitor, vocab vault)
   - admin-modals.css   (Modals, drawers, student dossiers, wizards, bulk edit, purge modal)
   - admin-editmode.css (Master Edit Mode, safety HUD, inline Excel-style inputs)
   ============================================================ */\n`);

  for (const file of MODULE_FILES) {
    const filePath = path.join(ADMIN_CSS_DIR, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required modular CSS file missing: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    parts.push(`/* --- [MODULE: ${file}] --- */\n` + content.trim());
  }

  const combined = parts.join('\n\n') + '\n';
  
  // Fast cache guard: avoid rewriting disk if content is identical
  if (fs.existsSync(TARGET_CSS_PATH) && fs.existsSync(TARGET_MIN_CSS_PATH)) {
    const existing = fs.readFileSync(TARGET_CSS_PATH, 'utf8');
    if (existing === combined) {
      console.log(`[build:css] Up-to-date (${combined.length} bytes, 0ms cache hit).`);
      return combined;
    }
  }

  fs.writeFileSync(TARGET_CSS_PATH, combined, 'utf8');
  const minified = minifyCss(combined);
  fs.writeFileSync(TARGET_MIN_CSS_PATH, minified, 'utf8');
  console.log(`[build:css] Consolidated css/admin.css (${combined.length} bytes) and css/admin.min.css (${minified.length} bytes, -${((1 - minified.length/combined.length)*100).toFixed(1)}%).`);
  return combined;
}

// Auto-run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAdminCss();
}
