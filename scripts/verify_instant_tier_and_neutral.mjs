import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
  console.log('Testing Instant Pre-Paint Tier Hydration and Neutral Fallback...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // Test 1: Returning student with cached tier (Queen)
  console.log('\n[Test 1] Returning student (Queen) with cached tier in localStorage...');
  const ctx1 = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page1 = await ctx1.newPage();

  const queenId = 'b0fce8b7-37c4-41c0-93b9-f3bab8142c83';
  await page1.addInitScript(({ qId }) => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: qId,
      student_name: 'Miss Isnantika Salsabila',
      name: 'Miss Isnantika Salsabila',
      batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
      level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
      level_name: '2nd Level',
      level_number: 2
    }));
    // Pre-seed cached tier
    localStorage.setItem('topscore_tier_' + qId, JSON.stringify({
      color: '#95ff00',
      rgb: '149, 255, 0',
      grade: 'B'
    }));
  }, { qId: queenId });

  await page1.goto('http://localhost:5500/dashboard.html', { waitUntil: 'domcontentloaded' });

  // Check documentElement CSS variable immediately at domcontentloaded (pre-paint)
  const prePaintColor = await page1.evaluate(() => {
    return document.documentElement.style.getPropertyValue('--tier-color');
  });
  console.log('Pre-paint --tier-color on <html>:', prePaintColor);
  if (prePaintColor !== '#95ff00') {
    throw new Error(`Expected #95ff00 at pre-paint, got ${prePaintColor}`);
  }
  console.log('✓ PASS: Queen immediately receives #95ff00 without fallback flash!');

  // Test 2: Cold start / new student without cached tier
  console.log('\n[Test 2] Cold start / new student without cached tier...');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page2 = await ctx2.newPage();

  const newId = '00000000-0000-0000-0000-000000000001';
  await page2.addInitScript(({ nId }) => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: nId,
      student_name: 'New Student',
      name: 'New Student',
      batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
      level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
      level_name: '2nd Level',
      level_number: 2
    }));
  }, { nId: newId });

  await page2.goto('http://localhost:5500/dashboard.html', { waitUntil: 'domcontentloaded' });

  const fallbackColor = await page2.evaluate(() => {
    return getComputedStyle(document.documentElement).getPropertyValue('--tier-color').trim();
  });
  console.log('Cold start fallback --tier-color:', fallbackColor);
  if (fallbackColor.includes('255, 45, 135') || fallbackColor.includes('#ff2d87')) {
    throw new Error(`Pink flash detected on cold start: ${fallbackColor}`);
  }
  console.log('✓ PASS: Cold start falls back to neutral slate/gray, zero pink flash!');

  // Capture screenshot of loaded dashboard
  await page1.waitForTimeout(2000);
  const imgPath = '.mobile_previews/queen_instant_tier_verified.png';
  await page1.screenshot({ path: imgPath });
  console.log('✓ Saved verified screenshot:', imgPath);

  await browser.close();
  console.log('\n🎉 ALL INSTANT PRE-PAINT TIER TESTS PASSED 100%!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
