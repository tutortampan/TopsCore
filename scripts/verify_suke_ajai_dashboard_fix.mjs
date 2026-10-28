import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 450, height: 950 } });
  const page = await context.newPage();

  // Set Suke Ajai session
  await page.addInitScript(() => {
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

  console.log('Navigating to http://127.0.0.1:5500/dashboard.html...');
  await page.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'networkidle' });

  await page.waitForTimeout(3000);

  // Check the class deck progress text
  const classProgressEl = await page.$('#classes-bar-progress-val');
  const classProgressText = classProgressEl ? await classProgressEl.textContent() : null;
  console.log('Class bar progress text:', classProgressText);

  // Check the next assignment hero text
  const nextAsmTitleEl = await page.$('.next-asm-title');
  const nextAsmTitleText = nextAsmTitleEl ? await nextAsmTitleEl.textContent() : null;
  console.log('Next assignment hero title:', nextAsmTitleText);

  // Check leaderboard standings
  const rows = await page.$$('.standings-row');
  console.log(`Leaderboard rows rendered: ${rows.length}`);

  for (let i = 0; i < Math.min(rows.length, 24); i++) {
    const row = rows[i];
    const rankEl = await row.$('.leaderboard-rank-badge');
    const nameEl = await row.$('.leaderboard-student-name');
    const ptsEl = await row.$('.th-point span');
    const subInfoEl = await row.$('.leaderboard-sub-info');
    const gradeEl = await row.$('.leaderboard-grade-chip');

    const rank = rankEl ? (await rankEl.textContent()).trim() : '';
    const name = nameEl ? (await nameEl.textContent()).trim() : '';
    const pts = ptsEl ? (await ptsEl.textContent()).trim() : '';
    const subInfo = subInfoEl ? (await subInfoEl.textContent()).trim() : '';
    const grade = gradeEl ? (await gradeEl.textContent()).trim() : '';

    if (name.includes('Suke') || name.includes('Risma') || name.includes('Pasya') || name.includes('Sofa') || i < 5) {
      console.log(`[Rank #${rank}] ${name.padEnd(25)} | PTS: ${pts.padStart(5)} | SUB: ${subInfo} | GRADE: ${grade}`);
    }
  }

  // Screenshot
  const screenshotPath = 'C:/Users/Top/.gemini/antigravity-ide/brain/226fb7ff-7acf-410b-9ac7-347ad3059cb1/suke_ajai_dashboard_verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

main().catch(console.error);
