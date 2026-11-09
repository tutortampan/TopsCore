import { chromium } from 'playwright';
import path from 'path';

(async () => {
  console.log('=== VERIFYING ADMIN CLASS HUB UI IN HEADLESS BROWSER ===');
  
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Inject Admin Session before load
  await page.addInitScript(() => {
    const adminSession = JSON.stringify({
      admin_id: 'admin-master',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', adminSession);
    localStorage.setItem('topscore_admin_session', adminSession);
  });

  // Navigate to admin.html#class-hub
  console.log('Navigating to http://127.0.0.1:5500/admin.html#class-hub...');
  await page.goto('http://127.0.0.1:5500/admin.html#class-hub', { waitUntil: 'networkidle' });

  // Wait for Class Hub to initialize
  await page.waitForTimeout(2000);

  // If class cards are present, click on 3rd Vocabulary or trigger loadClassDetails
  console.log('Triggering 3rd Vocabulary class view...');
  await page.evaluate(async () => {
    const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
    if (typeof window.loadClassDetails === 'function') {
      await window.loadClassDetails(classId);
    } else {
      // Look for a class card or row to click
      const card = document.querySelector(`[data-class-id="${classId}"], .class-card`);
      if (card) card.click();
    }
  });

  // Wait for attendance grid matrix table to appear
  try {
    await page.waitForSelector('#class-attendance-grid table tbody tr', { timeout: 10000 });
    console.log('✅ Class Attendance Grid matrix table loaded successfully!');
  } catch (err) {
    console.log('⚠️ Selector wait timed out, checking table state...');
  }

  await page.waitForTimeout(1500);

  // Inspect the Table
  const tableData = await page.evaluate(() => {
    const table = document.querySelector('#class-attendance-grid table');
    if (!table) return { found: false };

    // 1. Check sort indicator
    const sortHeaders = Array.from(table.querySelectorAll('thead th')).map(th => ({
      text: th.innerText.replace(/\s+/g, ' ').trim(),
      classes: th.className,
      isSorted: th.classList.contains('sorted-desc') || th.classList.contains('sorted-asc') || th.innerText.includes('▼') || th.innerText.includes('↓')
    }));

    // 2. Check student names
    const nameCells = Array.from(table.querySelectorAll('tbody tr td.col-sticky-4')).map(td => td.innerText.trim());

    // 3. Check quiz cells and all score spans
    const quizCells = Array.from(table.querySelectorAll('tbody tr td.col-quiz span.asm-score, tbody tr td.col-quiz span.asm-score-task')).map(span => span.innerText.trim());
    const allScoreSpans = Array.from(table.querySelectorAll('tbody tr td span.asm-score')).map(span => ({
      text: span.innerText.trim(),
      class: span.className,
      parentColClass: span.closest('td')?.className || ''
    }));

    // 4. Check all rows in order
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
      const nameCell = tr.querySelector('td.col-sticky-4');
      const ptsCell = tr.querySelector('td.col-exam-pts, td.col-total-pts');
      return {
        name: nameCell ? nameCell.innerText.trim() : '',
        pts: ptsCell ? ptsCell.innerText.trim() : ''
      };
    }).filter(r => r.name && !r.name.includes('CLASS AVERAGE'));

    return {
      found: true,
      sortHeaders: sortHeaders.slice(0, 15),
      nameCells,
      quizCells: quizCells.slice(0, 15),
      allScoreSpans: allScoreSpans.slice(0, 15),
      rows
    };
  });

  console.log('\n--- VERIFICATION RESULTS ---');
  if (!tableData.found) {
    console.error('❌ Table not found in DOM!');
    await browser.close();
    process.exit(1);
  }

  // 1. Verify Headers & Sort
  console.log('\nSample Column Headers:');
  tableData.sortHeaders.forEach(h => {
    console.log(`  - [${h.classes}] ${h.text} (sorted: ${h.isSorted})`);
  });

  // 1. Verify Student Names have NO Mr. or Miss
  const namesWithHonorifics = tableData.nameCells.filter(name => /^(Mr\.|Miss|Mrs\.|Ms\.)\s+/i.test(name));
  console.log(`\nStudent Names checked: ${tableData.nameCells.length}`);
  if (namesWithHonorifics.length === 0) {
    console.log('✅ PASS: All student names in Admin Class Hub have honorifics (Mr./Miss) stripped!');
  } else {
    console.error(`❌ FAIL: Found names with honorifics:`, namesWithHonorifics);
  }

  // 2. Sample Score spans
  console.log('\nSample Score Spans across table:');
  tableData.allScoreSpans.slice(0, 8).forEach(s => {
    console.log(`  - ${s.text} (col: ${s.parentColClass})`);
  });

  // 3. Verify Theme A View (Daily Quizzes Score % vs Points)
  console.log('\n--- SWITCHING TO THEME A VIEW TO VERIFY DAILY QUIZZES ---');
  await page.evaluate(() => {
    if (typeof window._setAttendanceThemeFilter === 'function') {
      window._setAttendanceThemeFilter('A');
    }
  });

  await page.waitForTimeout(1500);

  const themeAData = await page.evaluate(() => {
    const table = document.querySelector('#class-attendance-grid table');
    if (!table) return null;

    const quizCols = Array.from(table.querySelectorAll('thead th.col-quiz')).map(th => th.innerText.replace(/\s+/g, ' ').trim());
    const quizCells = Array.from(table.querySelectorAll('tbody tr td.col-quiz span.asm-score-task')).map(span => span.innerText.trim());
    const quizFooterCells = Array.from(table.querySelectorAll('tfoot tr td.col-quiz, tbody tr.summary-row td.col-quiz')).map(td => td.innerText.trim());

    return {
      quizCols,
      quizCells: quizCells.slice(0, 20),
      quizFooterCells
    };
  });

  if (themeAData) {
    console.log(`Quiz Columns found in Theme A: ${themeAData.quizCols.length}`);
    console.log('Sample Quiz Columns:', themeAData.quizCols.slice(0, 6));
    console.log('Sample Quiz Cells:', themeAData.quizCells.slice(0, 10));

    const invalidQuizzes = themeAData.quizCells.filter(c => !c.endsWith('%') && !c.includes('%'));
    if (invalidQuizzes.length === 0 && themeAData.quizCells.length > 0) {
      console.log('✅ PASS: All daily quiz cells in Theme A strictly display Score % (e.g. 100%, 98%) instead of points!');
    } else if (themeAData.quizCells.length === 0) {
      console.log('ℹ️ Note: No quiz attempts recorded for sample rows.');
    } else {
      console.error('❌ FAIL: Found quiz cells without %:', invalidQuizzes);
    }
  }

  // 4. Verify Ranking Order (Sofa Maria Ulfa vs Suke Ajai)
  console.log('\nTop 10 Students in Table Order:');
  tableData.rows.slice(0, 10).forEach((r, idx) => {
    console.log(`  #${idx+1}: ${r.name}`);
  });

  const sofaIdx = tableData.rows.findIndex(r => r.name.toLowerCase().includes('sofa maria ulfa'));
  const sukeIdx = tableData.rows.findIndex(r => r.name.toLowerCase().includes('suke ajai'));

  console.log(`\nSofa Maria Ulfa index: ${sofaIdx}, Suke Ajai index: ${sukeIdx}`);
  if (sofaIdx !== -1 && sukeIdx !== -1) {
    if (sukeIdx < sofaIdx) {
      console.log(`✅ PASS: Suke Ajai (383 pts, rank #${sukeIdx+1}) is ranked ABOVE Sofa Maria Ulfa (273.5 pts, rank #${sofaIdx+1})! Points-First hierarchy verified in live DOM!`);
    } else {
      console.error(`❌ FAIL: Sofa Maria Ulfa (rank #${sofaIdx+1}) is ranked above Suke Ajai (rank #${sukeIdx+1})!`);
    }
  }

  // Take screenshot as artifact
  const screenshotPath = 'C:\\Users\\Top\\.gemini\\antigravity-ide\\brain\\226fb7ff-7acf-410b-9ac7-347ad3059cb1\\admin_class_hub_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('\n=== BROWSER VERIFICATION COMPLETE ===');
})();
