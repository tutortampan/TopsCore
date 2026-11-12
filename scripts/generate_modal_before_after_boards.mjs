import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function generateBoards() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  // Helper to convert local image to base64 data URI
  function getBase64Image(filename) {
    const fullPath = path.join(brainDir, filename);
    if (!fs.existsSync(fullPath)) return '';
    const data = fs.readFileSync(fullPath).toString('base64');
    return `data:image/png;base64,${data}`;
  }

  const beforeMatrix = getBase64Image('modal_before_matrix_mobile.png');
  const beforeGender = getBase64Image('modal_before_gender_setup_mobile.png');
  const beforeAdminDelete = getBase64Image('modal_before_admin_delete_desktop.png');

  // --- 1. BOARD 1: QUESTION MATRIX (Mobile 390x844 viewports side-by-side) ---
  const htmlMatrix = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #050811;
        color: #f8fafc;
        padding: 30px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .board-header {
        text-align: center;
        margin-bottom: 10px;
      }
      .board-title {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.5px;
        background: linear-gradient(135deg, #ffffff, #94a3b8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .board-subtitle {
        font-size: 14px;
        color: #64748b;
        margin-top: 4px;
      }
      .comparison-row {
        display: flex;
        gap: 30px;
        justify-content: center;
      }
      .phone-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }
      .label-badge {
        padding: 6px 16px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .label-before {
        background: rgba(255, 0, 0, 0.15);
        color: #ff4d4d;
        border: 1px solid rgba(255, 0, 0, 0.3);
      }
      .label-after {
        background: rgba(0, 192, 0, 0.15);
        color: #00c000;
        border: 1px solid rgba(0, 192, 0, 0.4);
      }
      .phone-frame {
        width: 390px;
        height: 844px;
        background: #090D16;
        border-radius: 40px;
        border: 4px solid #1E293B;
        box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5);
        overflow: hidden;
        position: relative;
      }
      .phone-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      /* AFTER MOCKUP STYLING */
      .mockup-container {
        width: 100%;
        height: 100%;
        background: rgba(9, 13, 22, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        position: relative;
      }
      .modern-card {
        width: 100%;
        max-width: 358px;
        background: #0D1424;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 30px rgba(56, 189, 248, 0.08);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .modal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 14px;
      }
      .modal-title-group {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .head-title {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #f8fafc;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .head-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: 700;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.12);
        padding: 2px 8px;
        border-radius: 6px;
        border: 1px solid rgba(56, 189, 248, 0.25);
      }
      .close-icon-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
      }
      .legend-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(15, 23, 42, 0.8);
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid rgba(255, 255, 255, 0.04);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .dot-blue { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }
      .dot-green { background: #00c000; box-shadow: 0 0 6px #00c000; }
      .dot-slate { background: #334155; }

      .grid-8col {
        display: grid;
        grid-template-columns: repeat(8, 1fr);
        gap: 6px;
      }
      .tile {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: 700;
        border-radius: 8px;
        transition: all 0.2s;
      }
      .tile-current {
        background: rgba(56, 189, 248, 0.2);
        color: #38bdf8;
        border: 2px solid #38bdf8;
        box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
      }
      .tile-answered {
        background: rgba(0, 192, 0, 0.12);
        color: #00c000;
        border: 1.5px solid #00c000;
      }
      .tile-unanswered {
        background: #151D2F;
        color: #64748b;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .btn-primary-action {
        width: 100%;
        height: 48px;
        border-radius: 12px;
        background: linear-gradient(135deg, #0284c7, #0369a1);
        border: 1px solid #38bdf8;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 4px 15px rgba(2, 132, 199, 0.35);
      }
      .notes-box {
        background: rgba(56, 189, 248, 0.05);
        border: 1px solid rgba(56, 189, 248, 0.15);
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.4;
      }
    </style>
  </head>
  <body>
    <div class="board-header">
      <div class="board-title">STUDENT TEST: QUESTION MATRIX POPUP</div>
      <div class="board-subtitle">Viewport: 390×844 (Mobile Smartphone Portrait) • Redundant Submit Button Purged</div>
    </div>
    <div class="comparison-row">
      <!-- BEFORE -->
      <div class="phone-wrapper">
        <div class="label-badge label-before">🔴 BEFORE (Existing 10-Col + Redundant Submit)</div>
        <div class="phone-frame">
          <img src="${beforeMatrix}">
        </div>
      </div>
      <!-- AFTER -->
      <div class="phone-wrapper">
        <div class="label-badge label-after">🟢 AFTER (Sleek 8-Col Grid + 36px Thumb Targets)</div>
        <div class="phone-frame">
          <div class="mockup-container">
            <div class="modern-card">
              <div class="modal-head">
                <div class="modal-title-group">
                  <div class="head-title">
                    <span>QUESTION MATRIX</span>
                    <span class="head-badge">1 / 40</span>
                  </div>
                </div>
                <div class="close-icon-btn">✕</div>
              </div>

              <div class="legend-bar">
                <div class="legend-item"><span class="dot dot-blue"></span> Current</div>
                <div class="legend-item"><span class="dot dot-green"></span> Answered (15)</div>
                <div class="legend-item"><span class="dot dot-slate"></span> Blank (25)</div>
              </div>

              <div class="grid-8col">
                <!-- Row 1 -->
                <div class="tile tile-current">1</div>
                <div class="tile tile-answered">2</div>
                <div class="tile tile-answered">3</div>
                <div class="tile tile-answered">4</div>
                <div class="tile tile-answered">5</div>
                <div class="tile tile-answered">6</div>
                <div class="tile tile-answered">7</div>
                <div class="tile tile-answered">8</div>
                <!-- Row 2 -->
                <div class="tile tile-answered">9</div>
                <div class="tile tile-answered">10</div>
                <div class="tile tile-answered">11</div>
                <div class="tile tile-answered">12</div>
                <div class="tile tile-answered">13</div>
                <div class="tile tile-answered">14</div>
                <div class="tile tile-answered">15</div>
                <div class="tile tile-unanswered">16</div>
                <!-- Row 3 -->
                <div class="tile tile-unanswered">17</div>
                <div class="tile tile-unanswered">18</div>
                <div class="tile tile-unanswered">19</div>
                <div class="tile tile-unanswered">20</div>
                <div class="tile tile-unanswered">21</div>
                <div class="tile tile-unanswered">22</div>
                <div class="tile tile-unanswered">23</div>
                <div class="tile tile-unanswered">24</div>
                <!-- Row 4 -->
                <div class="tile tile-unanswered">25</div>
                <div class="tile tile-unanswered">26</div>
                <div class="tile tile-unanswered">27</div>
                <div class="tile tile-unanswered">28</div>
                <div class="tile tile-unanswered">29</div>
                <div class="tile tile-unanswered">30</div>
                <div class="tile tile-unanswered">31</div>
                <div class="tile tile-unanswered">32</div>
                <!-- Row 5 -->
                <div class="tile tile-unanswered">33</div>
                <div class="tile tile-unanswered">34</div>
                <div class="tile tile-unanswered">35</div>
                <div class="tile tile-unanswered">36</div>
                <div class="tile tile-unanswered">37</div>
                <div class="tile tile-unanswered">38</div>
                <div class="tile tile-unanswered">39</div>
                <div class="tile tile-unanswered">40</div>
              </div>

              <div class="notes-box">
                💡 Tap any question tile to navigate instantly, or jump directly to next pending item.
              </div>

              <div class="btn-primary-action">
                <span>JUMP TO NEXT UNANSWERED</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setViewportSize({ width: 900, height: 1000 });
  await page.setContent(htmlMatrix);
  await page.screenshot({ path: path.join(brainDir, 'popup_comparison_matrix.png') });
  console.log('Saved popup_comparison_matrix.png');

  // --- 2. BOARD 2: GENDER SETUP MODAL (Mobile 390x844 viewports side-by-side) ---
  const htmlGender = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #050811;
        color: #f8fafc;
        padding: 30px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .board-header { text-align: center; margin-bottom: 10px; }
      .board-title {
        font-size: 24px;
        font-weight: 800;
        letter-spacing: 0.5px;
        background: linear-gradient(135deg, #ffffff, #94a3b8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .board-subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
      .comparison-row { display: flex; gap: 30px; justify-content: center; }
      .phone-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .label-badge {
        padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 800;
        letter-spacing: 0.5px; text-transform: uppercase;
      }
      .label-before { background: rgba(255, 0, 0, 0.15); color: #ff4d4d; border: 1px solid rgba(255, 0, 0, 0.3); }
      .label-after { background: rgba(0, 192, 0, 0.15); color: #00c000; border: 1px solid rgba(0, 192, 0, 0.4); }
      .phone-frame {
        width: 390px;
        height: 844px;
        background: #090D16;
        border-radius: 40px;
        border: 4px solid #1E293B;
        box-shadow: 0 25px 60px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.5);
        overflow: hidden;
        position: relative;
      }
      .phone-frame img { width: 100%; height: 100%; object-fit: cover; }
      .mockup-container {
        width: 100%; height: 100%; background: rgba(9, 13, 22, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 20px; position: relative;
      }
      .modern-card {
        width: 100%; max-width: 350px; background: #0D1424; border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.8), 0 0 30px rgba(56, 189, 248, 0.1);
        padding: 24px 20px; display: flex; flex-direction: column; align-items: center; gap: 20px;
      }
      .icon-badge {
        width: 60px; height: 60px; border-radius: 18px; background: rgba(56, 189, 248, 0.12);
        border: 1px solid rgba(56, 189, 248, 0.3); display: flex; align-items: center; justify-content: center;
        font-size: 28px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.2);
      }
      .text-center { text-align: center; }
      .modal-title { font-size: 18px; font-weight: 800; color: #f8fafc; letter-spacing: 0.5px; }
      .modal-desc { font-size: 13px; color: #94a3b8; margin-top: 4px; line-height: 1.4; }
      .gender-grid {
        display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%;
      }
      .gender-option {
        background: #151D2F; border: 1.5px solid rgba(255, 255, 255, 0.08); border-radius: 16px;
        padding: 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 10px;
        position: relative; transition: all 0.2s;
      }
      .gender-option.selected {
        background: rgba(56, 189, 248, 0.1); border-color: #38bdf8;
        box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);
      }
      .gender-avatar-wrap {
        width: 54px; height: 54px; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; font-size: 28px; background: rgba(255, 255, 255, 0.04);
      }
      .gender-name { font-size: 14px; font-weight: 700; color: #f8fafc; }
      .selected-badge {
        position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 50%;
        background: #38bdf8; color: #090D16; font-size: 11px; font-weight: 900;
        display: flex; align-items: center; justify-content: center;
      }
      .btn-submit {
        width: 100%; height: 50px; border-radius: 14px; background: linear-gradient(135deg, #0284c7, #0369a1);
        border: 1px solid #38bdf8; color: #ffffff; font-size: 14px; font-weight: 800; letter-spacing: 0.5px;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 6px 20px rgba(2, 132, 199, 0.35);
      }
    </style>
  </head>
  <body>
    <div class="board-header">
      <div class="board-title">STUDENT ONBOARDING: GENDER SETUP MODAL</div>
      <div class="board-subtitle">Fixed Mojibake Corrupted Emoji • Compact 2-Column Side-by-Side Modern Selection</div>
    </div>
    <div class="comparison-row">
      <!-- BEFORE -->
      <div class="phone-wrapper">
        <div class="label-badge label-before">🔴 BEFORE (Mojibake 'ðŸŒŸ' + Vertical Stacking)</div>
        <div class="phone-frame">
          <img src="${beforeGender}">
        </div>
      </div>
      <!-- AFTER -->
      <div class="phone-wrapper">
        <div class="label-badge label-after">🟢 AFTER (Clean UTF-8 🌟 + Sleek 2-Column Grid)</div>
        <div class="phone-frame">
          <div class="mockup-container">
            <div class="modern-card">
              <div class="icon-badge">🌟</div>
              <div class="text-center">
                <div class="modal-title">CHOOSE YOUR AVATAR</div>
                <div class="modal-desc">Select your profile avatar to personalize your learning dashboard and exams.</div>
              </div>

              <div class="gender-grid">
                <div class="gender-option">
                  <div class="gender-avatar-wrap">👦</div>
                  <div class="gender-name">Male</div>
                </div>
                <div class="gender-option selected">
                  <div class="selected-badge">✓</div>
                  <div class="gender-avatar-wrap">👧</div>
                  <div class="gender-name">Female</div>
                </div>
              </div>

              <div class="btn-submit">
                <span>SAVE & CONTINUE</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(htmlGender);
  await page.screenshot({ path: path.join(brainDir, 'popup_comparison_gender_setup.png') });
  console.log('Saved popup_comparison_gender_setup.png');

  // --- 3. BOARD 3: ADMIN DELETE MODAL (Desktop Landscape 1440x900 viewports) ---
  const htmlAdminDelete = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: 'Plus Jakarta Sans', sans-serif;
        background: #050811;
        color: #f8fafc;
        padding: 30px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .board-header { text-align: center; margin-bottom: 10px; }
      .board-title {
        font-size: 24px; font-weight: 800; letter-spacing: 0.5px;
        background: linear-gradient(135deg, #ffffff, #94a3b8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .board-subtitle { font-size: 14px; color: #64748b; margin-top: 4px; }
      .comparison-row { display: flex; gap: 30px; justify-content: center; }
      .desktop-wrapper { display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .label-badge {
        padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 800;
        letter-spacing: 0.5px; text-transform: uppercase;
      }
      .label-before { background: rgba(255, 0, 0, 0.15); color: #ff4d4d; border: 1px solid rgba(255, 0, 0, 0.3); }
      .label-after { background: rgba(0, 192, 0, 0.15); color: #00c000; border: 1px solid rgba(0, 192, 0, 0.4); }
      .desktop-frame {
        width: 620px;
        height: 480px;
        background: #090D16;
        border-radius: 16px;
        border: 2px solid #1E293B;
        box-shadow: 0 25px 60px rgba(0,0,0,0.9);
        overflow: hidden;
        position: relative;
      }
      .desktop-frame img { width: 100%; height: 100%; object-fit: cover; }
      .mockup-container {
        width: 100%; height: 100%; background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 20px; position: relative;
      }
      .modern-admin-card {
        width: 100%; max-width: 440px; background: #0D1424;
        border: 1.5px solid rgba(255, 0, 0, 0.4);
        border-radius: 18px; box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 35px rgba(255, 0, 0, 0.18);
        padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px;
      }
      .warning-badge {
        width: 58px; height: 58px; border-radius: 16px;
        background: rgba(255, 0, 0, 0.12);
        border: 1.5px solid #ff0000;
        color: #ff0000;
        display: flex; align-items: center; justify-content: center;
        font-size: 26px;
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);
      }
      .text-center { text-align: center; }
      .card-title {
        font-size: 17px; font-weight: 800; color: #ff0000; letter-spacing: 0.8px;
        text-transform: uppercase;
      }
      .card-desc {
        font-size: 13px; color: #94a3b8; margin-top: 6px; line-height: 1.5;
      }
      .target-pill {
        width: 100%; background: #151D2F; border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 10px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
      }
      .target-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      .target-val { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: #f8fafc; }
      .btn-row {
        display: flex; gap: 12px; width: 100%; margin-top: 6px;
      }
      .btn-cancel {
        flex: 1; height: 44px; border-radius: 10px; background: #1E293B;
        border: 1px solid rgba(255, 255, 255, 0.1); color: #cbd5e1;
        font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center;
      }
      .btn-delete {
        flex: 1; height: 44px; border-radius: 10px;
        background: linear-gradient(135deg, #ff0000, #b30000);
        border: 1px solid #ff0000; color: #ffffff;
        font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
        display: flex; align-items: center; justify-content: center; gap: 6px;
        box-shadow: 0 4px 18px rgba(255, 0, 0, 0.4);
      }
    </style>
  </head>
  <body>
    <div class="board-header">
      <div class="board-title">ADMIN CONSOLE: PERMANENT DELETION MODAL</div>
      <div class="board-subtitle">Enforcing SSOT Rule 2.10 (All Red Refers to Grade E #ff0000) • Authoritative Glow</div>
    </div>
    <div class="comparison-row">
      <!-- BEFORE -->
      <div class="desktop-wrapper">
        <div class="label-badge label-before">🔴 BEFORE (Generic Dull Box + Muted Red)</div>
        <div class="desktop-frame">
          <img src="${beforeAdminDelete}">
        </div>
      </div>
      <!-- AFTER -->
      <div class="desktop-wrapper">
        <div class="label-badge label-after">🟢 AFTER (SSOT Grade E Border, Glow & Dual Buttons)</div>
        <div class="desktop-frame">
          <div class="mockup-container">
            <div class="modern-admin-card">
              <div class="warning-badge">⚠️</div>
              <div class="text-center">
                <div class="card-title">PERMANENT DELETION</div>
                <div class="card-desc">Are you sure you want to delete this record? This action will remove the record from active view and cannot be undone.</div>
              </div>

              <div class="target-pill">
                <span class="target-label">Target Item</span>
                <span class="target-val">STUDENT: John Doe (ID: 8a9f...)</span>
              </div>

              <div class="btn-row">
                <div class="btn-cancel">Cancel</div>
                <div class="btn-delete">
                  <span>🗑️</span>
                  <span>Delete Record</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setViewportSize({ width: 1350, height: 650 });
  await page.setContent(htmlAdminDelete);
  await page.screenshot({ path: path.join(brainDir, 'popup_comparison_admin_delete.png') });
  console.log('Saved popup_comparison_admin_delete.png');

  await browser.close();
  console.log('All boards generated successfully!');
}

generateBoards().catch(err => {
  console.error('Error generating boards:', err);
  process.exit(1);
});
