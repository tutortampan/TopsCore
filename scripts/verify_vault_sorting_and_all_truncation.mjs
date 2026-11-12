import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_global_edit_mode', 'false');
  });

  const page = await context.newPage();

  console.log('--- 1. Testing Vocabulary Words Tab ---');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  await page.waitForSelector('#vault-tbody tr', { timeout: 15000 });
  await page.waitForTimeout(500);

  // 1a. Verify default sort is LEX-CD ascending
  const firstLexCode = await page.evaluate(() => {
    const el = document.querySelector('#vault-tbody tr:first-child .col-vault-lexicon-code span');
    return el ? el.textContent.trim() : null;
  });
  console.log('Default First LEX-CD:', firstLexCode);
  if (!firstLexCode) throw new Error('First LEX-CD not found');

  // Check sort indicator on LEX-CD
  const indText = await page.evaluate(() => {
    const ind = document.getElementById('sort-ind-lex_code');
    return ind ? ind.textContent.trim() : null;
  });
  console.log('LEX-CD sort indicator:', indText);
  if (indText !== '▲') throw new Error(`Expected '▲' for asc sort on LEX-CD, got '${indText}'`);

  // 1b. Click LEX-CD to sort descending
  console.log('Clicking LEX-CD header to sort DESC...');
  await page.click('th[data-sort="lex_code"]');
  await page.waitForTimeout(300);

  const descLexCode = await page.evaluate(() => {
    const el = document.querySelector('#vault-tbody tr:first-child .col-vault-lexicon-code span');
    return el ? el.textContent.trim() : null;
  });
  const descIndText = await page.evaluate(() => {
    return document.getElementById('sort-ind-lex_code')?.textContent.trim();
  });
  console.log('DESC First LEX-CD:', descLexCode, 'Indicator:', descIndText);
  if (descIndText !== '▼') throw new Error(`Expected '▼' after toggle, got '${descIndText}'`);

  // Click again to return to ASC
  await page.click('th[data-sort="lex_code"]');
  await page.waitForTimeout(300);

  // 1c. Test search filtering by Lex Code coordinate e.g. "3D1"
  console.log('Testing search with "3D1"...');
  await page.fill('#vault-search', '3D1');
  await page.waitForTimeout(300);

  const searchResultsCount = await page.evaluate(() => {
    const rows = document.querySelectorAll('#vault-tbody tr');
    let matching = 0;
    rows.forEach(r => {
      const text = r.textContent;
      if (text.includes('3D1')) matching++;
    });
    return { totalRows: rows.length, matching };
  });
  console.log('Search "3D1" results:', searchResultsCount);
  if (searchResultsCount.totalRows === 0 || searchResultsCount.matching === 0) {
    throw new Error('Search by LEX-CD 3D1 failed to find items');
  }

  // Clear search
  await page.fill('#vault-search', '');
  await page.waitForTimeout(300);

  // 1d. Pure Blue Spectrum validation on words tab
  const invalidTypeColors = await page.evaluate(() => {
    const invalid = [];
    const typeCells = document.querySelectorAll('#vault-tbody tr td:nth-child(4) span');
    const allowed = ['rgb(96, 165, 250)', 'rgb(129, 140, 248)', 'rgb(56, 189, 248)', 'rgb(147, 197, 253)', 'rgb(165, 180, 252)'];
    typeCells.forEach(c => {
      const color = window.getComputedStyle(c).color;
      // If red or yellow or orange or green
      if (color.includes('255, 0, 0') || color.includes('255, 140, 0') || color.includes('0, 192, 0')) {
        invalid.push({ text: c.textContent.trim(), color });
      }
    });
    return invalid;
  });
  console.log('Invalid non-blue colors found on Words tab:', invalidTypeColors.length);
  if (invalidTypeColors.length > 0) {
    throw new Error(`Found non-blue type colors on Words tab: ${JSON.stringify(invalidTypeColors.slice(0, 3))}`);
  }

  // Capture screenshot of Words tab
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_vault_words_sorted.png') });
  console.log('Captured verify_vault_words_sorted.png');

  console.log('--- 2. Testing Phrases & Idioms Tab ---');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=phrases', { waitUntil: 'networkidle' });
  await page.waitForSelector('#vault-tbody tr', { timeout: 15000 });
  await page.waitForTimeout(500);

  // Verify Proverb and Idiom colors are in blue spectrum (NO RED #FF0000)
  const phrasesColorCheck = await page.evaluate(() => {
    const rows = document.querySelectorAll('#vault-tbody tr');
    const checked = [];
    rows.forEach(r => {
      const typeSpan = r.querySelector('td:nth-child(4) span');
      if (typeSpan) {
        const text = typeSpan.textContent.trim();
        const color = window.getComputedStyle(typeSpan).color;
        checked.push({ type: text, color });
      }
    });
    const redProverbs = checked.filter(c => c.type.toLowerCase() === 'proverb' && (c.color.includes('255, 0, 0') || c.color === 'rgb(255, 0, 0)'));
    const orangeIdioms = checked.filter(c => c.type.toLowerCase() === 'idiom' && c.color.includes('255, 140, 0'));
    return { total: checked.length, redProverbs: redProverbs.length, orangeIdioms: orangeIdioms.length };
  });
  console.log('Phrases color check:', phrasesColorCheck);
  if (phrasesColorCheck.redProverbs > 0) throw new Error('Proverbs still use RED color!');
  if (phrasesColorCheck.orangeIdioms > 0) throw new Error('Idioms still use ORANGE color!');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_vault_phrases_blue_spectrum.png') });
  console.log('Captured verify_vault_phrases_blue_spectrum.png');

  console.log('--- 3. Testing Test Blueprint Tab (Colgroup & Truncation) ---');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=blueprint', { waitUntil: 'networkidle' });
  await page.waitForSelector('#bp-matrix-tbody tr', { timeout: 15000 });
  await page.waitForTimeout(500);

  const blueprintAudit = await page.evaluate(() => {
    const table = document.getElementById('blueprint-matrix-table');
    const colgroup = table?.querySelector('colgroup');
    const topicTh = table?.querySelector('thead th.col-bp-sep:nth-child(4)');
    const topicThWidth = topicTh ? topicTh.getBoundingClientRect().width : 0;

    // Check cells in topic name column
    const rows = document.querySelectorAll('#bp-matrix-tbody tr:not([data-theme-header])');
    let truncatedCount = 0;
    let minWidth = 9999;
    let maxWidth = 0;
    let sampleRow = null;

    rows.forEach(r => {
      const topicTd = r.querySelector('td:nth-child(4)');
      if (topicTd) {
        const span = topicTd.querySelector('span') || topicTd;
        const cw = span.clientWidth;
        const sw = span.scrollWidth;
        if (cw < minWidth) minWidth = cw;
        if (cw > maxWidth) maxWidth = cw;
        if (sw > cw + 1) { // 1px rounding tolerance
          truncatedCount++;
        }
        if (!sampleRow) {
          sampleRow = { cw, sw, text: span.textContent.trim() };
        }
      }
    });

    // Check Exam Status colors
    const examSpans = document.querySelectorAll('#bp-matrix-tbody tr td:nth-child(13) span');
    let purpleExamReady = 0;
    let greenExamReady = 0;
    examSpans.forEach(s => {
      if (s.textContent.includes('Ready')) {
        const col = window.getComputedStyle(s).color;
        if (col.includes('192, 132, 252')) purpleExamReady++;
        if (col.includes('74, 222, 128')) greenExamReady++;
      }
    });

    return {
      hasColgroup: !!colgroup,
      topicThWidth,
      minWidth,
      maxWidth,
      truncatedCount,
      sampleRow,
      purpleExamReady,
      greenExamReady
    };
  });
  console.log('Test Blueprint Audit:', blueprintAudit);
  if (!blueprintAudit.hasColgroup) throw new Error('Missing colgroup on Test Blueprint!');
  if (blueprintAudit.topicThWidth < 200) throw new Error(`Topic Name column is too narrow: ${blueprintAudit.topicThWidth}px`);
  if (blueprintAudit.purpleExamReady > 0) throw new Error('Exam Status still has purple ready badges!');
  if (blueprintAudit.greenExamReady === 0) throw new Error('Exam Status green ready badges not found!');
  if (blueprintAudit.truncatedCount > 0) throw new Error(`Test Blueprint still has ${blueprintAudit.truncatedCount} truncated topic cells!`);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_vault_blueprint_no_truncation.png') });
  console.log('Captured verify_vault_blueprint_no_truncation.png');

  console.log('--- 4. Testing Theme Manager Tab (Colgroup & Clipping) ---');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForSelector('#theme-manager-tbody tr', { timeout: 15000 });
  await page.waitForTimeout(500);

  const themeManagerAudit = await page.evaluate(() => {
    const table = document.getElementById('theme-manager-flat-table');
    const colgroup = table?.querySelector('colgroup');
    const topicTh = table?.querySelector('thead tr:nth-child(2) th:nth-child(5)');
    const topicThWidth = topicTh ? topicTh.getBoundingClientRect().width : 0;

    // Check cells in topic name column
    const rows = document.querySelectorAll('#theme-manager-tbody tr');
    let truncatedCount = 0;
    let minWidth = 9999;
    let maxWidth = 0;
    let sampleRow = null;

    rows.forEach(r => {
      const topicTd = r.querySelector('td:nth-child(5)');
      if (topicTd) {
        const span = topicTd.querySelector('span') || topicTd;
        const cw = span.clientWidth;
        const sw = span.scrollWidth;
        if (cw < minWidth) minWidth = cw;
        if (cw > maxWidth) maxWidth = cw;
        if (sw > cw + 1) {
          truncatedCount++;
        }
        if (!sampleRow) {
          sampleRow = { cw, sw, text: span.textContent.trim() };
        }
      }
    });

    // Check zero dimming colors
    const zeroSpans = document.querySelectorAll('#theme-manager-tbody tr td span');
    let dimmedZero = 0;
    let brightZero = 0;
    zeroSpans.forEach(s => {
      if (s.textContent.trim() === '0') {
        const col = window.getComputedStyle(s).color;
        if (col.includes('51, 65, 85')) dimmedZero++;
        else brightZero++;
      }
    });

    return {
      hasColgroup: !!colgroup,
      topicThWidth,
      minWidth,
      maxWidth,
      truncatedCount,
      sampleRow,
      dimmedZero,
      brightZero
    };
  });
  console.log('Theme Manager Audit:', themeManagerAudit);
  if (!themeManagerAudit.hasColgroup) throw new Error('Missing colgroup on Theme Manager!');
  if (themeManagerAudit.topicThWidth < 220) throw new Error(`Theme Manager Topic column is too narrow: ${themeManagerAudit.topicThWidth}px`);
  if (themeManagerAudit.truncatedCount > 0) throw new Error(`Theme Manager has ${themeManagerAudit.truncatedCount} truncated topics!`);
  if (themeManagerAudit.dimmedZero === 0) throw new Error('Zero-Dimming not active in Theme Manager!');

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'verify_vault_theme_manager_perfect.png') });
  console.log('Captured verify_vault_theme_manager_perfect.png');

  await browser.close();
  console.log('\n======================================');
  console.log('🎉 ALL TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================');
}

run().catch(err => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
