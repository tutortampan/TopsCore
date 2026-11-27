const _measureCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
const _measureCtx = _measureCanvas ? _measureCanvas.getContext('2d') : null;

/**
 * High-performance offscreen canvas text measurement to determine best-fit column width.
 * Replaces expensive DOM cloning to guarantee smooth, sub-millisecond double-click auto-resizing.
 */
export function calculateColumnAutoWidth(th, cells = [], footerCells = []) {
  if (!_measureCtx || !th) return Math.max(60, th?.scrollWidth || 100);
  const thStyle = window.getComputedStyle(th);
  _measureCtx.font = `${thStyle.fontWeight || '700'} ${thStyle.fontSize || '12px'} ${thStyle.fontFamily || 'Inter, sans-serif'}`;
  let maxWidth = _measureCtx.measureText(th.textContent.trim().replace(/\s+/g, ' ')).width + 28;
  const sampleLimit = Math.min(cells.length, 60);
  for (let i = 0; i < sampleLimit; i++) {
    const cell = cells[i];
    if (!cell || cell.classList.contains('table-spacer-cell') || cell.style.display === 'none') continue;
    let text = '';
    const cellView = cell.querySelector('.student-cell-view');
    const input = cell.querySelector('input, select');
    if (cellView && typeof window !== 'undefined' && window.getComputedStyle(cellView).display !== 'none') {
      text = cellView.textContent.trim().replace(/\s+/g, ' ');
    } else if (input) {
      text = input.value || input.placeholder || '';
    } else {
      text = cell.textContent.trim().replace(/\s+/g, ' ');
    }
    if (!text) continue;
    const cellStyle = window.getComputedStyle(cell);
    _measureCtx.font = `${cellStyle.fontWeight || '500'} ${cellStyle.fontSize || '12px'} ${cellStyle.fontFamily || 'Inter, sans-serif'}`;
    const cellW = _measureCtx.measureText(text).width + 26;
    if (cellW > maxWidth) maxWidth = cellW;
  }
  // Also measure footer summary cells to prevent under-sizing
  for (let i = 0; i < footerCells.length; i++) {
    const cell = footerCells[i];
    if (!cell || cell.style.display === 'none') continue;
    const text = cell.textContent.trim().replace(/\s+/g, ' ');
    if (!text) continue;
    const cellStyle = window.getComputedStyle(cell);
    _measureCtx.font = `${cellStyle.fontWeight || '700'} ${cellStyle.fontSize || '12px'} ${cellStyle.fontFamily || 'Inter, sans-serif'}`;
    const cellW = _measureCtx.measureText(text).width + 26;
    if (cellW > maxWidth) maxWidth = cellW;
  }
  return Math.max(50, Math.min(550, Math.ceil(maxWidth)));
}

/**
 * SSOT 3-Tier Header Abbreviation Dictionary (ui-invariants.md §4.2.2)
 * Full Form -> 5-Letter Medium Form -> 3-Letter Micro Form
 */
export const HEADER_ABBREVIATIONS = {
  'LEVEL': { full: 'LEVEL', medium: 'LEVEL', short: 'LVL' },
  'PHOTO': { full: 'PHOTO', medium: 'PHOTO', short: 'PIC' },
  'PICTURE': { full: 'PICTURE', medium: 'PHOTO', short: 'PIC' },
  'PIC': { full: 'PHOTO', medium: 'PHOTO', short: 'PIC' },
  'GENDER': { full: 'GENDER', medium: 'SEX', short: 'SEX' },
  'SEX': { full: 'GENDER', medium: 'SEX', short: 'SEX' },
  'NAME': { full: 'NAME', medium: 'NAME', short: 'NM' },
  'STUDENT NAME': { full: 'STUDENT NAME', medium: 'STUDT', short: 'STD' },
  'DATE OF BIRTH': { full: 'DOB', medium: 'DOB', short: 'DOB' },
  'DOB': { full: 'DOB', medium: 'DOB', short: 'DOB' },
  'BIRTH DATE': { full: 'DOB', medium: 'DOB', short: 'DOB' },
  'BIRTH': { full: 'DOB', medium: 'DOB', short: 'DOB' },
  'AGE': { full: 'AGE', medium: 'AGE', short: 'AGE' },
  'EDUCATION': { full: 'EDUCATION', medium: 'EDUCT', short: 'EDU' },
  'ADDRESS': { full: 'ADDRESS', medium: 'ADDR', short: 'ADR' },
  'REGENCY': { full: 'REGENCY', medium: 'RGNCY', short: 'REG' },
  'CITY / REGENCY': { full: 'REGENCY', medium: 'RGNCY', short: 'REG' },
  'CITY/REGENCY': { full: 'REGENCY', medium: 'RGNCY', short: 'REG' },
  'CITY': { full: 'REGENCY', medium: 'RGNCY', short: 'REG' },
  'DISTRICT': { full: 'DISTRICT', medium: 'DISTR', short: 'DST' },
  'VILLAGE': { full: 'VILLAGE', medium: 'VILLG', short: 'VLG' },
  'CITY / DISTRICT': { full: 'REGENCY', medium: 'REGEN', short: 'RGC' },
  'PROVINCE': { full: 'PROVINCE', medium: 'PROVN', short: 'PRV' },
  'STATUS': { full: 'STATUS', medium: 'STS', short: 'STS' },
  'STS': { full: 'STATUS', medium: 'STS', short: 'STS' },
  'TASK': { full: 'TASK', medium: 'TASK', short: 'TSK' },
  'DONE': { full: 'DONE', medium: 'DONE', short: 'DONE' },
  'PASSED': { full: 'PASSED', medium: 'PASSD', short: 'PAS' },
  'PASS': { full: 'PASSED', medium: 'PASSD', short: 'PAS' },
  'ACTION': { full: 'ACTION', medium: 'ACTON', short: 'ACT' },
  'ACTIONS': { full: 'ACTIONS', medium: 'ACTON', short: 'ACT' },
  'PROGRESS': { full: 'PROGRESS', medium: 'PRGRS', short: 'PGS' },
  'DONE': { full: 'DONE', medium: 'DONE', short: 'DONE' },
  'RATE': { full: 'RATE', medium: 'RATE', short: 'RATE' },
  'SCORE': { full: 'RATE', medium: 'RATE', short: 'RATE' },
  'POINTS': { full: 'PTS', medium: 'PTS', short: 'PTS' },
  'POINT': { full: 'PTS', medium: 'PTS', short: 'PTS' },
  'PTS': { full: 'PTS', medium: 'PTS', short: 'PTS' },
  'GRADE': { full: 'GRADE', medium: 'GRD', short: 'GRD' },
  'GRD': { full: 'GRADE', medium: 'GRD', short: 'GRD' },
  'BATCH': { full: 'BATCH', medium: 'BATCH', short: 'BTC' },
  'PROGRAM': { full: 'PROGRAM', medium: 'PROGM', short: 'PRG' },
  'INSTITUTION': { full: 'INSTITUTION', medium: 'INSTN', short: 'INS' },
  'AVERAGE': { full: 'AVERAGE', medium: 'AVERG', short: 'AVG' },
  'EVALUATED': { full: 'EVALUATED', medium: 'EVAL', short: 'EVL' },
  'MISTAKES': { full: 'MISTAKES', medium: 'ERRS', short: 'ERR' },
  'ERROR RATE': { full: 'ERROR RATE', medium: 'ERR %', short: 'ERR' },
  'ERROR DIAGNOSIS': { full: 'ERROR DIAGNOSIS', medium: 'DIAG', short: 'DIAG' },
  'STUDENT MISTAKES (TOP MISTAKES)': { full: 'STUDENT MISTAKES (TOP MISTAKES)', medium: 'TOP MISTAKES', short: 'MISTAKES' },
  'TARGET VOCABULARY': { full: 'TARGET VOCABULARY', medium: 'VOCAB', short: 'VCB' },
  'ATTENDANCE': { full: 'ATTENDANCE', medium: 'ATTND', short: 'ATT' },
  'PERCENTAGE': { full: 'PERCENTAGE', medium: 'PERCT', short: 'PCT' },
  'REMEDIAL': { full: 'REMEDIAL', medium: 'REMED', short: 'RMD' },
  'QUESTIONS': { full: 'QUESTIONS', medium: 'QUEST', short: 'QST' },
  'DURATION': { full: 'DURATION', medium: 'DURAT', short: 'DRT' },
  'TOTAL': { full: 'TOTAL', medium: 'TOTAL', short: 'TTL' },
  'VOCABULARY': { full: 'VOCABULARY', medium: 'VOCAB', short: 'VCB' },
  'SPEAKING': { full: 'SPEAKING', medium: 'SPEAK', short: 'SPK' },
  'BASIC ENGLISH': { full: 'BASIC ENGLISH', medium: 'BASIC', short: 'BSC' },
  'STORYTELLING': { full: 'STORYTELLING', medium: 'STORY', short: 'STR' },
  'GRAMMAR': { full: 'GRAMMAR', medium: 'GRAMR', short: 'GRM' }
};

/**
 * Dynamically resolves header text based on column width (in pixels)
 * Width < 55px -> 3-letter micro abbreviation
 * Width < 85px -> 5-letter medium abbreviation
 * Width >= 85px -> full title
 */
export function resolveHeaderLabel(label, widthPx, shortOverride = null, microOverride = null) {
  let cleanLabel = String(label || '').trim();
  if (cleanLabel.includes('<')) {
    cleanLabel = cleanLabel.replace(/<[^>]*>/g, '').trim();
  }
  const key = cleanLabel.toUpperCase();
  const rule = HEADER_ABBREVIATIONS[key];

  if (widthPx != null && widthPx < 55) {
    if (microOverride) return microOverride;
    if (rule && rule.short) return rule.short;
  }
  if (widthPx != null && widthPx < 85) {
    if (shortOverride) return shortOverride;
    if (rule && rule.medium) return rule.medium;
  }

  if (rule) return rule.full;
  return cleanLabel;
}

if (typeof window !== 'undefined') {
  window.HEADER_ABBREVIATIONS = HEADER_ABBREVIATIONS;
  window.resolveHeaderLabel = resolveHeaderLabel;
}

export class DataGrid {
  constructor({ container, tableId = null, data = [], columns = [], pageSize = 50, searchKeys = [], emptyStateHtml = '<p>No records found.</p>', bulkActions = false, onBulkAction = null, onRowClick = null, stickyActionCol = false, sortComparator = null, initialSortKey = null, initialSortAsc = true, superHeaders = null, summaryRow = null, tableLayout = null, rowClassName = null, hideToolbar = false, autoFitOnMount = false }) {
    this.container = typeof container === 'string' ? document.getElementById(container) : container;
    this.tableId = tableId || arguments[0]?.tableId || null;
    this.autoFitOnMount = Boolean(autoFitOnMount || arguments[0]?.autoFitOnMount);
    this.rowClassName = rowClassName;
    if (!this.container) {
      console.warn('[DataGrid] Container element not found or not in DOM:', container);
      return;
    }
    if (this.container._datagridInstance && typeof this.container._datagridInstance.destroy === 'function') {
      this.container._datagridInstance.destroy();
    }
    this.container._datagridInstance = this;
    this.rawData = data;
    this.filteredData = [...data];
    // Add default hidden property if not present
    this.columns = columns.map(c => ({...c, hidden: !!c.hidden}));
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.searchKeys = searchKeys;
    this.emptyStateHtml = emptyStateHtml;
    this.sortKey = initialSortKey;
    this.sortAsc = initialSortAsc;
    this.bulkActions = bulkActions;
    this.customBulkActions = arguments[0]?.customBulkActions || [];
    this.selectedIds = new Set();
    this.onBulkAction = onBulkAction;
    this.onRowClick = onRowClick;
    this.stickyActionCol = stickyActionCol;
    this.sortComparator = sortComparator;
    this.superHeaders = superHeaders;
    this.summaryRow = summaryRow;
    this.tableLayout = tableLayout;
    this.hideToolbar = Boolean(hideToolbar || arguments[0]?.hideToolbar);

    if (this.sortKey) this.sortData();
    this.init();
  }

  init() {
    if (!this.container) return;
    this.container.innerHTML = `
      ${this.hideToolbar ? '' : `
      <div class="datagrid-toolbar" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; gap:10px; flex-wrap:wrap;">
        <div class="datagrid-search" style="flex:1; min-width:200px; display:flex; gap:10px; align-items:center;">
          <div class="datagrid-search-wrap" style="position:relative; max-width:320px; width:100%;">
            <input type="text" class="form-control datagrid-search-input" placeholder="Search... (Ctrl+K)" style="width:100%; padding-right:2rem;" />
            <button type="button" class="datagrid-search-clear hidden" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); background:transparent; border:none; color:var(--clr-text-3); cursor:pointer; font-size: 12px; padding:2px 4px;" title="Clear search">✕</button>
          </div>
          <div class="datagrid-columns-dropdown" style="position:relative;">
            <button class="btn btn-secondary btn-sm datagrid-cols-btn" style="height:100%;">Columns</button>
            <div class="datagrid-cols-menu hidden" style="position:absolute; top:100%; left:0; background:var(--clr-bg-2); border:1px solid var(--clr-border); padding:0.5rem; border-radius:8px; z-index:100; min-width:180px; max-height:320px; overflow-y:auto; box-shadow:0 10px 20px rgba(0,0,0,0.3);">
            </div>
          </div>
        </div>
        <div class="datagrid-actions" style="display:flex; gap:10px; align-items:center;">
          <span class="datagrid-count text-muted text-sm" style="margin-right:10px;"></span>
          ${this.bulkActions ? (
             this.customBulkActions.length > 0
              ? this.customBulkActions.map((btn, i) => `<button class="btn ${btn.className || 'btn-secondary'} btn-sm datagrid-custom-bulk-btn hidden" data-idx="${i}">${btn.label} (<span class="datagrid-bulk-count">0</span>)</button>`).join(' ')
              : `<button class="btn btn-secondary btn-sm datagrid-bulk-btn hidden">Bulk Action (<span class="datagrid-bulk-count">0</span>)</button>`
          ) : ''}
        </div>
      </div>
      `}
      <div class="table-wrap">
        <table class="datagrid-table" id="${this.tableId || ''}" style="width:100%; position:relative; ${this.tableLayout ? `table-layout:${this.tableLayout};` : ''}">
          <colgroup class="datagrid-colgroup"></colgroup>
          <thead class="datagrid-thead">
          </thead>
          <tbody class="datagrid-tbody"></tbody>
          <tfoot class="datagrid-tfoot"></tfoot>
        </table>
      </div>
      <div class="datagrid-pagination" style="${this.hideToolbar ? 'display:none;' : 'display:flex; justify-content:center; align-items:center; gap:10px; margin-top:10px;'}">
      </div>
    `;

    this.colgroup = this.container.querySelector('.datagrid-colgroup');
    this.thead = this.container.querySelector('.datagrid-thead');
    this.tbody = this.container.querySelector('.datagrid-tbody');
    this.tfoot = this.container.querySelector('.datagrid-tfoot');
    this.searchInput = this.container.querySelector('.datagrid-search-input');
    this.searchClearBtn = this.container.querySelector('.datagrid-search-clear');
    this.paginationContainer = this.container.querySelector('.datagrid-pagination');
    this.countLabel = this.container.querySelector('.datagrid-count');
    this.colsMenu = this.container.querySelector('.datagrid-cols-menu');
    this.colsBtn = this.container.querySelector('.datagrid-cols-btn');

    if (this.searchKeys && this.searchKeys.length > 0 && this.searchInput) {
      let searchDebounceTimer = null;
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        const query = e.target.value;
        this.searchClearBtn?.classList.toggle('hidden', !query);
        searchDebounceTimer = setTimeout(() => {
          this.currentPage = 1;
          this.filterData(query);
          this.render();
        }, 150);
      });

      this.searchClearBtn?.addEventListener('click', () => {
        if (this.searchInput) {
          this.searchInput.value = '';
          this.searchClearBtn?.classList.add('hidden');
          this.currentPage = 1;
          this.filterData('');
          this.render();
          this.searchInput.focus();
        }
      });

      // Quick keyboard shortcut: Ctrl+K or Cmd+K focuses search
      this._keyHandler = (e) => {
        if (!document.body.contains(this.container)) {
          this.destroy();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
          if (this.searchInput && document.body.contains(this.searchInput)) {
            e.preventDefault();
            this.searchInput.focus();
            this.searchInput.select();
          }
        }
      };
      document.addEventListener('keydown', this._keyHandler);
    } else {
      const searchWrap = this.container.querySelector('.datagrid-search-wrap');
      if (searchWrap) searchWrap.style.display = 'none';
      else if (this.searchInput) this.searchInput.style.display = 'none';
    }

    // Toggle columns menu
    if (this.colsBtn && this.colsMenu) {
      this.colsBtn.addEventListener('click', () => {
        this.colsMenu.classList.toggle('hidden');
      });
    }

    // Hide menu when clicking outside
    this._docClickHandler = (e) => {
      if (!document.body.contains(this.container)) {
        this.destroy();
        return;
      }
      if (!this.colsBtn || !this.colsMenu) return;
      if (!this.colsBtn.contains(e.target) && !this.colsMenu.contains(e.target)) {
        this.colsMenu.classList.add('hidden');
      }
    };
    document.addEventListener('click', this._docClickHandler);

    if (this.bulkActions) {
      if (this.customBulkActions && this.customBulkActions.length > 0) {
        const btns = this.container.querySelectorAll('.datagrid-custom-bulk-btn');
        btns.forEach(btn => {
          btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.idx, 10);
            if (this.customBulkActions[idx] && this.customBulkActions[idx].onClick) {
              this.customBulkActions[idx].onClick(this.getSelection());
            }
          });
        });
      } else {
        const bulkBtn = this.container.querySelector('.datagrid-bulk-btn');
        if (bulkBtn) {
          bulkBtn.addEventListener('click', () => {
            if (this.onBulkAction) {
              this.onBulkAction(this.getSelection());
            }
          });
        }
      }
    }

    this.renderHeaders();
    this.render();
    this.initColumnResize(this.tableId);
  }

  renderHeaders() {
    if (!this.thead) return;

    // Update columns menu if present
    if (this.colsMenu) {
      this.colsMenu.innerHTML = this.columns.map((col, idx) => `
        <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem; font-size: 12px; cursor:pointer;">
          <input type="checkbox" class="datagrid-col-toggle" data-idx="${idx}" ${!col.hidden ? 'checked' : ''} />
          ${col.label}
        </label>
      `).join('');

      this.colsMenu.querySelectorAll('.datagrid-col-toggle').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          this.columns[idx].hidden = !e.target.checked;
          this.renderHeaders();
          this.render();
        });
      });
    }

    // Render <thead>
    const visibleCols = this.columns.filter(c => !c.hidden);
    if (this.colgroup) {
      let colgroupHtml = '';
      if (this.bulkActions) {
        colgroupHtml += '<col style="width:40px;">';
      }
      visibleCols.forEach(col => {
        const wStyle = col.width ? `width:${col.width};` : (col.minWidth ? `min-width:${col.minWidth};` : '');
        colgroupHtml += `<col style="${wStyle}">`;
      });
      this.colgroup.innerHTML = colgroupHtml;
    }

    let superHtml = '';
    const hasSuperHdr = (this.superHeaders && this.superHeaders.length > 0);
    const spannedKeys = new Set();
    this.dividerColKeys = new Set();

    if (hasSuperHdr) {
      // Calculate boundary column keys across super-headers & propagate style/theme to sub-headers
      let colIdxCounter = 0;
      this.superHeaders.forEach((sh) => {
        const span = sh.colSpan || 1;
        const startIdx = colIdxCounter;
        colIdxCounter += span;
        const endIdx = colIdxCounter - 1;

        // Propagate Super-Header style & theme class to all child sub-header columns
        for (let i = startIdx; i <= endIdx && i < visibleCols.length; i++) {
          const childCol = visibleCols[i];
          if (childCol) {
            childCol._parentSuperHeader = sh;
            if (!childCol.headerStyle && sh.style) {
              childCol.headerStyle = sh.style;
            }
            if (sh.className) {
              const themeMatches = sh.className.match(/super-hdr-(?:theme-[a-d]|overall|students-data|demographic|security|address|class)/g);
              if (themeMatches) {
                themeMatches.forEach(tm => {
                  const subCls = tm.replace('super-hdr-', 'col-subhdr-');
                  if (!childCol.className || !childCol.className.includes(subCls)) {
                    childCol.className = (childCol.className || '') + ' ' + subCls;
                  }
                });
              }
            }
          }
        }

        const boundaryIdx = endIdx;
        if (boundaryIdx >= 0 && boundaryIdx < visibleCols.length - 1) {
          const boundaryCol = visibleCols[boundaryIdx];
          if (boundaryCol && boundaryCol.key) {
            this.dividerColKeys.add(boundaryCol.key);
          }
        }
      });

      // Also register any columns explicitly configured with super-hdr-divider
      visibleCols.forEach(col => {
        if (col.className && col.className.includes('super-hdr-divider') && col.key) {
          this.dividerColKeys.add(col.key);
        }
      });

      const hasSubSubHdr = visibleCols.some(c => c.subSubLabel);
      this.thead.classList.add('has-super-headers');
      superHtml = '<tr class="datagrid-super-header-row">';
      if (this.bulkActions) {
        const bulkSpan = hasSubSubHdr ? 3 : 2;
        const bulkH = hasSubSubHdr ? 82 : 60;
        superHtml += `<th rowspan="${bulkSpan}" style="width:40px; text-align:center; position:sticky; top:0; left:0; z-index:26; background:var(--fm-bg-panel,#0f172a); border-bottom:1px solid rgba(255,255,255,0.12); height:${bulkH}px !important; line-height:${bulkH}px !important; vertical-align:middle !important;"><input type="checkbox" class="datagrid-select-all" /></th>`;
      }
      this.superHeaders.forEach((sh, shIdx) => {
        if (sh.rowSpan === 2 && sh.key) {
          const col = visibleCols.find(c => c.key === sh.key);
          if (col) {
            spannedKeys.add(col.key);
            const visibleIdx = visibleCols.indexOf(col);
            const isStickyRight = this.stickyActionCol && visibleIdx === visibleCols.length - 1;
            const borderLeftStyle = (isStickyRight || visibleIdx > 0) ? 'border-left:2px solid rgba(255,255,255,0.22) !important;' : '';
            const stickyStyle = isStickyRight ? 'position:sticky; top:0; right:0; z-index:26; background:var(--fm-bg-panel,#0f172a);' : 'position:sticky; top:0; z-index:25; background:var(--fm-bg-panel,#0f172a);';
            const widthVal = col.width || col.minWidth || '';
            const widthNum = parseInt(widthVal, 10) || null;
            const displayLabel = resolveHeaderLabel(col.label, widthNum, col.shortLabel, col.microLabel);
            const widthStyle = col.width ? `width:${col.width};` : (col.minWidth ? `min-width:${col.minWidth};` : '');
            const isDivider = this.dividerColKeys && this.dividerColKeys.has(col.key);
            const dividerClass = isDivider ? ' super-hdr-divider' : '';
            const customClass = (col.className ? ` ${col.className}` : '') + dividerClass;
            const rawTitle = col.headerTitle || col.title || col.label;
            const titleAttr = rawTitle ? ` title="${String(rawTitle).replace(/"/g, '&quot;')}"` : '';
            const rSpan = hasSubSubHdr ? 3 : 2;
            const rH = hasSubSubHdr ? 82 : 60;
            superHtml += `
              <th rowspan="${rSpan}"
                  class="text-center ${col.sortable ? 'datagrid-sortable' : ''}${customClass} datagrid-rowspan-2-header"
                  data-key="${col.key || ''}"
                  data-idx="${this.columns.indexOf(col)}"
                  draggable="true"${titleAttr}
                  style="${col.sortable ? 'cursor:pointer; user-select:none;' : ''} ${widthStyle} ${stickyStyle} ${borderLeftStyle} height:${rH}px !important; line-height:${rH}px !important; vertical-align:middle !important; font-size:12px !important; font-weight:700 !important; text-align:center !important; border-bottom:2px solid rgba(255,255,255,0.28) !important; ${sh.style || ''}">
                <div class="datagrid-header-content" style="display:inline-flex; align-items:center; justify-content:center; gap:2px; width:100%; max-width:100%; white-space:nowrap; vertical-align:middle; overflow:hidden;">
                  <span class="datagrid-header-label" data-full="${String(col.label || '').replace(/"/g, '&quot;')}" style="display:inline-flex; align-items:center;">${displayLabel}</span>
                  ${col.sortable ? (this.sortKey === col.key ? `<span class="sort-icon" style="display:inline-flex; align-items:center; font-size: 12px; line-height:1; color:#38bdf8; margin-left:2px; flex-shrink:0;">${this.sortAsc ? '▲' : '▼'}</span>` : '') : ''}
                </div>
              </th>
            `;
            return;
          }
        }
        const colSpanAttr = sh.colSpan ? ` colspan="${sh.colSpan}"` : '';
        const baseCls = sh.className ? (sh.className.includes('super-hdr') ? sh.className : `super-hdr ${sh.className}`) : 'super-hdr';
        const cls = ` class="${baseCls}"`;
        const st = sh.style ? ` style="position:sticky; top:0; z-index:20; ${sh.style}"` : ' style="position:sticky; top:0; z-index:20;"';
        superHtml += `<th${colSpanAttr}${cls}${st}>${sh.label}</th>`;
      });
      superHtml += '</tr>';
    } else {
      this.thead.classList.remove('has-super-headers');
    }

    let html = '<tr>';
    if (this.bulkActions && !hasSuperHdr) {
      html += `<th style="width:40px; text-align:center; position:sticky; top:0; left:0; z-index:15; background:var(--fm-bg-panel,#0f172a);"><input type="checkbox" class="datagrid-select-all" /></th>`;
    }

    visibleCols.forEach((col, visibleIdx) => {
      if (spannedKeys.has(col.key)) return;

      const hasSubSubHdr = hasSuperHdr && visibleCols.some(c => !spannedKeys.has(c.key) && c.subSubLabel);
      const topOffset = hasSuperHdr ? 'top:30px;' : 'top:0;';
      const isStickyRight = this.stickyActionCol && visibleIdx === visibleCols.length - 1;
      const tier2Border = hasSubSubHdr ? 'border-bottom:1px solid rgba(255,255,255,0.12) !important;' : 'border-bottom:2px solid rgba(255,255,255,0.28) !important;';
      const stickyStyle = isStickyRight
        ? `position:sticky; ${topOffset} right:0; z-index:21; ${tier2Border}`
        : (hasSuperHdr
          ? `position:sticky; top:30px; z-index:19; ${tier2Border}`
          : `position:sticky; top:0; z-index:19; ${tier2Border}`);
      const widthVal = col.width || col.minWidth || '';
      const widthNum = parseInt(widthVal, 10) || null;
      const displayLabel = resolveHeaderLabel(col.label, widthNum, col.shortLabel, col.microLabel);
      const widthStyle = col.width ? `width:${col.width};` : (col.minWidth ? `min-width:${col.minWidth};` : '');
      const isDivider = this.dividerColKeys && this.dividerColKeys.has(col.key);
      const dividerClass = isDivider ? ' super-hdr-divider' : '';
      const customClass = (col.className ? ` ${col.className}` : '') + dividerClass;
      const rawTitle = col.headerTitle || col.title || col.label;
      const titleAttr = rawTitle ? ` title="${String(rawTitle).replace(/"/g, '&quot;')}"` : '';
      const subHdrWeight = hasSuperHdr ? 'font-weight:700 !important;' : '';
      html += `
        <th class="text-center ${col.sortable ? 'datagrid-sortable' : ''}${customClass}${hasSuperHdr ? ' datagrid-sub-header' : ''}"
            data-key="${col.key || ''}"
            data-idx="${this.columns.indexOf(col)}"
            draggable="true"${titleAttr}
            style="${col.sortable ? 'cursor:pointer; user-select:none;' : ''} ${widthStyle} ${stickyStyle} ${subHdrWeight} ${col.headerStyle || ''} text-align:center !important;">
          <div class="datagrid-header-content" style="display:inline-flex; align-items:center; justify-content:center; gap:2px; width:100%; max-width:100%; white-space:nowrap; vertical-align:middle; overflow:hidden; color:inherit;">
            <span class="datagrid-header-label" data-full="${String(col.label || '').replace(/"/g, '&quot;')}" style="display:inline-flex; align-items:center; color:inherit;">${displayLabel}</span>
            ${col.sortable ? (this.sortKey === col.key ? `<span class="sort-icon" style="display:inline-flex; align-items:center; font-size: 12px; line-height:1; color:inherit; margin-left:2px; flex-shrink:0;">${this.sortAsc ? '▲' : '▼'}</span>` : '') : ''}
          </div>
        </th>
      `;
    });
    html += '</tr>';

    const hasSubSubHdr = hasSuperHdr && visibleCols.some(c => !spannedKeys.has(c.key) && c.subSubLabel);
    // Tier 3: Sub-Sub Header Row (Min / Max) when columns define subSubLabel
    let subSubHtml = '';
    if (hasSubSubHdr) {
      subSubHtml = '<tr>';
      visibleCols.forEach((col, visibleIdx) => {
        if (spannedKeys.has(col.key)) return;
        const isDivider = this.dividerColKeys && this.dividerColKeys.has(col.key);
        const dividerClass = isDivider ? ' super-hdr-divider' : '';
        const customClass = (col.className ? ` ${col.className}` : '') + dividerClass;
        const isStickyRight = this.stickyActionCol && visibleIdx === visibleCols.length - 1;
        const stickyStyle = isStickyRight
          ? 'position:sticky; top:60px; right:0; z-index:21;'
          : 'position:sticky; top:60px; z-index:19;';
        const lbl = col.subSubLabel || '—';
        subSubHtml += `
          <th class="text-center${customClass}" style="${stickyStyle} height:22px !important; line-height:22px !important; padding:0 4px !important; font-size:10px !important; font-weight:700 !important; color:#94a3b8 !important; background:#0b1120 !important; border-bottom:2px solid rgba(255,255,255,0.28) !important; white-space:nowrap;">
            ${lbl}
          </th>
        `;
      });
      subSubHtml += '</tr>';
    }

    this.thead.innerHTML = superHtml + html + subSubHtml;

    // Attach Sorting
    this.thead.querySelectorAll('.datagrid-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (!key) return;
        if (this.sortKey === key) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortKey = key;
          const descFirstKeys = ['totalEarnedScore', 'PTS', 'progressPct', 'PROG', 'grade', 'GRD', 'SCORE', 'averageScorePct'];
          this.sortAsc = descFirstKeys.includes(key) ? false : true;
        }
        this.sortData();
        this.renderHeaders();
        this.render();
      });
    });

    // Attach Drag and Drop for Reordering
    let draggedIdx = null;
    this.thead.querySelectorAll('th[draggable="true"]').forEach(th => {
      th.addEventListener('dragstart', (e) => {
        draggedIdx = parseInt(th.dataset.idx);
        e.dataTransfer.effectAllowed = 'move';
        th.style.opacity = '0.5';
      });
      th.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        th.style.borderLeft = '2px solid var(--clr-primary)';
      });
      th.addEventListener('dragleave', (e) => {
        th.style.borderLeft = '';
      });
      th.addEventListener('dragend', () => {
        th.style.opacity = '1';
        this.thead.querySelectorAll('th').forEach(t => t.style.borderLeft = '');
      });
      th.addEventListener('drop', (e) => {
        e.preventDefault();
        th.style.borderLeft = '';
        const targetIdx = parseInt(th.dataset.idx);
        if (draggedIdx !== null && draggedIdx !== targetIdx) {
          const colToMove = this.columns.splice(draggedIdx, 1)[0];
          const newIdx = this.columns.indexOf(this.columns.find((_, i) => i === targetIdx));
          this.columns.splice(newIdx !== -1 ? newIdx : targetIdx, 0, colToMove);
          this.renderHeaders();
          this.render();
        }
      });
    });

    if (this.bulkActions) {
      this.selectAllCb = this.container.querySelector('.datagrid-select-all');
      if (this.selectAllCb) {
        this.selectAllCb.addEventListener('change', (e) => {
          const checked = e.target.checked;
          const rowCbs = this.tbody.querySelectorAll('.datagrid-row-cb');
          rowCbs.forEach(cb => {
            cb.checked = checked;
            if (checked) this.selectedIds.add(cb.value);
            else this.selectedIds.delete(cb.value);
          });
          this.updateBulkUI();
        });
      }
    }
  }

  /**
   * Automatically calculates and applies content-proportional widths across all visible columns.
   */
  autoFitColumns(persist = false) {
    const tableEl = this.container?.querySelector('.datagrid-table');
    const colgroup = this.container?.querySelector('.datagrid-colgroup');
    if (!tableEl || !colgroup) return;

    const cols = colgroup.querySelectorAll('col');
    const visibleCols = this.columns.filter(c => !c.hidden);
    const ths = visibleCols.map(col => {
      if (col.key) {
        const found = this.thead?.querySelector(`th[data-key="${col.key}"]`);
        if (found) return found;
      }
      return this.thead?.querySelector(`th[data-idx="${this.columns.indexOf(col)}"]`);
    }).filter(Boolean);
    if (!ths.length) return;

    const colOffset = this.bulkActions ? 1 : 0;
    const currentWidths = {};

    ths.forEach((th, thIdx) => {
      const colIdx = thIdx + colOffset;
      const colEl = cols[colIdx];
      if (!colEl) return;

      const cells = Array.from(tableEl.querySelectorAll('tbody tr')).map(r => r.cells[colIdx]).filter(Boolean);
      const footerCells = Array.from(tableEl.querySelectorAll('tfoot tr, .datagrid-summary-row')).map(r => r.cells[colIdx]).filter(Boolean);
      const autoWidth = calculateColumnAutoWidth(th, cells, footerCells);
      colEl.style.width = autoWidth + 'px';
      th.style.width = autoWidth + 'px';
      currentWidths[colIdx] = autoWidth;
    });

    if (persist) {
      const effectiveTableId = this.tableId || this.container?.id || 'datagrid';
      const storageKey = `topscore_col_widths_${effectiveTableId}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(currentWidths));
      } catch (err) {}
    }
  }

  /**
   * Rule 15: Dynamic Column Resizing with Persistent Width Memory (Excel-Like)
   * Attaches drag-resize handles to each th, auto-size on double-click,
   * and persists widths to localStorage keyed by tableId.
   */
  initColumnResize(tableId) {
    const tableEl = this.container?.querySelector('.datagrid-table');
    const colgroup = this.container?.querySelector('.datagrid-colgroup');
    if (!tableEl || !colgroup) return;

    // Determine storage key
    const effectiveTableId = tableId || this.tableId || this.container?.id || 'datagrid';
    const storageKey = `topscore_col_widths_${effectiveTableId}`;

    // Load saved widths from localStorage
    let savedWidths = {};
    try {
      savedWidths = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (e) { savedWidths = {}; }

    // Apply saved widths to colgroup <col> elements and matching <th>
    const cols = colgroup.querySelectorAll('col');
    const visibleCols = this.columns.filter(c => !c.hidden);
    const ths = visibleCols.map(col => {
      if (col.key) {
        const found = this.thead?.querySelector(`th[data-key="${col.key}"]`);
        if (found) return found;
      }
      return this.thead?.querySelector(`th[data-idx="${this.columns.indexOf(col)}"]`);
    }).filter(Boolean);
    if (!ths.length) return;

    const colOffset = this.bulkActions ? 1 : 0;
    let hasCustomSavedWidths = Object.keys(savedWidths).length > 0;

    // Discard saved widths if column count doesn't match current visible columns (e.g. schema updated)
    if (hasCustomSavedWidths && Object.keys(savedWidths).length !== visibleCols.length) {
      savedWidths = {};
      hasCustomSavedWidths = false;
      try { localStorage.removeItem(storageKey); } catch (e) {}
    }

    if (hasCustomSavedWidths) {
      cols.forEach((col, i) => {
        const colDef = visibleCols[i - colOffset];
        // If it's a §TABLE-FLEX-PRIMARY column (has minWidth but no explicit width), let it flex
        if (colDef && colDef.minWidth && !colDef.width) {
          return;
        }
        if (savedWidths[i] != null) {
          col.style.width = savedWidths[i] + 'px';
          const thIdx = i - colOffset;
          if (thIdx >= 0 && ths[thIdx]) {
            ths[thIdx].style.width = savedWidths[i] + 'px';
            const labelSpan = ths[thIdx].querySelector('.datagrid-header-label');
            if (labelSpan && colDef) {
              labelSpan.textContent = resolveHeaderLabel(colDef.label, savedWidths[i], colDef.shortLabel, colDef.microLabel);
            }
          }
        }
      });
    } else if (this.autoFitOnMount) {
      this.autoFitColumns(false);
    }

    // Attach resize handles to each header th
    ths.forEach((th, thIdx) => {
      // Skip super-headers that span multiple columns (allow rowspan=2 standalone headers)
      if (th.closest('.datagrid-super-header-row') && !th.classList.contains('datagrid-rowspan-2-header')) return;

      // Skip existing handles
      if (th.querySelector('.col-resize-handle')) return;

      // Keep th positioning for the handle
      if (getComputedStyle(th).position === 'static') {
        th.style.position = 'relative';
      }

      const handle = document.createElement('div');
      handle.className = 'col-resize-handle';
      handle.title = 'Drag to resize column. Double-click to auto-size.';
      th.appendChild(handle);

      let startX = 0;
      let startWidth = 0;
      let colEl = null;

      // Find the matching <col> (accounting for bulkActions col offset)
      const colIdx = thIdx + colOffset;

      // mousedown — start drag
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        colEl = cols[colIdx];
        startWidth = colEl ? (parseInt(colEl.style.width) || th.getBoundingClientRect().width) : th.getBoundingClientRect().width;
        handle.classList.add('dragging');
        tableEl.style.tableLayout = 'fixed';

        const onMouseMove = (me) => {
          const delta = me.clientX - startX;
          const newWidth = Math.max(30, Math.min(600, startWidth + delta));
          if (colEl) colEl.style.width = newWidth + 'px';
          th.style.width = newWidth + 'px';
          const labelSpan = th.querySelector('.datagrid-header-label');
          const colDef = visibleCols[thIdx];
          if (labelSpan && colDef) {
            labelSpan.textContent = resolveHeaderLabel(colDef.label, newWidth, colDef.shortLabel, colDef.microLabel);
          }
        };

        const onMouseUp = (me) => {
          handle.classList.remove('dragging');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          // Save to localStorage
          const currentWidths = {};
          cols.forEach((c, i) => {
            const w = parseInt(c.style.width);
            if (w) currentWidths[i] = w;
          });
          try { localStorage.setItem(storageKey, JSON.stringify(currentWidths)); } catch (err) {}
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });

      // double-click — auto-size best-fit smoothly with canvas measurement
      handle.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        colEl = cols[colIdx];
        if (!colEl) return;

        const cells = Array.from(tableEl.querySelectorAll('tbody tr')).map(r => r.cells[colIdx]).filter(Boolean);
        const footerCells = Array.from(tableEl.querySelectorAll('tfoot tr, .datagrid-summary-row')).map(r => r.cells[colIdx]).filter(Boolean);
        const autoWidth = calculateColumnAutoWidth(th, cells, footerCells);
        colEl.style.width = autoWidth + 'px';
        th.style.width = autoWidth + 'px';
        const labelSpan = th.querySelector('.datagrid-header-label');
        const colDef = visibleCols[thIdx];
        if (labelSpan && colDef) {
          labelSpan.textContent = resolveHeaderLabel(colDef.label, autoWidth, colDef.shortLabel, colDef.microLabel);
        }

        // Save
        const currentWidths = {};
        cols.forEach((c, i) => {
          const w = parseInt(c.style.width);
          if (w) currentWidths[i] = w;
        });
        try { localStorage.setItem(storageKey, JSON.stringify(currentWidths)); } catch (err) {}
      });
    });

    // Double-click on super-header row resets all column widths
    const superRow = this.thead?.querySelector('.datagrid-super-header-row');
    if (superRow) {
      superRow.addEventListener('dblclick', () => {
        try { localStorage.removeItem(storageKey); } catch (err) {}
        cols.forEach(col => col.style.width = '');
        ths.forEach(th => th.style.width = '');
        tableEl.style.tableLayout = 'fixed';
        if (this.autoFitOnMount) {
          this.autoFitColumns(false);
        }
      });
    }
  }

  filterData(query) {
    if (!query || !query.trim()) {
      this.filteredData = [...this.rawData];
    } else {
      const q = query.toLowerCase().trim();
      this.filteredData = this.rawData.filter(row => {
        return this.searchKeys.some(key => {
          const val = String(row[key] || '').toLowerCase();
          return val.includes(q);
        });
      });
    }
    this.sortData();
  }

  sortData() {
    if (!this.sortKey) return;
    this.filteredData.sort((a, b) => {
      if (typeof this.sortComparator === 'function') {
        const customResult = this.sortComparator(this.sortKey, this.sortAsc ? 'asc' : 'desc', a, b);
        if (customResult !== undefined && customResult !== null) return customResult;
      }
      let valA = a[this.sortKey];
      let valB = b[this.sortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.sortAsc ? -1 : 1;
      if (valA > valB) return this.sortAsc ? 1 : -1;
      return 0;
    });
  }

  getSelection() {
    return Array.from(this.selectedIds);
  }

  selectAllRows(filterFn = null) {
    if (!this.bulkActions) return;
    this.selectedIds.clear();
    const target = filterFn ? this.filteredData.filter(filterFn) : this.filteredData;
    target.forEach(r => {
      if (r && r.id) this.selectedIds.add(String(r.id));
    });
    if (this.tbody) {
      const rowCbs = this.tbody.querySelectorAll('.datagrid-row-cb');
      rowCbs.forEach(cb => {
        cb.checked = this.selectedIds.has(String(cb.value));
      });
    }
    if (this.selectAllCb) {
      this.selectAllCb.checked = this.selectedIds.size > 0 && this.selectedIds.size === this.filteredData.length;
    }
    this.updateBulkUI();
  }

  clearSelection() {
    if (!this.bulkActions) return;
    this.selectedIds.clear();
    if (this.tbody) {
      const rowCbs = this.tbody.querySelectorAll('.datagrid-row-cb');
      rowCbs.forEach(cb => { cb.checked = false; });
    }
    if (this.selectAllCb) this.selectAllCb.checked = false;
    this.updateBulkUI();
  }

  updateBulkUI() {
    if (!this.bulkActions) return;

    if (this.customBulkActions && this.customBulkActions.length > 0) {
      const btns = this.container.querySelectorAll('.datagrid-custom-bulk-btn');
      const counts = this.container.querySelectorAll('.datagrid-bulk-count');
      if (this.selectedIds.size > 0) {
        btns.forEach(btn => btn.classList.remove('hidden'));
        counts.forEach(count => count.textContent = this.selectedIds.size);
      } else {
        btns.forEach(btn => btn.classList.add('hidden'));
      }
    } else {
      const btn = this.container.querySelector('.datagrid-bulk-btn');
      const count = this.container.querySelector('.datagrid-bulk-count');
      if (btn && count) {
        if (this.selectedIds.size > 0) {
          btn.classList.remove('hidden');
          count.textContent = this.selectedIds.size;
        } else {
          btn.classList.add('hidden');
        }
      }
    }
  }

  render() {
    if (this.countLabel) {
      this.countLabel.textContent = `${this.filteredData.length} records`;
    }
    if (!this.tbody) return;
    this.tbody.innerHTML = '';
    const visibleCols = this.columns.filter(c => !c.hidden);

    if (this.filteredData.length === 0) {
      const colSpan = visibleCols.length + (this.bulkActions ? 1 : 0);
      this.tbody.innerHTML = `<tr><td colspan="${colSpan}">${this.emptyStateHtml}</td></tr>`;
      this.renderPagination(0);
      return;
    }

    const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    const pageData = this.filteredData.slice(start, end);

    // High-performance batched DOM insertion via DocumentFragment
    const fragment = typeof document !== 'undefined' ? document.createDocumentFragment() : null;

    pageData.forEach(row => {
      const tr = document.createElement('tr');
      if (this.rowClassName) {
        const cls = typeof this.rowClassName === 'function' ? this.rowClassName(row) : this.rowClassName;
        if (cls) tr.className = cls;
      }
      if (this.onRowClick) {
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
          // Avoid triggering row click if they clicked a checkbox or a button inside the row
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
          this.onRowClick(row);
        });
      }

      if (this.bulkActions) {
        const tdCb = document.createElement('td');
        tdCb.style.textAlign = 'center';
        tdCb.style.position = 'sticky';
        tdCb.style.left = '0';
        tdCb.style.background = 'var(--clr-bg-1)';
        tdCb.style.zIndex = '5';
        tdCb.innerHTML = `<input type="checkbox" class="datagrid-row-cb" value="${row.id}" ${this.selectedIds.has(String(row.id)) ? 'checked' : ''} />`;
        tdCb.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) this.selectedIds.add(String(row.id));
          else this.selectedIds.delete(String(row.id));
          this.updateBulkUI();
        });
        tr.appendChild(tdCb);
      }

      visibleCols.forEach((col, visibleIdx) => {
        const td = document.createElement('td');
        if (col.align) {
          td.classList.add(`text-${col.align}`);
        } else {
          // Rule 4.2.4: Text cells default to left; numeric/codes/status/duration default to center
          const keyLower = String(col.key || '').toLowerCase();
          const labelLower = String(col.label || '').toLowerCase();
          const isLeft = keyLower.includes('name') || keyLower.includes('title') ||
                         keyLower.includes('indonesian') || keyLower.includes('english') ||
                         keyLower.includes('meaning') || keyLower.includes('desc') ||
                         labelLower.includes('name') || labelLower.includes('title');
          td.classList.add(isLeft ? 'text-left' : 'text-center');
        }
        if (col.className) td.className += ' ' + col.className;
        if (this.dividerColKeys && this.dividerColKeys.has(col.key) && !td.classList.contains('super-hdr-divider')) {
          td.classList.add('super-hdr-divider');
        }
        if (col.width) {
          td.style.width = col.width;
        }

        const isStickyRight = this.stickyActionCol && visibleIdx === visibleCols.length - 1;
        if (isStickyRight) {
          td.style.position = 'sticky';
          td.style.right = '0';
          td.style.background = 'var(--clr-bg-1)';
          td.style.zIndex = '5';
          td.style.borderLeft = '2px solid rgba(255, 255, 255, 0.22)';
        }

        const getNestedVal = (obj, key) => {
          if (!obj || !key) return undefined;
          if (key in obj) return obj[key];
          return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
        };

        if (col.render) {
          const val = col.key ? getNestedVal(row, col.key) : undefined;
          let content = '';
          try {
            if (typeof col.render === 'function') {
              if (col.render.length > 1) {
                content = col.render(val !== undefined ? val : row, row);
              } else {
                content = col.render(row);
              }
            } else {
              content = String(val ?? '');
            }
          } catch (renderErr) {
            console.warn('[DataGrid] col.render error for key ' + (col.key || 'unknown') + ':', renderErr);
            content = `<span class="badge badge-warning text-xs" title="${escapeHtml(renderErr.message)}">Render Error</span>`;
          }
          if (content instanceof HTMLElement) {
            td.appendChild(content);
          } else if (typeof content === 'object' && content !== null) {
            td.innerHTML = escapeHtml(content.name || content.title || content.label || JSON.stringify(content));
          } else {
            td.innerHTML = content ?? '';
          }
        } else if (col.key) {
          const raw = getNestedVal(row, col.key);
          if (typeof raw === 'object' && raw !== null) {
            td.textContent = raw.name || raw.title || raw.label || JSON.stringify(raw);
          } else {
            td.textContent = raw ?? '';
          }
        }
        tr.appendChild(td);
      });
      if (fragment) {
        fragment.appendChild(tr);
      } else {
        this.tbody.appendChild(tr);
      }
    });

    if (fragment) {
      this.tbody.appendChild(fragment);
    }

    if (this.bulkActions && this.selectAllCb) {
      this.selectAllCb.checked = pageData.length > 0 && pageData.every(r => this.selectedIds.has(String(r.id)));
    }

    if (this.summaryRow && this.tfoot) {
      this.tfoot.style.display = '';
      if (typeof this.summaryRow === 'function') {
        this.tfoot.innerHTML = this.summaryRow(visibleCols, this.filteredData, pageData);
      } else if (typeof this.summaryRow === 'string') {
        this.tfoot.innerHTML = this.summaryRow;
      }
      if (this.dividerColKeys && this.dividerColKeys.size > 0) {
        const footRows = this.tfoot.querySelectorAll('tr');
        footRows.forEach(tr => {
          visibleCols.forEach((col, idx) => {
            if (this.dividerColKeys.has(col.key) && tr.cells[idx] && !tr.cells[idx].classList.contains('super-hdr-divider')) {
              tr.cells[idx].classList.add('super-hdr-divider');
            }
          });
        });
      }
      if (this.stickyActionCol) {
        const footRows = this.tfoot.querySelectorAll('tr');
        footRows.forEach(tr => {
          const lastCell = tr.cells[visibleCols.length - 1];
          if (lastCell) {
            lastCell.style.position = 'sticky';
            lastCell.style.right = '0';
            lastCell.style.background = '#0f172a';
            lastCell.style.zIndex = '5';
            lastCell.style.borderLeft = '2px solid rgba(255, 255, 255, 0.22)';
          }
        });
      }
    } else if (this.tfoot) {
      this.tfoot.innerHTML = '';
      this.tfoot.style.display = 'none';
    }

    this.renderPagination(totalPages);
  }

  updateData(newData) {
    this.rawData = newData;
    const query = this.searchInput ? this.searchInput.value : '';
    if (query && query.trim()) {
      this.filterData(query);
    } else {
      this.filteredData = [...newData];
      if (this.sortKey) this.sortData();
    }
    this.currentPage = 1;
    this.render();
  }

  renderPagination(totalPages) {
    if (!this.paginationContainer) return;
    this.paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const createBtn = (text, page, disabled = false, active = false) => {
      const btn = document.createElement('button');
      btn.className = `btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`;
      btn.textContent = text;
      btn.disabled = disabled;
      if (!disabled && !active) {
        btn.addEventListener('click', () => {
          this.currentPage = page;
          this.render();
        });
      }
      return btn;
    };

    this.paginationContainer.appendChild(createBtn('«', 1, this.currentPage === 1));
    this.paginationContainer.appendChild(createBtn('‹', this.currentPage - 1, this.currentPage === 1));

    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, this.currentPage + 2);

    if (this.currentPage <= 2) endPage = Math.min(5, totalPages);
    if (this.currentPage >= totalPages - 1) startPage = Math.max(1, totalPages - 4);

    for (let i = startPage; i <= endPage; i++) {
      this.paginationContainer.appendChild(createBtn(String(i), i, false, this.currentPage === i));
    }

    this.paginationContainer.appendChild(createBtn('›', this.currentPage + 1, this.currentPage === totalPages));
    this.paginationContainer.appendChild(createBtn('»', totalPages, this.currentPage === totalPages));
  }

  destroy() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._docClickHandler) {
      document.removeEventListener('click', this._docClickHandler);
      this._docClickHandler = null;
    }
    if (this.container && this.container._datagridInstance === this) {
      delete this.container._datagridInstance;
    }
  }

}

// Authoritative Universal Column Resizer for Custom Tables (Rule 31 / Pillar 15)
export function initColumnResize(tableElement, storageKey) {
  if (!tableElement) return;
  const ths = tableElement.querySelectorAll('thead th:not(.super-hdr):not(.super-th):not([colspan]):not([rowspan])');
  if (!ths || !ths.length) return;
  const key = storageKey || `topscore_col_widths_${tableElement.id || 'custom_table'}`;
  let savedWidths = {};
  try { savedWidths = JSON.parse(localStorage.getItem(key) || '{}'); } catch(e) {}
  ths.forEach((th, idx) => {
    if (savedWidths[idx]) {
      th.style.width = savedWidths[idx] + 'px';
      const labelSpan = th.querySelector('.datagrid-header-label');
      if (labelSpan) {
        const full = th.getAttribute('title') || labelSpan.getAttribute('data-full') || labelSpan.textContent;
        labelSpan.textContent = resolveHeaderLabel(full, savedWidths[idx]);
      }
    }
    if (th.querySelector('.col-resize-handle')) return;
    if (getComputedStyle(th).position === 'static') th.style.position = 'relative';
    const handle = document.createElement('div');
    handle.className = 'col-resize-handle';
    handle.title = 'Drag to resize column. Double-click to auto-size.';
    th.appendChild(handle);
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;
      handle.classList.add('dragging');
      const onMove = (me) => {
        const newW = Math.max(30, Math.min(600, startWidth + (me.clientX - startX)));
        th.style.width = newW + 'px';
        const labelSpan = th.querySelector('.datagrid-header-label');
        if (labelSpan) {
          const full = th.getAttribute('title') || labelSpan.getAttribute('data-full') || labelSpan.textContent;
          labelSpan.textContent = resolveHeaderLabel(full, newW);
        }
      };
      const onUp = () => {
        handle.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const curWidths = {};
        ths.forEach((t, i) => { const w = parseInt(t.style.width); if (w) curWidths[i] = w; });
        try { localStorage.setItem(key, JSON.stringify(curWidths)); } catch (_) {}
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    handle.addEventListener('dblclick', (e) => {
      e.preventDefault(); e.stopPropagation();
      const cells = Array.from(tableElement.querySelectorAll('tbody tr')).map(r => r.cells[idx]).filter(Boolean);
      const footerCells = Array.from(tableElement.querySelectorAll('tfoot tr, .datagrid-summary-row')).map(r => r.cells[idx]).filter(Boolean);
      const autoW = calculateColumnAutoWidth(th, cells, footerCells);
      th.style.width = autoW + 'px';
      const labelSpan = th.querySelector('.datagrid-header-label');
      if (labelSpan) {
        const full = th.getAttribute('title') || labelSpan.getAttribute('data-full') || labelSpan.textContent;
        labelSpan.textContent = resolveHeaderLabel(full, autoW);
      }
      const curWidths = {};
      ths.forEach((t, i) => { const w = parseInt(t.style.width); if (w) curWidths[i] = w; });
      try { localStorage.setItem(key, JSON.stringify(curWidths)); } catch (_) {}
    });
  });
}

if (typeof window !== 'undefined') {
  window.initColumnResize = initColumnResize;
}

// Universal auto-attach observer so all tables across all screens get column resizing (Rule 2.38 / Pillar 15)
export function initAllTablesColumnResize() {
  if (typeof document === 'undefined') return;
  const tables = document.querySelectorAll('#admin-console table:not(.no-resize), .table-wrap table');
  tables.forEach(table => {
    if (!table.dataset.colResizeInit) {
      table.dataset.colResizeInit = 'true';
      if (typeof window !== 'undefined' && window.initColumnResize) {
        window.initColumnResize(table);
      }
    }
  });
}

if (typeof window !== 'undefined') {
  window.initAllTablesColumnResize = initAllTablesColumnResize;
}

if (typeof document !== 'undefined') {
  // Observe DOM additions in #admin-console to automatically attach resize handles
  const observer = new MutationObserver(() => {
    window.initAllTablesColumnResize();
  });
  const consoleEl = document.getElementById('admin-console') || document.body;
  if (consoleEl) {
    observer.observe(consoleEl, { childList: true, subtree: true });
  }
  // Initial run on DOMContentLoaded or immediate
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initAllTablesColumnResize);
  } else {
    window.initAllTablesColumnResize();
  }
}
