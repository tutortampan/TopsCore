/**
 * TopsCore LMS — Class & Batch Attendance Matrix (CEC)
 *
 * Rules:
 * - Vocabulary Class: 24 Meetings (Mon – Sat, 6 days/week), Divider after every 6 meetings.
 * - Non-Vocabulary Classes (Speaking, Storytelling, Grammar, Basic): 20 Meetings (Mon – Fri, 5 days/week), Divider after every 5 meetings.
 * - Header shows M1..M20/24 with auto-timestamp (date and time) when session exists.
 * - Sel allows manual quick toggle: PRESENT (P) -> EXCUSED (E) -> SICK (S) -> ABSENT (A) -> CLEAR.
 */

import { getSupabase } from '../supabase.js';
import { isVocabularyClass, getGradeColorByScore } from '../grading.js?v=20261106_v160';
import { showToast, escapeHtml } from '../app.js?v=20261106_v160';

export function getMeetingsConfigForClass(classObjOrName) {
  const isVocab = isVocabularyClass(classObjOrName);
  return {
    isVocab,
    totalMeetings: isVocab ? 24 : 20,
    weekDays: isVocab ? 6 : 5,
    weekCount: 4,
    scheduleDaysText: isVocab ? 'Mon – Sat (6 days/week)' : 'Mon – Fri (5 days/week)'
  };
}

export async function renderClassMeetingsAttendance(container, context = {}) {
  if (!container) return;
  const {
    classId,
    className,
    currentClass,
    batchId = null,
    activeBatchStudents = [],
    allBatches = [],
    allLevels = [],
    batchMap = {},
    levelMap = {},
    showPic = false,
    skipInfobar = false
  } = context;

  const cfg = getMeetingsConfigForClass(currentClass || className);
  const isCampClass = Boolean(
    (className && /camp/i.test(className)) ||
    (currentClass?.name && /camp/i.test(currentClass.name))
  );
  const identityColSpan = 3;

  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; height:200px; color:#94a3b8; font-size:12px;">
      Loading attendance matrix for ${escapeHtml(className || 'Class')} (${cfg.totalMeetings} meetings)...
    </div>
  `;

  try {
    const sb = await getSupabase();
    // 1. Fetch class sessions
    let sessQuery = sb
      .from('class_sessions')
      .select('id, class_id, batch_id, session_number, session_type, status, created_at, closed_at')
      .eq('class_id', classId);
    if (batchId) sessQuery = sessQuery.eq('batch_id', batchId);
    const { data: sessions, error: sessErr } = await sessQuery.order('session_number', { ascending: true });

    if (sessErr) {
      console.warn('[renderClassMeetingsAttendance] sessions fetch error:', sessErr);
    }

    const sessionByNum = new Map();
    (sessions || []).forEach(sess => {
      if (sess.session_number && !sessionByNum.has(Number(sess.session_number))) {
        sessionByNum.set(Number(sess.session_number), sess);
      }
    });

    // 2. Fetch session attendance for existing sessions
    const sessionIds = (sessions || []).map(s => s.id);
    const attMap = new Map(); // key: `${student_id}::${session_number}`
    if (sessionIds.length > 0) {
      const { data: attList, error: attErr } = await sb
        .from('session_attendance')
        .select('id, session_id, student_id, status, method, created_at')
        .in('session_id', sessionIds);

      if (!attErr && attList) {
        const sessIdToNum = new Map((sessions || []).map(s => [s.id, Number(s.session_number)]));
        attList.forEach(a => {
          const sNum = sessIdToNum.get(a.session_id);
          if (sNum) {
            attMap.set(`${a.student_id}::${sNum}`, a);
          }
        });
      }
    }

    // 3. Build Two-Tier Sticky Header (Row 1: Super-Headers, Row 2: Sub-Headers)
    let superHeadersHtml = `
      <tr>
        <th colspan="${identityColSpan}" class="super-hdr super-hdr-identity super-hdr-students-data col-sticky-group-hdr">
          STUDENTS DATA
        </th>
    `;

    for (let w = 1; w <= cfg.weekCount; w++) {
      const startM = (w - 1) * cfg.weekDays + 1;
      const endM = w * cfg.weekDays;
      superHeadersHtml += `
        <th colspan="${cfg.weekDays}" class="col-week-end" style="background:#111827; color:#38bdf8;">
          WEEK ${w} (M${startM}–M${endM})
        </th>
      `;
    }

    superHeadersHtml += `
        <th colspan="5" class="super-hdr super-hdr-overall" style="background:#0b1120 !important; color:#ffffff !important; border-bottom:1px solid rgba(255,255,255,0.15); height:30px; text-align:center;">
          ATTENDANCE RECAP
        </th>
      </tr>
    `;

    let subHeadersHtml = `<tr>
      <th class="att-col-lvl col-sticky" title="${isCampClass ? 'Academic Step' : 'Academic Level'}">${isCampClass ? 'STEP' : 'LVL'}</th>
      <th class="att-col-btc col-sticky" title="Cohort Batch" style="color:#38bdf8;">BTC</th>
      <th class="att-col-name col-sticky" title="Student Full Name" style="text-align:left; padding-left:10px; color:#ffffff;">STUDENT NAME</th>
    `;
    for (let m = 1; m <= cfg.totalMeetings; m++) {
      const isWeekEnd = (m % cfg.weekDays === 0);
      const sess = sessionByNum.get(m);
      let timeHtml = `<span class="hdr-timestamp" id="hdr-time-m-${m}" style="opacity:0.35;">—</span>`;
      if (sess && sess.created_at) {
        const d = new Date(sess.created_at);
        const dtStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
        const tmStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        timeHtml = `<span class="hdr-timestamp" id="hdr-time-m-${m}" title="${sess.session_type || 'REGULAR'} Session">${dtStr} ${tmStr}</span>`;
      }
      subHeadersHtml += `
        <th class="col-meeting-th ${isWeekEnd ? 'col-week-end' : ''}" style="width:50px; min-width:50px;" data-session-num="${m}">
          <span class="hdr-meeting-num">M${m}</span>
          ${timeHtml}
        </th>
      `;
    }

    subHeadersHtml += `
      <th style="width:36px; text-align:center; color:var(--grade-a, #00c000); background:#1e293b;" title="Present">P</th>
      <th style="width:36px; text-align:center; color:var(--primary-tactical, #38bdf8); background:#1e293b;" title="Excused">E</th>
      <th style="width:36px; text-align:center; color:var(--grade-c, #ffff00); background:#1e293b;" title="Sick">S</th>
      <th style="width:36px; text-align:center; color:var(--grade-e, #ff0000); background:#1e293b;" title="Absent">A</th>
      <th style="width:54px; text-align:center; color:#ffffff; background:#1e293b;" title="Attendance Rate">RATE</th>
    </tr>`;

    // 4. Build Table Rows
    let rowsHtml = '';
    const sortedStudents = (activeBatchStudents || []).slice().sort((a, b) =>
      (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { numeric: true })
    );

    sortedStudents.forEach(st => {
      // 1. Resolve Batch Name / Number cleanly
      const rawBatch = st.batchName || (batchMap && batchMap[st.batch_id]?.name) || (allBatches && allBatches.find(b => b.id === st.batch_id)?.name) || '';
      const batchNumStr = rawBatch ? rawBatch.replace(/^(Camp|Batch|TOP|CEC)\s*/i, '').trim() || rawBatch : '—';

      // 2. Resolve Academic Level SSOT (Never UUID)
      let rawLvl = st.studentLevelNum || st.level_number;
      if (!rawLvl && levelMap && st.level_id) {
        rawLvl = levelMap[st.level_id]?.level_number || levelMap[st.level_id]?.name;
      }
      if (!rawLvl && allLevels && st.level_id) {
        const foundLvl = allLevels.find(l => l.id === st.level_id);
        rawLvl = foundLvl?.level_number || foundLvl?.name;
      }
      if (!rawLvl && st.levelName && !st.levelName.includes('-')) {
        rawLvl = st.levelName;
      }
      if (!rawLvl && currentClass) {
        rawLvl = currentClass.level_number || currentClass.level || currentClass.levels?.level_number || currentClass.levels?.name;
        if (!rawLvl && currentClass.name) {
          const m = currentClass.name.match(/\b([1-3]|1st|2nd|3rd)\b/i);
          if (m) rawLvl = m[1];
        }
      }
      let lvlDisplay = typeof toShortLevel === 'function' ? toShortLevel(rawLvl) : (rawLvl ? String(rawLvl) : '3rd');
      if (!lvlDisplay || lvlDisplay === '—' || lvlDisplay.length > 5 || lvlDisplay.includes('-')) {
        if (currentClass?.name && /3|3rd/i.test(currentClass.name)) lvlDisplay = '3rd';
        else if (currentClass?.name && /2|2nd/i.test(currentClass.name)) lvlDisplay = '2nd';
        else if (currentClass?.name && /1|1st/i.test(currentClass.name)) lvlDisplay = '1st';
        else if (currentClass?.name && /0|non-level|evnikom|sheraton|tamata/i.test(currentClass.name)) lvlDisplay = '0';
        else lvlDisplay = '3rd';
      }

      const picHtml = st.photo_url
        ? `<img src="${escapeHtml(st.photo_url)}" alt="" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />`
        : `<div style="width:24px; height:24px; border-radius:50%; background:#1e293b; color:#94a3b8; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">${escapeHtml((st.name || '?').charAt(0))}</div>`;

      let presentCount = 0;
      let excusedCount = 0;
      let sickCount = 0;
      let absentCount = 0;

      let cellsHtml = '';
      for (let m = 1; m <= cfg.totalMeetings; m++) {
        const isWeekEnd = (m % cfg.weekDays === 0);
        const att = attMap.get(`${st.id}::${m}`);
        const status = att ? att.status : '';

        let badgeClass = 'badge-empty';
        let badgeChar = '—';
        if (status === 'PRESENT' || status.startsWith('PRESENT')) {
          badgeClass = 'badge-p';
          badgeChar = 'P';
          presentCount++;
        } else if (status === 'EXCUSED') {
          badgeClass = 'badge-e';
          badgeChar = 'E';
          excusedCount++;
        } else if (status === 'SICK') {
          badgeClass = 'badge-s';
          badgeChar = 'S';
          sickCount++;
        } else if (status === 'ABSENT' || status === 'ALPHA') {
          badgeClass = 'badge-a';
          badgeChar = 'A';
          absentCount++;
        }

        cellsHtml += `
          <td class="${isWeekEnd ? 'col-week-end' : ''}" style="text-align:center; padding:2px;">
            <span class="att-cell-badge ${badgeClass}"
                  data-student-id="${st.id}"
                  data-student-name="${escapeHtml(st.displayName || st.name)}"
                  data-batch-id="${st.batch_id || ''}"
                  data-session-num="${m}"
                  data-status="${status}"
                  title="Click to change: M${m} - ${status || 'Unrecorded'}">
              ${badgeChar}
            </span>
          </td>
        `;
      }

      const totalRecorded = presentCount + excusedCount + sickCount + absentCount;
      const ratePct = totalRecorded > 0 ? Math.round((presentCount / totalRecorded) * 100) : 0;
      const rateColor = totalRecorded === 0 ? '#64748b' : (
        ratePct >= 90 ? 'var(--grade-a, #00c000)' : (
          ratePct >= 80 ? 'var(--grade-b, #95ff00)' : (
            ratePct >= 60 ? 'var(--grade-c, #ffff00)' : 'var(--grade-e, #ff0000)'
          )
        )
      );

      rowsHtml += `
        <tr data-student-id="${st.id}">
          <td class="att-col-lvl col-sticky" style="text-align:center; font-weight:700; color:#f8fafc; font-size:12px;">${escapeHtml(lvlDisplay)}</td>
          <td class="att-col-btc col-sticky" style="text-align:center; color:#38bdf8; font-variant-numeric:tabular-nums; font-size:12px;" title="Batch ${escapeHtml(rawBatch)}">${escapeHtml(batchNumStr)}</td>
          <td class="att-col-name col-sticky" style="font-weight:600; color:#f1f5f9; padding-left:10px; font-size:12px;" title="${escapeHtml(st.displayName || st.name)}">
            ${escapeHtml(st.displayName || st.name)}
          </td>
          ${cellsHtml}
          <td style="text-align:center; font-weight:700; color:var(--grade-a, #00c000); font-size:12px;" class="sum-p">${presentCount}</td>
          <td style="text-align:center; font-weight:700; color:var(--primary-tactical, #38bdf8); font-size:12px;" class="sum-e">${excusedCount}</td>
          <td style="text-align:center; font-weight:700; color:var(--grade-c, #ffff00); font-size:12px;" class="sum-s">${sickCount}</td>
          <td style="text-align:center; font-weight:700; color:var(--grade-e, #ff0000); font-size:12px;" class="sum-a">${absentCount}</td>
          <td style="text-align:center; font-weight:800; color:${rateColor}; font-size:12px; font-variant-numeric:tabular-nums;" class="sum-rate">${totalRecorded > 0 ? ratePct + '%' : '—'}</td>
        </tr>
      `;
    });

    if (sortedStudents.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="${identityColSpan + cfg.totalMeetings + 5}" style="text-align:center; padding:30px; color:#64748b;">
            No active students enrolled in this class.
          </td>
        </tr>
      `;
    }

    container.innerHTML = `
      <div class="attendance-grid-container" style="flex:1 1 0; min-height:0; height:100%; display:flex; flex-direction:column;">
        <!-- Table Viewport (Strict Top Element Invariant & Direct Ceiling Docking SSOT) -->
        <div class="attendance-grid-table-wrap" style="flex:1 1 0; min-height:0; height:100%; overflow:auto; background:#0f172a;">
          <table class="attendance-grid-table no-pic" id="class-meetings-attendance-table">
            <thead>
              ${superHeadersHtml}
              ${subHeadersHtml}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Dock Class Info & Legend into Lower Sub Panel (Sole SSOT Domain for Legends & Triage per Rule 0.2.3)
    if (!skipInfobar && typeof window.setBottomInfobar === 'function') {
      const leftHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
          <span style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">
            ${escapeHtml(className)} Attendance
          </span>
          <span style="font-size:11px; background:rgba(56,189,248,0.15); color:var(--primary-tactical, #38bdf8); padding:2px 8px; border-radius:12px; font-weight:700;">
            ${cfg.scheduleDaysText}
          </span>
          <span style="font-size:11px; color:#94a3b8;">
            ${cfg.totalMeetings} Meetings Total (Dividers Every ${cfg.weekDays})
          </span>
        </div>
      `;
      const rightHtml = `
        <div style="display:inline-flex; align-items:center; gap:12px; font-size:11px; color:#94a3b8;">
          <span style="display:inline-flex; align-items:center; gap:4px;"><span class="att-cell-badge badge-p" style="width:18px;height:18px;font-size:9px;">P</span> Present</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span class="att-cell-badge badge-e" style="width:18px;height:18px;font-size:9px;">E</span> Excused</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span class="att-cell-badge badge-s" style="width:18px;height:18px;font-size:9px;">S</span> Sick</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span class="att-cell-badge badge-a" style="width:18px;height:18px;font-size:9px;">A</span> Absent</span>
        </div>
      `;
      window.setBottomInfobar(leftHtml, rightHtml);
    }

    // 5. Wire Interactive Sel Click for Manual Attendance
    const tableEl = container.querySelector('#class-meetings-attendance-table');
    if (tableEl) {
      tableEl.addEventListener('click', async (e) => {
        const badge = e.target.closest('.att-cell-badge');
        if (!badge) return;

        const studentId = badge.dataset.studentId;
        const studentName = badge.dataset.studentName || 'Student';
        const batchId = badge.dataset.batchId;
        const sessionNum = parseInt(badge.dataset.sessionNum, 10);
        const currentStatus = badge.dataset.status || '';

        // Cycle: '' -> 'PRESENT' -> 'EXCUSED' -> 'SICK' -> 'ABSENT' -> ''
        let nextStatus = 'PRESENT';
        if (currentStatus === 'PRESENT') nextStatus = 'EXCUSED';
        else if (currentStatus === 'EXCUSED') nextStatus = 'SICK';
        else if (currentStatus === 'SICK') nextStatus = 'ABSENT';
        else if (currentStatus === 'ABSENT') nextStatus = '';

        // Optimistic UI Update
        badge.dataset.status = nextStatus;
        badge.className = 'att-cell-badge ' + (
          nextStatus === 'PRESENT' ? 'badge-p' :
          nextStatus === 'EXCUSED' ? 'badge-e' :
          nextStatus === 'SICK' ? 'badge-s' :
          nextStatus === 'ABSENT' ? 'badge-a' : 'badge-empty'
        );
        badge.textContent = nextStatus ? nextStatus.charAt(0) : '—';
        badge.title = `Click to change: M${sessionNum} - ${nextStatus || 'Unrecorded'}`;

        // Recalculate row summary
        const row = badge.closest('tr');
        if (row) {
          const allBadges = row.querySelectorAll('.att-cell-badge');
          let rp = 0, re = 0, rs = 0, ra = 0;
          allBadges.forEach(b => {
            const st = b.dataset.status;
            if (st === 'PRESENT') rp++;
            else if (st === 'EXCUSED') re++;
            else if (st === 'SICK') rs++;
            else if (st === 'ABSENT') ra++;
          });
          const rTot = rp + re + rs + ra;
          const rPct = rTot > 0 ? Math.round((rp / rTot) * 100) : 0;
          const sumP = row.querySelector('.sum-p');
          const sumE = row.querySelector('.sum-e');
          const sumS = row.querySelector('.sum-s');
          const sumA = row.querySelector('.sum-a');
          const sumRate = row.querySelector('.sum-rate');
          if (sumP) sumP.textContent = rp;
          if (sumE) sumE.textContent = re;
          if (sumS) sumS.textContent = rs;
          if (sumA) sumA.textContent = ra;
          if (sumRate) {
            sumRate.textContent = rTot > 0 ? rPct + '%' : '—';
            sumRate.style.color = rTot === 0 ? '#64748b' : (
              rPct >= 90 ? 'var(--grade-a, #00c000)' : (
                rPct >= 80 ? 'var(--grade-b, #95ff00)' : (
                  rPct >= 60 ? 'var(--grade-c, #ffff00)' : 'var(--grade-e, #ff0000)'
                )
              )
            );
          }
        }

        // Persist to Supabase Database
        try {
          // Check or create session in class_sessions
          let targetSession = sessionByNum.get(sessionNum);
          if (!targetSession) {
            const { data: newSess, error: newSessErr } = await sb
              .from('class_sessions')
              .insert({
                class_id: classId,
                batch_id: batchId || null,
                session_number: sessionNum,
                session_type: 'REGULAR',
                is_active: false
              })
              .select()
              .single();

            if (!newSessErr && newSess) {
              targetSession = newSess;
              sessionByNum.set(sessionNum, newSess);
              // Update header timestamp
              const hdrTimeEl = container.querySelector(`#hdr-time-m-${sessionNum}`);
              if (hdrTimeEl) {
                const now = new Date();
                const dtStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                const tmStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                hdrTimeEl.textContent = `${dtStr} ${tmStr}`;
                hdrTimeEl.style.opacity = '1';
              }
            }
          }

          if (targetSession) {
            if (nextStatus) {
              await sb.from('session_attendance').upsert({
                session_id: targetSession.id,
                student_id: studentId,
                status: nextStatus,
                method: 'MANUAL'
              }, { onConflict: 'session_id,student_id' });
            } else {
              await sb.from('session_attendance').delete().match({
                session_id: targetSession.id,
                student_id: studentId
              });
            }
          }
          showToast(`M${sessionNum}: ${studentName} -> ${nextStatus || 'CLEAR'}`, 'success');
        } catch(err) {
          console.error('[renderClassMeetingsAttendance] save error:', err);
          showToast('Failed to save attendance change', 'error');
        }
      });
    }

  } catch(err) {
    console.error('[renderClassMeetingsAttendance] fatal error:', err);
    container.innerHTML = `
      <div style="padding:20px; color:var(--grade-e, #ff0000); font-size:12px;">
        Failed to load attendance matrix: ${escapeHtml(err.message || String(err))}
      </div>
    `;
  }
}

export function formatClassShortHeader(cls, levelNumber = 0) {
  if (!cls) return 'CLASS';
  const name = cls.name || '';
  const code = cls.code || '';

  // Explicit ordinal prefix detection
  let lvlPrefix = '';
  if (levelNumber === 1 || /\b1st\b|1vocab|1basic|1story|1gram|1speak/i.test(code + ' ' + name)) lvlPrefix = '1ST ';
  else if (levelNumber === 2 || /\b2nd\b|2vocab|2gfors|2gfs|2story|2gram|2speak/i.test(code + ' ' + name)) lvlPrefix = '2ND ';
  else if (levelNumber === 3 || /\b3rd\b|3vocab|3pron|3story|3gram|3speak/i.test(code + ' ' + name)) lvlPrefix = '3RD ';

  let mod = '';
  if (/vocab|vcb/i.test(code + ' ' + name)) mod = 'VCB';
  else if (/basic|bsc/i.test(code + ' ' + name)) mod = 'BASIC';
  else if (/gfors|gfs|grammar for speaking/i.test(code + ' ' + name)) mod = 'GFS';
  else if (/pron|prn|pronunciation/i.test(code + ' ' + name)) mod = 'PRON';
  else if (/story|stt/i.test(code + ' ' + name)) mod = 'STORY';
  else if (/grammar|grm|gram/i.test(code + ' ' + name)) mod = 'GRAM';
  else if (/speak|spk/i.test(code + ' ' + name)) mod = 'SPEAK';

  if (lvlPrefix && mod) return `${lvlPrefix}${mod}`;

  if (code) {
    const parts = code.split('-');
    if (parts.length >= 2 && !/TASK|EXAM/i.test(parts[1])) return parts[1];
    if (parts.length >= 3 && /VCB|SPK|STT|BSC|GRM/i.test(parts[1])) return parts[1];
  }
  let short = name.replace(/^Camp\s*/i, '').replace(/Attendance/i, '').trim();
  short = short
    .replace(/Vocabulary/i, 'VCB')
    .replace(/Basic English/i, 'BASIC')
    .replace(/Storytelling/i, 'STORY')
    .replace(/Speaking Projects/i, 'SPEAK')
    .replace(/Public Speaking/i, 'SPEAK')
    .replace(/Grammar for Speaking/i, 'GFS')
    .replace(/Pronunciation/i, 'PRON')
    .replace(/Grammar/i, 'GRAM');
  return short.toUpperCase() || 'CLASS';
}

export async function renderBatchAttendance(container, context = {}) {
  if (!container) return;
  const {
    batchId,
    batchName = 'Batch',
    programId,
    levelNumber = 0,
    students = [],
    batchClasses = [],
    allClasses = [],
    allBatches = [],
    allLevels = [],
    batchMap = {},
    levelMap = {}
  } = context;

  // 1. Determine active classes for this batch
  let classesForBatch = (batchClasses && batchClasses.length > 0) ? batchClasses.slice() : [];
  if (classesForBatch.length === 0 && allClasses && allClasses.length > 0) {
    classesForBatch = allClasses.filter(c => {
      if (programId && c.program_id === programId) return true;
      return (c.name || '').toLowerCase().startsWith('camp');
    });
  }

  // Deduplicate classes
  const seenClassIds = new Set();
  classesForBatch = classesForBatch.filter(c => {
    if (!c || !c.id || seenClassIds.has(c.id)) return false;
    seenClassIds.add(c.id);
    return true;
  });

  const isCampProgram = Boolean(
    (batchName && /camp/i.test(batchName)) ||
    (programId && typeof programId === 'string' && /camp/i.test(programId)) ||
    (levelNumber && Number(levelNumber) > 0) ||
    (classesForBatch && classesForBatch.some(c => (c.name || '').toLowerCase().includes('camp')))
  );

  if (classesForBatch.length === 0) {
    container.innerHTML = `<div style="padding:24px; color:#94a3b8; font-size:12px; text-align:center;">No active classes found for this batch.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:center; height:200px; color:#94a3b8; font-size:12px;">
      Loading weekly attendance recap for ${escapeHtml(batchName)} across ${classesForBatch.length} classes...
    </div>
  `;

  try {
    const sb = await getSupabase();
    const classIds = classesForBatch.map(c => c.id);

    // 2. Fetch all sessions for these classes
    let sessQuery = sb
      .from('class_sessions')
      .select('id, class_id, batch_id, session_number, session_type, status, created_at')
      .in('class_id', classIds);
    if (batchId) {
      sessQuery = sessQuery.eq('batch_id', batchId);
    }
    const { data: sessions, error: sessErr } = await sessQuery.order('session_number', { ascending: true });

    if (sessErr) {
      console.warn('[renderBatchAttendance] sessions fetch error:', sessErr);
    }

    const sessionIds = (sessions || []).map(s => s.id);
    const sessMap = new Map((sessions || []).map(s => [s.id, s]));

    // 3. Fetch attendance records
    let attList = [];
    if (sessionIds.length > 0) {
      const { data: records, error: attErr } = await sb
        .from('session_attendance')
        .select('id, session_id, student_id, status')
        .in('session_id', sessionIds);
      if (!attErr && records) attList = records;
    }

    // Map by: `${student_id}::${class_id}::${session_number}` -> status
    const attMap = new Map();
    attList.forEach(a => {
      const s = sessMap.get(a.session_id);
      if (s && s.session_number) {
        attMap.set(`${a.student_id}::${s.class_id}::${Number(s.session_number)}`, a.status);
      }
    });

    const classConfigs = new Map();
    classesForBatch.forEach(c => {
      classConfigs.set(c.id, getMeetingsConfigForClass(c));
    });

    // 4. Build Two-Tier Sticky Header
    let superHeadersHtml = `
      <tr>
        <th colspan="3" class="super-hdr super-hdr-identity super-hdr-students-data col-sticky-group-hdr">
          STUDENTS DATA
        </th>
    `;

    for (let w = 1; w <= 4; w++) {
      superHeadersHtml += `
        <th colspan="${classesForBatch.length + 1}" class="col-week-end" style="background:#111827; color:#38bdf8;">
          WEEK ${w}
        </th>
      `;
    }

    superHeadersHtml += `
        <th colspan="3" class="super-hdr super-hdr-overall" style="background:#0b1120 !important; color:#ffffff !important; border-bottom:1px solid rgba(255,255,255,0.15); height:30px; text-align:center;">
          OVERALL RECAP
        </th>
      </tr>
    `;

    let subHeadersHtml = `<tr>
      <th class="att-col-lvl col-sticky" title="${isCampProgram ? 'Academic Step' : 'Academic Level'}">${isCampProgram ? 'STEP' : 'LVL'}</th>
      <th class="att-col-btc col-sticky" title="Cohort Batch" style="color:#38bdf8;">BTC</th>
      <th class="att-col-name col-sticky" title="Student Full Name" style="text-align:left; padding-left:10px; color:#ffffff;">STUDENT NAME</th>
    `;

    for (let w = 1; w <= 4; w++) {
      classesForBatch.forEach(c => {
        const shortName = formatClassShortHeader(c, levelNumber);
        subHeadersHtml += `
          <th style="min-width:55px; text-align:center;" title="${escapeHtml(c.name)} (Week ${w})">
            ${escapeHtml(shortName)}
          </th>
        `;
      });
      subHeadersHtml += `
        <th class="col-week-end col-subhdr-total" style="min-width:55px; text-align:center;" title="Week ${w} Total Accumulation">
          TOTAL
        </th>
      `;
    }

    subHeadersHtml += `
      <th style="width:44px; text-align:center; color:var(--grade-a, #00c000); background:#1e293b;" title="Total Attended Across All Classes">TOT</th>
      <th style="width:44px; text-align:center; color:var(--grade-e, #ff0000); background:#1e293b;" title="Total Absent Across All Classes">ABS</th>
      <th style="width:56px; text-align:center; color:#ffffff; background:#1e293b;" title="Cumulative Attendance Rate %">RATE</th>
    </tr>`;

    // 5. Build Table Rows
    let rowsHtml = '';
    const sortedStudents = (students || []).slice().sort((a, b) =>
      (a.displayName || a.name || '').localeCompare(b.displayName || b.name || '', undefined, { numeric: true })
    );

    sortedStudents.forEach(st => {
      const rawBatch = st.batchName || (batchMap && batchMap[st.batch_id]?.name) || batchName || '';
      const batchNumStr = rawBatch ? rawBatch.replace(/^(Camp|Batch|TOP|CEC)\s*/i, '').trim() || rawBatch : '—';

      let rawLvl = st.studentLevelNum || st.level_number;
      if (!rawLvl && levelMap && st.level_id) rawLvl = levelMap[st.level_id]?.level_number || levelMap[st.level_id]?.name;
      if (!rawLvl && allLevels && st.level_id) {
        const found = allLevels.find(l => l.id === st.level_id);
        rawLvl = found?.level_number || found?.name;
      }
      const isZeroLvl = rawLvl === 0 || rawLvl === '0' || (!isCampProgram && !rawLvl);
      let lvlDisplay = isZeroLvl ? '0' : (typeof toShortLevel === 'function' ? toShortLevel(rawLvl) : (rawLvl ? String(rawLvl) : (isCampProgram ? '1st' : '0')));
      if (!isZeroLvl && (!lvlDisplay || lvlDisplay === '—' || lvlDisplay.length > 5 || lvlDisplay.includes('-'))) {
        lvlDisplay = isCampProgram ? '1st' : '0';
      }

      const picHtml = st.photo_url
        ? `<img src="${escapeHtml(st.photo_url)}" alt="" style="width:24px; height:24px; border-radius:50%; object-fit:cover;" />`
        : `<div style="width:24px; height:24px; border-radius:50%; background:#1e293b; color:#94a3b8; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:700;">${escapeHtml((st.name || '?').charAt(0))}</div>`;

      let allWeeksTotalPresent = 0;
      let allWeeksTotalRecorded = 0;
      let allWeeksTotalAbsent = 0;

      let weeklyCellsHtml = '';

      for (let w = 1; w <= 4; w++) {
        let weekSumPresent = 0;
        let weekSumRecorded = 0;
        let weekSumExpected = 0;

        classesForBatch.forEach(c => {
          const cfg = classConfigs.get(c.id);
          const startM = (w - 1) * cfg.weekDays + 1;
          const endM = w * cfg.weekDays;
          weekSumExpected += cfg.weekDays;

          let classPresent = 0;
          let classRecorded = 0;
          let classAbsent = 0;

          for (let m = startM; m <= endM; m++) {
            const status = attMap.get(`${st.id}::${c.id}::${m}`);
            if (status) {
              classRecorded++;
              if (status === 'PRESENT' || status.startsWith('PRESENT')) classPresent++;
              else if (status === 'ABSENT' || status === 'ALPHA') classAbsent++;
            }
          }

          weekSumPresent += classPresent;
          weekSumRecorded += classRecorded;

          allWeeksTotalPresent += classPresent;
          allWeeksTotalRecorded += classRecorded;
          allWeeksTotalAbsent += classAbsent;

          let cellDisplay = '—';
          let cellStyle = 'color:#64748b; font-size:12px;';
          if (classRecorded > 0) {
            cellDisplay = `${classPresent}`;
            let color = 'var(--grade-e, #ff0000)';
            if (classPresent === cfg.weekDays) color = 'var(--grade-a, #00c000)';
            else if (classPresent >= cfg.weekDays - 1) color = 'var(--grade-b, #95ff00)';
            else if (classPresent >= 1) color = 'var(--grade-c, #ffff00)';
            cellStyle = `font-weight:700; color:${color}; font-size:12px; font-variant-numeric:tabular-nums;`;
          }

          weeklyCellsHtml += `
            <td style="text-align:center; padding:2px;" title="${escapeHtml(c.name)} Week ${w}: ${classRecorded > 0 ? `${classPresent}/${cfg.weekDays} Present` : 'No sessions recorded yet'}">
              <span style="${cellStyle}">${cellDisplay}</span>
            </td>
          `;
        });

        // Weekly Accumulation Cell
        let weekAccDisplay = '—';
        if (weekSumRecorded > 0) {
          weekAccDisplay = `${weekSumPresent}`;
        }
        weeklyCellsHtml += `
          <td class="col-week-end col-cell-total" style="padding:2px;" title="Week ${w} Total Accumulation: ${weekSumRecorded > 0 ? `${weekSumPresent}/${weekSumExpected} Meetings` : 'Unrecorded'}">
            <span>${weekAccDisplay}</span>
          </td>
        `;
      }

      // Overall Recap Calculation
      const ratePct = allWeeksTotalRecorded > 0 ? Math.round((allWeeksTotalPresent / allWeeksTotalRecorded) * 100) : 0;
      const rateColor = allWeeksTotalRecorded === 0 ? '#64748b' : (
        ratePct >= 90 ? 'var(--grade-a, #00c000)' : (
          ratePct >= 80 ? 'var(--grade-b, #95ff00)' : (
            ratePct >= 60 ? 'var(--grade-c, #ffff00)' : 'var(--grade-e, #ff0000)'
          )
        )
      );

      rowsHtml += `
        <tr data-student-id="${st.id}">
          <td class="att-col-lvl col-sticky" style="text-align:center; font-weight:700; color:#f8fafc; font-size:12px;">${escapeHtml(lvlDisplay)}</td>
          <td class="att-col-btc col-sticky" style="text-align:center; color:#38bdf8; font-variant-numeric:tabular-nums; font-size:12px;" title="Batch ${escapeHtml(rawBatch)}">${escapeHtml(batchNumStr)}</td>
          <td class="att-col-name col-sticky" style="font-weight:600; color:#f1f5f9; padding-left:10px; font-size:12px;" title="${escapeHtml(st.displayName || st.name)}">
            ${escapeHtml(st.displayName || st.name)}
          </td>
          ${weeklyCellsHtml}
          <td style="text-align:center; font-weight:700; color:var(--grade-a, #00c000); font-size:12px;" class="sum-tot">${allWeeksTotalRecorded > 0 ? allWeeksTotalPresent : '—'}</td>
          <td style="text-align:center; font-weight:700; color:var(--grade-e, #ff0000); font-size:12px;" class="sum-abs">${allWeeksTotalRecorded > 0 ? allWeeksTotalAbsent : '—'}</td>
          <td style="text-align:center; font-weight:800; color:${rateColor}; font-size:12px; font-variant-numeric:tabular-nums;" class="sum-rate">${allWeeksTotalRecorded > 0 ? ratePct + '%' : '—'}</td>
        </tr>
      `;
    });

    if (sortedStudents.length === 0) {
      const totalCols = 3 + (4 * (classesForBatch.length + 1)) + 3;
      rowsHtml = `
        <tr>
          <td colspan="${totalCols}" style="text-align:center; padding:30px; color:#64748b;">
            No active students in this batch.
          </td>
        </tr>
      `;
    }

    // Direct ceiling docking: The table wrap is the first element, no floating header bar or legend strips
    container.innerHTML = `
      <div class="attendance-grid-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; overflow:hidden;">
        <!-- Table Viewport (Ceiling Docked with 10px perimeter gap) -->
        <div class="attendance-grid-table-wrap" style="flex:1 1 0; min-height:0; height:100%; overflow:auto;">
          <table class="attendance-grid-table no-pic" id="batch-weekly-attendance-table">
            <thead>
              ${superHeadersHtml}
              ${subHeadersHtml}
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Dock Batch Info & Legend into Lower Sub Panel (Sole SSOT Domain for Legends & Triage)
    if (typeof window.setBottomInfobar === 'function') {
      const levelOrdinal = levelNumber === 1 ? '1st' : (levelNumber === 2 ? '2nd' : (levelNumber === 3 ? '3rd' : ''));
      const levelTitle = levelNumber > 0 ? `Level ${levelNumber} (${levelOrdinal}) ` : '';
      const attendanceSwitcherHtml = (levelNumber > 0 || /camp/i.test(batchName || '')) ? `
        <div class="attendance-page-switcher" style="display:inline-flex;align-items:stretch;height:32px;background:#0b1324;border:1px solid #334155;border-radius:6px;overflow:hidden;box-sizing:border-box;margin-right:8px;">
          <span style="font-size:11px;font-weight:800;color:var(--primary-tactical, #38bdf8);letter-spacing:0.05em;display:flex;align-items:center;padding:0 8px;border-right:1px solid #334155;background:rgba(255,255,255,0.02);">ATTENDANCE:</span>
          <button type="button" class="btn btn-sm" onclick="event.stopPropagation();if(typeof window._switchAttendancePage==='function')window._switchAttendancePage(1);" style="border:none;border-right:1px solid #334155;border-radius:0;height:100%;padding:0 12px;font-size:12px;font-weight:900;cursor:pointer;transition:all 0.15s ease;display:flex;align-items:center;justify-content:center;${levelNumber === 1 ? 'background:var(--primary-tactical, #38bdf8);color:#090d16;box-shadow:inset 0 0 4px rgba(0,0,0,0.2);' : 'background:transparent;color:#94a3b8;'}" title="1st Level Attendance">1st</button>
          <button type="button" class="btn btn-sm" onclick="event.stopPropagation();if(typeof window._switchAttendancePage==='function')window._switchAttendancePage(2);" style="border:none;border-right:1px solid #334155;border-radius:0;height:100%;padding:0 12px;font-size:12px;font-weight:900;cursor:pointer;transition:all 0.15s ease;display:flex;align-items:center;justify-content:center;${levelNumber === 2 ? 'background:var(--primary-tactical, #38bdf8);color:#090d16;box-shadow:inset 0 0 4px rgba(0,0,0,0.2);' : 'background:transparent;color:#94a3b8;'}" title="2nd Level Attendance">2nd</button>
          <button type="button" class="btn btn-sm" onclick="event.stopPropagation();if(typeof window._switchAttendancePage==='function')window._switchAttendancePage(3);" style="border:none;border-radius:0;height:100%;padding:0 12px;font-size:12px;font-weight:900;cursor:pointer;transition:all 0.15s ease;display:flex;align-items:center;justify-content:center;${levelNumber === 3 ? 'background:var(--primary-tactical, #38bdf8);color:#090d16;box-shadow:inset 0 0 4px rgba(0,0,0,0.2);' : 'background:transparent;color:#94a3b8;'}" title="3rd Level Attendance">3rd</button>
        </div>
      ` : '';
      const leftHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
          ${attendanceSwitcherHtml}
          <span style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">
            ${escapeHtml(batchName)} — ${levelTitle}Weekly Attendance Recap
          </span>
          <span style="font-size:11px; background:rgba(56,189,248,0.15); color:var(--primary-tactical, #38bdf8); padding:2px 8px; border-radius:12px; font-weight:700;">
            ${classesForBatch.length} Classes • 4 Weeks Matrix
          </span>
        </div>
      `;
      const rightHtml = `
        <div style="display:inline-flex; align-items:center; gap:12px; font-size:11px; color:#94a3b8;">
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="color:var(--grade-a, #00c000); font-weight:700;">●</span> Full</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="color:var(--grade-c, #ffff00); font-weight:700;">●</span> Partial</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><span style="color:var(--grade-e, #ff0000); font-weight:700;">●</span> Missed</span>
          <span style="display:inline-flex; align-items:center; gap:4px;"><strong style="color:#38bdf8;">TOTAL</strong> = Weekly Accumulation</span>
        </div>
      `;
      window.setBottomInfobar(leftHtml, rightHtml, '');
    }

  } catch(err) {
    console.error('[renderBatchAttendance] error:', err);
    container.innerHTML = `<div style="padding:20px; color:var(--grade-e, #ff0000); font-size:12px;">Error: ${escapeHtml(err.message || String(err))}</div>`;
  }
}
