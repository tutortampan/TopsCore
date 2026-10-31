// js/admin/dossier_export.js
// Modern Certified Academic Dossier & Transcript Export Engine (A4 Print / PDF)

import { escapeHtml } from '../app.js';
import { getGradeColorByScore } from '../grading.js';

export function exportStudentDossier(studentData, educationList = [], skillsList = [], testList = []) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    if (typeof alert === 'function') alert('Please allow popups to print/export the Student Dossier.');
    return;
  }

  const docRef = `TC-DOS-${String(studentData.id || '').substring(0, 8).toUpperCase()}-${new Date().getFullYear()}`;
  const generationDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const eduHtml = educationList && educationList.length > 0
    ? educationList.map(e => `<div style="margin-bottom:6px;"><strong>[${escapeHtml(e.period || '')}]</strong> ${escapeHtml(e.institution || '')} &mdash; <span style="color:#64748b;">${escapeHtml(e.details || '')}</span></div>`).join('')
    : '<div style="color:#94a3b8; font-style:italic;">No formal education history recorded.</div>';

  const skillHtml = skillsList && skillsList.length > 0
    ? skillsList.map(s => `<span style="display:inline-block; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:3px 8px; font-size:0.75rem; font-weight:600; margin:2px 4px 2px 0; color:#334155;">${escapeHtml(s)}</span>`).join('')
    : '<div style="color:#94a3b8; font-style:italic;">No skill competencies recorded.</div>';

  const testRowsHtml = testList && testList.length > 0
    ? testList.map((a, idx) => {
        const scoreColor = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(a.score ?? 0) : '#0f172a';
        return `
          <tr>
            <td style="text-align:center; color:#64748b; font-weight:600;">${idx + 1}</td>
            <td style="font-weight:700; color:#0f172a;">${escapeHtml(a.title || 'Assessment')}</td>
            <td style="text-align:center;"><span style="font-size:0.7rem; font-weight:700; padding:2px 6px; border-radius:4px; background:#f1f5f9; color:#475569;">${escapeHtml(a.type || 'Exam')}</span></td>
            <td style="text-align:center; color:#64748b; font-size:0.75rem;">${escapeHtml(a.date || '—')}</td>
            <td style="text-align:center; font-weight:700; color:#0f172a;">${a.points != null ? `${a.points} pts` : '—'}</td>
            <td style="text-align:center; font-weight:800; color:${scoreColor};">${a.score != null ? `${a.score}%` : '—'}</td>
            <td style="text-align:center; font-weight:900; color:${scoreColor};">${escapeHtml(a.grade || '—')}</td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="7" style="text-align:center; padding:16px; color:#94a3b8;">No official test history recorded.</td></tr>';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official Student Dossier — ${escapeHtml(studentData.name || 'Student')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 8mm 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 8.5pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: 0;
      margin: 0;
    }
    .sheet {
      width: 100%;
      max-width: 100%;
      padding: 6mm 10mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-title {
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: 0.04em;
      color: #0f172a;
      text-transform: uppercase;
    }
    .header-sub {
      font-size: 0.8rem;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .header-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      font-size: 0.7rem;
      color: #64748b;
      font-weight: 600;
      border-top: 1px solid #e2e8f0;
      padding-top: 5px;
    }
    .grid-identity {
      display: grid;
      grid-template-columns: 1fr 120px;
      gap: 18px;
      align-items: start;
      margin-bottom: 14px;
    }
    .id-table {
      width: 100%;
      font-size: 0.82rem;
      line-height: 1.6;
      border-collapse: collapse;
    }
    .id-table td {
      padding: 2px 0;
      color: #0f172a;
    }
    .id-table td.label {
      width: 130px;
      color: #64748b;
      font-weight: 600;
    }
    .photo-box {
      width: 115px;
      height: 153px;
      border: 2px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .photo-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .summary-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      text-align: center;
    }
    .summary-item-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .summary-item-val {
      font-size: 1.25rem;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
    }
    .section-title {
      font-size: 0.8rem;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-left: 4px solid #0f172a;
      padding-left: 6px;
      margin: 12px 0 6px 0;
    }
    .dossier-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.78rem;
      margin-top: 6px;
      border: 1px solid #cbd5e1;
    }
    .dossier-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 0.68rem;
      letter-spacing: 0.04em;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    .dossier-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .dossier-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .dossier-table tr {
      page-break-inside: avoid;
    }
    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 110px 1fr;
      gap: 16px;
      align-items: center;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      margin-top: 14px;
      page-break-inside: avoid;
    }
    .seal-circle {
      border: 2px dashed #94a3b8;
      border-radius: 50%;
      width: 74px;
      height: 74px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 3px;
      color: #64748b;
    }
    .footer-notice {
      text-align: center;
      margin-top: 12px;
      font-size: 0.62rem;
      color: #94a3b8;
      line-height: 1.3;
      page-break-inside: avoid;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body onload="window.print()">
  <div class="sheet">
    <!-- Official Header -->
    <div class="header">
      <div class="header-title">🛡️ TOPS CORE ACADEMIC ADMINISTRATION</div>
      <div class="header-sub">CENTRAL ENGLISH TEST &amp; CERTIFICATION BOARD</div>
      <div class="header-meta">
        <span>DOCUMENT REF: <strong>${escapeHtml(docRef)}</strong></span>
        <span>STATUS: <strong style="color:#059669;">OFFICIAL &amp; CERTIFIED</strong></span>
        <span>ISSUED: <strong>${escapeHtml(generationDate)}</strong></span>
      </div>
    </div>

    <!-- Student Identity & Photo Grid -->
    <div class="grid-identity">
      <div>
        <table class="id-table">
          <tr>
            <td class="label">Student Full Name:</td>
            <td style="font-weight:800; font-size:1rem; color:#0f172a;">${escapeHtml(studentData.name || '—')}</td>
          </tr>
          <tr>
            <td class="label">Date of Birth / Age:</td>
            <td style="font-weight:600;">${escapeHtml(studentData.birth_date || '—')} (${escapeHtml(studentData.ageDisplay || '—')}) &bull; ${escapeHtml(studentData.gender || '—')}</td>
          </tr>
          <tr>
            <td class="label">Institution:</td>
            <td style="font-weight:600;">${escapeHtml(studentData.institution_name || studentData.instName || '—')}</td>
          </tr>
          <tr>
            <td class="label">Academic Program:</td>
            <td style="font-weight:600;">${escapeHtml(studentData.program_name || studentData.progName || '—')}</td>
          </tr>
          <tr>
            <td class="label">Batch &amp; Level:</td>
            <td style="font-weight:600;">Batch ${escapeHtml(studentData.batch_name || studentData.batchName || '—')} &bull; ${escapeHtml(studentData.level_name || studentData.levelName || '—')}</td>
          </tr>
          <tr>
            <td class="label">Enrollment Status:</td>
            <td style="font-weight:700; color:#059669;">${studentData.is_active ? 'ACTIVE ENROLLED' : 'COMPLETED / INACTIVE'}</td>
          </tr>
        </table>
      </div>

      <!-- 3:4 Student Photo Box -->
      <div class="photo-box">
        ${studentData.photo_url 
          ? `<img src="${studentData.photo_url}" alt="Student Photo">` 
          : `<div style="font-size:2rem; color:#94a3b8;">👤</div>`
        }
        <div style="position:absolute; bottom:0; inset-inline:0; background:rgba(15,23,42,0.85); color:#fff; font-size:0.55rem; text-align:center; padding:2px 0; font-weight:700; letter-spacing:0.04em;">
          CERTIFIED
        </div>
      </div>
    </div>

    <!-- Certified Academic Summary Box -->
    <div class="summary-box">
      <div>
        <div class="summary-item-label">Overall Grade</div>
        <div class="summary-item-val" style="font-size:1.45rem;">${escapeHtml(studentData.globalGrade || studentData.grade || '—')}</div>
      </div>
      <div>
        <div class="summary-item-label">Mastery Score</div>
        <div class="summary-item-val">${studentData.overallScoreStr || (studentData.score != null ? `${studentData.score}%` : '—')}</div>
      </div>
      <div>
        <div class="summary-item-label">Curriculum Pace</div>
        <div class="summary-item-val" style="font-size:1.05rem;">${studentData.completedTests || 0} / ${studentData.totalAssigned || 40} <span style="font-size:0.7rem; color:#64748b; font-weight:600;">(${studentData.completionPct || 0}%)</span></div>
      </div>
      <div>
        <div class="summary-item-label">Total Points</div>
        <div class="summary-item-val" style="font-size:1.05rem;">${studentData.totalEarnedScore != null ? `${studentData.totalEarnedScore} pts` : '—'}</div>
      </div>
    </div>

    <!-- Test Transcript Section -->
    <div>
      <div class="section-title">Official Test Transcript &amp; Module History</div>
      <table class="dossier-table">
        <thead>
          <tr>
            <th style="width:28px; text-align:center;">#</th>
            <th>Test Title</th>
            <th style="width:65px; text-align:center;">Type</th>
            <th style="width:85px; text-align:center;">Date</th>
            <th style="width:75px; text-align:center;">Points</th>
            <th style="width:60px; text-align:center;">Score</th>
            <th style="width:50px; text-align:center;">Grade</th>
          </tr>
        </thead>
        <tbody>
          ${testRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- Education Background & Skills (if any) -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:10px;">
      <div>
        <div class="section-title">Education Background</div>
        <div style="font-size:0.75rem; line-height:1.4;">${eduHtml}</div>
      </div>
      <div>
        <div class="section-title">Competencies &amp; Skills</div>
        <div style="font-size:0.75rem;">${skillHtml}</div>
      </div>
    </div>

    <!-- Signatures & Official Stamp Block -->
    <div class="signatures-block">
      <div style="text-align:center;">
        <div style="font-size:0.68rem; color:#64748b; margin-bottom:32px;">Lead Academic Instructor:</div>
        <div style="border-bottom:1px solid #0f172a; width:75%; margin:0 auto 3px;"></div>
        <div style="font-size:0.72rem; font-weight:700;">Academic Operations Officer</div>
      </div>

      <div class="seal-circle">
        <span style="font-size:1rem;">🛡️</span>
        <span style="font-size:0.48rem; font-weight:800; letter-spacing:0.04em; line-height:1.1;">TOP OFFICE<br>ACADEMIC<br>SEAL</span>
      </div>

      <div style="text-align:center;">
        <div style="font-size:0.68rem; color:#64748b; margin-bottom:32px;">Director of Academic Board:</div>
        <div style="border-bottom:1px solid #0f172a; width:75%; margin:0 auto 3px;"></div>
        <div style="font-size:0.72rem; font-weight:700;">Head of Academic Board</div>
      </div>
    </div>

    <!-- Official Notice -->
    <div class="footer-notice">
      This dossier is an authoritative evaluation record generated by TopsCore LMS.<br>
      Valid without wet signature if verification code matches the central registry &middot; TopsCore &copy; 2026
    </div>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
