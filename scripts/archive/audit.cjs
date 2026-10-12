const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  if (!fs.existsSync('audit_screenshots')) {
    fs.mkdirSync('audit_screenshots');
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport to mobile size
  await page.setViewport({ width: 375, height: 812 });
  
  await page.goto('file://' + path.resolve('assessment.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });

  await page.screenshot({ path: 'audit_screenshots/1-initial.png' });

  const reportPath = 'ASSESSMENT_FINAL_REPORT.md';
  let report = `# Assessment Layout Verification Report\n\n## 1. Initial State\n![Initial Screenshot](audit_screenshots/1-initial.png)\n\n`;

  const mockSession = { student_name: 'Test Student' };
  const mockAttempt = { 
    id: 'test-attempt-1', 
    assessment_id: 'mock-assessment',
    expected_end_at: new Date(Date.now() + 3600000).toISOString()
  };
  const mockAssessment = { title: 'Test Exam Module' };
  const mockAnswers = [
    { id: 'ans1', answer_type: 'written', question_snapshot: { question_text: 'Translate this', answer_type: 'written' }, section_id: 'default' },
    { id: 'ans2', answer_type: 'speech_to_text', question_snapshot: { question_text: 'Speak this', answer_type: 'speech_to_text' }, section_id: 'default' },
    { id: 'ans3', answer_type: 'multiple_choice', question_snapshot: { question_text: 'Choose one', answer_type: 'multiple_choice', options_snapshot: 'A,B,C,D' }, section_id: 'default' }
  ];

  await page.evaluate((sess, att, ass, ans) => {
    sessionStorage.setItem('topscore_session', JSON.stringify(sess));
    sessionStorage.setItem('topscore_attemptData', JSON.stringify(att));
    sessionStorage.setItem('topscore_assessmentData', JSON.stringify(ass));
    sessionStorage.setItem('topscore_answerRows', JSON.stringify(ans));
  }, mockSession, mockAttempt, mockAssessment, mockAnswers);

  await page.goto('file://' + path.resolve('assessment.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'audit_screenshots/2-loaded-written.png' });
  report += `## 2. Written Mode Layout\n![Written](audit_screenshots/2-loaded-written.png)\n\n`;

  await page.click('#bottom-next-btn');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'audit_screenshots/3-loaded-speaking.png' });
  report += `## 3. Speaking Mode Layout\n![Speaking](audit_screenshots/3-loaded-speaking.png)\n\n`;

  await page.click('#bottom-next-btn');
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'audit_screenshots/4-loaded-mc.png' });
  report += `## 4. Multiple Choice Mode Layout\n![MC](audit_screenshots/4-loaded-mc.png)\n\n`;

  // Test opening the matrix modal and see if keyboard hides
  await page.goto('file://' + path.resolve('assessment.html').replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    document.getElementById('progress-bar-toggle').click();
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'audit_screenshots/5-matrix-open.png' });
  report += `## 5. Matrix Open (Keyboard Hidden)\n![Matrix](audit_screenshots/5-matrix-open.png)\n\n`;

  fs.writeFileSync(reportPath, report);
  console.log('Audit complete.');
  await browser.close();
})();
