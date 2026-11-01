import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createStaticServer(port = 3499) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/dashboard.html';
    
    let filePath = path.join(__dirname, reqUrl);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found: ' + reqUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function run() {
  const PORT = 3499;
  const server = await createStaticServer(PORT);
  console.log(`Local test server running at http://127.0.0.1:${PORT}`);

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  let hasErrors = false;

  try {
    // 1. Test Grading Engine (Star Symbol & Glow Hierarchy)
    console.log('\n--- 1. Testing js/grading.js ---');
    const { calculateGrade, getGradeSymbol, GRADE_PALETTE } = await import('./js/grading.js');
    
    // Boundary checks for official scale tiers
    console.log('\n--- Exhaustive Boundary Verification ---');
    const boundaries = [
      { score: 100, expected: '★', symbol: '★' },
      { score: 99, expected: 'A', symbol: 'A' },
      { score: 90, expected: 'A', symbol: 'A' },
      { score: 89, expected: 'B', symbol: 'B' },
      { score: 80, expected: 'B', symbol: 'B' },
      { score: 79, expected: 'C', symbol: 'C' },
      { score: 60, expected: 'C', symbol: 'C' },
      { score: 59, expected: 'D', symbol: 'D' },
      { score: 30, expected: 'D', symbol: 'D' },
      { score: 29, expected: 'E', symbol: 'E' },
      { score: 0, expected: 'E', symbol: 'E' }
    ];

    for (const b of boundaries) {
      const g = calculateGrade(b.score);
      const sym = getGradeSymbol(g, b.score);
      console.log(`Score ${b.score}% -> Grade: ${g} (Symbol: ${sym}) | Expected: ${b.expected} (${b.symbol})`);
      if (g !== b.expected) throw new Error(`Boundary test failed for ${b.score}%: got ${g}, expected ${b.expected}`);
      if (sym !== b.symbol) throw new Error(`Boundary symbol failed for ${b.score}%: got ${sym}, expected ${b.symbol}`);
    }

    // 2. Test Mobile Viewport Zero-Scroll & Layout
    console.log('\n--- 2. Testing Mobile Viewports (390x844 & 360x640) ---');
    const viewports = [
      { name: 'iPhone 14 (390x844)', width: 390, height: 844 },
      { name: 'Android Small (360x640)', width: 360, height: 640 }
    ];

    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      page.on('console', msg => console.log(`[PAGE LOG ${vp.name}]:`, msg.text()));
      page.on('pageerror', err => console.log(`[PAGE ERROR ${vp.name}]:`, err.message));
      
      // Mock Supabase REST routes for fast deterministic testing
      await page.route('**', route => {
        const url = route.request().url();
        if (url.includes('/rest/v1/')) {
          console.log('[INTERCEPTED SUPABASE]:', url);
          if (url.includes('/rest/v1/students')) {
            if (url.includes('batch_id=')) {
              return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                  {
                    id: 'test-king-student-1',
                    name: 'Kevin Pratama',
                    gender: 'male',
                    photo_url: null,
                    is_active: true,
                    birth_date: '2005-01-01',
                    education: 'High School',
                    batch_id: 'batch-131'
                  },
                  {
                    id: 'test-student-2',
                    name: 'Sarah Wijaya',
                    gender: 'female',
                    photo_url: null,
                    is_active: true,
                    birth_date: '2005-02-02',
                    education: 'High School',
                    batch_id: 'batch-131'
                  },
                  {
                    id: 'test-student-3',
                    name: 'Budi Santoso',
                    gender: 'male',
                    photo_url: null,
                    is_active: true,
                    birth_date: '2005-03-03',
                    education: 'High School',
                    batch_id: 'batch-131'
                  }
                ])
              });
            }
            if (url.includes('id=eq.')) {
              return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  id: 'test-king-student-1',
                  name: 'Kevin Pratama',
                  gender: 'male',
                  photo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                  is_active: true,
                  birth_date: '2005-01-01',
                  education: 'High School',
                  batch_id: 'batch-131'
                })
              });
            }
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([])
            });
          }
          if (url.includes('/rest/v1/attempts')) {
            if (url.includes('student_id=eq.')) {
              return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                  {
                    id: 'att-1',
                    student_id: 'test-king-student-1',
                    assessment_id: 'ass-1',
                    percentage: 100,
                    is_best_score: true,
                    status: 'submitted',
                    submitted_at: '2026-10-18T10:00:00Z',
                    assessments: {
                      title: 'Storytelling Speaking',
                      assessment_type: 'Point & Speak!',
                      classes: { name: 'General English' }
                    }
                  }
                ])
              });
            }
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                {
                  id: 'att-1',
                  student_id: 'test-king-student-1',
                  assessment_id: 'ass-1',
                  percentage: 100,
                  is_best_score: true,
                  status: 'submitted',
                  submitted_at: '2026-10-18T10:00:00Z'
                },
                {
                  id: 'att-2',
                  student_id: 'test-student-2',
                  assessment_id: 'ass-1',
                  percentage: 85,
                  is_best_score: true,
                  status: 'submitted',
                  submitted_at: '2026-10-18T10:05:00Z'
                },
                {
                  id: 'att-3',
                  student_id: 'test-student-3',
                  assessment_id: 'ass-1',
                  percentage: 60,
                  is_best_score: true,
                  status: 'submitted',
                  submitted_at: '2026-10-18T10:10:00Z'
                }
              ])
            });
          }
          if (url.includes('/rest/v1/classes')) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify([
                { id: 'cls-1', name: 'General English', level_id: 'lvl-3', levels: { level_number: 3 } }
              ])
            });
          }
          if (url.includes('/rest/v1/levels')) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ id: 'lvl-3', level_number: 3, name: '3rd Level' })
            });
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
        route.continue();
      });

      // Seed session and onboarding flags in localStorage before page scripts execute
      await page.addInitScript(() => {
        const studentId = 'test-king-student-1';
        sessionStorage.setItem('topscore_session', JSON.stringify({
          student_id: studentId,
          student_name: 'Kevin Pratama',
          gender: 'male',
          education: 'High School',
          birth_date: '2005-01-01',
          institution_id: 'inst-1',
          institution_name: 'CEC',
          program_id: 'prog-1',
          program_name: 'Camp',
          batch_id: 'batch-131',
          batch_name: '131',
          level_id: 'lvl-3',
          level_number: 3,
          level_name: '3rd Level'
        }));
        localStorage.setItem(`stu_photo_${studentId}`, 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        localStorage.setItem(`stu_bd_${studentId}`, 'true');
        localStorage.setItem(`topscore_photo_prompted_${studentId}`, 'true');
        localStorage.setItem(`topscore_gender_prompted_${studentId}`, 'true');
        localStorage.setItem(`topscore_birthday_prompted_${studentId}`, 'true');
        localStorage.setItem(`topscore_education_prompted_${studentId}`, 'true');
      });

      await page.goto(`http://127.0.0.1:${PORT}/dashboard.html`, { waitUntil: 'domcontentloaded' });
      
      // Wait for leaderboard or rank update (up to 10s)
      try {
        await page.waitForSelector('.leaderboard-row', { timeout: 4000 });
      } catch (_) {
        const contHtml = await page.locator('#batch-leaderboard-container').innerHTML();
        console.log(`[${vp.name}] CONTAINER HTML:`, contHtml);
      }
      await page.waitForTimeout(500);

      // Check avatar dimensions
      const avatarBox = await page.locator('#banner-avatar-container').boundingBox();
      console.log(`[${vp.name}] Avatar dimensions: ${Math.round(avatarBox.width)}x${Math.round(avatarBox.height)}px (Expected >= 84px)`);
      if (Math.round(avatarBox.width) < 84 || Math.round(avatarBox.height) < 84) {
        throw new Error(`Avatar size is ${avatarBox.width}x${avatarBox.height}, expected at least 84x84px`);
      }

      // Check crown element exists in DOM
      const crownEl = page.locator('#banner-avatar-crown');
      const crownCount = await crownEl.count();
      console.log(`[${vp.name}] Crown element exists: ${crownCount === 1}`);
      if (crownCount !== 1) throw new Error('Crown element #banner-avatar-crown missing!');

      // Check bottom locked banner
      const bannerBox = await page.locator('#bottom-ad-banner').boundingBox();
      console.log(`[${vp.name}] Bottom Ad Banner: height = ${Math.round(bannerBox.height)}px, y = ${Math.round(bannerBox.y)}px`);
      if (Math.round(bannerBox.height) !== 28) {
        throw new Error(`Bottom banner height is ${bannerBox.height}, expected 28px!`);
      }

      // Check zero-scroll on document
      const scrollInfo = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        return {
          windowHeight: window.innerHeight,
          docScrollHeight: doc.scrollHeight,
          bodyScrollHeight: body.scrollHeight,
          docClientHeight: doc.clientHeight,
          isZeroScroll: doc.scrollHeight <= window.innerHeight + 1
        };
      });
      console.log(`[${vp.name}] Zero-scroll check:`, scrollInfo);
      if (!scrollInfo.isZeroScroll) {
        throw new Error(`Outer document has scrolling! scrollHeight=${scrollInfo.docScrollHeight} vs innerHeight=${scrollInfo.windowHeight}`);
      }

      // Check Real-Time King Royal Title & Crown
      const welcText = await page.locator('#welcome-name').textContent();
      const crownVisible = await page.locator('#banner-avatar-crown').isVisible();
      console.log(`[${vp.name}] Royal Title Result: "${welcText}", Crown Visible: ${crownVisible}`);
      if (!welcText.includes('King') || !crownVisible) {
        throw new Error(`Expected "King Kevin Pratama" with crown visible, got: "${welcText}", crown visible: ${crownVisible}`);
      }

      // Check Star ⭐ on 100% Score
      const gradeText = await page.locator('#stat-overall-grade-value').textContent();
      console.log(`[${vp.name}] 100% Score Grade Display: "${gradeText}" (Expected: ⭐)`);
      if (gradeText !== '⭐') {
        throw new Error(`Expected ⭐ for 100% score, got "${gradeText}"`);
      }

      // Test Dock Tabs Toggle
      const btnStandings = page.locator('#btn-dock-standings');
      const btnCompleted = page.locator('#btn-dock-completed');
      const paneStandings = page.locator('#dock-pane-standings');
      const paneCompleted = page.locator('#dock-pane-completed');

      await btnCompleted.click();
      await page.waitForTimeout(200);
      const completedScreenPath = path.join(__dirname, `audit_screenshots/dashboard_completed_${vp.name.replace(/[^a-z0-9]/gi, '_')}.png`);
      await page.screenshot({ path: completedScreenPath });
      let isCompletedVisible = await paneCompleted.isVisible();
      let isStandingsHidden = !(await paneStandings.isVisible());
      console.log(`[${vp.name}] Tab switch to Completed: Completed Visible=${isCompletedVisible}, Standings Hidden=${isStandingsHidden}`);
      if (!isCompletedVisible || !isStandingsHidden) throw new Error('Tab toggle to Completed failed');

      await btnStandings.click();
      await page.waitForTimeout(200);
      let isStandingsVisible = await paneStandings.isVisible();
      let isCompletedHidden = !(await paneCompleted.isVisible());
      console.log(`[${vp.name}] Tab switch back to Standings: Standings Visible=${isStandingsVisible}, Completed Hidden=${isCompletedHidden}`);
      if (!isStandingsVisible || !isCompletedHidden) throw new Error('Tab toggle back to Standings failed');

      // Check Leaderboard Rows Content
      const rowsCount = await page.locator('.leaderboard-row').count();
      console.log(`[${vp.name}] Leaderboard rows rendered: ${rowsCount} (Expected: 3)`);
      if (rowsCount < 3) throw new Error(`Expected at least 3 rows in leaderboard, got ${rowsCount}`);

      // Capture screenshot for visual audit
      const screenPath = path.join(__dirname, `audit_screenshots/dashboard_enhanced_${vp.name.replace(/[^a-z0-9]/gi, '_')}.png`);
      fs.mkdirSync(path.dirname(screenPath), { recursive: true });
      await page.screenshot({ path: screenPath });
      console.log(`[${vp.name}] Visual screenshot saved to ${screenPath}`);

      await page.close();
    }

    console.log('\n✅ ALL VERIFICATION CHECKS PASSED PERFECTLY!');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    hasErrors = true;
  } finally {
    await browser.close();
    server.close();
  }

  if (hasErrors) process.exit(1);
}

run();
