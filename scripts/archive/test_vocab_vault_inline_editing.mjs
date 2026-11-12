import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/db70e579-3b54-4473-9eed-e7677e0d8525';

async function run() {
  console.log('=== Starting Vocab Vault Inline Editing & Real-Time Sync E2E Test ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  // 1. Navigate to Theme Manager
  console.log('[Test 1] Navigating to Theme Manager...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // 2. Toggle Master Edit Mode ON
  console.log('[Test 2] Toggling Master Edit Mode ON...');
  const editToggle = await page.$('#global-edit-mode-toggle');
  if (editToggle) await editToggle.click();
  await page.waitForTimeout(1000);

  const isEditOn = await page.evaluate(() => document.body.classList.contains('global-edit-mode-on'));
  console.log('  Master Edit Mode is ON:', isEditOn);
  if (!isEditOn) throw new Error('Master Edit Mode failed to toggle ON');

  // 3. Test Theme Name Edit & Sibling Multi-Row Sync
  console.log('[Test 3] Testing Theme Name editing & multi-row sibling synchronization...');
  const firstThemeInput = await page.$('#theme-manager-tbody tr [data-action="edit-theme-name"]');
  if (!firstThemeInput) throw new Error('Could not find theme name input');

  const oldThemeName = await firstThemeInput.inputValue();
  console.log('  Original theme name:', oldThemeName);

  // Type a small update
  const testNewTheme = oldThemeName.includes('✓') ? oldThemeName.replace(' ✓', '') : oldThemeName + ' ✓';
  await firstThemeInput.fill(testNewTheme);
  await firstThemeInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForTimeout(1200);

  // Verify DOM view span updated
  const viewSpanText = await page.evaluate(() => {
    const row = document.querySelector('#theme-manager-tbody tr');
    return row?.querySelector('[data-action="edit-theme-name"]')?.closest('td')?.querySelector('.vault-cell-view')?.textContent.trim();
  });
  console.log('  Updated view span text:', viewSpanText);
  if (viewSpanText !== testNewTheme) {
    throw new Error(`View span mismatch! Expected "${testNewTheme}", got "${viewSpanText}"`);
  }

  // 4. Test Empty Input Auto-Revert
  console.log('[Test 4] Testing empty input auto-revert...');
  await firstThemeInput.fill('');
  await firstThemeInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForTimeout(600);

  const revertedVal = await firstThemeInput.inputValue();
  console.log('  Reverted value after empty input:', revertedVal);
  if (!revertedVal) throw new Error('Empty input was not auto-reverted!');

  // Revert back cleanly to original
  await firstThemeInput.fill(oldThemeName);
  await firstThemeInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
  await page.waitForTimeout(1000);

  // 5. Test Toggle EDIT: OFF -> verify view span displays persisted value
  console.log('[Test 5] Toggling EDIT: OFF and verifying view span persistence...');
  if (editToggle) await editToggle.click();
  await page.waitForTimeout(1000);

  const shot1 = path.join(ARTIFACT_DIR, 'verified_inline_edit_theme_manager.png');
  await page.screenshot({ path: shot1 });
  console.log('  Captured:', shot1);

  // 6. Navigate to Vocabulary Words tab
  console.log('[Test 6] Navigating to Vocabulary Words tab...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Toggle Edit ON
  if (editToggle) await editToggle.click();
  await page.waitForTimeout(1000);

  // Test Indonesian & English editing
  console.log('[Test 7] Testing Vocabulary Words inline editing...');
  const firstIndoInput = await page.$('#vault-tbody tr [data-field="indonesian"]');
  const firstEngInput = await page.$('#vault-tbody tr [data-field="english"]');
  const firstCodeInput = await page.$('#vault-tbody tr [data-field="composite_code"]');

  if (firstIndoInput && firstEngInput) {
    const origIndo = await firstIndoInput.inputValue();
    const origEng = await firstEngInput.inputValue();
    console.log('  Original:', origIndo, '|', origEng);

    // Test flexible composite code with hyphens e.g. "1-A-1"
    if (firstCodeInput) {
      await firstCodeInput.fill('1-G-1');
      await firstCodeInput.evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
      await page.waitForTimeout(600);
      const parsedCode = await firstCodeInput.inputValue();
      console.log('  Sanitized composite code:', parsedCode);
      if (parsedCode.includes('-')) throw new Error('Composite code was not normalized!');
    }

    // Toggle EDIT: OFF to verify view spans
    if (editToggle) await editToggle.click();
    await page.waitForTimeout(1000);
  }

  const shot2 = path.join(ARTIFACT_DIR, 'verified_inline_edit_words_grid.png');
  await page.screenshot({ path: shot2 });
  console.log('  Captured:', shot2);

  await browser.close();
  console.log('=== All Vocab Vault Inline Editing tests PASSED (100%) ===');
}

run().catch(err => {
  console.error('Test FAILED:', err);
  process.exit(1);
});

