import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR LOG:', msg.text());
  });
  page.on('pageerror', err => console.log('PAGE UNCAUGHT ERROR:', err.message));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  console.log('1. Navigating to Active Student Roster (#students)...');
  await page.goto('http://127.0.0.1:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  // Measure Education column content and cell font weights
  const rosterMetrics = await page.evaluate(() => {
    const ths = Array.from(document.querySelectorAll('#student-grid-container table thead th')).map(th => ({
      text: th.innerText.trim(),
      transform: getComputedStyle(th).textTransform,
      weight: getComputedStyle(th).fontWeight,
      size: getComputedStyle(th).fontSize,
      font: getComputedStyle(th).fontFamily
    }));

    const rows = Array.from(document.querySelectorAll('#student-grid-container table tbody tr:not(.table-spacer-row)')).slice(0, 5);
    const sampleCells = rows.map(r => {
      const tds = Array.from(r.querySelectorAll('td'));
      return {
        name: tds[3]?.innerText.trim(),
        dob: tds[4]?.innerText.trim(),
        age: tds[5]?.innerText.trim(),
        education: tds[6]?.innerText.trim(),
        weight: getComputedStyle(tds[3] || r).fontWeight,
        size: getComputedStyle(tds[3] || r).fontSize
      };
    });

    const footer = document.querySelector('#student-grid-container table tfoot tr');
    const footerStyle = footer ? {
      weight: getComputedStyle(footer).fontWeight,
      size: getComputedStyle(footer).fontSize
    } : null;

    return { ths, sampleCells, footerStyle };
  });

  console.log('Roster Metrics:', JSON.stringify(rosterMetrics, null, 2));

  console.log('Capturing Active Student Roster in View Mode (Education Populated)...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_student_roster_education_populated.png' });
  console.log('Saved verify_student_roster_education_populated.png');

  console.log('2. Enabling Master Edit Mode on Student Roster...');
  await page.evaluate(() => {
    document.body.classList.add('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(true);
    window.dispatchEvent(new CustomEvent('topscore:editmode', { detail: { enabled: true } }));
  });
  await page.waitForTimeout(1000);

  const editMetrics = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('#student-grid-container table tbody tr:not(.table-spacer-row) input.student-inline-input')).slice(0, 5);
    return inputs.map(inp => ({
      field: inp.getAttribute('data-field'),
      val: inp.value,
      font: getComputedStyle(inp).fontFamily,
      size: getComputedStyle(inp).fontSize,
      weight: getComputedStyle(inp).fontWeight
    }));
  });
  console.log('Edit Mode Input Metrics:', JSON.stringify(editMetrics, null, 2));

  console.log('Capturing Student Roster in Edit Mode...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_student_roster_p415_edit_mode.png' });
  console.log('Saved verify_student_roster_p415_edit_mode.png');

  console.log('3. Navigating to Class Attendance Matrix (Camp 2nd Vocabulary)...');
  await page.evaluate(() => {
    document.body.classList.remove('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(false);
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2');
    localStorage.setItem('topscore_selected_class_name', 'Camp 2nd Vocabulary');
    localStorage.setItem('topscore_admin_class_hub_tab', 'attendance');
  });

  await page.goto('http://127.0.0.1:5500/admin.html#class-hub', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  const matrixMetrics = await page.evaluate(() => {
    const superHdrs = Array.from(document.querySelectorAll('#class-attendance-grid thead tr.has-super-headers th')).map(th => ({
      text: th.innerText.trim(),
      colSpan: th.colSpan
    }));

    const subHdrs = Array.from(document.querySelectorAll('#class-attendance-grid thead tr:not(.has-super-headers) th')).map(th => ({
      text: th.innerText.trim(),
      className: th.className
    }));

    const footerCells = Array.from(document.querySelectorAll('#class-attendance-grid tfoot tr td')).map(td => ({
      text: td.innerText.trim(),
      className: td.className
    }));

    return { superHdrs, subHdrs: subHdrs.slice(0, 10), footerCells: footerCells.slice(0, 6) };
  });
  console.log('Matrix Structure Metrics:', JSON.stringify(matrixMetrics, null, 2));

  console.log('Capturing Class Attendance Matrix in View Mode (No Institution / Program)...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_attendance_matrix_no_inst_prog.png' });
  console.log('Saved verify_attendance_matrix_no_inst_prog.png');

  console.log('4. Enabling Master Edit Mode on Class Attendance Matrix...');
  await page.evaluate(() => {
    document.body.classList.add('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(true);
    window.dispatchEvent(new CustomEvent('topscore:editmode', { detail: { enabled: true } }));
  });
  await page.waitForTimeout(1000);

  console.log('Capturing Class Attendance Matrix in Edit Mode...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_attendance_matrix_p415_edit_mode.png' });
  console.log('Saved verify_attendance_matrix_p415_edit_mode.png');

  await browser.close();
  console.log('🎉 All Phase 415 visual verifications completed successfully!');
}

main().catch(console.error);

