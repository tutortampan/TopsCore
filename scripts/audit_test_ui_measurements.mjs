import { chromium } from 'playwright';

async function run() {
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }
  const page = await browser.newPage({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2
  });

  await page.addInitScript(() => {
    const mockSession = {
      student_id: 'test-student-1',
      student_name: 'Mr. Ayya Sofyandi Mzeth',
      institution_name: 'CAKE ENGLISH COURSE',
      program_name: 'Camp',
      authenticated_at: new Date().toISOString()
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
    sessionStorage.setItem('topscore_test_id', 'ratio-test');
    window.alert = () => {};
    window.confirm = () => true;
  });

  await page.goto('http://localhost:5500/test.html?test_id=ratio-test', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  // Render Written mode scenario first
  await page.evaluate(() => {
    window.__renderTestScenario({
      testData: {
        title: '2nd Vocabulary Exam D - Cooking Class',
        status: 'PUBLISHED',
        test_type: 'exam',
        answer_type: 'written',
        working_duration_minutes: 15
      },
      row: {
        id: 'r1',
        question_id: 'q1',
        question_text_snapshot: 'Menyampaikan presentasi resep',
        question_snapshot: {
          question_text: 'Menyampaikan presentasi resep',
          answer_type: 'written',
          correct_answer: 'deliver a recipe presentation',
          theme: 'Culinary',
          theme_code: 'D',
          topic: 'Cooking Presentation',
          word_type: 'Phrase',
          category: 'Phrases'
        }
      }
    });
    document.querySelectorAll('.loading-overlay, .toast, .offline-pill').forEach(e => e.remove());
  });

  await page.waitForTimeout(300);

  const measureElement = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = window.getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      selector: sel,
      tag: el.tagName.toLowerCase(),
      dimensions: {
        width: Math.round(r.width * 10) / 10 + 'px',
        height: Math.round(r.height * 10) / 10 + 'px'
      },
      typography: {
        fontFamily: s.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
        fontSize: s.fontSize,
        fontWeight: s.fontWeight,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        color: s.color,
        textAlign: s.textAlign,
        textTransform: s.textTransform
      },
      spacing: {
        marginTop: s.marginTop,
        marginRight: s.marginRight,
        marginBottom: s.marginBottom,
        marginLeft: s.marginLeft,
        paddingTop: s.paddingTop,
        paddingRight: s.paddingRight,
        paddingBottom: s.paddingBottom,
        paddingLeft: s.paddingLeft,
        gap: s.gap
      },
      panel: {
        borderRadius: s.borderRadius,
        background: s.backgroundColor,
        border: `${s.borderWidth} ${s.borderStyle} ${s.borderColor}`,
        boxShadow: s.boxShadow !== 'none' ? s.boxShadow : 'none'
      }
    };
  };

  const writtenAudit = await page.evaluate(() => {
    const selectors = [
      'body.test-page',
      'header#test-top-header',
      '.test-title-inner',
      '#test-main-title',
      '#test-title-sub',
      '#test-controls-bar',
      '#giveup-btn',
      '#test-student-avatar',
      '#test-sync-indicator',
      '#test-timer',
      '#timer-display',
      '.test-body',
      '.test-main-content',
      '.metadata-grid',
      '.metadata-grid > div:first-child',
      '.metadata-grid > div:nth-child(2)',
      '.metadata-grid > div:nth-child(3)',
      '.metadata-grid > div:nth-child(4)',
      '#question-box-prompt',
      '.speech-question-text',
      '#answer-container-written',
      '#written-answer-input',
      '.word-counter-pill',
      '#virtual-keyboard-container',
      '.vk-row:first-child',
      '.vk-key:first-child',
      '.vk-key.space',
      '.vk-key.vk-enter',
      '#fixed-bottom-area',
      '.bottom-nav-bar',
      '#bottom-prev-btn',
      '#bottom-next-btn',
      '#question-counter',
      '#bottom-ad-banner',
      '.banner-brand',
      '.banner-author'
    ];

    const results = {};
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        results[s] = {
          rect: `${Math.round(r.width * 10) / 10}px × ${Math.round(r.height * 10) / 10}px`,
          font: `${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily.split(',')[0].replace(/['"]/g, '')}`,
          color: cs.color,
          bg: cs.backgroundColor,
          border: `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`,
          radius: cs.borderRadius,
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
          gap: cs.gap
        };
      }
    }
    return results;
  });

  // Now render Spoken Mode to get Mic & Speech controls
  await page.evaluate(() => {
    window.__renderTestScenario({
      testData: {
        title: '2nd Vocabulary Task C1 - Shopping & Choosing Products',
        status: 'PUBLISHED',
        test_type: 'quiz',
        answer_type: 'spoken',
        working_duration_minutes: 10
      },
      row: {
        id: 'row-sp-1',
        question_id: 'q-sp-1',
        question_text_snapshot: 'Bertanya',
        question_snapshot: {
          question_text: 'Bertanya',
          answer_type: 'spoken',
          correct_answer: 'ask',
          theme: 'Shopping',
          theme_code: 'C',
          topic: 'Shopping & Choosing Products',
          word_type: 'Verb',
          category: 'Words'
        }
      }
    });
    document.querySelectorAll('.loading-overlay, .toast, .offline-pill').forEach(e => e.remove());
  });

  await page.waitForTimeout(300);

  const spokenAudit = await page.evaluate(() => {
    const selectors = [
      '#speech-answer-container',
      '#speech-target-text',
      '#speech-hint-btn',
      '#speech-control-container',
      '#speech-lang-select',
      '#speech-status-indicator',
      '#speech-mic-btn',
      '#btn-type-instead'
    ];
    const results = {};
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        results[s] = {
          rect: `${Math.round(r.width * 10) / 10}px × ${Math.round(r.height * 10) / 10}px`,
          font: `${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily.split(',')[0].replace(/['"]/g, '')}`,
          color: cs.color,
          bg: cs.backgroundColor,
          border: `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`,
          radius: cs.borderRadius,
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
          gap: cs.gap
        };
      }
    }
    return results;
  });

  // Now render MCQ Mode
  await page.evaluate(() => {
    window.__renderTestScenario({
      testData: {
        title: '3rd Vocabulary Exam D - High-Frequency',
        status: 'PUBLISHED',
        test_type: 'exam',
        answer_type: 'selection',
        working_duration_minutes: 20
      },
      row: {
        id: 'row-mc-1',
        question_id: 'q-mc-1',
        question_text_snapshot: 'Mengambil alih kendali situasi darurat',
        question_snapshot: {
          question_text: 'Mengambil alih kendali situasi darurat',
          answer_type: 'selection',
          correct_answer: 'take charge of the emergency',
          options_snapshot: [
            'take charge of the emergency',
            'take control of the incident',
            'take responsibility for the crisis',
            'bring the situation under control',
            'step in during the emergency'
          ],
          theme: 'High-Frequency',
          theme_code: 'D',
          topic: 'Emergency & Leadership',
          word_type: 'Phrase',
          category: 'Phrases'
        }
      }
    });
    document.querySelectorAll('.loading-overlay, .toast, .offline-pill').forEach(e => e.remove());
  });

  await page.waitForTimeout(300);

  const mcqAudit = await page.evaluate(() => {
    const selectors = [
      '#answer-container-mc',
      '.mc-option-btn:first-child',
      '.mc-badge:first-child',
      '.mc-text:first-child'
    ];
    const results = {};
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) {
        const cs = window.getComputedStyle(el);
        const r = el.getBoundingClientRect();
        results[s] = {
          rect: `${Math.round(r.width * 10) / 10}px × ${Math.round(r.height * 10) / 10}px`,
          font: `${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily.split(',')[0].replace(/['"]/g, '')}`,
          color: cs.color,
          bg: cs.backgroundColor,
          border: `${cs.borderWidth} ${cs.borderStyle} ${cs.borderColor}`,
          radius: cs.borderRadius,
          padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
          margin: `${cs.marginTop} ${cs.marginRight} ${cs.marginBottom} ${cs.marginLeft}`,
          gap: cs.gap
        };
      }
    }
    return results;
  });

  console.log('=== WRITTEN AUDIT ===');
  console.log(JSON.stringify(writtenAudit, null, 2));
  console.log('=== SPOKEN AUDIT ===');
  console.log(JSON.stringify(spokenAudit, null, 2));
  console.log('=== MCQ AUDIT ===');
  console.log(JSON.stringify(mcqAudit, null, 2));

  await browser.close();
}

run().catch(console.error);
