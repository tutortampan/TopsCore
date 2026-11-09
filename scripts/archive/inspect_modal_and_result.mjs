import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 450, height: 950 } });

  const pageDash = await context.newPage();
  await pageDash.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: '8d4dc134-c84d-488d-a5b8-5fe69892d980',
      student_name: 'Mr. Suke Ajai',
      gender: 'male',
      institution_id: 'd8c1c5c2-677a-4467-9c98-1fffa5bcce0a',
      institution_name: 'Cake English Course',
      program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
      program_name: 'Camp',
      batch_id: '3b697c66-da5d-4a68-b823-ba3d06353852',
      batch_name: '133',
      level_id: '51589e1a-d96e-496e-92a3-d9d350483555',
      level_number: 3,
      level_name: '3rd Level'
    }));
  });

  await pageDash.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'networkidle' });
  await pageDash.waitForTimeout(3000);

  // Click on the class bar
  const classBar = await pageDash.locator('#dashboard-classes-bar');
  if (await classBar.count() > 0) {
    console.log('Clicking dashboard-classes-bar...');
    await classBar.click();
    await pageDash.waitForTimeout(1000);

    const openLevelsBtn = await pageDash.locator('#btn-open-class-levels');
    if (await openLevelsBtn.count() > 0) {
      console.log('Clicking btn-open-class-levels...');
      await openLevelsBtn.click();
      await pageDash.waitForTimeout(3000);
    }
  }

  const rows = await pageDash.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.asm-modal-row'));
    return list.map(el => {
      const title = el.querySelector('.asm-modal-info > div:first-child')?.textContent?.trim();
      const meta = el.querySelector('.asm-modal-meta-group')?.textContent?.trim();
      const actions = el.querySelector('.asm-modal-actions')?.textContent?.trim();
      return { title, meta, actions };
    });
  });

  console.log('Total modal rows displayed:', rows.length);
  console.log('First 6 rows in modal:', JSON.stringify(rows.slice(0, 6), null, 2));

  const anyWritten = rows.filter(r => r.meta && r.meta.includes('Written Test'));
  const anyZeroMin = rows.filter(r => r.meta && r.meta.includes('0 min'));
  const anyLocked = rows.filter(r => r.actions && r.actions.includes('🔒 Locked'));

  console.log('Any Written Test?', anyWritten.length);
  console.log('Any 0 min?', anyZeroMin.length);
  console.log('Any Unattempted Locked shown?', anyLocked.length);

  await pageDash.screenshot({ path: 'scratch/dashboard_modal_verified.png' });
  await browser.close();
}

main().catch(console.error);
