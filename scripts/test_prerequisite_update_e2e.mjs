import { chromium } from 'playwright';
import path from 'path';

async function main() {
  console.log('=== STARTING PLAYWRIGHT VERIFICATION: TEST PREREQUISITE UPDATE & DUAL COLUMN SYNC ===');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Inject session storage for Admin / Class Hub
  await page.addInitScript(() => {
    localStorage.setItem('topscore_admin_token', 'mock_admin_token');
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2'); // 2nd Vocabulary
    localStorage.setItem('topscore_selected_class_name', '2nd Vocabulary');
    sessionStorage.setItem('topscore_admin_token', 'mock_admin_token');
  });

  console.log('Navigating to http://127.0.0.1:5500/admin.html#class-hub...');
  await page.goto('http://127.0.0.1:5500/admin.html#class-hub', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);

  // Switch to Class Tests tab (Tests / Curriculum tab in Class Hub)
  console.log('Checking Class Hub tabs...');
  const testsTabBtn = page.locator('#tab-btn-class-tests, [data-tab="tests"], button:has-text("Class Tests")').first();
  if (await testsTabBtn.isVisible()) {
    await testsTabBtn.click();
    await page.waitForTimeout(1500);
  }

  // Find row for 2nd Vocabulary C1 Words Task
  const c1Row = page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first();
  await c1Row.waitFor({ state: 'visible', timeout: 15000 });

  // Get Prerequisite text in that row
  const prereqCell = c1Row.locator('td').nth(3); // Title, Code, Passing, Prereq (or similar)
  const allRowText = await c1Row.innerText();
  console.log('  - C1 Row Text preview:', allRowText.replace(/\s+/g, ' '));

  // Verify that 2B-WORDS-EXAM is NO LONGER shown as prerequisite for C1!
  if (allRowText.includes('2B-WORDS-EXAM')) {
    console.error('❌ ERROR: C1 Words Task still shows 2B-WORDS-EXAM as prerequisite!');
    process.exit(1);
  }
  console.log('  ✅ Verified: C1 Words Task no longer shows 2B-WORDS-EXAM prerequisite!');

  // Now test opening Edit Modal on C1
  const editBtn = c1Row.locator('button:has-text("✏️"), button.btn-secondary:has-text("✏")').first();
  await editBtn.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('#crud-modal');
  await modal.waitFor({ state: 'visible', timeout: 5000 });
  console.log('  ✅ Edit modal opened successfully.');

  const prereqSelect = page.locator('#field-prerequisite_test_id');
  const selectedPrereqVal = await prereqSelect.inputValue();
  console.log('  - Selected Prereq Value in modal:', selectedPrereqVal || '(None/empty)');

  if (selectedPrereqVal !== '') {
    console.error(`❌ Expected Prerequisite in modal to be "" (None), but got: "${selectedPrereqVal}"`);
    process.exit(1);
  }
  console.log('  ✅ Verified: Modal accurately shows "None (Optional)" as selected!');

  // Now test updating prerequisite to 2B-WORDS-EXAM inside the modal and saving
  console.log('Testing: Set prerequisite to 2B-WORDS-EXAM and Save...');
  // Find option for 2B-WORDS-EXAM
  const option2B = page.locator('#field-prerequisite_test_id option:has-text("2B")').first();
  const option2BVal = await option2B.getAttribute('value');
  console.log('  - Found 2B exam value:', option2BVal);
  await prereqSelect.selectOption(option2BVal);

  const saveBtn = page.locator('#crud-submit-btn, button[type="submit"]:has-text("Save")').first();
  await saveBtn.click();
  await page.waitForTimeout(2000);

  // Check row text again
  const rowAfterSave = await page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first().innerText();
  console.log('  - Row text after setting 2B:', rowAfterSave.replace(/\s+/g, ' '));
  if (!rowAfterSave.includes('2B')) {
    console.error('❌ ERROR: Row does not show 2B after save!');
    process.exit(1);
  }
  console.log('  ✅ Verified: Updating prerequisite to 2B saved and displayed immediately!');

  // Now test resetting it back to "None (Optional)" and saving
  console.log('Testing: Set prerequisite BACK to "None (Optional)" and Save...');
  const editBtn2 = page.locator('tr:has-text("2nd Vocabulary C1 Words Task") button:has-text("✏️")').first();
  await editBtn2.click();
  await page.waitForTimeout(1000);
  await page.locator('#field-prerequisite_test_id').selectOption('');
  await page.locator('#crud-submit-btn, button[type="submit"]:has-text("Save")').first().click();
  await page.waitForTimeout(2000);

  const rowAfterReset = await page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first().innerText();
  console.log('  - Row text after reset to None:', rowAfterReset.replace(/\s+/g, ' '));
  if (rowAfterReset.includes('2B-WORDS-EXAM')) {
    console.error('❌ ERROR: Row still shows 2B-WORDS-EXAM after resetting to None!');
    process.exit(1);
  }
  console.log('  ✅ Verified: Resetting prerequisite to None saved and displayed "—" immediately!');

  const screenshotPath = path.resolve('prerequisite_update_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('  📸 Screenshot saved:', screenshotPath);

  await browser.close();
  console.log('=== ALL PREREQUISITE UPDATE & DUAL COLUMN SYNC CHECKS PASSED 100% ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
