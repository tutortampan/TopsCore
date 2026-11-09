import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\30416560-f6e5-4275-91c0-9f8f8014feb0';
const BASE_URL = 'http://127.0.0.1:5500';

async function capture() {
  console.log('Launching Edge for live E2E browser verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Admin Class Hub Screen
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await adminContext.addInitScript(() => {
    const session = JSON.stringify({
      admin_id: 'admin-super',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const adminPage = await adminContext.newPage();
  console.log('Navigating to Class Hub (3rd Vocabulary)...');
  await adminPage.goto(`${BASE_URL}/admin.html#class-hub`, { waitUntil: 'networkidle' });
  await adminPage.waitForTimeout(3000);

  const imgClassHub = path.join(ARTIFACTS_DIR, 'e2e_class_hub_verified.png');
  await adminPage.screenshot({ path: imgClassHub, fullPage: false });
  console.log(`✓ Class Hub screenshot saved: ${imgClassHub}`);

  // 2. Student Dashboard Screen (Level 3 - Pasya)
  const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await studentContext.addInitScript(() => {
    const session = JSON.stringify({
      student_id: '66666666-6666-6666-6666-666666666666',
      student_name: 'Pasya',
      gender: 'male',
      institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
      institution_name: 'CEC',
      program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
      program_name: 'Camp',
      level_id: '50e2a220-4ff6-4d22-bf2b-31d75f28ce64',
      level_number: 3,
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_session', session);
    localStorage.setItem('topscore_session', session);
  });

  const studentPage = await studentContext.newPage();
  console.log('Navigating to Student Dashboard (Pasya - Level 3)...');
  await studentPage.goto(`${BASE_URL}/dashboard.html`, { waitUntil: 'networkidle' });
  await studentPage.waitForTimeout(3000);

  const imgDashboard = path.join(ARTIFACTS_DIR, 'e2e_student_dashboard_verified.png');
  await studentPage.screenshot({ path: imgDashboard, fullPage: false });
  console.log(`✓ Student Dashboard screenshot saved: ${imgDashboard}`);

  await browser.close();
  console.log('E2E verification completed successfully.');
}

capture().catch(err => {
  console.error('E2E capture error:', err);
  process.exit(1);
});
