import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function runVerification() {
  console.log('🚀 Starting Phase 458 E2E Verification Suite...');
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    serviceWorkers: 'block'
  });
  const page = await context.newPage();

  // Mock valid session in sessionStorage & localStorage
  const mockSession = {
    student_id: '11111111-2222-3333-4444-555555555555',
    student_name: 'Jessica Pratama',
    name: 'Jessica Pratama',
    institution_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    institution_name: 'Oxford English Academy',
    program_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    program_name: 'General English',
    batch_id: 'cccccccc-dddd-eeee-ffff-000000000000',
    batch_name: 'Batch Alpha 2026',
    gender: 'female',
    dob: '2002-05-15',
    birth_date: '2002-05-15',
    education: [
      { id: 'kindergarten', level: 'TK', name: 'Kindergarten (TK)', institution: 'Kindergarten (TK)', year: 2008 },
      { id: 'elementary', level: 'SD', name: 'Elementary School (SD)', institution: 'Elementary School (SD)', year: 2014 },
      { id: 'junior_high', level: 'SMP', name: 'Junior High School (SMP)', institution: 'Junior High School (SMP)', year: 2017 },
      { id: 'senior_high', level: 'SMA/SMK', name: 'Senior High School (SMA/SMK)', institution: 'Senior High School (SMA/SMK)', year: 2020 },
      { id: 'bachelor', level: 'S1/D4', name: "Bachelor's Degree (S1/D4)", institution: "Bachelor's Degree (S1/D4)", year: 2024 }
    ],
    photo_retake_eligible: true
  };

  await page.addInitScript((session) => {
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    sessionStorage.setItem('topscore_student_session', JSON.stringify(session));
    localStorage.setItem(`stu_photo_retake_eligible_${session.student_id}`, 'true');
    localStorage.setItem(`stu_photo_${session.student_id}`, 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%236366f1"/></svg>');
  }, mockSession);

  // ── TEST 1: Zero type="file" in dashboard.html ──
  console.log('\n--- Test 1: Anti-Upload Enforcement ---');
  await page.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'domcontentloaded' });
  const fileInputsCount = await page.locator('input[type="file"]').count();
  console.log(`File inputs count in dashboard.html: ${fileInputsCount}`);
  assert.equal(fileInputsCount, 0, 'Mandatory: input[type="file"] must be 0 in dashboard.html');
  console.log('✔ Passed: Anti-Upload enforcement confirmed (0 file upload inputs).');

  // ── TEST 2: Flashcards Purge ──
  console.log('\n--- Test 2: Flashcards Purge ---');
  const fcModalCount = await page.locator('#flashcard-modal').count();
  assert.equal(fcModalCount, 0, 'Mandatory: #flashcard-modal must be 0 in dashboard.html');

  await page.goto('http://127.0.0.1:5500/result.html', { waitUntil: 'domcontentloaded' });
  const fcResultModalCount = await page.locator('#flashcard-modal').count();
  const fcBtnCount = await page.locator('#open-flashcards-btn').count();
  assert.equal(fcResultModalCount, 0, 'Mandatory: #flashcard-modal must be 0 in result.html');
  assert.equal(fcBtnCount, 0, 'Mandatory: #open-flashcards-btn must be 0 in result.html');
  console.log('✔ Passed: Complete Flashcard feature purge verified across dashboard and result.');

  // ── TEST 3: PIN Input Layout No-Overflow on Desktop & Mobile ──
  console.log('\n--- Test 3: PIN Input Card Bounding Box Invariant ---');
  await page.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'domcontentloaded' });

  // Open profile modal
  await page.evaluate(() => {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.remove('hidden');
    if (typeof window._switchProfileTab === 'function') window._switchProfileTab('profile');
  });
  await page.waitForTimeout(300);

  // Measure desktop
  const pinCardBox = await page.locator('.profile-pin-card:has(#change-pin-form)').boundingBox();
  const pinConfirmBox = await page.locator('#pin-confirm').boundingBox();
  assert.ok(pinCardBox, 'PIN card must be visible');
  assert.ok(pinConfirmBox, 'Confirm PIN input must be visible');
  console.log(`Desktop - PIN Card Right: ${pinCardBox.x + pinCardBox.width}, PIN Confirm Right: ${pinConfirmBox.x + pinConfirmBox.width}`);
  assert.ok(
    pinConfirmBox.x + pinConfirmBox.width <= pinCardBox.x + pinCardBox.width + 1,
    'PIN confirm input must strictly fit inside PIN card on desktop'
  );

  // Measure on Mobile Viewport (390px iPhone 12/13/14)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const mPinCardBox = await page.locator('.profile-pin-card:has(#change-pin-form)').boundingBox();
  const mPinConfirmBox = await page.locator('#pin-confirm').boundingBox();
  console.log(`Mobile 390px - PIN Card Right: ${mPinCardBox.x + mPinCardBox.width}, PIN Confirm Right: ${mPinConfirmBox.x + mPinConfirmBox.width}`);
  assert.ok(
    mPinConfirmBox.x + mPinConfirmBox.width <= mPinCardBox.x + mPinCardBox.width + 1,
    'PIN confirm input must strictly fit inside PIN card on mobile'
  );
  console.log('✔ Passed: PIN layout verified with zero card boundary overflow.');

  // ── TEST 4: Student Profile Drawer Read-Only Fields & Metadata ──
  console.log('\n--- Test 4: Profile Drawer Read-Only Fields & Education Timeline ---');
  // Check read-only gender
  const genderBtnCount = await page.locator('#btn-prof-male, #btn-prof-female').count();
  assert.equal(genderBtnCount, 0, 'Editable gender buttons must not exist in profile drawer');
  const titleDisplay = await page.locator('#prof-title-text').textContent();
  assert.equal(titleDisplay.trim(), 'Miss', 'Female student title must display Miss');
  const adminBadgesCount = await page.locator('.profile-admin-badge').count();
  assert.ok(adminBadgesCount >= 2, 'Admin Only lock badges must be present on sensitive fields');

  // Check read-only DOB & Age
  const dobText = await page.locator('#prof-dob-display').textContent();
  const ageText = await page.locator('#prof-age-display').textContent();
  console.log(`Profile DOB: ${dobText}, Age: ${ageText}`);
  assert.ok(dobText.includes('2002'), 'DOB must show 2002');
  assert.ok(ageText.includes('years old'), 'Age must be calculated');

  // Check Education Timeline
  const timelineNodes = await page.locator('.profile-timeline-node').count();
  console.log(`Profile educational timeline milestones: ${timelineNodes}`);
  assert.equal(timelineNodes, 5, 'Must render 5 milestones (TK, SD, SMP, SMA, S1)');

  // Capture screenshot of updated profile drawer
  const profileDrawerPath = path.join(ARTIFACT_DIR, 'p458_verified_student_profile_drawer.png');
  await page.locator('.profile-modal-box').screenshot({ path: profileDrawerPath });
  console.log(`✔ Captured profile drawer screenshot: ${profileDrawerPath}`);

  // ── TEST 5: Education Setup Auto-Estimation Modal ──
  console.log('\n--- Test 5: Education Setup Modal Auto-Estimation ---');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    document.getElementById('profile-modal')?.classList.add('hidden');
    const eduModal = document.getElementById('education-setup-modal');
    if (eduModal) {
      eduModal.classList.remove('hidden');
      if (typeof window.initEducationModalControls === 'function') {
        window.initEducationModalControls(2002);
      }
    }
  });
  await page.waitForTimeout(300);

  // Click Bachelor button
  await page.locator('button.edu-level-btn[data-level="bachelor"]').click();
  await page.waitForTimeout(300);

  // Verify preview milestones
  const previewItems = await page.locator('.edu-timeline-item').count();
  console.log(`Education setup preview items: ${previewItems}`);
  assert.equal(previewItems, 5, 'Must preview 5 educational milestones for Bachelor level');

  const confirmBtnDisabled = await page.locator('#btn-confirm-education-setup').isDisabled();
  assert.equal(confirmBtnDisabled, false, 'Confirm button must become enabled after selection');

  // Capture screenshot of education setup modal
  const eduModalPath = path.join(ARTIFACT_DIR, 'p458_verified_education_timeline_modal.png');
  await page.locator('.education-setup-card').screenshot({ path: eduModalPath });
  console.log(`✔ Captured education timeline modal screenshot: ${eduModalPath}`);

  // ── TEST 6: Camera-Only Photo Setup Modal ──
  console.log('\n--- Test 6: Photo Setup Modal Camera Only ---');
  await page.evaluate(() => {
    document.getElementById('education-setup-modal')?.classList.add('hidden');
    const photoModal = document.getElementById('photo-setup-modal');
    if (photoModal) photoModal.classList.remove('hidden');
  });
  await page.waitForTimeout(300);

  const snapBtnCount = await page.locator('#btn-snap-photo').count();
  const fileUploadInPhotoModal = await page.locator('#photo-setup-modal input[type="file"]').count();
  assert.equal(snapBtnCount, 1, 'Capture photo camera button must exist');
  assert.equal(fileUploadInPhotoModal, 0, 'Photo modal must have 0 file upload inputs');

  const photoModalPath = path.join(ARTIFACT_DIR, 'p458_verified_photo_camera_modal.png');
  await page.locator('.photo-setup-box').screenshot({ path: photoModalPath });
  console.log(`✔ Captured camera-only photo modal screenshot: ${photoModalPath}`);

  await browser.close();
  console.log('\n🎉 ALL PHASE 458 E2E VERIFICATION TESTS PASSED (6/6)!');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
