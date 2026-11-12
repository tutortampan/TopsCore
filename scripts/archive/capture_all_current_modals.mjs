import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  console.log('Capturing all current system modals for /plan analysis...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // ==========================================
  // PART 1: STUDENT SCREENS (MOBILE 390 x 844)
  // ==========================================
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const pageMobile = await contextMobile.newPage();

  await pageMobile.addInitScript(() => {
    const session = {
      student_id: 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e',
      student_name: 'Aditya',
      program_id: 'd9b3e15b-9b4e-4b47-b248-6d8175e11470',
      institution_id: 'e6988891-b3b3-4f9e-b143-df9cbb87841c'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    localStorage.setItem('topscore_session', JSON.stringify(session));
  });

  // 1. test.html: Matrix Popup & Pre-Exam Focus Modal
  await pageMobile.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1000);

  // Capture Pre-Exam Modal
  const focusModal = pageMobile.locator('#pre-exam-focus-modal');
  if (await focusModal.count() > 0 && await focusModal.isVisible()) {
    await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_pre_exam_mobile.png') });
    console.log('✔ Captured #pre-exam-focus-modal');
    await pageMobile.locator('#btn-enter-fullscreen-start').click();
    await pageMobile.waitForTimeout(500);
  }

  // Capture Matrix Popup
  await pageMobile.evaluate(() => {
    window.toggleMatrixPopup(true);
  });
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_matrix_mobile.png') });
  console.log('✔ Captured #matrix-popup');

  // 2. dashboard.html: Class Selector, Component Selector, Profile, Flashcard, Gender Setup
  await pageMobile.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1200);

  // A. Class Selector Modal
  await pageMobile.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const m = document.getElementById('classes-selector-modal');
    if (m) m.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_class_selector_mobile.png') });
  console.log('✔ Captured #classes-selector-modal');

  // B. Component Selector Modal
  await pageMobile.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const m = document.getElementById('component-selector-modal');
    if (m) m.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_component_selector_mobile.png') });
  console.log('✔ Captured #component-selector-modal');

  // C. Gender Setup Modal (Mojibake bug)
  await pageMobile.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const m = document.getElementById('gender-setup-modal');
    if (m) m.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_gender_setup_mobile.png') });
  console.log('✔ Captured #gender-setup-modal');

  // D. Profile Modal
  await pageMobile.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const m = document.getElementById('profile-modal');
    if (m) m.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_profile_mobile.png') });
  console.log('✔ Captured #profile-modal');

  // E. Flashcard Modal
  await pageMobile.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const m = document.getElementById('flashcard-modal');
    if (m) m.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_flashcard_mobile.png') });
  console.log('✔ Captured #flashcard-modal');

  // 3. result.html: Answers Breakdown Modal
  await pageMobile.goto('http://127.0.0.1:5500/result.html', { waitUntil: 'domcontentloaded' });
  await pageMobile.waitForTimeout(500);
  await pageMobile.evaluate(() => {
    const l = document.getElementById('result-loading');
    if (l) l.style.display = 'none';
    const a = document.getElementById('answers-section');
    if (a) a.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(300);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_answers_breakdown_mobile.png') });
  console.log('✔ Captured #answers-section');

  await pageMobile.close();
  await contextMobile.close();

  // ==========================================
  // PART 2: ADMIN SCREENS (DESKTOP 1440 x 900)
  // ==========================================
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageDesktop = await contextDesktop.newPage();

  await pageDesktop.addInitScript(() => {
    const adminSession = {
      user: { id: 'admin-1', role: 'admin', email: 'admin@topscore.id' },
      access_token: 'fake-token'
    };
    sessionStorage.setItem('topscore_admin_session', JSON.stringify(adminSession));
    localStorage.setItem('topscore_admin_session', JSON.stringify(adminSession));
  });

  await pageDesktop.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await pageDesktop.waitForTimeout(1500);

  // A. Admin Delete Modal
  await pageDesktop.evaluate(() => {
    document.querySelector('.loading-overlay')?.remove();
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const d = document.getElementById('delete-modal');
    if (d) d.classList.remove('hidden');
  });
  await pageDesktop.waitForTimeout(300);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_admin_delete_desktop.png') });
  console.log('✔ Captured Admin #delete-modal');

  // B. Admin CRUD Modal
  await pageDesktop.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const c = document.getElementById('crud-modal');
    if (c) c.classList.remove('hidden');
  });
  await pageDesktop.waitForTimeout(300);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_admin_crud_desktop.png') });
  console.log('✔ Captured Admin #crud-modal');

  // C. Admin Duplicate Students Modal
  await pageDesktop.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const ds = document.getElementById('duplicate-students-modal');
    if (ds) ds.classList.remove('hidden');
  });
  await pageDesktop.waitForTimeout(300);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_admin_duplicate_students_desktop.png') });
  console.log('✔ Captured Admin #duplicate-students-modal');

  // D. Admin Roster Modal
  await pageDesktop.evaluate(() => {
    document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    const r = document.getElementById('roster-modal');
    if (r) r.classList.remove('hidden');
  });
  await pageDesktop.waitForTimeout(300);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_before_admin_roster_desktop.png') });
  console.log('✔ Captured Admin #roster-modal');

  await pageDesktop.close();
  await contextDesktop.close();
  await browser.close();

  console.log('All modal screenshots captured successfully!');
}

main().catch(console.error);
