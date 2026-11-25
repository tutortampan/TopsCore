/**
 * TOPSCORE LMS — TABLE BUILDER & DESIGN STUDIO (SSOT)
 * 3-Card Workspace Layout Architecture:
 * - Card 1 (Top Left): Table Dimensions & Styling Editor (Two-Tier Header: HEIGHT MIN/MAX, WIDTH MIN/MAX, TYPOGRAPHY SIZE/WEIGHT; Bottom CTA)
 * - Card 2 (Bottom Left): Live Interactive Table Specimen (6 Columns: 3 Regular Headers + 1 Super Header (3 Cols) with 3 Sub-Headers, 10 Body Rows, Sticky Footer; Bottom CTA)
 * - Card 3 (Right, Full Height): TopsCore Table Architecture & Governance Card (6 Exhaustive Sections, Grid Selector, Bottom CTA)
 * Strict 10px Gap & Viewport Lock Compliance
 * Route: admin.html#interface-settings (Tab: Table Designs)
 */

import { showToast, escHtml } from '../app.js?v=20261106_v160';

const STORAGE_KEY = 'topscore_table_builder_settings';

export const SSOT_DEFAULTS = Object.freeze({
  // Regular Header (Rowspan 2, 3 Columns)
  regularHeaderHeight: 60,
  regularHeaderMinHeight: 60,
  regularHeaderMaxHeight: 60,
  regularHeaderMinWidth: 90,
  regularHeaderMaxWidth: 140,
  regularHeaderFontSize: 12,
  regularHeaderFontWeight: '800',
  regularHeaderBg: '#0f172a',
  regularHeaderColor: '#f8fafc',

  // Super Header (Tier 1, 3 Columns)
  superHeaderHeight: 30,
  superHeaderMinHeight: 30,
  superHeaderMaxHeight: 30,
  superHeaderMinWidth: 240,
  superHeaderMaxWidth: 300,
  superHeaderFontSize: 12,
  superHeaderFontWeight: '800',
  superHeaderBg: '#0f172a',
  superHeaderColor: '#f8fafc',

  // Sub-Header (Tier 2, 3 Columns)
  subHeaderHeight: 30,
  subHeaderMinHeight: 30,
  subHeaderMaxHeight: 30,
  subHeaderMinWidth: 80,
  subHeaderMaxWidth: 100,
  subHeaderFontSize: 12,
  subHeaderFontWeight: '700',
  subHeaderBg: '#0f172a',
  subHeaderColor: '#94a3b8',

  // Table Body (10 Rows, 6 Columns)
  bodyRowHeight: 32,
  bodyRowMinHeight: 24,
  bodyRowMaxHeight: 32,
  bodyColMinWidth: 80,
  bodyColMaxWidth: 140,
  bodyFontSize: 12,
  bodyFontWeight: '600',
  bodyBg: 'rgba(255,255,255,0.02)',
  bodyColor: '#ffffff',
  cellPaddingX: 8,

  // Sticky Footer (Summary Row, 6 Columns)
  footerHeight: 32,
  footerMinHeight: 32,
  footerMaxHeight: 32,
  footerMinWidth: 80,
  footerMaxWidth: 140,
  footerFontSize: 12,
  footerFontWeight: '800',
  footerBg: '#0f172a',
  footerColor: '#f8fafc',
  footerBorderTop: 'rgba(255,255,255,0.25)',

  gridMode: 'normal' // 'normal' | 'excel'
});

export function getSavedTableSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...SSOT_DEFAULTS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...SSOT_DEFAULTS };
    const p = JSON.parse(raw);
    const sH = Number(p.superHeaderHeight || p.superHeaderMaxHeight) || SSOT_DEFAULTS.superHeaderHeight;
    const subH = Number(p.subHeaderHeight || p.subHeaderMaxHeight) || SSOT_DEFAULTS.subHeaderHeight;
    const regH = Number(p.regularHeaderHeight || p.regularHeaderMaxHeight) || (sH + subH);

    return {
      regularHeaderHeight: regH,
      regularHeaderMinHeight: Number(p.regularHeaderMinHeight) || regH,
      regularHeaderMaxHeight: Number(p.regularHeaderMaxHeight) || regH,
      regularHeaderMinWidth: Number(p.regularHeaderMinWidth) || SSOT_DEFAULTS.regularHeaderMinWidth,
      regularHeaderMaxWidth: Number(p.regularHeaderMaxWidth) || SSOT_DEFAULTS.regularHeaderMaxWidth,
      regularHeaderFontSize: Number(p.regularHeaderFontSize) || SSOT_DEFAULTS.regularHeaderFontSize,
      regularHeaderFontWeight: String(p.regularHeaderFontWeight || SSOT_DEFAULTS.regularHeaderFontWeight),
      regularHeaderBg: p.regularHeaderBg || SSOT_DEFAULTS.regularHeaderBg,
      regularHeaderColor: p.regularHeaderColor || SSOT_DEFAULTS.regularHeaderColor,

      superHeaderHeight: sH,
      superHeaderMinHeight: Number(p.superHeaderMinHeight) || sH,
      superHeaderMaxHeight: Number(p.superHeaderMaxHeight) || sH,
      superHeaderMinWidth: Number(p.superHeaderMinWidth) || SSOT_DEFAULTS.superHeaderMinWidth,
      superHeaderMaxWidth: Number(p.superHeaderMaxWidth) || SSOT_DEFAULTS.superHeaderMaxWidth,
      superHeaderFontSize: Number(p.superHeaderFontSize) || SSOT_DEFAULTS.superHeaderFontSize,
      superHeaderFontWeight: String(p.superHeaderFontWeight || SSOT_DEFAULTS.superHeaderFontWeight),
      superHeaderBg: p.superHeaderBg || SSOT_DEFAULTS.superHeaderBg,
      superHeaderColor: p.superHeaderColor || SSOT_DEFAULTS.superHeaderColor,

      subHeaderHeight: subH,
      subHeaderMinHeight: Number(p.subHeaderMinHeight) || subH,
      subHeaderMaxHeight: Number(p.subHeaderMaxHeight) || subH,
      subHeaderMinWidth: Number(p.subHeaderMinWidth) || SSOT_DEFAULTS.subHeaderMinWidth,
      subHeaderMaxWidth: Number(p.subHeaderMaxWidth) || SSOT_DEFAULTS.subHeaderMaxWidth,
      subHeaderFontSize: Number(p.subHeaderFontSize) || SSOT_DEFAULTS.subHeaderFontSize,
      subHeaderFontWeight: String(p.subHeaderFontWeight || SSOT_DEFAULTS.subHeaderFontWeight),
      subHeaderBg: p.subHeaderBg || SSOT_DEFAULTS.subHeaderBg,
      subHeaderColor: p.subHeaderColor || SSOT_DEFAULTS.subHeaderColor,

      bodyRowHeight: Number(p.bodyRowHeight || p.bodyRowMaxHeight) || SSOT_DEFAULTS.bodyRowHeight,
      bodyRowMinHeight: Number(p.bodyRowMinHeight) || SSOT_DEFAULTS.bodyRowMinHeight,
      bodyRowMaxHeight: Number(p.bodyRowMaxHeight) || SSOT_DEFAULTS.bodyRowMaxHeight,
      bodyColMinWidth: Number(p.bodyColMinWidth) || SSOT_DEFAULTS.bodyColMinWidth,
      bodyColMaxWidth: Number(p.bodyColMaxWidth) || SSOT_DEFAULTS.bodyColMaxWidth,
      bodyFontSize: Number(p.bodyFontSize) || SSOT_DEFAULTS.bodyFontSize,
      bodyFontWeight: String(p.bodyFontWeight || SSOT_DEFAULTS.bodyFontWeight),
      bodyBg: p.bodyBg || SSOT_DEFAULTS.bodyBg,
      bodyColor: p.bodyColor || SSOT_DEFAULTS.bodyColor,
      cellPaddingX: Number(p.cellPaddingX) || SSOT_DEFAULTS.cellPaddingX,

      footerHeight: Number(p.footerHeight || p.footerMaxHeight) || SSOT_DEFAULTS.footerHeight,
      footerMinHeight: Number(p.footerMinHeight) || SSOT_DEFAULTS.footerMinHeight,
      footerMaxHeight: Number(p.footerMaxHeight) || SSOT_DEFAULTS.footerMaxHeight,
      footerMinWidth: Number(p.footerMinWidth) || SSOT_DEFAULTS.footerMinWidth,
      footerMaxWidth: Number(p.footerMaxWidth) || SSOT_DEFAULTS.footerMaxWidth,
      footerFontSize: Number(p.footerFontSize) || SSOT_DEFAULTS.footerFontSize,
      footerFontWeight: String(p.footerFontWeight || SSOT_DEFAULTS.footerFontWeight),
      footerBg: p.footerBg || SSOT_DEFAULTS.footerBg,
      footerColor: p.footerColor || SSOT_DEFAULTS.footerColor,
      footerBorderTop: p.footerBorderTop || SSOT_DEFAULTS.footerBorderTop,

      gridMode: p.gridMode || SSOT_DEFAULTS.gridMode
    };
  } catch (e) {
    return { ...SSOT_DEFAULTS };
  }
}

/**
 * Injects/updates global dynamic CSS for table dimensions and typography across TopsCore
 * Automatically invoked on every setting edit so all tables update instantaneously
 */
export function applyGlobalTableDimensions(cfg) {
  if (typeof document === 'undefined') return;
  const sH = Number(cfg.superHeaderMaxHeight) || Number(cfg.superHeaderHeight) || SSOT_DEFAULTS.superHeaderHeight;
  const subH = Number(cfg.subHeaderMaxHeight) || Number(cfg.subHeaderHeight) || SSOT_DEFAULTS.subHeaderHeight;
  const totalH = Number(cfg.regularHeaderMaxHeight) || Number(cfg.regularHeaderHeight) || (sH + subH);
  const minRH = Number(cfg.bodyRowMinHeight) || SSOT_DEFAULTS.bodyRowMinHeight;
  const maxRH = Number(cfg.bodyRowMaxHeight) || Number(cfg.bodyRowHeight) || SSOT_DEFAULTS.bodyRowMaxHeight;
  const fH = Number(cfg.footerMaxHeight) || Number(cfg.footerHeight) || SSOT_DEFAULTS.footerHeight;
  const pX = Number(cfg.cellPaddingX) || SSOT_DEFAULTS.cellPaddingX;

  document.documentElement.style.setProperty('--table-super-header-height', `${sH}px`);
  document.documentElement.style.setProperty('--table-sub-header-height', `${subH}px`);
  document.documentElement.style.setProperty('--table-total-header-height', `${totalH}px`);
  document.documentElement.style.setProperty('--table-row-min-height', `${minRH}px`);
  document.documentElement.style.setProperty('--table-row-max-height', `${maxRH}px`);
  document.documentElement.style.setProperty('--table-row-height', `${maxRH}px`);
  document.documentElement.style.setProperty('--table-footer-height', `${fH}px`);
  document.documentElement.style.setProperty('--table-cell-padding-x', `${pX}px`);

  let styleEl = document.getElementById('topscore-table-dimensions-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'topscore-table-dimensions-style';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    :root {
      --table-super-header-height: ${sH}px;
      --table-sub-header-height: ${subH}px;
      --table-total-header-height: ${totalH}px;
      --table-row-min-height: ${minRH}px;
      --table-row-max-height: ${maxRH}px;
      --table-row-height: ${maxRH}px;
      --table-footer-height: ${fH}px;
      --table-cell-padding-x: ${pX}px;
    }

    .datagrid-thead tr.datagrid-super-header-row th:not([rowspan="2"]),
    .datagrid-thead tr.datagrid-super-header-row th.super-hdr:not([rowspan="2"]),
    #class-attendance-grid thead tr:nth-child(1) th:not([rowspan="2"]),
    #blueprint-matrix-table thead tr.bp-super-header-row th:not([rowspan="2"]),
    .classes-hub-workspace table thead tr:nth-child(1) th:not([rowspan="2"]) {
      height: ${sH}px !important;
      min-height: ${Number(cfg.superHeaderMinHeight) || sH}px !important;
      max-height: ${sH}px !important;
      line-height: ${sH}px !important;
      font-size: ${cfg.superHeaderFontSize || 12}px !important;
      font-weight: ${cfg.superHeaderFontWeight || 800} !important;
    }

    .datagrid-thead.has-super-headers tr:not(.datagrid-super-header-row) th,
    .datagrid-thead:has(.datagrid-super-header-row) tr:not(.datagrid-super-header-row) th,
    .table-wrap table thead.has-super-headers tr:not(.datagrid-super-header-row) th,
    th.datagrid-sub-header,
    th.sub-hdr,
    #class-attendance-grid thead tr:nth-child(2) th,
    #blueprint-matrix-table thead tr:nth-child(2) th,
    .classes-hub-workspace table thead tr:nth-child(2) th {
      top: ${sH}px !important;
      height: ${subH}px !important;
      min-height: ${Number(cfg.subHeaderMinHeight) || subH}px !important;
      max-height: ${subH}px !important;
      line-height: ${subH}px !important;
      font-size: ${cfg.subHeaderFontSize || 12}px !important;
      font-weight: ${cfg.subHeaderFontWeight || 700} !important;
    }

    .datagrid-thead tr.datagrid-super-header-row th[rowspan="2"],
    .datagrid-thead tr.datagrid-super-header-row th.datagrid-rowspan-2-header,
    #class-attendance-grid thead tr:nth-child(1) th[rowspan="2"],
    #theme-manager-flat-table thead tr:nth-child(1) th[rowspan="2"],
    .table-wrap table thead tr:nth-child(1) th[rowspan="2"] {
      height: ${totalH}px !important;
      min-height: ${Number(cfg.regularHeaderMinHeight) || totalH}px !important;
      max-height: ${totalH}px !important;
      line-height: ${totalH}px !important;
      font-size: ${cfg.regularHeaderFontSize || 12}px !important;
      font-weight: ${cfg.regularHeaderFontWeight || 800} !important;
    }

    .datagrid-table tbody tr,
    .data-table tbody tr,
    .matrix-table tbody tr {
      height: ${maxRH}px !important;
      min-height: ${minRH}px !important;
      max-height: ${maxRH}px !important;
    }
    .datagrid-table tbody td,
    .data-table tbody td,
    .matrix-table tbody td {
      height: ${maxRH}px !important;
      min-height: ${minRH}px !important;
      max-height: ${maxRH}px !important;
      line-height: ${maxRH}px !important;
      font-size: ${cfg.bodyFontSize || 12}px !important;
      font-weight: ${cfg.bodyFontWeight || 600} !important;
      padding-left: ${pX}px !important;
      padding-right: ${pX}px !important;
    }

    .datagrid-table tfoot tr,
    .data-table tfoot tr,
    .matrix-table tfoot tr,
    .datagrid-tfoot tr {
      height: ${fH}px !important;
      min-height: ${Number(cfg.footerMinHeight) || fH}px !important;
      max-height: ${fH}px !important;
      line-height: ${fH}px !important;
      background: ${cfg.footerBg || 'rgba(15,23,42,0.95)'} !important;
    }
    .datagrid-table tfoot td,
    .data-table tfoot td,
    .matrix-table tfoot td,
    .datagrid-tfoot td {
      height: ${fH}px !important;
      min-height: ${Number(cfg.footerMinHeight) || fH}px !important;
      max-height: ${fH}px !important;
      line-height: ${fH}px !important;
      font-size: ${cfg.footerFontSize || 12}px !important;
      font-weight: ${cfg.footerFontWeight || 800} !important;
      padding-left: ${pX}px !important;
      padding-right: ${pX}px !important;
    }
  `;
}

export function resetGlobalTableDimensions() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
  const styleEl = document.getElementById('topscore-table-dimensions-style');
  if (styleEl) styleEl.remove();

  const previewStyleEl = document.getElementById('table-builder-live-style');
  if (previewStyleEl) previewStyleEl.remove();

  document.documentElement.style.removeProperty('--table-super-header-height');
  document.documentElement.style.removeProperty('--table-sub-header-height');
  document.documentElement.style.removeProperty('--table-total-header-height');
  document.documentElement.style.removeProperty('--table-row-min-height');
  document.documentElement.style.removeProperty('--table-row-max-height');
  document.documentElement.style.removeProperty('--table-row-height');
  document.documentElement.style.removeProperty('--table-footer-height');
  document.documentElement.style.removeProperty('--table-cell-padding-x');
}

export function initGlobalTableDimensions() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const cfg = JSON.parse(saved);
      applyGlobalTableDimensions(cfg);
    } catch (e) {
      console.error(e);
    }
  }
}

if (typeof window !== 'undefined') {
  initGlobalTableDimensions();
}

/**
 * Main Studio Renderer: Side-by-Side Visual Table Designer
 */
export async function renderTableDesigns(area) {
  if (!area) return;

  let cfg = getSavedTableSettings();

  /**
   * Applies live preview styles directly to DOM and scoped stylesheet
   * Uses !important and high specificity to ensure immediate real-time rendering
   */
  const updateLivePreviewStyle = () => {
    const sH = Number(cfg.superHeaderMaxHeight) || Number(cfg.superHeaderHeight) || 30;
    const sHMin = Number(cfg.superHeaderMinHeight) || sH;
    const subH = Number(cfg.subHeaderMaxHeight) || Number(cfg.subHeaderHeight) || 30;
    const subHMin = Number(cfg.subHeaderMinHeight) || subH;
    const totalH = Number(cfg.regularHeaderMaxHeight) || (sH + subH);
    const totalHMin = Number(cfg.regularHeaderMinHeight) || (sHMin + subHMin);
    const rH = Number(cfg.bodyRowMaxHeight) || Number(cfg.bodyRowHeight) || 32;
    const minRH = Number(cfg.bodyRowMinHeight) || 24;
    const fH = Number(cfg.footerMaxHeight) || Number(cfg.footerHeight) || 32;
    const fHMin = Number(cfg.footerMinHeight) || fH;
    const pX = Number(cfg.cellPaddingX) || 8;

    const isExcel = cfg.gridMode === 'excel';
    const borderAlpha = isExcel ? '0.45' : '0.08';
    const borderColor = isExcel ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.08)';

    let previewStyle = document.getElementById('table-builder-live-style');
    if (!previewStyle) {
      previewStyle = document.createElement('style');
      previewStyle.id = 'table-builder-live-style';
      document.head.appendChild(previewStyle);
    }

    previewStyle.textContent = `
      #admin-console #mockup-table-canvas-wrap table,
      #mockup-table-canvas-wrap table {
        border-collapse: collapse !important;
        width: 100% !important;
        table-layout: fixed !important;
        border: ${isExcel ? '1px solid rgba(255, 255, 255, 0.45)' : 'none'} !important;
      }
      #admin-console #mockup-table-canvas-wrap th,
      #admin-console #mockup-table-canvas-wrap td,
      #mockup-table-canvas-wrap th,
      #mockup-table-canvas-wrap td {
        border-right: 1px solid ${borderColor} !important;
        border-bottom: 1px solid ${borderColor} !important;
        box-sizing: border-box !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* Regular Header (Rowspan 2, 3 Columns) */
      #admin-console #mockup-table-canvas-wrap th.tb-th-regular,
      #mockup-table-canvas-wrap th.tb-th-regular {
        height: ${totalH}px !important;
        min-height: ${totalHMin}px !important;
        max-height: ${totalH}px !important;
        line-height: ${totalH}px !important;
        font-size: ${cfg.regularHeaderFontSize}px !important;
        font-weight: ${cfg.regularHeaderFontWeight} !important;
        background: ${cfg.regularHeaderBg} !important;
        color: ${cfg.regularHeaderColor} !important;
        top: 0px !important;
        z-index: 20 !important;
        padding: 0 ${pX}px !important;
      }

      /* Super Header (Tier 1, 3 Columns) */
      #admin-console #mockup-table-canvas-wrap thead tr:first-child,
      #mockup-table-canvas-wrap thead tr:first-child {
        height: ${sH}px !important;
      }
      #admin-console #mockup-table-canvas-wrap th.tb-th-super,
      #mockup-table-canvas-wrap th.tb-th-super {
        height: ${sH}px !important;
        min-height: ${sHMin}px !important;
        max-height: ${sH}px !important;
        line-height: ${sH}px !important;
        font-size: ${cfg.superHeaderFontSize}px !important;
        font-weight: ${cfg.superHeaderFontWeight} !important;
        background: ${cfg.superHeaderBg} !important;
        color: ${cfg.superHeaderColor} !important;
        top: 0px !important;
        z-index: 20 !important;
        padding: 0 ${pX}px !important;
        text-align: center !important;
      }

      /* Sub Header (Tier 2, 3 Columns) */
      #admin-console #mockup-table-canvas-wrap thead tr:nth-child(2),
      #mockup-table-canvas-wrap thead tr:nth-child(2) {
        height: ${subH}px !important;
      }
      #admin-console #mockup-table-canvas-wrap th.tb-th-sub,
      #mockup-table-canvas-wrap th.tb-th-sub {
        height: ${subH}px !important;
        min-height: ${subHMin}px !important;
        max-height: ${subH}px !important;
        line-height: ${subH}px !important;
        top: ${sH}px !important;
        z-index: 19 !important;
        font-size: ${cfg.subHeaderFontSize}px !important;
        font-weight: ${cfg.subHeaderFontWeight} !important;
        background: ${cfg.subHeaderBg} !important;
        color: ${cfg.subHeaderColor} !important;
        padding: 0 ${pX}px !important;
        text-align: center !important;
      }

      /* Body Rows & Cells (10 Rows, 6 Columns) */
      #admin-console #mockup-table-canvas-wrap tbody tr,
      #mockup-table-canvas-wrap tbody tr {
        height: ${rH}px !important;
        min-height: ${minRH}px !important;
        max-height: ${rH}px !important;
      }
      #admin-console #mockup-table-canvas-wrap tbody tr:nth-child(even),
      #mockup-table-canvas-wrap tbody tr:nth-child(even) {
        background: ${cfg.bodyBg} !important;
      }
      #admin-console #mockup-table-canvas-wrap tbody tr:nth-child(odd),
      #mockup-table-canvas-wrap tbody tr:nth-child(odd) {
        background: transparent !important;
      }
      #admin-console #mockup-table-canvas-wrap tbody td,
      #mockup-table-canvas-wrap tbody td {
        height: ${rH}px !important;
        min-height: ${minRH}px !important;
        max-height: ${rH}px !important;
        line-height: ${rH}px !important;
        font-size: ${cfg.bodyFontSize}px !important;
        font-weight: ${cfg.bodyFontWeight} !important;
        color: ${cfg.bodyColor} !important;
        padding: 0 ${pX}px !important;
      }

      /* Sticky Footer (6 Columns) */
      #admin-console #mockup-table-canvas-wrap tfoot tr,
      #mockup-table-canvas-wrap tfoot tr {
        height: ${fH}px !important;
        min-height: ${fHMin}px !important;
        max-height: ${fH}px !important;
        position: sticky !important;
        bottom: 0px !important;
        z-index: 15 !important;
        background: ${cfg.footerBg} !important;
        backdrop-filter: blur(8px) !important;
        border-top: 2px solid ${cfg.footerBorderTop} !important;
      }
      #admin-console #mockup-table-canvas-wrap tfoot td,
      #mockup-table-canvas-wrap tfoot td {
        height: ${fH}px !important;
        min-height: ${fHMin}px !important;
        max-height: ${fH}px !important;
        line-height: ${fH}px !important;
        font-size: ${cfg.footerFontSize}px !important;
        font-weight: ${cfg.footerFontWeight} !important;
        color: ${cfg.footerColor} !important;
        padding: 0 ${pX}px !important;
      }
    `;

    // Direct DOM inline style injection for maximum rendering resilience
    const canvasWrap = area.querySelector('#mockup-table-canvas-wrap');
    if (canvasWrap) {
      canvasWrap.querySelectorAll('.tb-th-regular').forEach(el => {
        el.style.setProperty('height', `${totalH}px`, 'important');
        el.style.setProperty('line-height', `${totalH}px`, 'important');
        el.style.setProperty('font-size', `${cfg.regularHeaderFontSize}px`, 'important');
        el.style.setProperty('font-weight', `${cfg.regularHeaderFontWeight}`, 'important');
        el.style.setProperty('background', `${cfg.regularHeaderBg}`, 'important');
      });
      canvasWrap.querySelectorAll('.tb-th-super').forEach(el => {
        el.style.setProperty('height', `${sH}px`, 'important');
        el.style.setProperty('line-height', `${sH}px`, 'important');
        el.style.setProperty('font-size', `${cfg.superHeaderFontSize}px`, 'important');
        el.style.setProperty('font-weight', `${cfg.superHeaderFontWeight}`, 'important');
        el.style.setProperty('background', `${cfg.superHeaderBg}`, 'important');
      });
      canvasWrap.querySelectorAll('.tb-th-sub').forEach(el => {
        el.style.setProperty('height', `${subH}px`, 'important');
        el.style.setProperty('line-height', `${subH}px`, 'important');
        el.style.setProperty('top', `${sH}px`, 'important');
        el.style.setProperty('font-size', `${cfg.subHeaderFontSize}px`, 'important');
        el.style.setProperty('font-weight', `${cfg.subHeaderFontWeight}`, 'important');
        el.style.setProperty('background', `${cfg.subHeaderBg}`, 'important');
      });
      canvasWrap.querySelectorAll('tbody tr').forEach(el => {
        el.style.setProperty('height', `${rH}px`, 'important');
      });
      canvasWrap.querySelectorAll('tbody td').forEach(el => {
        el.style.setProperty('height', `${rH}px`, 'important');
        el.style.setProperty('line-height', `${rH}px`, 'important');
        el.style.setProperty('font-size', `${cfg.bodyFontSize}px`, 'important');
        el.style.setProperty('font-weight', `${cfg.bodyFontWeight}`, 'important');
      });
      canvasWrap.querySelectorAll('tfoot tr').forEach(el => {
        el.style.setProperty('height', `${fH}px`, 'important');
        el.style.setProperty('background', `${cfg.footerBg}`, 'important');
      });
      canvasWrap.querySelectorAll('tfoot td').forEach(el => {
        el.style.setProperty('height', `${fH}px`, 'important');
        el.style.setProperty('line-height', `${fH}px`, 'important');
        el.style.setProperty('font-size', `${cfg.footerFontSize}px`, 'important');
        el.style.setProperty('font-weight', `${cfg.footerFontWeight}`, 'important');
      });
    }
  };

  const persistSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGlobal = () => {
    persistSettings();
    applyGlobalTableDimensions(cfg);
    showToast('✓ Table dimensions saved and applied globally to all TopsCore tables!', 'success');
    updateSubPanel();
  };

  const handleResetDefault = () => {
    cfg = { ...SSOT_DEFAULTS };
    resetGlobalTableDimensions();
    persistSettings();
    showToast('✓ Reset to standard SSOT table dimensions.', 'info');
    renderAll();
  };

  const updateSubPanel = () => {
    if (typeof window.setBottomInfobar !== 'function') return;
    const totalH = (Number(cfg.superHeaderMaxHeight) || 30) + (Number(cfg.subHeaderMaxHeight) || 30);
    const leftHtml = `
      <div style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:600; color:#cbd5e1; white-space:nowrap;">
        <span>Table Architecture SSOT</span>
        <span style="color:#475569;">·</span>
        <span style="font-size:12px; color:#94a3b8;">
          Regular Header: <strong style="color:#f8fafc;" id="info-reg-h">${totalH}px</strong> ·
          Super: <strong style="color:#f8fafc;" id="info-super-h">${cfg.superHeaderMaxHeight || 30}px</strong> ·
          Sub: <strong style="color:#f8fafc;" id="info-sub-h">${cfg.subHeaderMaxHeight || 30}px</strong> ·
          Body: <strong style="color:#f8fafc;" id="info-body-h">${cfg.bodyRowMinHeight || 24}–${cfg.bodyRowMaxHeight || 32}px</strong> ·
          Footer: <strong style="color:#f8fafc;" id="info-footer-h">${cfg.footerMaxHeight || 32}px</strong> ·
          Grid: <strong style="color:#f8fafc;" id="info-grid-mode">${cfg.gridMode === 'excel' ? 'Excel White (0.45)' : 'Normal (0.08)'}</strong>
        </span>
        <span style="font-size:11px; font-weight:700; color:#95ff00; background:rgba(149,255,0,0.1); border:1px solid rgba(149,255,0,0.25); border-radius:3px; padding:2px 6px;">⚡ Auto-Applied</span>
      </div>
    `;
    const rightHtml = `
      <div style="display:flex; align-items:center; gap:8px;">
        <button id="btn-reset-dimensions-infobar" class="btn btn-secondary" style="height:30px !important; line-height:28px !important; font-size:12px; font-weight:600; padding:0 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; border-radius:4px; cursor:pointer;">
          Reset SSOT
        </button>
        <button id="btn-save-dimensions-infobar" class="btn btn-primary" style="height:30px !important; line-height:28px !important; font-size:12px; font-weight:700; padding:0 14px; background:var(--quad-c, #95ff00); color:#090d16; border:none; border-radius:4px; cursor:pointer;">
          Apply Globally
        </button>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);

    document.getElementById('btn-save-dimensions-infobar')?.addEventListener('click', handleSaveGlobal);
    document.getElementById('btn-reset-dimensions-infobar')?.addEventListener('click', handleResetDefault);
  };

  /**
   * Generates Clean Abstract Specimen Mockup Table HTML
   * EXACTLY 6 COLUMNS (3 Regular Headers + 1 Super Header spanning 3 Sub-Headers):
   * - 3 Regular Headers (Rowspan 2): HEADER 1, HEADER 2, HEADER 3
   * - 1 Super Header (3 Cols, Colspan 3): SUPER HEADER (3 COLUMNS)
   * - 3 Sub-Headers underneath: SUB 1, SUB 2, SUB 3
   * - 10 Body Rows: Data 1-1 .. Data 10-6
   * - Sticky Footer: FOOTER 1 .. FOOTER 6
   * - Strictly zero capsules, zero pills, zero badges (Rule 2.31)
   */
  const getMockupTableHtml = () => {
    let rowsHtml = '';
    for (let r = 1; r <= 10; r++) {
      rowsHtml += `
        <tr>
          <td style="padding:0 8px; text-align:left;">Data ${r}-1</td>
          <td style="padding:0 8px; text-align:center;">Data ${r}-2</td>
          <td style="padding:0 8px; text-align:left;">Data ${r}-3</td>
          <td style="padding:0 8px; text-align:center;">Data ${r}-4</td>
          <td style="padding:0 8px; text-align:center;">Data ${r}-5</td>
          <td style="padding:0 8px; text-align:center;">Data ${r}-6</td>
        </tr>
      `;
    }

    return `
      <table class="datagrid-table ${cfg.gridMode === 'excel' ? 'global-edit-mode-on' : ''}">
        <thead>
          <!-- TIER 1 -->
          <tr>
            <th rowspan="2" class="tb-th-regular" style="width:140px; text-align:left;">
              HEADER 1
            </th>
            <th rowspan="2" class="tb-th-regular" style="width:90px; text-align:center;">
              HEADER 2
            </th>
            <th rowspan="2" class="tb-th-regular" style="width:130px; text-align:left;">
              HEADER 3
            </th>
            <th colspan="3" class="tb-th-super" style="text-align:center;">
              SUPER HEADER (3 COLUMNS)
            </th>
          </tr>

          <!-- TIER 2 -->
          <tr>
            <th class="tb-th-sub" style="width:90px; text-align:center;">SUB 1</th>
            <th class="tb-th-sub" style="width:90px; text-align:center;">SUB 2</th>
            <th class="tb-th-sub" style="width:90px; text-align:center;">SUB 3</th>
          </tr>
        </thead>

        <!-- 10 ABSTRACT SPECIMEN ROWS (6 COLUMNS) -->
        <tbody>
          ${rowsHtml}
        </tbody>

        <!-- STICKY FOOTER (6 ABSTRACT COLUMNS) -->
        <tfoot>
          <tr>
            <td style="padding:0 8px; text-align:left;">FOOTER 1</td>
            <td style="padding:0 8px; text-align:center;">FOOTER 2</td>
            <td style="padding:0 8px; text-align:left;">FOOTER 3</td>
            <td style="padding:0 8px; text-align:center;">FOOTER 4</td>
            <td style="padding:0 8px; text-align:center;">FOOTER 5</td>
            <td style="padding:0 8px; text-align:center;">FOOTER 6</td>
          </tr>
        </tfoot>
      </table>
    `;
  };

  const renderAll = () => {
    const sH = Number(cfg.superHeaderMaxHeight) || 30;
    const subH = Number(cfg.subHeaderMaxHeight) || 30;
    const totalH = Number(cfg.regularHeaderMaxHeight) || (sH + subH);

    area.innerHTML = `
      <div style="display:flex; width:100%; height:100%; min-height:0; gap:10px; padding:0; margin:0; box-sizing:border-box; overflow:hidden;">

        <!-- ========================================================
             LEFT COLUMN: 2 CARDS STACKED VERTICALLY WITH 10PX GAP
             - Card 1 (Top Left): Table Dimensions & Styling Editor
             - Card 2 (Bottom Left): Live Interactive Table Specimen (Gambar 3)
             ======================================================== -->
        <div style="flex:1.15; min-width:0; height:100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; overflow:hidden;">

          <!-- CARD 1 (TOP LEFT): TABLE DIMENSIONS & STYLING EDITOR -->
          <div class="card" style="flex:0 0 auto; display:flex; flex-direction:column; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:6px; box-sizing:border-box; overflow:hidden; padding:0 !important;">

            <!-- CARD HEADER -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0f172a; border-bottom:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
              <div style="font-size:11px; font-weight:700; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#95ff00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>
                <span>TABLE DIMENSIONS &amp; STYLING EDITOR</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:11px; font-weight:700; color:#95ff00; background:rgba(149,255,0,0.12); border:1px solid rgba(149,255,0,0.25); border-radius:3px; padding:2px 6px;">
                  ⚡ Auto-Applied Globally
                </span>
              </div>
            </div>

            <!-- CARD BODY: TWO-TIER EDITOR TABLE -->
            <div style="padding:0; box-sizing:border-box; overflow-x:auto;">
              <table style="width:100%; border-collapse:collapse; font-family:'Inter', sans-serif; font-size:12px; text-align:left;">
                <thead>
                  <!-- TIER 1 SUPER-HEADERS -->
                  <tr style="height:28px; background:#0b1120; border-bottom:1px solid rgba(255,255,255,0.08);">
                    <th rowspan="2" style="padding:0 8px; font-size:11px; font-weight:700; color:#cbd5e1; text-transform:uppercase; border-right:1px solid rgba(255,255,255,0.08); width:130px;">
                      SECTION NAME
                    </th>
                    <th colspan="2" style="padding:0 4px; font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; border-right:1px solid rgba(255,255,255,0.08); text-align:center;">
                      HEIGHT
                    </th>
                    <th colspan="2" style="padding:0 4px; font-size:11px; font-weight:700; color:#95ff00; text-transform:uppercase; border-right:1px solid rgba(255,255,255,0.08); text-align:center;">
                      WIDTH
                    </th>
                    <th colspan="2" style="padding:0 4px; font-size:11px; font-weight:700; color:var(--grade-star, #a855f7); text-transform:uppercase; border-right:1px solid rgba(255,255,255,0.08); text-align:center;">
                      TYPOGRAPHY
                    </th>
                    <th rowspan="2" style="padding:0 4px; font-size:11px; font-weight:700; color:#cbd5e1; text-transform:uppercase; text-align:center; width:45px;">
                      COLOUR
                    </th>
                  </tr>

                  <!-- TIER 2 SUB-HEADERS (MIN & MAX) -->
                  <tr style="height:24px; background:#0f172a; border-bottom:1px solid rgba(255,255,255,0.12);">
                    <th style="padding:0 2px; font-size:11px; font-weight:600; color:#94a3b8; border-right:1px solid rgba(255,255,255,0.06); text-align:center; width:48px;">MIN</th>
                    <th style="padding:0 2px; font-size:11px; font-weight:600; color:#94a3b8; border-right:1px solid rgba(255,255,255,0.08); text-align:center; width:48px;">MAX</th>
                    <th style="padding:0 2px; font-size:11px; font-weight:600; color:#94a3b8; border-right:1px solid rgba(255,255,255,0.06); text-align:center; width:48px;">MIN</th>
                    <th style="padding:0 2px; font-size:11px; font-weight:600; color:#94a3b8; border-right:1px solid rgba(255,255,255,0.08); text-align:center; width:48px;">MAX</th>
                    <th style="padding:0 2px; font-size:11px; font-weight:600; color:#94a3b8; border-right:1px solid rgba(255,255,255,0.06); text-align:center; width:44px;">SIZE</th>
                    <th style="padding:0 2px; font-size:11px; font-weight:600; color:#94a3b8; border-right:1px solid rgba(255,255,255,0.08); text-align:center; width:75px;">WEIGHT</th>
                  </tr>
                </thead>
                <tbody>

                  <!-- 1. REGULAR HEADER (3 COLS, ROWSPAN 2) -->
                  <tr style="height:26px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:2px 8px; border-right:1px solid rgba(255,255,255,0.08);">
                      <div style="font-weight:700; color:#f8fafc; font-size:11px; white-space:nowrap;">Regular Header <span style="font-weight:400; color:#94a3b8; font-size:10px;">(Rowspan 2)</span></div>
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="regularHeaderMinHeight" min="15" max="140" value="${cfg.regularHeaderMinHeight}" title="Min Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="regularHeaderMaxHeight" min="15" max="140" value="${cfg.regularHeaderMaxHeight}" title="Max Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="regularHeaderMinWidth" min="30" max="300" value="${cfg.regularHeaderMinWidth}" title="Min Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="regularHeaderMaxWidth" min="30" max="300" value="${cfg.regularHeaderMaxWidth}" title="Max Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="regularHeaderFontSize" min="10" max="18" value="${cfg.regularHeaderFontSize}" title="Font Size" style="width:32px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <select class="bm-select" data-key="regularHeaderFontWeight" style="height:20px; font-size:11px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; border-radius:3px; padding:0 1px;">
                        <option value="600" ${cfg.regularHeaderFontWeight === '600' ? 'selected' : ''}>600 Semi</option>
                        <option value="700" ${cfg.regularHeaderFontWeight === '700' ? 'selected' : ''}>700 Bold</option>
                        <option value="800" ${cfg.regularHeaderFontWeight === '800' ? 'selected' : ''}>800 Extra</option>
                      </select>
                    </td>
                    <td style="padding:1px 2px; text-align:center;">
                      <input type="color" class="bm-color" data-key="regularHeaderBg" value="${cfg.regularHeaderBg.startsWith('#') ? cfg.regularHeaderBg : '#0f172a'}" title="Background Color" style="width:22px; height:18px; border:none; border-radius:3px; background:transparent; cursor:pointer;">
                    </td>
                  </tr>

                  <!-- 2. SUPER-HEADER (3 COLS, TIER 1) -->
                  <tr style="height:26px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:2px 8px; border-right:1px solid rgba(255,255,255,0.08);">
                      <div style="font-weight:700; color:#f8fafc; font-size:11px; white-space:nowrap;">Super Header <span style="font-weight:400; color:#94a3b8; font-size:10px;">(Tier 1)</span></div>
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="superHeaderMinHeight" min="15" max="80" value="${cfg.superHeaderMinHeight}" title="Min Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="superHeaderMaxHeight" min="15" max="80" value="${cfg.superHeaderMaxHeight}" title="Max Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="superHeaderMinWidth" min="60" max="600" value="${cfg.superHeaderMinWidth}" title="Min Span Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="superHeaderMaxWidth" min="60" max="600" value="${cfg.superHeaderMaxWidth}" title="Max Span Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="superHeaderFontSize" min="10" max="18" value="${cfg.superHeaderFontSize}" title="Font Size" style="width:32px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <select class="bm-select" data-key="superHeaderFontWeight" style="height:20px; font-size:11px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; border-radius:3px; padding:0 1px;">
                        <option value="600" ${cfg.superHeaderFontWeight === '600' ? 'selected' : ''}>600 Semi</option>
                        <option value="700" ${cfg.superHeaderFontWeight === '700' ? 'selected' : ''}>700 Bold</option>
                        <option value="800" ${cfg.superHeaderFontWeight === '800' ? 'selected' : ''}>800 Extra</option>
                      </select>
                    </td>
                    <td style="padding:1px 2px; text-align:center;">
                      <input type="color" class="bm-color" data-key="superHeaderBg" value="${cfg.superHeaderBg.startsWith('#') ? cfg.superHeaderBg : '#0f172a'}" title="Background Color" style="width:22px; height:18px; border:none; border-radius:3px; background:transparent; cursor:pointer;">
                    </td>
                  </tr>

                  <!-- 3. SUB-HEADER (3 COLS, TIER 2) -->
                  <tr style="height:26px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:2px 8px; border-right:1px solid rgba(255,255,255,0.08);">
                      <div style="font-weight:700; color:#f8fafc; font-size:11px; white-space:nowrap;">Sub-Header <span style="font-weight:400; color:#94a3b8; font-size:10px;">(Tier 2)</span></div>
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="subHeaderMinHeight" min="15" max="80" value="${cfg.subHeaderMinHeight}" title="Min Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="subHeaderMaxHeight" min="15" max="80" value="${cfg.subHeaderMaxHeight}" title="Max Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="subHeaderMinWidth" min="30" max="250" value="${cfg.subHeaderMinWidth}" title="Min Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="subHeaderMaxWidth" min="30" max="250" value="${cfg.subHeaderMaxWidth}" title="Max Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="subHeaderFontSize" min="10" max="18" value="${cfg.subHeaderFontSize}" title="Font Size" style="width:32px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <select class="bm-select" data-key="subHeaderFontWeight" style="height:20px; font-size:11px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; border-radius:3px; padding:0 1px;">
                        <option value="400" ${cfg.subHeaderFontWeight === '400' ? 'selected' : ''}>400 Regular</option>
                        <option value="600" ${cfg.subHeaderFontWeight === '600' ? 'selected' : ''}>600 Semi</option>
                        <option value="700" ${cfg.subHeaderFontWeight === '700' ? 'selected' : ''}>700 Bold</option>
                      </select>
                    </td>
                    <td style="padding:1px 2px; text-align:center;">
                      <input type="color" class="bm-color" data-key="subHeaderBg" value="${cfg.subHeaderBg.startsWith('#') ? cfg.subHeaderBg : '#0f172a'}" title="Background Color" style="width:22px; height:18px; border:none; border-radius:3px; background:transparent; cursor:pointer;">
                    </td>
                  </tr>

                  <!-- 4. TABLE BODY (10 ROWS, 6 COLS) -->
                  <tr style="height:26px; border-bottom:1px solid rgba(255,255,255,0.06);">
                    <td style="padding:2px 8px; border-right:1px solid rgba(255,255,255,0.08);">
                      <div style="font-weight:700; color:#f8fafc; font-size:11px; white-space:nowrap;">Table Body <span style="font-weight:400; color:#94a3b8; font-size:10px;">(10 Rows)</span></div>
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="bodyRowMinHeight" min="18" max="80" value="${cfg.bodyRowMinHeight}" title="Min Row Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="bodyRowMaxHeight" min="18" max="80" value="${cfg.bodyRowMaxHeight}" title="Max Row Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="bodyColMinWidth" min="30" max="300" value="${cfg.bodyColMinWidth}" title="Min Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="bodyColMaxWidth" min="30" max="300" value="${cfg.bodyColMaxWidth}" title="Max Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="bodyFontSize" min="10" max="18" value="${cfg.bodyFontSize}" title="Font Size" style="width:32px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <select class="bm-select" data-key="bodyFontWeight" style="height:20px; font-size:11px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; border-radius:3px; padding:0 1px;">
                        <option value="400" ${cfg.bodyFontWeight === '400' ? 'selected' : ''}>400 Regular</option>
                        <option value="500" ${cfg.bodyFontWeight === '500' ? 'selected' : ''}>500 Medium</option>
                        <option value="600" ${cfg.bodyFontWeight === '600' ? 'selected' : ''}>600 Semi</option>
                      </select>
                    </td>
                    <td style="padding:1px 2px; text-align:center;">
                      <input type="color" class="bm-color" data-key="bodyBg" value="${cfg.bodyBg.startsWith('#') ? cfg.bodyBg : '#0f172a'}" title="Zebra Row Color" style="width:22px; height:18px; border:none; border-radius:3px; background:transparent; cursor:pointer;">
                    </td>
                  </tr>

                  <!-- 5. STICKY FOOTER (6 COLS) -->
                  <tr style="height:26px;">
                    <td style="padding:2px 8px; border-right:1px solid rgba(255,255,255,0.08);">
                      <div style="font-weight:700; color:#f8fafc; font-size:11px; white-space:nowrap;">Sticky Footer <span style="font-weight:400; color:#94a3b8; font-size:10px;">(Summary Row)</span></div>
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="footerMinHeight" min="15" max="80" value="${cfg.footerMinHeight}" title="Min Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="footerMaxHeight" min="15" max="80" value="${cfg.footerMaxHeight}" title="Max Height" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="footerMinWidth" min="30" max="300" value="${cfg.footerMinWidth}" title="Min Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <input type="number" class="bm-input" data-key="footerMaxWidth" min="30" max="300" value="${cfg.footerMaxWidth}" title="Max Col Width" style="width:36px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.06);">
                      <input type="number" class="bm-input" data-key="footerFontSize" min="10" max="18" value="${cfg.footerFontSize}" title="Font Size" style="width:32px; height:20px; font-size:11px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px;">
                    </td>
                    <td style="padding:1px 2px; text-align:center; border-right:1px solid rgba(255,255,255,0.08);">
                      <select class="bm-select" data-key="footerFontWeight" style="height:20px; font-size:11px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#cbd5e1; border-radius:3px; padding:0 1px;">
                        <option value="600" ${cfg.footerFontWeight === '600' ? 'selected' : ''}>600 Semi</option>
                        <option value="700" ${cfg.footerFontWeight === '700' ? 'selected' : ''}>700 Bold</option>
                        <option value="800" ${cfg.footerFontWeight === '800' ? 'selected' : ''}>800 Extra</option>
                      </select>
                    </td>
                    <td style="padding:1px 2px; text-align:center;">
                      <input type="color" class="bm-color" data-key="footerBg" value="${cfg.footerBg.startsWith('#') ? cfg.footerBg : '#0f172a'}" title="Background Color" style="width:22px; height:18px; border:none; border-radius:3px; background:transparent; cursor:pointer;">
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>

            <!-- CARD FOOTER / CTA ACTIONS -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0f172a; border-top:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
              <div style="font-size:11px; color:#94a3b8;">
                *Equal Min &amp; Max = <strong style="color:#38bdf8;">Fixed Amount</strong>; Differing = <strong style="color:#95ff00;">Dynamic Range</strong>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button id="btn-editor-reset" class="btn btn-secondary" style="height:30px !important; line-height:28px !important; font-size:12px; font-weight:600; padding:0 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; border-radius:4px; cursor:pointer;">
                  Reset Defaults
                </button>
                <button id="btn-editor-apply" class="btn btn-primary" style="height:30px !important; line-height:28px !important; font-size:12px; font-weight:700; padding:0 14px; background:var(--quad-c, #95ff00); color:#090d16; border:none; border-radius:4px; cursor:pointer;">
                  Apply Globally
                </button>
              </div>
            </div>

          </div>

          <!-- CARD 2 (BOTTOM LEFT): LIVE INTERACTIVE TABLE SPECIMEN (GAMBAR 3) -->
          <div class="card" style="flex:1; min-height:220px; display:flex; flex-direction:column; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:6px; box-sizing:border-box; overflow:hidden; padding:0 !important;">

            <!-- CARD HEADER -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0f172a; border-bottom:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
              <div style="font-size:11px; font-weight:700; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
                <span>LIVE INTERACTIVE TABLE SPECIMEN</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:11px; font-weight:700; color:#38bdf8; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.25); border-radius:3px; padding:2px 6px;">
                  6 Columns Specimen Object
                </span>
              </div>
            </div>

            <!-- CARD BODY: SPECIMEN TABLE CANVAS -->
            <div id="mockup-table-canvas-wrap" class="table-wrap" style="position:relative; width:100%; flex:1 1 0; min-height:160px; overflow-x:auto; overflow-y:auto; background:#090d16; box-sizing:border-box;">
              ${getMockupTableHtml()}
            </div>

            <!-- CARD FOOTER / CTA -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0f172a; border-top:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
              <div style="font-size:11px; color:#94a3b8;">
                Real-time Specimen Canvas · 100% Invariant Compliant
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button id="btn-specimen-grid-toggle" class="btn btn-secondary" style="height:30px !important; line-height:28px !important; font-size:12px; font-weight:600; padding:0 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; border-radius:4px; cursor:pointer;">
                  Toggle Gridlines
                </button>
              </div>
            </div>

          </div>

        </div>

        <!-- ========================================================
             RIGHT COLUMN: CARD 3 (FULL HEIGHT WORKSPACE)
             - TopsCore Table Architecture & Governance (SSOT)
             - Sets full height from top to bottom
             ======================================================== -->
        <div style="flex:0.85; min-width:440px; height:100%; display:flex; flex-direction:column; box-sizing:border-box; overflow:hidden;">

          <!-- CARD 3 (RIGHT): RULES & GOVERNANCE CARD -->
          <div class="card" style="height:100%; display:flex; flex-direction:column; background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:6px; box-sizing:border-box; overflow:hidden;">

            <!-- CARD HEADER & GRID SELECTOR -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0f172a; border-bottom:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
              <div style="font-size:11px; font-weight:700; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff2d87" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span>TABLE ARCHITECTURE &amp; GOVERNANCE (SSOT)</span>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:11px; color:#94a3b8;">Grid:</span>
                <select id="sel-grid-mode" style="height:22px; font-size:11px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.2); color:#f8fafc; border-radius:3px; padding:0 4px; cursor:pointer;">
                  <option value="normal" ${cfg.gridMode === 'normal' ? 'selected' : ''}>Normal Grid (0.08)</option>
                  <option value="excel" ${cfg.gridMode === 'excel' ? 'selected' : ''}>Excel White (0.45)</option>
                </select>
              </div>
            </div>

            <!-- CARD BODY: SCROLLABLE EXHAUSTIVE RULES (6 SECTIONS) -->
            <div style="flex:1; min-height:0; overflow-y:auto; padding:10px; display:flex; flex-direction:column; gap:8px; font-size:11px; color:#cbd5e1; box-sizing:border-box;">

              <!-- SECTION 1: TWO-TIER STICKY HEADER ARCHITECTURE -->
              <div>
                <div style="font-weight:700; color:#38bdf8; margin-bottom:2px;">1. TWO-TIER STICKY HEADER ARCHITECTURE (PILLARS 4 &amp; 8)</div>
                <div style="color:#94a3b8; line-height:1.45;">
                  • <strong>Regular Header (Rowspan 2)</strong>: Standalone columns enforce <code>rowspan="2"</code> set to <span id="rule-disp-total-h">${totalH}px</span> (${sH} + ${subH}px), locked at <code>position: sticky; top: 0; z-index: 20;</code>.<br>
                  • <strong>Super Header (Tier 1)</strong>: Multi-column category group header set to <span id="rule-disp-super-h">${sH}px</span>, locked at <code>position: sticky; top: 0; z-index: 20;</code>.<br>
                  • <strong>Sub-Header (Tier 2)</strong>: Metric column headers set to <span id="rule-disp-sub-h">${subH}px</span>, locked directly beneath super-header at <code>top: ${sH}px; z-index: 19;</code>.<br>
                  • <strong>Single-Line No-Wrap Invariant</strong>: All headers and cells strictly enforce <code>white-space: nowrap !important; text-overflow: ellipsis;</code> to eliminate text wrapping.
                </div>
              </div>

              <!-- SECTION 2: GRIDLINES & MASTER EDIT SPECIFICATIONS -->
              <div>
                <div style="font-weight:700; color:#95ff00; margin-bottom:2px;">2. GRIDLINES &amp; MASTER EDIT SPECIFICATIONS (PILLARS 9 &amp; 10)</div>
                <div style="color:#94a3b8; line-height:1.45;">
                  • <strong>Normal Grid Mode</strong>: Clean subtle hairline gridlines <code>1px solid rgba(255, 255, 255, 0.08)</code>.<br>
                  • <strong>Master Excel Grid Mode (Rule 2.22)</strong>: Crisp white Excel gridlines <code>1px solid rgba(255, 255, 255, 0.45) !important;</code> with white perimeter borders.<br>
                  • <strong>Master Edit Inputs</strong>: Inputs inside editable cells must be centered <code>24px height</code> with <code>border: none !important; background: transparent !important; color: #f8fafc; font-family: inherit; font-size: 12px;</code>.
                </div>
              </div>

              <!-- SECTION 3: ROW BOUNDS, NUMERIC METRICS & TYPOGRAPHY SSOT -->
              <div>
                <div style="font-weight:700; color:var(--grade-star, #a855f7); margin-bottom:2px;">3. ROW BOUNDS, NUMERIC METRICS &amp; TYPOGRAPHY SSOT (PILLARS 1, 2, 5 &amp; 10)</div>
                <div style="color:#94a3b8; line-height:1.45;">
                  • <strong>Uniform 12px Font Size (Pillar 1)</strong>: All table body cells and headers strictly enforce 12px font size.<br>
                  • <strong>Anti-Ballooning Bounded Height (Pillar 5)</strong>: Body row height bounded between ${cfg.bodyRowMinHeight}px and ${cfg.bodyRowMaxHeight}px (dynamic if min !== max, fixed if min === max). Vertical row stretching is strictly forbidden.<br>
                  • <strong>Small Table Zero-Scrollbar (Pillar 5)</strong>: Micro-tables with few rows enforce <code>height: auto !important;</code> without scrollbars.<br>
                  • <strong>Points Half-Up Whole Integer Invariant (Rule 2.9)</strong>: All points (PTS) must be whole integers via <code>Math.round()</code> (.5 rounds up, e.g. 274.5 → 275). Decimals are forbidden.<br>
                  • <strong>3-Letter Column Header Abbreviations (Rule 2.9)</strong>: Points header strictly abbreviated as <code>PTS</code>. Progress header strictly abbreviated as <code>DONE</code>.<br>
                  • <strong>Superscript Scale (Pillar 2)</strong>: Suffixes and tags enforce exact 1.0em scale (<code>font-size: 1.0em !important;</code>).<br>
                  • <strong>Zero-Truncation Minimum Widths (Pillar 10 / Rule 2.21)</strong>: Name columns minimum 200px, Province 160px, City 150px, Education 140px.
                </div>
              </div>

              <!-- SECTION 4: 10PX FULL-PERIMETER, STICKY FOOTER & VIEWPORT LOCK -->
              <div>
                <div style="font-weight:700; color:#ff8c00; margin-bottom:2px;">4. 10PX FULL-PERIMETER, STICKY FOOTER &amp; VIEWPORT LOCK (PILLARS 3 &amp; 7)</div>
                <div style="color:#94a3b8; line-height:1.45;">
                  • <strong>Universal 10px 4-Way Panel Perimeter</strong>: Strict 10px gap is enforced NOT ONLY between elements, but also as <u>perimeter clearance to all 4 surrounding panels</u>: Top Panel (header), Bottom Panel (Sub Panel 40px), and Side Panels (Sidebar &amp; right edge). Container enforces <code>padding: 10px !important; gap: 10px !important;</code>.<br>
                  • <strong>Sticky Footer Lock</strong>: Summary row locked at <code>position: sticky; bottom: 0; z-index: 15;</code> set to <span id="rule-disp-footer-h">${cfg.footerMaxHeight}px</span> with <code>border-top: 2px solid rgba(255,255,255,0.2)</code> and backdrop blur.<br>
                  • <strong>100vh Workstation Lock (Pillar 3)</strong>: Table container enforces strict zero outer page scroll (single-screen 100vh lock).<br>
                  • <strong>Modern Sort Indicators (Pillar 6)</strong>: Directional <code>▲</code> / <code>▼</code> for active sorted columns only; idle <code>⇅</code> clutter strictly purged.
                </div>
              </div>

              <!-- SECTION 5: SUPER-HEADER & SUB-HEADER EXACT GROUP COLOR MATCH -->
              <div>
                <div style="font-weight:700; color:var(--primary-tactical, #38bdf8); margin-bottom:2px;">5. SUPER-HEADER &amp; SUB-HEADER EXACT GROUP COLOR MATCH (PILLAR 12 &amp; §2.34)</div>
                <div style="color:#94a3b8; line-height:1.45;">
                  • <strong>4 Quadrant Color Identity</strong>: A (<span style="color:#ff2d87;">Electric Pink #ff2d87</span>), B (<span style="color:#ff8c00;">Dark Orange #ff8c00</span>), C (<span style="color:#95ff00;">Electric Lime #95ff00</span>), D (<span style="color:#38bdf8;">Tactical Cyan #38bdf8</span>).<br>
                  • <strong>Exact Group Color Match Invariant</strong>: Sub-headers underneath a theme super-header strictly match their parent theme color, never mismatching or forced yellow!
                </div>
              </div>

              <!-- SECTION 6: STRICT SYSTEM PROHIBITIONS -->
              <div>
                <div style="font-weight:700; color:#ff2d87; margin-bottom:2px;">6. STRICT SYSTEM PROHIBITIONS (ZERO VIOLATIONS)</div>
                <div style="color:#94a3b8; line-height:1.45;">
                  • <strong>Rule 2.31 Zero Table Capsule</strong>: STRICTLY FORBIDDEN to use pills, badges, capsule borders, or background fills inside table cells! Statuses and grades must be <u>pure typographic font colors</u>.<br>
                  • <strong>Zero Glow / Shadow Invariant</strong>: Strict prohibition of <code>text-shadow</code>, <code>box-shadow</code>, or blur filters on table text.<br>
                  • <strong>Zero Truncation Invariant</strong>: No broken words, ellipsis cutoffs, or unauthorized text wrapping on workstation tables.<br>
                  • <strong>Zero Student ID (Rule 2.2)</strong>: Never display or request Student ID in any table.<br>
                  • <strong>Level 0 Programs (Rule 2.4.2)</strong>: Non-Level programs display <code>0</code> in LVL column (never dashes <code>—</code>).<br>
                  • <strong>Alumni Level X (Rule 2.4.2)</strong>: Graduated students display <code>X</code> with color dynamically matched to graduation grade (Grade A = Pure Green <code>#00c000</code>). Purple (<code>var(--grade-star, #a855f7)</code>) is reserved exclusively for Star ★ (100%).<br>
                  • <strong>Level Promotion Passing Threshold (Rule 2.4.1)</strong>: Grade C (60%), Grade F (forgiven), or Grade R (remedial). No arbitrary thresholds like 70%.<br>
                  • <strong>Language Purity</strong>: 100% English across all headers, cells, tooltips, and labels.
                </div>
              </div>

            </div>

            <!-- CARD FOOTER / CTA ACTIONS -->
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:#0f172a; border-top:1px solid rgba(255,255,255,0.12); flex-shrink:0;">
              <div style="font-size:11px; color:#94a3b8;">
                SSOT Architecture v2026.11
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button id="btn-copy-rules-spec" class="btn btn-secondary" style="height:30px !important; line-height:28px !important; font-size:12px; font-weight:600; padding:0 12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; border-radius:4px; cursor:pointer;">
                  Copy Spec
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    `;

    updateLivePreviewStyle();
    attachEventListeners();
    updateSubPanel();
  };

  /**
   * Smooth live synchronization of inputs to preview without wiping the DOM
   * Automatically applies changes globally across TopsCore tables on every edit
   */
  const handleInputChange = (key, val) => {
    cfg[key] = val;

    // Handle height dependencies and sync
    if (key === 'regularHeaderMaxHeight') {
      const half = Math.round(val / 2);
      cfg.superHeaderMaxHeight = half;
      cfg.subHeaderMaxHeight = val - half;
      cfg.superHeaderHeight = half;
      cfg.subHeaderHeight = val - half;
      cfg.regularHeaderHeight = val;

      const superInput = area.querySelector('.bm-input[data-key="superHeaderMaxHeight"]');
      if (superInput) superInput.value = half;
      const subInput = area.querySelector('.bm-input[data-key="subHeaderMaxHeight"]');
      if (subInput) subInput.value = val - half;
    } else if (key === 'regularHeaderMinHeight') {
      const half = Math.round(val / 2);
      cfg.superHeaderMinHeight = half;
      cfg.subHeaderMinHeight = val - half;

      const superMinInput = area.querySelector('.bm-input[data-key="superHeaderMinHeight"]');
      if (superMinInput) superMinInput.value = half;
      const subMinInput = area.querySelector('.bm-input[data-key="subHeaderMinHeight"]');
      if (subMinInput) subMinInput.value = val - half;
    } else if (key === 'superHeaderMaxHeight' || key === 'subHeaderMaxHeight') {
      const sH = Number(cfg.superHeaderMaxHeight) || 30;
      const subH = Number(cfg.subHeaderMaxHeight) || 30;
      cfg.regularHeaderMaxHeight = sH + subH;
      cfg.superHeaderHeight = sH;
      cfg.subHeaderHeight = subH;
      cfg.regularHeaderHeight = sH + subH;

      const regInput = area.querySelector('.bm-input[data-key="regularHeaderMaxHeight"]');
      if (regInput) regInput.value = sH + subH;
    } else if (key === 'superHeaderMinHeight' || key === 'subHeaderMinHeight') {
      const sHMin = Number(cfg.superHeaderMinHeight) || 30;
      const subHMin = Number(cfg.subHeaderMinHeight) || 30;
      cfg.regularHeaderMinHeight = sHMin + subHMin;

      const regMinInput = area.querySelector('.bm-input[data-key="regularHeaderMinHeight"]');
      if (regMinInput) regMinInput.value = sHMin + subHMin;
    }

    persistSettings();
    applyGlobalTableDimensions(cfg); // AUTOMATICALLY APPLIED GLOBALLY!
    updateLivePreviewStyle();

    // Update displayed total height & rules
    const currentTotalH = (Number(cfg.superHeaderMaxHeight) || 30) + (Number(cfg.subHeaderMaxHeight) || 30);

    const ruleDispTotalH = area.querySelector('#rule-disp-total-h');
    if (ruleDispTotalH) ruleDispTotalH.textContent = `${currentTotalH}px`;

    const ruleDispSuperH = area.querySelector('#rule-disp-super-h');
    if (ruleDispSuperH) ruleDispSuperH.textContent = `${cfg.superHeaderMaxHeight || 30}px`;

    const ruleDispSubH = area.querySelector('#rule-disp-sub-h');
    if (ruleDispSubH) ruleDispSubH.textContent = `${cfg.subHeaderMaxHeight || 30}px`;

    const ruleDispFooterH = area.querySelector('#rule-disp-footer-h');
    if (ruleDispFooterH) ruleDispFooterH.textContent = `${cfg.footerMaxHeight || 32}px`;

    // Update bottom infobar
    const infoRegH = document.getElementById('info-reg-h');
    if (infoRegH) infoRegH.textContent = `${currentTotalH}px`;

    const infoSuperH = document.getElementById('info-super-h');
    if (infoSuperH) infoSuperH.textContent = `${cfg.superHeaderMaxHeight || 30}px`;

    const infoSubH = document.getElementById('info-sub-h');
    if (infoSubH) infoSubH.textContent = `${cfg.subHeaderMaxHeight || 30}px`;

    const infoBodyH = document.getElementById('info-body-h');
    if (infoBodyH) infoBodyH.textContent = `${cfg.bodyRowMinHeight || 24}–${cfg.bodyRowMaxHeight || 32}px`;

    const infoFooterH = document.getElementById('info-footer-h');
    if (infoFooterH) infoFooterH.textContent = `${cfg.footerMaxHeight || 32}px`;
  };

  const attachEventListeners = () => {
    // Numeric inputs in builder table
    area.querySelectorAll('.bm-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const key = e.currentTarget.dataset.key;
        const rawVal = e.currentTarget.value;
        if (rawVal === '') return;
        const val = Number(rawVal);
        if (!isNaN(val) && val >= 0) {
          handleInputChange(key, val);
        }
      });
      input.addEventListener('change', (e) => {
        const key = e.currentTarget.dataset.key;
        const val = Number(e.currentTarget.value) || SSOT_DEFAULTS[key] || 30;
        e.currentTarget.value = val;
        handleInputChange(key, val);
      });
    });

    // Font weight selects
    area.querySelectorAll('.bm-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const key = e.currentTarget.dataset.key;
        handleInputChange(key, e.currentTarget.value);
      });
    });

    // Color pickers
    area.querySelectorAll('.bm-color').forEach(col => {
      col.addEventListener('input', (e) => {
        const key = e.currentTarget.dataset.key;
        handleInputChange(key, e.currentTarget.value);
      });
    });

    // Card 1 CTA buttons
    const btnEditorReset = area.querySelector('#btn-editor-reset');
    btnEditorReset?.addEventListener('click', handleResetDefault);

    const btnEditorApply = area.querySelector('#btn-editor-apply');
    btnEditorApply?.addEventListener('click', handleSaveGlobal);

    // Card 2 CTA: Grid toggle
    const btnToggleGrid = area.querySelector('#btn-specimen-grid-toggle');
    btnToggleGrid?.addEventListener('click', () => {
      const nextMode = cfg.gridMode === 'excel' ? 'normal' : 'excel';
      cfg.gridMode = nextMode;
      const selGrid = area.querySelector('#sel-grid-mode');
      if (selGrid) selGrid.value = nextMode;

      persistSettings();
      applyGlobalTableDimensions(cfg);
      updateLivePreviewStyle();

      const tableEl = area.querySelector('#mockup-table-canvas-wrap table');
      if (tableEl) {
        if (nextMode === 'excel') {
          tableEl.classList.add('global-edit-mode-on');
        } else {
          tableEl.classList.remove('global-edit-mode-on');
        }
      }
      showToast(`Grid style switched to ${nextMode === 'excel' ? 'Excel White Gridlines (0.45)' : 'Normal Grid (0.08)'}.`, 'info');
    });

    // Card 3 CTA: Copy spec
    const btnCopySpec = area.querySelector('#btn-copy-rules-spec');
    btnCopySpec?.addEventListener('click', () => {
      const specText = `TOPSCORE LMS TABLE ARCHITECTURE (SSOT)
Header Height: ${Number(cfg.regularHeaderMaxHeight) || 60}px (Super: ${cfg.superHeaderMaxHeight || 30}px + Sub: ${cfg.subHeaderMaxHeight || 30}px)
Body Row Height: ${cfg.bodyRowMinHeight || 24}px - ${cfg.bodyRowMaxHeight || 32}px
Footer Height: ${cfg.footerMaxHeight || 32}px
Gridlines: ${cfg.gridMode === 'excel' ? 'Excel White (0.45)' : 'Normal (0.08)'}
Font: 12px Inter (Weight: Header ${cfg.regularHeaderFontWeight || 800}, Sub ${cfg.subHeaderFontWeight || 700}, Body ${cfg.bodyFontWeight || 600})
Rule 2.31: Zero Table Capsule (Pure Typographic Colors, No Badges In Cells)`;
      navigator.clipboard?.writeText(specText).then(() => {
        showToast('✓ Table architecture spec copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Table spec ready.', 'info');
      });
    });

    // Grid mode selector in Card 3
    const selGrid = area.querySelector('#sel-grid-mode');
    selGrid?.addEventListener('change', (e) => {
      cfg.gridMode = e.currentTarget.value;
      persistSettings();
      applyGlobalTableDimensions(cfg);
      updateLivePreviewStyle();

      const tableEl = area.querySelector('#mockup-table-canvas-wrap table');
      if (tableEl) {
        if (cfg.gridMode === 'excel') {
          tableEl.classList.add('global-edit-mode-on');
        } else {
          tableEl.classList.remove('global-edit-mode-on');
        }
      }

      const infoGridMode = document.getElementById('info-grid-mode');
      if (infoGridMode) infoGridMode.textContent = cfg.gridMode === 'excel' ? 'Excel White (0.45)' : 'Normal (0.08)';

      showToast(`Grid style switched to ${cfg.gridMode === 'excel' ? 'Excel White Gridlines (0.45)' : 'Normal Grid (0.08)'}.`, 'info');
    });
  };

  renderAll();
}
