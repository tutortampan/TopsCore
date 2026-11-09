import { chromium } from 'playwright';

(async () => {
  console.log('=== VERIFYING QUEUED EXAMS (0% DISPLAY) & ARI WAHYU RESOLUTION IN DOM ===');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  // Inject Admin Session
  await page.addInitScript(() => {
    const adminSession = JSON.stringify({
      admin_id: 'admin-master',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', adminSession);
    localStorage.setItem('topscore_admin_session', adminSession);
    localStorage.setItem('topscore_selected_class_id', 'ab33498a-90e6-44b7-83f4-5765f964543e');
    localStorage.setItem('topscore_selected_class_name', '3rd Vocabulary');
    localStorage.setItem('topscore_admin_last_section', 'class-hub');
  });

  console.log('Navigating to http://127.0.0.1:5500/admin.html#class-hub...');
  await page.goto('http://127.0.0.1:5500/admin.html#class-hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Explicitly ensure 3rd Vocabulary is loaded
  console.log('Ensuring 3rd Vocabulary is rendered...');
  await page.evaluate(async () => {
    window._selectedClassId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
    window._selectedClassName = '3rd Vocabulary';
    const area = document.getElementById('admin-content-area');
    if (area && typeof window.renderClassHub === 'function') {
      await window.renderClassHub(area);
    }
  });

  // Wait until studentsGridData is rendered and populated
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('#class-attendance-grid table tbody tr');
    if (rows.length === 0) return false;
    const firstRowPts = rows[0].querySelector('td.col-pts, td:nth-child(7)');
    // Wait until pts is not 0 pts or until data is populated
    return rows.length > 5;
  }, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Inspect the rows for the students mentioned by user
  const verificationResults = await page.evaluate(() => {
    const table = document.querySelector('#class-attendance-grid table');
    if (!table) return { found: false };

    // Get column keys from header
    const colHeaders = Array.from(table.querySelectorAll('thead tr:last-child th')).map((th, idx) => ({
      idx,
      key: th.dataset.key || '',
      label: th.innerText.replace(/\s+/g, ' ').trim()
    }));

    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
      const nameCell = tr.querySelector('td.col-sticky-4');
      const name = nameCell ? nameCell.innerText.trim() : '';
      const cells = Array.from(tr.querySelectorAll('td')).map((td, idx) => ({
        idx,
        text: td.innerText.replace(/\s+/g, ' ').trim(),
        html: td.innerHTML
      }));
      return { name, cells };
    }).filter(r => r.name && !r.name.includes('CLASS AVERAGE'));

    return {
      found: true,
      colHeaders,
      rows
    };
  });

  if (!verificationResults.found) {
    console.error('Table not found!');
    await browser.close();
    process.exit(1);
  }

  console.log('\n--- TARGET STUDENTS AUDIT ---');
  const targetNames = [
    'Ari Wahyu Darma',
    'Sofa Maria Ulfa',
    'Muhammad Alimae Pasya',
    'Suharto',
    'Muhammad Tarmizi Tohir',
    'Syazida Shinda Debi',
    'Aunul Fikri Yasir',
    'Rifky Ahmad',
    'Muhammad Alif Rezki'
  ];

  targetNames.forEach(target => {
    const row = verificationResults.rows.find(r => r.name.toLowerCase().includes(target.toLowerCase()));
    if (!row) {
      console.log(`❌ Student not found: ${target}`);
      return;
    }

    console.log(`\n[STUDENT: ${row.name}]`);
    // Print all non-empty / interesting exam cells
    row.cells.forEach(c => {
      const hdr = verificationResults.colHeaders[c.idx];
      if (hdr && (hdr.label.includes('SCORE') || hdr.label.includes('PTS') || hdr.label.includes('TOT'))) {
        const hasHourglass = c.html.includes('⏳');
        console.log(`  - ${hdr.label} (${hdr.key}): ${c.text} ${hasHourglass ? '[HAS ⏳]' : ''}`);
      }
    });
  });

  // Specifically verify Ari Wahyu Darma has NO ⏳
  const ariRow = verificationResults.rows.find(r => r.name.toLowerCase().includes('ari wahyu darma'));
  if (ariRow) {
    const hasAnyHourglass = ariRow.cells.some(c => c.html.includes('⏳'));
    if (!hasAnyHourglass) {
      console.log('\n✅ PASS: Ari Wahyu Darma has ZERO ⏳ icons! Test 29 evaluated and displayed properly!');
    } else {
      console.error('\n❌ FAIL: Ari Wahyu Darma STILL has ⏳ in table!');
    }
  }

  // Specifically verify Sofa Maria Ulfa Test 18 displays 0%
  const sofaRow = verificationResults.rows.find(r => r.name.toLowerCase().includes('sofa maria ulfa'));
  if (sofaRow) {
    const test18ScoreCell = sofaRow.cells.find(c => {
      const h = verificationResults.colHeaders[c.idx];
      return h && h.label.includes('18') && h.label.includes('SCORE');
    });
    console.log(`Sofa Maria Ulfa 18 SCORE cell: "${test18ScoreCell?.text}"`);
    if (test18ScoreCell && (test18ScoreCell.text === '0%' || test18ScoreCell.text.includes('0%'))) {
      console.log('✅ PASS: Sofa Maria Ulfa Test 18 displays 0% (Queued next milestone exam)!');
    } else {
      console.error(`❌ FAIL: Expected 0% for Sofa Maria Ulfa Test 18, got: "${test18ScoreCell?.text}"`);
    }
  }

  // Specifically verify Pasya Test 17 & 18 display 0%
  const pasyaRow = verificationResults.rows.find(r => r.name.toLowerCase().includes('alimae pasya'));
  if (pasyaRow) {
    const t17Cell = pasyaRow.cells.find(c => verificationResults.colHeaders[c.idx]?.label.includes('17') && verificationResults.colHeaders[c.idx]?.label.includes('SCORE'));
    const t18Cell = pasyaRow.cells.find(c => verificationResults.colHeaders[c.idx]?.label.includes('18') && verificationResults.colHeaders[c.idx]?.label.includes('SCORE'));
    console.log(`Pasya 17 SCORE: "${t17Cell?.text}", 18 SCORE: "${t18Cell?.text}"`);
    if (t17Cell?.text === '0%' && t18Cell?.text === '0%') {
      console.log('✅ PASS: Muhammad Alimae Pasya Theme 2 exams (17 & 18) display 0% (Queued next milestone)!');
    } else {
      console.error(`❌ FAIL: Expected 0% for Pasya 17 & 18, got: "${t17Cell?.text}" & "${t18Cell?.text}"`);
    }
  }

  // Specifically verify Syazida Test 30 displays 0%
  const syazidaRow = verificationResults.rows.find(r => r.name.toLowerCase().includes('syazida shinda debi'));
  if (syazidaRow) {
    const t30Cell = syazidaRow.cells.find(c => verificationResults.colHeaders[c.idx]?.label.includes('30') && verificationResults.colHeaders[c.idx]?.label.includes('SCORE'));
    console.log(`Syazida 30 SCORE: "${t30Cell?.text}"`);
    if (t30Cell && (t30Cell.text === '0%' || t30Cell.text.includes('0%'))) {
      console.log('✅ PASS: Syazida Shinda Debi Test 30 displays 0% (Queued Theme 3 Phrases Exam)!');
    } else {
      console.error(`❌ FAIL: Expected 0% for Syazida Test 30, got: "${t30Cell?.text}"`);
    }
  }

  // Specifically verify Rifky Ahmad & Muhammad Alif Rezki (0 exams -> Theme 1 queued at 0%)
  const rifkyRow = verificationResults.rows.find(r => r.name.toLowerCase().includes('rifky ahmad'));
  if (rifkyRow) {
    const scoreCell = rifkyRow.cells.find(c => verificationResults.colHeaders[c.idx]?.key === 'averageScorePct');
    const grdCell = rifkyRow.cells.find(c => verificationResults.colHeaders[c.idx]?.key === 'grade');
    const t7Cell = rifkyRow.cells.find(c => verificationResults.colHeaders[c.idx]?.label.includes('7') && verificationResults.colHeaders[c.idx]?.label.includes('SCORE'));
    const t8Cell = rifkyRow.cells.find(c => verificationResults.colHeaders[c.idx]?.label.includes('8') && verificationResults.colHeaders[c.idx]?.label.includes('SCORE'));
    const t17Cell = rifkyRow.cells.find(c => verificationResults.colHeaders[c.idx]?.label.includes('17') && verificationResults.colHeaders[c.idx]?.label.includes('SCORE'));
    console.log(`Rifky Ahmad SCORE: "${scoreCell?.text}", GRD: "${grdCell?.text}", T7: "${t7Cell?.text}", T8: "${t8Cell?.text}", T17: "${t17Cell?.text}"`);
    if (scoreCell?.text === '0%' && (grdCell?.text === 'E' || grdCell?.html.includes('grade-circle-e')) && t7Cell?.text === '0%' && t8Cell?.text === '0%' && t17Cell?.text === '·') {
      console.log('✅ PASS: Rifky Ahmad correctly initialized at Theme 1: SCORE 0%, Grade E, T7 & T8 = 0%, and T17 unreached (·)!');
    } else {
      console.error('❌ FAIL: Rifky Ahmad initial Theme 1 milestone state incorrect!');
    }
  }

  // Take screenshot
  const screenshotPath = 'C:\\Users\\Top\\.gemini\\antigravity-ide\\brain\\226fb7ff-7acf-410b-9ac7-347ad3059cb1\\admin_class_hub_queued_milestones_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`📸 Screenshot saved to ${screenshotPath}`);

  await browser.close();
  console.log('=== VERIFICATION SCRIPT COMPLETE ===');
})();
