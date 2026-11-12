import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TopsCore LMS — Comprehensive Before & After Visual Boards</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #060b18;
      color: #f8fafc;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .board-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
      position: relative;
    }
    .board-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 14px;
    }
    .board-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .board-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .board-desc {
      font-size: 13px;
      color: #94a3b8;
    }
    .board-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      font-family: 'JetBrains Mono', monospace;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 22px;
    }
    .col-box {
      border-radius: 10px;
      padding: 24px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 160px;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .col-before {
      background: #150d18;
      border: 1.5px dashed rgba(244, 63, 94, 0.45);
    }
    .col-after {
      background: #09172e;
      border: 1.5px solid rgba(56, 189, 248, 0.55);
      box-shadow: inset 0 0 24px rgba(56, 189, 248, 0.06);
    }
    .tag {
      position: absolute;
      top: 10px;
      left: 12px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }
    .tag-before {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .tag-after {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.5);
    }
    .spec-label {
      font-size: 11.5px;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
      text-align: center;
      margin-top: 6px;
      line-height: 1.45;
    }
    .spec-label strong { color: #f8fafc; font-weight: 700; }
    .spec-label span.err { color: #f87171; }
    .spec-label span.ok { color: #38bdf8; }

    /* ====== BOARD 1: STAR AVATAR STYLES ====== */
    .avatar-wrap {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .avatar-box-before {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: linear-gradient(135deg, #86efac 0%, #ff2d87 45%, #006400 100%);
      padding: 4px;
      box-shadow: 0 0 20px rgba(0, 100, 0, 0.4), 0 0 15px rgba(255, 45, 135, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-box-after {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff2d87 0%, #be185d 100%);
      padding: 4px;
      box-shadow: 0 0 25px rgba(255, 45, 135, 0.55), inset 0 0 10px rgba(255, 45, 135, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .avatar-inner .grade-star-sym {
      font-size: 24px;
      color: #ff2d87;
      line-height: 1;
      filter: drop-shadow(0 0 4px rgba(255, 45, 135, 0.6));
    }
    .avatar-inner .pct-txt {
      font-size: 11px;
      font-weight: 800;
      color: #ff2d87;
      font-family: 'JetBrains Mono', monospace;
    }

    /* ====== BOARD 2: TEST RUNNER CONTROLS STYLES ====== */
    .runner-widget {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 440px;
    }
    .runner-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.7);
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .speech-wave-bars {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      height: 16px;
      margin-left: 6px;
    }
    .wave-bar-before {
      width: 3px;
      background: #FF0000;
      border-radius: 2px;
    }
    .wave-bar-after {
      width: 3px;
      background: #ef4444;
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
    }
    .pacing-row {
      display: flex;
      gap: 8px;
      justify-content: center;
    }
    .pace-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      font-family: 'JetBrains Mono', monospace;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .giveup-btn-before {
      height: 42px;
      background: #141A28;
      border: 1.8px solid #FF0000;
      border-radius: 8px;
      color: #FF4D4D;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 0 12px rgba(255, 0, 0, 0.25);
    }
    .giveup-btn-after {
      height: 42px;
      background: #141A28;
      border: 1.8px solid #ef4444;
      border-radius: 8px;
      color: #fca5a5;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);
    }

    /* ====== BOARD 3: WITA PEAK HOUR STYLES ====== */
    .wita-kpi-card {
      width: 100%;
      max-width: 440px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .wita-kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .chart-container {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 60px;
      padding-top: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .chart-bar-wrap {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      gap: 2px;
    }
    .chart-bar {
      width: 100%;
      border-radius: 3px 3px 0 0;
    }

    /* ====== BOARD 4: DUPLICATE RESOLVERS STYLES ====== */
    .dup-table {
      width: 100%;
      max-width: 460px;
      border-collapse: collapse;
      font-size: 12px;
      border-radius: 8px;
      overflow: hidden;
    }
    .dup-table th {
      background: #0b1120;
      padding: 6px 10px;
      font-size: 11px;
      color: #94a3b8;
      text-align: left;
      font-weight: 700;
    }
    .dup-table td {
      padding: 7px 10px;
    }
    .row-before-keep {
      background: rgba(255, 45, 135, 0.12);
      border-left: 3px solid #ff2d87;
    }
    .row-after-keep {
      background: rgba(16, 185, 129, 0.12);
      border-left: 3px solid #10b981;
    }
    .form-asterisk-demo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #f8fafc;
    }

    /* ====== BOARD 5: TIME POPOVER & VOCAB VAULT STYLES ====== */
    .popover-demo-wrap {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      max-width: 440px;
      align-items: center;
    }
    .popover-btn-before {
      background: #ffe600;
      color: #0f172a;
      font-weight: 900;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid #d4c000;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 10px rgba(255, 230, 0, 0.35);
    }
    .popover-btn-after {
      background: #0284c7;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      padding: 6px 14px;
      border-radius: 6px;
      border: 1px solid #38bdf8;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
    }
    .vocab-bp-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* ====== BOARD 6: ROSTER PROMOTION & LIVE DOT STYLES ====== */
    .promote-btn-before {
      background: #00c000;
      border: 1px solid #00c000;
      color: #000000;
      height: 36px;
      padding: 0 18px;
      font-size: 13px;
      font-weight: 800;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .promote-btn-after {
      background: #0284c7;
      border: 1px solid #38bdf8;
      color: #ffffff;
      height: 36px;
      padding: 0 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.35);
    }
    .live-dot-wrap {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #94a3b8;
    }
    .dot-before {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00c000;
      box-shadow: 0 0 8px rgba(0, 192, 0, 0.85);
    }
    .dot-after {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.85);
    }
  </style>
</head>
<body>

  <!-- ========================================== -->
  <!-- BOARD 1: STAR 100% AVATAR CONTAINER -->
  <!-- ========================================== -->
  <div class="board-card" id="board-star-avatar">
    <div class="board-header">
      <div class="board-title-group">
        <div class="board-title">🌟 Board 1: Star 100% Avatar Container &amp; Aura Gradient</div>
        <div class="board-desc">Purge green color contamination (#86efac / #006400) from 100% Star tier avatars in Result and Dashboard</div>
      </div>
      <span class="board-badge">AGENTS.md Rule 2.10</span>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div class="avatar-wrap">
          <div class="avatar-box-before">
            <div class="avatar-inner">
              <span class="grade-star-sym">★</span>
              <span class="pct-txt">100%</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-size:14px; font-weight:700; color:#f8fafc;">Aura: Green + Pink Blend</div>
            <div style="font-size:11px; color:#94a3b8;">#86efac (0%) &bull; #ff2d87 (45%) &bull; #006400 (100%)</div>
          </div>
        </div>
        <div class="spec-label">
          <span class="err">❌ VIOLATION:</span> Green stops <strong>#86efac</strong> &amp; <strong>#006400</strong> flank Star Pink in <code>result.js:1037</code>, <code>dashboard.js:2843</code>
        </div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div class="avatar-wrap">
          <div class="avatar-box-after">
            <div class="avatar-inner">
              <span class="grade-star-sym">★</span>
              <span class="pct-txt">100%</span>
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-size:14px; font-weight:700; color:#ff2d87;">Aura: Pure Electric Pink Glow</div>
            <div style="font-size:11px; color:#38bdf8;">#ff2d87 (0%) &bull; #be185d (100%) &bull; Zero Green</div>
          </div>
        </div>
        <div class="spec-label">
          <span class="ok">✔ COMPLIANT:</span> Pure Electric Pink gradient <code>#ff2d87 &rarr; #be185d</code> with 100% exclusivity
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- BOARD 2: TEST RUNNER CONTROLS & PACING -->
  <!-- ========================================== -->
  <div class="board-card" id="board-test-runner">
    <div class="board-header">
      <div class="board-title-group">
        <div class="board-title">🎙️ Board 2: Test Runner Speech Waves, Pacing &amp; Give Up</div>
        <div class="board-desc">Decouple audio recording wave bars, pacing velocity badges, and give up triggers from academic grades</div>
      </div>
      <span class="board-badge">Domain 2 Semantic Decoupling</span>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div class="runner-widget">
          <div class="runner-status-row">
            <div style="display:flex; align-items:center; font-size:12px; font-weight:700; color:#f8fafc;">
              ● Listening
              <span class="speech-wave-bars">
                <span class="wave-bar-before" style="height:6px;"></span>
                <span class="wave-bar-before" style="height:14px;"></span>
                <span class="wave-bar-before" style="height:10px;"></span>
                <span class="wave-bar-before" style="height:16px;"></span>
              </span>
            </div>
            <span style="font-size:11px; color:#ff8c00; font-family:'JetBrains Mono';">00:45s</span>
          </div>
          <div class="pacing-row">
            <span class="pace-pill" style="background:rgba(0,192,0,0.15); color:#00c000ff; border:1px solid rgba(0,192,0,0.35);">Comfortable (Grade A)</span>
            <span class="pace-pill" style="background:rgba(255,255,0,0.15); color:#FFFF00; border:1px solid rgba(255,255,0,0.35);">Moderate (Grade C)</span>
            <span class="pace-pill" style="background:rgba(255,0,0,0.15); color:#FF0000; border:1px solid rgba(255,0,0,0.4);">Urgent (Grade E)</span>
          </div>
          <button class="giveup-btn-before">🏳️ Give Up Test (Grade E Red #FF0000)</button>
        </div>
        <div class="spec-label">
          <span class="err">❌ VIOLATION:</span> Wave bars use <code>--grade-e (#FF0000)</code>; pacing uses grade tokens in <code>test.css:311, 1685-1698</code>
        </div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div class="runner-widget">
          <div class="runner-status-row">
            <div style="display:flex; align-items:center; font-size:12px; font-weight:700; color:#f8fafc;">
              ● Listening
              <span class="speech-wave-bars">
                <span class="wave-bar-after" style="height:6px;"></span>
                <span class="wave-bar-after" style="height:14px;"></span>
                <span class="wave-bar-after" style="height:10px;"></span>
                <span class="wave-bar-after" style="height:16px;"></span>
              </span>
            </div>
            <span style="font-size:11px; color:#38bdf8; font-family:'JetBrains Mono';">00:45s</span>
          </div>
          <div class="pacing-row">
            <span class="pace-pill" style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3);">Comfortable (Emerald)</span>
            <span class="pace-pill" style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3);">Moderate (Amber)</span>
            <span class="pace-pill" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.45);">Urgent (Crimson)</span>
          </div>
          <button class="giveup-btn-after">🏳️ Give Up Test (System Crimson #ef4444)</button>
        </div>
        <div class="spec-label">
          <span class="ok">✔ COMPLIANT:</span> Speech wave <strong>#ef4444</strong>; Pacing <strong>#10b981 / #fbbf24 / #ef4444</strong>; Give up <strong>#ef4444</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- BOARD 3: WITA PEAK HOUR & ANALYTICS -->
  <!-- ========================================== -->
  <div class="board-card" id="board-wita-analytics">
    <div class="board-header">
      <div class="board-title-group">
        <div class="board-title">📊 Board 3: WITA Peak Hour &amp; 24-Hour Traffic Heatmap</div>
        <div class="board-desc">Decouple high-traffic peak analytics in Desk and Tests Management from Grade D Dark Orange (#ff8c00)</div>
      </div>
      <span class="board-badge">Domain D Analytics</span>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div class="wita-kpi-card">
          <div class="wita-kpi-header">
            <div>
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#ff8c00;">WITA Peak Hour</div>
              <div style="font-size:20px; font-weight:800; color:#ff8c00; font-family:'JetBrains Mono';">20:00 WITA</div>
            </div>
            <span style="font-size:11px; color:#94a3b8;">142 submissions</span>
          </div>
          <div class="chart-container">
            <div class="chart-bar-wrap"><div class="chart-bar" style="height:35%; background:linear-gradient(180deg, #38bdf8, #0369a1);"></div></div>
            <div class="chart-bar-wrap"><div class="chart-bar" style="height:55%; background:linear-gradient(180deg, #38bdf8, #0369a1);"></div></div>
            <div class="chart-bar-wrap">
              <span style="font-size:9px; color:#ff8c00; font-weight:800;">142</span>
              <div class="chart-bar" style="height:95%; background:linear-gradient(180deg, #ff8c00 0%, #c2410c 100%);"></div>
            </div>
            <div class="chart-bar-wrap">
              <span style="font-size:9px; color:#ff8c00; font-weight:800;">128</span>
              <div class="chart-bar" style="height:85%; background:linear-gradient(180deg, #ff8c00 0%, #c2410c 100%);"></div>
            </div>
            <div class="chart-bar-wrap"><div class="chart-bar" style="height:40%; background:linear-gradient(180deg, #38bdf8, #0369a1);"></div></div>
          </div>
        </div>
        <div class="spec-label">
          <span class="err">❌ VIOLATION:</span> Peak hour KPI text &amp; histogram bars hardcoded to <strong>#ff8c00</strong> (Grade D Fail/Less)
        </div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div class="wita-kpi-card">
          <div class="wita-kpi-header">
            <div>
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; color:#fbbf24;">WITA Peak Hour</div>
              <div style="font-size:20px; font-weight:800; color:#f59e0b; font-family:'JetBrains Mono';">20:00 WITA</div>
            </div>
            <span style="font-size:11px; color:#94a3b8;">142 submissions</span>
          </div>
          <div class="chart-container">
            <div class="chart-bar-wrap"><div class="chart-bar" style="height:35%; background:linear-gradient(180deg, #38bdf8, #0369a1);"></div></div>
            <div class="chart-bar-wrap"><div class="chart-bar" style="height:55%; background:linear-gradient(180deg, #38bdf8, #0369a1);"></div></div>
            <div class="chart-bar-wrap">
              <span style="font-size:9px; color:#fbbf24; font-weight:800;">142</span>
              <div class="chart-bar" style="height:95%; background:linear-gradient(180deg, #f59e0b 0%, #d97706 100%); box-shadow:0 0 10px rgba(245,158,11,0.3);"></div>
            </div>
            <div class="chart-bar-wrap">
              <span style="font-size:9px; color:#fbbf24; font-weight:800;">128</span>
              <div class="chart-bar" style="height:85%; background:linear-gradient(180deg, #f59e0b 0%, #d97706 100%); box-shadow:0 0 10px rgba(245,158,11,0.3);"></div>
            </div>
            <div class="chart-bar-wrap"><div class="chart-bar" style="height:40%; background:linear-gradient(180deg, #38bdf8, #0369a1);"></div></div>
          </div>
        </div>
        <div class="spec-label">
          <span class="ok">✔ COMPLIANT:</span> Peak hour KPI &amp; histogram bars decoupled to <strong>System Amber (#f59e0b / #fbbf24)</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- BOARD 4: DUPLICATE RESOLVERS & REQUIRED FIELDS -->
  <!-- ========================================== -->
  <div class="board-card" id="board-duplicate-resolvers">
    <div class="board-header">
      <div class="board-title-group">
        <div class="board-title">👥 Board 4: Duplicate Resolvers &amp; Required Form Asterisks</div>
        <div class="board-desc">Purge pink row tinting and Grade E red asterisks from candidate rows and modal forms</div>
      </div>
      <span class="board-badge">crud-modals.js &amp; student-reg.js</span>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <table class="dup-table">
          <thead>
            <tr><th>Candidate</th><th>Scope</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr class="row-before-keep">
              <td style="color:#f8fafc; font-weight:700;">Dewi Sartika</td>
              <td style="color:#94a3b8;">Camp 134</td>
              <td><span style="background:rgba(255,45,135,0.25); color:#ff2d87; font-size:10px; font-weight:800; padding:2px 6px; border-radius:3px;">Keep (Pink)</span></td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="color:#94a3b8;">Dewi Sartika (Dup)</td>
              <td style="color:#94a3b8;">Camp 134</td>
              <td><span style="background:rgba(255,0,0,0.15); color:#ff0000; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;">Remove (Red)</span></td>
            </tr>
          </tbody>
        </table>
        <div class="form-asterisk-demo">
          <span>Full Name <strong style="color:#FF0000; font-size:15px;">*</strong> (Fail Red #FF0000)</span>
        </div>
        <div class="spec-label">
          <span class="err">❌ VIOLATION:</span> Keep row uses <code>rgba(var(--grade-star-rgb), 0.12)</code>; asterisks use <code>#FF0000</code>
        </div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <table class="dup-table">
          <thead>
            <tr><th>Candidate</th><th>Scope</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr class="row-after-keep">
              <td style="color:#f8fafc; font-weight:700;">Dewi Sartika</td>
              <td style="color:#94a3b8;">Camp 134</td>
              <td><span style="background:rgba(16,185,129,0.2); color:#10b981; font-size:10px; font-weight:800; padding:2px 6px; border-radius:3px;">Keep (Emerald)</span></td>
            </tr>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(100,116,139,0.06);">
              <td style="color:#94a3b8;">Dewi Sartika (Dup)</td>
              <td style="color:#94a3b8;">Camp 134</td>
              <td><span style="background:rgba(100,116,139,0.2); color:#94a3b8; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px;">Remove (Slate)</span></td>
            </tr>
          </tbody>
        </table>
        <div class="form-asterisk-demo">
          <span>Full Name <strong style="color:#f43f5e; font-size:15px;">*</strong> (System Rose #f43f5e)</span>
        </div>
        <div class="spec-label">
          <span class="ok">✔ COMPLIANT:</span> Keep row uses <strong>System Emerald (#10b981)</strong>; Asterisks use <strong>System Rose (#f43f5e)</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- BOARD 5: TEST TIME POPOVERS & VOCAB VAULT -->
  <!-- ========================================== -->
  <div class="board-card" id="board-time-popovers-vocab">
    <div class="board-header">
      <div class="board-title-group">
        <div class="board-title">⏱️ Board 5: Test Time Popovers &amp; Vocab Vault Blueprint</div>
        <div class="board-desc">Purge Grade C yellow (#ffe600 / #FFFF00) from action popovers, setting badges, and table headers</div>
      </div>
      <span class="board-badge">tests-access.js &amp; vocab-vault.js</span>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div class="popover-demo-wrap">
          <button class="popover-btn-before">⏱️ Quick Add / Reduce Time (+ / -)</button>
          <div class="vocab-bp-row">
            <span style="font-size:11px; font-weight:800; color:#FFFF00; border:1px solid #FFFF00; padding:3px 8px; border-radius:4px;">
              BP SETTING: 20 WORDS
            </span>
            <span style="font-size:11px; font-weight:800; color:#FFFF00; text-transform:uppercase;">
              PASS SCORE (TH)
            </span>
          </div>
        </div>
        <div class="spec-label">
          <span class="err">❌ VIOLATION:</span> <code>#ffe600</code> button &amp; popover in <code>tests-access.js:441, 768</code>; <code>#FFFF00</code> in <code>vocab-vault.js:2686</code>
        </div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div class="popover-demo-wrap">
          <button class="popover-btn-after">⏱️ Quick Add / Reduce Time (+ / -)</button>
          <div class="vocab-bp-row">
            <span style="font-size:11px; font-weight:700; color:#38bdf8; border:1px solid rgba(56,189,248,0.3); background:rgba(56,189,248,0.12); padding:3px 8px; border-radius:4px;">
              BP SETTING: 20 WORDS
            </span>
            <span style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase;">
              PASS SCORE (TH)
            </span>
          </div>
        </div>
        <div class="spec-label">
          <span class="ok">✔ COMPLIANT:</span> Tactical Blue <strong>#0284c7</strong> / Cyan <strong>#38bdf8</strong> button &amp; badge; High-legibility Slate <strong>#94a3b8</strong> header
        </div>
      </div>
    </div>
  </div>

  <!-- ========================================== -->
  <!-- BOARD 6: ROSTER PROMOTION & LIVE DOT -->
  <!-- ========================================== -->
  <div class="board-card" id="board-roster-promotion-dot">
    <div class="board-header">
      <div class="board-title-group">
        <div class="board-title">🚀 Board 6: Student Roster Promotion &amp; Live Status Dot</div>
        <div class="board-desc">Replace Grade A pure green (#00c000) from tactical promote actions and pulsing active indicators</div>
      </div>
      <span class="board-badge">student-management.js &amp; admin.css</span>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="display:flex; flex-direction:column; align-items:center; gap:14px;">
          <button class="promote-btn-before">🚀 NEXT (Promote All Eligible)</button>
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="live-dot-wrap">
              <span class="dot-before"></span>
              <span style="color:#00c000; font-weight:700;">🟢 Active: 16</span>
            </div>
            <span style="background:rgba(0,192,0,0.15); color:#00c000; border:1px solid rgba(0,192,0,0.35); font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">
              ● ALL ENGINES ACTIVE
            </span>
          </div>
        </div>
        <div class="spec-label">
          <span class="err">❌ VIOLATION:</span> Action button and dots use <strong>#00c000</strong> (Grade A Green) in <code>student-management.js:255</code>
        </div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="display:flex; flex-direction:column; align-items:center; gap:14px;">
          <button class="promote-btn-after">🚀 NEXT (Promote All Eligible)</button>
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="live-dot-wrap">
              <span class="dot-after"></span>
              <span style="color:#38bdf8; font-weight:700;">🔹 Active: 16</span>
            </div>
            <span style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px; box-shadow:0 0 8px rgba(56,189,248,0.2);">
              ● ALL ENGINES ACTIVE
            </span>
          </div>
        </div>
        <div class="spec-label">
          <span class="ok">✔ COMPLIANT:</span> Standardized to <strong>Tactical Blue (#0284c7) &amp; Tactical Cyan (#38bdf8)</strong>
        </div>
      </div>
    </div>
  </div>

</body>
</html>
`;

async function main() {
  const tmpHtml = path.join(artifactDir, 'detailed_comparison_boards.html');
  fs.writeFileSync(tmpHtml, htmlTemplate, 'utf8');

  console.log('Launching browser with 2x scale factor for pixel-perfect captures...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1100, height: 2600 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Rendering detailed comparison boards HTML...');
  await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(800);

  // Capture master comparison matrix (Board 7)
  const masterPath = path.join(artifactDir, 'comparison_master_sitemap_matrix.png');
  await page.screenshot({ path: masterPath, fullPage: true });
  console.log('✔ comparison_master_sitemap_matrix.png captured');

  // Capture each individual board for crystal clear embeddings
  const boards = [
    { id: '#board-star-avatar', name: 'comparison_board_star_avatar.png' },
    { id: '#board-test-runner', name: 'comparison_board_test_runner.png' },
    { id: '#board-wita-analytics', name: 'comparison_board_wita_analytics.png' },
    { id: '#board-duplicate-resolvers', name: 'comparison_board_duplicate_resolvers.png' },
    { id: '#board-time-popovers-vocab', name: 'comparison_board_time_popovers_vocab.png' },
    { id: '#board-roster-promotion-dot', name: 'comparison_board_roster_promotion_dot.png' }
  ];

  for (const b of boards) {
    const el = page.locator(b.id);
    const targetPath = path.join(artifactDir, b.name);
    await el.screenshot({ path: targetPath });
    console.log(`✔ ${b.name} captured`);
  }

  await browser.close();
  console.log('🎉 All 7 side-by-side comparison boards rendered and captured successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
