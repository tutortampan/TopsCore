
function speakEnglishWord(text) {
  if (!text || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => (v.lang === 'en-US' || v.lang.startsWith('en')) && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Female')));
  if (enVoice) u.voice = enVoice;
  window.speechSynthesis.speak(u);
}

/**
 * vocab-vault.js
 * Admin Vocabulary Vault Console — Domain C (Class) Section
 * Handles: Word CRUD, Excel Import with Duplicate Resolver, Cascading Test Builder
 * Version: 4.7.0
 */
import {
  fetchVaultWords,
  fetchVaultTopics,
  checkVaultDuplicates,
  importVaultWords,
  deleteVaultWord,
  updateVaultWord,
  createVocabMasteryTest,
  fetchInstitutions,
  fetchPrograms,
  fetchTestDefinitions,
  adminFetchAll,
  renameVaultTopic,
  renameVaultTheme,
  deleteVaultTopic,
  deleteVaultTheme,
  exportVaultWords,
  updateTestDefinition,
  toOrdinalLevel,
  toShortLevel,
  autoSyncClassTestsForLevel,
  fetchThemeProgramAssignments,
  toggleThemeProgramAssignment,
  updateVaultThemeCascade,
  updateVaultThemeCodeCascade,
  updateVaultTopicCascade,
  updateVaultTopicCodeCascade,
  updateVaultTopicLevelCascade
} from '../api.js?v=20261109_v166';
import { showToast, showLoading, hideLoading } from '../app.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';

// ─── Helpers ───────────────────────────────────────────────

// escapeHtml / escHtml imported canonically

// Parse a local datetime string (YYYY-MM-DDTHH:mm) as WITA (UTC+8)
function parseWita(localStr) {
  if (!localStr) return null;
  // Treat input as WITA (+08:00)
  return localStr.replace('T', 'T') + ':00+08:00';
}

// ─── Main Entry Point ──────────────────────────────────────


export async function renderVocabularyVault(area) {
  showLoading();
  try {
    const [words, topics, institutions, programs, themeAssignments, classes] = await Promise.all([
      fetchVaultWords({ limit: 10000, targetLevel: null }),
      fetchVaultTopics(),
      adminFetchAll('institutions', 'id, name, code, is_active, deleted_at').catch(() => []),
      adminFetchAll('programs', 'id, name, code, institution_id, is_active, deleted_at').catch(() => []),
      fetchThemeProgramAssignments().catch(() => []),
      adminFetchAll('classes', 'id, name, program_id, level_id, institution_id, is_active, deleted_at').catch(() => [])
    ]);
    hideLoading();

    // Cache metadata for sub-tabs and re-renders
    window._vaultMeta = { institutions, programs, themeAssignments, classes };

    // FIX: normalize word_type to lowercase before comparison
    // DB stores PascalCase: "Proverb", "Idiom", "Expression" — phraseTypes list is lowercase
    const phraseTypes = ['expression', 'idiom', 'proverb', 'phrase'];
    const wordsCount = (words || []).filter(w => !phraseTypes.includes((w.word_type || '').toLowerCase())).length;
    const phrasesCount = (words || []).filter(w => phraseTypes.includes((w.word_type || '').toLowerCase())).length;
    const topicsCount = (topics || []).length;

    const uniqueThemes = new Set();
    (topics || []).forEach(t => { if (t.theme) uniqueThemes.add(t.theme.trim().toUpperCase()); });
    (words || []).forEach(w => { if (w.theme) uniqueThemes.add(w.theme.trim().toUpperCase()); });
    const themesCount = uniqueThemes.size || (topics || []).length;

    let hashTab = null;
    if (window.location.hash && window.location.hash.includes('?')) {
      const match = window.location.hash.match(/[?&]tab=([^&]+)/);
      if (match) hashTab = match[1];
    }

    let activeVaultTab = hashTab || window._activeVaultTab || localStorage.getItem('topscore_admin_vault_tab_v2') || 'theme_manager';
    if (activeVaultTab === 'topics' || activeVaultTab === 'themes') activeVaultTab = 'theme_manager';

    const buildVaultTabs = (activeId) => [
      { id: 'theme_manager', icon: '🗺️', val: themesCount, title: 'Theme Manager', label: 'Theme Manager' },
      { id: 'blueprint', icon: '⚡', val: topicsCount, title: 'Test Blueprint', label: 'Test Blueprint' },
      { id: 'vocab', icon: '📦', val: wordsCount, label: 'Vocabulary Words' },
      { id: 'phrases', icon: '💬', val: phrasesCount, label: 'Phrases & Idioms' }
    ];

    // FIX: move tabs to topbar (same pattern as Test, Class Hub, Students)
    if (window.setTopbarTabs) {
      window.setTopbarTabs(buildVaultTabs(activeVaultTab), activeVaultTab, 'window._switchVaultTab');
    }

    // Content area: only the tab content — NO inline tab bar
    area.innerHTML = `<div id="vault-tab-content" style="box-sizing: border-box; height: 100%; display: flex; flex-direction: column; overflow: hidden; flex: 1; min-height: 0; padding: 2px 0 0 0;"></div>`;

    const tabContent = document.getElementById('vault-tab-content');

    const renderActiveVaultView = () => {
      // Refresh topbar active highlight
      if (window.setTopbarTabs) {
        window.setTopbarTabs(buildVaultTabs(activeVaultTab), activeVaultTab, 'window._switchVaultTab');
      }
      tabContent.innerHTML = '';
      if (activeVaultTab === 'theme_manager') {
        _renderThemeManagerTab(tabContent, words, topics, window._vaultMeta);
      } else if (activeVaultTab === 'blueprint') {
        _renderThemeBlueprintTab(tabContent, words, topics, window._vaultMeta);
      } else if (activeVaultTab === 'vocab') {
        _renderVaultGrid(tabContent, words, topics, 'single_words');
      } else if (activeVaultTab === 'phrases') {
        _renderVaultGrid(tabContent, words, topics, 'phrases');
      }
    };

    window._switchVaultTab = (tabId) => {
      activeVaultTab = tabId;
      window._activeVaultTab = tabId; // persist across re-renders
      try {
        localStorage.setItem('topscore_admin_vault_tab', tabId);
        localStorage.setItem('topscore_admin_vault_tab_v2', tabId);
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', `#vocab_vault?tab=${tabId}`);
        }
      } catch (_) {}
      renderActiveVaultView();
    };

    renderActiveVaultView();

  } catch (e) {
    hideLoading();
    area.innerHTML = `<div class="empty-state"><div class="empty-state__icon">&#9888;&#65039;</div><h3>Failed to load Vocabulary Vault</h3><p class="text-muted">${escapeHtml(e.message)}</p></div>`;
  }
}


// ─── Grid View ─────────────────────────────────────────────

function _renderVaultGrid(area, words, topics, mode = 'single_words') {
  let title = mode === 'single_words' ? '📦 Words' : '💬 Phrases';
  let desc = mode === 'single_words'
    ? 'Standard vocabulary (Noun, Verb, Adjective, Adverb). Feeds Module 1.'
    : 'Expressions, idioms, and proverbs. Feeds Module 2.';

  // Determine allowed options in filter based on mode
  const wordTypeOptions = mode === 'single_words'
    ? `
      <option value="Vocab">Vocab / Vocabulary</option>
      <option value="Verb">Verb</option>
      <option value="Noun">Noun</option>
      <option value="Adjective">Adjective</option>
      <option value="Adverb">Adverb</option>
    `
    : `
      <option value="Expression">Expression</option>
      <option value="Idiom">Idiom</option>
      <option value="Proverb">Proverb</option>
    `;

  const uniqueLevels = Array.from(new Set(words.map(w => parseInt(w.target_level)).filter(n => !isNaN(n) && n > 0))).sort((a, b) => a - b);
  if (uniqueLevels.length === 0) uniqueLevels.push(1, 2, 3);
  const levelSelectOptions = uniqueLevels.map(lvl => `<option value="${lvl}">${typeof toShortLevel === 'function' ? toShortLevel(lvl) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(lvl) : lvl)}</option>`).join('');

  area.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', sans-serif;">
      <div class="table-wrap sticky-first" style="flex: 1; min-height: 0; overflow-y: auto; margin: 0; background: #0f172a;">
        <table id="vault-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 12px;">
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 20; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 68px; border-right: 1px solid rgba(255,255,255,0.08);" title="Institution">INST</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 75px; border-right: 1px solid rgba(255,255,255,0.08);" title="Program">PROG</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Level">LVL</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; font-size: 12px; width: 65px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Composite Code (Level + ThemeCode + TopicCode)">CODE</th>
              <th style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 140px; border-right: 1px solid rgba(255,255,255,0.08);" title="Theme Name">THEME</th>
              <th style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 160px; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Name">TOPIC</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 85px; border-right: 1px solid rgba(255,255,255,0.08);" title="Word Type">TYPE</th>
              <th style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);" title="Indonesian Meaning">INDONESIAN</th>
              <th style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);" title="English Word / Phrase">ENGLISH</th>
              <th class="edit-mode-only" style="padding: 6px 8px; font-weight: 800; color: #f87171; text-transform: uppercase; font-size: 12px; text-align: center; width: 55px; position: sticky; right: 0; background: #1e293b; border-left: 1px solid rgba(255, 255, 255, 0.1); z-index: 25;" title="Actions">ACT</th>
            </tr>
          </thead>
          <tbody id="vault-tbody"></tbody>
        </table>
      </div>
    </div>
  `;

  // Store all words for client-side filtering
  // Filter down to the mode initially
  let _allWords = words.filter(w => {
    const wt = (w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb'].includes(wt);
    if (mode === 'single_words') return !isPhrase;
    return isPhrase;
  });

  function _syncVaultGridBottomBar(filtered, allModeWords, currentMode) {
    if (!window.setBottomInfobar) return;

    const isWords = currentMode === 'single_words';
    const totalCount = allModeWords.length;
    const isFiltered = filtered.length !== totalCount;
    const targetSet = isFiltered ? filtered : allModeWords;
    const qCount = new Set(targetSet.map(w => (w.indonesian || '').toLowerCase().trim())).size;

    const searchVal = window._vaultGridSearch || '';
    const lvlVal = window._vaultGridLevel || '';
    const topVal = window._vaultGridTopic || '';
    const typeVal = window._vaultGridType || '';

    let leftHtml = `
      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; overflow-x: auto;">
        <input type="search" id="vault-search" placeholder="🔍 Search..." value="${escapeHtml(searchVal)}" style="width: 160px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 8px; outline: none;">

        <select id="vault-level-filter" style="width: 95px; height: 32px; font-size: 11px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Levels</option>
          ${uniqueLevels.map(lvl => `<option value="${lvl}"${lvlVal === String(lvl) ? ' selected' : ''}>${typeof toShortLevel === 'function' ? toShortLevel(lvl) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(lvl) : lvl)}</option>`).join('')}
        </select>

        <select id="vault-topic-filter" style="width: 135px; height: 32px; font-size: 11px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Topics</option>
          ${topics.map(t => {
            const tName = typeof t === 'string' ? t : (t.name || t.topic || '');
            return `<option value="${escapeHtml(tName)}"${topVal === tName ? ' selected' : ''}>${escapeHtml(tName)}</option>`;
          }).join('')}
        </select>

        <select id="vault-wordtype-filter" style="width: 110px; height: 32px; font-size: 11px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Types</option>
          ${mode === 'single_words'
            ? `
              <option value="Vocab"${typeVal === 'Vocab' ? ' selected' : ''}>Vocab</option>
              <option value="Verb"${typeVal === 'Verb' ? ' selected' : ''}>Verb</option>
              <option value="Noun"${typeVal === 'Noun' ? ' selected' : ''}>Noun</option>
              <option value="Adjective"${typeVal === 'Adjective' ? ' selected' : ''}>Adjective</option>
              <option value="Adverb"${typeVal === 'Adverb' ? ' selected' : ''}>Adverb</option>
            `
            : `
              <option value="Expression"${typeVal === 'Expression' ? ' selected' : ''}>Expression</option>
              <option value="Idiom"${typeVal === 'Idiom' ? ' selected' : ''}>Idiom</option>
              <option value="Proverb"${typeVal === 'Proverb' ? ' selected' : ''}>Proverb</option>
            `
          }
        </select>

        <div class="bottom-info-chip" style="border: 1px solid rgba(56, 189, 248, 0.4);"><span class="chip-label" style="color: #38bdf8;">Showing:</span><span class="chip-val" style="color: #38bdf8;">${filtered.length} / ${totalCount}</span></div>
        <div class="bottom-info-chip"><span class="chip-label">Questions:</span><span class="chip-val">${qCount}</span></div>
      </div>
    `;

    const rightHtml = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <button class="btn btn-secondary btn-sm" id="btn-import-vault" style="height:32px; font-size:11px; padding:0 8px; font-weight:600; background:rgba(30,41,59,0.85); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">📥 Import</button>
        <button class="btn btn-secondary btn-sm" id="btn-export-vault" style="height:32px; font-size:11px; padding:0 8px; font-weight:600; background:rgba(30,41,59,0.85); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">📤 Export</button>
        <button class="btn btn-secondary btn-sm" id="btn-check-duplicates" style="height:32px; font-size:11px; padding:0 8px; font-weight:600; background:rgba(30,41,59,0.85); border:1px solid rgba(255,255,255,0.15); color:#38bdf8; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">🔍 Dups</button>
      </div>
    `;

    window.setBottomInfobar(leftHtml, rightHtml);
    bindVaultGridBottomActions();
  }

  function bindVaultGridBottomActions() {
    const sInput = document.getElementById('vault-search');
    if (sInput && !sInput.dataset.bound) {
      sInput.dataset.bound = 'true';
      sInput.addEventListener('input', (e) => {
        window._vaultGridSearch = e.target.value;
        filterAndRender();
      });
    }

    const lvlSelect = document.getElementById('vault-level-filter');
    if (lvlSelect && !lvlSelect.dataset.bound) {
      lvlSelect.dataset.bound = 'true';
      lvlSelect.addEventListener('change', (e) => {
        window._vaultGridLevel = e.target.value;
        filterAndRender();
      });
    }

    const topSelect = document.getElementById('vault-topic-filter');
    if (topSelect && !topSelect.dataset.bound) {
      topSelect.dataset.bound = 'true';
      topSelect.addEventListener('change', (e) => {
        window._vaultGridTopic = e.target.value;
        filterAndRender();
      });
    }

    const typeSelect = document.getElementById('vault-wordtype-filter');
    if (typeSelect && !typeSelect.dataset.bound) {
      typeSelect.dataset.bound = 'true';
      typeSelect.addEventListener('change', (e) => {
        window._vaultGridType = e.target.value;
        filterAndRender();
      });
    }

    const btnExp = document.getElementById('btn-export-vault');
    if (btnExp && !btnExp.dataset.bound) {
      btnExp.dataset.bound = 'true';
      btnExp.addEventListener('click', async () => {
        try {
          const oldText = btnExp.innerHTML;
          btnExp.innerHTML = '⏳ Exporting...';
          btnExp.disabled = true;
          await exportVaultWords(mode);
          btnExp.innerHTML = oldText;
          btnExp.disabled = false;
        } catch (e) {
          showToast('Export failed: ' + e.message, 'error');
          btnExp.innerHTML = '📤 Export';
          btnExp.disabled = false;
        }
      });
    }

    const btnImp = document.getElementById('btn-import-vault');
    if (btnImp && !btnImp.dataset.bound) {
      btnImp.dataset.bound = 'true';
      btnImp.addEventListener('click', () => openImportModal(_allWords, topics, (newWords) => {
        _allWords = [..._allWords, ...newWords];
        filterAndRender();
      }, mode));
    }

    const btnDups = document.getElementById('btn-check-duplicates');
    if (btnDups && !btnDups.dataset.bound) {
      btnDups.dataset.bound = 'true';
      btnDups.addEventListener('click', () => {
        openDuplicateCheckerModal(_allWords, (updatedWords) => {
          _allWords = updatedWords;
          filterAndRender();
        });
      });
    }
  }

  function renderRows(filtered) {
    const tbody = document.getElementById('vault-tbody');
    if (!tbody) return;
    _syncVaultGridBottomBar(filtered, _allWords, mode);

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 30px; color: #64748b; font-size: 12px;">
            No vocabulary items found matching current filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((w) => {
      let typeColor = "#3b82f6";
      const wt = (w.word_type || 'Vocab').toLowerCase();
      if (wt === 'vocab' || wt === 'vocabulary') typeColor = "#00c000ff";
      else if (wt === 'idiom') typeColor = "#FF8C00";
      else if (wt === 'expression') typeColor = "#8b5cf6";
      else if (wt === 'proverb') typeColor = "#FF0000";

      const cleanLvl = parseInt(w.target_level, 10) || 1;
      const cleanThCode = (w.theme_code || 'A').trim().toUpperCase();
      const rawTpCode = (w.topic_code || '1').trim();
      const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '') || rawTpCode || '1';
      const compositeCode = `${cleanLvl}${cleanThCode}${cleanTpCode}`;

      const phraseOpts = `
        <option value="Expression"${wt === 'expression' ? ' selected' : ''}>Expression</option>
        <option value="Idiom"${wt === 'idiom' ? ' selected' : ''}>Idiom</option>
        <option value="Proverb"${wt === 'proverb' ? ' selected' : ''}>Proverb</option>
        <option value="Phrase"${wt === 'phrase' ? ' selected' : ''}>Phrase</option>
      `;
      const vocabOpts = `
        <option value="Verb"${wt === 'verb' ? ' selected' : ''}>Verb</option>
        <option value="Noun"${wt === 'noun' ? ' selected' : ''}>Noun</option>
        <option value="Adjective"${wt === 'adjective' ? ' selected' : ''}>Adjective</option>
        <option value="Adverb"${wt === 'adverb' ? ' selected' : ''}>Adverb</option>
        <option value="Vocab"${wt === 'vocab' ? ' selected' : ''}>Vocab</option>
      `;
      const typeOptionsHtml = mode === 'phrases' ? phraseOpts : vocabOpts;

      return `
        <tr data-word-id="${escapeHtml(w.id)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td style="padding: 6px 8px; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);"><span style="color: #38bdf8; font-weight: 700;">${escapeHtml(w.institutions?.code || w.institution_code || 'CEC')}</span></td>
          <td style="padding: 6px 8px; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);"><span style="color: #c084fc; font-weight: 700;">${escapeHtml(w.programs?.name || w.program_name || 'Camp')}</span></td>
          <td class="editable-cell col-vault-lvl" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="color: #f8fafc; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums;">${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(cleanLvl) : cleanLvl)}</span>
            <input type="number" min="1" max="6" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="target_level" value="${cleanLvl}" style="text-align:center;">
          </td>
          <td class="editable-cell col-vault-composite-code" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="color:#a5b4fc;font-family:monospace;font-size:12px;font-weight:800;">${escapeHtml(compositeCode)}</span>
            <input type="text" maxlength="8" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="composite_code" value="${escapeHtml(compositeCode)}" style="text-align:center;font-family:monospace;font-weight:700;text-transform:uppercase;">
          </td>
          <td class="editable-cell" style="padding: 6px 10px; color: #ffffff; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.theme || '—')}">${escapeHtml(w.theme || '—')}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="theme" value="${escapeHtml(w.theme || '')}">
          </td>
          <td class="editable-cell" style="padding: 6px 10px; color: #ffffff; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.topic || '')}">${escapeHtml(w.topic || '')}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="topic" value="${escapeHtml(w.topic || '')}">
          </td>
          <td class="editable-cell" style="padding: 6px 8px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="font-size:12px; color: ${typeColor}; font-weight: 700;">${escapeHtml(w.word_type || 'Vocab')}</span>
            <select class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="word_type">${typeOptionsHtml}</select>
          </td>
          <td class="editable-cell" style="padding: 6px 12px; font-weight: 700; color: #ffffff; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.indonesian)}">${escapeHtml(w.indonesian)}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="indonesian" value="${escapeHtml(w.indonesian)}">
          </td>
          <td class="editable-cell" style="padding: 6px 12px; color: #ffffff; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.english)}">
              <button type="button" class="btn-vault-speak" data-speak="${escapeHtml(w.english)}" style="background:transparent; border:none; cursor:pointer; padding:0 4px; font-size:12px; color:var(--clr-accent-1, #6366f1);" title="Listen Native Pronunciation">🔊</button>
              ${escapeHtml(w.english)}
            </span>
            <div class="vault-edit-wrapper" style="align-items:center;gap:4px;width:100%;">
              <button type="button" class="btn-vault-speak" data-speak="${escapeHtml(w.english)}" style="background:transparent; border:none; cursor:pointer; font-size:12px; color:#38bdf8;" title="Listen Native Pronunciation">🔊</button>
              <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="english" value="${escapeHtml(w.english)}" style="flex:1;">
            </div>
          </td>
          <td class="edit-mode-only" style="padding: 6px 8px; text-align: center; width: 55px; position: sticky; right: 0; background: #0f172a; border-left: 1px solid rgba(255, 255, 255, 0.08); z-index: 5;">
            <button type="button" class="btn-del-mini" data-del-vault="${escapeHtml(w.id)}" title="Delete word" style="background:transparent;border:none;cursor:pointer;color:#f87171;font-size:14px;padding:2px 4px;">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    // Native Speech Pronunciation Handler
    tbody.querySelectorAll('.btn-vault-speak').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        speakEnglishWord(text);
        btn.style.transform = 'scale(1.25)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 250);
      };
    });

    // Delete handlers
    tbody.querySelectorAll('[data-del-vault]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-del-vault');
        if (!confirm('Soft-delete this item from Vault?')) return;
        try {
          await deleteVaultWord(id);
          showToast('Word deleted from Vault.', 'success');
          _allWords = _allWords.filter(w => w.id !== id);
          filterAndRender();
        } catch (e) {
          showToast('Delete failed: ' + e.message, 'error');
        }
      };
    });

    // Direct Inline Cell Edit Handlers
    tbody.onchange = async (e) => {
      const input = e.target;
      if (!input || !input.classList.contains('vault-edit-input')) return;
      const wordId = input.dataset.id;
      const field = input.dataset.field;
      if (!wordId || !field) return;

      const word = _allWords.find(w => w.id === wordId);
      if (!word) return;

      const cell = input.closest('td');
      const viewSpan = cell?.querySelector('.vault-cell-view');
      const tr = input.closest('tr');
      const newVal = input.value.trim();

      // 1. Guard against empty inputs (except theme which can be unassigned)
      if (!newVal && field !== 'theme') {
        const fallback = word[field] || '';
        input.value = fallback;
        if (viewSpan) viewSpan.textContent = fallback;
        input.classList.add('save-error');
        setTimeout(() => input.classList.remove('save-error'), 800);
        showToast('Field cannot be empty — reverted.', 'warning');
        return;
      }

      let payload = {};

      try {
        if (field === 'composite_code') {
          // Flexible composite code parser: clean separators e.g. 1-A-1 -> 1A1
          const cleanCode = newVal.replace(/[\s\-_/.]+/g, '').toUpperCase();
          const matchFull = cleanCode.match(/^([1-9])([A-Z]+)(\d+)$/);
          const matchNoLvl = cleanCode.match(/^([A-Z]+)(\d+)$/);

          if (matchFull) {
            payload.target_level = parseInt(matchFull[1], 10);
            payload.theme_code = matchFull[2];
            payload.topic_code = matchFull[3];
          } else if (matchNoLvl) {
            payload.target_level = parseInt(word.target_level, 10) || 1;
            payload.theme_code = matchNoLvl[1];
            payload.topic_code = matchNoLvl[2];
          } else {
            payload.topic_code = cleanCode;
          }

          if (payload.target_level) word.target_level = payload.target_level;
          if (payload.theme_code) word.theme_code = payload.theme_code;
          if (payload.topic_code) word.topic_code = payload.topic_code;

          const canonicalCode = `${payload.target_level || word.target_level}${payload.theme_code || word.theme_code || 'A'}${payload.topic_code || '1'}`;
          input.value = canonicalCode;
          if (viewSpan) viewSpan.textContent = canonicalCode;

          // Also sync the row's LVL cell if level changed
          if (payload.target_level && tr) {
            const lvlInput = tr.querySelector('.col-vault-lvl input');
            const lvlSpan = tr.querySelector('.col-vault-lvl .vault-cell-view');
            if (lvlInput) lvlInput.value = payload.target_level;
            if (lvlSpan) {
              const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(payload.target_level) : `${payload.target_level}ST`;
              lvlSpan.textContent = shortLbl;
            }
          }
        } else if (field === 'target_level') {
          const parsedLvl = parseInt(newVal, 10);
          if (isNaN(parsedLvl) || parsedLvl < 1 || parsedLvl > 6) {
            input.value = word.target_level;
            input.classList.add('save-error');
            setTimeout(() => input.classList.remove('save-error'), 800);
            showToast('Level must be between 1 and 6.', 'warning');
            return;
          }
          payload.target_level = parsedLvl;
          word.target_level = parsedLvl;
          if (viewSpan) {
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(parsedLvl) : `${parsedLvl}ST`;
            viewSpan.textContent = shortLbl;
          }

          // Recalculate composite code in this row
          const cleanTp = (word.topic_code || '1').replace(/^[A-Za-z]+/, '');
          const newComp = `${parsedLvl}${word.theme_code || 'A'}${cleanTp}`;
          const codeInput = tr?.querySelector('.col-vault-composite-code input');
          const codeSpan = tr?.querySelector('.col-vault-composite-code .vault-cell-view');
          if (codeInput) codeInput.value = newComp;
          if (codeSpan) codeSpan.textContent = newComp;
        } else if (field === 'english') {
          payload.english = newVal;
          word.english = newVal;
          if (viewSpan) {
            viewSpan.innerHTML = `<button type="button" class="btn-vault-speak" data-speak="${escapeHtml(newVal)}" style="background:transparent; border:none; cursor:pointer; padding:0 4px; font-size:12px; color:var(--clr-accent-1, #6366f1);" title="Listen Native Pronunciation">🔊</button> ${escapeHtml(newVal)}`;
          }
          const speakBtn = cell?.querySelector('.btn-vault-speak');
          if (speakBtn) speakBtn.setAttribute('data-speak', newVal);
        } else if (field === 'word_type') {
          payload.word_type = newVal;
          word.word_type = newVal;
          if (viewSpan) {
            viewSpan.textContent = newVal;
            viewSpan.style.color = getWordTypeColor(newVal);
          }
        } else {
          payload[field] = newVal;
          word[field] = newVal;
          if (viewSpan) viewSpan.textContent = newVal;
        }

        await updateVaultWord(wordId, payload);

        input.classList.add('save-success');
        setTimeout(() => input.classList.remove('save-success'), 700);
        showToast('Updated successfully.', 'success');
      } catch (err) {
        input.classList.add('save-error');
        setTimeout(() => input.classList.remove('save-error'), 800);
        showToast('Update failed: ' + err.message, 'error');
      }
    };

    tbody.onkeydown = (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('vault-edit-input')) {
        e.target.blur();
      }
    };
  }

  function filterAndRender() {
    const search = (window._vaultGridSearch || document.getElementById('vault-search')?.value || '').toLowerCase().trim();
    const level = window._vaultGridLevel || document.getElementById('vault-level-filter')?.value || '';
    const topic = window._vaultGridTopic || document.getElementById('vault-topic-filter')?.value || '';
    const wordType = window._vaultGridType || document.getElementById('vault-wordtype-filter')?.value || '';
    let filtered = _allWords;
    if (level) filtered = filtered.filter(w => String(w.target_level) === level);
    if (topic) filtered = filtered.filter(w => w.topic === topic);
    if (wordType) {
      filtered = filtered.filter(w => {
        if (wordType === 'Vocab') return w.word_type?.toLowerCase().includes('vocab');
        return w.word_type === wordType;
      });
    }
    if (search) filtered = filtered.filter(w =>
      (w.indonesian || '').toLowerCase().includes(search) ||
      (w.english || '').toLowerCase().includes(search) ||
      (w.topic || '').toLowerCase().includes(search) ||
      (w.theme || '').toLowerCase().includes(search)
    );
    renderRows(filtered);
  }

  setTimeout(() => {
    filterAndRender();
  }, 10);
}

// ─── Import Modal ───────────────────────────────────────────

function openImportModal(existingWords, topics, onSuccess, mode = 'single_words') {
  const allowedTypesStr = 'Vocab, Noun, Verb, Adjective, Adverb, Expression, Idiom, Proverb';

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'vault-import-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:700px;">
      <div class="d-flex justify-between align-center mb-4">
        <h3 class="fw-700" style="margin:0;">&#128229; Import Vocabulary &amp; Phrases from Excel (10-Column Standard)</h3>
        <button class="btn btn-ghost btn-sm" id="close-import-modal">&#10005;</button>
      </div>
      <p class="text-muted text-sm mb-3">
        Upload an <strong>.xlsx</strong> file conforming to the official 10-column standard:<br>
        <code>1. Institution</code> &bull; <code>2. Program</code> &bull; <code>3. Level</code> &bull; <code>4. Category</code> &bull; <code>5. Code (A1, A2..)</code> &bull; <code>6. Theme</code> &bull; <code>7. Topic</code> &bull; <code>8. Type</code> &bull; <code>9. Indonesian</code> &bull; <code>10. English</code><br>
        <span class="text-xs" style="color: #6366f1;">Unified Code: Enter <code>A1</code>, <code>A2</code>, <code>B1</code> directly. (Legacy 11-column files with separate Theme Code &amp; Topic Code are also automatically supported).</span>
      </p>

      <div class="d-flex gap-3 mb-3">
        <div style="flex:1;">
          <label class="form-label text-xs fw-700">Fallback Institution (if blank in Excel)</label>
          <select id="vault-import-inst" class="form-control" style="width:100%;font-size:0.85rem;">
            <option value="637fea53-ca64-4e1c-8ff7-6fd4dbdd8260">TOP</option>
            <option value="f51d4c2c-7c24-42ef-8d8f-b0f3e524a447">CEC (Central English Course)</option>
          </select>
        </div>
        <div style="flex:1;">
          <label class="form-label text-xs fw-700">Fallback Program (if blank in Excel)</label>
          <select id="vault-import-prog" class="form-control" style="width:100%;font-size:0.85rem;">
            <option value="">Loading programs...</option>
          </select>
        </div>
      </div>

      <div class="form-group mb-4">
        <input type="file" id="vault-excel-input" accept=".xlsx,.xls" class="form-control" />
      </div>
      <div id="import-preview-area"></div>
      <div class="d-flex gap-3 justify-end mt-4" id="import-action-row" style="display:none!important;">
        <button class="btn btn-secondary btn-sm" id="close-import-modal-2">Cancel</button>
        <button class="btn btn-primary btn-sm" id="confirm-import-btn">&#10003; Import Words</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  let _availableInsts = [];
  let _availableProgs = [];

  (async () => {
    try {
      const sb = await getSupabase();
      const [{ data: instData }, { data: progData }] = await Promise.all([
        sb.from('institutions').select('id, name, code').is('deleted_at', null).order('name'),
        sb.from('programs').select('id, name, code, institution_id').is('deleted_at', null).order('name')
      ]);
      _availableInsts = instData || [];
      _availableProgs = progData || [];

      const instSel = document.getElementById('vault-import-inst');
      const progSel = document.getElementById('vault-import-prog');
      if (!instSel || !progSel) return;

      if (_availableInsts.length > 0) {
        instSel.innerHTML = _availableInsts.map(i => {
          const label = i.code ? `${i.name} (${i.code})` : i.name;
          return `<option value="${i.id}">${escapeHtml(label)}</option>`;
        }).join('');
      }

      const updateProgOptions = () => {
        const selectedInstId = instSel.value;
        const matchingProgs = _availableProgs.filter(p => !p.institution_id || p.institution_id === selectedInstId);
        progSel.innerHTML = matchingProgs.map(p => {
          const label = p.code ? `${p.name} (${p.code})` : p.name;
          return `<option value="${p.id}">${escapeHtml(label)}</option>`;
        }).join('');
      };

      instSel.addEventListener('change', updateProgOptions);
      updateProgOptions();
    } catch (e) {
      console.warn('Failed to load institutions/programs for vault import modal:', e);
    }
  })();

  const close = () => modal.remove();
  document.getElementById('close-import-modal')?.addEventListener('click', close);
  document.getElementById('close-import-modal-2')?.addEventListener('click', close);

  let _parsedRows = [];
  let _resolutionMap = {};
  let _conflictRows = [];
  let _cleanRows = [];

  document.getElementById('vault-excel-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showLoading('Parsing Excel...');
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const fallbackInstId = document.getElementById('vault-import-inst')?.value || '637fea53-ca64-4e1c-8ff7-6fd4dbdd8260';
      const fallbackProgId = document.getElementById('vault-import-prog')?.value || '';

      // Normalize column names (supports 10-column unified standard and legacy 11-column standard with smart fallback)
      _parsedRows = raw.map(row => {
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
          // Normalize header: strip invisible carriage returns and collapse whitespace
          const cleanKey = String(k || '').trim().toUpperCase().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
          normalized[cleanKey] = String(v ?? '').trim();
        }

        // Smart Code / Theme Code / Topic Code parsing
        let rawCode = normalized['CODE'] || normalized['TOPIC CODE'] || normalized['TOPIC_CODE'] || normalized['T.CODE'] || normalized['TOPIC NO'] || normalized['TOPIC ID'] || '';
        let rawThemeCode = normalized['THEME CODE'] || normalized['THEME_CODE'] || '';
        let rawTheme = normalized['THEME NAME'] || normalized['THEME'] || '';
        let rawTopic = normalized['TOPIC NAME'] || normalized['TOPIC'] || '';

        // Case 1: rawCode is unified format "A1", "A2", "B1"
        if (/^[A-Za-z][0-9]+$/.test(rawCode)) {
          rawCode = rawCode.toUpperCase();
          if (!rawThemeCode) rawThemeCode = rawCode[0];
        } else if (/^[0-9]+$/.test(rawCode)) {
          // Case 2: rawCode is numeric "1", "2" and we have themeCode "A"
          if (rawThemeCode && /^[A-Za-z]$/.test(rawThemeCode)) {
            rawCode = `${rawThemeCode.toUpperCase()}${rawCode}`;
          }
        }

        // Case 3: Code is still missing or pure numeric -> Check curriculum dictionary or synthesize
        if (!rawCode || /^[0-9]+$/.test(rawCode)) {
          if (TOPIC_CODE_MAP[rawTopic]) {
            rawCode = TOPIC_CODE_MAP[rawTopic];
            if (!rawThemeCode) rawThemeCode = rawCode[0];
          } else if (rawThemeCode && /^[A-Za-z]$/.test(rawThemeCode)) {
            rawCode = `${rawThemeCode.toUpperCase()}${rawCode || '1'}`;
          } else {
            rawCode = 'A1';
            rawThemeCode = rawThemeCode || 'A';
          }
        }

        if (!rawThemeCode && rawCode && /^[A-Za-z]/.test(rawCode)) {
          rawThemeCode = rawCode[0].toUpperCase();
        }

        let rowInstId = fallbackInstId;
        let rowProgId = fallbackProgId;

        const rawInst = normalized.INSTITUTION || normalized['INSTITUTION NAME'] || normalized.INSTITUTE || '';
        if (rawInst && _availableInsts.length > 0) {
          const m = _availableInsts.find(i =>
            i.id.toLowerCase() === rawInst.toLowerCase() ||
            (i.name && i.name.toLowerCase() === rawInst.toLowerCase()) ||
            (i.code && i.code.toLowerCase() === rawInst.toLowerCase())
          );
          if (m) rowInstId = m.id;
        }

        const rawProg = normalized.PROGRAM || normalized['PROGRAM NAME'] || '';
        if (rawProg && _availableProgs.length > 0) {
          const m = _availableProgs.find(p =>
            p.id.toLowerCase() === rawProg.toLowerCase() ||
            (p.name && p.name.toLowerCase() === rawProg.toLowerCase()) ||
            (p.code && p.code.toLowerCase() === rawProg.toLowerCase())
          );
          if (m) {
            rowProgId = m.id;
            if (m.institution_id && !rawInst) rowInstId = m.institution_id;
          }
        }

        return {
          institution_id: rowInstId,
          program_id: rowProgId,
          level: normalized.LEVEL || normalized.TARGET_LEVEL || '1',
          category: normalized.CATEGORY || '',
          theme_code: rawThemeCode.toUpperCase(),
          theme: rawTheme,
          topic_code: rawCode.toUpperCase(),
          topic: rawTopic,
          word_type: normalized.TYPE || normalized['WORD TYPE'] || normalized.WORD_TYPE || 'Vocab',
          indonesian: normalized.INDONESIAN || '',
          english: normalized.ENGLISH || ''
        };
      }).filter(r => r.topic && r.indonesian && r.english);

      // Auto-classify rows using Category if provided, fallback to Type
      const allowedPhraseTypes = ['expression', 'idiom', 'proverb'];
      _parsedRows = _parsedRows.map(r => {
        const wt = (r.word_type || '').toLowerCase();
        const cat = (r.category || '').toLowerCase();

        // If Category is explicitly provided, trust it first!
        let isPhrase = allowedPhraseTypes.includes(wt);
        if (cat.includes('phrase')) isPhrase = true;
        else if (cat.includes('word')) isPhrase = false;

        return { ...r, _isPhrase: isPhrase };
      });

      hideLoading();
      if (!_parsedRows.length) {
        showToast('No valid rows found. Ensure the file has Topic, Indonesian, and English columns.', 'error');
        return;
      }

      showLoading('Checking for duplicates...');
      const { cleanRows, duplicateConflicts } = await checkVaultDuplicates(_parsedRows);
      hideLoading();

      _cleanRows = cleanRows;
      _conflictRows = duplicateConflicts;

      // Default: all clean rows have no resolution (will be inserted)
      _resolutionMap = {};

      const previewArea = document.getElementById('import-preview-area');
      if (!previewArea) return;

      const uniqueIndoCount = new Set(_parsedRows.map(r => r.indonesian.trim().toLowerCase())).size;
      const uniqueThemes = new Set(_parsedRows.map(r => r.theme).filter(Boolean)).size;
      const uniqueTopics = new Set(_parsedRows.map(r => r.topic).filter(Boolean)).size;
      const vocabRows = _parsedRows.filter(r => !r._isPhrase);
      const phraseRows = _parsedRows.filter(r => r._isPhrase);
      const vocabDupes = duplicateConflicts.filter(c => !allowedPhraseTypes.includes((c.row.word_type || '').toLowerCase())).length;
      const phraseDupes = duplicateConflicts.filter(c => allowedPhraseTypes.includes((c.row.word_type || '').toLowerCase())).length;

      const distributionBadge = `
        <div class="d-flex gap-2 flex-wrap mt-2">
          <span style="background:rgba(0,192,0,0.15);color:#00c000ff;border:1px solid rgba(0,192,0,0.3);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">📦 Single Words: ${vocabRows.length} (${vocabDupes} dupes)</span>
          <span style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">💬 Phrases: ${phraseRows.length} (${phraseDupes} dupes)</span>
          <span style="background:rgba(99,102,241,0.1);color:#818cf8;border:1px solid rgba(99,102,241,0.25);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">🔍 Unique Questions: ${uniqueIndoCount}</span>
          <span style="background:rgba(236,72,153,0.15);color:#f472b6;border:1px solid rgba(236,72,153,0.3);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">📑 Themes: ${uniqueThemes} | Topics: ${uniqueTopics}</span>
        </div>`;

      if (!duplicateConflicts.length) {
        previewArea.innerHTML = `
          <div class="p-3 rounded mb-3" style="background:rgba(0,192,0,0.1);border:1px solid rgba(0,192,0,0.3);">
            <p class="text-success fw-600 mb-1">&#10003; ${_parsedRows.length} total rows parsed — no conflicts detected.</p>
            ${distributionBadge}
          </div>
        `;
      } else {
        previewArea.innerHTML = `
          <div class="p-3 rounded mb-3" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);">
            <p class="fw-600 mb-1" style="color:#f59e0b;">&#9888; ${duplicateConflicts.length} conflict(s) detected — choose an action for each:</p>
            <p class="text-muted text-xs mb-1">${cleanRows.length} rows are clean and will be imported automatically.</p>
            ${distributionBadge}
            <div class="d-flex gap-2 flex-wrap mb-3">
              <button class="btn btn-outline btn-xs" id="bulk-merge-all">Merge All</button>
              <button class="btn btn-outline btn-xs" id="bulk-overwrite-all">Overwrite All</button>
              <button class="btn btn-outline btn-xs" id="bulk-skip-all">Skip All</button>
            </div>
          </div>
          <div class="table-wrap" style="max-height:280px;overflow-y:auto;">
            <table>
              <thead>
                <tr>
                  <th>Incoming Word</th>
                  <th>Existing Vault Word</th>
                  <th class="text-center">Conflict Type</th>
                  <th class="text-center">Action</th>
                </tr>
              </thead>
              <tbody id="conflict-tbody">
                ${duplicateConflicts.map((c, ci) => `
                  <tr>
                    <td>
                      <div class="fw-600 text-sm">${escapeHtml(c.row.indonesian)}</div>
                      <div class="text-xs text-muted">${escapeHtml(c.row.english)}</div>
                      <div class="text-xs" style="color:#a5b4fc;">${escapeHtml(c.row.topic)}</div>
                    </td>
                    <td>
                      <div class="fw-600 text-sm">${escapeHtml(c.existingRecord.indonesian)}</div>
                      <div class="text-xs text-muted">${escapeHtml(c.existingRecord.english)}</div>
                      <div class="text-xs" style="color:#a5b4fc;">${escapeHtml(c.existingRecord.topic)}</div>
                    </td>
                    <td class="text-center">
                      <span class="badge ${c.conflictType === 'EXACT' ? 'badge-danger' : 'badge-warning'}" style="font-size:0.7rem;">
                        ${escapeHtml(c.conflictType)}
                      </span>
                    </td>
                    <td class="text-center">
                      <select class="form-control conflict-action-sel" data-conflict-idx="${ci}" data-row-idx="${c.index}" style="font-size:0.8rem;padding:4px 6px;">
                        <option value="merge">Merge</option>
                        <option value="overwrite">Overwrite</option>
                        <option value="skip" selected>Skip</option>
                      </select>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        // Bulk actions
        const setBulkAction = (action) => {
          document.querySelectorAll('.conflict-action-sel').forEach(sel => {
            sel.value = action;
            const rowIdx = parseInt(sel.dataset.rowIdx);
            _resolutionMap[rowIdx] = action;
            // Attach existing record metadata for merge/overwrite
            const conflict = duplicateConflicts[parseInt(sel.dataset.conflictIdx)];
            _parsedRows[rowIdx]._existingId = conflict.existingRecord.id;
            _parsedRows[rowIdx]._existingEnglish = conflict.existingRecord.english;
          });
        };
        document.getElementById('bulk-merge-all')?.addEventListener('click', () => setBulkAction('merge'));
        document.getElementById('bulk-overwrite-all')?.addEventListener('click', () => setBulkAction('overwrite'));
        document.getElementById('bulk-skip-all')?.addEventListener('click', () => setBulkAction('skip'));

        // Per-row action changes
        document.querySelectorAll('.conflict-action-sel').forEach(sel => {
          sel.addEventListener('change', () => {
            const rowIdx = parseInt(sel.dataset.rowIdx);
            const ci = parseInt(sel.dataset.conflictIdx);
            _resolutionMap[rowIdx] = sel.value;
            _parsedRows[rowIdx]._existingId = duplicateConflicts[ci].existingRecord.id;
            _parsedRows[rowIdx]._existingEnglish = duplicateConflicts[ci].existingRecord.english;
          });
          // Default skip
          const rowIdx = parseInt(sel.dataset.rowIdx);
          _resolutionMap[rowIdx] = 'skip';
        });
      }

      // Show action row
      const actionRow = document.getElementById('import-action-row');
      if (actionRow) actionRow.style.display = 'flex';
    } catch (err) {
      hideLoading();
      showToast('Excel parse error: ' + err.message, 'error');
    }
  });

  document.getElementById('confirm-import-btn')?.addEventListener('click', async () => {
    showLoading('Importing words...');
    try {
      const result = await importVaultWords(_parsedRows, _resolutionMap);
      hideLoading();
      close();
      showToast(`&#10003; Import complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped.`, 'success');
      const newWords = await fetchVaultWords({ limit: 10000, targetLevel: null });
      onSuccess(newWords);

      // Auto-sync class tests for all imported levels in the background (Zero-Maintenance)
      const importedLevels = Array.from(new Set((_parsedRows || []).map(r => r.target_level).filter(Boolean)));
      if (importedLevels.length > 0) {
        Promise.all(importedLevels.map(lvl => autoSyncClassTestsForLevel(lvl, { force: true }))).then(syncResults => {
          const totalNew = syncResults.reduce((acc, r) => acc + (r.tasks || 0) + (r.tests || 0), 0);
          if (totalNew > 0) {
            showToast(`&#9889; Kurikulum otomatis disinkronkan: ${totalNew} test baru siap digunakan!`, 'info');
          }
        }).catch(err => {
          console.warn('[vocab-vault] Auto-sync after import failed:', err);
        });
      }
    } catch (e) {
      hideLoading();
      showToast('Import failed: ' + e.message, 'error');
    }
  });
}

// ─── Test Builder Modal (5 Steps) ────────────────────

export async function openTestBuilderModal(initialVaultTopics, overrides = {}) {
  let vaultTopics = initialVaultTopics;
  if (!vaultTopics) {
    vaultTopics = await fetchVaultTopics();
  }
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'vocab-builder-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  modal.innerHTML = `
    <div class="modal-box" style="max-width:720px;max-height:90vh;overflow-y:auto;">
      <div class="d-flex justify-between align-center mb-4">
        <h3 class="fw-700" style="margin:0;">&#10133; ${overrides.editTest ? 'Edit' : 'Create'} Vocabulary Test</h3>
        <button class="btn btn-ghost btn-sm" id="close-builder-modal">&#10005;</button>
      </div>

      <!-- Step Indicators -->
      <div class="d-flex gap-2 mb-5 flex-wrap" id="step-indicators">
        ${['Scope & Tier', 'Source', 'Order & Quota', 'Schedule'].map((s, i) => `
          <div class="d-flex align-center gap-1 step-ind" data-step="${i + 1}" style="font-size:0.78rem;color:${i === 0 ? 'var(--clr-primary)' : 'var(--clr-text-3)'};">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
              background:${i === 0 ? 'var(--clr-primary)' : 'rgba(255,255,255,0.1)'};color:${i === 0 ? '#fff' : 'var(--clr-text-3)'};font-size:0.72rem;font-weight:700;">${i + 1}</span>
            ${s}${i < 3 ? '<span style="color:var(--clr-border);margin-left:6px;">→</span>' : ''}
          </div>
        `).join('')}
      </div>

      <div id="builder-step-content"></div>

      <div class="d-flex gap-3 justify-between mt-5">
        <button class="btn btn-secondary btn-sm" id="builder-back-btn" style="display:none;">← Back</button>
        <button class="btn btn-primary btn-sm" id="builder-next-btn">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-builder-modal')?.addEventListener('click', () => modal.remove());

  // State
  const editAsm = overrides.editTest || null;
  const state = {
    isEdit: !!editAsm,
    testId: editAsm?.id || null,
    step: overrides.skipStep1 ? 2 : 1,
    institutionId: editAsm?.institution_id || overrides.institutionId || '', institutionName: overrides.institutionName || '',
    programId: editAsm?.program_id || overrides.programId || '', programName: overrides.programName || '',
    classId: editAsm?.class_id || overrides.classId || '', className: overrides.className || '',
    levelId: editAsm?.level_id || overrides.levelId || '', levelName: overrides.levelName || '',
    testType: editAsm?.test_type || overrides.testType || 'VOCAB_MASTERY',
    tier: editAsm ? (editAsm.test_type?.includes('EXAM') ? 'EXAM' : 'TASK') : (overrides.tier || 'TASK'),
    title: editAsm?.title || '',
    sourceTopic: null,
    sourceTaskIds: [],
    sourceQuizIds: [],
    questionOrder: 'random',
    quotaMode: 'full',
    customQuota: null,
    scheduleMode: editAsm ? (editAsm.availability_start ? 'batch' : 'anytime') : 'batch',
    windowStart: editAsm?.availability_start || null,
    windowEnd: editAsm?.availability_end || null,
    durationMinutes: editAsm?.working_duration_minutes || 60
  };

  function updateStepIndicators(currentStep) {
    document.querySelectorAll('.step-ind').forEach((el, i) => {
      const stepNum = i + 1;
      const circle = el.querySelector('span');
      const isActive = stepNum === currentStep;
      const isDone = stepNum < currentStep;
      circle.style.background = isActive ? 'var(--clr-primary)' : isDone ? 'rgba(0,192,0,0.6)' : 'rgba(255,255,255,0.1)';
      circle.style.color = (isActive || isDone) ? '#fff' : 'var(--clr-text-3)';
      el.style.color = isActive ? 'var(--clr-primary)' : isDone ? '#00c000ff' : 'var(--clr-text-3)';
    });
    document.getElementById('builder-back-btn').style.display = currentStep > 1 ? '' : 'none';
    document.getElementById('builder-next-btn').innerHTML = currentStep === 4 ? (state.isEdit ? '&#10003; Save Changes' : '&#10003; Create Test') : 'Next →';
  }

  function updateAutoTitle() {
    const parts = [state.institutionName, state.programName, state.levelName, state.className].filter(Boolean);
    let suffix = state.tier === 'EXAM' ? 'Exam' : 'Task';
    if ((state.tier === 'QUIZ' || state.tier === 'TASK') && state.sourceTopic) suffix += ` - ${state.sourceTopic}`;
    if (parts.length > 0) {
      state.title = `${parts.join(' - ')} - ${suffix}`;
      const titleInput = document.getElementById('b-title');
      if (titleInput && !titleInput.dataset.manualEdit) {
        titleInput.value = state.title;
      }
    }
  }

  async function renderStep(step) {
    const content = document.getElementById('builder-step-content');
    updateStepIndicators(step);

    if (step === 1) {
      // Scope: Institution → Program → Class → Level + Tier
      showLoading();
      const institutions = await fetchInstitutions();
      hideLoading();
      content.innerHTML = `
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 1 — Select Scope & Tier</h4>
        <div class="d-flex gap-4 flex-wrap">
          <div style="flex: 1; min-width: 250px;">
            <div class="form-group">
              <label class="form-label">Institution</label>
              <select class="form-control" id="b-institution">
                <option value="">— Select Institution —</option>
                ${institutions.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Program</label>
              <select class="form-control" id="b-program" disabled><option value="">— Select Institution first —</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Target Level</label>
              <select class="form-control" id="b-level" disabled><option value="">— Select Program first —</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Class</label>
              <select class="form-control" id="b-class" disabled><option value="">— Select Level first —</option></select>
            </div>
            ${state.isEdit ? '<div class="text-sm mt-3" style="color:var(--clr-warning);"><strong>Note:</strong> Scope and Tier are locked in Edit Mode to preserve history.</div>' : ''}
          </div>
          <div style="flex: 1; min-width: 250px;">
            <label class="form-label">Test Tier</label>
            <div class="d-flex flex-column gap-3 mb-3">
              ${[
          { val: 'TASK', icon: '&#9889;', label: 'Task', desc: 'Single topic drill' },
          { val: 'EXAM', icon: '&#127942;', label: 'Exam', desc: 'Milestone aggregated exam' }
        ].map(t => `
                <label class="d-flex align-center gap-3 p-2 rounded" style="cursor:pointer;border:2px solid ${(state.tier === t.val || (state.tier === 'QUIZ' && t.val === 'TASK')) ? 'var(--clr-primary)' : 'var(--clr-border)'};background:${(state.tier === t.val || (state.tier === 'QUIZ' && t.val === 'TASK')) ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'};">
                  <input type="radio" name="vocab-tier" value="${t.val}" ${(state.tier === t.val || (state.tier === 'QUIZ' && t.val === 'TASK')) ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
                  <div>
                    <div class="fw-700">${t.icon} ${t.label}</div>
                    <div class="text-muted text-xs mt-1">${t.desc}</div>
                  </div>
                </label>
              `).join('')}
            </div>
            <div class="form-group">
              <label class="form-label">Test Title</label>
              <input type="text" class="form-control" id="b-title" placeholder="Auto-generated title..." />
            </div>
          </div>
        </div>
      `;

      const bInstitution = document.getElementById('b-institution');
      const bProgram = document.getElementById('b-program');
      const bLevel = document.getElementById('b-level');
      const bClass = document.getElementById('b-class');
      const bTitle = document.getElementById('b-title');

      async function initContext() {
        if (!state.institutionId) return;

        if (state.isEdit || state.classId) {
          const sb = await getSupabase();
          const [{ data: iData }, { data: pData }, { data: lData }, { data: cData }] = await Promise.all([
            state.institutionId ? sb.from('institutions').select('name').eq('id', state.institutionId).single() : { data: null },
            state.programId ? sb.from('programs').select('name').eq('id', state.programId).single() : { data: null },
            state.levelId ? sb.from('levels').select('name,level_number').eq('id', state.levelId).single() : { data: null },
            state.classId ? sb.from('classes').select('name').eq('id', state.classId).single() : { data: null }
          ]);

          state.institutionName = iData?.name || state.institutionName;
          state.programName = pData?.name || state.programName;
          if (lData) {
            let suffix = 'th Level';
            if (lData.level_number === 1) suffix = 'st Level';
            else if (lData.level_number === 2) suffix = 'nd Level';
            else if (lData.level_number === 3) suffix = 'rd Level';
            state.levelName = lData.name || `${lData.level_number}${suffix}`;
          }
          state.className = cData?.name || state.className;

          bInstitution.innerHTML = `<option value="${state.institutionId}">${escapeHtml(state.institutionName)}</option>`;
          bProgram.innerHTML = `<option value="${state.programId}">${escapeHtml(state.programName)}</option>`;
          bLevel.innerHTML = `<option value="${state.levelId}">${escapeHtml(state.levelName)}</option>`;
          bClass.innerHTML = `<option value="${state.classId}">${escapeHtml(state.className)}</option>`;

          bInstitution.disabled = true;
          bProgram.disabled = true;
          bLevel.disabled = true;
          bClass.disabled = true;

          updateAutoTitle();
        } else {
          bInstitution.value = state.institutionId;
          bInstitution.dispatchEvent(new Event('change'));
        }
      }
      initContext();

      bTitle.addEventListener('input', () => {
        state.title = bTitle.value;
        bTitle.dataset.manualEdit = 'true';
      });

      document.querySelectorAll('input[name="vocab-tier"]').forEach(r => {
        r.addEventListener('change', () => {
          state.tier = r.value;
          document.querySelectorAll('label[style*="border: 2px solid"]').forEach(l => {
            l.style.borderColor = 'var(--clr-border)';
            l.style.background = 'rgba(255,255,255,0.02)';
          });
          const parent = r.closest('label');
          parent.style.borderColor = 'var(--clr-primary)';
          parent.style.background = 'rgba(99,102,241,0.08)';
          updateAutoTitle();
        });
      });

      bInstitution.addEventListener('change', async () => {
        state.institutionId = bInstitution.value;
        state.institutionName = bInstitution.options[bInstitution.selectedIndex]?.text || '';
        bProgram.innerHTML = '<option value="">Loading...</option>';
        bProgram.disabled = true;
        bLevel.innerHTML = '<option value="">— Select Program first —</option>';
        bLevel.disabled = true;
        bClass.innerHTML = '<option value="">— Select Level first —</option>';
        bClass.disabled = true;
        updateAutoTitle();
        if (!state.institutionId) return;
        const sb = await getSupabase();
        const { data } = await sb.from('programs').select('id,name').eq('institution_id', state.institutionId).eq('is_active', true).is('deleted_at', null).order('name');
        bProgram.innerHTML = '<option value="">— Select Program —</option>' + (data || []).map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
        bProgram.disabled = false;
        if (state.programId) bProgram.value = state.programId;
      });

      bProgram.addEventListener('change', async () => {
        state.programId = bProgram.value;
        state.programName = bProgram.options[bProgram.selectedIndex]?.text || '';
        bLevel.innerHTML = '<option value="">Loading...</option>';
        bLevel.disabled = true;
        bClass.innerHTML = '<option value="">— Select Level first —</option>';
        bClass.disabled = true;
        updateAutoTitle();
        if (!state.programId) return;
        const sb = await getSupabase();
        const { data } = await sb.from('levels')
          .select('id,name,level_number')
          .order('level_number', { ascending: true });

        let levelData = data || [];
        levelData = levelData.map(l => {
          if (l.level_number === 0) return { ...l, name: 'Level 0 (Pre-Level)' };
          let suffix = 'th Level';
          if (l.level_number === 1) suffix = 'st Level';
          else if (l.level_number === 2) suffix = 'nd Level';
          else if (l.level_number === 3) suffix = 'rd Level';
          return { ...l, name: l.name || `${l.level_number}${suffix}` };
        });

        bLevel.innerHTML = '<option value="">- Select Level -</option>' + levelData.map(l => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`).join('');
        bLevel.disabled = false;
        if (state.levelId) bLevel.value = state.levelId;
      });

      bLevel.addEventListener('change', async () => {
        state.levelId = bLevel.value;
        state.levelName = bLevel.options[bLevel.selectedIndex]?.text || '';
        bClass.innerHTML = '<option value="">Loading...</option>';
        bClass.disabled = true;
        updateAutoTitle();
        if (!state.levelId) return;
        const sb = await getSupabase();
        const { data } = await sb.from('classes').select('id,name').eq('is_active', true).is('deleted_at', null).order('name');
        bClass.innerHTML = '<option value="">— Select Class —</option>' + (data || []).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
        bClass.disabled = false;
        if (state.classId) bClass.value = state.classId;
      });

      bClass.addEventListener('change', () => {
        state.classId = bClass.value;
        state.className = bClass.options[bClass.selectedIndex]?.text || '';
        updateAutoTitle();
      });

      // Re-trigger if we have saved state
      if (state.institutionId) bInstitution.dispatchEvent(new Event('change'));
    }

    else if (step === 2) {
      // Source selection (depends on tier)
      content.innerHTML = `<h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 2 — Select Source</h4><div id="source-area"><div class="spinner"></div></div>`;
      const sourceArea = document.getElementById('source-area');

      if (state.tier === 'QUIZ' || state.tier === 'TASK') {
        sourceArea.innerHTML = `
          <p class="text-muted text-sm mb-3">Select the Vault topic for this Task:</p>
          <div class="d-flex flex-column gap-2" style="max-height:280px;overflow-y:auto;" id="topic-radio-list">
            ${vaultTopics.map(t => `
              <label class="d-flex align-center gap-2 p-2 rounded" style="cursor:pointer;border:1px solid ${state.sourceTopic === t ? 'var(--clr-primary)' : 'var(--clr-border)'};">
                <input type="radio" name="vault-topic" value="${escapeHtml(t)}" ${state.sourceTopic === t ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
                <span class="fw-600 text-sm">${escapeHtml(t)}</span>
              </label>
            `).join('')}
          </div>
        `;
        document.querySelectorAll('input[name="vault-topic"]').forEach(r => {
          r.addEventListener('change', () => { state.sourceTopic = r.value; updateAutoTitle(); });
        });
      } else if (state.tier === 'EXAM') {
        // Load existing TASK tests
        const sb = await getSupabase();
        const { data: tasks } = await sb.from('tests')
          .select('id,title,description')
          .in('test_subtype', ['VOCAB_TASK', 'PHRASE_TASK', 'VOCAB_QUIZ', 'PHRASE_QUIZ'])
          .eq('class_id', state.classId)
          .eq('status', 'PUBLISHED')
          .is('deleted_at', null)
          .order('created_at');
        if (!tasks || !tasks.length) {
          sourceArea.innerHTML = `<p class="text-warning">No Task tests found in this class. Create Tasks first.</p>`;
        } else {
          sourceArea.innerHTML = `
            <p class="text-muted text-sm mb-3">Select Tasks to aggregate for this Exam:</p>
            <div class="d-flex flex-column gap-2" style="max-height:280px;overflow-y:auto;">
              ${tasks.map(t => {
            const topicDesc = t.description?.split('Topics: ')?.[1] || t.description?.split('Topic: ')?.[1] || '—';
            return `
                <label class="d-flex align-center gap-2 p-2 rounded" style="cursor:pointer;border:1px solid var(--clr-border);">
                  <input type="checkbox" class="source-task-cb" value="${escapeHtml(t.id)}" ${(state.sourceTaskIds.includes(t.id) || state.sourceQuizIds.includes(t.id)) ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
                  <span class="fw-600 text-sm">${escapeHtml(t.title)}</span>
                  <span class="text-xs text-muted ml-2">Topic: ${escapeHtml(topicDesc)}</span>
                </label>
                `;
          }).join('')}
            </div>
          `;
          document.querySelectorAll('.source-task-cb').forEach(cb => {
            cb.addEventListener('change', () => {
              state.sourceTaskIds = [...document.querySelectorAll('.source-task-cb:checked')].map(c => c.value);
              state.sourceQuizIds = state.sourceTaskIds;
            });
          });
        }
      }
    }

    else if (step === 3) {
      // Question Order & Quota
      content.innerHTML = `
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 3 — Question Order &amp; Quota</h4>

        <div class="form-group">
          <label class="form-label">Question Order</label>
          <div class="d-flex gap-3 flex-wrap">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-order" value="random" ${state.questionOrder === 'random' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#128256; Random (Default)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-order" value="sequential" ${state.questionOrder === 'sequential' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#10132; Sequential (Vault Order)</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Quota</label>
          <div class="d-flex flex-column gap-2">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-quota" value="full" ${state.quotaMode === 'full' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#9989; All Questions (100% Full — Default)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-quota" value="custom" ${state.quotaMode === 'custom' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#9881; Custom Sample (Stratified)</span>
            </label>
          </div>
          <div id="custom-quota-area" style="display:${state.quotaMode === 'custom' ? 'block' : 'none'};margin-top:0.75rem;">
            <input type="number" class="form-control" id="custom-quota-input" min="1" placeholder="Number of questions to sample" value="${state.customQuota || ''}" style="max-width:240px;" />
            <p class="text-muted text-xs mt-1">Words will be sampled proportionally across all source topics (stratified sampling).</p>
          </div>
        </div>
      `;
      document.querySelectorAll('input[name="q-order"]').forEach(r => {
        r.addEventListener('change', () => { state.questionOrder = r.value; });
      });
      document.querySelectorAll('input[name="q-quota"]').forEach(r => {
        r.addEventListener('change', () => {
          state.quotaMode = r.value;
          document.getElementById('custom-quota-area').style.display = r.value === 'custom' ? 'block' : 'none';
        });
      });
      document.getElementById('custom-quota-input')?.addEventListener('input', (e) => {
        state.customQuota = parseInt(e.target.value) || null;
      });
    }

    else if (step === 4) {
      // Schedule (WITA)
      const toLocalWita = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        // Format to local datetime-local value in WITA (+08:00)
        const wita = new Date(d.getTime() + 8 * 3600000);
        return wita.toISOString().slice(0, 16);
      };
      content.innerHTML = `
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 4 — Schedule <span style="color:#38bdf8;font-size:0.78rem;">(WITA / GMT+8)</span></h4>

        <div class="form-group">
          <label class="form-label">Schedule Mode</label>
          <div class="d-flex gap-3 flex-wrap">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="sched-mode" value="batch" ${state.scheduleMode === 'batch' || state.scheduleMode === 'flexible' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#128336; Batch Duration (Flexible Self-Paced)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="sched-mode" value="manual" ${state.scheduleMode === 'manual' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#128197; Tutor Live Control (Manual Toggle / In-Class)</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Due Date <span class="text-muted text-xs">(WITA GMT+8, Optional)</span></label>
          <input type="datetime-local" class="form-control" id="b-window-end" value="${escapeHtml(toLocalWita(state.windowEnd))}" style="max-width:280px;" />
        </div>
        <div class="form-group">
          <label class="form-label">Duration (minutes)</label>
          <input type="number" class="form-control" id="b-duration" value="${state.durationMinutes}" min="5" max="480" style="max-width:160px;" />
        </div>

        <div class="p-3 rounded mt-3" style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);">
          <p class="text-xs text-muted mb-1">&#128204; All times are in <strong>WITA (GMT+8, Asia/Makassar)</strong>. The system will convert to UTC for storage.</p>
        </div>

        <!-- Summary -->
        <div class="mt-4 p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);">
          <p class="text-xs fw-700 mb-2" style="color:var(--clr-text-2);">TEST SUMMARY</p>
          <div class="text-sm" style="line-height:1.8;">
            <div><strong>Title:</strong> ${escapeHtml(state.title || '(not set)')}</div>
            <div><strong>Tier:</strong> ${escapeHtml(state.tier)}</div>
            <div><strong>Quota:</strong> ${state.quotaMode === 'custom' ? `${state.customQuota || '?'} questions (stratified)` : 'All (100%)'}</div>
            <div><strong>Order:</strong> ${state.questionOrder}</div>
          </div>
        </div>
      `;
      document.querySelectorAll('input[name="sched-mode"]').forEach(r => {
        r.addEventListener('change', () => { state.scheduleMode = r.value; });
      });
      document.getElementById('b-window-end')?.addEventListener('change', (e) => {
        state.windowEnd = parseWita(e.target.value);
      });
      document.getElementById('b-duration')?.addEventListener('input', (e) => {
        state.durationMinutes = parseInt(e.target.value) || 60;
      });
    }
  }

  // Navigation
  document.getElementById('builder-next-btn')?.addEventListener('click', async () => {
    // Collect current step values before advancing
    if (state.step === 1) {
      state.institutionId = document.getElementById('b-institution')?.value || state.institutionId;
      state.programId = document.getElementById('b-program')?.value || state.programId;
      state.classId = document.getElementById('b-class')?.value || state.classId;
      state.levelId = document.getElementById('b-level')?.value || state.levelId;
      state.title = document.getElementById('b-title')?.value || state.title;
      if (!state.institutionId || !state.programId || !state.classId || !state.levelId) {
        showToast('Please complete all scope fields.', 'warning'); return;
      }
    } else if (state.step === 2) {
      if ((state.tier === 'QUIZ' || state.tier === 'TASK') && !state.sourceTopic) {
        showToast('Please select a Vault topic.', 'warning'); return;
      }
      if (state.tier === 'EXAM' && !state.sourceQuizIds.length && !state.sourceTaskIds.length) {
        showToast('Please select at least one Task.', 'warning'); return;
      }
    } else if (state.step === 4) {
      // Final submission
      if (!state.title) { showToast('Test title is required.', 'warning'); return; }
      state.windowStart = null;
      state.windowEnd = document.getElementById('b-window-end')?.value
        ? parseWita(document.getElementById('b-window-end').value) : null;
      state.durationMinutes = parseInt(document.getElementById('b-duration')?.value) || 60;

      showLoading(state.isEdit ? 'Saving changes...' : 'Creating test...');
      try {
        if (state.isEdit) {
          await updateTestDefinition(state.testId, {
            title: state.title,
            working_duration_minutes: state.durationMinutes,
            availability_start: state.windowStart,
            availability_end: state.windowEnd,
          });
          hideLoading();
          modal.remove();
          showToast(`&#10003; Test saved successfully.`, 'success');
        } else {
          const result = await createVocabMasteryTest({
            institutionId: state.institutionId,
            programId: state.programId,
            classId: state.classId,
            levelId: state.levelId,
            tier: state.tier,
            title: state.title,
            questionOrder: state.questionOrder,
            scheduleMode: state.scheduleMode,
            windowStart: state.windowStart,
            windowEnd: state.windowEnd,
            durationMinutes: state.durationMinutes,
            quotaMode: state.quotaMode,
            customQuota: state.customQuota,
            sourceTopic: state.sourceTopic,
            sourceTaskIds: state.sourceTaskIds,
            sourceQuizIds: state.sourceQuizIds,
            testType: state.testType,
            answerType: state.testType === 'IDIOM_PROVERB' ? 'dropdown_10' : 'written'
          });
          hideLoading();
          modal.remove();
          showToast(`&#10003; ${state.tier} created: "${result.title}" — ${result.sampledWords} questions.`, 'success');
        }
      } catch (e) {
        hideLoading();
        showToast('Failed to save test: ' + e.message, 'error');
      }
      return;
    }

    if (state.step < 4) {
      state.step++;
      await renderStep(state.step);
    }
  });

  document.getElementById('builder-back-btn')?.addEventListener('click', async () => {
    if (state.step > 1) {
      state.step--;
      await renderStep(state.step);
    }
  });

  await renderStep(1);
}


// ─── Phase 370: Theme Manager Tab (Program Distribution & Theme Hierarchy) ────
function _renderThemeManagerTab(area, words, topics, meta = {}) {
  const phraseTypes = ['expression', 'idiom', 'proverb', 'phrase', 'phrasal verb'];

  // 1. Group words by Level -> Theme Code -> Topic
  const levelsSet = new Set([1, 2, 3]);
  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10);
    if (!isNaN(lvl)) levelsSet.add(lvl);
  });
  const levels = Array.from(levelsSet).sort((a, b) => a - b);

  // Map: level -> Map(themeCode -> themeObj)
  const levelGroups = new Map();
  levels.forEach(lvl => levelGroups.set(lvl, new Map()));

  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10) || 3;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, new Map());
    const themesMap = levelGroups.get(lvl);

    const thCode = (w.theme_code || 'ZZZ').trim().toUpperCase();
    const thName = (w.theme || 'Unassigned').trim();
    if (!themesMap.has(thCode)) {
      themesMap.set(thCode, { code: thCode, name: thName, topicsMap: new Map() });
    }
    const thObj = themesMap.get(thCode);
    if (w.theme && (!thObj.name || thObj.name === 'Unassigned')) {
      thObj.name = w.theme.trim();
    }

    const tpName = (w.topic || '').trim();
    if (!tpName) return;
    const tpCode = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : `${thCode}1`;
    const tpKey = tpCode + '::' + tpName;

    if (!thObj.topicsMap.has(tpKey)) {
      thObj.topicsMap.set(tpKey, {
        topicCode: tpCode,
        name: tpName,
        themeCode: thCode,
        themeName: thObj.name,
        level: lvl,
        verbCount: 0,
        nounCount: 0,
        adjCount: 0,
        wordsOtherCount: 0,
        wordsCount: 0,
        expCount: 0,
        prvCount: 0,
        idmCount: 0,
        phrasesOtherCount: 0,
        phrasesCount: 0,
        totalCount: 0
      });
    }
    const tpObj = thObj.topicsMap.get(tpKey);
    const wt = String(w.word_type || '').toLowerCase().trim();
    if (wt === 'verb') {
      tpObj.verbCount++;
    } else if (wt === 'noun') {
      tpObj.nounCount++;
    } else if (wt === 'adjective' || wt === 'adj') {
      tpObj.adjCount++;
    } else if (['expression', 'idiom', 'proverb', 'phrase', 'phrasal verb'].includes(wt)) {
      if (wt === 'expression') tpObj.expCount++;
      else if (wt === 'proverb') tpObj.prvCount++;
      else if (wt === 'idiom') tpObj.idmCount++;
      else tpObj.phrasesOtherCount++;
    } else {
      tpObj.wordsOtherCount++;
    }
    tpObj.wordsCount = tpObj.verbCount + tpObj.nounCount + tpObj.adjCount + tpObj.wordsOtherCount;
    tpObj.phrasesCount = tpObj.expCount + tpObj.prvCount + tpObj.idmCount + tpObj.phrasesOtherCount;
    tpObj.totalCount = tpObj.wordsCount + tpObj.phrasesCount;
  });

  // Count totals
  const levelStats = {};
  let totalTopicsAll = 0;
  let totalThemesAll = 0;
  let totalWordsAll = 0;
  let totalPhrasesAll = 0;

  levels.forEach(lvl => {
    const thMap = levelGroups.get(lvl);
    let count = 0;
    let wCount = 0;
    let pCount = 0;
    totalThemesAll += thMap.size;
    thMap.forEach(th => {
      count += th.topicsMap.size;
      th.topicsMap.forEach(tp => {
        wCount += tp.totalWords;
        pCount += tp.totalPhrases;
      });
    });
    levelStats[lvl] = { themes: thMap.size, topics: count, words: wCount, phrases: pCount };
    totalTopicsAll += count;
    totalWordsAll += wCount;
    totalPhrasesAll += pCount;
  });

  // Active level selection
  let activeLevel = window._themeManagerSelectedLevel || 'ALL';
  if (activeLevel !== 'ALL' && !levels.includes(Number(activeLevel))) {
    activeLevel = 'ALL';
  }
  window._themeManagerSelectedLevel = activeLevel;

  // Multi-Tenant Hierarchy Setup (Group Programs by Institution)
  const activeInsts = (meta?.institutions || []).filter(i => !i.deleted_at && i.is_active !== false);
  const activeProgs = (meta?.programs || []).filter(p => !p.deleted_at && p.is_active !== false);
  const assignments = meta?.themeAssignments || [];

  const instProgGroups = [];
  activeInsts.sort((a, b) => (a.code || a.name).localeCompare(b.code || b.name));
  activeInsts.forEach(inst => {
    const progs = activeProgs.filter(p => p.institution_id === inst.id);
    if (progs.length > 0) {
      instProgGroups.push({
        inst,
        programs: progs.sort((a, b) => a.name.localeCompare(b.name))
      });
    }
  });

  if (instProgGroups.length === 0) {
    instProgGroups.push({
      inst: { id: 'cec', name: 'CEC', code: 'CEC' },
      programs: [{ id: '11deb53c-434a-44b0-83ca-1cc9b239cab3', name: 'Camp', code: 'CAMP' }]
    });
    instProgGroups.push({
      inst: { id: 'top', name: 'TOP', code: 'TOP' },
      programs: [
        { id: 'cfeda206-a7a9-4979-a90c-ce7fd436fcd0', name: 'Evnikom', code: 'EVNIKOM' },
        { id: 'd80f47ef-0683-4137-8430-f6cae33e98cc', name: 'Tamata', code: 'TAMATA' },
        { id: '20d64d86-6e8b-4677-a3c9-e497fa5d9177', name: 'Sheraton', code: 'SHERATON' }
      ]
    });
  }

  const allOrderedProgs = instProgGroups.flatMap(g => g.programs);

  // Assignment quick lookup set: key = `${themeCode}_${targetLevel}_${programId}`
  const assignSet = new Set(
    assignments
      .filter(a => a.is_active !== false)
      .map(a => `${String(a.theme_code).trim().toUpperCase()}_${parseInt(a.target_level, 10)}_${a.program_id}`)
  );

  // Setup Bottom Infobar for Theme Manager (Rule 2.23 / 2.33 Layout Law)
  const syncThemeManagerBottomBar = () => {
    if (!window.setBottomInfobar) return;
    const activeTopicsCount = activeLevel === 'ALL' ? totalTopicsAll : (levelStats[activeLevel]?.topics || 0);
    const activeThemesCount = activeLevel === 'ALL' ? totalThemesAll : (levelStats[activeLevel]?.themes || 0);

    const leftHtml = `
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; overflow-x: auto;">
        <input type="search" id="vault-topic-search" placeholder="🔍 Search Theme or Topic..." value="${escapeHtml(window._vaultTopicSearchQuery || '')}" style="width: 200px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 10px; outline: none;">

        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn-theme-curriculum-tab" data-lvl="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; ${activeLevel === 'ALL' ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">🎯 ALL (${totalTopicsAll})</button>
          ${levels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const count = levelStats[lvl]?.topics || 0;
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`;
            return `<button type="button" class="btn-theme-curriculum-tab" data-lvl="${lvl}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; ${isActive ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">${shortLbl} (${count})</button>`;
          }).join('')}
        </div>

        <div class="bottom-info-chip"><span class="chip-label">Themes:</span><span class="chip-val">${activeThemesCount}</span></div>
        <div class="bottom-info-chip"><span class="chip-label">Topics:</span><span class="chip-val">${activeTopicsCount}</span></div>
        <div class="bottom-info-chip"><span class="chip-label">Vault:</span><span class="chip-val">${words.length}</span></div>
      </div>
    `;
    const rightHtml = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="btn btn-secondary btn-sm edit-mode-only" id="btn-theme-bottom-merge" style="height: 32px; font-size: 11.5px; padding: 0 10px; font-weight: 600; background: rgba(30,41,59,0.85); border: 1px solid rgba(255,255,255,0.15); color: #38bdf8; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Merge Similar Topics">⚒️ Merge Topics</button>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
    bindBottomControls();
  };

  const bindBottomControls = () => {
    const searchInput = document.getElementById('vault-topic-search');
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = 'true';
      searchInput.addEventListener('input', (e) => {
        window._vaultTopicSearchQuery = e.target.value;
        const { rowsHtml } = buildTableBodyHtml(window._vaultTopicSearchQuery);
        const tbody = document.getElementById('theme-manager-tbody');
        if (tbody) tbody.innerHTML = rowsHtml;
        bindRowActionHandlers();
      });
    }

    document.querySelectorAll('.btn-theme-curriculum-tab').forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
          const targetLvl = e.currentTarget.getAttribute('data-lvl');
          window._themeManagerSelectedLevel = targetLvl;
          _renderThemeManagerTab(area, words, topics, meta);
        });
      }
    });

    const btnMergeBottom = document.getElementById('btn-theme-bottom-merge');
    if (btnMergeBottom && !btnMergeBottom.dataset.bound) {
      btnMergeBottom.dataset.bound = 'true';
      btnMergeBottom.onclick = () => {
        const allTopicList = [];
        levelGroups.forEach(thMap => {
          thMap.forEach(th => {
            th.topicsMap.forEach(tp => allTopicList.push(tp));
          });
        });
        openTopicDuplicateCheckerModal(allTopicList, words, () => {
          if (typeof renderVocabularyVault === 'function') {
            const container = document.getElementById('classes-detail-canvas');
            if (container) renderVocabularyVault(container);
          }
        });
      };
    }
  };

  // Modernized Flat Data Table Builder (Zero Rowspans, 19 Columns)
  const buildTableBodyHtml = (searchQuery = '') => {
    const q = (searchQuery || '').toLowerCase().trim();
    const levelsToRender = (activeLevel === 'ALL') ? levels : [Number(activeLevel)];
    let rowsHtml = '';
    let visibleTopicsCount = 0;

    levelsToRender.forEach(lvl => {
      const themesMap = levelGroups.get(lvl);
      const lvlLabel = (typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`).toUpperCase();

      const themeList = Array.from(themesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        const assignedProgs = allOrderedProgs.filter(p => assignSet.has(`${thCode}_${lvl}_${p.id}`));

        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || th.code.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));

        if (topics.length === 0) return;
        visibleTopicsCount += topics.length;

        // Assigned programs badge pills
        const assignedPillsHtml = assignedProgs.length > 0
          ? assignedProgs.map(p => `<span class="badge-prog-pill" style="display:inline-flex;align-items:center;gap:4px;color:#4ade80;font-size:11px;font-weight:700;margin-right:6px;">🟢 ${escapeHtml(p.name)}</span>`).join('')
          : `<span style="color:#64748b;font-size:11px;font-style:italic;">None Assigned</span>`;

        topics.forEach(tp => {
          const cleanTopicCode = (tp.topicCode || '1').trim().replace(/^[A-Za-z]+/, '') || (tp.topicCode || '1');
          const cleanThemeCode = (thCode || 'A').trim().toUpperCase();
          const compositeCode = `${lvl}${cleanThemeCode}${cleanTopicCode}`;

          rowsHtml += `
            <tr class="blueprint-table-row" data-level="${lvl}" data-theme-code="${thCode}" data-topic="${escapeHtml(tp.name)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <!-- 1. LVL -->
              <td class="editable-cell" style="text-align: center; font-weight: 800; font-size: 12px; color: #38bdf8; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(lvlLabel)}</span>
                <input type="number" min="1" max="6" class="vault-edit-input" data-action="edit-level" data-topic="${escapeHtml(tp.name)}" data-old-lvl="${lvl}" data-th-code="${thCode}" value="${lvl}" style="text-align:center;">
              </td>
              <!-- 2. THEME -->
              <td class="editable-cell" style="color: #ffffff; font-weight: 700; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(th.name || '—')}</span>
                <input type="text" class="vault-edit-input" data-action="edit-theme-name" data-old-theme="${escapeHtml(th.name)}" data-lvl="${lvl}" data-th-code="${thCode}" value="${escapeHtml(th.name || '')}">
              </td>
              <!-- 3. TH-CD -->
              <td class="editable-cell" style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(thCode)}</span>
                <input type="text" maxlength="4" class="vault-edit-input" data-action="edit-theme-code" data-old-th-code="${thCode}" data-lvl="${lvl}" value="${escapeHtml(thCode)}" style="text-align:center; text-transform:uppercase;">
              </td>
              <!-- 4. TOPIC -->
              <td class="editable-cell" style="color: #f1f5f9; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(tp.name)}</span>
                <input type="text" class="vault-edit-input" data-action="edit-topic-name" data-old-topic="${escapeHtml(tp.name)}" data-lvl="${lvl}" data-th-code="${thCode}" value="${escapeHtml(tp.name)}">
              </td>
              <!-- 5. TP-CD -->
              <td class="editable-cell" style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(cleanTopicCode)}</span>
                <input type="text" maxlength="6" class="vault-edit-input" data-action="edit-topic-code" data-topic="${escapeHtml(tp.name)}" data-old-tp-code="${escapeHtml(cleanTopicCode)}" data-lvl="${lvl}" data-th-code="${thCode}" value="${escapeHtml(cleanTopicCode)}" style="text-align:center;">
              </td>
              <!-- 6. VERB -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.verbCount}</td>
              <!-- 7. NOUN -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.nounCount}</td>
              <!-- 8. ADJ -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.adjCount}</td>
              <!-- 9. OTH (Words) -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.wordsOtherCount}</td>
              <!-- 10. WORDS -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 800; color: #60a5fa; background: rgba(59, 130, 246, 0.08); border-right: 1px solid rgba(255,255,255,0.08);">${tp.wordsCount}</td>
              <!-- 11. EXP -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.expCount}</td>
              <!-- 12. PRV -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.prvCount}</td>
              <!-- 13. IDM -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.idmCount}</td>
              <!-- 14. OTH (Phrases) -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">${tp.phrasesOtherCount}</td>
              <!-- 15. PHRASES -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 800; color: #c084fc; background: rgba(192, 132, 252, 0.08); border-right: 1px solid rgba(255,255,255,0.1);">${tp.phrasesCount}</td>
              <!-- 16. TOTAL -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.1); border-right: 1px solid rgba(255,255,255,0.08);">${tp.totalCount}</td>
              <!-- 17. ASG-PRG -->
              <td style="padding: 6px 10px; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                  <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                    ${assignedPillsHtml}
                  </div>
                  <button type="button" class="btn btn-xs btn-assign-pill edit-mode-only" data-theme-code="${thCode}" data-level="${lvl}" data-theme-name="${escapeHtml(th.name)}" style="background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;cursor:pointer;" title="Assign to Institutions &amp; Programs">
                    ⚙️ Assign
                  </button>
                </div>
              </td>
              <!-- 18. CODE -->
              <td class="col-theme-composite-code" style="text-align: center; font-family: monospace; font-weight: 800; color: #38bdf8; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                ${escapeHtml(compositeCode)}
              </td>
              <!-- 19. ACT (Delete only when Edit ON) -->
              <td class="edit-mode-only" style="padding: 4px 6px; text-align: center; width: 45px; border-left: 1px solid rgba(255, 255, 255, 0.1); white-space: nowrap;">
                <button type="button" class="btn-del-topic-mini" data-topic="${escapeHtml(tp.name)}" title="Delete Topic" style="background:transparent;border:none;cursor:pointer;color:#f87171;font-size:14px;padding:2px 4px;">🗑️</button>
              </td>
            </tr>
          `;
        });
      });
    });

    if (visibleTopicsCount === 0) {
      rowsHtml = `
        <tr>
          <td colspan="19" style="text-align: center; padding: 24px; color: #64748b; font-size: 12px;">
            No matching topics found for the selected filter.
          </td>
        </tr>
      `;
    }

    return { rowsHtml, visibleTopicsCount };
  };

  const initialRender = buildTableBodyHtml(window._vaultTopicSearchQuery || '');

  let html = `
    <div style="display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', system-ui, sans-serif;">

      <!-- Modernized Flat Data Table (Flush to top, only table container scrolls) -->
      <div class="table-wrap sticky-first" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 0; margin: 0;">
        <table id="theme-manager-flat-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 12px;">
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 20;">
            <!-- Super-Headers Grouping -->
            <tr>
              <th colspan="5" class="super-th" style="background:#0c192e; color:#38bdf8; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.08);">HIERARCHY &amp; IDENTITY</th>
              <th colspan="5" class="super-th" style="background:#131d36; color:#818cf8; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.08);">WORDS BREAKDOWN</th>
              <th colspan="5" class="super-th" style="background:#1a1936; color:#c084fc; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.08);">PHRASES BREAKDOWN</th>
              <th class="super-th" style="background:#0f2922; color:#4ade80; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.08);">SUMMARY</th>
              <th class="super-th" style="background:#1e293b; color:#fb923c; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.08);">MULTI-TENANT</th>
              <th class="super-th" style="background:#0f172a; color:#a5b4fc; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.08);">CODE</th>
              <th class="super-th edit-mode-only" style="background:#3b1116; color:#f87171; font-size:11px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.1);">ACTION</th>
            </tr>
            <!-- Sub-Headers (Exact 19 Columns) -->
            <tr>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 45px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);" title="Level">LVL</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; max-width: 120px; border-right: 1px solid rgba(255,255,255,0.1);" title="Theme Name">THEME</th>
              <th style="padding: 6px 4px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 48px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Theme Letter Code (e.g. A, B)">TH-CD</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; max-width: 130px; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Name">TOPIC</th>
              <th style="padding: 6px 4px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 48px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Number Code (e.g. 1, 2)">TP-CD</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Verb Count">VERB</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Noun Count">NOUN</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Adjective Count">ADJ</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Words Other (Adverbs, etc.)">OTH</th>
              <th style="padding: 6px 4px; font-weight: 800; color: #60a5fa; text-transform: uppercase; font-size: 12px; width: 52px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #1e3a5f;" title="Total Single Words">WORDS</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Expression Count">EXP</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Proverb Count">PRV</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Idiom Count">IDM</th>
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Phrases Other (Phrasal verbs, etc.)">OTH</th>
              <th style="padding: 6px 4px; font-weight: 800; color: #c084fc; text-transform: uppercase; font-size: 12px; width: 58px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); background: #2e1e5f;" title="Total Phrases &amp; Idioms">PHRASES</th>
              <th style="padding: 6px 4px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 52px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0f2922;" title="Grand Total">TOTAL</th>
              <th style="padding: 6px 6px; font-weight: 800; color: #4ade80; text-transform: uppercase; font-size: 12px; width: 105px; border-right: 1px solid rgba(255,255,255,0.08);" title="Assigned Programs">ASG-PRG</th>
              <th style="padding: 6px 4px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; font-size: 12px; width: 50px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Composite Code">CODE</th>
              <th class="edit-mode-only" style="padding: 6px 4px; font-weight: 800; color: #f87171; text-transform: uppercase; font-size: 12px; width: 45px; text-align: center;" title="Action">ACT</th>
            </tr>
          </thead>
          <tbody id="theme-manager-tbody">
            ${initialRender.rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
  area.innerHTML = html;
  syncThemeManagerBottomBar();

  // Bind Row Actions & Inline Cascade Edit Handlers
  const bindRowActionHandlers = () => {
    // Assign Theme to Programs
    area.querySelectorAll('.btn-assign-pill').forEach(btn => {
      btn.onclick = (e) => {
        const thCode = e.currentTarget.getAttribute('data-theme-code');
        const thName = e.currentTarget.getAttribute('data-theme-name');
        const lvl = parseInt(e.currentTarget.getAttribute('data-level'), 10);
        openThemeProgramAssignModal(thCode, thName, lvl, instProgGroups, assignSet, () => {
          _renderThemeManagerTab(area, words, topics, meta);
        });
      };
    });

    // Delete Topic (Delete button only)
    area.querySelectorAll('.btn-del-topic-mini').forEach(btn => {
      btn.onclick = async (e) => {
        const topic = e.currentTarget.getAttribute('data-topic');
        if (!confirm(`Delete topic "${topic}" and all its vocabulary items from Vault?`)) return;
        try {
          showLoading('Deleting topic...');
          await deleteVaultTopic(topic);
          hideLoading();
          showToast(`Topic "${topic}" deleted.`, 'success');
          if (typeof renderVocabularyVault === 'function') {
            const container = document.getElementById('classes-detail-canvas');
            if (container) renderVocabularyVault(container);
          }
        } catch (err) {
          hideLoading();
          showToast(`Failed to delete topic: ${err.message}`, 'error');
        }
      };
    });

    // Inline edit cascade handlers on table body change
    const tbody = document.getElementById('theme-manager-tbody');
    if (tbody) {
      tbody.onchange = async (e) => {
        const input = e.target;
        if (!input || !input.classList.contains('vault-edit-input')) return;
        const cell = input.closest('td');
        const viewSpan = cell?.querySelector('.vault-cell-view');
        const tr = input.closest('tr');
        const action = input.dataset.action;
        const newVal = input.value.trim();

        // 1. Guard against empty / blank inputs
        if (!newVal) {
          const fallback = input.dataset.oldTheme || input.dataset.oldThCode || input.dataset.oldTopic || input.dataset.oldTpCode || input.dataset.oldLvl || '';
          input.value = fallback;
          if (viewSpan) viewSpan.textContent = fallback;
          input.classList.add('save-error');
          setTimeout(() => input.classList.remove('save-error'), 800);
          showToast('Field cannot be empty — reverted.', 'warning');
          return;
        }

        try {
          if (action === 'edit-theme-name') {
            const oldTheme = input.dataset.oldTheme;
            const lvl = parseInt(input.dataset.lvl, 10);
            const thCode = input.dataset.thCode;
            if (newVal === oldTheme) return;

            // Cascade DB update targeting composite (theme_code, level)
            await updateVaultThemeCascade(oldTheme, newVal, lvl, thCode);

            // Synchronize all rows belonging to the same theme and level in the DOM
            const allThemeRows = tbody.querySelectorAll(`tr[data-theme-code="${thCode}"][data-level="${lvl}"]`);
            allThemeRows.forEach(row => {
              const thInput = row.querySelector('[data-action="edit-theme-name"]');
              const thSpan = thInput?.closest('td')?.querySelector('.vault-cell-view');
              if (thInput) {
                thInput.value = newVal;
                thInput.dataset.oldTheme = newVal;
                thInput.classList.add('save-success');
                setTimeout(() => thInput.classList.remove('save-success'), 700);
              }
              if (thSpan) thSpan.textContent = newVal;
            });

            // Update in-memory array
            words.forEach(w => {
              if (String(w.theme_code).toUpperCase() === thCode && parseInt(w.target_level, 10) === lvl) {
                w.theme = newVal;
              }
            });
            showToast(`Theme renamed to "${newVal}" across Level ${lvl}`, 'success');

          } else if (action === 'edit-theme-code') {
            const oldCode = String(input.dataset.oldThCode || '').trim().toUpperCase();
            const lvl = parseInt(input.dataset.lvl, 10);
            const cleanNewCode = newVal.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (!cleanNewCode || cleanNewCode === oldCode) {
              input.value = oldCode;
              return;
            }

            // Collision check: check if code is already used by another theme in this level
            const existingOtherThemeRow = tbody.querySelector(`tr[data-level="${lvl}"][data-theme-code="${cleanNewCode}"]`);
            if (existingOtherThemeRow) {
              const otherThemeName = existingOtherThemeRow.querySelector('[data-action="edit-theme-name"]')?.value || cleanNewCode;
              if (!confirm(`Theme Code "${cleanNewCode}" is already used by "${otherThemeName}" at Level ${lvl}.\nMerging will combine these topics under one theme. Continue?`)) {
                input.value = oldCode;
                return;
              }
            }

            await updateVaultThemeCodeCascade(oldCode, cleanNewCode, lvl);

            // Update all rows with old theme code in this level
            const allCodeRows = tbody.querySelectorAll(`tr[data-theme-code="${oldCode}"][data-level="${lvl}"]`);
            allCodeRows.forEach(row => {
              row.setAttribute('data-theme-code', cleanNewCode);
              const codeInput = row.querySelector('[data-action="edit-theme-code"]');
              const codeSpan = codeInput?.closest('td')?.querySelector('.vault-cell-view');
              if (codeInput) {
                codeInput.value = cleanNewCode;
                codeInput.dataset.oldThCode = cleanNewCode;
                codeInput.dataset.thCode = cleanNewCode;
                codeInput.classList.add('save-success');
                setTimeout(() => codeInput.classList.remove('save-success'), 700);
              }
              if (codeSpan) codeSpan.textContent = cleanNewCode;

              // Recalculate composite code column
              const tpCodeInput = row.querySelector('[data-action="edit-topic-code"]');
              const currentTpCode = tpCodeInput ? tpCodeInput.value.trim() : '1';
              const newComp = `${lvl}${cleanNewCode}${currentTpCode}`;
              const compTd = row.querySelector('.col-theme-composite-code');
              if (compTd) compTd.textContent = newComp;
            });

            // Update in-memory words
            words.forEach(w => {
              if (String(w.theme_code).toUpperCase() === oldCode && parseInt(w.target_level, 10) === lvl) {
                w.theme_code = cleanNewCode;
              }
            });
            showToast(`Theme Code updated to "${cleanNewCode}"`, 'success');

          } else if (action === 'edit-topic-name') {
            const oldTopic = input.dataset.oldTopic;
            const lvl = parseInt(input.dataset.lvl, 10);
            const thCode = input.dataset.thCode;
            if (newVal === oldTopic) return;

            await updateVaultTopicCascade(oldTopic, newVal, lvl, thCode);
            input.dataset.oldTopic = newVal;
            input.dataset.topic = newVal;
            if (viewSpan) viewSpan.textContent = newVal;
            if (tr) {
              tr.setAttribute('data-topic', newVal);
              const delBtn = tr.querySelector('.btn-del-topic-mini');
              if (delBtn) delBtn.setAttribute('data-topic', newVal);
            }

            input.classList.add('save-success');
            setTimeout(() => input.classList.remove('save-success'), 700);

            // Update in-memory array
            words.forEach(w => {
              if (w.topic === oldTopic && parseInt(w.target_level, 10) === lvl) {
                w.topic = newVal;
              }
            });
            showToast(`Topic renamed to "${newVal}"`, 'success');

          } else if (action === 'edit-topic-code') {
            const oldCode = input.dataset.oldTpCode;
            const topic = input.dataset.topic;
            const lvl = parseInt(input.dataset.lvl, 10);
            const thCode = input.dataset.thCode;
            const cleanTp = newVal.replace(/^[A-Za-z]+/, '').trim() || newVal.trim();
            if (cleanTp === oldCode) return;

            await updateVaultTopicCodeCascade(oldCode, cleanTp, lvl, topic, thCode);
            input.dataset.oldTpCode = cleanTp;
            input.value = cleanTp;
            if (viewSpan) viewSpan.textContent = cleanTp;

            // Recalculate column 18 CODE in this row
            const newComp = `${lvl}${thCode}${cleanTp}`;
            const compTd = tr?.querySelector('.col-theme-composite-code');
            if (compTd) compTd.textContent = newComp;

            input.classList.add('save-success');
            setTimeout(() => input.classList.remove('save-success'), 700);

            // Update in-memory array
            words.forEach(w => {
              if (w.topic === topic && parseInt(w.target_level, 10) === lvl) {
                w.topic_code = cleanTp;
              }
            });
            showToast(`Topic Code updated to "${cleanTp}"`, 'success');

          } else if (action === 'edit-level') {
            const oldLvl = parseInt(input.dataset.oldLvl, 10);
            const newLvl = parseInt(newVal, 10);
            if (isNaN(newLvl) || newLvl < 1 || newLvl > 6) {
              input.value = oldLvl;
              input.classList.add('save-error');
              setTimeout(() => input.classList.remove('save-error'), 800);
              showToast('Level must be between 1 and 6.', 'warning');
              return;
            }
            if (newLvl === oldLvl) return;

            const topic = input.dataset.topic;
            const thCode = input.dataset.thCode;
            await updateVaultTopicLevelCascade(topic, oldLvl, newLvl, thCode);
            input.dataset.oldLvl = newLvl;
            if (tr) tr.setAttribute('data-level', newLvl);
            if (viewSpan) {
              const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(newLvl) : `${newLvl}ST`;
              viewSpan.textContent = shortLbl.toUpperCase();
            }

            // Recalculate column 18 CODE in this row
            const currentTpCode = tr?.querySelector('[data-action="edit-topic-code"]')?.value.trim() || '1';
            const newComp = `${newLvl}${thCode}${currentTpCode}`;
            const compTd = tr?.querySelector('.col-theme-composite-code');
            if (compTd) compTd.textContent = newComp;

            input.classList.add('save-success');
            setTimeout(() => input.classList.remove('save-success'), 700);

            // Update in-memory array
            words.forEach(w => {
              if (w.topic === topic && parseInt(w.target_level, 10) === oldLvl) {
                w.target_level = newLvl;
              }
            });
            showToast(`Topic moved to Level ${newLvl}. Switch Level tab to view.`, 'success');
          }
        } catch (err) {
          input.classList.add('save-error');
          setTimeout(() => input.classList.remove('save-error'), 800);
          showToast(`Update failed: ${err.message}`, 'error');
        }
      };

      tbody.onkeydown = (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('vault-edit-input')) {
          e.target.blur();
        }
      };
    }
  };

  bindRowActionHandlers();
}

// ─── Theme Institution & Program Assignment Modal ────────────
function openThemeProgramAssignModal(themeCode, themeName, targetLevel, instProgGroups, assignSet, onSave) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop modal-z-1000';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-box" style="max-width: 560px; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 22px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
        <div>
          <h3 style="margin:0; font-size:15px; font-weight:800; color:#f8fafc;">🏛️ Assign Theme to Programs</h3>
          <div style="font-size:12px; color:#38bdf8; margin-top:2px;">Theme: <strong>${escapeHtml(themeName)}</strong> (${escapeHtml(themeCode)}) &bull; Level ${targetLevel}</div>
        </div>
        <button class="btn btn-ghost btn-sm close-modal-btn" style="color:#94a3b8; font-size:16px; cursor:pointer;">✕</button>
      </div>

      <p style="font-size:11.5px; color:#94a3b8; margin-bottom:14px;">
        Specify which Institution and Program uses this theme. All topics under this theme automatically inherit these assignments.
      </p>

      <div style="display:flex; flex-direction:column; gap:12px; max-height:360px; overflow-y:auto; padding-right:4px;">
        ${instProgGroups.map(g => `
          <div style="background:rgba(30,41,59,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px;">
            <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#a5b4fc; margin-bottom:8px; letter-spacing:0.5px;">
              ${escapeHtml(g.inst.name || g.inst.code)}
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:8px;">
              ${g.programs.map(p => {
                const assignKey = `${themeCode}_${targetLevel}_${p.id}`;
                const checked = assignSet.has(assignKey);
                return `
                  <label style="display:flex; align-items:center; gap:8px; background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.1); padding:8px 10px; border-radius:6px; cursor:pointer; font-size:11.5px; color:#f1f5f9; font-weight:600;">
                    <input type="checkbox" class="cb-theme-assign-prog" data-prog-id="${p.id}" data-prog-name="${escapeHtml(p.name)}" ${checked ? 'checked' : ''} style="accent-color:#22c55e; width:15px; height:15px; cursor:pointer;">
                    <span>${escapeHtml(p.name)}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
        <button class="btn btn-secondary btn-sm close-modal-btn">Cancel</button>
        <button class="btn btn-primary btn-sm" id="btn-save-theme-assignments" style="background:#22c55e; border:none; font-weight:800; padding:0 14px;">Save Assignments</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', close));

  modal.querySelector('#btn-save-theme-assignments')?.addEventListener('click', async () => {
    const checkboxes = modal.querySelectorAll('.cb-theme-assign-prog');
    showLoading('Saving assignments...');
    try {
      for (const cb of checkboxes) {
        const progId = cb.getAttribute('data-prog-id');
        const isChecked = cb.checked;
        const assignKey = `${themeCode}_${targetLevel}_${progId}`;
        const wasChecked = assignSet.has(assignKey);
        if (isChecked !== wasChecked) {
          await toggleThemeProgramAssignment({
            themeCode,
            targetLevel,
            programId: progId,
            assign: isChecked
          });
          if (isChecked) assignSet.add(assignKey);
          else assignSet.delete(assignKey);
        }
      }
      hideLoading();
      showToast(`Assignments updated for Theme "${themeName}"`, 'success');
      close();
      if (onSave) onSave();
    } catch (e) {
      hideLoading();
      showToast('Failed to save assignments: ' + e.message, 'error');
    }
  });
}

// ─── Phase 370: Test Blueprint & Vocabulary Test Generator Tab ────
async function _renderThemeBlueprintTab(area, words, topics, meta = {}) {
  showLoading();
  const sb = await getSupabase();
  const [{ data: testsData }, { data: classesData }] = await Promise.all([
    sb.from('tests').select('id, class_id, title, shell_code, test_type, payload, working_duration_minutes, minimum_required_score, status, display_order').is('deleted_at', null),
    (meta.classes && meta.classes.length > 0) ? Promise.resolve({ data: meta.classes }) : sb.from('classes').select('id, name, program_id, level_id, institution_id, is_active').is('deleted_at', null)
  ]);
  hideLoading();

  const tests = testsData || [];
  const classes = classesData || meta.classes || [];

  // Group words by Level -> Theme Code -> Topic
  const levelsSet = new Set([1, 2, 3]);
  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10);
    if (!isNaN(lvl)) levelsSet.add(lvl);
  });
  const levels = Array.from(levelsSet).sort((a, b) => a - b);

  const levelGroups = new Map();
  levels.forEach(lvl => levelGroups.set(lvl, new Map()));

  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10) || 3;
    if (!levelGroups.has(lvl)) levelGroups.set(lvl, new Map());
    const themesMap = levelGroups.get(lvl);

    const thCode = (w.theme_code || 'ZZZ').trim().toUpperCase();
    const thName = (w.theme || 'Unassigned').trim();
    if (!themesMap.has(thCode)) {
      themesMap.set(thCode, { code: thCode, name: thName, topicsMap: new Map() });
    }
    const thObj = themesMap.get(thCode);
    if (w.theme && (!thObj.name || thObj.name === 'Unassigned')) {
      thObj.name = w.theme.trim();
    }

    const tpName = (w.topic || '').trim();
    if (!tpName) return;
    const tpCode = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : `${thCode}1`;
    const tpKey = tpCode + '::' + tpName;

    if (!thObj.topicsMap.has(tpKey)) {
      thObj.topicsMap.set(tpKey, {
        topicCode: tpCode,
        name: tpName,
        themeCode: thCode,
        themeName: thObj.name,
        level: lvl,
        totalWords: 0,
        totalPhrases: 0,
        totalCount: 0
      });
    }
    const tpObj = thObj.topicsMap.get(tpKey);
    const wt = String(w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb', 'phrase', 'phrasal verb'].includes(wt);
    if (isPhrase) tpObj.totalPhrases++;
    else tpObj.totalWords++;
    tpObj.totalCount = tpObj.totalWords + tpObj.totalPhrases;
  });

  // Active Program Selection
  const activeProgs = (meta?.programs || []).filter(p => !p.deleted_at && p.is_active !== false);
  let selectedProgId = window._bpSelectedProgramId || localStorage.getItem('topscore_bp_selected_prog_id') || (activeProgs[0]?.id || '');
  if (!activeProgs.some(p => p.id === selectedProgId) && activeProgs.length > 0) {
    selectedProgId = activeProgs[0].id;
  }
  window._bpSelectedProgramId = selectedProgId;

  // Active Level Selection
  let activeLevel = window._bpSelectedLevel || 'ALL';
  window._bpSelectedLevel = activeLevel;

  // Helper: Find target vocabulary class for this program and level
  const getLevelClass = (lvl) => {
    const prog = activeProgs.find(p => p.id === selectedProgId);
    const progName = (prog?.name || '').toLowerCase();
    const shortLvl = (typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`).toLowerCase();

    // 1. Best match: Program Name + Level (e.g. "Camp 2nd Vocabulary")
    let match = classes.find(c => c.program_id === selectedProgId &&
      c.name && c.name.toLowerCase().includes(progName) &&
      (c.name.toLowerCase().includes(shortLvl) || c.name.toLowerCase().includes(`${lvl}`)) &&
      c.name.toLowerCase().includes('vocab')
    );
    if (match) return match;

    // 2. Class whose tests actually exist in database
    const classIdsWithTests = new Set(tests.map(t => t.class_id));
    match = classes.find(c => c.program_id === selectedProgId &&
      classIdsWithTests.has(c.id) &&
      (c.name.toLowerCase().includes(shortLvl) || c.name.toLowerCase().includes(`${lvl}`)) &&
      c.name.toLowerCase().includes('vocab')
    );
    if (match) return match;

    // 3. Fallback to generic level + vocab
    return classes.find(c => c.program_id === selectedProgId &&
      (c.name.toLowerCase().includes(shortLvl) || c.name.toLowerCase().includes(`${lvl}`)) &&
      c.name.toLowerCase().includes('vocab')
    ) || classes.find(c => c.program_id === selectedProgId && c.name && c.name.toLowerCase().includes('vocab')) || null;
  };

  // Helper: Find Task for topic
  const findTaskForTopic = (lvl, thCode, tpCode, tpName, classId) => {
    if (!classId) return null;
    const classTests = tests.filter(t => t.class_id === classId);
    const cleanNum = tpCode.replace(/^[A-Z]+/i, '');
    return classTests.find(t => (t.test_type === 'quiz' || (t.shell_code && t.shell_code.includes('TASK'))) &&
      (t.shell_code && (t.shell_code.toUpperCase().includes(`${lvl}${thCode}${cleanNum}-WORDS-TASK`) || t.shell_code.toUpperCase().includes(`${lvl}${thCode}${cleanNum}-PHRASES-TASK`)))) ||
      classTests.find(t => t.title && t.title.toLowerCase().includes(tpName.toLowerCase()));
  };

  // Helper: Find Exam for theme
  const findExamForTheme = (lvl, thCode, thName, classId) => {
    if (!classId) return null;
    const classTests = tests.filter(t => t.class_id === classId);
    return classTests.find(t => (t.test_type === 'exam' || (t.shell_code && t.shell_code.includes('EXAM'))) &&
      (t.shell_code && t.shell_code.toUpperCase().includes(`${lvl}${thCode}-WORDS-EXAM`))) ||
      classTests.find(t => t.title && t.title.toLowerCase().includes(thName.toLowerCase()) && (t.test_type === 'exam' || (t.title.toUpperCase().includes('EXAM'))));
  };

  // Count overall tasks & exams ready vs expected
  let totalTasksExpected = 0;
  let totalTasksReady = 0;
  let totalExamsExpected = 0;
  let totalExamsReady = 0;

  const levelsToScan = activeLevel === 'ALL' ? levels : [Number(activeLevel)];
  levelsToScan.forEach(lvl => {
    const targetClass = getLevelClass(lvl);
    const thMap = levelGroups.get(lvl);
    if (!thMap) return;

    thMap.forEach(th => {
      totalExamsExpected++;
      const thExam = findExamForTheme(lvl, th.code, th.name, targetClass?.id);
      if (thExam) totalExamsReady++;

      th.topicsMap.forEach(tp => {
        totalTasksExpected++;
        const tpTask = findTaskForTopic(lvl, th.code, tp.topicCode, tp.name, targetClass?.id);
        if (tpTask) totalTasksReady++;
      });
    });
  });

  const totalExpectedAll = totalTasksExpected + totalExamsExpected;
  const totalReadyAll = totalTasksReady + totalExamsReady;
  const pctReady = totalExpectedAll > 0 ? Math.round((totalReadyAll / totalExpectedAll) * 100) : 0;
  const selectedProg = activeProgs.find(p => p.id === selectedProgId);

  // Setup Bottom Infobar for Test Blueprint (Rules 2.23, 2.24 & Phase 398)
  if (window.setBottomInfobar) {
    const leftHtml = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">PROGRAM:</label>
          <select id="bp-program-select" style="height: 28px; font-size: 11px; width: 140px; background: rgba(30,41,59,0.9); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 5px; padding: 0 6px; cursor: pointer; outline: none; font-weight: 600;">
            ${activeProgs.map(p => `<option value="${p.id}" ${p.id === selectedProgId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; gap: 2px; align-items: center; background: rgba(15,23,42,0.8); padding: 2px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1);">
          <button type="button" class="btn-bp-level-tab" data-lvl="ALL" style="height: 24px; font-size: 10.5px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; ${activeLevel === 'ALL' ? 'background: #3b82f6; color: #fff;' : 'background: transparent; color: #94a3b8;'}">ALL LEVELS</button>
          ${levels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`;
            return `<button type="button" class="btn-bp-level-tab" data-lvl="${lvl}" style="height: 24px; font-size: 10.5px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; ${isActive ? 'background: #3b82f6; color: #fff;' : 'background: transparent; color: #94a3b8;'};">${shortLbl}</button>`;
          }).join('')}
        </div>
      </div>
    `;
    const centerHtml = `
      <div class="bottom-info-chip"><span class="chip-label">Tasks:</span><span class="chip-val" style="color: #22c55e;">${totalTasksReady}/${totalTasksExpected}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Exams:</span><span class="chip-val" style="color: #c084fc;">${totalExamsReady}/${totalExamsExpected}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Readiness:</span><span class="chip-val" style="color: ${pctReady === 100 ? '#22c55e' : '#f59e0b'}; font-weight: 800;">${pctReady}%</span></div>
    `;
    const rightHtml = `
      <input type="search" id="bp-search-input" placeholder="🔍 Search Topics..." style="width: 140px; height: 28px; font-size: 11px; background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 5px; padding: 0 8px; outline: none;">
      <button class="btn btn-secondary btn-sm" id="btn-bp-settings" style="height: 28px; font-size: 11px; font-weight: 700; background: rgba(14,165,233,0.18); border: 1px solid rgba(14,165,233,0.4); color: #38bdf8; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Test System Settings">⚙️ Test Settings</button>
      <button class="btn btn-primary btn-sm" id="btn-bp-autogen" style="background: var(--clr-primary); font-size: 11.5px; padding: 0 12px; height: 28px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 2px 8px rgba(99,102,241,0.45); border: none; cursor: pointer; border-radius: 5px;" title="Auto-Generate Curriculum Tests">⚡ Auto-Generate All Tests</button>
    `;
    window.setBottomInfobar(leftHtml, rightHtml, centerHtml);
  }

  // Answer Type State Map
  window._bpTopicAnswerTypes = window._bpTopicAnswerTypes || {};
  window._onBpAnswerTypeChange = (topicCode, ans) => {
    window._bpTopicAnswerTypes[topicCode] = ans;
  };

  // Batch Configuration Grid Table Rows Builder
  const buildBlueprintTableRows = (searchQuery = '') => {
    const q = (searchQuery || '').toLowerCase().trim();
    let rowsHtml = '';
    let renderedCount = 0;

    levelsToScan.forEach(lvl => {
      const targetClass = getLevelClass(lvl);
      const thMap = levelGroups.get(lvl);
      if (!thMap) return;

      const lvlLabel = (typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`).toUpperCase();
      const themeList = Array.from(thMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        const thExam = findExamForTheme(lvl, thCode, th.name, targetClass?.id);

        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || t.topicCode.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));

        if (topics.length === 0) return;

        topics.forEach(tp => {
          renderedCount++;
          const tpTask = findTaskForTopic(lvl, thCode, tp.topicCode, tp.name, targetClass?.id);
          const taskReady = Boolean(tpTask);
          const examReady = Boolean(thExam);

          // Pacing defaults
          const taskDuration = tpTask?.working_duration_minutes || 15;
          const taskScore = tpTask?.minimum_required_score || 60;
          const examDuration = thExam?.working_duration_minutes || 30;
          const examScore = thExam?.minimum_required_score || 60;
          const ansType = window._bpTopicAnswerTypes[tp.topicCode] || tpTask?.answer_type || (tpTask?.payload && tpTask.payload.answer_type) || 'spoken';

          rowsHtml += `
            <tr class="blueprint-table-row" data-topic-code="${escapeHtml(tp.topicCode)}" data-level="${lvl}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="text-align: center; font-weight: 800; font-size: 11px; color: #38bdf8; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.08); width: 55px;">
                ${escapeHtml(lvlLabel)}
              </td>
              <td style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.08); font-size: 11px; width: 55px;">
                ${escapeHtml(tp.topicCode || '—')}
              </td>
              <td style="color: #ffffff; font-weight: 700; padding: 8px 12px; border-right: 1px solid rgba(255,255,255,0.08); font-size: 11.5px; min-width: 130px;">
                ${escapeHtml(th.name || '—')}
              </td>
              <td class="col-bp-sep" style="color: #f1f5f9; font-weight: 600; padding: 8px 12px; font-size: 11.5px; min-width: 150px;">
                ${escapeHtml(tp.name)}
              </td>

              <!-- Vocab Pool Split (Single Responsibility) -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 55px;">
                <span class="bp-count-total" style="color: #38bdf8; font-weight: 700; font-size: 11px; font-variant-numeric: tabular-nums;">${tp.totalCount}</span>
              </td>
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 55px;">
                <span style="color: #cbd5e1; font-weight: 600; font-size: 11px; font-variant-numeric: tabular-nums;">${tp.totalWords}</span>
              </td>
              <td class="col-bp-sep" style="text-align: center; padding: 8px 6px; white-space: nowrap; width: 55px;">
                <span style="color: #a78bfa; font-weight: 600; font-size: 11px; font-variant-numeric: tabular-nums;">${tp.totalPhrases}</span>
              </td>

              <!-- Generation Blueprint Split: Duration -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 75px;">
                <span class="bp-setting-badge" style="font-size: 11px; font-weight: 700; color: #f8fafc; font-variant-numeric: tabular-nums;">${taskDuration} min</span>
                <span class="bp-setting-input edit-mode-only" style="align-items:center; gap:2px;">
                  <input type="number" class="bp-inline-duration" data-topic="${escapeHtml(tp.name)}" value="${taskDuration}" min="5" max="180" style="width:44px; height:24px; font-size:11px; background:#0f172a; color:#fff; border:1px solid #6366f1; border-radius:4px; padding:0 3px; text-align:center;">
                  <span style="font-size:10px; color:#94a3b8;">m</span>
                </span>
              </td>

              <!-- Generation Blueprint Split: Pass Score -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 75px;">
                <span class="bp-setting-badge" style="font-size: 11px; font-weight: 700; color: #FFFF00; font-variant-numeric: tabular-nums;">${taskScore}%</span>
                <span class="bp-setting-input edit-mode-only" style="align-items:center; gap:2px;">
                  <input type="number" class="bp-inline-score" data-topic="${escapeHtml(tp.name)}" value="${taskScore}" min="10" max="100" style="width:44px; height:24px; font-size:11px; background:#0f172a; color:#fff; border:1px solid #6366f1; border-radius:4px; padding:0 3px; text-align:center;">
                  <span style="font-size:10px; color:#94a3b8;">%</span>
                </span>
              </td>

              <!-- Generation Blueprint Split: Format -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 75px;">
                <span style="color: #38bdf8; font-weight: 600; font-size: 11px;">7×7</span>
              </td>

              <!-- Generation Blueprint Split: Answer Type -->
              <td class="col-bp-sep" style="text-align: center; padding: 8px 8px; white-space: nowrap; width: 95px;">
                <span class="badge-answer-type badge-answer-${ansType}">
                  ${ansType === 'written' ? '✍️ Written' : (ansType === 'hybrid' ? '🔄 Hybrid' : '🗣️ Spoken')}
                </span>
                <span class="bp-setting-input edit-mode-only" style="align-items:center;">
                  <select class="bp-inline-answer-type" data-topic-code="${escapeHtml(tp.topicCode)}" onchange="window._onBpAnswerTypeChange && window._onBpAnswerTypeChange('${escapeHtml(tp.topicCode)}', this.value)" style="height:22px; font-size:10.5px; background:#0f172a; color:#fff; border:1px solid #6366f1; border-radius:4px; padding:0 2px;">
                    <option value="spoken" ${ansType === 'spoken' ? 'selected' : ''}>🗣️ Spoken</option>
                    <option value="written" ${ansType === 'written' ? 'selected' : ''}>✍️ Written</option>
                    <option value="hybrid" ${ansType === 'hybrid' ? 'selected' : ''}>🔄 Hybrid</option>
                  </select>
                </span>
              </td>

              <!-- Task Status (Single Responsibility: Status Only) -->
              <td style="text-align: center; padding: 8px 8px; border-right: 1px solid rgba(255,255,255,0.08); white-space: nowrap; width: 95px;">
                ${taskReady
                  ? `<span style="color: #4ade80; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">✓ Ready</span>`
                  : `<span style="color: #f87171; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">▲ Missing</span>`}
              </td>

              <!-- Exam Status (Single Responsibility: Status Only) -->
              <td style="text-align: center; padding: 8px 8px; white-space: nowrap; width: 95px;">
                ${examReady
                  ? `<span style="color: #c084fc; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">✓ Ready</span>`
                  : `<span style="color: #f87171; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">▲ Missing</span>`}
              </td>
            </tr>
          `;
        });
      });
    });

    if (renderedCount === 0) {
      rowsHtml = `
        <tr>
          <td colspan="13" style="text-align: center; padding: 24px; color: #64748b; font-size: 12px;">
            No topics or tests found matching the current criteria.
          </td>
        </tr>
      `;
    }

    return rowsHtml;
  };

  const initialRows = buildBlueprintTableRows('');

  let html = `
    <div style="display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', system-ui, sans-serif;">
      <!-- Batch Configuration Grid (ONLY Container With Vertical Scroll) -->
      <div class="table-wrap sticky-first" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
        <table id="blueprint-matrix-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 11px;">
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr class="bp-super-header-row">
              <th colspan="4" class="bp-sh-topic">Curriculum Topic</th>
              <th colspan="3" class="bp-sh-vocab">Vocabulary Pool</th>
              <th colspan="4" class="bp-sh-blueprint">Generation Blueprint</th>
              <th colspan="2" class="bp-sh-status">Readiness Status</th>
            </tr>
            <tr>
              <th style="padding: 7px 6px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">LEVEL</th>
              <th style="padding: 7px 6px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">CODE</th>
              <th style="padding: 7px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; min-width: 130px; border-right: 1px solid rgba(255,255,255,0.08);">Theme Name</th>
              <th class="col-bp-sep" style="padding: 7px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; min-width: 150px;">Topic Name</th>

              <th style="padding: 7px 6px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">ITEMS</th>
              <th style="padding: 7px 6px; font-weight: 800; color: #818cf8; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">WORDS</th>
              <th class="col-bp-sep" style="padding: 7px 6px; font-weight: 800; color: #c084fc; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center;">PHRASES</th>

              <th style="padding: 7px 6px; font-weight: 800; color: #f8fafc; text-transform: uppercase; font-size: 10px; width: 75px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">DURATION</th>
              <th style="padding: 7px 6px; font-weight: 800; color: #FFFF00; text-transform: uppercase; font-size: 10px; width: 75px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">PASS SCORE</th>
              <th style="padding: 7px 6px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 10px; width: 75px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">FORMAT</th>
              <th class="col-bp-sep" style="padding: 7px 8px; font-weight: 800; color: #34d399; text-transform: uppercase; font-size: 10px; width: 95px; text-align: center;">ANSWER TYPE</th>

              <th style="padding: 7px 10px; font-weight: 800; color: #86efac; text-transform: uppercase; font-size: 10px; min-width: 95px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">Task Status</th>
              <th style="padding: 7px 10px; font-weight: 800; color: #c084fc; text-transform: uppercase; font-size: 10px; min-width: 95px; text-align: center;">Exam Status</th>
            </tr>
          </thead>
          <tbody id="bp-matrix-tbody">
            ${initialRows}
          </tbody>
        </table>
      </div>
    </div>
  `;
  area.innerHTML = html;

  // Bottom Infobar Program Select Change Handler
  const progSelect = document.getElementById('bp-program-select');
  if (progSelect) {
    progSelect.onchange = (e) => {
      window._bpSelectedProgramId = e.target.value;
      try { localStorage.setItem('topscore_bp_selected_prog_id', e.target.value); } catch (_) {}
      _renderThemeBlueprintTab(area, words, topics, meta);
    };
  }

  // Bottom Infobar Level Tabs Handler
  document.querySelectorAll('.btn-bp-level-tab').forEach(btn => {
    btn.onclick = (e) => {
      const lvl = e.currentTarget.getAttribute('data-lvl');
      window._bpSelectedLevel = lvl;
      _renderThemeBlueprintTab(area, words, topics, meta);
    };
  });

  // Bottom Infobar Dynamic Search Handler
  const bpSearch = document.getElementById('bp-search-input');
  if (bpSearch) {
    bpSearch.oninput = (e) => {
      const rows = buildBlueprintTableRows(e.target.value);
      const tbody = document.getElementById('bp-matrix-tbody');
      if (tbody) tbody.innerHTML = rows;
    };
  }

  // Test Settings Trigger
  const triggerSettings = async () => {
    try {
      const { openTestSystemSettingsModal } = await import('./test-system-settings-modal.js?v=20261106_v140');
      const targetClass = getLevelClass(activeLevel === 'ALL' ? 1 : Number(activeLevel));
      await openTestSystemSettingsModal({
        classId: targetClass?.id || null,
        className: targetClass?.name || 'Curriculum Blueprint',
        onComplete: () => {
          if (typeof renderVocabularyVault === 'function') {
            const container = document.getElementById('classes-detail-canvas');
            if (container) renderVocabularyVault(container);
          }
        }
      });
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Error opening test settings: ' + err.message, 'error');
    }
  };

  const btnSettingsBottom = document.getElementById('btn-bp-settings');
  if (btnSettingsBottom) btnSettingsBottom.onclick = triggerSettings;

  // Auto-Generate Trigger (1+3 Hybrid Confirmation Modal Wizard)
  const triggerAutoGenerate = async () => {
    const importedLevels = levels.filter(lvl => (levelGroups.get(lvl)?.size || 0) > 0);
    if (importedLevels.length === 0) return showToast('No levels with topics detected in Blueprint', 'error');
    const targetClass = getLevelClass(activeLevel === 'ALL' ? importedLevels[0] : Number(activeLevel));

    try {
      const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261106_v140');
      await openAutoGenerateModal({
        availableLevels: importedLevels,
        preSelectedLevels: activeLevel === 'ALL' ? importedLevels : [Number(activeLevel)],
        explicitClassId: targetClass?.id || null,
        topicAnswerTypes: window._bpTopicAnswerTypes || null,
        onComplete: () => {
          if (typeof renderVocabularyVault === 'function') {
            const container = document.getElementById('classes-detail-canvas');
            if (container) renderVocabularyVault(container);
          }
        }
      });
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Error opening generator: ' + err.message, 'error');
    }
  };

  const btnAutogenBottom = document.getElementById('btn-bp-autogen');
  if (btnAutogenBottom) btnAutogenBottom.onclick = triggerAutoGenerate;
}

// ─── Duplicate Checker Modal ──────────────────────────────────

function openDuplicateCheckerModal(allWords, onResolved) {
  const normStr = s => String(s || '').toLowerCase().trim().replace(/\s+/g, ' ');

  // Group by normalized Indonesian AND English (Connected Components)
  const adj = new Map();
  allWords.forEach(w => adj.set(w.id, []));

  const indoMap = {};
  const engMap = {};

  allWords.forEach(w => {
    const ind = normStr(w.indonesian);
    const eng = normStr(w.english);

    if (ind) {
      if (!indoMap[ind]) indoMap[ind] = [];
      indoMap[ind].push(w.id);
    }
    if (eng) {
      if (!engMap[eng]) engMap[eng] = [];
      engMap[eng].push(w.id);
    }
  });

  const connectList = (list) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        adj.get(list[i]).push(list[j]);
        adj.get(list[j]).push(list[i]);
      }
    }
  };

  Object.values(indoMap).forEach(connectList);
  Object.values(engMap).forEach(connectList);

  const visited = new Set();
  const duplicateGroups = [];

  allWords.forEach(w => {
    if (!visited.has(w.id)) {
      const group = [];
      const q = [w.id];
      visited.add(w.id);

      while (q.length > 0) {
        const curr = q.shift();
        group.push(allWords.find(x => x.id === curr));

        adj.get(curr).forEach(neighbor => {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            q.push(neighbor);
          }
        });
      }

      if (group.length > 1) {
        duplicateGroups.push(group);
      }
    }
  });

  if (duplicateGroups.length === 0) {
    showToast('&#10003; No duplicates found in the Vault.', 'success');
    return;
  }

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'vault-dup-modal';

  function buildTable() {
    return duplicateGroups.map((group, gi) => {
      const rows = group.map((w, wi) => `
        <tr data-gi="${gi}" data-wi="${wi}" data-id="${escapeHtml(w.id)}">
          <td class="fw-600" style="padding:10px 8px;">${wi === 0 ? escapeHtml(w.indonesian) : ''}</td>
          <td style="padding:10px 8px; color:var(--clr-text-2);" class="cell-eng-${gi}-${wi}">${escapeHtml(w.english)}</td>
          <td style="padding:10px 8px;"><span class="badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;font-size:0.72rem;">${escapeHtml(w.topic)}</span></td>
          <td style="padding:10px 8px; text-align:right;">
            <button class="btn btn-xs btn-keep-this" data-gi="${gi}" data-id="${escapeHtml(w.id)}" style="background:transparent;color:#00c000ff;border:1px solid #00c000ff;margin-right:4px;" title="Keep this entry, delete others">&#10003; Keep</button>
            <button class="btn btn-danger btn-xs btn-del-this" data-gi="${gi}" data-id="${escapeHtml(w.id)}" title="Delete this entry">&#128465;</button>
          </td>
        </tr>
      `).join('');


      const allSynonyms = new Set();
      group.forEach(w => {
        if (w.english) {
          w.english.split('/').forEach(s => {
            const clean = s.trim();
            if (clean) allSynonyms.add(clean);
          });
        }
      });
      const mergedEnglish = Array.from(allSynonyms).join(' / ');

      return `
        <tbody data-group="${gi}">
          ${rows}
          <tr style="background:rgba(99,102,241,0.05);">
            <td colspan="4" style="padding:8px;">
              <div class="d-flex align-center gap-2 flex-wrap">
                <span class="text-xs text-muted">Merge English into:</span>
                <input type="text" class="input merge-eng-input" data-gi="${gi}" value="${escapeHtml(mergedEnglish)}" style="flex:1; min-width:200px; padding:4px 8px; font-size:0.8rem;" />
                <button class="btn btn-xs btn-merge-group" data-gi="${gi}" style="background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);">&#9889; Merge</button>
              </div>
            </td>
          </tr>
          <tr><td colspan="4" style="padding:0; border-bottom:2px solid #334155;"></td></tr>
        </tbody>
      `;
    }).join('');
  }

  modal.innerHTML = `
    <div class="modal-box" style="max-width:860px; max-height:85vh; display:flex; flex-direction:column;">
      <div class="d-flex justify-between align-center mb-3">
        <div>
          <h3 class="fw-700" style="margin:0;">&#9874; Duplicate Checker</h3>
          <p class="text-muted text-xs mt-1 mb-0">${duplicateGroups.length} group(s) with duplicate Indonesian words found.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-secondary btn-sm" id="dup-modal-keep-all" style="background:#047857; color:white;">&#10004; Keep First (All)</button>
          <button class="btn btn-secondary btn-sm" id="dup-modal-merge-all" style="background:#4f46e5; color:white;">&#9889; Merge All</button>
          <button class="btn btn-ghost btn-sm" id="dup-modal-close">&#10005;</button>
        </div>
      </div>
      <div style="overflow-y:auto; flex-grow:1;">
        <table class="table w-100" id="dup-table">
          <thead>
            <tr>
              <th style="width:170px;">Indonesian</th>
              <th>English</th>
              <th style="width:140px;">Topic</th>
              <th style="width:130px; text-align:right;">Action</th>
            </tr>
          </thead>
          ${buildTable()}
        </table>
      </div>
      <div class="d-flex justify-end mt-3">
        <button class="btn btn-secondary btn-sm" id="dup-modal-done">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() {
    document.body.removeChild(modal);
    if (onResolved) onResolved([...allWords]);
  }

  modal.querySelector('#dup-modal-close').addEventListener('click', closeModal);
  modal.querySelector('#dup-modal-done').addEventListener('click', closeModal);

  // Keep one, delete others in group
  modal.querySelectorAll('.btn-keep-this').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gi = parseInt(btn.dataset.gi);
      const keepId = btn.dataset.id;
      const group = duplicateGroups[gi];
      const toDelete = group.filter(w => w.id !== keepId);

      btn.disabled = true;
      btn.innerHTML = '...';
      try {
        for (const w of toDelete) {
          await deleteVaultWord(w.id);
          allWords = allWords.filter(x => x.id !== w.id);
        }
        // Remove the group from duplicateGroups
        duplicateGroups.splice(gi, 1);
        showToast('Kept 1 entry, deleted ' + toDelete.length + ' duplicate(s).', 'success');
        // Re-render table
        modal.querySelector('#dup-table').querySelector('tbody[data-group="' + gi + '"]')?.remove();
        if (onResolved) onResolved([...allWords]);
        if (duplicateGroups.length === 0) {
          modal.querySelector('p.text-muted.text-xs').textContent = '&#10003; All duplicates resolved!';
        }
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '&#10003; Keep';
      }
    });
  });

  // Delete a single entry
  modal.querySelectorAll('.btn-del-this').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gi = parseInt(btn.dataset.gi);
      const delId = btn.dataset.id;
      btn.disabled = true;
      btn.innerHTML = '...';
      try {
        await deleteVaultWord(delId);
        allWords = allWords.filter(x => x.id !== delId);
        // Remove from group
        const gIdx = duplicateGroups[gi].findIndex(w => w.id === delId);
        if (gIdx !== -1) duplicateGroups[gi].splice(gIdx, 1);
        btn.closest('tr').remove();
        showToast('Entry deleted.', 'success');
        if (onResolved) onResolved([...allWords]);
        // If group now has only 1, remove its merge row
        if (duplicateGroups[gi] && duplicateGroups[gi].length <= 1) {
          const tbody = modal.querySelector('tbody[data-group="' + gi + '"]');
          if (tbody) tbody.remove();
          duplicateGroups.splice(gi, 1);
        }
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '&#128465;';
      }
    });
  });

  // Merge group: update first entry's English and Indonesian to merged value, delete rest
  modal.querySelectorAll('.btn-merge-group').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gi = parseInt(btn.dataset.gi);
      const group = duplicateGroups[gi];
      const mergedEng = modal.querySelector('.merge-eng-input[data-gi="' + gi + '"]').value.trim();

      if (!mergedEng) return showToast('Merged English cannot be empty.', 'error');

      btn.disabled = true;
      btn.innerHTML = '...';
      try {
        const keeper = group[0];
        const toDelete = group.slice(1);

        // Also merge Indonesian automatically
        const allIndo = new Set();
        group.forEach(w => {
          if (w.indonesian) {
            w.indonesian.split('/').forEach(s => {
              const clean = s.trim();
              if (clean) allIndo.add(clean);
            });
          }
        });
        const mergedIndo = Array.from(allIndo).join(' / ');

        // Update keeper's English and Indonesian to merged value
        await updateVaultWord(keeper.id, { english: mergedEng, indonesian: mergedIndo });
        keeper.english = mergedEng;
        keeper.indonesian = mergedIndo;

        // Delete the rest
        for (const w of toDelete) {
          await deleteVaultWord(w.id);
          allWords = allWords.filter(x => x.id !== w.id);
        }

        duplicateGroups.splice(gi, 1);
        const tbody = modal.querySelector('tbody[data-group="' + gi + '"]');
        if (tbody) tbody.remove();

        showToast('Merged into: "' + mergedEng + '"', 'success');
        if (onResolved) onResolved([...allWords]);

        if (duplicateGroups.length === 0) {
          modal.querySelector('p.text-muted.text-xs').textContent = 'All duplicates resolved!';
        }
      } catch (e) {
        showToast('Merge failed: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '&#9889; Merge';
      }
    });
  });

  // Bulk: Keep First (All)
  const keepAllBtn = modal.querySelector('#dup-modal-keep-all');
  if (keepAllBtn) {
    keepAllBtn.addEventListener('click', async () => {
      if (!confirm('This will keep the first entry of EVERY duplicate group and delete the rest. Proceed?')) return;
      keepAllBtn.disabled = true;
      keepAllBtn.innerHTML = '...';
      try {
        // Iterate backwards so we can safely remove from duplicateGroups
        for (let i = duplicateGroups.length - 1; i >= 0; i--) {
          const group = duplicateGroups[i];
          const toDelete = group.slice(1);
          for (const w of toDelete) {
            await deleteVaultWord(w.id);
            allWords = allWords.filter(x => x.id !== w.id);
          }
          const tbody = modal.querySelector('tbody[data-group="' + i + '"]');
          if (tbody) tbody.remove();
          duplicateGroups.splice(i, 1);
        }
        showToast('All groups resolved (Kept First).', 'success');
        modal.querySelector('p.text-muted.text-xs').textContent = '&#10003; All duplicates resolved!';
        if (onResolved) onResolved([...allWords]);
      } catch (e) {
        showToast('Bulk Keep failed: ' + e.message, 'error');
      }
      keepAllBtn.innerHTML = '&#10004; Keep First (All)';
      keepAllBtn.disabled = false;
    });
  }

  // Bulk: Merge All
  const mergeAllBtn = modal.querySelector('#dup-modal-merge-all');
  if (mergeAllBtn) {
    mergeAllBtn.addEventListener('click', async () => {
      if (!confirm('This will merge all English and Indonesian synonyms for EVERY duplicate group into the first entry and delete the rest. Proceed?')) return;
      mergeAllBtn.disabled = true;
      mergeAllBtn.innerHTML = '...';
      try {
        for (let i = duplicateGroups.length - 1; i >= 0; i--) {
          const group = duplicateGroups[i];
          const keeper = group[0];
          const toDelete = group.slice(1);
          const mergedEng = modal.querySelector('.merge-eng-input[data-gi="' + i + '"]').value.trim();

          const allIndo = new Set();
          group.forEach(w => {
            if (w.indonesian) {
              w.indonesian.split('/').forEach(s => {
                const clean = s.trim();
                if (clean) allIndo.add(clean);
              });
            }
          });
          const mergedIndo = Array.from(allIndo).join(' / ');

          if (mergedEng) {
            await updateVaultWord(keeper.id, { english: mergedEng, indonesian: mergedIndo });
            keeper.english = mergedEng;
            keeper.indonesian = mergedIndo;

            for (const w of toDelete) {
              await deleteVaultWord(w.id);
              allWords = allWords.filter(x => x.id !== w.id);
            }
            const tbody = modal.querySelector('tbody[data-group="' + i + '"]');
            if (tbody) tbody.remove();
            duplicateGroups.splice(i, 1);
          }
        }
        showToast('All groups merged.', 'success');
        modal.querySelector('p.text-muted.text-xs').textContent = '&#10003; All duplicates resolved!';
        if (onResolved) onResolved([...allWords]);
      } catch (e) {
        showToast('Bulk Merge failed: ' + e.message, 'error');
      }
      mergeAllBtn.innerHTML = '&#9889; Merge All';
      mergeAllBtn.disabled = false;
    });
  }
}

// ─── Topic Duplicate Checker Modal ────────────────────────────

function openTopicDuplicateCheckerModal(topicEntries, allWords, onResolved) {
  // Simple normalization: lowercase and remove non-alphanumeric
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const groups = {};
  const allDistinctTopics = Array.from(new Set(topicEntries.map(([topic]) => topic).filter(Boolean))).sort();

  topicEntries.forEach(([topic]) => {
    const key = norm(topic);
    if (!groups[key]) groups[key] = [];
    groups[key].push(topic);
  });

  const duplicateGroups = Object.values(groups).filter(g => g.length > 1);

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'vault-topic-dup-modal';

  function buildTable() {
    if (duplicateGroups.length === 0) {
      return `
        <tbody>
          <tr>
            <td class="text-center text-muted text-xs" style="padding:16px;">
              &#10003; No automated similar topic duplicates detected. You can use the manual topic merge tool below.
            </td>
          </tr>
        </tbody>
      `;
    }
    return duplicateGroups.map((group, gi) => {
      const rows = group.map((t, ti) => `
        <tr data-gi="${gi}" data-ti="${ti}">
          <td style="padding:10px 8px;"><span class="badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;font-size:0.75rem;">${escapeHtml(t)}</span></td>
        </tr>
      `).join('');

      const mergedTopic = group[0];

      return `
        <tbody data-group="${gi}">
          ${rows}
          <tr style="background:rgba(99,102,241,0.05);">
            <td style="padding:8px;">
              <div class="d-flex align-center gap-2 flex-wrap">
                <span class="text-xs text-muted">Merge topics into:</span>
                <input type="text" class="input merge-topic-input" data-gi="${gi}" value="${escapeHtml(mergedTopic)}" style="flex:1; min-width:200px; padding:4px 8px; font-size:0.8rem;" />
                <button class="btn btn-xs btn-merge-topic-group" data-gi="${gi}" style="background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);">&#9889; Merge</button>
              </div>
            </td>
          </tr>
          <tr><td style="padding:0; border-bottom:2px solid #334155;"></td></tr>
        </tbody>
      `;
    }).join('');
  }

  const topicOptions = allDistinctTopics.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

  modal.innerHTML = `
    <div class="modal-box" style="max-width:640px; max-height:88vh; display:flex; flex-direction:column; padding:20px;">
      <div class="d-flex justify-between align-center mb-3">
        <div>
          <h3 class="fw-700" style="margin:0; font-size:1.15rem; color:#f8fafc;">&#9874; Topic Merge &amp; Unification Wizard</h3>
          <p class="text-muted text-xs mt-1 mb-0">${duplicateGroups.length} automated similar group(s) detected &bull; ${allDistinctTopics.length} total topics active</p>
        </div>
        <div class="d-flex gap-2">
          ${duplicateGroups.length > 0 ? `<button class="btn btn-secondary btn-sm" id="dup-topic-merge-all" style="background:#4f46e5; color:white;">&#9889; Merge All</button>` : ''}
          <button class="btn btn-ghost btn-sm" id="dup-topic-modal-close" style="font-size:1.1rem; line-height:1;">&#10005;</button>
        </div>
      </div>

      <div style="overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; gap:16px;">
        <!-- 1. Automated Detection -->
        <div style="background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
          <div class="text-xs fw-700 uppercase mb-2" style="color:#a5b4fc; letter-spacing:0.4px;">Automated Similarity Scanner</div>
          <table class="table w-100" id="dup-topic-table" style="margin:0;">
            ${buildTable()}
          </table>
        </div>

        <!-- 2. Manual Topic Merge Tool -->
        <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(99,102,241,0.3); border-radius:8px; padding:14px;">
          <div class="d-flex justify-between align-center mb-2">
            <strong style="color:#a5b4fc; font-size:0.85rem;">⚡ Manual Topic Merge</strong>
            <span class="text-xs text-muted">Merge any two custom topics seamlessly</span>
          </div>
          <div class="d-flex gap-2 align-center flex-wrap">
            <div style="flex:1; min-width:180px;">
              <label class="text-xs text-muted d-block mb-1" for="manual-merge-source">Source Topic (Will be replaced)</label>
              <select id="manual-merge-source" class="form-control" style="font-size:0.8rem; padding:6px 8px; width:100%;">
                <option value="">-- Select Source Topic --</option>
                ${topicOptions}
              </select>
            </div>
            <div style="font-size:1.2rem; color:#94a3b8; align-self:flex-end; padding-bottom:6px;">➔</div>
            <div style="flex:1; min-width:180px;">
              <label class="text-xs text-muted d-block mb-1" for="manual-merge-target">Target Topic (Keeper)</label>
              <select id="manual-merge-target" class="form-control" style="font-size:0.8rem; padding:6px 8px; width:100%;">
                <option value="">-- Select Target Topic --</option>
                ${topicOptions}
              </select>
            </div>
          </div>
          <div class="d-flex justify-between align-center mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
            <div id="manual-merge-status" class="text-xs text-muted">All words in the source topic will be re-assigned to the target topic.</div>
            <button class="btn btn-primary btn-sm" id="btn-execute-manual-merge" style="font-weight:700;">&#9889; Execute Merge</button>
          </div>
        </div>
      </div>

      <div class="d-flex justify-end mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,0.08);">
        <button class="btn btn-secondary btn-sm" id="dup-topic-modal-done">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() {
    modal.remove();
    if (onResolved) onResolved();
  }

  modal.querySelector('#dup-topic-modal-close').addEventListener('click', closeModal);
  modal.querySelector('#dup-topic-modal-done').addEventListener('click', closeModal);

  // Manual Merge Handler
  const btnExecManual = modal.querySelector('#btn-execute-manual-merge');
  const selSource = modal.querySelector('#manual-merge-source');
  const selTarget = modal.querySelector('#manual-merge-target');

  btnExecManual?.addEventListener('click', async () => {
    const src = selSource.value;
    const tgt = selTarget.value;
    if (!src || !tgt) {
      showToast('Please select both a Source and a Target topic.', 'warning');
      return;
    }
    if (src === tgt) {
      showToast('Source and Target topic cannot be the same.', 'warning');
      return;
    }
    if (!confirm(`Are you sure you want to merge all words from "${src}" into "${tgt}"?`)) return;

    btnExecManual.disabled = true;
    btnExecManual.innerHTML = 'Merging...';
    try {
      await renameVaultTopic(src, tgt);
      showToast(`✓ Topic "${src}" successfully merged into "${tgt}"!`, 'success');
      closeModal();
    } catch (err) {
      showToast('Merge failed: ' + err.message, 'error');
      btnExecManual.disabled = false;
      btnExecManual.innerHTML = '&#9889; Execute Merge';
    }
  });

  async function performMerge(gi, mergedTopic) {
    const group = duplicateGroups[gi];
    if (!mergedTopic) throw new Error('Merged topic name cannot be empty.');
    for (const t of group) {
      if (t !== mergedTopic) {
        await renameVaultTopic(t, mergedTopic);
      }
    }
    const tbody = modal.querySelector('tbody[data-group="' + gi + '"]');
    if (tbody) tbody.remove();
    duplicateGroups.splice(gi, 1);
  }

  modal.querySelectorAll('.btn-merge-topic-group').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gi = parseInt(btn.dataset.gi);
      const mergedTopic = modal.querySelector('.merge-topic-input[data-gi="' + gi + '"]').value.trim();

      btn.disabled = true;
      btn.innerHTML = '...';
      try {
        await performMerge(gi, mergedTopic);
        showToast('Topics merged.', 'success');
        if (duplicateGroups.length === 0) {
          const statusEl = modal.querySelector('p.text-muted.text-xs');
          if (statusEl) statusEl.textContent = 'All automated topic duplicates resolved!';
        }
      } catch (e) {
        showToast('Topic merge failed: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = '&#9889; Merge';
      }
    });
  });

  const mergeAllBtn = modal.querySelector('#dup-topic-merge-all');
  if (mergeAllBtn) {
    mergeAllBtn.addEventListener('click', async () => {
      if (!confirm('Merge all similar topics into the first proposed name?')) return;
      mergeAllBtn.disabled = true;
      mergeAllBtn.innerHTML = '...';
      try {
        for (let i = duplicateGroups.length - 1; i >= 0; i--) {
          const mergedTopic = modal.querySelector('.merge-topic-input[data-gi="' + i + '"]').value.trim();
          await performMerge(i, mergedTopic);
        }
        showToast('All topic groups merged.', 'success');
        const statusEl = modal.querySelector('p.text-muted.text-xs');
        if (statusEl) statusEl.textContent = '&#10003; All duplicates resolved!';
      } catch (e) {
        showToast('Bulk Merge failed: ' + e.message, 'error');
      }
      mergeAllBtn.innerHTML = '&#9889; Merge All';
      mergeAllBtn.disabled = false;
    });
  }
}

