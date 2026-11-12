// TOPSCORE LMS — System-Wide Comprehensive Typography & Font Auditor (Deep Audit)
// Exhaustively extracts typography from all 7 CSS files and 8 live runtime views

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// ── COLOR UTILITIES & CONTRAST RATIO (WCAG 2.1) ──
function parseRgb(colorStr) {
  if (!colorStr) return null;
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1
    };
  }
  return null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1, rgb2) {
  if (!rgb1 || !rgb2) return null;
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── 1. STATIC CSS ANALYSIS ──
function analyzeCssFiles() {
  console.log('🔍 [1/3] Performing Deep Static CSS Typography Extraction...');
  const cssFiles = [
    'css/admin.css',
    'css/style.css',
    'css/dashboard.css',
    'css/test.css',
    'css/result.css',
    'css/auth.css',
    'css/components/avatars.css'
  ];

  const results = {
    tokens: {},
    fontFamiliesCount: {},
    fontSizesCount: {},
    fontWeightsCount: {},
    filesSummary: {}
  };

  for (const relPath of cssFiles) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, 'utf8');

    const fileReport = {
      sizeKb: (fs.statSync(fullPath).size / 1024).toFixed(1),
      tokensFound: 0,
      families: {},
      sizes: {},
      weights: {}
    };

    // Extract tokens
    const tokenRegex = /(--(?:font|fm-font|tr-font|tr-size)[a-zA-Z0-9-_]*)\s*:\s*([^;]+);/g;
    let tokenMatch;
    while ((tokenMatch = tokenRegex.exec(content)) !== null) {
      const [, tokenName, tokenVal] = tokenMatch;
      results.tokens[tokenName.trim()] = tokenVal.trim();
      fileReport.tokensFound++;
    }

    // Extract font-family
    const ffRegex = /font-family\s*:\s*([^;!]+)/g;
    let ffMatch;
    while ((ffMatch = ffRegex.exec(content)) !== null) {
      const val = ffMatch[1].trim();
      results.fontFamiliesCount[val] = (results.fontFamiliesCount[val] || 0) + 1;
      fileReport.families[val] = (fileReport.families[val] || 0) + 1;
    }

    // Extract font-size
    const fsRegex = /font-size\s*:\s*([^;!]+)/g;
    let fsMatch;
    while ((fsMatch = fsRegex.exec(content)) !== null) {
      const val = fsMatch[1].trim();
      results.fontSizesCount[val] = (results.fontSizesCount[val] || 0) + 1;
      fileReport.sizes[val] = (fileReport.sizes[val] || 0) + 1;
    }

    // Extract font-weight
    const fwRegex = /font-weight\s*:\s*([^;!]+)/g;
    let fwMatch;
    while ((fwMatch = fwRegex.exec(content)) !== null) {
      const val = fwMatch[1].trim();
      results.fontWeightsCount[val] = (results.fontWeightsCount[val] || 0) + 1;
      fileReport.weights[val] = (fileReport.weights[val] || 0) + 1;
    }

    results.filesSummary[relPath] = fileReport;
  }

  return results;
}

// ── 2. LIVE COMPUTED STYLE EXTRACTION (PLAYWRIGHT) ──
async function analyzeLivePages() {
  console.log('🌐 [2/3] Extracting Live Computed Typography across all 8 Views via Headless Browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  const mockStudentSession = {
    student_id: 'test-student-id-123',
    student_name: 'Alex Johnson',
    gender: 'male',
    education: 'University',
    institution_id: 'inst-1',
    institution_name: 'TOP English',
    program_id: 'prog-1',
    program_name: 'Evnikom',
    level_id: 'lvl-1',
    level_number: 1,
    batch_id: 'batch-1',
    batch_name: 'EV-07'
  };

  await context.addInitScript((mockStudent) => {
    // Student Session
    sessionStorage.setItem('topscore_session', JSON.stringify(mockStudent));
    localStorage.setItem('topscore_session', JSON.stringify(mockStudent));
    sessionStorage.setItem('topscore_test_id', 'mock-test-id');
    sessionStorage.setItem('topscore_attempt_id', 'mock-att-id');

    // Admin Session
    sessionStorage.setItem('topscore_admin_session', JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' }));
    localStorage.setItem('topscore_admin_session', JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' }));
    localStorage.setItem('topscore_global_edit_mode', 'false');
  }, mockStudentSession);

  const page = await context.newPage();

  const auditViews = [
    {
      name: 'Student Gate (index.html)',
      url: 'http://127.0.0.1:5500/index.html',
      setup: async () => {}
    },
    {
      name: 'Class Hub & Class Lobby (dashboard.html)',
      url: 'http://127.0.0.1:5500/dashboard.html',
      setup: async () => {
        // Hydrate mock elements if empty
        await page.evaluate(() => {
          const lobbyModal = document.getElementById('classes-selector-modal');
          if (lobbyModal) lobbyModal.classList.remove('hidden');
        });
      }
    },
    {
      name: 'Test Room (test.html)',
      url: 'http://127.0.0.1:5500/test.html',
      setup: async () => {
        // Hydrate question card and virtual keyboard
        await page.evaluate(() => {
          const main = document.getElementById('test-main');
          if (main) {
            main.innerHTML = `
              <div class="question-card" style="padding:1.5rem;">
                <div class="q-prompt" style="font-size:1.1rem; font-weight:700; margin-bottom:1rem;">Translate the following word:</div>
                <div class="q-stimulus" style="font-size:1.8rem; font-weight:800; font-family:var(--font-display); color:var(--clr-primary); margin-bottom:1.5rem;">Accomplish</div>
                <div class="q-options" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                  <button class="btn btn-option" style="padding:10px; font-size:14px; font-weight:600;">Menyelesaikan</button>
                  <button class="btn btn-option" style="padding:10px; font-size:14px; font-weight:600;">Meninggalkan</button>
                  <button class="btn btn-option" style="padding:10px; font-size:14px; font-weight:600;">Menerima</button>
                  <button class="btn btn-option" style="padding:10px; font-size:14px; font-weight:600;">Menolak</button>
                </div>
              </div>
            `;
          }
        });
      }
    },
    {
      name: 'Result Scoreboard (result.html)',
      url: 'http://127.0.0.1:5500/result.html',
      setup: async () => {
        // Reveal result content
        await page.evaluate(() => {
          const content = document.getElementById('result-content');
          const loading = document.getElementById('result-loading');
          if (content) content.classList.remove('hidden');
          if (loading) loading.style.display = 'none';

          const scoreVal = document.getElementById('result-percentage');
          if (scoreVal) scoreVal.innerHTML = '98%<sup>R</sup>';
          const gradeVal = document.getElementById('result-grade-val');
          if (gradeVal) gradeVal.textContent = 'A';
          const pred = document.getElementById('result-predicate-text');
          if (pred) pred.textContent = 'VERY GOOD';
        });
      }
    },
    {
      name: "Tutor's Room Dashboard (admin.html#dashboard)",
      url: 'http://127.0.0.1:5500/admin.html#dashboard',
      setup: async () => {}
    },
    {
      name: "Tutor's Room Student Roster (admin.html#students)",
      url: 'http://127.0.0.1:5500/admin.html#students',
      setup: async () => {
        const batchItem = await page.$('.sidebar-program-item, .batch-item');
        if (batchItem) {
          await batchItem.click().catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    },
    {
      name: "Tutor's Room Curriculum Hub (admin.html#curriculum)",
      url: 'http://127.0.0.1:5500/admin.html#curriculum',
      setup: async () => {}
    },
    {
      name: "Tutor's Room Class Hub (admin.html#classes-hub)",
      url: 'http://127.0.0.1:5500/admin.html#classes-hub',
      setup: async () => {}
    }
  ];

  const liveReport = [];

  for (const v of auditViews) {
    console.log(`  Evaluating: ${v.name}...`);
    try {
      await page.goto(v.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      await v.setup();
      await page.waitForTimeout(500);

      const samples = await page.evaluate(() => {
        function getBgColor(el) {
          let curr = el;
          while (curr && curr !== document.documentElement) {
            const bg = window.getComputedStyle(curr).backgroundColor;
            if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
              return bg;
            }
            curr = curr.parentElement;
          }
          return 'rgb(9, 13, 22)';
        }

        const candidateSelectors = [
          'h1', 'h2', 'h3', 'h4', 'h5',
          'p',
          'table th', 'table td',
          '.super-header', 'th.col-sortable',
          'button.btn-primary', 'button.btn-outline', 'button.btn-ghost', 'button.btn-option', 'button.btn-giveup',
          'input[type="text"]', 'select',
          '.badge', '.grade-circle', '.grade-badge', '.score-grade-val', '.grade-predicate-text',
          '.pill', '.card', '.glass-card',
          '#admin-topbar', '.topbar-title', '.dashboard-header-brand', '.test-main-title',
          '.table-wrap', 'sup', 'sub',
          '.metric-stacked-lbl', '.metric-stacked-val', '.timer-display', '.vk-key'
        ];

        const out = [];
        const seen = new Set();

        for (const sel of candidateSelectors) {
          const els = document.querySelectorAll(sel);
          for (let i = 0; i < Math.min(els.length, 3); i++) {
            const el = els[i];
            if (!el || el.offsetParent === null) continue;
            const cs = window.getComputedStyle(el);
            const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 45);
            if (!text) continue;

            const key = `${sel}|${cs.fontSize}|${cs.fontWeight}|${cs.color}|${cs.fontFamily.split(',')[0]}`;
            if (seen.has(key)) continue;
            seen.add(key);

            out.push({
              selector: sel,
              sampleText: text,
              fontFamily: cs.fontFamily,
              primaryFont: cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim(),
              fontSizePx: parseFloat(cs.fontSize),
              fontSizeRaw: cs.fontSize,
              fontWeight: cs.fontWeight,
              color: cs.color,
              bgColor: getBgColor(el),
              lineHeight: cs.lineHeight,
              letterSpacing: cs.letterSpacing
            });
          }
        }
        return out;
      });

      // Enhance with contrast
      const enhanced = samples.map(s => {
        const fgRgb = parseRgb(s.color);
        const bgRgb = parseRgb(s.bgColor);
        const hex = fgRgb ? rgbToHex(fgRgb.r, fgRgb.g, fgRgb.b) : s.color;
        const bgHex = bgRgb ? rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b) : s.bgColor;
        const contrast = fgRgb && bgRgb ? getContrastRatio(fgRgb, bgRgb) : null;
        let wcag = 'N/A';
        if (contrast !== null) {
          if (contrast >= 7.0) wcag = 'AAA (Optimal)';
          else if (contrast >= 4.5) wcag = 'AA (Pass)';
          else if (contrast >= 3.0) wcag = 'AA Large (Pass for >=18px)';
          else wcag = 'FAIL (Low Contrast)';
        }

        return {
          ...s,
          hex,
          bgHex,
          contrast: contrast ? contrast.toFixed(2) + ':1' : 'N/A',
          wcag
        };
      });

      liveReport.push({
        screen: v.name,
        samples: enhanced
      });
    } catch (err) {
      console.warn(`  Warning evaluating ${v.name}:`, err.message);
    }
  }

  await browser.close();
  return liveReport;
}

// ── 3. SYNTHESIZE & OUTPUT ──
async function main() {
  console.log('🏁 Starting Complete TopsCore Deep Typography Audit...\n');

  const staticAnalysis = analyzeCssFiles();
  const liveAnalysis = await analyzeLivePages();

  const finalOutput = {
    generatedAt: new Date().toISOString(),
    staticAnalysis,
    liveAnalysis
  };

  const outputPath = path.join(__dirname, 'audit_typography_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalOutput, null, 2), 'utf8');
  console.log(`\n✅ Raw deep audit results saved to: ${outputPath}`);

  let totalLiveElements = 0;
  for (const p of liveAnalysis) totalLiveElements += p.samples.length;

  console.log('\n===============================================================');
  console.log('              TOPCORE DEEP TYPOGRAPHY AUDIT SUMMARY           ');
  console.log('===============================================================');
  console.log(`Static CSS Tokens Found: ${Object.keys(staticAnalysis.tokens).length}`);
  console.log(`Static Distinct Font Families: ${Object.keys(staticAnalysis.fontFamiliesCount).length}`);
  console.log(`Static Distinct Font Sizes: ${Object.keys(staticAnalysis.fontSizesCount).length}`);
  console.log(`Static Distinct Font Weights: ${Object.keys(staticAnalysis.fontWeightsCount).length}`);
  console.log(`Live Views Audited: ${liveAnalysis.length}`);
  console.log(`Live Computed Style Elements Audited: ${totalLiveElements}`);
  console.log('===============================================================\n');
}

main().catch(err => {
  console.error('❌ Audit Failed:', err);
  process.exit(1);
});
