import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  console.log('📱 Starting Student Area Mobile Popups Capture (390x844)...');

  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    serviceWorkers: 'block'
  });

  const page = await context.newPage();

  const mockSession = {
    student_id: '11111111-2222-3333-4444-555555555555',
    student_name: 'Jessica Pratama',
    name: 'Jessica Pratama',
    institution_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    institution_name: 'Oxford English Academy',
    program_id: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
    program_name: 'General English',
    batch_id: 'cccccccc-dddd-eeee-ffff-000000000000',
    batch_name: 'Batch Alpha 2026',
    gender: 'female',
    dob: '2002-05-15',
    birth_date: '2002-05-15',
    education: [
      { id: 'kindergarten', level: 'TK', name: 'Kindergarten (TK)', institution: 'Kindergarten (TK)', year: 2008 },
      { id: 'elementary', level: 'SD', name: 'Elementary School (SD)', institution: 'Elementary School (SD)', year: 2014 },
      { id: 'junior_high', level: 'SMP', name: 'Junior High School (SMP)', institution: 'Junior High School (SMP)', year: 2017 },
      { id: 'senior_high', level: 'SMA/SMK', name: 'Senior High School (SMA/SMK)', institution: 'Senior High School (SMA/SMK)', year: 2020 },
      { id: 'bachelor', level: 'S1/D4', name: "Bachelor's Degree (S1/D4)", institution: "Bachelor's Degree (S1/D4)", year: 2024 }
    ],
    photo_retake_eligible: true
  };

  await page.addInitScript((session) => {
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    sessionStorage.setItem('topscore_student_session', JSON.stringify(session));
    localStorage.setItem(`stu_photo_retake_eligible_${session.student_id}`, 'true');
    localStorage.setItem(`stu_photo_${session.student_id}`, 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="45" fill="%236366f1"/></svg>');
  }, mockSession);

  // Helper to hide all modals in dashboard
  const hideAllDashboardModals = async () => {
    await page.evaluate(() => {
      const ids = [
        'gender-setup-modal',
        'birthday-setup-modal',
        'education-setup-modal',
        'photo-setup-modal',
        'classes-selector-modal',
        'component-selector-modal',
        'level-modal',
        'profile-modal',
        'custom-confirm-modal'
      ];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('hidden');
          el.style.display = 'none';
        }
      });
    });
  };

  // ══════════════════════════════════════════════════════════════
  // SECTION 1: DASHBOARD MODALS
  // ══════════════════════════════════════════════════════════════
  console.log('\n--- Capturing Dashboard Modals ---');
  await page.goto(`http://127.0.0.1:5500/dashboard.html?t=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // 1. Gender Setup Modal
  console.log('Capturing: 01 Gender Setup Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('gender-setup-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
      const femaleCard = document.getElementById('opt-gender-female');
      if (femaleCard) {
        femaleCard.classList.add('selected');
        femaleCard.setAttribute('aria-pressed', 'true');
        femaleCard.style.borderColor = '#6366f1';
        femaleCard.style.background = 'rgba(99, 102, 241, 0.15)';
      }
      const btn = document.getElementById('btn-confirm-gender');
      if (btn) btn.disabled = false;
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_01_gender_setup.png') });

  // 2. Birthday Setup Modal
  console.log('Capturing: 02 Birthday Setup Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('birthday-setup-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
      const inp = document.getElementById('onboard-birth-date');
      if (inp) inp.value = '2002-05-15';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_02_birthday_setup.png') });

  // 3. Education Setup & Auto-Estimated Timeline Modal
  console.log('Capturing: 03 Education Setup Timeline Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('education-setup-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
      if (typeof window.initEducationModalControls === 'function') {
        window.initEducationModalControls(2002);
      }
    }
  });
  await page.waitForTimeout(200);
  await page.locator('button.edu-level-btn[data-level="bachelor"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_03_education_timeline_setup.png') });

  // 4. Camera-Only Photo Setup Modal
  console.log('Capturing: 04 Photo Setup Camera Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('photo-setup-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
      const snap = document.getElementById('webcam-snapshot');
      if (snap) {
        snap.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320" viewBox="0 0 240 320"><rect width="240" height="320" fill="%231e293b"/><circle cx="120" cy="110" r="50" fill="%236366f1"/><path d="M50 250 C50 180, 190 180, 190 250 Z" fill="%236366f1"/></svg>';
        snap.classList.remove('hidden');
      }
      const stream = document.getElementById('webcam-stream');
      if (stream) stream.classList.add('hidden');
      const overlay = document.getElementById('camera-loading-overlay');
      if (overlay) overlay.classList.add('hidden');
      const micTitle = document.getElementById('mic-status-title');
      if (micTitle) micTitle.textContent = 'Microphone Ready (Default Audio)';
      const micIcon = document.getElementById('mic-status-icon');
      if (micIcon) micIcon.textContent = '🎙️';
      const confirmBtn = document.getElementById('btn-confirm-photo-setup');
      if (confirmBtn) confirmBtn.disabled = false;
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_04_camera_photo_setup.png') });

  // 5. Classes Selector Modal
  console.log('Capturing: 05 Classes Selector Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('classes-selector-modal');
    const list = document.getElementById('classes-selector-modal-list');
    if (m && list) {
      list.innerHTML = `
        <div class="class-card active" style="padding: 12px; margin-bottom: 8px; border-radius: 10px; background: rgba(99, 102, 241, 0.15); border: 1.5px solid #6366f1; cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #fff; font-size: 0.95rem;">🗣️ Public Speaking A1</span>
            <span style="font-size: 0.7rem; font-weight: 700; background: rgba(0, 192, 0, 0.2); color: #00c000; padding: 2px 6px; border-radius: 4px;">ACTIVE</span>
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8;">Level 1 • 8 Modules Completed • 92% Avg</div>
        </div>
        <div class="class-card" style="padding: 12px; margin-bottom: 8px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #e2e8f0; font-size: 0.95rem;">💼 Business English B2</span>
            <span style="font-size: 0.7rem; font-weight: 600; color: #94a3b8;">ENROLLED</span>
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8;">Level 2 • 3 Modules Completed • 86% Avg</div>
        </div>
        <div class="class-card" style="padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #e2e8f0; font-size: 0.95rem;">📖 Academic IELTS Intensive</span>
            <span style="font-size: 0.7rem; font-weight: 600; color: #94a3b8;">ENROLLED</span>
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8;">Level 1 • 0 Modules • New Class</div>
        </div>
      `;
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_05_classes_selector.png') });

  // 6. Component Selector Modal
  console.log('Capturing: 06 Component Selector Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('component-selector-modal');
    const opts = document.getElementById('component-modal-options');
    if (m && opts) {
      opts.innerHTML = `
        <div class="comp-opt" style="padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">📖</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">Part 1: Vocabulary & Concepts</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">25 Questions • 15 Minutes</div>
          </div>
          <span style="color: #38bdf8; font-size: 0.8rem; font-weight: 700;">START &rarr;</span>
        </div>
        <div class="comp-opt" style="padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">🎙️</div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">Part 2: Speaking Performance</div>
            <div style="font-size: 0.72rem; color: #94a3b8;">15 Prompt Scenarios • 20 Minutes</div>
          </div>
          <span style="color: #a855f7; font-size: 0.8rem; font-weight: 700;">START &rarr;</span>
        </div>
      `;
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_06_component_selector.png') });

  // 7. Class Level Detail Modal
  console.log('Capturing: 07 Class Level Detail Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('level-modal');
    const container = document.getElementById('levels-container');
    const titleClass = document.getElementById('level-modal-class');
    if (titleClass) titleClass.textContent = 'Public Speaking A1 — Curriculum Roadmap';
    if (m && container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div style="padding: 12px; border-radius: 10px; background: rgba(0, 192, 0, 0.08); border: 1px solid rgba(0, 192, 0, 0.3); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">Level 1: Foundations & Articulation</div>
              <div style="font-size: 0.72rem; color: #94a3b8;">10 Modules • Highest Score: 96% (Grade A)</div>
            </div>
            <span style="font-size: 0.75rem; font-weight: 700; color: #00c000;">COMPLETED ✓</span>
          </div>
          <div style="padding: 12px; border-radius: 10px; background: rgba(99, 102, 241, 0.12); border: 1px solid #6366f1; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; color: #fff; font-size: 0.88rem;">Level 2: Narrative Flow & Storytelling</div>
              <div style="font-size: 0.72rem; color: #94a3b8;">8 Modules • 4 Completed • In Progress</div>
            </div>
            <span style="font-size: 0.75rem; font-weight: 700; color: #38bdf8;">ACTIVE ⚡</span>
          </div>
          <div style="padding: 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); display: flex; justify-content: space-between; align-items: center; opacity: 0.65;">
            <div>
              <div style="font-weight: 700; color: #94a3b8; font-size: 0.88rem;">Level 3: Executive Presentations</div>
              <div style="font-size: 0.72rem; color: #64748b;">Prerequisite: Complete Level 2 Exam (≥80%)</div>
            </div>
            <span style="font-size: 0.75rem; color: #64748b;">LOCKED 🔒</span>
          </div>
        </div>
      `;
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_07_class_levels_modal.png') });

  // 8. Profile Drawer (Tab 1: Account & PIN + Education Timeline)
  console.log('Capturing: 08 Profile Drawer - Account Tab');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('profile-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
      if (typeof window._switchProfileTab === 'function') window._switchProfileTab('profile');
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_08_profile_drawer_account.png') });

  // 9. Profile Drawer (Tab 2: Recent History)
  console.log('Capturing: 09 Profile Drawer - History Tab');
  await page.evaluate(() => {
    if (typeof window._switchProfileTab === 'function') window._switchProfileTab('history');
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_09_profile_drawer_history.png') });

  // 10. Custom Confirmation Dialog
  console.log('Capturing: 10 Custom Confirmation Modal');
  await hideAllDashboardModals();
  await page.evaluate(() => {
    const m = document.getElementById('custom-confirm-modal');
    const title = document.getElementById('custom-confirm-title');
    const msg = document.getElementById('custom-confirm-msg');
    const btnCancel = document.getElementById('custom-confirm-cancel');
    const btnOk = document.getElementById('custom-confirm-btn');
    if (m) {
      if (title) title.textContent = 'Confirm Session Exit';
      if (msg) msg.textContent = 'Are you sure you want to log out of your TopsCore student session? Any unsaved progress will remain safely synced in your account.';
      if (btnCancel) btnCancel.textContent = 'Cancel';
      if (btnOk) btnOk.textContent = 'Log Out';
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_10_custom_confirm_logout.png') });

  // ══════════════════════════════════════════════════════════════
  // SECTION 2: TEST ROOM MODALS (test.html)
  // ══════════════════════════════════════════════════════════════
  console.log('\n--- Capturing Test Room Modals ---');
  await page.goto(`http://127.0.0.1:5500/test.html?test_id=mock-test-01&t=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Helper to hide all test modals
  const hideAllTestModals = async () => {
    await page.evaluate(() => {
      const ids = ['pre-exam-focus-modal', 'matrix-popup', 'submit-modal', 'cheat-overlay'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('hidden');
          el.style.display = 'none';
        }
      });
    });
  };

  // 11. Pre-Exam Focus Modal
  console.log('Capturing: 11 Pre-Exam Focus Modal');
  await hideAllTestModals();
  await page.evaluate(() => {
    const m = document.getElementById('pre-exam-focus-modal');
    if (m) {
      m.classList.remove('hidden');
      m.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_11_pre_exam_focus.png') });

  // 12. Question Matrix Popup
  console.log('Capturing: 12 Question Matrix Popup');
  await hideAllTestModals();
  await page.evaluate(() => {
    const mp = document.getElementById('matrix-popup');
    const grid = document.getElementById('q-nav-grid');
    if (grid) {
      let gridHtml = '';
      for (let i = 1; i <= 40; i++) {
        let cls = 'q-cell';
        if (i <= 18) cls += ' answered';
        else if (i === 19) cls += ' current';
        gridHtml += `<button type="button" class="${cls}">${i}</button>`;
      }
      grid.innerHTML = gridHtml;
    }
    const pill = document.getElementById('matrix-progress-pill');
    if (pill) pill.textContent = '18 / 40';
    const ansLeg = document.getElementById('matrix-legend-answered');
    if (ansLeg) ansLeg.textContent = '18';
    const blkLeg = document.getElementById('matrix-legend-blank');
    if (blkLeg) blkLeg.textContent = '22';

    if (mp) {
      mp.classList.remove('hidden');
      mp.style.display = 'flex';
      mp.style.visibility = 'visible';
      mp.style.opacity = '1';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_12_test_question_matrix.png') });

  // 13. Submit Modal - Incomplete Warning State
  console.log('Capturing: 13 Submit Modal - Incomplete Warning');
  await hideAllTestModals();
  await page.evaluate(() => {
    const sm = document.getElementById('submit-modal');
    const incWrap = document.getElementById('hazard-incomplete-wrap');
    const compWrap = document.getElementById('hazard-complete-wrap');
    const ansCount = document.getElementById('answered-count');
    const totCount = document.getElementById('total-count');
    const prog = document.getElementById('hazard-mini-progress-bar');

    if (sm) {
      if (incWrap) incWrap.classList.remove('hidden');
      if (compWrap) compWrap.classList.add('hidden');
      if (ansCount) ansCount.textContent = '18';
      if (totCount) totCount.textContent = '40';
      if (prog) prog.style.width = '45%';
      sm.classList.remove('hidden');
      sm.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_13_test_incomplete_submit.png') });

  // 14. Submit Modal - Ready to Submit State
  console.log('Capturing: 14 Submit Modal - Complete State');
  await hideAllTestModals();
  await page.evaluate(() => {
    const sm = document.getElementById('submit-modal');
    const incWrap = document.getElementById('hazard-incomplete-wrap');
    const compWrap = document.getElementById('hazard-complete-wrap');
    const totCountReady = document.getElementById('total-count-ready');

    if (sm) {
      if (incWrap) incWrap.classList.add('hidden');
      if (compWrap) compWrap.classList.remove('hidden');
      if (totCountReady) totCountReady.textContent = '40';
      sm.classList.remove('hidden');
      sm.style.display = 'flex';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_14_test_complete_submit.png') });

  // 15. Cheat Security Overlay
  console.log('Capturing: 15 Cheat Security Overlay');
  await hideAllTestModals();
  await page.evaluate(() => {
    const co = document.getElementById('cheat-overlay');
    if (co) {
      co.classList.remove('hidden');
      co.style.display = 'flex';
      const badge = document.getElementById('cheat-strikes-badge');
      if (badge) badge.textContent = 'WARNING 1 OF 3';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_15_test_cheat_overlay.png') });

  // ══════════════════════════════════════════════════════════════
  // SECTION 3: TEST RESULT MODAL (result.html)
  // ══════════════════════════════════════════════════════════════
  console.log('\n--- Capturing Result Modal ---');
  await page.goto(`http://127.0.0.1:5500/result.html?attempt_id=mock-att-01&t=${Date.now()}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // 16. Answers Breakdown Modal
  console.log('Capturing: 16 Answers Breakdown Modal');
  await page.evaluate(() => {
    const ansModal = document.getElementById('answers-section');
    const list = document.getElementById('answers-list-container');
    const countLabel = document.getElementById('modal-answers-count-label');
    if (countLabel) countLabel.textContent = 'Review your 40 responses • 36 Correct (90%)';

    if (list) {
      list.innerHTML = `
        <div style="padding: 10px; border-radius: 8px; background: rgba(0, 192, 0, 0.08); border: 1px solid rgba(0, 192, 0, 0.25); margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #fff; font-size: 0.8rem;">Q1 • Multiple Choice</span>
            <span style="font-size: 0.7rem; font-weight: 700; color: #00c000; background: rgba(0,192,0,0.15); padding: 1px 6px; border-radius: 4px;">1.0 pt ✓</span>
          </div>
          <div style="font-size: 0.78rem; color: #e2e8f0; margin-bottom: 4px;">She _____ to the meeting yesterday morning.</div>
          <div style="font-size: 0.72rem; color: #00c000;">Your answer: <strong>went</strong> (Correct)</div>
        </div>
        <div style="padding: 10px; border-radius: 8px; background: rgba(255, 0, 0, 0.08); border: 1px solid rgba(255, 0, 0, 0.25); margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #fff; font-size: 0.8rem;">Q2 • Spoken Pronunciation</span>
            <span style="font-size: 0.7rem; font-weight: 700; color: #ff0000; background: rgba(255,0,0,0.15); padding: 1px 6px; border-radius: 4px;">0.0 pt ✕</span>
          </div>
          <div style="font-size: 0.78rem; color: #e2e8f0; margin-bottom: 4px;">Pronounce: "Thoroughly"</div>
          <div style="font-size: 0.72rem; color: #ff0000;">Your answer: "Trough-ly"</div>
          <div style="font-size: 0.72rem; color: #38bdf8;">Expected: /ˈθʌr.ə.li/</div>
        </div>
        <div style="padding: 10px; border-radius: 8px; background: rgba(0, 192, 0, 0.08); border: 1px solid rgba(0, 192, 0, 0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-weight: 700; color: #fff; font-size: 0.8rem;">Q3 • Point & Speak</span>
            <span style="font-size: 0.7rem; font-weight: 700; color: #00c000; background: rgba(0,192,0,0.15); padding: 1px 6px; border-radius: 4px;">1.0 pt ✓</span>
          </div>
          <div style="font-size: 0.78rem; color: #e2e8f0; margin-bottom: 4px;">Subject Pronoun: Plural third person</div>
          <div style="font-size: 0.72rem; color: #00c000;">Your answer: <strong>They</strong> (Correct)</div>
        </div>
      `;
    }

    if (ansModal) {
      ansModal.classList.remove('hidden');
      ansModal.style.setProperty('display', 'flex', 'important');
      ansModal.style.setProperty('opacity', '1', 'important');
      ansModal.style.setProperty('visibility', 'visible', 'important');
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_popup_16_result_answers_breakdown.png') });

  await browser.close();
  console.log('\n🎉 ALL 16 STUDENT AREA MOBILE POPUPS CAPTURED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Capture failed:', err);
  process.exit(1);
});
