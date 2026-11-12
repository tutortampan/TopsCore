import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Navigate to admin class-hub test-sessions
  await page.goto('http://localhost:5500/admin.html?status=active#class-hub?tab=test-sessions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Find all buttons with 'TIME' or class 'btn-wireframe-edit-time'
  const timeBtns = await page.$$('.btn-wireframe-edit-time');
  console.log(`Found ${timeBtns.length} .btn-wireframe-edit-time buttons`);

  for (let i = 0; i < timeBtns.length; i++) {
    const btn = timeBtns[i];
    const info = await btn.evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        outerHTML: el.outerHTML,
        border: cs.border,
        borderColor: cs.borderColor,
        borderWidth: cs.borderWidth,
        borderStyle: cs.borderStyle,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        boxShadow: cs.boxShadow,
        width: cs.width,
        height: cs.height,
        parentDisplay: window.getComputedStyle(el.parentElement).display,
        parentWidth: window.getComputedStyle(el.parentElement).width
      };
    });
    console.log(`Button #${i}:`, JSON.stringify(info, null, 2));
  }

  // Also take a screenshot of the card if found
  const card = await page.$('.theme-exam-card');
  if (card) {
    await card.screenshot({ path: 'tests/artifacts/theme_exam_card_live.png' });
    console.log('Saved screenshot to tests/artifacts/theme_exam_card_live.png');
  }

  await browser.close();
}

check().catch(console.error);
