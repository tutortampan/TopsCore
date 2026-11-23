/**
 * TOPSCORE LMS — SYSTEM GLOSSARY WORKSTATION (DOMAIN D — DATA)
 * Authoritative Master Guide for Table Headers, Sub-Headers & UI Screen Terminology
 * Standardized 6-Column Non-Truncated Matrix Layout (100% Fit, Zero Horizontal Scroll).
 * Zero Floating Bar: All controls, filters, search, and action buttons docked in Sub Panel (Lower Panel).
 * Route: admin.html#system-glossary
 */

import { getSupabase } from '../supabase.js?v=20261106_v160';
import { showToast, escHtml } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { DEFAULT_SYSTEM_GLOSSARY } from './system-glossary-data.js?v=20261121_v104';

// Canonical UI Header Categories SSOT
const CANONICAL_CATEGORIES = [
  'ALL',
  'Super-Header (Tingkat 1)',
  'Sub-Header (Matriks Tema)',
  'Header Kolom Roster',
  'Header Grading & Predikat',
  'Header Dashboard Siswa',
  'Header Live Monitor',
  'Header Navigasi & Quadrant'
];

// In-memory cache & state
let _glossaryData = null;
let _isEditMode = false;
let _isDirty = false;
let _activeGroup = 'ALL';
let _searchQuery = '';
let _dataSource = 'default'; // 'default' or 'supabase'
let _sortCol = null; // null (natural seed order), 'group', 'term', 'function_desc', 'color_code', 'color_token', 'ssot_ref'
let _sortDir = 'asc'; // 'asc' or 'desc'

/**
 * 1-Click Copy Helper with Micro Feedback
 */
function copyToClipboard(text, label = 'Copied') {
  if (!text || text === '—' || text === 'N/A') return;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`✓ Copied: ${text}`, 'info');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(`✓ Copied: ${text}`, 'info');
  } catch (e) {
    showToast(`Failed to copy: ${text}`, 'error');
  }
  document.body.removeChild(ta);
}

/**
 * Load glossary dataset with Hybrid Strategy (Minimal Supabase Quota)
 */
async function loadGlossaryDataset() {
  if (_glossaryData && _glossaryData.length > 0) {
    return _glossaryData;
  }

  try {
    const sb = getSupabase();
    if (sb) {
      const { data, error } = await sb
        .from('site_settings')
        .select('value, updated_at')
        .eq('key', 'system_glossary')
        .maybeSingle();

      if (!error && data && data.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            _glossaryData = parsed;
            _dataSource = 'supabase';
            return _glossaryData;
          }
        } catch (e) {
          console.warn('[SystemGlossary] Error parsing site_settings.system_glossary, falling back to default seed.', e);
        }
      }
    }
  } catch (err) {
    console.warn('[SystemGlossary] Supabase read bypassed or unavailable, using canonical static seed:', err);
  }

  // Fallback to static seed
  _glossaryData = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_GLOSSARY));
  _dataSource = 'default';
  return _glossaryData;
}

/**
 * Save glossary dataset to Supabase site_settings (Single lightweight upsert)
 */
async function saveGlossaryDataset() {
  if (!_glossaryData) return;
  try {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase client unavailable');

    const jsonStr = JSON.stringify(_glossaryData);
    const { error } = await sb.from('site_settings').upsert({
      key: 'system_glossary',
      value: jsonStr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (error) throw error;

    _dataSource = 'supabase';
    _isDirty = false;
    showToast('✓ System Glossary saved successfully to Supabase!', 'success');
  } catch (err) {
    console.error('[SystemGlossary] Save failed:', err);
    showToast(`Failed to save glossary: ${err.message}`, 'error');
  }
}

/**
 * Reset glossary dataset to Default Canonical SSOT
 */
async function resetGlossaryDataset(container) {
  if (!confirm('Are you sure you want to reset System Glossary to canonical TopsCore SSOT defaults? Any manual edits will be overwritten.')) {
    return;
  }

  _glossaryData = JSON.parse(JSON.stringify(DEFAULT_SYSTEM_GLOSSARY));
  _isDirty = true;
  _dataSource = 'default';
  await saveGlossaryDataset();
  renderSystemGlossary(container);
  showToast('✓ System Glossary reset to official canonical SSOT.', 'info');
}

/**
 * Export Glossary to Markdown (.md) or CSV (.csv)
 */
function exportGlossary(format = 'markdown') {
  if (!_glossaryData || _glossaryData.length === 0) {
    showToast('Glossary dataset is empty', 'warning');
    return;
  }

  const nowStr = new Date().toISOString().split('T')[0];

  if (format === 'markdown') {
    let md = `# TOPSCORE LMS — TABLE HEADERS & SCREEN TERMINOLOGY (MASTER SSOT)\n`;
    md += `*Exported on: ${nowStr}* | *Total Entries: ${_glossaryData.length}*\n\n`;
    md += `| Lokasi Header | Nama Header / Istilah | Contoh Data | Fungsi & Cara Membaca | Warna Header | Token / Aturan | Referensi SSOT |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    _glossaryData.forEach(item => {
      const loc = (item.group || 'Umum').replace(/\|/g, '\\|');
      const term = (item.term || '').replace(/\|/g, '\\|');
      const sample = (item.sample_val || '—').replace(/\|/g, '\\|');
      const fnDesc = (item.function_desc || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const clr = (item.color_code || '—').replace(/\|/g, '\\|');
      const tok = (item.color_token ? `\`${item.color_token}\`` : '—').replace(/\|/g, '\\|');
      const ref = `\`${(item.ssot_ref || 'SSOT').replace(/\|/g, '\\|')}\``;
      md += `| ${loc} | **${term}** | ${sample} | ${fnDesc} | ${clr} | ${tok} | ${ref} |\n`;
    });

    downloadBlob(md, `topscore_headers_glossary_${nowStr}.md`, 'text/markdown;charset=utf-8');
    showToast('✓ Table Headers exported to Markdown (.md)', 'success');
  } else if (format === 'csv') {
    const headers = ['Lokasi Header', 'Nama Header / Istilah', 'Contoh Data', 'Fungsi & Cara Membaca', 'Kode Warna', 'Token Visual / Aturan', 'Referensi SSOT'];
    const rows = _glossaryData.map(item => [
      `"${(item.group || '').replace(/"/g, '""')}"`,
      `"${(item.term || '').replace(/"/g, '""')}"`,
      `"${(item.sample_val || '').replace(/"/g, '""')}"`,
      `"${(item.function_desc || '').replace(/"/g, '""')}"`,
      `"${(item.color_code || '—').replace(/"/g, '""')}"`,
      `"${(item.color_token || '—').replace(/"/g, '""')}"`,
      `"${(item.ssot_ref || '').replace(/"/g, '""')}"`
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadBlob(csv, `topscore_headers_glossary_${nowStr}.csv`, 'text/csv;charset=utf-8');
    showToast('✓ Table Headers exported to CSV (.csv)', 'success');
  }
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Docked Sub Panel (Lower Panel 40px) Renderer via window.setBottomInfobar
 * Anchors all location filter pills, live search bar, and action buttons.
 */
function renderSubPanel(container, data, filteredData) {
  if (typeof window.setBottomInfobar !== 'function') return;

  const allGroups = [...CANONICAL_CATEGORIES];
  data.forEach(item => {
    if (item.group && !allGroups.includes(item.group)) {
      allGroups.push(item.group);
    }
  });

  // Filter Pills HTML inside Sub Panel
  const pillsHtml = allGroups.map(grp => {
    const isAct = grp === _activeGroup;
    const count = grp === 'ALL' ? data.length : data.filter(d => d.group === grp).length;
    if (count === 0 && !isAct && grp !== 'ALL') return '';
    return `
      <button type="button" class="btn btn-sm ${isAct ? 'btn-primary' : 'btn-outline'}" data-group-filter="${escHtml(grp)}" style="height:26px; line-height:24px; padding:0 8px; font-size:12px; font-weight:700; white-space:nowrap; border-radius:4px; flex-shrink:0; ${isAct ? 'background:#0284c7; border-color:#38bdf8; color:#fff;' : 'border-color:#334155; color:#94a3b8;'}">
        ${escHtml(grp)} <span style="font-size:12px; opacity:0.8; margin-left:2px;">(${count})</span>
      </button>
    `;
  }).join('');

  // Left Sub Panel: Title, Counter & Location Filter Pills
  const leftHtml = `
    <div style="display:flex; align-items:center; gap:8px; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; padding-right:8px;">
      <div style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:#f8fafc; white-space:nowrap; flex-shrink:0;">
        <span style="color:#38bdf8; display:inline-flex; align-items:center;">${getSvgIcon('book-open', 14)}</span>
        <span>HEADERS</span>
        <span class="badge" style="background:#1e293b; color:#38bdf8; border:1px solid #334155; font-size:12px; font-weight:800; padding:1px 6px; border-radius:3px;">
          ${filteredData.length}/${data.length}
        </span>
      </div>
      <div style="width:1px; height:18px; background:rgba(255,255,255,0.12); flex-shrink:0;"></div>
      <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
        ${pillsHtml}
      </div>
    </div>
  `;

  // Right Sub Panel: Search, Export, Add Term, Edit Mode Toggle & Save Changes
  const rightHtml = `
    <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
      <!-- Live Search Bar -->
      <div style="position:relative; width:160px;">
        <span style="position:absolute; left:7px; top:50%; transform:translateY(-50%); color:#64748b; display:flex; align-items:center;">
          ${getSvgIcon('search', 12)}
        </span>
        <input type="text" id="glossary-search-input" value="${escHtml(_searchQuery)}" placeholder="Search header..." style="width:100%; height:28px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:4px; color:#f8fafc; font-size:12px; font-weight:500; padding:0 22px 0 24px; outline:none;" />
        ${_searchQuery ? `<button type="button" id="btn-clear-glossary-search" style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94a3b8; cursor:pointer; font-size:12px; font-weight:700;">×</button>` : ''}
      </div>

      <!-- Export Buttons -->
      <button type="button" class="btn btn-outline btn-sm" id="btn-export-glossary-md" title="Export Markdown" style="height:28px; line-height:26px; padding:0 7px; font-size:12px; font-weight:700; border-color:#334155; color:#cbd5e1;">
        .MD
      </button>
      <button type="button" class="btn btn-outline btn-sm" id="btn-export-glossary-csv" title="Export CSV" style="height:28px; line-height:26px; padding:0 7px; font-size:12px; font-weight:700; border-color:#334155; color:#cbd5e1;">
        .CSV
      </button>

      <!-- Add Term (Edit Mode Only) -->
      ${_isEditMode ? `
        <button type="button" class="btn btn-primary btn-sm" id="btn-add-glossary-term" style="height:28px; line-height:26px; padding:0 9px; font-size:12px; font-weight:800; background:#059669; border:1px solid #10b981; color:#fff;">
          + Add
        </button>
      ` : ''}

      <!-- Edit Mode Toggle Button -->
      <button type="button" class="btn btn-sm" id="btn-toggle-glossary-edit" style="height:28px; line-height:26px; padding:0 10px; font-size:12px; font-weight:800; border-radius:4px; cursor:pointer; display:flex; align-items:center; gap:5px; ${
        _isEditMode 
          ? 'background:#eab308; border:1px solid #facc15; color:#0f172a;' 
          : 'background:#1e293b; border:1px solid #475569; color:#f8fafc;'
      }">
        ${getSvgIcon('edit-3', 12)} ${_isEditMode ? 'Exit' : 'Edit Mode'}
      </button>

      <!-- Reset & Save Changes -->
      <button type="button" class="btn btn-outline btn-sm" id="btn-glossary-reset" title="Reset SSOT" style="height:28px; line-height:26px; padding:0 7px; font-size:12px; font-weight:700; border-color:#475569; color:#cbd5e1;">
        ${getSvgIcon('rotate-ccw', 11)}
      </button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-glossary-save" style="height:28px; line-height:26px; font-size:12px; font-weight:800; background:${_isDirty ? '#0284c7' : '#1e293b'}; border:1px solid ${_isDirty ? '#38bdf8' : '#334155'}; color:#fff; cursor:${_isDirty ? 'pointer' : 'default'}; opacity:${_isDirty ? '1' : '0.6'}; padding:0 10px;" ${_isDirty ? '' : 'disabled'}>
        ${getSvgIcon('save', 12)} Save
      </button>
    </div>
  `;

  window.setBottomInfobar(leftHtml, rightHtml);

  // Wire Sub Panel Events
  wireSubPanelEvents(container, data);
}

/**
 * Event Wire-Up for Docked Sub Panel
 */
function wireSubPanelEvents(container, data) {
  // Search input live filtering
  const searchInput = document.getElementById('glossary-search-input');
  if (searchInput) {
    let debounceTimer = null;
    searchInput.oninput = (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        _searchQuery = e.target.value;
        renderSystemGlossary(container);
      }, 150);
    };
  }

  // Clear search button
  const btnClearSearch = document.getElementById('btn-clear-glossary-search');
  if (btnClearSearch) {
    btnClearSearch.onclick = () => {
      _searchQuery = '';
      renderSystemGlossary(container);
    };
  }

  // Filter pills inside Sub Panel
  const bar = document.getElementById('admin-bottom-infobar');
  if (bar) {
    bar.querySelectorAll('[data-group-filter]').forEach(btn => {
      btn.onclick = () => {
        _activeGroup = btn.dataset.groupFilter;
        renderSystemGlossary(container);
      };
    });
  }

  // Edit Mode toggle
  const btnToggleEdit = document.getElementById('btn-toggle-glossary-edit');
  if (btnToggleEdit) {
    btnToggleEdit.onclick = () => {
      _isEditMode = !_isEditMode;
      renderSystemGlossary(container);
    };
  }

  // Export buttons
  const btnExportMd = document.getElementById('btn-export-glossary-md');
  if (btnExportMd) {
    btnExportMd.onclick = () => exportGlossary('markdown');
  }

  const btnExportCsv = document.getElementById('btn-export-glossary-csv');
  if (btnExportCsv) {
    btnExportCsv.onclick = () => exportGlossary('csv');
  }

  // Add Term button (Edit Mode)
  const btnAddTerm = document.getElementById('btn-add-glossary-term');
  if (btnAddTerm) {
    btnAddTerm.onclick = () => {
      const newTerm = {
        id: `custom_${Date.now()}`,
        group: _activeGroup !== 'ALL' ? _activeGroup : 'Sub-Header (Matriks Tema)',
        term: 'NEW HEADER',
        function_desc: 'Penjelasan fungsi header dan cara membaca data kolom ini.',
        color_code: '#38bdf8',
        color_token: 'var(--primary-tactical)',
        ssot_ref: 'AGENTS.md'
      };
      _glossaryData.unshift(newTerm);
      _isDirty = true;
      renderSystemGlossary(container);
      showToast('✓ Ditambahkan baris header baru di atas. Silakan edit dan klik Save.', 'info');
    };
  }

  // Reset to SSOT button
  const btnReset = document.getElementById('btn-glossary-reset');
  if (btnReset) {
    btnReset.onclick = () => resetGlossaryDataset(container);
  }

  // Save changes button
  const btnSave = document.getElementById('btn-glossary-save');
  if (btnSave) {
    btnSave.onclick = async () => {
      await saveGlossaryDataset();
      renderSystemGlossary(container);
    };
  }
}

/**
 * Master Main Render Function for System Glossary Workstation
 * Pure Table in Main Content; All Controls in Sub Panel
 */
export async function renderSystemGlossary(container) {
  if (!container) return;

  // Clear Topbar elevated tabs
  if (typeof window.clearTopbarTabs === 'function') {
    window.clearTopbarTabs();
  }

  // Load data
  const data = await loadGlossaryDataset();

  // Calculate filtered rows
  const queryLower = _searchQuery.trim().toLowerCase();
  const filteredData = data.filter(item => {
    // Group filter
    if (_activeGroup !== 'ALL' && item.group !== _activeGroup) {
      return false;
    }
    // Search query filter
    if (queryLower) {
      const matchTerm = (item.term || '').toLowerCase().includes(queryLower);
      const matchDesc = (item.function_desc || '').toLowerCase().includes(queryLower);
      const matchSample = (item.sample_val || '').toLowerCase().includes(queryLower);
      const matchGroup = (item.group || '').toLowerCase().includes(queryLower);
      const matchColor = (item.color_code || '').toLowerCase().includes(queryLower);
      const matchToken = (item.color_token || '').toLowerCase().includes(queryLower);
      const matchRef = (item.ssot_ref || '').toLowerCase().includes(queryLower);
      if (!matchTerm && !matchDesc && !matchSample && !matchGroup && !matchColor && !matchToken && !matchRef) {
        return false;
      }
    }
    return true;
  });

  // Sort filtered rows if sort column is active
  if (_sortCol) {
    filteredData.sort((a, b) => {
      const valA = (a[_sortCol] || '').toString().toLowerCase();
      const valB = (b[_sortCol] || '').toString().toLowerCase();
      if (valA < valB) return _sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return _sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Sort helper generator
  const getSortTh = (colKey, label, widthEdit, widthView, align = 'left', borderRight = true) => {
    const w = _isEditMode ? widthEdit : widthView;
    const isSorted = _sortCol === colKey;
    const arrow = isSorted ? (_sortDir === 'asc' ? ' ▲' : ' ▼') : ' <span style="opacity:0.35; font-size:10px;">⇅</span>';
    const brStyle = borderRight ? 'border-right:1px solid rgba(255,255,255,0.08);' : '';
    const textAl = align === 'center' ? 'text-align:center;' : '';
    return `
      <th class="sortable-th" data-sort-col="${colKey}" title="Klik untuk mengurutkan berdasarkan ${label}" style="width:${w}; padding:5px 8px; font-weight:800; color:${isSorted ? '#38bdf8' : '#94a3b8'}; text-transform:uppercase; font-size:12px; cursor:pointer; user-select:none; ${textAl} ${brStyle} box-sizing:border-box;">
        <span>${label}</span>${arrow}
      </th>
    `;
  };

  // Main Workstation Canvas — Full Height Table Card (Zero Floating Bar)
  container.innerHTML = `
    <div class="system-glossary-workstation" style="display:flex; flex-direction:column; height:100%; width:100%; max-width:100%; min-height:0; box-sizing:border-box; overflow:hidden; padding:10px; background:#070a13;">
      <div class="card" style="flex:1; min-height:0; width:100%; max-width:100%; padding:0; background:#0b1120; border:1px solid #1e293b; border-radius:6px; overflow:hidden; display:flex; flex-direction:column; box-sizing:border-box;">
        <div class="table-container" style="flex:1; min-height:0; width:100%; overflow-y:auto; overflow-x:hidden; position:relative; box-sizing:border-box;">
          <table class="data-table" id="table-system-glossary" style="width:100%; table-layout:fixed; border-collapse:collapse; text-align:left; font-size:12px; margin:0;">
            <thead>
              <tr style="position:sticky; top:0; z-index:10; background:#0f172a; border-bottom:1.5px solid rgba(255,255,255,0.16); height:32px;">
                <!-- 1. LOKASI HEADER -->
                ${getSortTh('group', 'Lokasi Header', '15%', '16%')}
                <!-- 2. NAMA HEADER / ISTILAH -->
                ${getSortTh('term', 'Nama Header / Istilah', '15%', '17%')}
                <!-- 3. FUNGSI & CARA MEMBACA -->
                ${getSortTh('function_desc', 'Fungsi &amp; Cara Membaca', '33%', '36%')}
                <!-- 4. WARNA HEADER -->
                ${getSortTh('color_code', 'Warna Header', '11%', '10%', 'center')}
                <!-- 5. TOKEN / ATURAN -->
                ${getSortTh('color_token', 'Token / Aturan', '11%', '11%')}
                <!-- 6. REFERENSI SSOT -->
                ${getSortTh('ssot_ref', 'Referensi SSOT', '10%', '10%', 'left', _isEditMode)}
                <!-- 7. AKSI (Edit Mode Only) -->
                ${_isEditMode ? `<th style="width:5%; text-align:center; padding:5px 4px; font-weight:800; color:#ef4444; text-transform:uppercase; font-size:12px; box-sizing:border-box;">Aksi</th>` : ''}
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(filteredData, _isEditMode)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Wire inline table inputs & copy buttons
  wireTableEvents(container);

  // Render Docked Sub Panel (Lower Panel 40px)
  renderSubPanel(container, data, filteredData);
}

/**
 * Render Datagrid Table Rows (Strict 1 Data = 1 Column Schema)
 */
function renderTableRows(items, isEdit) {
  if (!items || items.length === 0) {
    return `
      <tr>
        <td colspan="${isEdit ? '7' : '6'}" style="text-align:center; padding:3rem 1rem; color:#64748b; font-size:13px; font-weight:600;">
          Tidak ada header tabel yang cocok dengan filter / pencarian.
        </td>
      </tr>
    `;
  }

  return items.map((item, idx) => {
    const rawIdx = _glossaryData.indexOf(item);
    const rowId = item.id || `item_${rawIdx}`;
    const hexColor = item.color_code || '—';
    const hasColor = hexColor && hexColor !== '—' && hexColor !== 'N/A';
    const token = item.color_token || '—';
    const ssotRef = item.ssot_ref || 'SSOT';

    if (!isEdit) {
      // ------------------------------------
      // VIEW MODE (Clean, Fixed, 1-Click Copy, Zero Truncation)
      // ------------------------------------
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05); background:${idx % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent'};" data-row-id="${escHtml(rowId)}">
          
          <!-- 1. LOKASI HEADER -->
          <td style="padding:6px 8px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.05); word-break:break-word; overflow-wrap:break-word; white-space:normal; box-sizing:border-box;">
            <span class="badge" style="background:#1e293b; color:#94a3b8; border:1px solid #334155; font-size:12px; font-weight:700; padding:2px 7px; border-radius:3px; display:inline-block; line-height:1.25;">
              ${escHtml(item.group || 'Umum')}
            </span>
          </td>

          <!-- 2. NAMA HEADER / ISTILAH -->
          <td style="padding:6px 8px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.05); word-break:break-word; overflow-wrap:break-word; white-space:normal; box-sizing:border-box;">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:4px;">
              <span class="glossary-term-name" style="font-weight:800; color:var(--admin-text-main, #f8fafc); font-size:12px; letter-spacing:0.01em; line-height:1.3;">
                ${escHtml(item.term || '')}
              </span>
              <button type="button" class="btn-copy-term" data-copy-val="${escHtml(item.term || '')}" title="Salin nama header" style="background:none; border:none; padding:1px 3px; color:#64748b; cursor:pointer; border-radius:3px; display:inline-flex; align-items:center; flex-shrink:0;">
                ${getSvgIcon('copy', 11)}
              </button>
            </div>
            ${item.sample_val ? `
              <div style="margin-top:4px; display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:var(--primary-tactical, #38bdf8); background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.2); padding:1px 6px; border-radius:3px; max-width:100%; box-sizing:border-box;">
                <span style="color:#64748b; font-weight:700; flex-shrink:0;">Contoh:</span>
                <span style="font-family:monospace; word-break:break-all;">${escHtml(item.sample_val)}</span>
              </div>
            ` : ''}
          </td>

          <!-- 3. FUNGSI & CARA MEMBACA -->
          <td class="col-glossary-desc" style="padding:6px 8px; vertical-align:top; line-height:1.45; color:var(--admin-text-main, #cbd5e1); font-size:12px; border-right:1px solid rgba(255,255,255,0.05); word-break:break-word; overflow-wrap:break-word; white-space:normal; box-sizing:border-box;">
            ${escHtml(item.function_desc || '')}
          </td>

          <!-- 4. WARNA HEADER (Color Swatch + Hex) -->
          <td style="padding:6px 6px; vertical-align:top; text-align:center; border-right:1px solid rgba(255,255,255,0.05); word-break:break-word; box-sizing:border-box;">
            ${hasColor ? `
              <div style="display:inline-flex; align-items:center; justify-content:center; gap:5px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:3px 6px; border-radius:4px;">
                <span style="display:inline-block; width:12px; height:12px; border-radius:2px; background:${escHtml(hexColor)}; border:1px solid rgba(255,255,255,0.3); flex-shrink:0;"></span>
                <span style="font-family:monospace; color:var(--admin-text-main, #f8fafc); font-size:12px; font-weight:700;">${escHtml(hexColor)}</span>
                <button type="button" class="btn-copy-term" data-copy-val="${escHtml(hexColor)}" title="Salin kode hex" style="background:none; border:none; padding:1px; color:#64748b; cursor:pointer; display:inline-flex; align-items:center;">
                  ${getSvgIcon('copy', 10)}
                </button>
              </div>
            ` : `
              <span style="color:#64748b; font-size:12px;">—</span>
            `}
          </td>

          <!-- 5. TOKEN / ATURAN -->
          <td style="padding:6px 8px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.05); word-break:break-all; overflow-wrap:break-word; white-space:normal; box-sizing:border-box;">
            ${token && token !== '—' ? `
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:3px;">
                <code style="font-family:monospace; font-size:12px; color:var(--primary-tactical, #38bdf8); background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.2); padding:2px 5px; border-radius:3px; word-break:break-all; display:inline-block; line-height:1.3;">
                  ${escHtml(token)}
                </code>
                <button type="button" class="btn-copy-term" data-copy-val="${escHtml(token)}" title="Salin token" style="background:none; border:none; padding:1px 3px; color:#64748b; cursor:pointer; display:inline-flex; align-items:center; flex-shrink:0;">
                  ${getSvgIcon('copy', 11)}
                </button>
              </div>
            ` : `
              <span style="color:#64748b; font-size:12px;">—</span>
            `}
          </td>

          <!-- 6. REFERENSI SSOT -->
          <td style="padding:6px 8px; vertical-align:top; word-break:break-word; overflow-wrap:break-word; white-space:normal; box-sizing:border-box;">
            <span class="glossary-ssot-ref" style="font-family:monospace; font-size:12px; font-weight:600; color:var(--admin-text-main, #0f172a); background:rgba(255,255,255,0.04); padding:2px 6px; border-radius:3px; border:1px solid rgba(255,255,255,0.07); display:inline-block; line-height:1.3;">
              ${escHtml(ssotRef)}
            </span>
          </td>
        </tr>
      `;
    } else {
      // ------------------------------------
      // EDIT MODE (Strict 6-Column Inline Edit Inputs)
      // ------------------------------------
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.08); background:rgba(234,179,8,0.03);" data-raw-idx="${rawIdx}">
          
          <!-- 1. Lokasi Header Input -->
          <td style="padding:4px 6px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">
            <input type="text" class="input-inline-edit" data-field="group" data-idx="${rawIdx}" value="${escHtml(item.group || '')}" placeholder="Lokasi Header" style="width:100%; height:26px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#94a3b8; font-size:12px; padding:0 5px;" />
          </td>

          <!-- 2. Nama Header Input -->
          <td style="padding:4px 6px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">
            <input type="text" class="input-inline-edit" data-field="term" data-idx="${rawIdx}" value="${escHtml(item.term || '')}" placeholder="Nama Header" style="width:100%; height:26px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#f8fafc; font-size:12px; font-weight:700; padding:0 5px;" />
            <input type="text" class="input-inline-edit" data-field="sample_val" data-idx="${rawIdx}" value="${escHtml(item.sample_val || '')}" placeholder="Contoh data riil" style="width:100%; height:22px; margin-top:4px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#38bdf8; font-size:12px; font-family:monospace; padding:0 5px;" />
          </td>

          <!-- 3. Fungsi & Cara Membaca Textarea -->
          <td style="padding:4px 6px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">
            <textarea class="input-inline-edit" data-field="function_desc" data-idx="${rawIdx}" rows="3" style="width:100%; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#cbd5e1; font-size:12px; line-height:1.3; padding:4px 5px; resize:vertical;">${escHtml(item.function_desc || '')}</textarea>
          </td>

          <!-- 4. Warna Header (Color Picker + Hex Text) -->
          <td style="padding:4px 6px; vertical-align:top; text-align:center; border-right:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
              <input type="color" class="input-inline-edit" data-field="color_code" data-idx="${rawIdx}" value="${hasColor ? escHtml(hexColor) : '#38bdf8'}" style="width:24px; height:24px; padding:0; border:1px solid #334155; border-radius:3px; background:none; cursor:pointer;" />
              <input type="text" class="input-inline-edit" data-field="color_code_text" data-idx="${rawIdx}" value="${escHtml(hexColor)}" placeholder="#HEX / —" style="width:100%; height:24px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#f8fafc; font-size:12px; font-family:monospace; text-align:center; padding:0 3px;" />
            </div>
          </td>

          <!-- 5. Token / Aturan Input -->
          <td style="padding:4px 6px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">
            <input type="text" class="input-inline-edit" data-field="color_token" data-idx="${rawIdx}" value="${escHtml(token)}" placeholder="var(--token)" style="width:100%; height:26px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#38bdf8; font-size:12px; font-family:monospace; padding:0 5px;" />
          </td>

          <!-- 6. Referensi SSOT Input -->
          <td style="padding:4px 6px; vertical-align:top; border-right:1px solid rgba(255,255,255,0.08); box-sizing:border-box;">
            <input type="text" class="input-inline-edit" data-field="ssot_ref" data-idx="${rawIdx}" value="${escHtml(ssotRef)}" placeholder="AGENTS.md" style="width:100%; height:26px; box-sizing:border-box; background:#070a13; border:1px solid #334155; border-radius:3px; color:#94a3b8; font-size:12px; font-family:monospace; padding:0 5px;" />
          </td>

          <!-- 7. Delete Row Action -->
          <td style="text-align:center; padding:4px 4px; vertical-align:top; box-sizing:border-box;">
            <button type="button" class="btn-delete-row" data-idx="${rawIdx}" title="Hapus baris header" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#ef4444; width:26px; height:26px; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
              ${getSvgIcon('trash', 12)}
            </button>
          </td>
        </tr>
      `;
    }
  }).join('');
}

/**
 * Event Wire-Up for Table Inputs and Copy Buttons
 */
function wireTableEvents(container) {
  // Sort header click handlers
  container.querySelectorAll('.sortable-th').forEach(th => {
    th.onclick = () => {
      const col = th.dataset.sortCol;
      if (!col) return;
      if (_sortCol === col) {
        _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        _sortCol = col;
        _sortDir = 'asc';
      }
      renderSystemGlossary(container);
    };
  });

  // 1-Click Copy Buttons
  container.querySelectorAll('.btn-copy-term').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const val = btn.dataset.copyVal;
      copyToClipboard(val);
    };
  });

  // Inline edit inputs
  container.querySelectorAll('.input-inline-edit').forEach(input => {
    input.onchange = (e) => {
      const idx = parseInt(input.dataset.idx, 10);
      const field = input.dataset.field;
      if (isNaN(idx) || !_glossaryData[idx]) return;

      let val = e.target.value;
      if (field === 'color_code_text') {
        _glossaryData[idx].color_code = val;
      } else {
        _glossaryData[idx][field] = val;
      }

      _isDirty = true;
      const data = _glossaryData;
      const queryLower = _searchQuery.trim().toLowerCase();
      const filteredData = data.filter(item => {
        if (_activeGroup !== 'ALL' && item.group !== _activeGroup) return false;
        if (queryLower) {
          const m1 = (item.term || '').toLowerCase().includes(queryLower);
          const m2 = (item.function_desc || '').toLowerCase().includes(queryLower);
          const m3 = (item.group || '').toLowerCase().includes(queryLower);
          if (!m1 && !m2 && !m3) return false;
        }
        return true;
      });
      renderSubPanel(container, data, filteredData);
    };
  });

  // Delete row buttons
  container.querySelectorAll('.btn-delete-row').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      if (isNaN(idx) || !_glossaryData[idx]) return;

      const termName = _glossaryData[idx].term || 'baris ini';
      if (!confirm(`Hapus header "${termName}" dari System Glossary?`)) return;

      _glossaryData.splice(idx, 1);
      _isDirty = true;
      renderSystemGlossary(container);
      showToast(`✓ Dihapus: ${termName}`, 'info');
    };
  });
}
