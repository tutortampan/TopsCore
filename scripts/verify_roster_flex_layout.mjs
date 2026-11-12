/**
 * Verification Script — Phase 438: Student Roster Flex Primary Layout
 * Validates:
 * 1. Initial load: zero truncation on all 16 body rows
 * 2. Initial load: zero horizontal scroll (tableWidth <= containerWidth)
 * 3. After sort (click NAME): columns remain stable and no truncation
 * 4. Navigation away → back: columns stay correct (no re-shrink from autoFit)
 */

import { chromium } from '@playwright/test';

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✅ PASS: ${msg}`); passCount++; }
function fail(msg) { console.error(`  ❌ FAIL: ${msg}`); failCount++; }
function check(cond, msg) { cond ? pass(msg) : fail(msg); }

async function measureTable(page) {
  return page.evaluate(() => {
    const table = document.querySelector('.datagrid-table');
    if (!table) return { error: 'no table found' };

    const ths = Array.from(document.querySelectorAll('.datagrid-table thead tr:not(.datagrid-super-header-row) th'));
    const bodyRows = Array.from(document.querySelectorAll('.datagrid-table tbody tr'));
    const footerCells = Array.from(document.querySelectorAll('.datagrid-summary-row td'));

    let truncatedBodyCount = 0;
    const truncatedSamples = [];
    bodyRows.forEach((r, rIdx) => {
      Array.from(r.cells).forEach((td, cIdx) => {
        const inner = td.querySelector('.student-cell-view, div, span') || td;
        if (inner.scrollWidth > inner.clientWidth + 2) {
          truncatedBodyCount++;
          if (truncatedSamples.length < 3) {
            truncatedSamples.push({ row: rIdx, col: ths[cIdx]?.innerText.trim().replace(/\n.*/,''), text: inner.innerText.trim().substring(0,25) });
          }
        }
      });
    });

    let truncatedFooterCount = 0;
    footerCells.forEach((td, cIdx) => {
      if (td.scrollWidth > td.clientWidth + 2) {
        truncatedFooterCount++;
      }
    });

    const container = table.parentElement;
    const nameThIdx = ths.findIndex(t => t.dataset.key === 'sortName');
    const nameTh = ths[nameThIdx];

    return {
      tableWidth: table.offsetWidth,
      tableScrollWidth: table.scrollWidth,
      containerWidth: container ? container.clientWidth : 0,
      hasHScroll: table.scrollWidth > (container ? container.clientWidth : 0) + 2,
      truncatedBodyCount,
      truncatedSamples,
      truncatedFooterCount,
      nameColWidth: nameTh ? nameTh.offsetWidth : -1,
      rowCount: bodyRows.length,
    };
  });
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });

  await context.addInitScript(() => {
    const adminSession = JSON.stringify({
      admin_id: 'admin-master',
      username: 'admin',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    localStorage.setItem('topscore_admin_session', adminSession);
    sessionStorage.setItem('topscore_admin_session', adminSession);
    // Clear any saved col widths to simulate fresh-load
    localStorage.removeItem('topscore_col_widths_student_roster_grid');
  });

  const page = await context.newPage();

  // ── Test 1: Initial Load ──────────────────────────────────────────────────────
  console.log('\n📋 TEST 1: Initial Load (fresh, no saved widths)');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const t1 = await measureTable(page);
  if (t1.error) { fail('Table not found on initial load'); }
  else {
    check(t1.rowCount >= 1, `Student rows rendered (${t1.rowCount} rows)`);
    check(!t1.hasHScroll, `No horizontal scrollbar (table ${t1.tableWidth}px ≤ container ${t1.containerWidth}px)`);
    check(t1.truncatedBodyCount === 0, `Zero truncated body cells (found: ${t1.truncatedBodyCount}${t1.truncatedSamples.length ? ' → ' + JSON.stringify(t1.truncatedSamples) : ''})`);
    check(t1.truncatedFooterCount === 0, `Zero truncated footer cells (found: ${t1.truncatedFooterCount})`);
    check(t1.nameColWidth >= 200, `Name column width ≥ 200px (actual: ${t1.nameColWidth}px)`);
  }

  // ── Test 2: After Clicking NAME Header (sort) ─────────────────────────────────
  console.log('\n📋 TEST 2: After clicking NAME column header (sort ascending)');
  const nameTh = page.locator('.datagrid-table thead th[data-key="sortName"]');
  await nameTh.click();
  await page.waitForTimeout(400);

  const t2 = await measureTable(page);
  check(!t2.hasHScroll, `No horizontal scrollbar after sort (table ${t2.tableWidth}px ≤ container ${t2.containerWidth}px)`);
  check(t2.truncatedBodyCount === 0, `Zero truncated body cells after sort (found: ${t2.truncatedBodyCount}${t2.truncatedSamples.length ? ' → ' + JSON.stringify(t2.truncatedSamples) : ''})`);
  check(t2.truncatedFooterCount === 0, `Zero truncated footer cells after sort (found: ${t2.truncatedFooterCount})`);
  check(t2.nameColWidth >= 200, `Name column stable after sort (${t2.nameColWidth}px)`);

  // ── Test 3: Navigate Away → Back ─────────────────────────────────────────────
  console.log('\n📋 TEST 3: Navigate away (Dashboard) then back (Students)');
  await page.evaluate(() => {
    window.location.hash = '#dashboard';
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.location.hash = '#students';
    if (typeof window.loadSection === 'function') window.loadSection('students');
  });
  await page.waitForTimeout(2000);

  const t3 = await measureTable(page);
  if (t3.error || t3.rowCount < 1) {
    fail('Table not found after navigation back to students');
  } else {
    check(!t3.hasHScroll, `No horizontal scrollbar after re-navigation (table ${t3.tableWidth}px ≤ container ${t3.containerWidth}px)`);
    check(t3.truncatedBodyCount === 0, `Zero truncated body cells after re-navigation (found: ${t3.truncatedBodyCount}${t3.truncatedSamples.length ? ' → ' + JSON.stringify(t3.truncatedSamples) : ''})`);
    check(t3.truncatedFooterCount === 0, `Zero truncated footer cells after re-navigation (found: ${t3.truncatedFooterCount})`);
    check(t3.nameColWidth >= 200, `Name column NOT shrunken back after re-navigation (${t3.nameColWidth}px)`);
  }

  await browser.close();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Phase 438 Verification: ${passCount} PASS, ${failCount} FAIL`);
  console.log('='.repeat(60));
  if (failCount > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

