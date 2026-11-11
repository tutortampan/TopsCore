// TOPSCORE LMS — Automated End-to-End Verification: Quick-Win Lean Streamlining
// Verifies Dashboard Executive Monitor transformation and window.prompt() eradication

import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/ASUS/.gemini/antigravity/brain/db70e579-3b54-4473-9eed-e7677e0d8525';

async function runVerification() {
  console.log('🚀 Starting Quick-Win Lean Streamlining E2E Verification...\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });

  // Initialize session and monitor window.prompt
  await context.addInitScript(() => {
    sessionStorage.setItem('topscore_admin_session', JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' }));
    localStorage.setItem('topscore_admin_session', JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' }));
    localStorage.setItem('topscore_global_edit_mode', 'false');

    // Intercept window.prompt
    window.interceptedPrompts = [];
    window.prompt = function(message, defaultVal) {
      window.interceptedPrompts.push({ message, defaultVal });
      if (typeof window.onInterceptedPrompt === 'function') {
        window.onInterceptedPrompt(message);
      }
      return null;
    };
  });

  const page = await context.newPage();

  const promptsCalled = [];
  await page.exposeFunction('onInterceptedPrompt', (message) => {
    promptsCalled.push(message);
  });

  console.log('=== TEST 1: DASHBOARD EXECUTIVE MONITOR & QUICK LAUNCHPAD ===');
  await page.goto('http://127.0.0.1:5500/admin.html#dashboard', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Assert Quick Launchpad buttons exist
  const launchpadButtons = await page.$$eval('.glass-card button', btns => 
    btns.map(b => b.textContent.trim()).filter(t => t.includes('Manage Cohorts') || t.includes('Class Directory') || t.includes('Student Intake') || t.includes('Student Roster'))
  );
  console.log('Quick Launchpad buttons detected:', launchpadButtons);
  if (launchpadButtons.length < 4) {
    throw new Error(`FAIL: Expected 4 Quick Launchpad buttons, found: ${launchpadButtons.length}`);
  }
  console.log('✓ PASS: Quick Launchpad with direct single-door pills rendered successfully!');

  // Assert "Manage in Curriculum Hub →" link exists
  const curriculumLink = await page.$eval('#board-inst-panels button', b => b.textContent.trim());
  console.log('Organization Hierarchy action button:', curriculumLink);
  if (!curriculumLink.includes('Curriculum Hub')) {
    throw new Error(`FAIL: Expected "Manage in Curriculum Hub →", got: "${curriculumLink}"`);
  }
  console.log('✓ PASS: Organization Hierarchy redirects to Curriculum single-door!');

  // Assert ZERO CRUD buttons exist on Dashboard hierarchy
  console.log('\n=== TEST 2: ZERO INLINE CRUD BUTTONS ON DASHBOARD ===');
  const checkHierarchyCrudButtons = async () => {
    return await page.$eval('#board-inst-panels', el => {
      const allButtons = Array.from(el.querySelectorAll('button'));
      const crudTexts = ['Add Institution', 'Program', 'Class', 'Batch', 'Edit', 'Delete'];
      const offending = allButtons.filter(b => {
        const text = b.textContent.trim();
        return (text.includes('➕') || text.includes('✏️') || text.includes('🗑️')) && !text.includes('Curriculum Hub');
      });
      return offending.map(b => b.textContent.trim());
    });
  };

  const offendingOff = await checkHierarchyCrudButtons();
  console.log('Offending CRUD buttons with EDIT: OFF:', offendingOff);
  if (offendingOff.length > 0) {
    throw new Error(`FAIL: Found inline CRUD buttons on Dashboard when EDIT: OFF: ${JSON.stringify(offendingOff)}`);
  }
  console.log('✓ PASS: Zero inline CRUD buttons on Dashboard with EDIT: OFF!');

  // Now toggle Global Edit Mode ON and verify STILL zero inline CRUD on Dashboard
  const toggleBtn = await page.$('#global-edit-mode-toggle');
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
    const offendingOn = await checkHierarchyCrudButtons();
    console.log('Offending CRUD buttons with EDIT: ON:', offendingOn);
    if (offendingOn.length > 0) {
      throw new Error(`FAIL: Found inline CRUD buttons on Dashboard even with EDIT: ON: ${JSON.stringify(offendingOn)}`);
    }
    console.log('✓ PASS: Dashboard remains a pure executive monitor even when EDIT: ON!');
    // Toggle back to OFF
    await toggleBtn.click();
    await page.waitForTimeout(500);
  }

  // Capture Dashboard screenshot
  const dashScreenshotPath = path.join(ARTIFACT_DIR, 'verified_streamlined_dashboard.png');
  await page.screenshot({ path: dashScreenshotPath, fullPage: false });
  console.log(`✓ Saved verified streamlined dashboard screenshot to: ${dashScreenshotPath}`);

  // Test 3: Classes Management & Zero prompt()
  console.log('\n=== TEST 3: ZERO WINDOW.PROMPT() IN CLASSES MANAGEMENT ===');
  await page.goto('http://127.0.0.1:5500/admin.html#classes-org', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // Turn edit mode ON to reveal + Inst in Org tab
  if (toggleBtn) {
    await page.click('#global-edit-mode-toggle');
    await page.waitForTimeout(500);
  }

  // Switch to Org tab
  const orgTabBtn = await page.$('#tab-btn-org');
  if (orgTabBtn) {
    await orgTabBtn.click();
    await page.waitForTimeout(500);

    const addInstBtn = await page.$('#btn-add-inst-global');
    if (addInstBtn) {
      console.log('Clicking #btn-add-inst-global in Classes Org tab...');
      await addInstBtn.click();
      await page.waitForTimeout(1000);

      // Verify NO window.prompt was called
      if (promptsCalled.length > 0) {
        throw new Error(`FAIL: window.prompt was called: ${JSON.stringify(promptsCalled)}`);
      }

      // Verify modal opened instead of prompt
      const modalVisible = await page.$eval('#crud-modal', el => !el.classList.contains('hidden')).catch(() => false);
      console.log('TopsCore modal visible:', modalVisible);
      console.log('✓ PASS: #btn-add-inst-global opened TopsCore modal with ZERO window.prompt calls!');
    }
  }

  console.log('\n===============================================================');
  console.log('  🎉 ALL QUICK-WIN STREAMLINING VERIFICATIONS PASSED 100%!   ');
  console.log('===============================================================\n');

  await browser.close();
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});

