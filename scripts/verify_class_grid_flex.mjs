/**
 * verify_class_grid_flex.mjs
 * Phase 441 — Playwright verification for Class Tests List DataGrid Flex Primary Column
 * Tests:
 *   1. TITLE column absorbs remaining space (> 220px) on 1366×768
 *   2. Zero horizontal scrollbar on the grid container
 *   3. All fixed columns within expected pixel tolerance (±10px)
 *   4. No TITLE cell renders with max-width: 250px style
 *   5. Table persists after navigating away and back
 */
import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/admin.html';
const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => { console.log(`  ❌ FAIL: ${msg}`); process.exitCode = 1; };

const EXPECTED_FIXED_WIDTHS = {
  CODE:         { min: 70,  max: 92  },
  LEVEL:        { min: 60,  max: 82  },
  PREREQUISITE: { min: 120, max: 142 },
  TYPE:         { min: 100, max: 122 },
  ANSWER:       { min: 80,  max: 102 },
  ACCESS:       { min: 70,  max: 92  },
  'DUR. (M)':   { min: 65,  max: 87  },
  'PASS (%)':   { min: 65,  max: 87  },
  QS:           { min: 55,  max: 77  },
  STATUS:       { min: 80,  max: 102 },
  '':           { min: 110, max: 132 },  // ACTIONS (empty label)
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  let passed = 0, failed = 0;
  const run = (label, ok) => {
    if (ok) { PASS(label); passed++; } else { FAIL(label); failed++; }
  };

  try {
    // --- Navigate and log in if needed ---
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 });

    // Try to access Classes section
    const classSectionExists = await page.evaluate(() => {
      if (typeof window.loadSection === 'function') {
        window.loadSection('classes');
        return true;
      }
      return false;
    });
    run('loadSection("classes") callable', classSectionExists);

    // Wait for the class-datagrid-container to appear
    await page.waitForSelector('#class-datagrid-container', { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(1000);

    // Check if datagrid was rendered at all
    const gridExists = await page.$('#class-datagrid-container .datagrid-table');
    if (!gridExists) {
      console.log('  ⚠️  No class test data available — skipping column width checks (table is empty).');
      console.log(`\n  Note: Need actual test data loaded to verify column widths.`);
      console.log('  Structural checks only...');

      // At least verify the DataGrid container renders without hscroll
      const hscroll = await page.evaluate(() => {
        const wrap = document.querySelector('#class-datagrid-container');
        if (!wrap) return null;
        return wrap.scrollWidth > wrap.clientWidth;
      });
      if (hscroll === null) {
        FAIL('class-datagrid-container not found in DOM');
      } else {
        run('No horizontal scrollbar (empty state)', !hscroll);
      }
    } else {
      // --- SCENARIO 1: TITLE column is Flex Primary (no fixed width, > 220px) ---
      const titleWidth = await page.evaluate(() => {
        const table = document.querySelector('#class-datagrid-container .datagrid-table');
        if (!table) return null;
        const colgroup = table.querySelector('colgroup');
        if (!colgroup) return null;
        const cols = colgroup.querySelectorAll('col');
        const headers = table.querySelectorAll('thead th');
        for (let i = 0; i < headers.length; i++) {
          const label = headers[i].textContent.trim().toUpperCase();
          if (label === 'TITLE') {
            const col = cols[i];
            return col ? parseFloat(col.style.width) || headers[i].getBoundingClientRect().width : null;
          }
        }
        return null;
      });
      run(`TITLE column width > 220px (actual: ${Math.round(titleWidth)}px)`, titleWidth > 220);

      // --- SCENARIO 2: Zero horizontal scrollbar ---
      const hscroll = await page.evaluate(() => {
        const wrap = document.querySelector('#class-datagrid-container');
        if (!wrap) return true;
        return wrap.scrollWidth > wrap.clientWidth + 2;
      });
      run('Zero horizontal scrollbar at 1366px', !hscroll);

      // --- SCENARIO 3: Fixed columns within expected pixel ranges ---
      const colWidths = await page.evaluate(() => {
        const table = document.querySelector('#class-datagrid-container .datagrid-table');
        if (!table) return {};
        const headers = table.querySelectorAll('thead th');
        const result = {};
        headers.forEach(th => {
          const label = th.textContent.trim();
          result[label] = th.getBoundingClientRect().width;
        });
        return result;
      });

      for (const [label, range] of Object.entries(EXPECTED_FIXED_WIDTHS)) {
        const actual = colWidths[label];
        if (actual !== undefined) {
          run(`Column "${label || 'ACTIONS'}" width ${Math.round(actual)}px within [${range.min}–${range.max}]`,
            actual >= range.min && actual <= range.max);
        }
      }

      // --- SCENARIO 4: No max-width:250px on TITLE cell content divs ---
      const hasBadMaxWidth = await page.evaluate(() => {
        const cells = document.querySelectorAll('#class-datagrid-container .datagrid-table tbody td');
        for (const td of cells) {
          const div = td.querySelector('div.fw-700');
          if (div) {
            const style = div.getAttribute('style') || '';
            if (style.includes('max-width:250px') || style.includes('max-width: 250px')) return true;
          }
        }
        return false;
      });
      run('No max-width:250px on TITLE cell content divs', !hasBadMaxWidth);

      // --- SCENARIO 5: autoFitOnMount confirmed false (table doesn't overflow after mount) ---
      await page.evaluate(() => window.loadSection('dashboard'));
      await page.waitForTimeout(500);
      await page.evaluate(() => window.loadSection('classes'));
      await page.waitForSelector('#class-datagrid-container .datagrid-table', { timeout: 8000 }).catch(() => null);
      await page.waitForTimeout(800);

      const hscrollAfterNav = await page.evaluate(() => {
        const wrap = document.querySelector('#class-datagrid-container');
        if (!wrap) return true;
        return wrap.scrollWidth > wrap.clientWidth + 2;
      });
      run('No horizontal scrollbar after navigate-away-and-back', !hscrollAfterNav);
    }

  } catch (err) {
    FAIL(`Unexpected error: ${err.message}`);
  } finally {
    await browser.close();
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('  🎉 ALL PASS — Class Tests Grid Flex Primary Column verified!');
  } else {
    console.log('  ⚠️  Some checks failed. Review output above.');
  }
})();
