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

  console.log('1. Navigating to Student Roster (#students)...');
  await page.goto('http://127.0.0.1:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  console.log('Capturing Student Roster in View Mode...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_student_roster_p414_view.png' });
  console.log('Saved verify_student_roster_p414_view.png');

  console.log('2. Toggling Master Edit Mode ON...');
  const editToggle = await page.$('#global-edit-mode-toggle, #btn-global-edit-mode, .admin-edit-toggle, .btn-edit-mode');
  if (editToggle) {
    await editToggle.click();
  } else {
    await page.evaluate(() => {
      document.body.classList.add('global-edit-mode-on');
      if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(true);
      window.dispatchEvent(new CustomEvent('topscore:editmode', { detail: { enabled: true } }));
    });
  }
  await page.waitForTimeout(1000);

  console.log('Capturing Student Roster in Edit Mode (White Excel Gridlines, Borderless Inputs)...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_student_roster_p414_edit.png' });
  console.log('Saved verify_student_roster_p414_edit.png');

  console.log('3. Testing Profile Modal Click on student photo/name...');
  // Toggle edit mode off for clicking profile
  await page.evaluate(() => {
    document.body.classList.remove('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(false);
  });
  await page.waitForTimeout(500);

  const studentNameEl = await page.$('.student-cell-view, .student-name-cell');
  if (studentNameEl) {
    await studentNameEl.click();
    await page.waitForTimeout(2000);
    console.log('Capturing Student Profile Modal...');
    await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_student_profile_modal.png' });
    console.log('Saved verify_student_profile_modal.png');
    // Close modal if open
    const closeBtn = await page.$('.modal-close, [data-dismiss="modal"], .btn-close');
    if (closeBtn) await closeBtn.click();
  }

  console.log('4. Navigating to Class Tests / Attendance Matrix...');
  await page.goto('http://127.0.0.1:5500/admin.html#classes', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    document.body.classList.add('global-edit-mode-on');
    if (typeof window.setGlobalEditMode === 'function') window.setGlobalEditMode(true);
  });
  await page.waitForTimeout(1000);

  console.log('Capturing Class Matrix in Edit Mode...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_class_matrix_p414_edit.png' });
  console.log('Saved verify_class_matrix_p414_edit.png');

  await browser.close();
  console.log('🎉 Verification screenshots captured successfully!');
}

main().catch(console.error);

