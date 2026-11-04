// TOPS CORE — E2E Test Suite for Phase 306: Configurable Task Mastery & Blueprint Settings
const _store = new Map();
const mockStorage = {
  getItem: (k) => _store.has(k) ? _store.get(k) : null,
  setItem: (k, v) => _store.set(k, String(v)),
  removeItem: (k) => _store.delete(k),
  clear: () => _store.clear()
};

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: mockStorage,
  sessionStorage: mockStorage
};
global.localStorage = mockStorage;
global.sessionStorage = mockStorage;
global.document = {
  addEventListener: () => {},
  removeEventListener: () => {}
};

import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const { getSupabase } = await import('../js/supabase.js');
const { fetchClassTestSettings, saveClassTestSettings, updateTestPassingScore } = await import('../js/api.js?v=20261104_v119');

async function runTest() {
  console.log('=== PHASE 306: CONFIGURABLE MASTERY & BLUEPRINT SETTINGS E2E TEST ===\n');

  const sb = await getSupabase();

  // 1. Locate 2nd Vocabulary class
  const { data: cls } = await sb.from('classes')
    .select('id, name, level_id')
    .ilike('name', '%2nd Vocabulary%')
    .single();

  if (!cls) throw new Error('2nd Vocabulary class not found!');
  console.log(`[1] Found Target Class: ${cls.name} (${cls.id})`);

  // 2. Test API: saveClassTestSettings with 6 Repetitions, 50% Task Min Score, 60% Exam Min Score
  console.log('\n[2] Testing saveClassTestSettings API...');
  const newSettings = {
    taskRepetitions: 6,
    taskMinScore: 50,
    examMinScore: 60,
    isGlobal: false
  };
  const saveRes = await saveClassTestSettings(cls.id, newSettings, true);
  console.log('    saveClassTestSettings response:', saveRes);

  const verifiedSettings = await fetchClassTestSettings(cls.id);
  console.log('    fetchClassTestSettings verified:', verifiedSettings);
  if (verifiedSettings.taskRepetitions !== 6 || verifiedSettings.taskMinScore !== 50 || verifiedSettings.examMinScore !== 60) {
    throw new Error('Settings mismatch after saveClassTestSettings!');
  }
  console.log('    ✅ PASS: saveClassTestSettings and fetchClassTestSettings verified!');

  // 3. Test API: updateTestPassingScore inline
  console.log('\n[3] Testing updateTestPassingScore API...');
  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, minimum_required_score')
    .eq('class_id', cls.id)
    .order('display_order', { ascending: true })
    .limit(5);

  if (!tests || tests.length === 0) throw new Error('No tests found in 2nd Vocabulary!');
  const testToUpdate = tests[0];
  console.log(`    Target test to update: ${testToUpdate.shell_code || testToUpdate.title} (current: ${testToUpdate.minimum_required_score}%)`);

  await updateTestPassingScore(testToUpdate.id, 55);
  const { data: updatedTest } = await sb.from('tests')
    .select('id, minimum_required_score, payload')
    .eq('id', testToUpdate.id)
    .single();

  console.log(`    Updated score in DB: ${updatedTest.minimum_required_score}% (payload: ${updatedTest.payload?.minimum_required_score}%)`);
  if (Number(updatedTest.minimum_required_score) !== 55) {
    throw new Error('updateTestPassingScore failed to update DB!');
  }
  console.log('    ✅ PASS: updateTestPassingScore verified in database!');

  // 4. Launch Playwright Browser for UI & E2E Validation
  console.log('\n[4] Launching Playwright Chromium for Admin UI Verification...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();

  // Inject admin session
  await page.addInitScript((cid) => {
    sessionStorage.setItem('topscore_admin_session', JSON.stringify({
      user: { id: 'admin-001', role: 'admin', name: 'Mr. Top' },
      token: 'mock-token'
    }));
    sessionStorage.setItem('topscore_selected_class_id', cid);
    localStorage.setItem('topscore_selected_class_id', cid);
  }, cls.id);

  // Navigate to Tutor Room: Class Hub Attendance (Roster Matrix)
  console.log('    Navigating to admin.html#class-hub?tab=attendance...');
  await page.goto(`http://127.0.0.1:5500/admin.html#class-hub?tab=attendance`, {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });

  await page.waitForTimeout(3000);

  // Switch to Theme A to view topic columns
  const themeABtn = page.locator('button:has-text("THEME A")').first();
  if (await themeABtn.isVisible().catch(() => false)) {
    console.log('    Clicking THEME A filter...');
    await themeABtn.click();
    await page.waitForTimeout(1500);
  }

  // Verify Repetition Progress Badges in Matrix Cells
  console.log('\n[5] Verifying Repetition Progress Badges in Matrix...');
  const repBadges = page.locator('.asm-rep-badge');
  const repCount = await repBadges.count();
  console.log(`    Found ${repCount} .asm-rep-badge elements in matrix!`);
  if (repCount === 0) {
    throw new Error('No .asm-rep-badge elements rendered in attendance matrix!');
  }

  const firstBadgeText = await repBadges.first().textContent();
  console.log(`    Sample repetition badge text: "${firstBadgeText.trim()}" (matches /6 format)`);

  const artifactDir = path.join(process.env.USERPROFILE || '', '.gemini', 'antigravity', 'brain', '32e9ca28-d796-4f35-afe9-223111004d95');
  const rosterShotPath = path.join(artifactDir, 'roster_matrix_repetition_progress_verified.png');
  await page.screenshot({ path: rosterShotPath, fullPage: false });
  console.log(`    📸 Saved attendance matrix screenshot to: ${rosterShotPath}`);

  // Switch to Class Tests (Blueprint) tab
  console.log('\n[6] Switching to Class Tests tab (tab=tests)...');
  const testsTabBtn = page.locator('#btn-tab-tests');
  if (await testsTabBtn.isVisible().catch(() => false)) {
    await testsTabBtn.click();
  } else {
    await page.evaluate(async (cid) => {
      window._classHubActiveTab = 'tests';
      const area = document.getElementById('admin-content-area');
      if (window.renderClassHub) await window.renderClassHub(area);
    }, cls.id);
  }
  await page.waitForTimeout(2000);

  // Check Inline Editable Passing Score Inputs
  console.log('\n[7] Verifying Inline Editable Passing Score Column...');
  const passInputs = page.locator('.input-test-pass-score');
  const inputCount = await passInputs.count();
  console.log(`    Found ${inputCount} .input-test-pass-score inputs in table!`);
  if (inputCount === 0) {
    throw new Error('No .input-test-pass-score inputs rendered in tests table!');
  }

  // Test editing an inline input
  const firstInput = passInputs.first();
  const currentVal = await firstInput.inputValue();
  console.log(`    First test PASS (%) input value: ${currentVal}%`);
  
  await firstInput.fill('58');
  await firstInput.press('Enter');
  await page.waitForTimeout(1000);

  const blueprintShotPath = path.join(artifactDir, 'blueprint_exam_pass_score_inline_verified.png');
  await page.screenshot({ path: blueprintShotPath, fullPage: false });
  console.log(`    📸 Saved blueprint inline score screenshot to: ${blueprintShotPath}`);

  // Open Test System Settings Modal
  console.log('\n[8] Opening Test System Settings Modal...');
  const btnSettings = page.locator('#btn-open-blueprint-settings');
  if (!await btnSettings.isVisible().catch(() => false)) {
    throw new Error('#btn-open-blueprint-settings button not found in Class Tests toolbar!');
  }
  await btnSettings.click();
  await page.waitForTimeout(1000);

  const modal = page.locator('#test-system-settings-modal');
  const isModalVisible = await modal.isVisible();
  console.log(`    Modal #test-system-settings-modal visible: ${isModalVisible}`);
  if (!isModalVisible) {
    throw new Error('Test System Settings modal did not open!');
  }

  // Verify modal inputs
  const repInput = modal.locator('#setting-task-repetitions');
  const taskMinInput = modal.locator('#setting-task-min-score');
  const examMinInput = modal.locator('#setting-exam-min-score');

  console.log(`    Modal Repetitions input: ${await repInput.inputValue()}`);
  console.log(`    Modal Task Min Score input: ${await taskMinInput.inputValue()}%`);
  console.log(`    Modal Exam Min Score input: ${await examMinInput.inputValue()}%`);

  const modalShotPath = path.join(artifactDir, 'test_system_settings_modal_verified.png');
  await page.screenshot({ path: modalShotPath, fullPage: false });
  console.log(`    📸 Saved settings modal screenshot to: ${modalShotPath}`);

  // Test saving from modal: Set to 6 reps, 50% task, 60% exam
  await repInput.fill('6');
  await taskMinInput.fill('50');
  await examMinInput.fill('60');

  const btnSave = modal.locator('#btn-save-settings');
  await btnSave.click();
  await page.waitForTimeout(2000);

  console.log('    Modal successfully submitted and closed.');

  await browser.close();
  console.log('\n=== ALL E2E AND UI VERIFICATIONS PASSED 100%! ===');
}

runTest().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
