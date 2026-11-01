import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 810 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  // Set sessionStorage before loading
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'test-student-id',
      student_name: 'Alex Johnson',
      program_name: 'English Excellence',
      institution_name: 'Tops Academy'
    }));
    sessionStorage.setItem('topscore_assessment_id', 'test-assessment-id');
  });

  const mockQuestions = [
    {
      id: 'ans-1',
      question_id: 'q-1',
      question_snapshot: {
        question_text: 'Where do you work every day?',
        topic: 'Office Routine',
        category: 'Phrases',
        word_type: 'Phrase',
        answer_type: 'speech_to_text',
        section_id: 'default'
      }
    },
    {
      id: 'ans-2',
      question_id: 'q-2',
      question_snapshot: {
        question_text: 'Type the synonym of "essential":',
        topic: 'Vocabulary Mastery',
        category: 'Words',
        word_type: 'Adjective',
        answer_type: 'written',
        section_id: 'default'
      }
    },
    {
      id: 'ans-3',
      question_id: 'q-3',
      question_snapshot: {
        question_text: 'Choose the correct answer for the sentence:',
        topic: 'Grammar Fundamentals',
        category: 'Vocabulary',
        word_type: 'Verb',
        answer_type: 'multiple_choice',
        options_snapshot: ['takes off', 'taking over', 'takes after', 'turned up'],
        section_id: 'default'
      }
    }
  ];

  // Intercept Edge Functions and Supabase REST calls
  await page.route('**/functions/v1/start-assessment', async route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        attempt: {
          id: 'att-1',
          expires_at: new Date(Date.now() + 18 * 60 * 1000 + 2000).toISOString()
        },
        ASSESSMENT: {
          id: 'test-assessment-id',
          title: 'TOP ENGLISH ASSESSMENT LEVEL 1',
          assessment_type: 'VOCABULARY_MASTERY',
          schedule_mode: 'flexible'
        },
        sections: [
          { id: 'default', title: 'Main Test', time_limit_minutes: 20 }
        ],
        answers: mockQuestions
      })
    });
  });

  await page.route('**/functions/v1/get-security-settings', async route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: false, soundEnabled: false })
    });
  });

  await page.route('**/rest/v1/**', async route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });

  // Navigate to assessment page
  console.log('Navigating to assessment page...');
  await page.goto('http://localhost:3000/assessment.html?id=test-assessment-id', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Take screenshot of Mode 1 (Speech Question)
  console.log('Taking screenshot for Mode 1 (Speech)...');
  await page.screenshot({ path: 'screenshot_mode1_speech.png' });

  // Navigate to Question 2 (Written / Keyboard)
  console.log('Navigating to Question 2 (Keyboard)...');
  await page.evaluate(() => {
    window.renderQuestion(1);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_mode2_keyboard.png' });

  // Navigate to Question 3 (Options / Multiple Choice)
  console.log('Navigating to Question 3 (Options)...');
  await page.evaluate(() => {
    window.renderQuestion(2);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshot_mode3_options.png' });

  await browser.close();
  console.log('All 3 mode screenshots captured successfully!');
}

run().catch(err => {
  console.error('Error during test:', err);
  process.exit(1);
});
