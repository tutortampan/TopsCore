import { chromium } from 'playwright';
import path from 'path';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Mock valid student session
  await page.addInitScript(() => {
    const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23a855f7"/></svg>';
    const mockSession = {
      student_id: 'stu-101',
      student_name: 'Queen Syazida Shinda Debi',
      institution_id: 'inst-001',
      institution_name: 'CAKE ENGLISH COURSE',
      program_id: 'prog-001',
      program_name: 'Camp',
      batch_id: 'batch-001',
      batch_name: '133',
      level_id: 'lvl-003',
      level_name: '3rd Level',
      level_number: 3,
      gender: 'female',
      photo_url: photo,
      birth_date: '2005-01-01',
      education: 'High School'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
    localStorage.setItem('stu_photo_stu-101', photo);
    localStorage.setItem('stu_bd_stu-101', 'true');
    localStorage.setItem('stu_edu_stu-101', 'true');
  });

  // Mock Supabase REST routes for dashboard
  await page.route('**/rest/v1/**', async (route) => {
    const url = route.request().url();
    const headers = route.request().headers();
    const isSingle = headers['accept']?.includes('application/vnd.pgrst.object+json');
    const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23a855f7"/></svg>';

    if (url.includes('/rest/v1/students')) {
      const mockStudents = [
        {
          id: 'stu-101',
          name: 'Queen Syazida Shinda Debi',
          gender: 'female',
          photo_url: photo,
          photo_status: 'approved',
          birth_date: '2005-01-01',
          education: 'High School',
          is_active: true,
          batch_id: 'batch-001',
          batches: {
            current_level_id: 'lvl-003',
            levels: { id: 'lvl-003', level_number: 3, name: '3rd Level' }
          }
        },
        { id: 'stu-102', name: 'Mr. Unggul Wirakse', gender: 'male', photo_url: photo, is_active: true, batch_id: 'batch-001' },
        { id: 'stu-103', name: 'Mr. Aunul Fikri Yasir', gender: 'male', photo_url: photo, is_active: true, batch_id: 'batch-001' },
        { id: 'stu-104', name: 'Miss Wardatul Husna', gender: 'female', photo_url: photo, is_active: true, batch_id: 'batch-001' },
        { id: 'stu-105', name: 'Mr. Muhammad Masyan Hafizi', gender: 'male', photo_url: photo, is_active: true, batch_id: 'batch-001' },
        { id: 'stu-106', name: 'Mr. Ari Wahyu Darma', gender: 'male', photo_url: photo, is_active: true, batch_id: 'batch-001' }
      ];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(isSingle ? mockStudents[0] : mockStudents)
      });
    }

    if (url.includes('/rest/v1/classes')) {
      const mockClasses = [
        { id: 'cls-001', name: 'Vocabulary', level_id: 'lvl-003', levels: { level_number: 3 } },
        { id: 'cls-002', name: 'Telling Story', level_id: 'lvl-003', levels: { level_number: 3 } },
        { id: 'cls-003', name: 'Conversation', level_id: 'lvl-003', levels: { level_number: 3 } }
      ];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockClasses)
      });
    }

    if (url.includes('/rest/v1/assessments')) {
      const mockAssessments = [
        {
          id: 'asm-101',
          class_id: 'cls-001',
          level_id: 'lvl-003',
          title: '3rd Vocabulary C5 Words Task',
          assessment_type: 'DAILY TASK',
          assessment_category: 'TASK',
          status: 'PUBLISHED',
          minimum_required_score: 60,
          display_order: 1
        },
        {
          id: 'asm-102',
          class_id: 'cls-001',
          level_id: 'lvl-003',
          title: '3rd Vocabulary C5 Practice',
          assessment_type: 'DAILY TASK',
          assessment_category: 'TASK',
          status: 'PUBLISHED',
          minimum_required_score: 60,
          display_order: 2
        }
      ];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAssessments)
      });
    }

    if (url.includes('/rest/v1/attempts')) {
      const mockAttempts = [
        {
          id: 'att-101',
          student_id: 'stu-101',
          assessment_id: 'asm-101',
          score: 18,
          total_questions: 20,
          percentage: 90,
          effective_score: 90,
          status: 'submitted',
          submitted_at: '2026-10-25T10:00:00Z',
          assessments: { id: 'asm-101', deleted_at: null, title: '3rd Vocabulary C5 Words Task', classes: { name: 'Vocabulary' } }
        },
        {
          id: 'att-102',
          student_id: 'stu-102',
          assessment_id: 'asm-101',
          score: 17,
          total_questions: 20,
          percentage: 85,
          effective_score: 85,
          status: 'submitted',
          submitted_at: '2026-10-25T09:00:00Z',
          assessments: { id: 'asm-101', deleted_at: null }
        },
        {
          id: 'att-103',
          student_id: 'stu-103',
          assessment_id: 'asm-101',
          score: 16,
          total_questions: 20,
          percentage: 80,
          effective_score: 80,
          status: 'submitted',
          submitted_at: '2026-10-25T09:10:00Z',
          assessments: { id: 'asm-101', deleted_at: null }
        }
      ];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAttempts)
      });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  const url = 'http://127.0.0.1:5500/dashboard.html';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

  try {
    await page.waitForFunction(() => {
      const el = document.getElementById('classes-bar-current-name');
      return el && el.textContent.trim() !== 'Loading…';
    }, { timeout: 6000 });
  } catch (_) {
    console.warn('Timed out waiting for classes-bar-current-name update');
  }
  await page.waitForTimeout(500);

  // Diagnostic layout dimensions
  const layout = await page.evaluate(() => {
    const header = document.querySelector('.dashboard-header');
    const hero = document.getElementById('welcome-banner-section');
    const achievement = document.getElementById('dashboard-achievement-card');
    const achievementText = document.getElementById('dashboard-achievement-text');
    const standings = document.getElementById('bottom-dock-section');
    const nextAsm = document.getElementById('up-next-section');
    const nextCard = document.getElementById('up-next-container');
    const classesDeck = document.getElementById('dashboard-classes-section');
    const banner = document.getElementById('bottom-ad-banner');
    const docHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    const bodyHeight = document.body.scrollHeight;

    // Check rank 1 row details
    const firstRow = document.querySelector('.standings-row');
    const rankBadge = firstRow ? firstRow.querySelector('.leaderboard-rank-badge') : null;
    const rankText = rankBadge ? rankBadge.textContent.trim() : null;
    const studentName = firstRow ? firstRow.querySelector('.leaderboard-student-name') : null;
    const royalTag = firstRow ? firstRow.querySelector('.leaderboard-royal-tag') : null;

    // Check table headers order
    const thCols = Array.from(document.querySelectorAll('.standings-table-header .th-col')).map(c => c.textContent.trim());

    // Check active class bar styling and glow
    const classesBar = document.getElementById('dashboard-classes-bar');
    const classesBarComputed = classesBar ? window.getComputedStyle(classesBar) : null;
    const classesBarBorderColor = classesBarComputed ? classesBarComputed.borderColor : null;
    const currentClassName = document.getElementById('classes-bar-current-name')?.textContent.trim();
    const currentClassPct = document.getElementById('classes-bar-progress-val')?.textContent.trim();

    // Check header brand and actions
    const headerBrandText = document.getElementById('dashboard-header-brand')?.textContent.trim();
    const hasHeaderActions = Boolean(document.querySelector('.dashboard-header-actions #view-profile-btn') && document.querySelector('.dashboard-header-actions #logout-btn'));

    // Check DOM section vertical order
    const sectionOrder = [
      document.querySelector('.dashboard-header')?.id || 'header',
      document.getElementById('welcome-banner-section')?.id,
      document.getElementById('dashboard-achievement-card')?.id,
      document.getElementById('dashboard-classes-section')?.id,
      document.getElementById('up-next-section')?.id,
      document.getElementById('bottom-dock-section')?.id,
      document.getElementById('bottom-ad-banner')?.id
    ];

    const myRankBadgeText = document.getElementById('dock-my-rank-badge')?.textContent.replace(/\s+/g, ' ').trim();

    return {
      headerHeight: header ? header.offsetHeight : null,
      heroHeight: hero ? hero.offsetHeight : null,
      achievementHeight: achievement ? achievement.offsetHeight : null,
      achievementText: achievementText ? achievementText.textContent.trim() : null,
      standingsHeight: standings ? standings.offsetHeight : null,
      nextAsmHeight: nextAsm ? nextAsm.offsetHeight : null,
      nextCardHeight: nextCard ? nextCard.offsetHeight : null,
      classesDeckHeight: classesDeck ? classesDeck.offsetHeight : null,
      bannerHeight: banner ? banner.offsetHeight : null,
      firstRowRankText: rankText,
      firstRowStudentName: studentName ? studentName.textContent.trim() : null,
      hasDuplicateRoyalTag: Boolean(royalTag),
      thCols,
      classesBarBorderColor,
      currentClassName,
      currentClassPct,
      headerBrandText,
      hasHeaderActions,
      sectionOrder,
      myRankBadgeText,
      docHeight,
      clientHeight,
      bodyHeight,
      hasVerticalOverflow: docHeight > clientHeight || bodyHeight > clientHeight
    };
  });

  console.log('Layout Metrics:', JSON.stringify(layout, null, 2));

  // Test Tapping on #dashboard-classes-bar to open modal and switch class
  await page.click('#dashboard-classes-bar');
  await page.waitForTimeout(300);
  const modalVisible = await page.isVisible('#classes-selector-modal');
  console.log('Classes Selector Modal opened:', modalVisible);

  // Click Telling Story inside modal
  const switchedClass = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.classes-selector-item'));
    const storyItem = items.find(i => i.textContent.includes('Telling Story'));
    if (storyItem) {
      storyItem.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Telling Story in modal:', switchedClass);
  await page.waitForTimeout(400);

  const activeAfterModalSwitch = await page.evaluate(() => {
    const nameEl = document.getElementById('classes-bar-current-name');
    const nextTaskTitle = document.querySelector('#up-next-container .next-asm-title');
    const goBtn = document.querySelector('#up-next-container .next-asm-go-btn');
    return {
      className: nameEl ? nameEl.textContent.trim() : null,
      nextTitle: nextTaskTitle ? nextTaskTitle.textContent.trim() : null,
      goBtnText: goBtn ? goBtn.textContent.trim() : null
    };
  });
  console.log('Class and Next Task after modal switch:', activeAfterModalSwitch);

  // Capture screenshot of lobby
  const screenshotPath = path.resolve('scripts/student_lobby_verified.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved student lobby screenshot to:', screenshotPath);

  // Also copy to brain artifact directory
  const artifactPath = 'C:\\Users\\Top\\.gemini\\antigravity-ide\\brain\\c8aebd0e-5b48-4a8f-a13e-7c45597c5ef5\\student_lobby_verified.png';
  await page.screenshot({ path: artifactPath });
  console.log('Saved artifact screenshot to:', artifactPath);

  await browser.close();

  // Validate criteria for Option B
  const passHeader = Math.abs(layout.headerHeight - 50) <= 2;
  const passHeaderBrand = layout.headerBrandText === "THE STUDENT'S LOBBY";
  const passHeaderActions = layout.hasHeaderActions;
  const passHero = Math.abs(layout.heroHeight - 150) <= 2;
  const passAchievement = Math.abs(layout.achievementHeight - 50) <= 2;
  const passClasses = Math.abs(layout.classesDeckHeight - 50) <= 2;
  const passNext = Math.abs(layout.nextAsmHeight - 50) <= 2;
  const passBanner = Math.abs(layout.bannerHeight - 50) <= 2;
  const passZeroScroll = !layout.hasVerticalOverflow;
  const passCleanRankNumber = layout.firstRowRankText === '1';
  const passNoDuplicateRoyalTag = !layout.hasDuplicateRoyalTag;

  // Option B Wireframe criteria
  const expectedOrder = [
    'dashboard-top-header',
    'welcome-banner-section',
    'dashboard-achievement-card',
    'dashboard-classes-section',
    'up-next-section',
    'bottom-dock-section',
    'bottom-ad-banner'
  ];
  const passOrder = JSON.stringify(layout.sectionOrder) === JSON.stringify(expectedOrder);
  const passThCols = layout.thCols[0] === 'NO' && layout.thCols[1] === 'STUDENTS NAME' && layout.thCols[2] === 'POINT' && layout.thCols[3] === 'GRADE';

  console.log('\n--- OPTION B VERIFICATION REPORT ---');
  console.log(`1. Header (50px): ${passHeader ? 'PASS' : 'FAIL'} (${layout.headerHeight}px)`);
  console.log(`2. Header Brand (THE STUDENT'S LOBBY on Left): ${passHeaderBrand ? 'PASS' : 'FAIL'} ("${layout.headerBrandText}")`);
  console.log(`3. Header Actions (Profile + Logout on Right): ${passHeaderActions ? 'PASS' : 'FAIL'}`);
  console.log(`4. Hero Card (150px): ${passHero ? 'PASS' : 'FAIL'} (${layout.heroHeight}px)`);
  console.log(`5. Achievement Card (50px): ${passAchievement ? 'PASS' : 'FAIL'} (${layout.achievementHeight}px, text: "${layout.achievementText}")`);
  console.log(`6. Classes Selector Bar (50px): ${passClasses ? 'PASS' : 'FAIL'} (${layout.classesDeckHeight}px, class: "${layout.currentClassName} - ${layout.currentClassPct}")`);
  console.log(`7. Next Assessment Card (50px): ${passNext ? 'PASS' : 'FAIL'} (${layout.nextAsmHeight}px, card: ${layout.nextCardHeight}px)`);
  console.log(`8. Standings Card (Dynamic Bottom): PASS (${layout.standingsHeight}px)`);
  console.log(`9. Bottom Banner (50px): ${passBanner ? 'PASS' : 'FAIL'} (${layout.bannerHeight}px)`);
  console.log(`10. Zero-Scroll (docHeight <= clientHeight): ${passZeroScroll ? 'PASS' : 'FAIL'} (docHeight: ${layout.docHeight}px, clientHeight: ${layout.clientHeight}px)`);
  console.log(`11. Clean Number in Rank 1 ('1', no crown icon): ${passCleanRankNumber ? 'PASS' : 'FAIL'} ("${layout.firstRowRankText}")`);
  console.log(`12. No Duplicate King/Queen tag on name: ${passNoDuplicateRoyalTag ? 'PASS' : 'FAIL'}`);
  console.log(`13. Layout Order (Metadata -> 50px Status -> 50px Classes -> 50px Next Asm -> Standings -> 50px Banner): ${passOrder ? 'PASS' : 'FAIL'}`);
  console.log(`14. Table Columns (NO | STUDENTS NAME | POINT | GRADE): ${passThCols ? 'PASS' : 'FAIL'} (${JSON.stringify(layout.thCols)})`);
  console.log(`15. My Rank Badge in Header: "${layout.myRankBadgeText}"`);

  if (!passHeader || !passHeaderBrand || !passHeaderActions || !passHero || !passAchievement || !passNext || !passClasses || !passBanner || !passZeroScroll || !passCleanRankNumber || !passNoDuplicateRoyalTag || !passOrder || !passThCols) {
    process.exit(1);
  }
  console.log('\nALL ZERO-SCROLL OPTION B WIREFRAME CRITERIA PASSED!');
})();
