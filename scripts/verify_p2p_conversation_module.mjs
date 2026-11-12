// TopsCore LMS — Automated Verification Suite for Phase 430
// Peer-to-Peer 1-Hour Conversation Module with AI Evaluation

import fs from 'fs';
import assert from 'assert';
import { chromium } from '@playwright/test';
import { ConversationPacingEngine, STAGE_DEFINITIONS } from '../js/conversation-pacing.js';
import { evaluate5PillarsLocally } from '../js/conversation-eval.js';
import { TOPSCORE_COLORS } from '../js/grading.js';

console.log('=== [PHASE 430] Peer-to-Peer 1-Hour Conversation Module Verification ===\n');

let passCount = 0;
let totalChecks = 0;

function check(label, condition, detail = '') {
  totalChecks++;
  if (condition) {
    passCount++;
    console.log(`  ✅ [PASS] ${label} ${detail}`);
  } else {
    console.error(`  ❌ [FAIL] ${label} ${detail}`);
    throw new Error(`Verification failed on: ${label}`);
  }
}

// -------------------------------------------------------------
// 1. File Structure & Component Existence Audit
// -------------------------------------------------------------
console.log('--- Step 1: File Structure & Component Existence ---');
check('conversation.html exists', fs.existsSync('conversation.html'));
check('css/conversation.css exists', fs.existsSync('css/conversation.css'));
check('js/webrtc-call.js exists', fs.existsSync('js/webrtc-call.js'));
check('js/conversation-pacing.js exists', fs.existsSync('js/conversation-pacing.js'));
check('js/conversation-eval.js exists', fs.existsSync('js/conversation-eval.js'));
check('js/conversation-room.js exists', fs.existsSync('js/conversation-room.js'));
check('supabase/functions/evaluate-conversation/index.ts exists', fs.existsSync('supabase/functions/evaluate-conversation/index.ts'));
check('supabase/migrations/20261113000000_conversation_sessions.sql exists', fs.existsSync('supabase/migrations/20261113000000_conversation_sessions.sql'));

// -------------------------------------------------------------
// 2. Spatial & UI Invariants Audit
// -------------------------------------------------------------
console.log('\n--- Step 2: Spatial & UI Invariants ---');
const convHtml = fs.readFileSync('conversation.html', 'utf8');
const convCss = fs.readFileSync('css/conversation.css', 'utf8');

check('100vh viewport lock in CSS', convCss.includes('height: 100vh') && convCss.includes('overflow: hidden'));
check('10px container gap in CSS', convCss.includes('gap: 10px') && convCss.includes('padding: 10px'));
check('50px lower control panel height in CSS', convCss.includes('height: 50px') && convCss.includes('flex: 0 0 50px'));
check('50px topbar height in CSS', convCss.includes('.conv-topbar') && convCss.includes('height: 50px'));
check('Pure English student UI copy in HTML', !convHtml.includes('Tutup') && !convHtml.includes('Kirim') && !convHtml.includes('Mulai'));

// -------------------------------------------------------------
// 3. 4-Stage 60-Minute Discussion Pacing Engine Unit Verification
// -------------------------------------------------------------
console.log('\n--- Step 3: 4-Stage Pacing Engine Unit Tests ---');
check('4 Stages defined', STAGE_DEFINITIONS.length === 4);

const totalSec = 3600; // 60 mins
const pacing = new ConversationPacingEngine({
  durationMinutes: 60,
  studentInfo: { id: 'std_a', name: 'Alice', role: 'Lead Engineer' },
  targetVocab: ['mutual concession', 'milestone deliverable', 'resource constraint']
});

check('Initial stage is 1', pacing.currentStage === 1);
check('Stage 1 duration is 600s (10 min)', pacing.stageDurations[0].durationSeconds === 600);
check('Stage 2 duration is 1500s (25 min)', pacing.stageDurations[1].durationSeconds === 1500);
check('Stage 3 duration is 900s (15 min)', pacing.stageDurations[2].durationSeconds === 900);
check('Stage 4 duration is 600s (10 min)', pacing.stageDurations[3].durationSeconds === 600);
check('Total duration is 3600s (60 min)', pacing.stageDurations.reduce((a, b) => a + b.durationSeconds, 0) === 3600);

// Advance stage test
pacing.advanceStage(2, false);
check('Advance to Stage 2 updates currentStage', pacing.currentStage === 2);
check('Stage 2 remaining reset to 1500s', pacing.stageSecondsRemaining === 1500);

// -------------------------------------------------------------
// 4. Transcription Buffer, Vocab Tracking & Speaking Balance
// -------------------------------------------------------------
console.log('\n--- Step 4: Transcription Buffer & Speaking Balance ---');

// Record turns
pacing._recordLocalUtterance('Hello, thank you for meeting today. We have a significant resource constraint on our timeline.');
pacing.receivePeerTurn({
  id: 'turn_peer_1',
  speakerId: 'std_b',
  speakerName: 'Bob',
  role: 'Product Manager',
  text: 'I understand Alice. However, we need to guarantee the milestone deliverable for our stakeholders.',
  stage: 2,
  timestamp: new Date().toISOString()
});

check('ChatLog has 2 turns', pacing.chatLog.length === 2);
check('Target vocab "resource constraint" detected', pacing.stats.vocabHits.has('resource constraint'));
check('Target vocab "milestone deliverable" detected', pacing.stats.vocabHits.has('milestone deliverable'));

const selfWords = pacing.stats.selfWords;
const peerWords = pacing.stats.peerWords;
const totalWords = selfWords + peerWords;
const selfShare = Math.round((selfWords / totalWords) * 100);
check('Speaking balance calculated correctly', selfShare >= 40 && selfShare <= 60, `(Share: ${selfShare}% self, ${100 - selfShare}% peer)`);

// Low-Egress serialized JSON check (< 50 KB per Rule 2.12)
const serialized = pacing.finishSession();
const jsonBytes = new TextEncoder().encode(JSON.stringify(serialized)).length;
check('Serialized transcript JSON < 50 KB (Rule 2.12 compliance)', jsonBytes < 50 * 1024, `(Size: ${(jsonBytes / 1024).toFixed(2)} KB)`);

// -------------------------------------------------------------
// 5. 5-Pillar Evaluation & Authoritative Grading Scale (Rule 2.10)
// -------------------------------------------------------------
console.log('\n--- Step 5: 5-Pillar AI Scoring & Grading Scale ---');

// Test Case A: Balanced high-scoring conversation
const mockRichChatLog = [
  { speakerId: 'std_a', stage: 1, text: 'Welcome to this session. I would like to propose a mutual concession regarding the sprint dates.' },
  { speakerId: 'std_b', stage: 1, text: 'Thank you. We are ready to negotiate an equitable compromise.' },
  { speakerId: 'std_a', stage: 2, text: 'Because we faced unforeseen bugs, therefore we must allocate a contingency buffer in order to secure stakeholder alignment.' },
  { speakerId: 'std_b', stage: 2, text: 'Although the deadline is tight, however we can adjust the scope consequently.' },
  { speakerId: 'std_a', stage: 3, text: 'Let us confirm the 3-point action plan for our milestone deliverable.' },
  { speakerId: 'std_b', stage: 3, text: 'Agreed, this resolves the resource constraint effectively.' },
  { speakerId: 'std_a', stage: 4, text: 'In summary, this was a very constructive discussion. Thank you for your collaboration.' },
  { speakerId: 'std_b', stage: 4, text: 'Thank you as well. We are fully aligned.' }
];

const evalA = evaluate5PillarsLocally({
  studentId: 'std_a',
  chatLog: mockRichChatLog,
  targetVocab: ['mutual concession', 'equitable compromise', 'contingency buffer', 'stakeholder alignment', 'milestone deliverable', 'resource constraint']
});

check('Composite score calculated', evalA.final_score > 0 && evalA.final_score <= 100, `(Score: ${evalA.final_score}%)`);
check('All 5 pillars evaluated', Object.keys(evalA.pillars).length === 5);
check('Fluency score present', typeof evalA.pillars.fluency.score === 'number');
check('Vocabulary score present', typeof evalA.pillars.vocabulary.score === 'number');
check('Grammar score present', typeof evalA.pillars.grammar.score === 'number');
check('Relevance score present', typeof evalA.pillars.relevance.score === 'number');
check('Turn-taking score present', typeof evalA.pillars.turn_taking.score === 'number');

// Grade color verification per Rule 2.10
if (evalA.final_score >= 100) {
  check('Grade ★ has Electric Pink #ff2d87', evalA.color.toLowerCase() === TOPSCORE_COLORS.STAR.toLowerCase());
} else if (evalA.final_score >= 90) {
  check('Grade A has Pure Green #00c000', evalA.color.toLowerCase().startsWith(TOPSCORE_COLORS.A.toLowerCase().slice(0, 7)));
} else if (evalA.final_score >= 80) {
  check('Grade B has Electric Lime #95ff00', evalA.color.toLowerCase().startsWith(TOPSCORE_COLORS.B.toLowerCase().slice(0, 7)));
}

// -------------------------------------------------------------
// 6. Live Playwright Headless Browser Verification
// -------------------------------------------------------------
console.log('\n--- Step 6: Live Playwright UI Flow in Headless Chrome ---');

import http from 'http';
import path from 'path';

// Launch self-contained local static server
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const safePath = path.normalize(path.join(process.cwd(), urlPath === '/' ? 'conversation.html' : urlPath));
  if (!safePath.startsWith(process.cwd())) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(safePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not Found: ' + urlPath);
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

await new Promise(resolve => server.listen(5678, '127.0.0.1', resolve));

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-infobars', '--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Inject mock session
await page.addInitScript(() => {
  sessionStorage.setItem('topscore_session', JSON.stringify({
    student_id: 'std_test_101',
    student_name: 'Ayya Test Student',
    role: 'Lead Engineer',
    authenticated_at: new Date().toISOString()
  }));
});

// Load via local HTTP server
await page.goto('http://127.0.0.1:5678/conversation.html?room=CONV-TEST', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);

// 1. Verify Topbar
const roomBadgeText = await page.locator('#room-code-badge').textContent();
check('Room code rendered in topbar', roomBadgeText.includes('CONV-TEST'));

const timerText = await page.locator('#conv-timer').textContent();
check('Timer rendered', timerText.includes('⏱️'));

const stagePillsCount = await page.locator('#stage-pills .conv-stage-pill').count();
check('4 Stage pills rendered in topbar', stagePillsCount === 4);

// 2. Verify Viewport 100vh lock
const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
const innerHeight = await page.evaluate(() => window.innerHeight);
check('Strict 100vh viewport lock (scrollHeight <= innerHeight)', scrollHeight <= innerHeight + 2);

// 3. Verify Buttons
const btnMic = page.locator('#btn-toggle-mic');
check('Mic toggle button present', await btnMic.isVisible());

const btnNextStage = page.locator('#btn-next-stage');
check('Advance stage button present', await btnNextStage.isVisible());

// Click Advance Stage
await btnNextStage.click();
await page.waitForTimeout(300);
const activeStageText = await page.locator('#stage-pills .conv-stage-pill.active').textContent();
check('Advance Stage button advances to Stage 2', activeStageText.includes('2. Deep Dive'));

// Click Signal Turn
const btnTurn = page.locator('#btn-turn-cue');
await btnTurn.click();
await page.waitForTimeout(300);
const feedContent = await page.locator('#transcript-feed').textContent();
check('Signal turn logged in transcript feed', feedContent.includes('requested turn') || feedContent.includes('signaled for a turn'));

// 4. Verify Finish & Evaluate Modal
const btnEnd = page.locator('#btn-end-session');
// Mock confirm dialog
page.on('dialog', async dialog => {
  await dialog.accept();
});
await btnEnd.click();
await page.waitForTimeout(800);

const evalModal = page.locator('#eval-modal');
check('5-Pillar Scorecard modal is displayed on finish', await evalModal.isVisible());

const modalScore = await page.locator('#modal-final-score').textContent();
check('Scorecard displays numeric percentage', modalScore.includes('%'));

const modalGrade = await page.locator('#modal-final-grade').textContent();
check('Scorecard displays authoritative grade symbol', ['★', 'A', 'B', 'C', 'D', 'E'].includes(modalGrade.trim()));

// Capture Screenshot
const artifactDir = 'tests/artifacts/p2p_conversation';
if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
const screenshotPath = `${artifactDir}/p2p_conversation_room_verified.png`;
await page.screenshot({ path: screenshotPath, fullPage: true });
check('Screenshot captured to ' + screenshotPath, fs.existsSync(screenshotPath));

await browser.close();
server.close();

console.log(`\n======================================================`);
console.log(`🎉 ALL VERIFICATION CHECKS PASSED: ${passCount}/${totalChecks} (100%)`);
console.log(`======================================================\n`);
