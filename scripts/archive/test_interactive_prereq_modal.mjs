import { chromium } from 'playwright';

async function main() {
  console.log('=== TESTING INTERACTIVE MODAL SAVE FOR PREREQUISITE ===');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const loginScreen = page.locator('#admin-login-screen');
  if (await loginScreen.isVisible()) {
    await page.fill('#admin-username', 'admin');
    await page.fill('#admin-password', 'admin123');
    await page.click('#admin-login-btn');
    await page.waitForTimeout(2000);
  }

  const clsId = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';
  await page.evaluate(async (cid) => {
    window._selectedClassId = cid;
    window._classHubActiveTab = 'tests';
    const area = document.getElementById('admin-content-area');
    if (window.renderClassHub) {
      await window.renderClassHub(area);
    }
  }, clsId);
  await page.waitForTimeout(2000);

  await page.evaluate(() => {
    const btn = document.getElementById('btn-tab-tests');
    if (btn) btn.click();
  });
  await page.waitForTimeout(2000);

  // 1. Click edit button on C1 row
  console.log('1. Clicking Edit button on C1 Words Task...');
  const c1Row = page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first();
  await c1Row.locator('button[onclick*="openCrudModal"]').click();
  await page.waitForTimeout(1000);

  // Verify modal is visible
  const modal = page.locator('#crud-modal');
  if (!await modal.isVisible()) throw new Error('Modal did not open!');
  console.log('   Modal opened successfully.');

  // Select 2B Words Exam
  const select = page.locator('#field-prerequisite_test_id');
  const opt2B = select.locator('option:has-text("2B-WORDS-EXAM")').first();
  const val2B = await opt2B.getAttribute('value');
  console.log('   Selecting 2B Exam:', val2B);
  await select.selectOption(val2B);

  // Submit form
  console.log('   Submitting form with 2B Exam...');
  await page.locator('#crud-submit-btn, button[type="submit"]:has-text("Save")').first().click();
  await page.waitForTimeout(2500);

  // Check row text
  let rowText = (await page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first().innerText()).replace(/\s+/g, ' ');
  console.log('   Row text after save 2B:', rowText);
  if (!rowText.includes('2B')) throw new Error('Failed to update prerequisite to 2B!');
  console.log('   ✅ PASS: Prerequisite successfully updated to 2B in UI!');

  // 2. Click edit button again and set to None (Optional)
  console.log('2. Clicking Edit button again to reset to None (Optional)...');
  await page.locator('tr:has-text("2nd Vocabulary C1 Words Task") button[onclick*="openCrudModal"]').first().click();
  await page.waitForTimeout(1000);

  // Verify modal shows 2B currently selected
  const currentSelected = await select.inputValue();
  console.log('   Current selected in modal:', currentSelected);
  if (currentSelected !== val2B) throw new Error('Modal did not remember 2B as selected prerequisite!');
  console.log('   ✅ PASS: Modal correctly remembered 2B as active prerequisite!');

  // Select None
  console.log('   Selecting "None (Optional)"...');
  await select.selectOption('');

  // Submit form
  await page.locator('#crud-submit-btn, button[type="submit"]:has-text("Save")').first().click();
  await page.waitForTimeout(2500);

  // Check row text
  rowText = (await page.locator('tr:has-text("2nd Vocabulary C1 Words Task")').first().innerText()).replace(/\s+/g, ' ');
  console.log('   Row text after reset to None:', rowText);
  if (rowText.includes('2B-WORDS-EXAM') || rowText.includes('⚠️')) throw new Error('Failed to reset prerequisite to None!');
  console.log('   ✅ PASS: Prerequisite successfully reset to "—" in UI!');

  await browser.close();
  console.log('=== ALL INTERACTIVE PREREQUISITE TESTS PASSED 100% ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
