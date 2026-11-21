import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('======================================================================');
  console.log('🖥️ PLAYWRIGHT E2E UI VERIFICATION: ALUMNI STUDENT ASIK (BATCH 123)');
  console.log('======================================================================\n');

  const screenshotBuffers = [];
  const outDir = path.resolve('tests/artifacts/e2e_asik_alumni');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 420, height: 850 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 TopsCoreE2E'
  });
  await context.clearCookies();

  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // 1. Navigate to Student Gate
    console.log('Navigating to Student Gate (http://localhost:5500/index.html)...');
    await page.goto('http://localhost:5500/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Step 1: Select Institution CEC
    console.log('Step 1: Selecting Institution CEC...');
    await page.waitForSelector('#list-institution .opt-card[data-id="f51d4c2c-7c24-42ef-8d8f-b0f3e524a447"]', { timeout: 15000 });
    await page.click('#list-institution .opt-card[data-id="f51d4c2c-7c24-42ef-8d8f-b0f3e524a447"]');
    await page.waitForTimeout(600);

    // If Program is not auto-selected, click Camp; otherwise proceed to Batch
    console.log('Waiting for Batch section to unlock (Camp program auto-selects)...');
    try {
      await page.waitForSelector('#sec-batch.unlocked', { timeout: 3000 });
    } catch (_) {
      const campBtn = page.locator('#list-program .opt-card[data-id="11deb53c-434a-44b0-83ca-1cc9b239cab3"]');
      if (await campBtn.isVisible()) {
        await campBtn.click();
      }
      await page.waitForSelector('#sec-batch.unlocked', { timeout: 15000 });
    }

    // Step 3: Select Batch 123
    console.log('Step 3: Selecting Batch 123...');
    await page.waitForSelector('#list-batch .opt-card[data-id="ae6b427e-767a-447b-ba55-e83b58986ae1"]', { timeout: 15000 });
    await page.click('#list-batch .opt-card[data-id="ae6b427e-767a-447b-ba55-e83b58986ae1"]');
    await page.waitForTimeout(600);

    // Step 4: Select Student Asik
    console.log('Step 4: Selecting Student Asik...');
    await page.waitForSelector('#sec-student.unlocked', { timeout: 15000 });
    await page.waitForSelector('#list-student .opt-card[data-id="0694c6f5-076c-43d1-99ee-0a8800975bcb"]', { timeout: 15000 });
    await page.click('#list-student .opt-card[data-id="0694c6f5-076c-43d1-99ee-0a8800975bcb"]');
    await page.waitForTimeout(600);

    screenshotBuffers.push({
      name: '01_student_gate_asik_selected.png',
      buf: await page.screenshot({ fullPage: true })
    });

    // Step 5: PIN Entry
    console.log('Step 5: Entering PIN 1234...');
    await page.waitForSelector('#sec-pin.unlocked', { timeout: 10000 });
    await page.evaluate(() => {
      const inputs = document.querySelectorAll('.pin-digit');
      ['1','2','3','4'].forEach((d, i) => {
        if (inputs[i]) {
          inputs[i].value = d;
          inputs[i].classList.add('filled');
          inputs[i].dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
    await page.waitForTimeout(400);

    screenshotBuffers.push({
      name: '02_pin_entered.png',
      buf: await page.screenshot({ fullPage: true })
    });

    // Step 6: Click Login
    console.log('Step 6: Clicking Sign In (#login-btn)...');
    await page.click('#login-btn');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard.html*', { timeout: 15000 });
    console.log('✅ Successfully arrived at dashboard.html!');

    await page.waitForTimeout(2500);

    // Buffer Dashboard Hero screenshot
    screenshotBuffers.push({
      name: '03_alumni_dashboard_hero.png',
      buf: await page.screenshot({ fullPage: true })
    });

    // Check Alumni header metadata
    const metaSentence = await page.locator('#prof-meta-sentence, .student-meta-sentence, #meta-program').first().textContent().catch(() => '');
    console.log('Dashboard Meta Sentence:', metaSentence?.trim());

    // Check Class list
    const classCards = await page.locator('.class-card, .subject-card, .class-tile').all();
    console.log(`Visible Class Cards count: ${classCards.length}`);

    // Scroll to check classes
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(800);
    screenshotBuffers.push({
      name: '04_alumni_dashboard_classes.png',
      buf: await page.screenshot({ fullPage: true })
    });

    // Scroll to check batch standings
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(800);
    screenshotBuffers.push({
      name: '05_alumni_dashboard_standings.png',
      buf: await page.screenshot({ fullPage: true })
    });

    console.log('🎉 All Playwright UI steps completed successfully!');
  } catch (err) {
    console.error('Playwright UI Verification Error:', err);
    screenshotBuffers.push({
      name: 'ERROR_playwright_failure.png',
      buf: await page.screenshot({ fullPage: true }).catch(() => null)
    });
  } finally {
    await browser.close();
  }

  // Flush buffered screenshots to disk
  console.log(`Writing ${screenshotBuffers.length} buffered screenshots to ${outDir}...`);
  for (const s of screenshotBuffers) {
    if (s.buf) {
      fs.writeFileSync(path.join(outDir, s.name), s.buf);
      console.log(`   📸 Saved ${s.name}`);
    }
  }

  if (consoleErrors.length > 0) {
    console.log('\n⚠️ Console errors detected:');
    consoleErrors.forEach(e => console.log('   • ' + e));
  } else {
    console.log('\n✅ 0 console errors detected during alumni UI session.');
  }
}

main().catch(console.error);
