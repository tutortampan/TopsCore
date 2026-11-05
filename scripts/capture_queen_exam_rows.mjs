import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  console.log('Capturing Queen dashboard Completed Tests with Exam Row Borders and Number Boxes...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // Set real student session for Queen Isnantika Salsabila
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'b0fce8b7-37c4-41c0-93b9-f3bab8142c83',
      student_name: 'Miss Isnantika Salsabila',
      name: 'Miss Isnantika Salsabila',
      gender: 'female',
      institution_name: 'CEC',
      program_name: 'Camp',
      batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
      batch_name: '134',
      level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
      level_name: '2nd Level',
      level_number: 2,
      has_photo: true,
      avatar_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>',
      photo_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>'
    }));
    sessionStorage.setItem('topscore_dock_tab', 'completed');
  });

  // Serve or access via file or local server
  const url = 'http://localhost:5500/dashboard.html';
  console.log('Navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(async () => {
    console.log('Localhost 5500 not running, using file:// url');
    const localPath = path.resolve(__dirname, '../dashboard.html');
    await page.goto(`file://${localPath}`, { waitUntil: 'networkidle' });
  });

  await page.waitForTimeout(3000);

  // Click completed tests button
  const completedBtn = await page.$('#btn-dock-completed');
  if (completedBtn) {
    await completedBtn.click();
    await page.waitForTimeout(1000);
  }

  // Ensure directory exists
  if (!fs.existsSync('.mobile_previews')) {
    fs.mkdirSync('.mobile_previews', { recursive: true });
  }

  const fullImg = '.mobile_previews/queen_completed_exam_rows.png';
  await page.screenshot({ path: fullImg, fullPage: false });
  console.log('Saved full screenshot to', fullImg);

  // Also crop the completed tests section
  const dock = await page.$('#bottom-dock-section');
  if (dock) {
    const cropImg = '.mobile_previews/completed_tests_exam_crop.png';
    await dock.screenshot({ path: cropImg });
    console.log('Saved dock crop to', cropImg);
  }

  await browser.close();
}

capture().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});

