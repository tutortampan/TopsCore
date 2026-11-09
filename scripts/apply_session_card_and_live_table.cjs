const fs = require('fs');

const filePath = 'js/admin/tests-access.js';
let content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');

// 1. Replace modal markup
const oldModalContainer = `        <!-- Student Cards Container -->
        <div id="live-modal-students-container" style="padding:16px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:10px;">
          <!-- Populated dynamically -->
        </div>`;

const newModalContainer = `        <!-- Sortable Live Monitor Table Container -->
        <div style="padding:14px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column;">
          <div class="live-monitor-table-wrapper">
            <table class="live-monitor-table">
              <thead>
                <tr>
                  <th class="sortable-th" data-sort-key="name">NAMA <span class="sort-icon" id="th-sort-name">⇅</span></th>
                  <th class="sortable-th" data-sort-key="status">STATUS TEST <span class="sort-icon" id="th-sort-status">⇅</span></th>
                  <th class="sortable-th" data-sort-key="progress">PROGRESS <span class="sort-icon" id="th-sort-progress">⇅</span></th>
                  <th class="sortable-th" data-sort-key="score">SCORE (REALTIME) <span class="sort-icon" id="th-sort-score">⇅</span></th>
                  <th style="text-align: center; width: 85px;">PEEK</th>
                  <th class="sortable-th" data-sort-key="alarm" style="text-align: center; width: 120px;">ALARM <span class="sort-icon" id="th-sort-alarm">⇅</span></th>
                  <th style="text-align: right; width: 190px;">ACTION</th>
                </tr>
              </thead>
              <tbody id="live-modal-table-body">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>
          <div id="live-modal-students-container" style="display:none;"></div>
        </div>`;

if (!content.includes(oldModalContainer)) {
  throw new Error('oldModalContainer not found in file!');
}
content = content.replace(oldModalContainer, newModalContainer);
console.log('Step 1: Modal container replaced.');

// 2. Replace renderThemeCard
const startThemeIdx = content.indexOf('function renderThemeCard(theme, context) {');
const endThemeMarker = '/**\n * Event binding and interactive modal controller\n */';
const endThemeIdx = content.indexOf(endThemeMarker, startThemeIdx);

if (startThemeIdx === -1 || endThemeIdx === -1) {
  throw new Error('renderThemeCard boundaries not found!');
}

const newRenderThemeCard = `function renderThemeCard(theme, context) {
  const { code, name, color, bgRgba, borderRgba, wordsTest, phrasesTest, tasks, isLive, remainingMinutes, liveBatchName, allowedStudentIds = [], isRemedial } = theme;
  const durationMins = wordsTest?.working_duration_minutes || phrasesTest?.working_duration_minutes || 60;
  const enrolledCount = (allowedStudentIds && allowedStudentIds.length) ? allowedStudentIds.length : 0;

  // Row 1: Test Metadata Header (Deep Navy #021a44 block)
  const metadataBlock = \`
    <div class="card-block-metadata">
      <div class="card-meta-top" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
        <span class="theme-pill" style="font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; padding:2px 8px; border-radius:4px; background:\${bgRgba}; color:\${color}; border:1px solid \${borderRgba};">
          THEME \${code}
        </span>
        <div style="display:flex; align-items:center; gap:8px;">
          \${isLive ? \`
            <span style="font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:4px; \${isRemedial ? 'background:rgba(255,255,0,0.25); border:1px solid #FFFF00; color:#FFFF00;' : 'background:rgba(0,192,0,0.25); border:1px solid #00c000; color:#86efac;'}">
              🟢 LIVE (\${remainingMinutes}m left)
            </span>
            <span class="duration-badge" style="font-size:0.72rem; font-weight:700; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:2px 7px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
              👥 \${escapeHtml(liveBatchName || '')} (\${enrolledCount} Siswa)
            </span>
          \` : \`
            <span class="duration-badge" style="font-size:0.72rem; font-weight:700; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:2px 7px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);" title="Official Exam Duration">
              <span>⏱️</span> \${durationMins} Mins
            </span>
            <span style="font-size:0.72rem; color:#94a3b8; font-weight:600;">
              \${wordsTest && phrasesTest ? '2 Modules' : '1 Module'}
            </span>
          \`}
        </div>
      </div>
      <h4 style="margin:2px 0 0; font-size:1.15rem; font-weight:900; color:#ffffff;">
        \${escapeHtml(name)} Test
      </h4>
      <div style="font-size:0.75rem; color:#93c5fd; margin-top:2px; display:flex; gap:8px;">
        <span>📝 Words (Written)</span>
        <span>&bull;</span>
        <span>💬 Phrases (Dropdown)</span>
      </div>
    </div>
  \`;

  // Row 2: Primary Action Row (Height 54px)
  let row2Content = '';
  if (isLive) {
    // LIVE VIEW: Full width button in Row 2 (Deep Navy / Royal Blue glow)
    row2Content = \`
      <div style="height:54px;">
        <button type="button" class="btn btn-wireframe-live-view btn-theme-live-monitor" data-theme="\${code}">
          <span>👁️</span> LIVE VIEW &bull; MONITOR REALTIME (\${enrolledCount} SISWA)
        </button>
      </div>
    \`;
  } else {
    // NORMAL (Green #00a82d) | REMIDI (Yellow #ffe600 with dark slate text #0f172a)
    row2Content = \`
      <div class="card-block-row-buttons">
        <button type="button" class="btn btn-wireframe-normal btn-theme-open-session" data-theme="\${code}" data-mode="normal" title="Buka Sesi Normal (Nilai Penuh)">
          <span>🟢</span> NORMAL
        </button>
        <button type="button" class="btn btn-wireframe-remidi btn-theme-open-session" data-theme="\${code}" data-mode="remedial" title="Buka Sesi Remedial (Maksimal 60%)">
          <span>🟡</span> REMIDI
        </button>
      </div>
    \`;
  }

  // Row 3: Status / Secondary Controls (Height 54px)
  let row3Content = '';
  if (isLive) {
    // +LATE STUDENTS (Green) | EDIT TIME (Yellow) | CLOSE SESSION (Red)
    row3Content = \`
      <div class="card-block-row-buttons" style="position:relative;">
        <!-- 1. +Late Students -->
        <button type="button" class="btn btn-wireframe-late btn-theme-add-late" data-theme="\${code}" title="Tambah Siswa Susulan / Late Arrivals">
          <span>👥</span> +LATE STUDENTS
        </button>

        <!-- 2. Edit Time (Yellow with Dropdown Popover) -->
        <div style="position:relative; flex:1; height:100%;">
          <button type="button" class="btn btn-wireframe-edit-time btn-card-add-time" data-theme="\${code}" style="width:100%;" title="Perpanjang Waktu Ujian">
            <span>⏱️</span> EDIT TIME
          </button>
          <div id="card-add-time-menu-\${code}" class="card-add-time-menu" style="display:none; position:absolute; left:0; bottom:calc(100% + 6px); background:#0f172a; border:1px solid rgba(255,255,255,0.18); border-radius:8px; box-shadow:0 12px 30px rgba(0,0,0,0.85); z-index:99999; min-width:175px; padding:6px; flex-direction:column; gap:3px;">
            <div style="font-size:0.68rem; font-weight:700; color:#94a3b8; padding:3px 6px; border-bottom:1px solid rgba(255,255,255,0.08);">Perpanjang Ujian Theme \${code}:</div>
            <button type="button" class="btn-card-add-time-opt" data-theme="\${code}" data-mins="5" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:6px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
              <span>⏱️ +5 Menit</span><span style="font-size:0.65rem; color:#38bdf8;">Quick</span>
            </button>
            <button type="button" class="btn-card-add-time-opt" data-theme="\${code}" data-mins="10" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:6px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
              <span>⏱️ +10 Menit</span><span style="font-size:0.65rem; color:#38bdf8;">Quick</span>
            </button>
            <button type="button" class="btn-card-add-time-opt" data-theme="\${code}" data-mins="15" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:6px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
              <span>⏱️ +15 Menit</span><span style="font-size:0.65rem; color:#38bdf8;">Quick</span>
            </button>
            <button type="button" class="btn-card-add-time-opt" data-theme="\${code}" data-mins="30" style="text-align:left; background:transparent; border:none; color:#ffffff; padding:6px 8px; border-radius:4px; font-size:0.75rem; font-weight:600; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
              <span>⏱️ +30 Menit</span><span style="font-size:0.65rem; color:#38bdf8;">Quick</span>
            </button>
            <button type="button" class="btn-card-add-time-custom" data-theme="\${code}" style="text-align:left; background:rgba(255,255,255,0.06); border:none; color:#fbbf24; padding:6px 8px; border-radius:4px; font-size:0.75rem; font-weight:700; cursor:pointer; margin-top:2px;">
              ⚙️ Kustom Menit...
            </button>
          </div>
        </div>

        <!-- 3. Close Session -->
        <button type="button" class="btn btn-wireframe-close btn-theme-close-session" data-theme="\${code}" title="Tutup Sesi Ujian Aktif">
          <span>🔒</span> CLOSE SESSION
        </button>
      </div>
    \`;
  } else {
    // LOCKED (Red #e60000)
    row3Content = \`
      <div class="box-wireframe-locked">
        <div style="font-size:0.88rem; font-weight:900; display:flex; align-items:center; gap:6px;">
          <span>🔒</span> LOCKED &bull; NO ACTIVE SESSION
        </div>
        <div style="font-size:0.72rem; color:#fecaca; margin-top:2px; font-weight:600;">
          Prerequisites: \${tasks.length} Quizzes Theme \${code} (Min 60%)
        </div>
      </div>
    \`;
  }

  return \`
    <div class="theme-test-card-frame" style="border: 2px solid \${borderRgba}; background: \${bgRgba};">
      <div class="theme-test-card-inner">
        \${metadataBlock}
        \${row2Content}
        \${row3Content}
      </div>
    </div>
  \`;
}\n\n`;

content = content.substring(0, startThemeIdx) + newRenderThemeCard + content.substring(endThemeIdx);
console.log('Step 2: renderThemeCard replaced.');

// 3. Update openThemeLiveMonitorModal to initialize sorting and attach headers
const oldModalInitTarget = `  const remainingEl = modal.querySelector('#live-modal-remaining');
  const studentsContainer = modal.querySelector('#live-modal-students-container');
  const autoPollCheckbox = modal.querySelector('#live-modal-auto-poll');`;

const newModalInitTarget = `  const remainingEl = modal.querySelector('#live-modal-remaining');
  const studentsContainer = modal.querySelector('#live-modal-students-container');
  const tableBody = modal.querySelector('#live-modal-table-body') || studentsContainer;
  const autoPollCheckbox = modal.querySelector('#live-modal-auto-poll');`;

if (!content.includes(oldModalInitTarget)) {
  throw new Error('oldModalInitTarget not found!');
}
content = content.replace(oldModalInitTarget, newModalInitTarget);

const oldSearchInitTarget = `  if (searchInput) searchInput.value = '';
  _liveMonitorSearchQuery = '';
  _liveMonitorActiveFilter = 'all';`;

const newSearchInitTarget = `  if (searchInput) searchInput.value = '';
  _liveMonitorSearchQuery = '';
  _liveMonitorActiveFilter = 'all';
  let _liveSortKey = 'alarm';
  let _liveSortDirection = 'desc';

  // Attach header sort click listeners
  modal.querySelectorAll('.sortable-th').forEach(th => {
    th.onclick = (e) => {
      const key = e.currentTarget.getAttribute('data-sort-key');
      if (_liveSortKey === key) {
        _liveSortDirection = _liveSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        _liveSortKey = key;
        _liveSortDirection = (key === 'name') ? 'asc' : 'desc';
      }
      renderLiveMonitorUI();
    };
  });`;

if (!content.includes(oldSearchInitTarget)) {
  throw new Error('oldSearchInitTarget not found!');
}
content = content.replace(oldSearchInitTarget, newSearchInitTarget);
console.log('Step 3: openThemeLiveMonitorModal sort init added.');

// 4. Update renderLiveMonitorUI
const oldRenderLiveUIStart = `    // Sort: alarms first, then in_progress, then submitted, then not_started
    displayList.sort((a, b) => {
      if (b.alarmCount !== a.alarmCount) return b.alarmCount - a.alarmCount;
      const order = { 'in_progress': 1, 'submitted': 2, 'not_started': 3, 'cancelled': 4 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return (a.student.name || '').localeCompare(b.student.name || '');
    });`;

const newRenderLiveUIStart = `    // Dynamic Column Sorting
    displayList.sort((a, b) => {
      let cmp = 0;
      if (_liveSortKey === 'name') {
        cmp = (a.student.name || '').localeCompare(b.student.name || '');
      } else if (_liveSortKey === 'status') {
        const order = { 'in_progress': 1, 'submitted': 2, 'not_started': 3, 'cancelled': 4 };
        cmp = (order[a.status] || 5) - (order[b.status] || 5);
      } else if (_liveSortKey === 'progress') {
        cmp = (a.answeredPercent || 0) - (b.answeredPercent || 0);
      } else if (_liveSortKey === 'score') {
        const sA = a.isEvaluated ? a.effectiveScore : -1;
        const sB = b.isEvaluated ? b.effectiveScore : -1;
        cmp = sA - sB;
      } else if (_liveSortKey === 'alarm') {
        cmp = (a.alarmCount || 0) - (b.alarmCount || 0);
      }
      return _liveSortDirection === 'asc' ? cmp : -cmp;
    });

    // Update Header Sort Icons
    modal.querySelectorAll('.sortable-th').forEach(th => {
      const key = th.getAttribute('data-sort-key');
      const icon = th.querySelector('.sort-icon');
      if (key === _liveSortKey) {
        th.classList.add('active-sort');
        if (icon) icon.textContent = _liveSortDirection === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('active-sort');
        if (icon) icon.textContent = '⇅';
      }
    });`;

if (!content.includes(oldRenderLiveUIStart)) {
  throw new Error('oldRenderLiveUIStart not found!');
}
content = content.replace(oldRenderLiveUIStart, newRenderLiveUIStart);

// Replace the rendering inside renderLiveMonitorUI
const oldEmptyTarget = `    if (displayList.length === 0) {
      studentsContainer.innerHTML = \`
        <div style="padding: 30px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
          \${q ? \`Tidak ada siswa yang cocok dengan "\${escapeHtml(q)}".\` : 'Tidak ada siswa pada filter ini.'}
        </div>
      \`;
      return;
    }`;

const newEmptyTarget = `    if (displayList.length === 0) {
      tableBody.innerHTML = \`
        <tr>
          <td colspan="7" style="padding: 40px 20px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
            \${q ? \`Tidak ada siswa yang cocok dengan "\${escapeHtml(q)}".\` : 'Tidak ada siswa pada filter ini.'}
          </td>
        </tr>
      \`;
      return;
    }`;

if (!content.includes(oldEmptyTarget)) {
  throw new Error('oldEmptyTarget not found!');
}
content = content.replace(oldEmptyTarget, newEmptyTarget);

// Replace studentsContainer.innerHTML = displayList.map(...
const oldMapStart = 'studentsContainer.innerHTML = displayList.map(item => {';
const oldMapEnd = `    // Attach kick listener
    studentsContainer.querySelectorAll('.btn-kick-student').forEach(btn => {`;

const startMapIdx = content.indexOf(oldMapStart);
const endMapIdx = content.indexOf(oldMapEnd);

if (startMapIdx === -1 || endMapIdx === -1) {
  throw new Error('Map section boundaries not found!');
}

const newMapContent = `tableBody.innerHTML = displayList.map(item => {
      const s = item.student;
      const initial = (s.name || 'S').charAt(0).toUpperCase();
      const scoreColor = item.isEvaluated ? getGradeColorByScore(item.effectiveScore) : '#64748b';
      const isRemedialCap = theme.isRemedial;
      const scoreDisplay = item.isEvaluated 
        ? \`\${item.effectiveScore}%\${isRemedialCap ? '<sup style="font-size:0.65em; font-weight:900; color:inherit; margin-left:1px;">R</sup>' : ''}\`
        : '--';

      const isStar = item.isEvaluated && (item.grade === '★' || item.grade === 'Star' || item.grade === 'S' || item.effectiveScore === 100);
      const gradeText = isStar ? '★' : (item.isEvaluated ? item.grade : '-');
      const circleText = isStar ? '#ffffff' : (item.isEvaluated ? '#0f172a' : '#64748b');
      const circleClass = isStar ? 'grade-circle-star' : \`grade-circle-\${(item.grade || 'e').toLowerCase()}\`;

      const gradeCircleHtml = item.isEvaluated ? \`
        <div class="grade-circle \${circleClass}" style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; font-weight: 800; background: \${scoreColor}; color: \${circleText}; box-shadow: 0 0 8px \${scoreColor}; flex-shrink: 0;">
          \${gradeText}
        </div>
      \` : \`
        <div style="width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: rgba(255,255,255,0.06); color: #64748b; border: 1px dashed rgba(255,255,255,0.15); flex-shrink: 0;">
          -
        </div>
      \`;

      const hasAlarmAlert = item.alarmCount > 0;
      const rowClass = hasAlarmAlert ? 'live-table-row row-alarm-highlight' : 'live-table-row';

      return \`
        <tr class="\${rowClass}">
          <!-- 1. NAMA -->
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="position:relative; width:34px; height:34px; flex-shrink:0;">
                <div style="width:100%; height:100%; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
                  \${initial}
                </div>
                \${item.isPulsing ? \`
                  <span style="position:absolute; bottom:-1px; right:-1px; width:11px; height:11px; border-radius:50%; background:\${item.heartbeatColor}; border:2px solid #0b1329; box-shadow:0 0 6px \${item.heartbeatColor}; animation:pulse 1.5s infinite;"></span>
                \` : \`
                  <span style="position:absolute; bottom:-1px; right:-1px; width:9px; height:9px; border-radius:50%; background:\${item.heartbeatColor}; border:2px solid #0b1329;"></span>
                \`}
              </div>
              <div>
                <div style="font-size:0.88rem; font-weight:700; color:#ffffff;">\${escapeHtml(s.name || 'Unnamed')}</div>
                <div style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:4px; margin-top:2px;">
                  <span style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:3px; border:1px solid rgba(255,255,255,0.08);">\${escapeHtml(theme.liveBatchName || '')}</span>
                </div>
              </div>
            </div>
          </td>

          <!-- 2. STATUS TEST -->
          <td>
            <div style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:5px; background:rgba(255,255,255,0.05); color:\${item.heartbeatColor}; border:1px solid rgba(255,255,255,0.08);">
              <span style="width:7px; height:7px; border-radius:50%; background:\${item.heartbeatColor};"></span>
              \${item.heartbeatText}
            </div>
            <div style="font-size:0.72rem; color:#cbd5e1; font-weight:600; margin-top:3px;">
              \${escapeHtml(item.activeModule || 'Exam')}
            </div>
          </td>

          <!-- 3. PROGRESS -->
          <td style="min-width: 170px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
              <span style="color:#94a3b8;">Soal:</span>
              <span style="font-weight:800; color:#ffffff;">\${item.answeredCount} / \${item.totalQuestions} (\${item.answeredPercent}%)</span>
            </div>
            <div style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
              <div style="height:100%; width:\${item.answeredPercent}%; background:linear-gradient(90deg, #3b82f6, #00c000ff); border-radius:3px; transition:width 0.3s ease;"></div>
            </div>
            <div style="font-size:0.7rem; color:#94a3b8; margin-top:3px; display:flex; align-items:center; gap:4px;">
              <span style="color:#cbd5e1;">\${item.activityFeed}</span>
              \${item.velocityText ? \`<span style="color:#38bdf8; font-weight:700;">&bull; \${item.velocityText}</span>\` : ''}
            </div>
          </td>

          <!-- 4. SCORE (REALTIME) -->
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              \${gradeCircleHtml}
              <div>
                <div style="font-size:0.92rem; font-weight:800; color:\${scoreColor};">
                  \${scoreDisplay}
                </div>
                <div style="font-size:0.7rem; color:#94a3b8;">
                  \${item.scoreLabel}
                </div>
              </div>
            </div>
          </td>

          <!-- 5. PEEK -->
          <td style="text-align:center;">
            <button type="button" class="btn btn-xs btn-inspect-student-answers" data-student-id="\${s.id}" data-student-name="\${escapeHtml(s.name || '')}" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-weight:700; font-size:0.75rem; padding:5px 9px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; cursor:pointer;" title="Intip lembar jawaban & riwayat pengerjaan siswa">
              <span>👁️</span> Intip
            </button>
          </td>

          <!-- 6. ALARM -->
          <td style="text-align:center;">
            \${item.alarmCount === 0 ? \`
              <span style="font-size:0.75rem; font-weight:700; color:#34d399; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px;">
                🛡️ 0x Bersih
              </span>
            \` : \`
              <span class="btn-inspect-student-alarms" data-student-id="\${s.id}" data-student-name="\${escapeHtml(s.name || '')}" style="font-size:0.75rem; font-weight:800; color:#FF0000; background:rgba(255,0,0,0.2); border:1px solid #FF0000; padding:3px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; box-shadow:0 0 10px rgba(255,0,0,0.3); cursor:pointer;" title="Klik untuk lihat rincian \${item.alarmCount}x alarm anti-cheat">
                🚨 \${item.alarmCount}x ALARM 🔍
              </span>
            \`}
          </td>

          <!-- 7. ACTION -->
          <td style="text-align:right;">
            <div style="display:inline-flex; align-items:center; gap:5px; justify-content:flex-end;">
              \${item.targetAtt && item.status === 'in_progress' ? \`
                <button type="button" class="btn btn-xs btn-student-add-time" data-attempt-id="\${item.targetAtt.id}" data-student-name="\${escapeHtml(s.name || '')}" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="Beri tambahan waktu khusus siswa ini (+10m)">
                  <span>⏱️</span> +Waktu
                </button>
              \` : ''}

              \${item.targetAtt && (item.status === 'submitted' || item.status === 'cancelled') ? \`
                <button type="button" class="btn btn-xs btn-student-reopen-attempt" data-attempt-id="\${item.targetAtt.id}" data-student-name="\${escapeHtml(s.name || '')}" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="Buka kembali sesi ujian siswa ini (Resume Attempt)">
                  <span>🔄</span> Resume
                </button>
              \` : ''}

              <button type="button" class="btn btn-xs btn-kick-student" data-student-id="\${s.id}" data-student-name="\${escapeHtml(s.name || '')}" style="background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.35); color:#ff6b6b; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; display:inline-flex; align-items:center; gap:3px; cursor:pointer;" title="Keluarkan siswa dari sesi ujian">
                <span>🚫</span> Keluarkan
              </button>
            </div>
          </td>
        </tr>
      \`;
    }).join('');\n\n`;

content = content.substring(0, startMapIdx) + newMapContent + content.substring(endMapIdx);
console.log('Step 4: Table rows rendering updated.');

// 5. Update studentsContainer queries to tableBody queries for listeners
content = content.replace(/studentsContainer\.querySelectorAll/g, 'tableBody.querySelectorAll');
console.log('Step 5: Event listeners redirected to tableBody.');

// Write back file
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS: tests-access.js updated successfully!');

