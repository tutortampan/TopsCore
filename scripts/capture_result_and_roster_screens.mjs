import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\752a8445-7ee5-4b8f-9864-416ebcb6bfd2';
const BASE_URL = 'http://127.0.0.1:5500';
const ATTEMPT_ID = 'd66e0f95-0433-46a4-824a-1daea06a4688';

async function capture() {
  console.log('Launching browser to capture screenshots...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }));
  
  // 1. Student View on Mobile/Tablet Screen (e.g. 430 x 932 iPhone 14 Pro Max / 540 x 960 viewport)
  const studentContext = await browser.newContext({ viewport: { width: 480, height: 920 } });
  const studentPage = await studentContext.newPage();
  
  console.log(`Navigating to Result Page (Student View): ${BASE_URL}/result.html?attempt_id=${ATTEMPT_ID}`);
  await studentPage.goto(`${BASE_URL}/result.html?attempt_id=${ATTEMPT_ID}`, { waitUntil: 'networkidle' });
  await studentPage.waitForTimeout(1500); // Wait for cascade reveal and dynamic aura
  
  const studentImgPath = path.join(ARTIFACTS_DIR, 'result_student_view.png');
  await studentPage.screenshot({ path: studentImgPath, fullPage: false });
  console.log(`✓ Student View screenshot saved to: ${studentImgPath}`);
  await studentContext.close();

  // 2. Tutor View on Mobile/Desktop
  const tutorContext = await browser.newContext({ viewport: { width: 480, height: 920 } });
  await tutorContext.addInitScript(() => {
    sessionStorage.setItem('topscore_admin_auth', 'true');
    sessionStorage.setItem('topscore_admin_user', JSON.stringify({ role: 'superadmin', username: 'Super Admin' }));
  });
  const tutorPage = await tutorContext.newPage();
  
  console.log(`Navigating to Result Page (Tutor View): ${BASE_URL}/result.html?attempt_id=${ATTEMPT_ID}&from=admin`);
  await tutorPage.goto(`${BASE_URL}/result.html?attempt_id=${ATTEMPT_ID}&from=admin`, { waitUntil: 'networkidle' });
  await tutorPage.waitForTimeout(1500);
  
  const tutorImgPath = path.join(ARTIFACTS_DIR, 'result_tutor_view.png');
  await tutorPage.screenshot({ path: tutorImgPath, fullPage: false });
  console.log(`✓ Tutor View screenshot saved to: ${tutorImgPath}`);
  await tutorContext.close();

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch(console.error);
