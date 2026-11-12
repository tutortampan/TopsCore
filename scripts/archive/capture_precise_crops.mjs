import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2 // 2x Retina for crystal sharpness
  });
  const page = await context.newPage();

  // Helper for admin auth session
  await page.addInitScript(() => {
    const s = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', s);
    localStorage.setItem('topscore_admin_session', s);
    localStorage.setItem('topscore_selected_class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2');
    localStorage.setItem('topscore_selected_class_name', 'Camp 2nd Vocabulary');
  });

  console.log('📸 1. Capturing Student Gate: BEFORE vs AFTER...');
  // First, BEFORE Student Gate: Pink/Green step badges
  await page.goto('http://localhost:5500/index.html');
  await page.waitForLoadState('networkidle');

  // Fill in 4 steps so all step pills and cards are populated
  const firstInst = page.locator('#list-institution .opt-card').first();
  if (await firstInst.isVisible().catch(() => false)) await firstInst.click();
  await page.waitForTimeout(300);
  const firstProg = page.locator('#list-program .opt-card').first();
  if (await firstProg.isVisible().catch(() => false)) await firstProg.click();
  await page.waitForTimeout(300);
  const firstBatch = page.locator('#list-batch .opt-card').first();
  if (await firstBatch.isVisible().catch(() => false)) await firstBatch.click();
  await page.waitForTimeout(300);
  const firstName = page.locator('#list-name .opt-card').first();
  if (await firstName.isVisible().catch(() => false)) await firstName.click();
  await page.waitForTimeout(400);

  // Take tight crop of the 4-step summary cards
  const gateSummary = page.locator('#auth-steps-summary');
  if (await gateSummary.isVisible().catch(() => false)) {
    // Current state (AFTER our tactical blue fix)
    await gateSummary.screenshot({ path: path.join(artifactDir, 'crop_student_gate_after_blue.png') });
    console.log('✔ crop_student_gate_after_blue.png captured');

    // Simulate BEFORE state (Pink step badge & pink border)
    await page.evaluate(() => {
      const badges = document.querySelectorAll('.auth-step-circle');
      badges.forEach(b => {
        b.style.background = 'rgba(255, 45, 135, 0.15)';
        b.style.color = '#ff2d87';
        b.style.borderColor = 'rgba(255, 45, 135, 0.4)';
      });
      const cards = document.querySelectorAll('.auth-step-card');
      cards.forEach(c => {
        c.style.borderColor = 'rgba(255, 45, 135, 0.3)';
      });
    });
    await gateSummary.screenshot({ path: path.join(artifactDir, 'crop_student_gate_before_pink.png') });
    console.log('✔ crop_student_gate_before_pink.png captured');
  }

  // 2. Student Roster: [🚀 NEXT] Button Close-up (BEFORE vs AFTER)
  console.log('📸 2. Capturing Roster [🚀 NEXT] Button Close-up...');
  await page.goto('http://localhost:5500/admin.html#students', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const nextBtn = page.locator('#btn-promote-all-eligible');
  if (await nextBtn.isVisible().catch(() => false)) {
    // Current (BEFORE) state: Green #00c000
    await nextBtn.screenshot({ path: path.join(artifactDir, 'crop_next_btn_before_green.png') });
    console.log('✔ crop_next_btn_before_green.png captured');

    // Simulated (AFTER) state: Tactical Sky Blue #0284c7 with #38bdf8 border
    await page.evaluate(() => {
      const btn = document.getElementById('btn-promote-all-eligible');
      if (btn) {
        btn.style.background = '#0284c7';
        btn.style.borderColor = '#38bdf8';
        btn.style.color = '#ffffff';
        btn.style.boxShadow = '0 0 12px rgba(56, 189, 248, 0.4)';
      }
    });
    await nextBtn.screenshot({ path: path.join(artifactDir, 'crop_next_btn_after_blue.png') });
    console.log('✔ crop_next_btn_after_blue.png captured');
  }

  // 3. Active Students Topbar Tab Close-up (BEFORE vs AFTER)
  console.log('📸 3. Capturing Active Students Tab Close-up...');
  const activeTab = page.locator('.topbar-tab-card[data-tab-id="active"]');
  if (await activeTab.isVisible().catch(() => false)) {
    // Reset to before (Green text)
    await page.evaluate(() => {
      const t = document.querySelector('.topbar-tab-card[data-tab-id="active"]');
      if (t) {
        const span = t.querySelector('span:last-child') || t.querySelector('strong');
        if (span) span.style.color = '#00c000ff';
      }
    });
    await activeTab.screenshot({ path: path.join(artifactDir, 'crop_active_tab_before_green.png') });
    console.log('✔ crop_active_tab_before_green.png captured');

    // Proposed (AFTER): Tactical Cyan #38bdf8
    await page.evaluate(() => {
      const t = document.querySelector('.topbar-tab-card[data-tab-id="active"]');
      if (t) {
        const span = t.querySelector('span:last-child') || t.querySelector('strong');
        if (span) span.style.color = '#38bdf8';
      }
    });
    await activeTab.screenshot({ path: path.join(artifactDir, 'crop_active_tab_after_cyan.png') });
    console.log('✔ crop_active_tab_after_cyan.png captured');
  }

  // 4. Modules Hub: [● ALL ENGINES ACTIVE] Close-up
  console.log('📸 4. Capturing Modules Hub Badge Close-up...');
  await page.goto('http://localhost:5500/admin.html#modules', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const engineBadge = page.locator('.workspace-lower-panel .badge:has-text("ALL ENGINES ACTIVE")').first();
  if (await engineBadge.isVisible().catch(() => false)) {
    // Current (BEFORE): Green #00c000
    await engineBadge.screenshot({ path: path.join(artifactDir, 'crop_engine_badge_before_green.png') });
    console.log('✔ crop_engine_badge_before_green.png captured');

    // Proposed (AFTER): Tactical Cyan #38bdf8
    await page.evaluate(() => {
      const b = document.querySelector('.workspace-lower-panel .badge:has-text("ALL ENGINES ACTIVE")') ||
                Array.from(document.querySelectorAll('.badge')).find(el => el.textContent.includes('ALL ENGINES ACTIVE'));
      if (b) {
        b.style.background = 'rgba(56, 189, 248, 0.12)';
        b.style.color = '#38bdf8';
        b.style.borderColor = 'rgba(56, 189, 248, 0.3)';
        b.style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.25)';
      }
    });
    await engineBadge.screenshot({ path: path.join(artifactDir, 'crop_engine_badge_after_cyan.png') });
    console.log('✔ crop_engine_badge_after_cyan.png captured');
  }

  // 5. General System Status Pill: ACTIVE (BEFORE vs AFTER)
  console.log('📸 5. Generating Unified Side-by-Side Comparison Boards...');
  // We can render an HTML comparison page that assembles all 5 side-by-side boards!
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
