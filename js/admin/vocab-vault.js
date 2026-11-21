
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
  syncAllCurriculumTests,
  fetchThemeProgramAssignments,
  toggleThemeProgramAssignment,
  updateVaultThemeCascade,
  updateVaultThemeCodeCascade,
  updateVaultTopicCascade,
  updateVaultTopicCodeCascade,
  updateVaultTopicLevelCascade,
  updateVaultThemeLevelCascade
} from '../api.js?v=20261118_v600';
import { showToast, showLoading, hideLoading } from '../app.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { getGradeColorByScore, getInvertedGradeColor } from '../grading.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

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
      { id: 'theme_manager', icon: getSvgIcon('layers', 14), val: themesCount, title: 'Theme Manager', label: 'Theme Manager' },
      { id: 'blueprint', icon: getSvgIcon('zap', 14), val: topicsCount, title: 'Test Blueprint', label: 'Test Blueprint' },
      { id: 'vocab', icon: getSvgIcon('book-open', 14), val: wordsCount, label: 'Vocabulary Words' },
      { id: 'phrases', icon: getSvgIcon('activity', 14), val: phrasesCount, label: 'Phrases & Idioms' }
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
    area.innerHTML = `<div class="empty-state"><div class="empty-state__icon" style="color:var(--grade-e);">${getSvgIcon('alert-triangle', 36)}</div><h3>Failed to load Vocabulary Vault</h3><p class="text-muted">${escapeHtml(e.message)}</p></div>`;
  }
}


// ─── Grid View ─────────────────────────────────────────────

function _renderVaultGrid(area, words, topics, mode = 'single_words') {
  let title = mode === 'single_words' ? `${getSvgIcon('book-open', 14)} Words` : `${getSvgIcon('activity', 14)} Phrases`;
  let desc = mode === 'single_words'
    ? 'Standard vocabulary (Noun, Verb, Adjective, Adverb). Feeds Vocabulary Mastery Modules (Recognition, Spoken, Written).'
    : 'Expressions, idioms, and proverbs. Feeds Vocabulary Mastery Modules (Recognition, Spoken, Written).';

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

  const uniqueLevels = Array.from(new Set(words.map(w => parseInt(w.target_level)).filter(n => !isNaN(n) && n >= 0))).sort((a, b) => a - b);
  if (uniqueLevels.length === 0) uniqueLevels.push(0, 1, 2, 3);
  const levelSelectOptions = uniqueLevels.map(lvl => `<option value="${lvl}">${lvl === 0 ? '0 (Non-Level)' : (typeof toShortLevel === 'function' ? toShortLevel(lvl) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(lvl) : lvl))}</option>`).join('');

  area.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', sans-serif;">
      <div class="table-wrap sticky-first" style="flex: 1; min-height: 0; overflow-y: auto; margin: 0; background: #0f172a;">
        <table id="vault-table" class="${mode === 'phrases' ? 'mode-phrases' : ''}" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 12px;">
          <colgroup>
            <col style="width: 85px;">
            <col style="width: 140px;">
            <col style="width: 180px;">
            <col style="width: 80px;">
            <col style="min-width: 220px;">
            <col style="width: 280px;">
            <col class="edit-mode-only" style="width: 55px;">
          </colgroup>
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 20; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr>
              <th data-sort="lex_code" style="padding: 6px 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 85px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); cursor: pointer; user-select: none;" title="Sort by Lexicon Coordinate Code">LEX-CD <span class="sort-indicator" id="sort-ind-lex_code">▲</span></th>
              <th data-sort="theme" style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 140px; border-right: 1px solid rgba(255,255,255,0.08); cursor: pointer; user-select: none;" title="Sort by Theme">THEME <span class="sort-indicator" id="sort-ind-theme"></span></th>
              <th data-sort="topic" style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08); cursor: pointer; user-select: none;" title="Sort by Topic">TOPIC <span class="sort-indicator" id="sort-ind-topic"></span></th>
              <th data-sort="word_type" style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 80px; border-right: 1px solid rgba(255,255,255,0.08); cursor: pointer; user-select: none;" title="Sort by Word Type">TYPE <span class="sort-indicator" id="sort-ind-word_type"></span></th>
              <!-- Flex Primary Column — absorbs all remaining viewport space (§TABLE-FLEX-PRIMARY) -->
              <th data-sort="indonesian" style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 220px; border-right: 1px solid rgba(255,255,255,0.08); cursor: pointer; user-select: none;" title="Sort by Indonesian">INDONESIAN <span class="sort-indicator" id="sort-ind-indonesian"></span></th>
              <th data-sort="english" style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 280px; border-right: 1px solid rgba(255,255,255,0.08); cursor: pointer; user-select: none;" title="Sort by English">ENGLISH <span class="sort-indicator" id="sort-ind-english"></span></th>
              <th class="edit-mode-only" style="padding: 6px 8px; font-weight: 800; color: var(--grade-e); text-transform: uppercase; font-size: 12px; text-align: center; width: 55px; position: sticky; right: 0; background: #1e293b; border-left: 1px solid rgba(255, 255, 255, 0.1); z-index: 25;" title="Actions">ACT</th>
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
    const isPhrase = ['expression', 'idiom', 'proverb', 'phrase', 'phrasal verb'].includes(wt);
    if (mode === 'single_words') return !isPhrase;
    return isPhrase;
  });

  // Sort deterministically before indexing to guarantee stable Lexicon Code coordinates
  _allWords.sort((a, b) => {
    const parsedA = parseInt(a.target_level, 10);
    const lvlA = !isNaN(parsedA) ? parsedA : 1;
    const parsedB = parseInt(b.target_level, 10);
    const lvlB = !isNaN(parsedB) ? parsedB : 1;
    if (lvlA !== lvlB) return lvlA - lvlB;
    const codeA = `${a.theme_code || 'A'}${a.topic_code || '1'}`;
    const codeB = `${b.theme_code || 'A'}${b.topic_code || '1'}`;
    if (codeA !== codeB) return codeA.localeCompare(codeB, undefined, { numeric: true });
    return (a.english || '').localeCompare(b.english || '');
  });

  // Pre-index all words/phrases per composite topic with stable deterministic Lexicon Codes
  const topicWordIndexMap = new Map();
  const topicCounters = {};
  _allWords.forEach(w => {
    const parsedLvl = parseInt(w.target_level, 10);
    const cleanLvl = !isNaN(parsedLvl) ? parsedLvl : 1;
    const cleanThCode = (w.theme_code || 'A').trim().toUpperCase();
    const rawTpCode = (w.topic_code || '1').trim();
    const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '') || rawTpCode || '1';
    const compositeTopic = cleanLvl === 0 ? `${cleanThCode}${cleanTpCode}` : `${cleanLvl}${cleanThCode}${cleanTpCode}`;

    if (!topicCounters[compositeTopic]) topicCounters[compositeTopic] = 0;
    topicCounters[compositeTopic]++;
    const prefix = mode === 'phrases' ? 'P' : 'W';
    const numStr = String(topicCounters[compositeTopic]).padStart(2, '0');
    const lexCode = `${compositeTopic}-${prefix}${numStr}`;
    topicWordIndexMap.set(w.id, lexCode);
    w.lex_code = lexCode; // Attach as first-class property for sort/filter
  });

  // Sort state for interactive column sorting
  let currentSort = { col: 'lex_code', dir: 'asc' };

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
        <input type="search" id="vault-search" placeholder="Search..." value="${escapeHtml(searchVal)}" style="width: 160px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 8px; outline: none;">

        <select id="vault-level-filter" style="width: 95px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Levels</option>
          ${uniqueLevels.map(lvl => `<option value="${lvl}"${lvlVal === String(lvl) ? ' selected' : ''}>${lvl === 0 ? '0 (Non-Level)' : (typeof toShortLevel === 'function' ? toShortLevel(lvl) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(lvl) : lvl))}</option>`).join('')}
        </select>

        <select id="vault-topic-filter" style="width: 135px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Topics</option>
          ${topics.map(t => {
            const tName = typeof t === 'string' ? t : (t.name || t.topic || '');
            return `<option value="${escapeHtml(tName)}"${topVal === tName ? ' selected' : ''}>${escapeHtml(tName)}</option>`;
          }).join('')}
        </select>

        <select id="vault-program-filter" style="width: 105px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Programs</option>
          ${(window._vaultMeta?.programs || [])
            .filter(p => !p.deleted_at && p.is_active !== false)
            .map(p => {
              const pName = p.name || '';
              return `<option value="${escapeHtml(pName)}"${window._vaultGridProgram === pName ? ' selected' : ''}>${escapeHtml(pName)}</option>`;
            }).join('') || `
              <option value="Camp" ${window._vaultGridProgram === 'Camp' ? 'selected' : ''}>Camp</option>
              <option value="Evnikom" ${window._vaultGridProgram === 'Evnikom' ? 'selected' : ''}>Evnikom</option>
              <option value="Sheraton" ${window._vaultGridProgram === 'Sheraton' ? 'selected' : ''}>Sheraton</option>
            `}
        </select>

        <select id="vault-wordtype-filter" style="width: 110px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
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

    const isEditOn = document.body.classList.contains('global-edit-mode-on') || Boolean(window._globalEditMode);
    const editBtnStyle = isEditOn
      ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);'
      : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
    const editBtnLabel = isEditOn
      ? `${getSvgIcon('check-circle', 14)} Done Editing`
      : `${getSvgIcon('edit', 14)} Edit Mode`;

    const rightHtml = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <button type="button" class="btn btn-sm" id="btn-toggle-vault-grid-edit-mode" style="${editBtnStyle}" title="Toggle Inline Edit Mode (Excel Gridlines)">${editBtnLabel}</button>
        <button class="btn btn-secondary btn-sm" id="btn-sync-vault-tests" style="height:30px; font-size: 12px; padding:0 8px; font-weight:700; background:rgba(149,255,0,0.12); border:1px solid rgba(149,255,0,0.35); color:var(--quad-c, #95ff00); border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;" title="Synchronize test shells with latest Vocabulary Vault topics and themes">${getSvgIcon('refresh', 14)} Sync Tests</button>
        <button class="btn btn-secondary btn-sm" id="btn-import-vault" style="height:30px; font-size: 12px; padding:0 8px; font-weight:600; background:rgba(30,41,59,0.85); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">${getSvgIcon('upload', 14)} Import</button>
        <button class="btn btn-secondary btn-sm" id="btn-export-vault" style="height:30px; font-size: 12px; padding:0 8px; font-weight:600; background:rgba(30,41,59,0.85); border:1px solid rgba(255,255,255,0.15); color:#f8fafc; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">${getSvgIcon('download', 14)} Export</button>
        <button class="btn btn-secondary btn-sm" id="btn-check-duplicates" style="height:30px; font-size: 12px; padding:0 8px; font-weight:600; background:rgba(30,41,59,0.85); border:1px solid rgba(255,255,255,0.15); color:#38bdf8; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">${getSvgIcon('search', 14)} Dups</button>
      </div>
    `;

    window._syncActiveVaultGridBottomBar = () => _syncVaultGridBottomBar(filtered, allModeWords, currentMode);
    window.setBottomInfobar(leftHtml, rightHtml);
    bindVaultGridBottomActions();
  }

  function bindVaultGridBottomActions() {
    const toggleGridEditBtn = document.getElementById('btn-toggle-vault-grid-edit-mode');
    if (toggleGridEditBtn) {
      toggleGridEditBtn.onclick = () => {
        if (typeof window.toggleGlobalEditMode === 'function') {
          const newState = window.toggleGlobalEditMode();
          _syncVaultGridBottomBar(filtered, allModeWords, currentMode);
          showToast(newState ? 'Master Edit Mode ON (Inline Excel Grid)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
        }
      };
    }

    if (!window._vaultGridEditModeListenerBound) {
      window._vaultGridEditModeListenerBound = true;
      window.addEventListener('admin-edit-mode-changed', () => {
        if (typeof window._syncActiveVaultGridBottomBar === 'function') {
          window._syncActiveVaultGridBottomBar();
        }
      });
    }
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

    const progSelect = document.getElementById('vault-program-filter');
    if (progSelect && !progSelect.dataset.bound) {
      progSelect.dataset.bound = 'true';
      progSelect.addEventListener('change', (e) => {
        window._vaultGridProgram = e.target.value;
        filterAndRender();
      });
    }

    const btnExp = document.getElementById('btn-export-vault');
    if (btnExp && !btnExp.dataset.bound) {
      btnExp.dataset.bound = 'true';
      btnExp.addEventListener('click', async () => {
        try {
          const oldText = btnExp.innerHTML;
          btnExp.innerHTML = `${getSvgIcon('clock', 14)} Exporting...`;
          btnExp.disabled = true;
          await exportVaultWords(mode);
          btnExp.innerHTML = oldText;
          btnExp.disabled = false;
        } catch (e) {
          showToast('Export failed: ' + e.message, 'error');
          btnExp.innerHTML = `${getSvgIcon('download', 14)} Export`;
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

    const btnSyncTests = document.getElementById('btn-sync-vault-tests');
    if (btnSyncTests && !btnSyncTests.dataset.bound) {
      btnSyncTests.dataset.bound = 'true';
      btnSyncTests.addEventListener('click', async () => {
        try {
          const oldHtml = btnSyncTests.innerHTML;
          btnSyncTests.innerHTML = `${getSvgIcon('clock', 14)} Syncing...`;
          btnSyncTests.disabled = true;
          showLoading('Synchronizing Tests with Vocabulary Vault...');

          const currentLvl = window._vaultGridLevel && window._vaultGridLevel !== 'ALL'
            ? Number(window._vaultGridLevel)
            : null;
          const syncRes = await syncAllCurriculumTests({ level: currentLvl });

          hideLoading();
          btnSyncTests.innerHTML = oldHtml;
          btnSyncTests.disabled = false;
          showToast(`Curriculum & Tests synced: ${syncRes.createdCount} new test shells created, ${syncRes.updatedCount} updated!`, 'success');
        } catch (syncErr) {
          hideLoading();
          btnSyncTests.innerHTML = `${getSvgIcon('refresh', 14)} Sync Tests`;
          btnSyncTests.disabled = false;
          showToast('Sync failed: ' + syncErr.message, 'error');
        }
      });
    }
  }

  function renderRows(filtered) {
    const tbody = document.getElementById('vault-tbody');
    if (!tbody) return;
    _syncVaultGridBottomBar(filtered, _allWords, mode);

    if (!filtered.length) {
      const emptyColspan = (typeof isEditModeActive === 'function' ? isEditModeActive() : false) ? 7 : 6;
      tbody.innerHTML = `
        <tr>
          <td colspan="${emptyColspan}" style="text-align: center; padding: 30px; color: #64748b; font-size: 12px;">
            No vocabulary items found matching current filters.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((w) => {
    const wt = (w.word_type || 'Vocab').toLowerCase();
      let typeColor;
      switch (wt) {
        case 'noun':     typeColor = '#60a5fa'; break; // Sky Blue 400
        case 'verb':     typeColor = '#818cf8'; break; // Indigo Blue 400
        case 'adjective':typeColor = '#38bdf8'; break; // Tactical Cyan 400
        case 'adverb':   typeColor = '#93c5fd'; break; // Powder Blue 300
        case 'vocab': case 'vocabulary': typeColor = '#a5b4fc'; break; // Periwinkle 300
        case 'idiom':    typeColor = '#60a5fa'; break; // Sky Blue 400
        case 'proverb':  typeColor = '#818cf8'; break; // Indigo Blue 400
        case 'expression': typeColor = '#38bdf8'; break; // Tactical Cyan 400
        case 'phrase': case 'phrasal verb': typeColor = '#93c5fd'; break; // Powder Blue 300
        default:         typeColor = '#38bdf8';
      }

      const parsedLvl = parseInt(w.target_level, 10);
      const cleanLvl = !isNaN(parsedLvl) ? parsedLvl : 1;
      const cleanThCode = (w.theme_code || 'A').trim().toUpperCase();
      const rawTpCode = (w.topic_code || '1').trim();
      const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '') || rawTpCode || '1';
      const lvlPrefix = (cleanLvl === 0) ? '' : String(cleanLvl);
      const compositeCode = `${lvlPrefix}${cleanThCode}${cleanTpCode}`;
      const lexCode = topicWordIndexMap.get(w.id) || compositeCode;

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
          <td class="col-vault-lexicon-code" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="color:#38bdf8;font-family:monospace;font-size: 12px;font-weight:800;">${escapeHtml(lexCode)}</span>
          </td>
          <td class="editable-cell" style="padding: 6px 10px; color: #94a3b8; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.theme || '—')}">${escapeHtml(w.theme || '—')}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="theme" value="${escapeHtml(w.theme || '')}">
          </td>
          <td class="editable-cell" style="padding: 6px 10px; color: #94a3b8; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.topic || '')}">${escapeHtml(w.topic || '')}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="topic" value="${escapeHtml(w.topic || '')}">
          </td>
          <td class="editable-cell" style="padding: 6px 8px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="font-size:12px; color: ${typeColor}; font-weight: 700;">${escapeHtml(w.word_type || 'Vocab')}</span>
            <select class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="word_type">${typeOptionsHtml}</select>
          </td>
          <td class="editable-cell col-vault-indonesian ${mode === 'phrases' ? 'col-vault-phrase' : ''}" style="padding: 8px 12px; font-weight: 500; color: #cbd5e1; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.indonesian)}">${escapeHtml(w.indonesian)}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="indonesian" value="${escapeHtml(w.indonesian)}">
          </td>
          <td class="editable-cell col-vault-english ${mode === 'phrases' ? 'col-vault-phrase' : ''}" style="padding: 8px 12px; color: #ffffff; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" title="${escapeHtml(w.english)}">${escapeHtml(w.english)}</span>
            <input type="text" class="vault-edit-input" data-id="${escapeHtml(w.id)}" data-field="english" value="${escapeHtml(w.english)}">
          </td>
          <td class="edit-mode-only" style="padding: 6px 8px; text-align: center; width: 55px; position: sticky; right: 0; background: #0f172a; border-left: 1px solid rgba(255, 255, 255, 0.08); z-index: 5;">
            <button type="button" class="btn-del-mini" data-del-vault="${escapeHtml(w.id)}" title="Delete word" style="background:transparent;border:none;cursor:pointer;color:var(--grade-e);font-size:12px;padding:2px 4px;">${getSvgIcon('trash', 14)}</button>
          </td>
        </tr>
      `;
    }).join('');

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
            const parsedLvl = parseInt(word.target_level, 10);
            payload.target_level = !isNaN(parsedLvl) ? parsedLvl : 1;
            payload.theme_code = matchNoLvl[1];
            payload.topic_code = matchNoLvl[2];
          } else {
            payload.topic_code = cleanCode;
          }

          if (payload.target_level !== undefined) word.target_level = payload.target_level;
          if (payload.theme_code) word.theme_code = payload.theme_code;
          if (payload.topic_code) word.topic_code = payload.topic_code;

          const effLvl = payload.target_level !== undefined ? payload.target_level : word.target_level;
          const canonicalCode = effLvl === 0
            ? `${payload.theme_code || word.theme_code || 'A'}${payload.topic_code || '1'}`
            : `${effLvl}${payload.theme_code || word.theme_code || 'A'}${payload.topic_code || '1'}`;
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
          if (isNaN(parsedLvl) || parsedLvl < 0 || parsedLvl > 6) {
            input.value = word.target_level;
            input.classList.add('save-error');
            setTimeout(() => input.classList.remove('save-error'), 800);
            showToast('Level must be between 0 and 6 (0 for Non-Level).', 'warning');
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
          const lvlPrefix = (parsedLvl === 0) ? '' : String(parsedLvl);
          const newComp = `${lvlPrefix}${word.theme_code || 'A'}${cleanTp}`;
          const codeInput = tr?.querySelector('.col-vault-composite-code input');
          const codeSpan = tr?.querySelector('.col-vault-composite-code .vault-cell-view');
          if (codeInput) codeInput.value = newComp;
          if (codeSpan) codeSpan.textContent = newComp;
          const lexSpan = tr?.querySelector('.col-vault-lexicon-code .vault-cell-view');
          if (lexSpan && lexSpan.textContent.includes('-')) {
            const parts = lexSpan.textContent.split('-');
            lexSpan.textContent = `${newComp}-${parts[1]}`;
          }
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
    const program = window._vaultGridProgram || document.getElementById('vault-program-filter')?.value || '';
    let filtered = _allWords;
    if (level) filtered = filtered.filter(w => String(w.target_level) === level);
    if (topic) filtered = filtered.filter(w => w.topic === topic);
    if (wordType) {
      filtered = filtered.filter(w => {
        if (wordType === 'Vocab') return w.word_type?.toLowerCase().includes('vocab');
        return w.word_type === wordType;
      });
    }
    if (program) {
      filtered = filtered.filter(w => {
        const pName = (w.programs?.name || w.program_name || '').toLowerCase();
        const pCode = (w.programs?.code || w.program_code || '').toLowerCase();
        const filterVal = program.toLowerCase();
        return pName.includes(filterVal) || pCode.includes(filterVal);
      });
    }
    if (search) filtered = filtered.filter(w =>
      (w.indonesian || '').toLowerCase().includes(search) ||
      (w.english || '').toLowerCase().includes(search) ||
      (w.topic || '').toLowerCase().includes(search) ||
      (w.theme || '').toLowerCase().includes(search) ||
      (w.lex_code || '').toLowerCase().includes(search)
    );

    // Dynamic sort by currentSort column
    const { col: sCol, dir: sDir } = currentSort;
    filtered = [...filtered].sort((a, b) => {
      let valA = a[sCol] || '';
      let valB = b[sCol] || '';
      const cmp = sCol === 'lex_code'
        ? valA.localeCompare(valB, undefined, { numeric: true })
        : valA.localeCompare(valB);
      return sDir === 'asc' ? cmp : -cmp;
    });

    // Update sort indicator UI
    document.querySelectorAll('#vault-table thead th[data-sort] .sort-indicator').forEach(el => el.textContent = '');
    const activeInd = document.getElementById(`sort-ind-${sCol}`);
    if (activeInd) activeInd.textContent = sDir === 'asc' ? '▲' : '▼';

    renderRows(filtered);
  }

  // Bind sortable column headers
  setTimeout(() => {
    document.querySelectorAll('#vault-table thead th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (currentSort.col === col) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort = { col, dir: 'asc' };
        }
        filterAndRender();
      });
    });
  }, 50);

  setTimeout(() => {
    filterAndRender();
    const vaultTable = document.getElementById('vault-table');
    if (vaultTable && typeof window.initColumnResize === 'function') {
      window.initColumnResize(vaultTable, 'topscore_col_widths_vault-table');
    }
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
      <div class="d-flex justify-center align-center mb-4 text-center">
        <h3 class="fw-700" style="margin:0 auto;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px;">${getSvgIcon('download', 20)} Import Vocabulary &amp; Phrases from Excel (10-Column Standard)</h3>
      </div>
      <p class="text-muted text-sm mb-3">
        Upload an <strong>.xlsx</strong> file conforming to the official 10-column standard:<br>
        <code>1. Institution</code> &bull; <code>2. Program</code> &bull; <code>3. Level</code> &bull; <code>4. Category</code> &bull; <code>5. Code (A1, A2..)</code> &bull; <code>6. Theme</code> &bull; <code>7. Topic</code> &bull; <code>8. Type</code> &bull; <code>9. Indonesian</code> &bull; <code>10. English</code><br>
        <span class="text-xs" style="color: var(--primary-tactical, #38bdf8);">Unified Code: Enter <code>A1</code>, <code>A2</code>, <code>B1</code> directly. (Legacy 11-column files with separate Theme Code &amp; Topic Code are also automatically supported).</span>
      </p>

      <div class="d-flex gap-3 mb-3">
        <div style="flex:1;">
          <label class="form-label text-xs fw-700">Fallback Institution (if blank in Excel)</label>
          <select id="vault-import-inst" class="form-control" style="width:100%;font-size: 12px;">
            <option value="637fea53-ca64-4e1c-8ff7-6fd4dbdd8260">TOP</option>
            <option value="f51d4c2c-7c24-42ef-8d8f-b0f3e524a447">CEC (Central English Course)</option>
          </select>
        </div>
        <div style="flex:1;">
          <label class="form-label text-xs fw-700">Fallback Program (if blank in Excel)</label>
          <select id="vault-import-prog" class="form-control" style="width:100%;font-size: 12px;">
            <option value="">Loading programs...</option>
          </select>
        </div>
      </div>

      <div class="form-group mb-4">
        <input type="file" id="vault-excel-input" accept=".xlsx,.xls" class="form-control" />
      </div>
      <div id="import-preview-area"></div>
      <div class="d-flex gap-3 justify-between align-center mt-4 pt-3" id="import-action-row" style="border-top:1px solid rgba(255,255,255,0.08);">
        <button type="button" class="btn btn-secondary btn-sm btn-modal-close-left" id="close-import-modal-2">CLOSE</button>
        <button type="button" class="btn btn-primary btn-sm" id="confirm-import-btn" style="display:none;align-items:center;gap:4px;">${getSvgIcon('check', 14)} Import Words</button>
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

        const rawLevelVal = (normalized.LEVEL !== undefined && normalized.LEVEL !== '')
          ? normalized.LEVEL
          : ((normalized.TARGET_LEVEL !== undefined && normalized.TARGET_LEVEL !== '') ? normalized.TARGET_LEVEL : '1');

        return {
          institution_id: rowInstId,
          program_id: rowProgId,
          level: String(rawLevelVal).trim(),
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
      const allowedPhraseTypes = ['expression', 'idiom', 'proverb', 'phrase', 'phrasal verb'];
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
      const { cleanRows, duplicateConflicts } = await checkVaultDuplicates(_parsedRows, existingWords);
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
          <span style="background:rgba(var(--grade-a-rgb),0.15);color:var(--grade-a);border:1px solid rgba(var(--grade-a-rgb),0.3);padding:3px 8px;border-radius:4px;font-size: 12px;font-weight:600;">${getSvgIcon('book-open', 14)} Single Words: ${vocabRows.length} (${vocabDupes} dupes)</span>
          <span style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);padding:3px 8px;border-radius:4px;font-size: 12px;font-weight:600;">${getSvgIcon('activity', 14)} Phrases: ${phraseRows.length} (${phraseDupes} dupes)</span>
          <span style="background:rgba(99,102,241,0.1);color:#818cf8;border:1px solid rgba(99,102,241,0.25);padding:3px 8px;border-radius:4px;font-size: 12px;font-weight:600;">${getSvgIcon('search', 14)} Unique Questions: ${uniqueIndoCount}</span>
          <span style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);padding:3px 8px;border-radius:4px;font-size: 12px;font-weight:600;">${getSvgIcon('layers', 14)} Themes: ${uniqueThemes} | Topics: ${uniqueTopics}</span>
        </div>`;

      if (!duplicateConflicts.length) {
        previewArea.innerHTML = `
          <div class="p-3 rounded mb-3" style="background:rgba(var(--grade-a-rgb),0.1);border:1px solid rgba(var(--grade-a-rgb),0.3);">
            <p class="text-success fw-600 mb-1" style="display:flex;align-items:center;gap:6px;">${getSvgIcon('check', 14)} ${_parsedRows.length} total rows parsed — no conflicts detected.</p>
            ${distributionBadge}
          </div>
        `;
      } else {
        previewArea.innerHTML = `
          <div class="p-3 rounded mb-3" style="background:rgba(var(--grade-c-rgb),0.1);border:1px solid rgba(var(--grade-c-rgb),0.3);">
            <p class="fw-600 mb-1" style="color:var(--grade-c);display:flex;align-items:center;gap:6px;">${getSvgIcon('alert-triangle', 14)} ${duplicateConflicts.length} conflict(s) detected — choose an action for each:</p>
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
                  <th>INCOMING WORD</th>
                  <th>EXISTING VAULT WORD</th>
                  <th class="text-center">CONFLICT TYPE</th>
                  <th class="text-center">ACTION</th>
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
                      <span class="badge ${c.conflictType === 'EXACT' ? 'badge-danger' : 'badge-warning'}" style="font-size: 12px;">
                        ${escapeHtml(c.conflictType)}
                      </span>
                    </td>
                    <td class="text-center">
                      <select class="form-control conflict-action-sel" data-conflict-idx="${ci}" data-row-idx="${c.index}" style="font-size: 12px;padding:4px 6px;">
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

      // Show import button in action row
      const confirmBtn = document.getElementById('confirm-import-btn');
      if (confirmBtn) confirmBtn.style.display = 'inline-flex';
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
      showToast(`Import complete: ${result.inserted} inserted, ${result.updated} updated, ${result.skipped} skipped.`, 'success');
      const newWords = await fetchVaultWords({ limit: 10000, targetLevel: null, forceRefresh: true });
      onSuccess(newWords);

      // Auto-sync class tests for all imported levels in the background (Zero-Maintenance)
      const importedLevels = Array.from(new Set((_parsedRows || []).map(r => r.target_level ?? r.level).filter(v => v !== undefined && v !== null && v !== ''))).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
      if (importedLevels.length > 0) {
        Promise.all(importedLevels.map(lvl => autoSyncClassTestsForLevel(lvl, { force: true }))).then(syncResults => {
          const totalNew = syncResults.reduce((acc, r) => acc + (r.tasks || 0) + (r.tests || 0), 0);
          if (totalNew > 0) {
            showToast(`Curriculum automatically synchronized: ${totalNew} new test(s) ready for use!`, 'info');
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
      <div class="d-flex justify-center align-center mb-4 text-center">
        <h3 class="fw-700" style="margin:0 auto;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px;">${getSvgIcon('edit', 20)} ${overrides.editTest ? 'Edit' : 'Create'} Vocabulary Test</h3>
      </div>

      <!-- Step Indicators -->
      <div class="d-flex gap-2 mb-5 flex-wrap" id="step-indicators">
        ${['Scope & Tier', 'Source', 'Order & Quota', 'Schedule'].map((s, i) => `
          <div class="d-flex align-center gap-1 step-ind" data-step="${i + 1}" style="font-size: 12px;color:${i === 0 ? 'var(--clr-primary)' : 'var(--clr-text-3)'};">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
              background:${i === 0 ? 'var(--clr-primary)' : 'rgba(255,255,255,0.1)'};color:${i === 0 ? '#fff' : 'var(--clr-text-3)'};font-size: 12px;font-weight:700;">${i + 1}</span>
            ${s}${i < 3 ? '<span style="color:var(--clr-border);margin-left:6px;">→</span>' : ''}
          </div>
        `).join('')}
      </div>

      <div id="builder-step-content"></div>

      <div class="d-flex gap-3 justify-between align-center mt-5 pt-3" style="border-top:1px solid rgba(255,255,255,0.08);">
        <div class="d-flex gap-2">
          <button type="button" class="btn btn-secondary btn-sm btn-modal-close-left" id="builder-cancel-btn">CLOSE</button>
          <button type="button" class="btn btn-secondary btn-sm" id="builder-back-btn" style="display:none;">← Back</button>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="builder-next-btn">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('builder-cancel-btn')?.addEventListener('click', () => modal.remove());
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
    tier: editAsm ? (editAsm.payload?.is_standalone_tryout ? 'TRYOUT' : (editAsm.test_type?.includes('EXAM') ? 'EXAM' : 'TASK')) : (overrides.tier || 'TASK'),
    title: editAsm?.title || '',
    sourceTopic: null,
    sourceTaskIds: [],
    sourceQuizIds: [],
    selectedThemes: editAsm?.payload?.themes || ['A', 'B', 'C', 'D'],
    category: editAsm?.payload?.category || 'words',
    answerType: editAsm?.answer_type || editAsm?.payload?.answer_type || 'written',
    isStandalone: overrides.tier === 'TRYOUT' || overrides.isStandalone || false,
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
      circle.style.background = isActive ? 'var(--clr-primary)' : isDone ? 'rgba(var(--grade-a-rgb), 0.6)' : 'rgba(255,255,255,0.1)';
      circle.style.color = (isActive || isDone) ? '#fff' : 'var(--clr-text-3)';
      el.style.color = isActive ? 'var(--clr-primary)' : isDone ? 'var(--grade-a)' : 'var(--clr-text-3)';
    });
    document.getElementById('builder-back-btn').style.display = currentStep > 1 ? '' : 'none';
    document.getElementById('builder-next-btn').innerHTML = currentStep === 4 ? (state.isEdit ? 'Save Changes' : 'Create Test') : 'Next →';
  }

  function updateAutoTitle() {
    const parts = [state.institutionName, state.programName, state.levelName, state.className].filter(Boolean);
    let suffix = state.tier === 'EXAM' ? 'Exam' : (state.tier === 'TRYOUT' ? 'Placement Test' : 'Task');
    if ((state.tier === 'QUIZ' || state.tier === 'TASK') && state.sourceTopic) suffix += ` - ${state.sourceTopic}`;
    if (state.tier === 'TRYOUT') {
      const catLabel = state.category === 'phrases' ? 'Phrases' : (state.category === 'all' ? 'Comprehensive' : 'Words');
      const themesLabel = (state.selectedThemes && state.selectedThemes.length > 0) ? state.selectedThemes.join('') : 'ALL';
      suffix += ` (${catLabel} Themes ${themesLabel})`;
    }
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
          { val: 'TASK', icon: getSvgIcon('zap', 14), label: 'Task', desc: 'Single topic drill' },
          { val: 'EXAM', icon: getSvgIcon('award', 14), label: 'Exam', desc: 'Milestone aggregated exam' },
          { val: 'TRYOUT', icon: getSvgIcon('target', 14), label: 'Placement / Try-Out', desc: 'Standalone diagnostic across themes (no prerequisites)' }
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
      content.innerHTML = `<h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 2 — Select Source</h4><div id="source-area"><div class="topscore-loading-center" style="min-height: 100px !important;"><div class="spinner"></div><p class="loading-text">Loading sources...</p></div></div>`;
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
      } else if (state.tier === 'TRYOUT') {
        // PLACEMENT / STANDALONE TRYOUT STEP 2
        sourceArea.innerHTML = `
          <div class="p-3 mb-3 rounded" style="background:rgba(56, 189, 248, 0.08);border:1px solid rgba(56, 189, 248, 0.25);">
            <div class="d-flex align-center gap-2 mb-1" style="color:#38bdf8;font-weight:700;font-size:12px;">
              ${getSvgIcon('compass', 16) || getSvgIcon('target', 16)} Standalone Placement &amp; Try-Out Engine
            </div>
            <div class="text-xs" style="color:var(--clr-text-2);line-height:1.5;">
              This test operates independently from curriculum gating. Students can take it anytime without needing to complete prerequisite tasks or 7×7 repetitive mastery.
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label fw-700">Covered Themes</label>
            <p class="text-muted text-xs mb-2">Select which themes will be included in the diagnostic pool:</p>
            <div class="d-flex gap-2 flex-wrap mb-2" id="tryout-theme-checks">
              ${['A', 'B', 'C', 'D'].map(th => `
                <label class="d-flex align-center gap-2 p-2 rounded" style="cursor:pointer;border:1px solid var(--clr-border);background:rgba(255,255,255,0.02);min-width:110px;">
                  <input type="checkbox" class="tryout-theme-cb" value="${th}" ${(state.selectedThemes || ['A','B','C','D']).includes(th) ? 'checked' : ''} style="accent-color:#38bdf8;" />
                  <span class="fw-700 text-sm">Theme ${th}</span>
                </label>
              `).join('')}
            </div>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all-themes" style="font-size:12px;padding:2px 8px;">Select All Themes</button>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-clear-all-themes" style="font-size:12px;padding:2px 8px;">Clear</button>
            </div>
          </div>

          <div class="form-group mb-3">
            <label class="form-label fw-700">Item Category</label>
            <div class="d-flex gap-3 flex-wrap">
              <label class="d-flex align-center gap-2" style="cursor:pointer;">
                <input type="radio" name="tryout-category" value="words" ${(state.category || 'words') === 'words' ? 'checked' : ''} style="accent-color:#38bdf8;" />
                <span><strong>Words Only</strong> <span class="text-muted text-xs">(Vocabulary drill)</span></span>
              </label>
              <label class="d-flex align-center gap-2" style="cursor:pointer;">
                <input type="radio" name="tryout-category" value="phrases" ${state.category === 'phrases' ? 'checked' : ''} style="accent-color:#38bdf8;" />
                <span><strong>Phrases &amp; Idioms</strong> <span class="text-muted text-xs">(Phrasal patterns)</span></span>
              </label>
              <label class="d-flex align-center gap-2" style="cursor:pointer;">
                <input type="radio" name="tryout-category" value="all" ${state.category === 'all' ? 'checked' : ''} style="accent-color:#38bdf8;" />
                <span><strong>Comprehensive</strong> <span class="text-muted text-xs">(Both Words &amp; Phrases)</span></span>
              </label>
            </div>
          </div>

          <div class="form-group mb-2">
            <label class="form-label fw-700">Answer Modality</label>
            <div class="d-flex gap-3 flex-wrap">
              <label class="d-flex align-center gap-2" style="cursor:pointer;">
                <input type="radio" name="tryout-answer-type" value="written" ${(state.answerType || 'written') === 'written' ? 'checked' : ''} style="accent-color:#38bdf8;" />
                <span><strong>Written</strong> <span class="text-muted text-xs">(Spelling &amp; typing)</span></span>
              </label>
              <label class="d-flex align-center gap-2" style="cursor:pointer;">
                <input type="radio" name="tryout-answer-type" value="spoken" ${state.answerType === 'spoken' ? 'checked' : ''} style="accent-color:#38bdf8;" />
                <span><strong>Spoken</strong> <span class="text-muted text-xs">(Voice recognition)</span></span>
              </label>
              <label class="d-flex align-center gap-2" style="cursor:pointer;">
                <input type="radio" name="tryout-answer-type" value="dropdown_10" ${state.answerType === 'dropdown_10' || state.answerType === 'selection' ? 'checked' : ''} style="accent-color:#38bdf8;" />
                <span><strong>Selection</strong> <span class="text-muted text-xs">(Dropdown multiple choice)</span></span>
              </label>
            </div>
          </div>
        `;

        document.querySelectorAll('.tryout-theme-cb').forEach(cb => {
          cb.addEventListener('change', () => {
            state.selectedThemes = [...document.querySelectorAll('.tryout-theme-cb:checked')].map(c => c.value);
            updateAutoTitle();
          });
        });
        document.getElementById('btn-select-all-themes')?.addEventListener('click', () => {
          document.querySelectorAll('.tryout-theme-cb').forEach(c => c.checked = true);
          state.selectedThemes = ['A', 'B', 'C', 'D'];
          updateAutoTitle();
        });
        document.getElementById('btn-clear-all-themes')?.addEventListener('click', () => {
          document.querySelectorAll('.tryout-theme-cb').forEach(c => c.checked = false);
          state.selectedThemes = [];
          updateAutoTitle();
        });
        document.querySelectorAll('input[name="tryout-category"]').forEach(r => {
          r.addEventListener('change', () => {
            state.category = r.value;
            updateAutoTitle();
          });
        });
        document.querySelectorAll('input[name="tryout-answer-type"]').forEach(r => {
          r.addEventListener('change', () => {
            state.answerType = r.value;
          });
        });
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
              <span>Random (Default)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-order" value="sequential" ${state.questionOrder === 'sequential' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>Sequential (Vault Order)</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Quota</label>
          <div class="d-flex flex-column gap-2">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-quota" value="full" ${state.quotaMode === 'full' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>All Questions (100% Full — Default)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-quota" value="custom" ${state.quotaMode === 'custom' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>Custom Sample (Stratified)</span>
            </label>
          </div>
          <div id="custom-quota-area" style="display:${state.quotaMode === 'custom' ? 'block' : 'none'};margin-top:0.75rem;">
            <input type="number" class="form-control" id="custom-quota-input" min="1" placeholder="Number of questions to sample" value="${state.customQuota || ''}" style="max-width:240px;" />
            <p class="text-muted text-xs mt-1">Words will be sampled proportionally across all source topics (stratified sampling).</p>
            ${state.tier === 'TRYOUT' ? `
              <div class="d-flex gap-2 mt-2 flex-wrap" id="tryout-quota-presets">
                <button type="button" class="btn btn-secondary btn-sm" data-q="30" style="font-size:12px;padding:2px 8px;">30 Items (Quick Diagnostic)</button>
                <button type="button" class="btn btn-secondary btn-sm" data-q="50" style="font-size:12px;padding:2px 8px;">50 Items (Standard Placement)</button>
                <button type="button" class="btn btn-secondary btn-sm" data-q="100" style="font-size:12px;padding:2px 8px;">100 Items (Comprehensive)</button>
              </div>
            ` : ''}
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
      document.querySelectorAll('#tryout-quota-presets button').forEach(btn => {
        btn.addEventListener('click', () => {
          const q = parseInt(btn.dataset.q, 10);
          state.customQuota = q;
          const input = document.getElementById('custom-quota-input');
          if (input) input.value = q;
        });
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
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 4 — Schedule <span style="color:#38bdf8;font-size: 12px;">(WITA / GMT+8)</span></h4>

        <div class="form-group">
          <label class="form-label">Schedule Mode</label>
          <div class="d-flex gap-3 flex-wrap">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="sched-mode" value="batch" ${state.scheduleMode === 'batch' || state.scheduleMode === 'flexible' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>Batch Duration (Flexible Self-Paced)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="sched-mode" value="manual" ${state.scheduleMode === 'manual' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>Tutor Live Control (Manual Toggle / In-Class)</span>
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
          <p class="text-xs text-muted mb-1" style="display:flex;align-items:center;gap:6px;">${getSvgIcon('info', 14)} All times are in <strong>WITA (GMT+8, Asia/Makassar)</strong>. The system will convert to UTC for storage.</p>
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
      if (state.tier === 'TRYOUT' && (!state.selectedThemes || !state.selectedThemes.length)) {
        showToast('Please select at least one theme for the placement test.', 'warning'); return;
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
          showToast(`Test saved successfully.`, 'success');
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
            answerType: state.answerType || (state.testType === 'IDIOM_PROVERB' ? 'dropdown_10' : 'written'),
            isStandalone: state.tier === 'TRYOUT',
            selectedThemes: state.selectedThemes || ['A', 'B', 'C', 'D'],
            category: state.category || 'words'
          });
          hideLoading();
          modal.remove();
          const tierLabel = state.tier === 'TRYOUT' ? 'Placement Test' : state.tier;
          showToast(`${tierLabel} created: "${result.title}" — ${result.sampledWords} questions.`, 'success');
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
  const levelsSet = new Set([0, 1, 2, 3]);
  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10);
    if (!isNaN(lvl)) levelsSet.add(lvl);
  });
  const levels = Array.from(levelsSet).sort((a, b) => a - b);

  // Map: level -> Map(themeCode -> themeObj)
  const levelGroups = new Map();
  levels.forEach(lvl => levelGroups.set(lvl, new Map()));

  (words || []).forEach(w => {
    const parsedLvl = parseInt(w.target_level, 10);
    const lvl = !isNaN(parsedLvl) ? parsedLvl : 3;
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
    const rawTpCode = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : `${thCode}1`;
    // Clean topic code: strip leading theme letters so 'A1', 'G1', and '1' all normalize to '1'
    const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '').trim() || rawTpCode;
    const normTopicName = tpName.toLowerCase().trim();

    // Grouping key: topics sharing level, theme code, clean topic code, and topic name automatically merge
    const tpKey = `${cleanTpCode}::${normTopicName}`;

    if (!thObj.topicsMap.has(tpKey)) {
      thObj.topicsMap.set(tpKey, {
        topicCode: cleanTpCode,
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
        wCount += (tp.wordsCount || tp.totalWords || 0);
        pCount += (tp.phrasesCount || tp.totalPhrases || 0);
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
        <input type="search" id="vault-topic-search" placeholder="Search Theme or Topic..." value="${escapeHtml(window._vaultTopicSearchQuery || '')}" style="width: 200px; height: 32px; font-size: 12px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 10px; outline: none;">

        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn btn-tactical btn-sm btn-theme-curriculum-tab ${activeLevel === 'ALL' ? 'active' : ''}" data-lvl="ALL" style="height: 28px; font-size: 12px; font-weight: 800; padding: 0 10px; border-radius: 4px;">${getSvgIcon('target', 14)} ALL (${totalTopicsAll})</button>
          ${levels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const count = levelStats[lvl]?.topics || 0;
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`;
            const displayLbl = lvl === 0 ? '— (NON-LVL)' : shortLbl;
            return `<button type="button" class="btn btn-tactical btn-sm btn-theme-curriculum-tab ${isActive ? 'active' : ''}" data-lvl="${lvl}" style="height: 28px; font-size: 12px; font-weight: 800; padding: 0 10px; border-radius: 4px;">${displayLbl} (${count})</button>`;
          }).join('')}
        </div>

        <!-- Program Quick Filter Pills (Phase 432) -->
        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn btn-success btn-sm btn-theme-prog-tab ${(window._vaultActiveProgramFilter || 'ALL') === 'ALL' ? 'active' : ''}" data-prog="ALL" style="height: 28px; font-size: 12px; font-weight: 800; padding: 0 8px; border-radius: 4px;">PROG: ALL</button>
          ${(() => {
            const seen = new Set();
            const progs = [];
            allOrderedProgs.forEach(p => {
              if (p && p.name && !seen.has(p.name)) {
                seen.add(p.name);
                progs.push(p);
              }
            });
            const curP = window._vaultActiveProgramFilter || 'ALL';
            return progs.map(p => {
              const code = (p.code || p.name).toUpperCase().slice(0, 4);
              const isPActive = (curP === p.id || curP === p.name || curP === code);
              return `<button type="button" class="btn-theme-prog-tab" data-prog="${escapeHtml(p.name)}" style="height: 28px; font-size: 12px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; ${isPActive ? 'background: var(--grade-a); color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">${escapeHtml(code)}</button>`;
            }).join('');
          })()}
        </div>

        <div class="bottom-info-chip"><span class="chip-label">Themes:</span><span class="chip-val">${activeThemesCount}</span></div>
        <div class="bottom-info-chip"><span class="chip-label">Topics:</span><span class="chip-val">${activeTopicsCount}</span></div>
        <div class="bottom-info-chip"><span class="chip-label">Vault:</span><span class="chip-val">${words.length}</span></div>
      </div>
    `;

    const isEditOn = document.body.classList.contains('global-edit-mode-on') || Boolean(window._globalEditMode);
    const editBtnStyle = isEditOn
      ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);'
      : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
    const editBtnLabel = isEditOn
      ? `${getSvgIcon('check-circle', 14)} Done Editing`
      : `${getSvgIcon('edit', 14)} Edit Mode`;

    const rightHtml = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <button type="button" class="btn btn-sm" id="btn-toggle-theme-edit-mode" style="${editBtnStyle}" title="Toggle Inline Edit Mode (Excel Gridlines)">${editBtnLabel}</button>
        <button class="btn btn-secondary btn-sm" id="btn-theme-sync-tests" style="height: 30px; font-size: 12px; padding: 0 10px; font-weight: 700; background: rgba(149,255,0,0.12); border: 1px solid rgba(149,255,0,0.35); color: var(--quad-c, #95ff00); border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Synchronize all test shells with latest Theme Manager hierarchy">${getSvgIcon('refresh', 14)} Sync Tests</button>
        <button class="btn btn-secondary btn-sm edit-mode-only" id="btn-theme-bottom-merge" style="height: 30px; font-size: 12px; padding: 0 10px; font-weight: 600; background: rgba(30,41,59,0.85); border: 1px solid rgba(255,255,255,0.15); color: #38bdf8; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Merge Similar Topics">${getSvgIcon('zap', 14)} Merge Topics</button>
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

    const toggleEditBtn = document.getElementById('btn-toggle-theme-edit-mode');
    if (toggleEditBtn) {
      toggleEditBtn.onclick = () => {
        if (typeof window.toggleGlobalEditMode === 'function') {
          const newState = window.toggleGlobalEditMode();
          syncThemeManagerBottomBar();
          showToast(newState ? 'Theme Manager Edit Mode ON (Inline Excel Grid)' : 'Edit Mode OFF', newState ? 'info' : 'success');
        }
      };
    }

    const themeSyncBtn = document.getElementById('btn-theme-sync-tests');
    if (themeSyncBtn && !themeSyncBtn.dataset.bound) {
      themeSyncBtn.dataset.bound = 'true';
      themeSyncBtn.addEventListener('click', async () => {
        try {
          const oldHtml = themeSyncBtn.innerHTML;
          themeSyncBtn.innerHTML = `${getSvgIcon('clock', 14)} Syncing...`;
          themeSyncBtn.disabled = true;
          showLoading('Synchronizing Tests with Theme Manager...');

          const targetLvl = activeLevel !== 'ALL' ? Number(activeLevel) : null;
          const syncRes = await syncAllCurriculumTests({ level: targetLvl });

          hideLoading();
          themeSyncBtn.innerHTML = oldHtml;
          themeSyncBtn.disabled = false;
          showToast(`Curriculum & Tests synchronized: ${syncRes.createdCount} new test shells created, ${syncRes.updatedCount} updated!`, 'success');
        } catch (syncErr) {
          hideLoading();
          themeSyncBtn.innerHTML = `${getSvgIcon('refresh', 14)} Sync Tests`;
          themeSyncBtn.disabled = false;
          showToast('Sync failed: ' + syncErr.message, 'error');
        }
      });
    }

    if (!window._themeManagerEditModeListenerBound) {
      window._themeManagerEditModeListenerBound = true;
      window.addEventListener('admin-edit-mode-changed', () => {
        syncThemeManagerBottomBar();
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

    document.querySelectorAll('.btn-theme-prog-tab').forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
          const targetProg = e.currentTarget.getAttribute('data-prog');
          window._vaultActiveProgramFilter = targetProg;
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
          const container = document.getElementById('admin-content-area') || document.getElementById('classes-detail-canvas');
          if (container && typeof renderVocabularyVault === 'function') {
            renderVocabularyVault(container);
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

      // Sort themes alphabetically A-Z by name
      const themeList = Array.from(themesMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        const assignedProgs = allOrderedProgs.filter(p => assignSet.has(`${thCode}_${lvl}_${p.id}`));
        const thTopicCount = th.topicsMap.size;
        const thTotalWords = Array.from(th.topicsMap.values()).reduce((sum, t) => sum + (t.totalCount || 0), 0);

        // Program Filter Check
        const activeProgFilter = window._vaultActiveProgramFilter || 'ALL';
        if (activeProgFilter !== 'ALL') {
          const hasProg = assignedProgs.some(p => p.id === activeProgFilter || p.name === activeProgFilter || (p.code || '').toUpperCase() === activeProgFilter.toUpperCase());
          if (!hasProg) return;
        }

        // Sort topics alphabetically A-Z by name
        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || th.code.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (topics.length === 0) return;
        visibleTopicsCount += topics.length;

        // Assigned programs — Rule 11: single-line compact 3–4 letter short codes
        const PROG_SHORT_CODE = {
          'Camp': 'CMP', 'Evnikom': 'EVN', 'Sheraton': 'SHR', 'English Explorer': 'EXP'
        };
        const progFullNames = assignedProgs.map(p => p.name).join(', ');
        const assignedPillsHtml = assignedProgs.length > 0
          ? `<span class="vault-programs-cell" title="${escapeHtml(progFullNames)}">${
              assignedProgs.map(p => {
                const code = PROG_SHORT_CODE[p.name] || (p.code || p.name).toUpperCase().slice(0, 4);
                return `<span class="prog-chip" style="display:inline-flex;align-items:center;gap:3px;color:var(--grade-a);font-size: 12px;font-weight:500;"><span class="status-dot online"></span> ${code}</span>`;
              }).join('<span style="color:#334155;font-size: 12px;padding:0 1px;">·</span>')
            }</span>`
          : `<span style="color:#64748b;font-size: 12px;">—</span>`;

        topics.forEach(tp => {
          const cleanTopicCode = (tp.topicCode || '1').trim().replace(/^[A-Za-z]+/, '') || (tp.topicCode || '1');
          const cleanThemeCode = (thCode || 'A').trim().toUpperCase();
          const lvlPrefix = (lvl === 0) ? '' : String(lvl);
          const compositeCode = `${lvlPrefix}${cleanThemeCode}${cleanTopicCode}`;

          rowsHtml += `
            <tr class="blueprint-table-row" data-level="${lvl}" data-theme-code="${thCode}" data-topic="${escapeHtml(tp.name)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <!-- 1. LVL -->
              <td class="editable-cell" style="text-align: center; font-weight: 500; font-size: 12px; color: ${lvl === 0 ? '#94a3b8' : '#38bdf8'}; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(lvlLabel)}</span>
                <input type="number" min="0" max="6" class="vault-edit-input" data-action="edit-level" data-topic="${escapeHtml(tp.name)}" data-old-lvl="${lvl}" data-th-code="${thCode}" value="${lvl}" style="text-align:center;">
              </td>
              <!-- 2. TH-CD -->
              <td class="editable-cell" style="text-align: center; color: ${(['A','B','C','D'].includes(thCode)) ? `var(--quad-${thCode.toLowerCase()})` : '#a5b4fc'}; font-family: monospace; font-weight: 700; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(thCode)}</span>
                <input type="text" maxlength="4" class="vault-edit-input" data-action="edit-theme-code" data-old-th-code="${thCode}" data-lvl="${lvl}" value="${escapeHtml(thCode)}" style="text-align:center; text-transform:uppercase;">
              </td>
              <!-- 3. THEME -->
              <td class="editable-cell" style="color: ${(['A','B','C','D'].includes(thCode)) ? `var(--quad-${thCode.toLowerCase()})` : '#ffffff'}; font-weight: 700; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(th.name || '—')}</span>
                <input type="text" class="vault-edit-input" data-action="edit-theme-name" data-old-theme="${escapeHtml(th.name)}" data-lvl="${lvl}" data-th-code="${thCode}" value="${escapeHtml(th.name || '')}">
              </td>
              <!-- 4. TP-CD -->
              <td class="editable-cell" style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(cleanTopicCode)}</span>
                <input type="text" maxlength="6" class="vault-edit-input" data-action="edit-topic-code" data-topic="${escapeHtml(tp.name)}" data-old-tp-code="${escapeHtml(cleanTopicCode)}" data-lvl="${lvl}" data-th-code="${thCode}" value="${escapeHtml(cleanTopicCode)}" style="text-align:center;">
              </td>
              <!-- 5. TOPIC NAME -->
              <td class="editable-cell" style="color: #f1f5f9; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);">
                <span class="vault-cell-view">${escapeHtml(tp.name)}</span>
                <input type="text" class="vault-edit-input" data-action="edit-topic-name" data-old-topic="${escapeHtml(tp.name)}" data-lvl="${lvl}" data-th-code="${thCode}" value="${escapeHtml(tp.name)}">
              </td>
              <!-- 6. CODE (Boundary Column 1) -->
              <td class="col-theme-composite-code super-hdr-divider" style="text-align: center; font-family: monospace; font-weight: 800; color: #38bdf8; font-size: 12px; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                ${escapeHtml(compositeCode)}
              </td>
              <!-- 7. VERB -->
              <td style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">
                <span style="color: ${tp.verbCount > 0 ? '#93c5fd' : '#334155'}; font-weight: ${tp.verbCount > 0 ? '600' : '400'};">${tp.verbCount}</span>
              </td>
              <!-- 8. NOUN -->
              <td style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">
                <span style="color: ${tp.nounCount > 0 ? '#93c5fd' : '#334155'}; font-weight: ${tp.nounCount > 0 ? '600' : '400'};">${tp.nounCount}</span>
              </td>
              <!-- 9. ADJ -->
              <td style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">
                <span style="color: ${tp.adjCount > 0 ? '#93c5fd' : '#334155'}; font-weight: ${tp.adjCount > 0 ? '600' : '400'};">${tp.adjCount}</span>
              </td>
              <!-- 10. OTH (Words - Boundary Column 2) -->
              <td class="super-hdr-divider" style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                <span style="color: ${tp.wordsOtherCount > 0 ? '#93c5fd' : '#334155'}; font-weight: ${tp.wordsOtherCount > 0 ? '600' : '400'};">${tp.wordsOtherCount}</span>
              </td>
              <!-- 11. EXP -->
              <td style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">
                <span style="color: ${tp.expCount > 0 ? '#d8b4fe' : '#334155'}; font-weight: ${tp.expCount > 0 ? '600' : '400'};">${tp.expCount}</span>
              </td>
              <!-- 12. PRV -->
              <td style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">
                <span style="color: ${tp.prvCount > 0 ? '#d8b4fe' : '#334155'}; font-weight: ${tp.prvCount > 0 ? '600' : '400'};">${tp.prvCount}</span>
              </td>
              <!-- 13. IDM -->
              <td style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 1px solid rgba(255,255,255,0.08);">
                <span style="color: ${tp.idmCount > 0 ? '#d8b4fe' : '#334155'}; font-weight: ${tp.idmCount > 0 ? '600' : '400'};">${tp.idmCount}</span>
              </td>
              <!-- 14. OTH (Phrases - Boundary Column 3) -->
              <td class="super-hdr-divider" style="padding: 6px 2px; text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 600; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                <span style="color: ${tp.phrasesOtherCount > 0 ? '#d8b4fe' : '#334155'}; font-weight: ${tp.phrasesOtherCount > 0 ? '600' : '400'};">${tp.phrasesOtherCount}</span>
              </td>
              <!-- 15. WORDS -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 800; color: #60a5fa; background: rgba(59, 130, 246, 0.08); border-right: 1px solid rgba(255,255,255,0.08);">${tp.wordsCount}</td>
              <!-- 16. PHRASES -->
              <td style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 800; color: #c084fc; background: rgba(192, 132, 252, 0.08); border-right: 1px solid rgba(255,255,255,0.1);">${tp.phrasesCount}</td>
              <!-- 17. TOTAL (Boundary Column 4) -->
              <td class="super-hdr-divider" style="text-align: center; font-size: 12px; font-variant-numeric: tabular-nums; font-weight: 800; color: #38bdf8; background: rgba(56, 189, 248, 0.1); border-right: 2px solid rgba(255,255,255,0.22) !important;">${tp.totalCount}</td>
              <!-- 18. PROGRAMS (Boundary Column 5) -->
              <td class="super-hdr-divider" style="padding: 6px 10px; font-size: 12px; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                <div style="display:flex; align-items:center; justify-content:space-between; gap:6px;">
                  <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
                    ${assignedPillsHtml}
                  </div>
                  <button type="button" class="btn btn-xs btn-assign-pill edit-mode-only" data-theme-code="${thCode}" data-level="${lvl}" data-theme-name="${escapeHtml(th.name)}" style="background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);color:#a5b4fc;font-size: 12px;font-weight:700;padding:2px 8px;border-radius:4px;cursor:pointer;" title="Assign to Institutions &amp; Programs">
                    ${getSvgIcon('settings', 12)} Assign
                  </button>
                </div>
              </td>
              <!-- 19. ACT (Delete Topic or Delete Theme when Edit ON) -->
              <td class="edit-mode-only" style="padding: 4px 4px; text-align: center; width: 65px; border-left: 1px solid rgba(255, 255, 255, 0.1); white-space: nowrap;">
                <div style="display:inline-flex; align-items:center; justify-content:center; gap:3px;">
                  <button type="button" class="btn-del-topic-mini" data-topic="${escapeHtml(tp.name)}" data-level="${lvl}" data-theme-code="${thCode}" data-theme="${escapeHtml(th.name)}" data-item-count="${tp.totalCount}" title="Delete Topic '${escapeHtml(tp.name)}' (${tp.totalCount} items)" style="height:22px; font-size:12px; font-weight:800; padding:0 4px; background:rgba(255,0,0,0.18); border:1px solid rgba(255,0,0,0.45); color:var(--grade-e); border-radius:3px; cursor:pointer; display:inline-flex; align-items:center; gap:2px; line-height:1;">
                    ${getSvgIcon('trash', 11)} <span>TP</span>
                  </button>
                  <button type="button" class="btn-del-theme-mini" data-theme="${escapeHtml(th.name)}" data-theme-code="${thCode}" data-level="${lvl}" data-topic-count="${thTopicCount}" data-word-count="${thTotalWords}" title="Delete entire Theme '${escapeHtml(th.name)}' (${thCode}) and all ${thTopicCount} topics" style="height:22px; font-size:12px; font-weight:800; padding:0 4px; background:rgba(255,140,0,0.18); border:1px solid rgba(255,140,0,0.45); color:var(--grade-d); border-radius:3px; cursor:pointer; display:inline-flex; align-items:center; gap:2px; line-height:1;">
                    ${getSvgIcon('trash', 11)} <span>TH</span>
                  </button>
                </div>
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
    <div style="display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', sans-serif;">

      <!-- Modernized Flat Data Table (Flush to top, only table container scrolls) -->
      <div class="table-wrap sticky-first" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden !important; background: #0f172a; border: 2px solid rgba(255, 255, 255, 0.28) !important; border-radius: 0; margin: 0;">
        <table id="theme-manager-flat-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 12px;">
          <colgroup>
            <col style="width: 45px;">
            <col style="width: 48px;">
            <col style="width: 140px;">
            <col style="width: 48px;">
            <col style="min-width: 240px;">
            <col style="width: 50px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 30px;">
            <col style="width: 52px;">
            <col style="width: 58px;">
            <col style="width: 52px;">
            <col style="width: 105px;">
            <col class="edit-mode-only" style="width: 65px;">
          </colgroup>
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 20;">
            <!-- Super-Headers Grouping (Dark Surface with Themed Colored Fonts SSOT §2.34 & Rule 4.11) -->
            <tr>
              <th colspan="6" class="super-th super-hdr" style="background:#0b1120 !important; color:#ffffff !important; font-size: 12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">HIERARCHY &amp; IDENTITY</th>
              <th colspan="4" class="super-th super-hdr" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; font-size: 12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(56,189,248,0.35);">WORDS BREAKDOWN</th>
              <th colspan="4" class="super-th super-hdr" style="background:#0b1120 !important; color:var(--quad-a, #ff2d87) !important; font-size: 12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(255,45,135,0.35);">PHRASES BREAKDOWN</th>
              <th colspan="3" class="super-th super-hdr" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; font-size: 12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(149,255,0,0.35);">METRICS SUMMARY</th>
              <th rowspan="2" class="super-th super-hdr-divider" style="background:#0b1120 !important; color:#ffffff !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; vertical-align:middle; height:60px;" title="Assigned Programs">PROGRAMS</th>
              <th rowspan="2" class="edit-mode-only" style="background:#0b1120 !important; color:var(--grade-e, #ff0000) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 6px; border-bottom:1px solid rgba(255,255,255,0.18); vertical-align:middle; height:60px; text-shadow:0 0 10px rgba(255,0,0,0.35);" title="Action">ACT</th>
            </tr>
            <!-- Sub-Headers (Matching Themed Parent Colors on Dark Surface SSOT) -->
            <tr>
              <!-- 1. LVL -->
              <th style="padding: 6px 8px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; font-size: 12px; width: 45px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Level">LVL</th>
              <!-- 2. TH-CD -->
              <th style="padding: 6px 4px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; font-size: 12px; width: 48px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Theme Letter Code (e.g. A, B, G)">TH-CD</th>
              <!-- 3. THEME -->
              <th style="padding: 6px 8px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; font-size: 12px; width: 140px; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Theme Name">THEME</th>
              <!-- 4. TP-CD -->
              <th style="padding: 6px 4px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; font-size: 12px; width: 48px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Topic Number Code (e.g. 1, 2)">TP-CD</th>
              <!-- 5. TOPIC NAME (Flex Primary) -->
              <th style="padding: 6px 8px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; font-size: 12px; min-width: 240px; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Topic Name">TOPIC NAME</th>
              <!-- 6. CODE (Boundary Column 1) -->
              <th class="super-hdr-divider" style="padding: 6px 4px; font-weight: 700; color: #ffffff !important; text-transform: uppercase; font-size: 12px; width: 50px; text-align: center; border-right: 2px solid rgba(255,255,255,0.22) !important; background: #0b1120 !important; height:30px; line-height:30px;" title="Composite Code (e.g. 1G1)">CODE</th>

              <!-- 7. VERB -->
              <th style="padding: 6px 2px; font-weight: 700; color: var(--primary-tactical, #38bdf8) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Verb Count">VERB</th>
              <!-- 8. NOUN -->
              <th style="padding: 6px 2px; font-weight: 700; color: var(--primary-tactical, #38bdf8) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Noun Count">NOUN</th>
              <!-- 9. ADJ -->
              <th style="padding: 6px 2px; font-weight: 700; color: var(--primary-tactical, #38bdf8) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Adjective Count">ADJ</th>
              <!-- 10. OTH (Boundary Column 2) -->
              <th class="super-hdr-divider" style="padding: 6px 2px; font-weight: 700; color: var(--primary-tactical, #38bdf8) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 2px solid rgba(255,255,255,0.22) !important; background: #0b1120 !important; height:30px; line-height:30px;" title="Words Other (Adverbs, etc.)">OTH</th>

              <!-- 11. EXP -->
              <th style="padding: 6px 2px; font-weight: 700; color: var(--quad-a, #ff2d87) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Expression Count">EXP</th>
              <!-- 12. PRV -->
              <th style="padding: 6px 2px; font-weight: 700; color: var(--quad-a, #ff2d87) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Proverb Count">PRV</th>
              <!-- 13. IDM -->
              <th style="padding: 6px 2px; font-weight: 700; color: var(--quad-a, #ff2d87) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Idiom Count">IDM</th>
              <!-- 14. OTH (Boundary Column 3) -->
              <th class="super-hdr-divider" style="padding: 6px 2px; font-weight: 700; color: var(--quad-a, #ff2d87) !important; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 2px solid rgba(255,255,255,0.22) !important; background: #0b1120 !important; height:30px; line-height:30px;" title="Phrases Other (Phrasal verbs, etc.)">OTH</th>

              <!-- 15. WORDS -->
              <th style="padding: 6px 4px; font-weight: 700; color: var(--grade-b, #95ff00) !important; text-transform: uppercase; font-size: 12px; width: 52px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Total Single Words">WORDS</th>
              <!-- 16. PHRASES -->
              <th style="padding: 6px 4px; font-weight: 700; color: var(--grade-b, #95ff00) !important; text-transform: uppercase; font-size: 12px; width: 58px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); background: #0b1120 !important; height:30px; line-height:30px;" title="Total Phrases &amp; Idioms">PHRASES</th>
              <!-- 17. TOTAL (Boundary Column 4) -->
              <th class="super-hdr-divider" style="padding: 6px 4px; font-weight: 700; color: var(--grade-b, #95ff00) !important; text-transform: uppercase; font-size: 12px; width: 52px; text-align: center; border-right: 2px solid rgba(255,255,255,0.22) !important; background: #0b1120 !important; height:30px; line-height:30px;" title="Grand Total Vocabulary">TOTAL</th>
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

    // Delete Topic (Individual topic and all its vocabulary)
    area.querySelectorAll('.btn-del-topic-mini').forEach(btn => {
      btn.onclick = async (e) => {
        const topic = e.currentTarget.getAttribute('data-topic');
        const lvl = parseInt(e.currentTarget.getAttribute('data-level'), 10);
        const thCode = e.currentTarget.getAttribute('data-theme-code');
        const thName = e.currentTarget.getAttribute('data-theme') || '';
        const itemCount = e.currentTarget.getAttribute('data-item-count') || '';

        const itemStr = itemCount ? ` (${itemCount} items)` : '';
        if (!confirm(`Are you sure you want to delete Topic "${topic}"${itemStr} at Level ${lvl} and all its vocabulary items from Vault?\n\nThis cannot be undone.`)) return;

        try {
          showLoading('Deleting topic...');
          await deleteVaultTopic(topic, lvl, thCode);
          hideLoading();
          showToast(`Topic "${topic}" deleted.`, 'success');
          const mainArea = document.getElementById('admin-content-area') || area;
          if (mainArea && typeof renderVocabularyVault === 'function') {
            await renderVocabularyVault(mainArea);
          }
        } catch (err) {
          hideLoading();
          showToast(`Failed to delete topic: ${err.message}`, 'error');
        }
      };
    });

    // Delete Entire Theme (All topics & vocabulary in this theme at this level)
    area.querySelectorAll('.btn-del-theme-mini').forEach(btn => {
      btn.onclick = async (e) => {
        const thName = e.currentTarget.getAttribute('data-theme');
        const thCode = e.currentTarget.getAttribute('data-theme-code');
        const lvl = parseInt(e.currentTarget.getAttribute('data-level'), 10);
        const topicCount = e.currentTarget.getAttribute('data-topic-count') || '';
        const wordCount = e.currentTarget.getAttribute('data-word-count') || '';

        const countMsg = topicCount ? `This will permanently delete ${topicCount} topic(s)${wordCount ? ` and ${wordCount} vocabulary item(s)` : ''} under this theme from Vault.` : 'This will permanently delete all topics and vocabulary items under this theme from Vault.';

        if (!confirm(`DANGER: Delete ENTIRE Theme "${thName}" (${thCode}) at Level ${lvl}?\n\n${countMsg}\n\nThis action cannot be undone. Continue?`)) return;

        try {
          showLoading('Deleting theme...');
          await deleteVaultTheme(thName, lvl, thCode);
          hideLoading();
          showToast(`Theme "${thName}" (${thCode}) and all its topics deleted.`, 'success');
          const mainArea = document.getElementById('admin-content-area') || area;
          if (mainArea && typeof renderVocabularyVault === 'function') {
            await renderVocabularyVault(mainArea);
          }
        } catch (err) {
          hideLoading();
          showToast(`Failed to delete theme: ${err.message}`, 'error');
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

              const delThBtn = row.querySelector('.btn-del-theme-mini');
              if (delThBtn) delThBtn.setAttribute('data-theme', newVal);
              const delTpBtn = row.querySelector('.btn-del-topic-mini');
              if (delTpBtn) delTpBtn.setAttribute('data-theme', newVal);
            });

            // Update in-memory array
            words.forEach(w => {
              if (String(w.theme_code).toUpperCase() === thCode && parseInt(w.target_level, 10) === lvl) {
                w.theme = newVal;
              }
            });
            showToast(`Theme renamed to "${newVal}" across Level ${lvl}`, 'success');
            autoSyncClassTestsForLevel(lvl, { force: true }).catch(err => console.warn('[ThemeManager] Auto-sync notice:', err));

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

              const delThBtn = row.querySelector('.btn-del-theme-mini');
              if (delThBtn) delThBtn.setAttribute('data-theme-code', cleanNewCode);
              const delTpBtn = row.querySelector('.btn-del-topic-mini');
              if (delTpBtn) delTpBtn.setAttribute('data-theme-code', cleanNewCode);
              const assignBtn = row.querySelector('.btn-assign-pill');
              if (assignBtn) assignBtn.setAttribute('data-theme-code', cleanNewCode);

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
            autoSyncClassTestsForLevel(lvl, { force: true }).catch(err => console.warn('[ThemeManager] Auto-sync notice:', err));

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
            autoSyncClassTestsForLevel(lvl, { force: true }).catch(err => console.warn('[ThemeManager] Auto-sync notice:', err));

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

            // Recalculate column 6 CODE in this row
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
            if (isNaN(newLvl) || newLvl < 0 || newLvl > 6) {
              input.value = oldLvl;
              input.classList.add('save-error');
              setTimeout(() => input.classList.remove('save-error'), 800);
              showToast('Level must be between 0 and 6 (0 for Non-Level).', 'warning');
              return;
            }
            if (newLvl === oldLvl) return;

            const thCode = String(input.dataset.thCode || '').trim().toUpperCase();

            // Cascade theme level across vocabulary_vault and theme_program_assignments
            await updateVaultThemeLevelCascade(thCode, oldLvl, newLvl);

            // Synchronize all rows belonging to the same theme and level in the DOM
            const allThemeRows = tbody.querySelectorAll(`tr[data-theme-code="${thCode}"][data-level="${oldLvl}"]`);
            allThemeRows.forEach(row => {
              row.setAttribute('data-level', newLvl);
              const lvlInp = row.querySelector('[data-action="edit-level"]');
              const lvlCell = lvlInp?.closest('td');
              const lvlSpan = lvlCell?.querySelector('.vault-cell-view');
              if (lvlInp) {
                lvlInp.value = newLvl;
                lvlInp.dataset.oldLvl = newLvl;
                lvlInp.classList.add('save-success');
                setTimeout(() => lvlInp.classList.remove('save-success'), 700);
              }
              if (lvlSpan) {
                const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(newLvl) : (newLvl === 0 ? '0' : `${newLvl}ST`);
                lvlSpan.textContent = shortLbl.toUpperCase();
              }
              if (lvlCell) {
                lvlCell.style.color = newLvl === 0 ? '#94a3b8' : '#38bdf8';
              }

              const delTpBtn = row.querySelector('.btn-del-topic-mini');
              if (delTpBtn) delTpBtn.setAttribute('data-level', newLvl);
              const delThBtn = row.querySelector('.btn-del-theme-mini');
              if (delThBtn) delThBtn.setAttribute('data-level', newLvl);
              const assignBtn = row.querySelector('.btn-assign-pill');
              if (assignBtn) assignBtn.setAttribute('data-level', newLvl);

              // Recalculate column 6 CODE in this row
              const currentTpCode = row.querySelector('[data-action="edit-topic-code"]')?.value.trim() || '1';
              const newComp = `${newLvl}${thCode}${currentTpCode}`;
              const compTd = row.querySelector('.col-theme-composite-code');
              if (compTd) compTd.textContent = newComp;
            });

            // Update in-memory array
            words.forEach(w => {
              if (String(w.theme_code).toUpperCase() === thCode && parseInt(w.target_level, 10) === oldLvl) {
                w.target_level = newLvl;
              }
            });
            showToast(`Theme ${thCode} moved to Level ${newLvl === 0 ? '0 (Non-Level)' : newLvl}.`, 'success');
            autoSyncClassTestsForLevel(newLvl, { force: true }).catch(err => console.warn('[ThemeManager] Auto-sync notice:', err));
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

  const themeTable = document.getElementById('theme-manager-flat-table');
  if (themeTable && typeof window.initColumnResize === 'function') {
    window.initColumnResize(themeTable, 'topscore_col_widths_theme-manager-flat-table');
  }
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
          <h3 style="margin:0; font-size: 16px; font-weight:800; color:#f8fafc;">${getSvgIcon('building', 16)} Assign Theme to Programs</h3>
          <div style="font-size:12px; color:#38bdf8; margin-top:2px;">Theme: <strong>${escapeHtml(themeName)}</strong> (${escapeHtml(themeCode)}) &bull; Level ${targetLevel}</div>
        </div>
      </div>

      <p style="font-size: 12px; color:#94a3b8; margin-bottom:14px;">
        Specify which Institution and Program uses this theme. All topics under this theme automatically inherit these assignments.
      </p>

      <div style="display:flex; flex-direction:column; gap:12px; max-height:360px; overflow-y:auto; padding-right:4px;">
        ${instProgGroups.map(g => `
          <div style="background:rgba(30,41,59,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px 12px;">
            <div style="font-size: 12px; font-weight:800; text-transform:uppercase; color:#a5b4fc; margin-bottom:8px; letter-spacing:0.5px;">
              ${escapeHtml(g.inst.name || g.inst.code)}
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap:8px;">
              ${g.programs.map(p => {
                const assignKey = `${themeCode}_${targetLevel}_${p.id}`;
                const checked = assignSet.has(assignKey);
                return `
                  <label style="display:flex; align-items:center; gap:8px; background:rgba(15,23,42,0.8); border:1px solid rgba(255,255,255,0.1); padding:8px 10px; border-radius:6px; cursor:pointer; font-size: 12px; color:#f1f5f9; font-weight:600;">
                    <input type="checkbox" class="cb-theme-assign-prog" data-prog-id="${p.id}" data-prog-name="${escapeHtml(p.name)}" ${checked ? 'checked' : ''} style="accent-color:var(--grade-a); width:15px; height:15px; cursor:pointer;">
                    <span>${escapeHtml(p.name)}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:16px; border-top:1px solid rgba(255,255,255,0.1); padding-top:12px;">
        <button class="btn btn-secondary btn-sm btn-modal-close-left close-modal-btn">CLOSE</button>
        <button class="btn btn-primary btn-sm" id="btn-save-theme-assignments" style="background:var(--grade-a); border:none; font-weight:800; padding:0 14px;">Save Assignments</button>
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
  const [{ data: testsData }, { data: classesData }, freshAssignments] = await Promise.all([
    sb.from('tests').select('id, class_id, title, shell_code, test_type, payload, working_duration_minutes, minimum_required_score, status, display_order').is('deleted_at', null),
    (meta.classes && meta.classes.length > 0) ? Promise.resolve({ data: meta.classes }) : sb.from('classes').select('id, name, program_id, level_id, institution_id, is_active').is('deleted_at', null),
    fetchThemeProgramAssignments().catch(() => meta?.themeAssignments || window._vaultMeta?.themeAssignments || [])
  ]);
  hideLoading();

  const tests = testsData || [];
  const classes = classesData || meta.classes || [];
  const assignments = freshAssignments || meta.themeAssignments || window._vaultMeta?.themeAssignments || [];
  if (window._vaultMeta) window._vaultMeta.themeAssignments = assignments;

  // Active Program Selection
  const activeProgs = (meta?.programs || []).filter(p => !p.deleted_at && p.is_active !== false);
  let selectedProgId = window._bpSelectedProgramId || localStorage.getItem('topscore_bp_selected_prog_id') || (activeProgs[0]?.id || '');
  if (!activeProgs.some(p => p.id === selectedProgId) && activeProgs.length > 0) {
    selectedProgId = activeProgs[0].id;
  }
  window._bpSelectedProgramId = selectedProgId;

  // Determine if selected program is a Non-Level program (e.g. Evnikom/Sheraton/Tamata)
  const progClasses = (classes || []).filter(c => c.program_id === selectedProgId && c.name && c.name.toLowerCase().includes('vocab'));
  const hasLevel0 = progClasses.some(c => c.level_id === '0e1c49fb-d8a8-4fd5-a239-a50466875c23' || (c.name && c.name.toLowerCase().includes('non-level')));

  // Group words by Level -> Theme Code -> Topic
  const levelsSet = new Set(hasLevel0 ? [0] : []);
  (words || []).forEach(w => {
    const lvl = parseInt(w.target_level, 10);
    if (!isNaN(lvl)) {
      if (lvl === 0 && !hasLevel0) return; // Do not include level 0 for level-based programs like Camp
      levelsSet.add(lvl);
    }
  });
  if (!hasLevel0) {
    [1, 2, 3].forEach(l => levelsSet.add(l));
  }
  const levels = Array.from(levelsSet).sort((a, b) => a - b);

  const levelGroups = new Map();
  levels.forEach(lvl => levelGroups.set(lvl, new Map()));

  (words || []).forEach(w => {
    const parsedLvl = parseInt(w.target_level, 10);
    const lvl = !isNaN(parsedLvl) ? parsedLvl : 3;
    if (lvl === 0 && !hasLevel0) return;
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

  // Active Level Selection
  let activeLevel = window._bpSelectedLevel || 'ALL';
  window._bpSelectedLevel = activeLevel;

  // Helper: Find target vocabulary class for this program and level
  const getLevelClass = (lvl) => {
    const prog = activeProgs.find(p => p.id === selectedProgId);
    const progName = (prog?.name || '').toLowerCase();
    const shortLvl = (typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`).toLowerCase();

    // 0. Non-level program match
    if (lvl === 0) {
      if (!hasLevel0) return null;
      const nonLvlMatch = classes.find(c => c.program_id === selectedProgId &&
        (c.level_id === '0e1c49fb-d8a8-4fd5-a239-a50466875c23' ||
         (c.name && c.name.toLowerCase().includes('non-level'))) &&
        c.name && c.name.toLowerCase().includes('vocab')
      );
      return nonLvlMatch || null;
    }

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

    // 3. Fallback to specific level vocab class (never match another level!)
    return classes.find(c => c.program_id === selectedProgId &&
      (c.name.toLowerCase().includes(shortLvl) || c.name.toLowerCase().includes(`${lvl}`)) &&
      c.name.toLowerCase().includes('vocab')
    ) || null;
  };

  // Multi-Tenant Assignment Lookup Set
  const assignSet = new Set(
    assignments
      .filter(a => a.is_active !== false)
      .map(a => `${String(a.theme_code).trim().toUpperCase()}_${parseInt(a.target_level, 10)}_${a.program_id}`)
  );

  // Helper: Verify if theme belongs to the selected program (Rule: omit foreign unassigned themes)
  const isThemeAssignedToProgram = (lvl, thCode, targetClassId) => {
    if (!selectedProgId) return true;

    // 1. Explicit multi-tenant assignment in theme_program_assignments
    if (assignSet.has(`${thCode}_${lvl}_${selectedProgId}`)) return true;

    // 2. Program class already has an existing exam or task for this theme
    if (targetClassId) {
      const classTests = tests.filter(t => t.class_id === targetClassId);
      const hasTest = classTests.some(t => {
        const code = String(t.shell_code || '').toUpperCase();
        return lvl === 0 ? code.includes(`-${thCode}`) : code.startsWith(`${lvl}${thCode}`);
      });
      if (hasTest) return true;
    }

    // 3. Fallback: words in vault directly tagged with this program_id
    const hasProgWords = (words || []).some(w =>
      w.program_id === selectedProgId &&
      parseInt(w.target_level, 10) === lvl &&
      String(w.theme_code || '').trim().toUpperCase() === thCode
    );
    if (hasProgWords) return true;

    return false;
  };

  // Helper: Find Task for topic
  const findTaskForTopic = (lvl, thCode, tpCode, tpName, classId) => {
    if (!classId) return null;
    const classTests = tests.filter(t => t.class_id === classId);
    const cleanNum = tpCode.replace(/^[A-Z]+/i, '');
    const codeWithLvl = `${lvl}${thCode}${cleanNum}`;
    const codeBare = `${thCode}${cleanNum}`;
    return classTests.find(t => (t.test_type === 'quiz' || (t.shell_code && t.shell_code.includes('TASK'))) &&
      (t.shell_code && (
        t.shell_code.toUpperCase().includes(`${codeWithLvl}-TASK`) ||
        t.shell_code.toUpperCase().includes(`${codeBare}-TASK`) ||
        t.shell_code.toUpperCase().includes(`${codeWithLvl}-WORDS-TASK`) ||
        t.shell_code.toUpperCase().includes(`${codeBare}-WORDS-TASK`) ||
        t.shell_code.toUpperCase().includes(`${codeWithLvl}-PHRASES-TASK`) ||
        t.shell_code.toUpperCase().includes(`${codeBare}-PHRASES-TASK`)
      ))) ||
      classTests.find(t => t.title && t.title.toLowerCase().includes(tpName.toLowerCase()));
  };

  // Helper: Find Exam for theme
  const findExamForTheme = (lvl, thCode, thName, classId) => {
    if (!classId) return null;
    const classTests = tests.filter(t => t.class_id === classId);
    const codeWithLvl = `${lvl}${thCode}`;
    const codeBare = `${thCode}`;
    return classTests.find(t => (t.test_type === 'exam' || (t.shell_code && t.shell_code.includes('EXAM'))) &&
      (t.shell_code && (
        t.shell_code.toUpperCase().includes(`${codeWithLvl}-EXAM`) ||
        t.shell_code.toUpperCase().includes(`${codeBare}-EXAM`) ||
        t.shell_code.toUpperCase().includes(`${codeWithLvl}-WORDS-EXAM`) ||
        t.shell_code.toUpperCase().includes(`${codeBare}-WORDS-EXAM`)
      ))) ||
      classTests.find(t => t.title && t.title.toLowerCase().includes(thName.toLowerCase()) && (t.test_type === 'exam' || (t.title.toUpperCase().includes('EXAM'))));
  };

  // Count overall tasks & exams ready vs expected
  let totalTasksExpected = 0;
  let totalTasksReady = 0;
  let totalExamsExpected = 0;
  let totalExamsReady = 0;

  const levelsToScan = activeLevel === 'ALL'
    ? levels.filter(lvl => hasLevel0 || lvl > 0)
    : [Number(activeLevel)];
  levelsToScan.forEach(lvl => {
    const targetClass = getLevelClass(lvl);
    const thMap = levelGroups.get(lvl);
    if (!thMap) return;

    thMap.forEach(th => {
      // Exclude themes that do not belong to the active program
      if (!isThemeAssignedToProgram(lvl, th.code, targetClass?.id)) return;

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
  const pctReady = totalExpectedAll > 0 ? Math.round((totalReadyAll / totalExpectedAll) * 100) : 100;
  const selectedProg = activeProgs.find(p => p.id === selectedProgId);

  // Setup Bottom Infobar for Test Blueprint (Rules 2.23, 2.24 & Phase 398)
  if (window.setBottomInfobar) {
    const availableLevels = levels.filter(lvl => hasLevel0 || lvl > 0);
    const leftHtml = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 5px;">
          <label style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">PROGRAM:</label>
          <select id="bp-program-select" style="height: 28px; font-size: 12px; width: 140px; background: rgba(30,41,59,0.9); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 5px; padding: 0 6px; cursor: pointer; outline: none; font-weight: 600;">
            ${activeProgs.map(p => `<option value="${p.id}" ${p.id === selectedProgId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div style="display: flex; gap: 2px; align-items: center; background: rgba(15,23,42,0.8); padding: 2px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1);">
          <button type="button" class="btn btn-tactical btn-sm btn-bp-level-tab ${activeLevel === 'ALL' ? 'active' : ''}" data-lvl="ALL" style="height: 24px; font-size: 12px; font-weight: 800; padding: 0 8px; border-radius: 4px;">ALL LEVELS</button>
          ${availableLevels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`;
            const displayLbl = lvl === 0 ? '— (NON-LVL)' : shortLbl;
            return `<button type="button" class="btn btn-tactical btn-sm btn-bp-level-tab ${isActive ? 'active' : ''}" data-lvl="${lvl}" style="height: 24px; font-size: 12px; font-weight: 800; padding: 0 8px; border-radius: 4px;">${displayLbl}</button>`;
          }).join('')}
        </div>
      </div>
    `;
    const centerHtml = `
      <div class="bottom-info-chip"><span class="chip-label">Tasks:</span><span class="chip-val" style="color: var(--grade-a);">${totalTasksReady}/${totalTasksExpected}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Exams:</span><span class="chip-val" style="color: #c084fc;">${totalExamsReady}/${totalExamsExpected}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Readiness:</span><span class="chip-val" style="color: ${getGradeColorByScore(pctReady)}; font-weight: 800; font-variant-numeric: tabular-nums;">${pctReady}%</span></div>
    `;
    const rightHtml = `
      <input type="search" id="bp-search-input" placeholder="Search Topics..." style="width: 140px; height: 28px; font-size: 12px; background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 5px; padding: 0 8px; outline: none;">
      <button class="btn btn-secondary btn-sm" id="btn-bp-settings" style="height: 28px; font-size: 12px; font-weight: 700; background: rgba(14,165,233,0.18); border: 1px solid rgba(14,165,233,0.4); color: #38bdf8; border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Test System Settings">${getSvgIcon('settings', 14)} Test Settings</button>
      <button class="btn btn-secondary btn-sm" id="btn-bp-sync-tests" style="height: 28px; font-size: 12px; font-weight: 700; background: rgba(149,255,0,0.12); border: 1px solid rgba(149,255,0,0.35); color: var(--quad-c, #95ff00); border-radius: 5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Synchronize test shells directly with latest Blueprint">${getSvgIcon('refresh', 14)} Sync Tests</button>
      <button class="btn btn-tactical btn-sm" id="btn-bp-autogen" style="font-size: 12px; padding: 0 12px; height: 28px; font-weight: 800; display: inline-flex; align-items: center; gap: 5px; border-radius: 5px;" title="Auto-Generate Curriculum Tests">${getSvgIcon('zap', 14)} Auto-Generate All Tests</button>
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
      // Sort blueprint themes strictly by theme code A-Z (Theme A -> B -> C -> D per SSOT §2.36)
      const themeList = Array.from(thMap.values()).sort((a, b) => {
        const codeA = String(a.code || '').trim().toUpperCase();
        const codeB = String(b.code || '').trim().toUpperCase();
        if (codeA !== codeB) return codeA.localeCompare(codeB, undefined, { numeric: true });
        return (a.name || '').localeCompare(b.name || '');
      });

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        // Exclude themes that do not belong to the active program
        if (!isThemeAssignedToProgram(lvl, thCode, targetClass?.id)) return;

        const thExam = findExamForTheme(lvl, thCode, th.name, targetClass?.id);

        // Sort blueprint topics strictly by numeric topicCode order (1 -> 2 -> 3 -> 4)
        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || t.topicCode.toLowerCase().includes(q);
          })
          .sort((a, b) => {
            const numA = parseInt(String(a.topicCode || '').replace(/\D+/g, ''), 10);
            const numB = parseInt(String(b.topicCode || '').replace(/\D+/g, ''), 10);
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) return numA - numB;
            return String(a.topicCode || '').localeCompare(String(b.topicCode || ''), undefined, { numeric: true });
          });

        if (topics.length === 0) return;

        topics.forEach(tp => {
          renderedCount++;
          const cleanTopicNum = String(tp.topicCode || '1').trim().replace(/^[A-Za-z]+/, '') || String(tp.topicCode || '1');
          const cleanThemeCode = String(thCode || th.code || 'A').trim().toUpperCase();
          // SSOT §2.4.2 & §2.6: Zero-Level Omission Invariant (omit '0' for level 0)
          const compositeCode = (lvl === 0) ? `${cleanThemeCode}${cleanTopicNum}` : `${lvl}${cleanThemeCode}${cleanTopicNum}`;
          const lvlDisplay = (lvl === 0) ? '—' : lvlLabel;

          const tpTask = findTaskForTopic(lvl, thCode, tp.topicCode, tp.name, targetClass?.id);
          const taskReady = Boolean(tpTask);
          const examReady = Boolean(thExam);

          // Pacing & Passing Threshold: Official TopsCore SSOT Grade C is 60%
          const taskDuration = tpTask?.working_duration_minutes || 15;
          const taskScore = 60; // SSOT §2.4.1 Passing Threshold is Grade C (60%)
          const examDuration = thExam?.working_duration_minutes || 30;
          const examScore = 60;
          const ansType = window._bpTopicAnswerTypes[tp.topicCode] || tpTask?.answer_type || (tpTask?.payload && tpTask.payload.answer_type) || 'spoken';

          // DECISION-064 & SSOT §2.7.1: Level 2 and Words-Only topics enforce 7 Repetitions (7 Reps)
          const formatLabel = (lvl === 2 || tp.totalPhrases === 0) ? '7 Reps' : '7×7';

          rowsHtml += `
            <tr class="blueprint-table-row" data-topic-code="${escapeHtml(compositeCode)}" data-raw-topic-code="${escapeHtml(tp.topicCode)}" data-level="${lvl}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <td style="text-align: center; font-weight: 800; font-size: 12px; color: ${lvl === 0 ? '#94a3b8' : '#38bdf8'}; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.08); width: 55px;">
                ${escapeHtml(lvlDisplay)}
              </td>
              <td style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.08); font-size: 12px; width: 55px;">
                ${escapeHtml(compositeCode)}
              </td>
              <td style="color: ${(['A','B','C','D'].includes(thCode)) ? `var(--quad-${thCode.toLowerCase()})` : '#ffffff'}; font-weight: 700; padding: 8px 12px; border-right: 1px solid rgba(255,255,255,0.08); font-size: 12px; min-width: 180px;">
                ${escapeHtml(th.name || '—')}
              </td>
              <td class="col-bp-sep" style="color: #f1f5f9; font-weight: 600; padding: 8px 12px; font-size: 12px; min-width: 220px; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                ${escapeHtml(tp.name)}
              </td>

              <!-- Vocab Pool Split (Single Responsibility) -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 55px;">
                <span class="bp-count-total" style="color: #38bdf8; font-weight: 700; font-size: 12px; font-variant-numeric: tabular-nums;">${tp.totalCount}</span>
              </td>
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 55px;">
                <span style="color: #cbd5e1; font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums;">${tp.totalWords}</span>
              </td>
              <td class="col-bp-sep" style="text-align: center; padding: 8px 6px; white-space: nowrap; width: 55px; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                <span style="color: #a78bfa; font-weight: 600; font-size: 12px; font-variant-numeric: tabular-nums;">${tp.totalPhrases}</span>
              </td>

              <!-- Generation Blueprint Split: Duration -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 75px;">
                <span class="bp-setting-badge" style="font-size: 12px; font-weight: 700; color: #f8fafc; font-variant-numeric: tabular-nums;">${taskDuration} min</span>
                <span class="bp-setting-input edit-mode-only" style="align-items:center; gap:2px;">
                  <input type="number" class="bp-inline-duration" data-topic="${escapeHtml(tp.name)}" value="${taskDuration}" min="5" max="180" style="width:44px; height:24px; font-size: 12px; background:#0f172a; color:#fff; border:1px solid var(--primary-tactical, #38bdf8); border-radius:4px; padding:0 3px; text-align:center;">
                  <span style="font-size: 12px; color:#94a3b8;">m</span>
                </span>
              </td>

              <!-- Generation Blueprint Split: Pass Score -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 75px;">
                <span class="bp-setting-badge" style="font-size: 12px; font-weight: 700; color: ${getGradeColorByScore(taskScore)}; font-variant-numeric: tabular-nums;">${taskScore}%</span>
                <span class="bp-setting-input edit-mode-only" style="align-items:center; gap:2px;">
                  <input type="number" class="bp-inline-score" data-topic="${escapeHtml(tp.name)}" value="${taskScore}" min="10" max="100" style="width:44px; height:24px; font-size: 12px; background:#0f172a; color:#fff; border:1px solid var(--primary-tactical, #38bdf8); border-radius:4px; padding:0 3px; text-align:center;">
                  <span style="font-size: 12px; color:${getGradeColorByScore(taskScore)}; font-weight:600;">%</span>
                </span>
              </td>

              <!-- Generation Blueprint Split: Format -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); white-space: nowrap; width: 75px;">
                <span style="color: #38bdf8; font-weight: 600; font-size: 12px;">${formatLabel}</span>
              </td>

              <!-- Generation Blueprint Split: Answer Type -->
              <td class="col-bp-sep" style="text-align: center; padding: 8px 8px; white-space: nowrap; width: 95px; border-right: 2px solid rgba(255,255,255,0.22) !important;">
                <span class="badge-answer-type badge-answer-${ansType}" style="display:inline-flex; align-items:center; gap:4px; font-weight:700; font-size:12px; color:var(--grade-a);" title="Vocabulary Mastery Modules: Recognition, Spoken, Written">
                  ${getSvgIcon('layers', 12)} Vocab Mastery
                </span>
                <span class="bp-setting-input edit-mode-only" style="align-items:center;">
                  <select class="bp-inline-answer-type" data-topic-code="${escapeHtml(tp.topicCode)}" onchange="window._onBpAnswerTypeChange && window._onBpAnswerTypeChange('${escapeHtml(tp.topicCode)}', this.value)" style="height:24px; font-size: 12px; background:#0f172a; color:#fff; border:1px solid var(--primary-tactical, #38bdf8); border-radius:4px; padding:0 2px;">
                    <option value="spoken" ${ansType === 'spoken' ? 'selected' : ''}>Spoken</option>
                    <option value="written" ${ansType === 'written' ? 'selected' : ''}>Written</option>
                    <option value="hybrid" ${ansType === 'hybrid' ? 'selected' : ''}>Hybrid</option>
                  </select>
                </span>
              </td>

              <!-- Task Status (Single Responsibility: Status Only) -->
              <td style="text-align: center; padding: 8px 8px; border-right: 1px solid rgba(255,255,255,0.08); white-space: nowrap; width: 95px;">
                ${taskReady
                  ? `<span style="color: var(--grade-a); font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">✓ Ready</span>`
                  : `<span style="color: var(--grade-e); font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">▲ Missing</span>`}
              </td>

              <!-- Exam Status (Single Responsibility: Status Only) -->
              <td style="text-align: center; padding: 8px 8px; white-space: nowrap; width: 95px;">
                ${examReady
                  ? `<span style="color: var(--grade-a); font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">✓ Ready</span>`
                  : `<span style="color: var(--grade-e); font-weight: 700; font-size: 12px; display: inline-flex; align-items: center; gap: 4px;">▲ Missing</span>`}
              </td>
            </tr>
          `;
        });
      });
    });

    if (renderedCount === 0) {
      const progName = selectedProg?.name || 'this program';
      const lvlText = activeLevel === 'ALL' ? '' : ` for Level ${typeof toShortLevel === 'function' ? toShortLevel(activeLevel) : activeLevel}`;
      rowsHtml = `
        <tr>
          <td colspan="13" style="text-align: center; padding: 48px 16px; color: #94a3b8; font-size: 12px;">
            <div style="margin-bottom: 6px;">${getSvgIcon('layers', 28)}</div>
            <div style="font-weight: 700; color: #f1f5f9; font-size: 12px;">No Curriculum Themes Found</div>
            <div style="font-size: 12px; margin-top: 4px; color: #64748b;">
              No themes are currently assigned to <strong style="color: #38bdf8;">${escapeHtml(progName)}</strong>${escapeHtml(lvlText)}.
              Assign themes in the <a href="#vocab_vault?tab=theme_manager" style="color: #818cf8; text-decoration: underline; font-weight: 600;">Theme Manager</a>.
            </div>
          </td>
        </tr>
      `;
    }

    return rowsHtml;
  };

  const initialRows = buildBlueprintTableRows('');

  let html = `
    <div style="display: flex; flex-direction: column; height: 100%; flex: 1; min-height: 0; box-sizing: border-box; overflow: hidden; font-family: 'Inter', sans-serif;">
      <!-- Batch Configuration Grid (ONLY Container With Vertical Scroll) -->
      <div class="table-wrap sticky-first" style="flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden !important; background: #0f172a; border: 2px solid rgba(255, 255, 255, 0.28) !important; border-radius: 8px;">
        <table id="blueprint-matrix-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 12px;">
          <colgroup>
            <col style="width: 55px;">
            <col style="width: 55px;">
            <col style="width: 180px;">
            <col style="min-width: 220px; width: auto;">
            <col style="width: 55px;">
            <col style="width: 55px;">
            <col style="width: 55px;">
            <col style="width: 75px;">
            <col style="width: 75px;">
            <col style="width: 75px;">
            <col style="width: 95px;">
            <col style="width: 95px;">
            <col style="width: 95px;">
          </colgroup>
          <thead style="position: sticky; top: 0; z-index: 10;">
            <!-- Super-Header Row (Dark Surface with Themed Colored Fonts SSOT §2.34 & Rule 4.11) -->
            <tr class="bp-super-header-row">
              <th colspan="4" class="bp-sh-topic" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; padding:5px 8px; font-size:12px; font-weight:800; text-align:center; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(56,189,248,0.35);">CURRICULUM TOPIC</th>
              <th colspan="3" class="bp-sh-vocab" style="background:#0b1120 !important; color:var(--grade-star, #c084fc) !important; padding:5px 8px; font-size:12px; font-weight:800; text-align:center; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(192,132,252,0.35);">VOCABULARY POOL</th>
              <th colspan="4" class="bp-sh-blueprint" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; padding:5px 8px; font-size:12px; font-weight:800; text-align:center; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(255,140,0,0.35);">GENERATION BLUEPRINT</th>
              <th colspan="2" class="bp-sh-status" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; padding:5px 8px; font-size:12px; font-weight:800; text-align:center; border-bottom:1px solid rgba(255,255,255,0.18); height:30px; line-height:30px; text-shadow:0 0 10px rgba(149,255,0,0.35);">READINESS STATUS</th>
            </tr>
            <!-- Sub-Header Row (Matching Themed Parent Colors on Dark Surface SSOT) -->
            <tr>
              <th class="col-subhdr-topic" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">LEVEL</th>
              <th class="col-subhdr-topic" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">CODE</th>
              <th class="col-subhdr-topic" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; padding: 7px 12px; font-weight: 700; text-transform: uppercase; font-size: 12px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">THEME NAME</th>
              <th class="col-subhdr-topic col-bp-sep" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; padding: 7px 12px; font-weight: 700; text-transform: uppercase; font-size: 12px; min-width: 220px; border-right: 2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">TOPIC NAME</th>

              <th class="col-subhdr-vocab" style="background:#0b1120 !important; color:var(--grade-star, #c084fc) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">ITEMS</th>
              <th class="col-subhdr-vocab" style="background:#0b1120 !important; color:var(--grade-star, #c084fc) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">WORDS</th>
              <th class="col-subhdr-vocab col-bp-sep" style="background:#0b1120 !important; color:var(--grade-star, #c084fc) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">PHRASES</th>

              <th class="col-subhdr-blueprint" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 75px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">DURATION</th>
              <th class="col-subhdr-blueprint" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 75px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">PASS RATE</th>
              <th class="col-subhdr-blueprint" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; padding: 7px 6px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 75px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">FORMAT</th>
              <th class="col-subhdr-blueprint col-bp-sep" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; padding: 7px 8px; font-weight: 700; text-transform: uppercase; font-size: 12px; width: 95px; text-align: center; border-right: 2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">MODULE</th>

              <th class="col-subhdr-status" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; padding: 7px 10px; font-weight: 700; text-transform: uppercase; font-size: 12px; min-width: 95px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">TASK STATUS</th>
              <th class="col-subhdr-status" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; padding: 7px 10px; font-weight: 700; text-transform: uppercase; font-size: 12px; min-width: 95px; text-align: center; height:30px; line-height:30px;">EXAM STATUS</th>
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
    const importedLevels = levels.filter(lvl => {
      const thMap = levelGroups.get(lvl);
      if (!thMap) return false;
      const targetClass = getLevelClass(lvl);
      return Array.from(thMap.values()).some(th => isThemeAssignedToProgram(lvl, th.code, targetClass?.id));
    });
    if (importedLevels.length === 0) return showToast('No levels with topics detected in Blueprint for this program', 'error');
    const targetClass = activeLevel === 'ALL' ? null : getLevelClass(Number(activeLevel));

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

  const btnBpSync = document.getElementById('btn-bp-sync-tests');
  if (btnBpSync) {
    btnBpSync.onclick = async () => {
      try {
        const oldHtml = btnBpSync.innerHTML;
        btnBpSync.innerHTML = `${getSvgIcon('clock', 14)} Syncing...`;
        btnBpSync.disabled = true;
        showLoading('Synchronizing Tests with Blueprint...');

        const targetLvl = activeLevel !== 'ALL' ? Number(activeLevel) : null;
        const syncRes = await syncAllCurriculumTests({ level: targetLvl });

        hideLoading();
        btnBpSync.innerHTML = oldHtml;
        btnBpSync.disabled = false;
        showToast(`Curriculum & Tests synced: ${syncRes.createdCount} new test shells created, ${syncRes.updatedCount} updated!`, 'success');
        if (typeof renderVocabularyVault === 'function') {
          const container = document.getElementById('classes-detail-canvas');
          if (container) renderVocabularyVault(container);
        }
      } catch (syncErr) {
        hideLoading();
        btnBpSync.innerHTML = `${getSvgIcon('refresh', 14)} Sync Tests`;
        btnBpSync.disabled = false;
        showToast('Sync failed: ' + syncErr.message, 'error');
      }
    };
  }
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
    showToast('No duplicates found in the Vault.', 'success');
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
          <td style="padding:10px 8px;"><span class="badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;font-size: 12px;">${escapeHtml(w.topic)}</span></td>
          <td style="padding:10px 8px; text-align:right;">
            <button class="btn btn-xs btn-keep-this" data-gi="${gi}" data-id="${escapeHtml(w.id)}" style="background:transparent;color:var(--grade-a);border:1px solid var(--grade-a);margin-right:4px;display:inline-flex;align-items:center;gap:3px;" title="Keep this entry, delete others">${getSvgIcon('check', 12)} Keep</button>
            <button class="btn btn-danger btn-xs btn-del-this" data-gi="${gi}" data-id="${escapeHtml(w.id)}" title="Delete this entry" style="display:inline-flex;align-items:center;justify-content:center;">${getSvgIcon('trash', 12)}</button>
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
                <input type="text" class="input merge-eng-input" data-gi="${gi}" value="${escapeHtml(mergedEnglish)}" style="flex:1; min-width:200px; padding:4px 8px; font-size: 12px;" />
                <button class="btn btn-xs btn-merge-group" data-gi="${gi}" style="background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);display:inline-flex;align-items:center;gap:3px;">${getSvgIcon('zap', 12)} Merge</button>
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
          <h3 class="fw-700" style="margin:0;display:flex;align-items:center;gap:6px;">${getSvgIcon('copy', 18)} Duplicate Checker</h3>
          <p class="text-muted text-xs mt-1 mb-0">${duplicateGroups.length} group(s) with duplicate Indonesian words found.</p>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-success btn-sm" id="dup-modal-keep-all" style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('check', 14)} Keep First (All)</button>
          <button class="btn btn-purple btn-sm" id="dup-modal-merge-all" style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('zap', 14)} Merge All</button>
        </div>
      </div>
      <div style="overflow-y:auto; flex-grow:1;">
        <table class="table w-100" id="dup-table">
          <thead>
            <tr>
              <th style="width:170px;">INDONESIAN</th>
              <th>ENGLISH</th>
              <th style="width:140px;">TOPIC</th>
              <th style="width:130px; text-align:right;">ACTION</th>
            </tr>
          </thead>
          ${buildTable()}
        </table>
      </div>
      <div class="d-flex justify-start mt-3">
        <button class="btn btn-secondary btn-sm btn-modal-close-left" id="dup-modal-done">Done</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() {
    document.body.removeChild(modal);
    if (onResolved) onResolved([...allWords]);
  }

  modal.querySelector('#dup-modal-close')?.addEventListener('click', closeModal);
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
          modal.querySelector('p.text-muted.text-xs').textContent = 'All duplicates resolved!';
        }
      } catch (e) {
        showToast('Error: ' + e.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('check', 12)} Keep`;
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
        btn.innerHTML = getSvgIcon('trash', 12);
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
        btn.innerHTML = `${getSvgIcon('zap', 12)} Merge`;
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
        modal.querySelector('p.text-muted.text-xs').textContent = 'All duplicates resolved!';
        if (onResolved) onResolved([...allWords]);
      } catch (e) {
        showToast('Bulk Keep failed: ' + e.message, 'error');
      }
      keepAllBtn.innerHTML = `${getSvgIcon('check', 14)} Keep First (All)`;
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
        modal.querySelector('p.text-muted.text-xs').textContent = 'All duplicates resolved!';
        if (onResolved) onResolved([...allWords]);
      } catch (e) {
        showToast('Bulk Merge failed: ' + e.message, 'error');
      }
      mergeAllBtn.innerHTML = `${getSvgIcon('zap', 14)} Merge All`;
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
              No automated similar topic duplicates detected. You can use the manual topic merge tool below.
            </td>
          </tr>
        </tbody>
      `;
    }
    return duplicateGroups.map((group, gi) => {
      const rows = group.map((t, ti) => `
        <tr data-gi="${gi}" data-ti="${ti}">
          <td style="padding:10px 8px;"><span class="badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;font-size: 12px;">${escapeHtml(t)}</span></td>
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
                <input type="text" class="input merge-topic-input" data-gi="${gi}" value="${escapeHtml(mergedTopic)}" style="flex:1; min-width:200px; padding:4px 8px; font-size: 12px;" />
                <button class="btn btn-xs btn-merge-topic-group" data-gi="${gi}" style="background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.4);display:inline-flex;align-items:center;gap:3px;">${getSvgIcon('zap', 12)} Merge</button>
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
          <h3 class="fw-700" style="margin:0; font-size: 16px; color:#f8fafc; display:flex; align-items:center; gap:6px;">${getSvgIcon('layers', 16)} Topic Merge &amp; Unification Wizard</h3>
          <p class="text-muted text-xs mt-1 mb-0">${duplicateGroups.length} automated similar group(s) detected &bull; ${allDistinctTopics.length} total topics active</p>
        </div>
        <div class="d-flex gap-2">
          ${duplicateGroups.length > 0 ? `<button class="btn btn-purple btn-sm" id="dup-topic-merge-all" style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('zap', 14)} Merge All</button>` : ''}
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
            <strong style="color:#a5b4fc; font-size: 12px;">${getSvgIcon('zap', 14)} Manual Topic Merge</strong>
            <span class="text-xs text-muted">Merge any two custom topics seamlessly</span>
          </div>
          <div class="d-flex gap-2 align-center flex-wrap">
            <div style="flex:1; min-width:180px;">
              <label class="text-xs text-muted d-block mb-1" for="manual-merge-source">Source Topic (Will be replaced)</label>
              <select id="manual-merge-source" class="form-control" style="font-size: 12px; padding:6px 8px; width:100%;">
                <option value="">-- Select Source Topic --</option>
                ${topicOptions}
              </select>
            </div>
            <div style="font-size: 16px; color:#94a3b8; align-self:flex-end; padding-bottom:6px;">&rarr;</div>
            <div style="flex:1; min-width:180px;">
              <label class="text-xs text-muted d-block mb-1" for="manual-merge-target">Target Topic (Keeper)</label>
              <select id="manual-merge-target" class="form-control" style="font-size: 12px; padding:6px 8px; width:100%;">
                <option value="">-- Select Target Topic --</option>
                ${topicOptions}
              </select>
            </div>
          </div>
          <div class="d-flex justify-between align-center mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,0.06);">
            <div id="manual-merge-status" class="text-xs text-muted">All words in the source topic will be re-assigned to the target topic.</div>
            <button class="btn btn-primary btn-sm" id="btn-execute-manual-merge" style="font-weight:700;display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('zap', 14)} Execute Merge</button>
          </div>
        </div>
      </div>

      <div class="d-flex justify-start mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,0.08);">
        <button class="btn btn-secondary btn-sm btn-modal-close-left" id="dup-topic-modal-done">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() {
    modal.remove();
    if (onResolved) onResolved();
  }

  modal.querySelector('#dup-topic-modal-close')?.addEventListener('click', closeModal);
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
      showToast(`Topic "${src}" successfully merged into "${tgt}"!`, 'success');
      closeModal();
    } catch (err) {
      showToast('Merge failed: ' + err.message, 'error');
      btnExecManual.disabled = false;
      btnExecManual.innerHTML = `${getSvgIcon('zap', 14)} Execute Merge`;
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
        btn.innerHTML = `${getSvgIcon('zap', 12)} Merge`;
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
        if (statusEl) statusEl.textContent = 'All duplicates resolved!';
      } catch (e) {
        showToast('Bulk Merge failed: ' + e.message, 'error');
      }
      mergeAllBtn.innerHTML = `${getSvgIcon('zap', 14)} Merge All`;
      mergeAllBtn.disabled = false;
    });
  }
}

