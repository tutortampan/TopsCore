
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
  toggleThemeProgramAssignment
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
      { id: 'blueprint', icon: '⚡', val: topicsCount, title: 'Theme Blueprint', label: 'Theme Blueprint' },
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
      <div style="flex-grow: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0;">

        <!-- Controls Bar -->
        <div style="padding: 4px 0 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; flex-shrink: 0;">

          <div class="table-toolbar-unified">
            <input type="search" id="vault-search" placeholder="🔍 Search Indonesian, English, or Topic..." class="toolbar-input-38" style="width: 220px;" />
            <select id="vault-level-filter" class="toolbar-input-38" style="width: 125px; cursor: pointer;">
              <option value="">All Levels</option>
              ${levelSelectOptions}
            </select>
            <select id="vault-topic-filter" class="toolbar-input-38" style="width: 160px; cursor: pointer;">
              <option value="">All Topics</option>
              ${topics.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
            </select>
            <select id="vault-wordtype-filter" class="toolbar-input-38" style="width: 140px; cursor: pointer;">
              <option value="">All Word Types</option>
              ${wordTypeOptions}
            </select>
            <span style="font-size: 11px; color: #64748b; font-weight: 500; margin-left: 4px;">
              <span id="vault-count" style="color: #f8fafc; font-weight: 700;">${words.length}</span> ${mode === 'phrases' ? 'phrases' : 'words'}
            </span>
          </div>

          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm toolbar-btn-38" id="btn-import-vault">&#128229; Import Excel</button>
            <button class="btn btn-secondary btn-sm toolbar-btn-38" id="btn-export-vault">&#128228; Export Excel</button>
            <button class="btn btn-secondary btn-sm toolbar-btn-38" id="btn-check-duplicates">&#9874; Check Dups</button>
            <button class="btn btn-primary btn-sm toolbar-btn-38" id="btn-manual-auto-generate" style="background:var(--clr-primary);">&#9881; Auto-Gen</button>
            <button class="btn btn-primary btn-sm toolbar-btn-38" id="btn-create-vocab-test">${mode === 'phrases' ? '+ Phrase Exam' : '+ Vocab Exam'}</button>
          </div>
        </div>

        <!-- Table Area -->
        <div class="table-wrap sticky-first" style="flex-grow: 1; overflow-y: auto; min-height: 0;">
          <table id="vault-table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
            <thead style="background: rgba(15, 23, 42, 0.95); position: sticky; top: 0; z-index: 10; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <tr>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 68px; line-height: 1.2;">Institution</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 68px; line-height: 1.2;">Program</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 75px; line-height: 1.2;">Level</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 60px; line-height: 1.2;">Code</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Theme</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Topic</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 85px; line-height: 1.2;">Type</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Indonesian</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">English</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; text-align: right; width: 85px; position: sticky; right: 0; background: rgba(15, 23, 42, 0.95); border-left: 1px solid rgba(255, 255, 255, 0.08); z-index: 20; line-height: 1.2;">Actions</th>
              </tr>
            </thead>
            <tbody id="vault-tbody"></tbody>
          </table>
        </div>
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

  setTimeout(() => {
    // Fire initial render
    filterAndRender();
  }, 10);

  const triggerAutoGenerate = async () => {
    const importedLevels = Array.from(new Set(words.map(w => w.target_level || 1))).sort((a, b) => a - b);
    if (importedLevels.length === 0) importedLevels.push(1);
    try {
      const { openAutoGenerateModal } = await import('./auto-gen-modal.js?v=20261106_v140');
      await openAutoGenerateModal({
        availableLevels: importedLevels,
        preSelectedLevels: importedLevels,
        explicitClassId: window._selectedClassId || localStorage.getItem('topscore_selected_class_id') || null,
        onComplete: () => {}
      });
    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Error opening generator: ' + err.message, 'error');
    }
  };

  function _syncVaultGridBottomBar(filtered, allModeWords, currentMode) {
    if (!window.setBottomInfobar) return;

    const isWords = currentMode === 'single_words';
    const totalCount = allModeWords.length;
    const isFiltered = filtered.length !== totalCount;
    const targetSet = isFiltered ? filtered : allModeWords;

    let leftHtml = '';
    if (isWords) {
      const qCount = new Set(targetSet.map(w => (w.indonesian || '').toLowerCase().trim())).size;
      const nouns = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'noun').length;
      const verbs = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'verb').length;
      const adjs = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'adjective').length;
      const advs = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'adverb').length;
      const themes = new Set(targetSet.map(w => w.theme || w.theme_code).filter(Boolean)).size;

      if (isFiltered) {
        leftHtml = `
          <div class="bottom-info-chip" style="border: 1px solid rgba(56, 189, 248, 0.4);"><span class="chip-label" style="color: #38bdf8;">Showing:</span><span class="chip-val" style="color: #38bdf8;">${filtered.length} / ${totalCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Questions:</span><span class="chip-val">${qCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Nouns:</span><span class="chip-val">${nouns}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Verbs:</span><span class="chip-val">${verbs}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Adjectives:</span><span class="chip-val">${adjs}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Adverbs:</span><span class="chip-val">${advs}</span></div>
        `;
      } else {
        leftHtml = `
          <div class="bottom-info-chip"><span class="chip-label">Total Words:</span><span class="chip-val">${totalCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Questions:</span><span class="chip-val">${qCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Nouns:</span><span class="chip-val">${nouns}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Verbs:</span><span class="chip-val">${verbs}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Adjectives:</span><span class="chip-val">${adjs}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Adverbs:</span><span class="chip-val">${advs}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Themes:</span><span class="chip-val">${themes}</span></div>
        `;
      }
    } else {
      const qCount = new Set(targetSet.map(w => (w.indonesian || '').toLowerCase().trim())).size;
      const expressions = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'expression').length;
      const idioms = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'idiom').length;
      const proverbs = targetSet.filter(w => (w.word_type || '').toLowerCase() === 'proverb').length;
      const themes = new Set(targetSet.map(w => w.theme || w.theme_code).filter(Boolean)).size;

      if (isFiltered) {
        leftHtml = `
          <div class="bottom-info-chip" style="border: 1px solid rgba(56, 189, 248, 0.4);"><span class="chip-label" style="color: #38bdf8;">Showing:</span><span class="chip-val" style="color: #38bdf8;">${filtered.length} / ${totalCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Questions:</span><span class="chip-val">${qCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Expressions:</span><span class="chip-val">${expressions}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Idioms:</span><span class="chip-val">${idioms}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Proverbs:</span><span class="chip-val">${proverbs}</span></div>
        `;
      } else {
        leftHtml = `
          <div class="bottom-info-chip"><span class="chip-label">Total Phrases:</span><span class="chip-val">${totalCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Questions:</span><span class="chip-val">${qCount}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Expressions:</span><span class="chip-val">${expressions}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Idioms:</span><span class="chip-val">${idioms}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Proverbs:</span><span class="chip-val">${proverbs}</span></div>
          <div class="bottom-info-chip"><span class="chip-label">Themes:</span><span class="chip-val">${themes}</span></div>
        `;
      }
    }

    const rightHtml = '';
    window.setBottomInfobar(leftHtml, rightHtml);
  }

  function renderRows(filtered) {
    const tbody = document.getElementById('vault-tbody');
    if (!tbody) return;
    const uniqueIndoCount = new Set(filtered.map(w => w.indonesian.toLowerCase().trim())).size;
    document.getElementById('vault-count').textContent = `${uniqueIndoCount} questions (${filtered.length} entries)`;
    _syncVaultGridBottomBar(filtered, _allWords, mode);
    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11">
            <div class="smart-empty-state">
              <span class="smart-empty-icon">🔍</span>
              <div class="smart-empty-title">No vocabulary words found</div>
              <div class="smart-empty-subtext">No words match your search or filter criteria.</div>
              <button type="button" class="smart-empty-btn" onclick="document.getElementById('vault-search').value=''; document.getElementById('vault-topic-filter').value=''; document.getElementById('vault-wordtype-filter').value=''; document.getElementById('vault-search').dispatchEvent(new Event('input'));">✕ Clear Search & Reset</button>
            </div>
          </td>
        </tr>
      `;
      return;
    }
    tbody.innerHTML = filtered.map((w, i) => {
      let typeColor = "#3b82f6"; // default blue
      const wt = (w.word_type || 'Vocab').toLowerCase();
      if (wt === 'vocab' || wt === 'vocabulary') typeColor = "#00c000ff"; // pure green
      if (wt === 'idiom') typeColor = "#FF8C00"; // orange
      if (wt === 'expression') typeColor = "#8b5cf6"; // purple
      if (wt === 'proverb') typeColor = "#FF0000"; // pure red

      return `
      <tr data-word-id="${escapeHtml(w.id)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
        <td class="cell-institution" style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(56, 189, 248, 0.35); display: inline-block;">${escapeHtml(w.institutions?.code || w.institution_code || w.institutions?.name || 'CEC')}</span></td>
        <td class="cell-program" style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.35); display: inline-block;">${escapeHtml(w.programs?.name || w.program_name || 'Camp')}</span></td>
        <td class="cell-level" style="padding: 6px 8px; font-weight: 600;"><span style="background: #334155; color: #f8fafc; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.15); display: inline-block; white-space: nowrap;">${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(w.target_level) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(w.target_level, true) : (w.target_level || '1st')))}</span></td>
        <td class="cell-code cell-topic-code" style="padding: 6px 12px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;letter-spacing:0.5px;font-size:11px;font-weight:700;">${escapeHtml(w.topic_code || '—')}</span></td>
        <td class="cell-theme" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${escapeHtml(w.theme || '—')}">${escapeHtml(w.theme || '—')}</td>
        <td class="cell-topic" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${escapeHtml(w.topic)}">${escapeHtml(w.topic)}</td>
        <td class="cell-wordtype" style="padding: 6px 12px;">
          <span style="font-size:11px; color: ${typeColor}; display: inline-block; text-transform: capitalize; font-weight: 700; border: none;">${escapeHtml(w.word_type || 'Vocab')}</span>
        </td>
        <td class="cell-indonesian" style="padding: 6px 12px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(w.indonesian)}">${escapeHtml(w.indonesian)}</td>
        <td class="cell-english" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(w.english)}">
          <button type="button" class="btn-vault-speak" data-speak="${escapeHtml(w.english)}" style="background:transparent; border:none; cursor:pointer; padding:0 4px; font-size:12px; color:var(--clr-accent-1, #6366f1); opacity:0.85; transition:transform 0.15s ease;" title="Listen Native Pronunciation">🔊</button>
          ${escapeHtml(w.english)}
        </td>
        <td style="padding: 6px 12px; text-align: right; position: sticky; right: 0; background: var(--fm-bg-panel, #0f172a); border-left: 1px solid rgba(255, 255, 255, 0.08); z-index: 5;">
          <button class="btn btn-xs btn-edit-vault" data-edit-vault="${escapeHtml(w.id)}" style="background: transparent; color: #3b82f6; border: 1px solid #3b82f6; font-size: 10px; padding: 2px 6px;" title="Edit word">&#9998;</button>
          <button class="btn btn-danger btn-xs" data-del-vault="${escapeHtml(w.id)}" title="Delete word" style="font-size: 10px; padding: 2px 6px;">&#128465;</button>
        </td>
      </tr>
    `}).join('');

    // Native Speech Pronunciation Handler
    tbody.querySelectorAll('.btn-vault-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-speak');
        speakEnglishWord(text);
        btn.style.transform = 'scale(1.25)';
        setTimeout(() => { btn.style.transform = 'scale(1)'; }, 250);
      });
    });

    // Delete handlers
    tbody.querySelectorAll('[data-del-vault]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Soft-delete this word from Vault?')) return;
        try {
          await deleteVaultWord(btn.dataset.delVault);
          showToast('Word deleted from Vault.', 'success');
          _allWords = _allWords.filter(w => w.id !== btn.dataset.delVault);
          filterAndRender();
        } catch (e) {
          showToast('Delete failed: ' + e.message, 'error');
        }
      });
    });

    // Edit handlers
    tbody.querySelectorAll('.btn-edit-vault').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editVault;
        const tr = btn.closest('tr');
        const isEditing = tr.classList.contains('editing');
        const word = _allWords.find(w => w.id === id);

        if (isEditing) {
          // Save
          const newThemeCode = (tr.querySelector('.edit-theme-code')?.value || '').trim().toUpperCase();
          const newTheme = (tr.querySelector('.edit-theme')?.value || '').trim();
          const newTopicCode = (tr.querySelector('.edit-topic-code')?.value || '').trim().toUpperCase();
          const newTopic = (tr.querySelector('.edit-topic')?.value || '').trim();
          const newIndo = (tr.querySelector('.edit-indo')?.value || '').trim();
          const newEng = (tr.querySelector('.edit-eng')?.value || '').trim();
          const newType = tr.querySelector('.edit-type')?.value || word.word_type || 'Vocab';
          const newLevel = parseInt(tr.querySelector('.edit-level')?.value || '1', 10);

          if (!newTopic || !newIndo || !newEng) return showToast('Please fill all required fields.', 'error');

          btn.innerHTML = '&#8987;'; // wait
          btn.disabled = true;

          // Normalize topic_code and theme_code on edit save
          let finalTopicCode = (newTopicCode || '').trim().toUpperCase();
          let finalThemeCode = (newThemeCode || '').trim().toUpperCase();
          if (/^[A-Z][0-9]+$/.test(finalTopicCode)) {
            if (!finalThemeCode) finalThemeCode = finalTopicCode[0];
          } else if (/^[0-9]+$/.test(finalTopicCode) && finalThemeCode) {
            finalTopicCode = `${finalThemeCode}${finalTopicCode}`;
          }

          updateVaultWord(id, {
            theme_code: finalThemeCode || null,
            theme: newTheme || null,
            topic_code: finalTopicCode || null,
            topic: newTopic,
            indonesian: newIndo,
            english: newEng,
            word_type: newType,
            target_level: newLevel
          }).then(() => {
            showToast('Word updated successfully.', 'success');
            word.theme_code = newThemeCode || null;
            word.theme = newTheme || null;
            word.topic_code = finalTopicCode || null; word.theme_code = finalThemeCode || word.theme_code;
            word.topic = newTopic;
            word.indonesian = newIndo;
            word.english = newEng;
            word.word_type = newType; word.target_level = newLevel;
            filterAndRender();
          }).catch(e => {
            showToast('Update failed: ' + e.message, 'error');
            filterAndRender(); // reset
          });
        } else {
          // Enter edit mode
          tr.classList.add('editing');
          const cellLevel = tr.querySelector('.cell-level');
          if (cellLevel) cellLevel.innerHTML = '<input type="number" class="input edit-level" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.target_level || '1') + '">';

          const cellThemeCode = tr.querySelector('.cell-theme-code');
          if (cellThemeCode) {
            cellThemeCode.innerHTML = '<input type="text" class="input edit-theme-code" style="width: 100%; padding: 2px 4px; font-size: 0.75rem; font-family: monospace; text-transform: uppercase;" value="' + escapeHtml(word.theme_code || '') + '" placeholder="e.g. T1">';
          }

          const cellTheme = tr.querySelector('.cell-theme');
          if (cellTheme) {
            cellTheme.innerHTML = '<input type="text" class="input edit-theme" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.theme || '') + '" placeholder="Theme name">';
          }

          const cellTopicCode = tr.querySelector('.cell-topic-code') || tr.querySelector('.cell-code');
          if (cellTopicCode) {
            cellTopicCode.innerHTML = '<input type="text" class="input edit-topic-code" style="width: 100%; padding: 2px 4px; font-size: 0.75rem; font-family: monospace; text-transform: uppercase;" value="' + escapeHtml(word.topic_code || '') + '" placeholder="e.g. A1">';
          }

          const cellTopic = tr.querySelector('.cell-topic');
          if (cellTopic) {
            cellTopic.innerHTML = '<input type="text" class="input edit-topic" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.topic) + '" placeholder="Topic name">';
          }

          const cellEng = tr.querySelector('.cell-english');
          if (cellEng) {
            cellEng.innerHTML = '<input type="text" class="input edit-eng" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.english) + '">';
          }

          const phraseOpts = `
            <option value="Expression"${word.word_type === 'Expression' ? ' selected' : ''}>Expression</option>
            <option value="Idiom"${word.word_type === 'Idiom' ? ' selected' : ''}>Idiom</option>
            <option value="Proverb"${word.word_type === 'Proverb' ? ' selected' : ''}>Proverb</option>
          `;
          const vocabOpts = `
            <option value="Vocab"${word.word_type === 'Vocab' ? ' selected' : ''}>Vocab</option>
            <option value="Noun"${word.word_type === 'Noun' ? ' selected' : ''}>Noun</option>
            <option value="Verb"${word.word_type === 'Verb' ? ' selected' : ''}>Verb</option>
            <option value="Adjective"${word.word_type === 'Adjective' ? ' selected' : ''}>Adjective</option>
            <option value="Adverb"${word.word_type === 'Adverb' ? ' selected' : ''}>Adverb</option>
          `;
          const cellWordType = tr.querySelector('.cell-wordtype');
          if (cellWordType) {
            cellWordType.innerHTML = `<select class="input edit-type" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;">
              <optgroup label="Words">
                ${vocabOpts}
              </optgroup>
              <optgroup label="Phrases">
                ${phraseOpts}
              </optgroup>
            </select>`;
          }

          const cellIndo = tr.querySelector('.cell-indonesian');
          if (cellIndo) {
            cellIndo.innerHTML = '<input type="text" class="input edit-indo" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.indonesian) + '">';
          }

          btn.innerHTML = '&#128190;'; // Save icon
          btn.title = 'Save';
          btn.style.color = '#00c000ff';
          btn.style.borderColor = '#00c000ff';
        }
      });
    });
  }

  function filterAndRender() {
    const search = (document.getElementById('vault-search')?.value || '').toLowerCase().trim();
    const level = document.getElementById('vault-level-filter')?.value || '';
    const topic = document.getElementById('vault-topic-filter')?.value || '';
    const wordType = document.getElementById('vault-wordtype-filter')?.value || '';
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
      w.indonesian.toLowerCase().includes(search) ||
      w.english.toLowerCase().includes(search) ||
      w.topic.toLowerCase().includes(search)
    );
    renderRows(filtered);
  }

  renderRows(_allWords);

  let _vaultSearchDebounce = null;
  document.getElementById('vault-search')?.addEventListener('input', () => {
    clearTimeout(_vaultSearchDebounce);
    _vaultSearchDebounce = setTimeout(filterAndRender, 200);
  });
  document.getElementById('vault-level-filter')?.addEventListener('change', filterAndRender);
  document.getElementById('vault-topic-filter')?.addEventListener('change', filterAndRender);
  document.getElementById('vault-wordtype-filter')?.addEventListener('change', filterAndRender);

  document.getElementById('btn-export-vault')?.addEventListener('click', async () => {
    try {
      const btn = document.getElementById('btn-export-vault');
      const oldText = btn.innerHTML;
      btn.innerHTML = '&#8987; Exporting...';
      btn.disabled = true;
      await exportVaultWords(mode);
      btn.innerHTML = oldText;
      btn.disabled = false;
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
      document.getElementById('btn-export-vault').innerHTML = '&#128228; Export Excel';
      document.getElementById('btn-export-vault').disabled = false;
    }
  });

  document.getElementById('btn-import-vault')?.addEventListener('click', () => openImportModal(_allWords, topics, (newWords) => {
    _allWords = [..._allWords, ...newWords];
    filterAndRender();
  }, mode));

  document.getElementById('btn-check-duplicates')?.addEventListener('click', () => {
    openDuplicateCheckerModal(_allWords, (updatedWords) => {
      _allWords = updatedWords;
      filterAndRender();
    });
  });
  document.getElementById('btn-manual-auto-generate')?.addEventListener('click', triggerAutoGenerate);
  document.getElementById('btn-create-vocab-test')?.addEventListener('click', () => {
    if (mode === 'phrases') {
      openTestBuilderModal(topics, { testType: 'IDIOM_PROVERB' });
    } else {
      openTestBuilderModal(topics, { testType: 'VOCAB_MASTERY' });
    }
  });
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
  const isPhrase = (wt) => phraseTypes.includes(String(wt || '').toLowerCase());

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
        verbs: 0,
        nouns: 0,
        adjs: 0,
        others: 0,
        expressions: 0,
        idioms: 0,
        proverbs: 0,
        totalWords: 0,
        totalPhrases: 0,
        totalCount: 0
      });
    }
    const tpObj = thObj.topicsMap.get(tpKey);

    const wt = String(w.word_type || '').toLowerCase();
    const isExpr = ['expression', 'phrase', 'phrasal verb'].includes(wt);
    const isIdiom = wt === 'idiom';
    const isProv = wt === 'proverb';
    const isVerb = wt === 'verb';
    const isNoun = wt === 'noun';
    const isAdj = wt === 'adjective' || wt === 'adj';

    if (isVerb) tpObj.verbs++;
    else if (isNoun) tpObj.nouns++;
    else if (isAdj) tpObj.adjs++;
    else if (isExpr) tpObj.expressions++;
    else if (isIdiom) tpObj.idioms++;
    else if (isProv) tpObj.proverbs++;
    else tpObj.others++;

    tpObj.totalWords = tpObj.verbs + tpObj.nouns + tpObj.adjs + tpObj.others;
    tpObj.totalPhrases = tpObj.expressions + tpObj.idioms + tpObj.proverbs;
    tpObj.totalCount = tpObj.totalWords + tpObj.totalPhrases;
  });

  // Count topics & words per level
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

  // Active level selection (ALL by default or specific level)
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

  // Edit Mode state (persisted in sessionStorage)
  if (typeof window._blueprintEditMode === 'undefined') {
    const stored = sessionStorage.getItem('topscore_blueprint_edit_mode');
    window._blueprintEditMode = (stored === '1');
  }
  let isEditMode = window._blueprintEditMode;

  // Setup Bottom Infobar for Theme Manager
  if (window.setBottomInfobar) {
    const activeLevelLabel = activeLevel === 'ALL' ? 'All (1st, 2nd, 3rd)' : (typeof toShortLevel === 'function' ? toShortLevel(activeLevel) + ' Level' : `Level ${activeLevel}`);
    const activeTopicsCount = activeLevel === 'ALL' ? totalTopicsAll : (levelStats[activeLevel]?.topics || 0);
    const activeThemesCount = activeLevel === 'ALL' ? totalThemesAll : (levelStats[activeLevel]?.themes || 0);

    const leftHtml = `
      <div class="bottom-info-chip"><span class="chip-label">View:</span><span class="chip-val" style="color: #38bdf8;">Theme Manager</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Levels:</span><span class="chip-val" style="color: #f8fafc;">${escapeHtml(activeLevelLabel)}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Themes:</span><span class="chip-val">${activeThemesCount}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Topics:</span><span class="chip-val">${activeTopicsCount}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Vault Items:</span><span class="chip-val">${words.length}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Edit Mode:</span><span class="chip-val" style="color: ${isEditMode ? '#22c55e' : '#ef4444'}; font-weight: 800;">${isEditMode ? 'ON (Hijau)' : 'OFF (Merah)'}</span></div>
    `;
    const rightHtml = `
      <button class="btn btn-secondary btn-sm" id="btn-theme-bottom-merge" style="height: 30px; font-size: 11px; padding: 0 10px; font-weight: 600; background: rgba(30,41,59,0.85); border: 1px solid rgba(255,255,255,0.12); color: #f8fafc; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Merge Similar Topics">⚒️ Merge Topics</button>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
  }

  // Build Clean Table Rows (Theme Manager: NO POS columns!)
  const buildTableBodyHtml = (searchQuery = '') => {
    const q = (searchQuery || '').toLowerCase().trim();
    const levelsToRender = (activeLevel === 'ALL') ? levels : [Number(activeLevel)];
    let rowsHtml = '';
    let visibleTopicsCount = 0;

    levelsToRender.forEach(lvl => {
      const themesMap = levelGroups.get(lvl);
      const lvlLabel = (typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`).toUpperCase();

      const filteredThemes = [];
      const themeList = Array.from(themesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      themeList.forEach(th => {
        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || th.code.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));

        if (topics.length > 0) {
          filteredThemes.push({ code: th.code, name: th.name, topics });
          visibleTopicsCount += topics.length;
        }
      });

      if (filteredThemes.length === 0) {
        if (!q) {
          const totalColspan = 5 + allOrderedProgs.length + 2;
          rowsHtml += `
            <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <td class="cell-level-group" style="text-align: center; vertical-align: middle; font-weight: 800; font-size: 11px; background: rgba(15, 23, 42, 0.95); border-right: 1px solid rgba(255,255,255,0.12); color: #38bdf8; padding: 14px 6px;">
                ${escapeHtml(lvlLabel)}
              </td>
              <td colspan="${totalColspan - 1}" style="text-align: center; padding: 16px 12px; color: #64748b; font-size: 11px; background: rgba(15, 23, 42, 0.4);">
                No topics registered for <strong>${escapeHtml(lvlLabel)} Level</strong> yet.
              </td>
            </tr>
          `;
        }
        return;
      }

      const levelTotalRows = filteredThemes.reduce((sum, th) => sum + th.topics.length, 0);

      filteredThemes.forEach((th, thIdx) => {
        const themeTotalRows = th.topics.length;
        const thCode = String(th.code || '').trim().toUpperCase();

        th.topics.forEach((tp, tpIdx) => {
          const isFirstInLevel = (thIdx === 0 && tpIdx === 0);
          const isFirstInTheme = (tpIdx === 0);

          rowsHtml += `
            <tr class="blueprint-table-row" data-level="${lvl}" data-theme-code="${thCode}" data-topic="${escapeHtml(tp.name)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              ${isFirstInLevel ? `
                <td rowspan="${levelTotalRows}" class="cell-level-group" style="text-align: center; vertical-align: middle; font-weight: 800; font-size: 11.5px; background: rgba(15, 23, 42, 0.95); border-right: 1px solid rgba(255,255,255,0.12); color: #38bdf8; letter-spacing: 0.5px; padding: 6px;">
                  ${escapeHtml(lvlLabel)}
                </td>
              ` : ''}

              <td class="cell-code" style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); font-size: 11px;">${escapeHtml(tp.topicCode || '—')}</td>

              ${isFirstInTheme ? `
                <td rowspan="${themeTotalRows}" class="cell-theme-name" style="vertical-align: middle; font-weight: 700; font-size: 11.5px; background: rgba(30, 41, 59, 0.35); border-right: 1px solid rgba(255,255,255,0.1); color: #ffffff; padding: 8px 12px;">
                  ${escapeHtml(th.name || '—')}
                </td>
              ` : ''}

              <td style="color: #f1f5f9; font-weight: 600; padding: 8px 12px; border-right: 1px solid rgba(255,255,255,0.08); font-size: 11.5px;">${escapeHtml(tp.name)}</td>

              <!-- Clean Summary Items Chip (Replaces 7 POS Columns) -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.1); white-space: nowrap;">
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 700; padding: 2.5px 8px; border-radius: 4px; font-size: 11px; border: 1px solid rgba(56, 189, 248, 0.3);">${tp.totalCount} items</span>
                <span style="font-size: 10px; color: #94a3b8; margin-left: 4px; font-weight: 500;">(${tp.totalWords}W · ${tp.totalPhrases}P)</span>
              </td>

              <!-- Multi-Tenant Program Assignment Cells (Wide & High Contrast) -->
              ${allOrderedProgs.map(p => {
                const assignKey = `${thCode}_${lvl}_${p.id}`;
                const isAssigned = assignSet.has(assignKey);
                return `
                  <td class="cell-program-assignment ${isEditMode ? 'editable' : 'locked'}" 
                      data-level="${lvl}" 
                      data-theme-code="${thCode}" 
                      data-program-id="${p.id}" 
                      data-program-name="${escapeHtml(p.name)}" 
                      data-assigned="${isAssigned ? 'true' : 'false'}" 
                      style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); cursor: ${isEditMode ? 'pointer' : 'default'};">
                    ${isAssigned 
                      ? '<span class="badge-program-assigned">🟢 Active</span>' 
                      : '<span class="badge-program-unassigned">⚪ —</span>'}
                  </td>
                `;
              }).join('')}

              <!-- Actions (Rename & Delete) -->
              <td style="padding: 6px 4px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06); width: 44px;">
                <button type="button" class="btn-edit-topic-mini" data-topic="${escapeHtml(tp.name)}" title="Rename Topic" ${!isEditMode ? 'disabled style="background:transparent;border:none;opacity:0.25;cursor:not-allowed;"' : 'style="background:transparent;border:none;opacity:1;cursor:pointer;color:#38bdf8;font-size:12px;padding:2px 4px;"'}>✏️</button>
              </td>
              <td style="padding: 6px 4px; text-align: center; position: sticky; right: 0; background: #0f172a; border-left: 1px solid rgba(255, 255, 255, 0.1); width: 44px;">
                <button type="button" class="btn-del-topic-mini" data-topic="${escapeHtml(tp.name)}" title="Delete Topic" ${!isEditMode ? 'disabled style="background:transparent;border:none;opacity:0.25;cursor:not-allowed;"' : 'style="background:transparent;border:none;opacity:1;cursor:pointer;color:#FF0000;font-size:12px;padding:2px 4px;"'}>🗑️</button>
              </td>
            </tr>
          `;
        });
      });
    });

    return { rowsHtml, visibleTopicsCount };
  };

  const initialRender = buildTableBodyHtml('');

  let html = `
    <div style="display: flex; flex-direction: column; height: 100%; max-height: calc(100vh - 120px); box-sizing: border-box; overflow: hidden; font-family: 'Inter', system-ui, sans-serif; gap: 6px; padding: 0 4px 6px 4px;">
      <!-- Top Control Toolbar -->
      <div style="flex-shrink: 0; padding: 2px 0 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <input type="search" id="vault-topic-search" placeholder="🔍 Search Themes or Topics..." style="width: 220px; height: 32px; font-size: 11.5px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.12); color: #fff; border-radius: 6px; padding: 0 10px; outline: none;">

          <!-- Curriculum Level Selector Tabs -->
          <div style="display: flex; gap: 4px; align-items: center; background: rgba(15,23,42,0.7); padding: 3px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.1);" title="Filter Curriculum Level">
            <button type="button" class="btn-theme-curriculum-tab" data-lvl="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 12px; border-radius: 5px; cursor: pointer; transition: all 0.2s ease; border: none; ${activeLevel === 'ALL' ? 'background: #3b82f6; color: #ffffff; box-shadow: 0 2px 6px rgba(59,130,246,0.4);' : 'background: transparent; color: #94a3b8;'}">🎯 ALL LEVELS (${totalTopicsAll})</button>
            ${levels.map(lvl => {
              const isActive = (String(activeLevel) === String(lvl));
              const count = levelStats[lvl]?.topics || 0;
              const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`;
              return `<button type="button" class="btn-theme-curriculum-tab" data-lvl="${lvl}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 12px; border-radius: 5px; cursor: pointer; transition: all 0.2s ease; border: none; ${isActive ? 'background: #3b82f6; color: #ffffff; box-shadow: 0 2px 6px rgba(59,130,246,0.4);' : 'background: transparent; color: #94a3b8;'}">🎯 ${shortLbl} (${count})</button>`;
            }).join('')}
          </div>
        </div>

        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; font-size: 11px; padding: 5px 9px; border-radius: 5px;">Themes: <strong style="color:#ffffff;">${totalThemesAll}</strong></span>
          <span style="background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; font-size: 11px; padding: 5px 9px; border-radius: 5px;">Topics: <strong style="color:#ffffff;" id="topic-count-display">${initialRender.visibleTopicsCount}</strong></span>
          <span style="background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.08); color: #94a3b8; font-size: 11px; padding: 5px 9px; border-radius: 5px;">Items: <strong style="color:#38bdf8;">${words.length}</strong></span>
          <button type="button" id="btn-theme-edit-toggle" class="btn-edit-mode-toggle ${isEditMode ? 'mode-on' : 'mode-off'}" style="padding: 4px 10px; font-size: 11px; font-weight: 800; border-radius: 6px; cursor: pointer; border: 1px solid ${isEditMode ? '#22c55e' : '#ef4444'}; background: ${isEditMode ? '#16a34a' : '#dc2626'}; color: #ffffff;" title="Edit mode on (hijau) / off (merah)">EDIT MODE: ${isEditMode ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <!-- Clean Theme Distribution Matrix Table -->
      <div class="table-wrap sticky-first" style="flex: 1; overflow-y: auto; overflow-x: auto; min-height: 0; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
        <table id="blueprint-matrix-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 11px;">
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
              <th rowspan="2" style="padding: 8px 6px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">LEVEL</th>
              <th rowspan="2" style="padding: 8px 6px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">CODE</th>
              <th rowspan="2" style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; min-width: 150px; border-right: 1px solid rgba(255,255,255,0.1);">Theme Name</th>
              <th rowspan="2" style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);">Topic</th>
              <th rowspan="2" style="padding: 8px 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 10px; min-width: 120px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">Vault Items</th>
              
              <!-- Institution Group Headers -->
              ${instProgGroups.map(g => {
                const isTop = (g.inst.code || g.inst.name).toUpperCase().includes('TOP');
                const bg = isTop ? 'rgba(99, 102, 241, 0.25)' : 'rgba(14, 165, 233, 0.25)';
                const color = isTop ? '#a5b4fc' : '#38bdf8';
                return `<th colspan="${g.programs.length}" style="padding: 6px 8px; font-weight: 800; color: ${color}; background: ${bg}; text-transform: uppercase; font-size: 10.5px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">${escapeHtml(g.inst.code || g.inst.name)}</th>`;
              }).join('')}

              <th colspan="2" style="padding: 6px 8px; font-weight: 800; text-align: center; position: sticky; right: 0; background: #1e293b; border-left: 1px solid rgba(255, 255, 255, 0.12); z-index: 12; width: 90px;">ACTIONS</th>
            </tr>

            <!-- Tier 2: Program Sub-headers -->
            <tr>
              ${allOrderedProgs.map(p => {
                const shortProgName = p.name.replace(' Persada', '');
                return `<th style="padding: 6px 8px; font-weight: 700; color: #e2e8f0; font-size: 10px; min-width: 80px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">${escapeHtml(shortProgName)}</th>`;
              }).join('')}

              <th style="padding: 6px 4px; font-weight: 700; color: #38bdf8; font-size: 9px; width: 45px; text-align: center; border-right: 1px solid rgba(255,255,255,0.06);">RENAME</th>
              <th style="padding: 6px 4px; font-weight: 700; color: #f87171; font-size: 9px; width: 45px; text-align: center; position: sticky; right: 0; background: #1e293b; border-left: 1px solid rgba(255,255,255,0.1);">DELETE</th>
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

  // Bind Handlers
  const bindRowActionHandlers = () => {
    // Single-click Program Assignment Toggle
    area.querySelectorAll('.cell-program-assignment').forEach(cell => {
      cell.onclick = async (e) => {
        const cellProg = e.currentTarget;
        if (!window._blueprintEditMode) {
          showToast('Aktifkan EDIT MODE (On) di kanan atas tabel untuk mengubah penugasan tema ke program', 'warning');
          return;
        }

        const lvl = cellProg.getAttribute('data-level');
        const thCode = cellProg.getAttribute('data-theme-code');
        const progId = cellProg.getAttribute('data-program-id');
        const progName = cellProg.getAttribute('data-program-name');
        const isCurrentlyAssigned = (cellProg.getAttribute('data-assigned') === 'true');
        const newAssigned = !isCurrentlyAssigned;

        // Immediate visual update across all rows sharing this theme and level
        const siblingCells = area.querySelectorAll(`.cell-program-assignment[data-level="${lvl}"][data-theme-code="${thCode}"][data-program-id="${progId}"]`);
        siblingCells.forEach(sc => {
          sc.setAttribute('data-assigned', newAssigned ? 'true' : 'false');
          sc.innerHTML = newAssigned 
            ? '<span class="badge-program-assigned">🟢 Active</span>' 
            : '<span class="badge-program-unassigned">⚪ —</span>';
        });

        const assignKey = `${thCode}_${lvl}_${progId}`;
        if (newAssigned) assignSet.add(assignKey);
        else assignSet.delete(assignKey);

        try {
          await toggleThemeProgramAssignment({ themeCode: thCode, targetLevel: lvl, programId: progId, assign: newAssigned });
          showToast(`Tema ${thCode} (Level ${lvl}) ${newAssigned ? 'di-assign ke ' + progName : 'dilepas dari ' + progName}`, 'success');
        } catch (err) {
          siblingCells.forEach(sc => {
            sc.setAttribute('data-assigned', isCurrentlyAssigned ? 'true' : 'false');
            sc.innerHTML = isCurrentlyAssigned 
              ? '<span class="badge-program-assigned">🟢 Active</span>' 
              : '<span class="badge-program-unassigned">⚪ —</span>';
          });
          if (isCurrentlyAssigned) assignSet.add(assignKey);
          else assignSet.delete(assignKey);
          showToast('Gagal mengubah penugasan: ' + err.message, 'error');
        }
      };
    });

    // Rename Topic
    area.querySelectorAll('.btn-edit-topic-mini').forEach(btn => {
      btn.onclick = async (e) => {
        if (!window._blueprintEditMode) {
          showToast('Aktifkan EDIT MODE (On) untuk mengubah nama topik', 'warning');
          return;
        }
        const oldTopic = e.currentTarget.getAttribute('data-topic');
        const newTopic = prompt(`Rename topic "${oldTopic}" to:`, oldTopic);
        if (!newTopic || newTopic.trim() === '' || newTopic === oldTopic) return;
        try {
          showLoading();
          await renameVaultTopic(oldTopic, newTopic.trim());
          hideLoading();
          showToast(`Topic renamed to "${newTopic.trim()}"`, 'success');
          if (typeof renderVocabularyVault === 'function') {
            const container = document.getElementById('classes-detail-canvas');
            if (container) renderVocabularyVault(container);
          }
        } catch (err) {
          hideLoading();
          showToast(`Failed to rename: ${err.message}`, 'error');
        }
      };
    });

    // Delete Topic
    area.querySelectorAll('.btn-del-topic-mini').forEach(btn => {
      btn.onclick = async (e) => {
        if (!window._blueprintEditMode) {
          showToast('Aktifkan EDIT MODE (On) untuk menghapus topik', 'warning');
          return;
        }
        const topic = e.currentTarget.getAttribute('data-topic');
        if (!confirm(`Delete topic "${topic}" and all its vocabulary items from Vault?`)) return;
        try {
          showLoading();
          const sb = await getSupabase();
          const { error } = await sb.from('vocabulary_vault').update({ deleted_at: new Date().toISOString() }).eq('topic', topic);
          hideLoading();
          if (error) throw error;
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
  };

  bindRowActionHandlers();

  // Edit Mode Toggle Button
  const editToggleBtn = document.getElementById('btn-theme-edit-toggle');
  if (editToggleBtn) {
    editToggleBtn.onclick = () => {
      window._blueprintEditMode = !window._blueprintEditMode;
      isEditMode = window._blueprintEditMode;
      try {
        sessionStorage.setItem('topscore_blueprint_edit_mode', isEditMode ? '1' : '0');
      } catch (_) {}

      editToggleBtn.style.background = isEditMode ? '#16a34a' : '#dc2626';
      editToggleBtn.style.borderColor = isEditMode ? '#22c55e' : '#ef4444';
      editToggleBtn.textContent = `EDIT MODE: ${isEditMode ? 'ON' : 'OFF'}`;

      area.querySelectorAll('.cell-program-assignment').forEach(cell => {
        cell.className = `cell-program-assignment ${isEditMode ? 'editable' : 'locked'}`;
        cell.style.cursor = isEditMode ? 'pointer' : 'default';
      });

      area.querySelectorAll('.btn-edit-topic-mini').forEach(btn => {
        btn.disabled = !isEditMode;
        btn.style.opacity = isEditMode ? '1' : '0.25';
        btn.style.cursor = isEditMode ? 'pointer' : 'not-allowed';
      });
      area.querySelectorAll('.btn-del-topic-mini').forEach(btn => {
        btn.disabled = !isEditMode;
        btn.style.opacity = isEditMode ? '1' : '0.25';
        btn.style.cursor = isEditMode ? 'pointer' : 'not-allowed';
      });

      const infoModeEl = document.querySelector('.bottom-info-chip:last-child .chip-val');
      if (infoModeEl) {
        infoModeEl.style.color = isEditMode ? '#22c55e' : '#ef4444';
        infoModeEl.textContent = isEditMode ? 'ON (Hijau)' : 'OFF (Merah)';
      }

      showToast(isEditMode ? 'EDIT MODE diaktifkan. Klik sel program untuk toggle status tema.' : 'EDIT MODE dimatikan (Tabel terkunci).', isEditMode ? 'success' : 'info');
    };
  }

  // Curriculum Selector Tabs
  area.querySelectorAll('.btn-theme-curriculum-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetLvl = e.currentTarget.getAttribute('data-lvl');
      window._themeManagerSelectedLevel = targetLvl;
      _renderThemeManagerTab(area, words, topics, meta);
    });
  });

  // Dynamic Search
  const searchInput = document.getElementById('vault-topic-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value;
      const { rowsHtml, visibleTopicsCount } = buildTableBodyHtml(q);
      const tbody = document.getElementById('theme-manager-tbody');
      if (tbody) tbody.innerHTML = rowsHtml;
      const countEl = document.getElementById('topic-count-display');
      if (countEl) countEl.textContent = visibleTopicsCount;
      bindRowActionHandlers();
    });
  }

  // Merge Topics Button
  const btnMergeBottom = document.getElementById('btn-theme-bottom-merge');
  if (btnMergeBottom) {
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
}


// ─── Phase 370: Theme Blueprint & Vocabulary Test Generator Tab ────
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
    const matchShell = classTests.find(t => (t.test_type === 'quiz' || (t.shell_code && t.shell_code.includes('TASK'))) && 
      (t.shell_code && (t.shell_code.toUpperCase().includes(`${lvl}${thCode}${cleanNum}-WORDS-TASK`) || t.shell_code.toUpperCase().includes(`${lvl}${thCode}${cleanNum}-PHRASES-TASK`))));
    if (matchShell) return matchShell;

    const matchTitle = classTests.find(t => (t.test_type === 'quiz' || (t.shell_code && t.shell_code.includes('TASK'))) && 
      ((t.payload && t.payload.topic === tpName) || (t.title && t.title.toLowerCase().includes(tpName.toLowerCase()))));
    return matchTitle || null;
  };

  // Helper: Find Exam for theme
  const findExamForTheme = (lvl, thCode, thName, classId) => {
    if (!classId) return null;
    const classTests = tests.filter(t => t.class_id === classId);
    const matchShell = classTests.find(t => (t.test_type === 'exam' || (t.shell_code && t.shell_code.includes('EXAM'))) && 
      (t.shell_code && (t.shell_code.toUpperCase().includes(`${lvl}${thCode}-WORDS-EXAM`) || t.shell_code.toUpperCase().includes(`${lvl}${thCode}-PHRASES-EXAM`))));
    if (matchShell) return matchShell;

    const matchTitle = classTests.find(t => (t.test_type === 'exam' || (t.shell_code && t.shell_code.includes('EXAM'))) && 
      ((t.payload && t.payload.theme_code === thCode) || (t.title && t.title.toLowerCase().includes(thName.toLowerCase()))));
    return matchTitle || null;
  };

  // Build Readiness Matrix Rows
  let totalTasksExpected = 0;
  let totalTasksReady = 0;
  let totalExamsExpected = 0;
  let totalExamsReady = 0;

  const buildBlueprintTableRows = (searchQuery = '') => {
    const q = (searchQuery || '').toLowerCase().trim();
    const levelsToRender = (activeLevel === 'ALL') ? levels : [Number(activeLevel)];
    let rowsHtml = '';

    levelsToRender.forEach(lvl => {
      const themesMap = levelGroups.get(lvl);
      const lvlLabel = (typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`).toUpperCase();
      const targetClass = getLevelClass(lvl);

      const filteredThemes = [];
      const themeList = Array.from(themesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      themeList.forEach(th => {
        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || th.code.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));

        if (topics.length > 0) {
          filteredThemes.push({ code: th.code, name: th.name, topics });
        }
      });

      if (filteredThemes.length === 0) return;

      const levelTotalRows = filteredThemes.reduce((sum, th) => sum + th.topics.length, 0);

      filteredThemes.forEach((th, thIdx) => {
        const themeTotalRows = th.topics.length;
        const thCode = String(th.code || '').trim().toUpperCase();
        const examTest = findExamForTheme(lvl, thCode, th.name, targetClass?.id);

        totalExamsExpected++;
        if (examTest) totalExamsReady++;

        th.topics.forEach((tp, tpIdx) => {
          const isFirstInLevel = (thIdx === 0 && tpIdx === 0);
          const isFirstInTheme = (tpIdx === 0);
          const taskTest = findTaskForTopic(lvl, thCode, tp.topicCode, tp.name, targetClass?.id);

          totalTasksExpected++;
          if (taskTest) totalTasksReady++;

          rowsHtml += `
            <tr class="blueprint-table-row" style="border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              ${isFirstInLevel ? `
                <td rowspan="${levelTotalRows}" class="cell-level-group" style="text-align: center; vertical-align: middle; font-weight: 800; font-size: 11.5px; background: rgba(15, 23, 42, 0.95); border-right: 1px solid rgba(255,255,255,0.12); color: #38bdf8; padding: 6px;">
                  ${escapeHtml(lvlLabel)}
                </td>
              ` : ''}

              <td class="cell-code" style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.06); font-size: 11px;">${escapeHtml(tp.topicCode || '—')}</td>

              ${isFirstInTheme ? `
                <td rowspan="${themeTotalRows}" class="cell-theme-name" style="vertical-align: middle; font-weight: 700; font-size: 11.5px; background: rgba(30, 41, 59, 0.35); border-right: 1px solid rgba(255,255,255,0.1); color: #ffffff; padding: 8px 12px;">
                  ${escapeHtml(th.name || '—')}
                </td>
              ` : ''}

              <td style="color: #f1f5f9; font-weight: 600; padding: 8px 12px; border-right: 1px solid rgba(255,255,255,0.08); font-size: 11.5px;">${escapeHtml(tp.name)}</td>

              <!-- Vocab Pool -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.1);">
                <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-weight: 700; padding: 2.5px 8px; border-radius: 4px; font-size: 11px;">${tp.totalCount} items</span>
                <span style="font-size: 10px; color: #94a3b8; margin-left: 4px;">(${tp.totalWords}W · ${tp.totalPhrases}P)</span>
              </td>

              <!-- Task Status (Practice) -->
              <td style="text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.08);">
                ${taskTest 
                  ? `<span class="badge-test-ready" title="${escapeHtml(taskTest.title)}">✅ Ready (${taskTest.working_duration_minutes || 15}m · Min ${taskTest.minimum_required_score || 60}%)</span>`
                  : `<span class="badge-test-missing">⚠️ Missing</span>`}
              </td>

              <!-- Exam Status (Milestone) -->
              ${isFirstInTheme ? `
                <td rowspan="${themeTotalRows}" style="vertical-align: middle; text-align: center; padding: 8px 6px; border-right: 1px solid rgba(255,255,255,0.08); background: rgba(30, 41, 59, 0.25);">
                  ${examTest 
                    ? `<span class="badge-test-ready" style="background:rgba(168,85,247,0.16);color:#c084fc;border-color:rgba(168,85,247,0.35);" title="${escapeHtml(examTest.title)}">✅ Ready (${examTest.working_duration_minutes || 30}m · Min ${examTest.minimum_required_score || 60}%)</span>`
                    : `<span class="badge-test-missing">⚠️ Missing</span>`}
                </td>
              ` : ''}

              <!-- Actions -->
              <td style="text-align: center; padding: 8px 6px;">
                ${targetClass ? `
                  <button type="button" class="btn btn-secondary btn-sm btn-goto-class-hub" data-class-id="${targetClass.id}" style="padding: 3px 8px; font-size: 10.5px; font-weight: 600; background: rgba(30,41,59,0.85); border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; border-radius: 4px; cursor: pointer;">👁️ Class Hub</button>
                ` : `
                  <span style="color: #64748b; font-size: 10px;">No Class</span>
                `}
              </td>
            </tr>
          `;
        });
      });
    });

    return rowsHtml;
  };

  const initialRows = buildBlueprintTableRows('');
  const overallReadyCount = totalTasksReady + totalExamsReady;
  const overallExpectedCount = totalTasksExpected + totalExamsExpected;
  const pctReady = overallExpectedCount > 0 ? Math.round((overallReadyCount / overallExpectedCount) * 100) : 100;

  // Setup Bottom Infobar for Theme Blueprint
  if (window.setBottomInfobar) {
    const activeProgName = activeProgs.find(p => p.id === selectedProgId)?.name || 'Camp';
    const leftHtml = `
      <div class="bottom-info-chip"><span class="chip-label">View:</span><span class="chip-val" style="color: #a855f7;">Theme Blueprint & Generator</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Program:</span><span class="chip-val" style="color: #38bdf8;">${escapeHtml(activeProgName)}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Tasks Ready:</span><span class="chip-val" style="color: #22c55e;">${totalTasksReady} / ${totalTasksExpected}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Exams Ready:</span><span class="chip-val" style="color: #c084fc;">${totalExamsReady} / ${totalExamsExpected}</span></div>
      <div class="bottom-info-chip"><span class="chip-label">Readiness:</span><span class="chip-val" style="color: ${pctReady === 100 ? '#22c55e' : '#f59e0b'}; font-weight: 800;">${pctReady}% Ready</span></div>
    `;
    const rightHtml = `
      <button class="btn btn-secondary btn-sm" id="btn-bp-bottom-settings" style="height: 30px; font-size: 11px; padding: 0 10px; font-weight: 700; background: rgba(14,165,233,0.18); border: 1px solid rgba(14,165,233,0.4); color: #38bdf8; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">⚙️ Test Settings</button>
      <button class="btn btn-primary btn-sm" id="btn-bp-bottom-autogen" style="background: var(--clr-primary); font-size: 11.5px; padding: 0 12px; height: 30px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(99,102,241,0.35); border: none; cursor: pointer; border-radius: 6px;">⚡ Auto-Generate</button>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
  }

  let html = `
    <div style="display: flex; flex-direction: column; height: 100%; max-height: calc(100vh - 120px); box-sizing: border-box; overflow: hidden; font-family: 'Inter', system-ui, sans-serif; gap: 8px; padding: 0 4px 6px 4px;">
      
      <!-- ⚡ Hero Command Bar for Auto-Generator -->
      <div class="bp-hero-command-bar">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <label style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Target Program</label>
            <select id="bp-program-select" style="height: 32px; font-size: 12px; width: 170px; background: rgba(30,41,59,0.9); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; padding: 0 8px; cursor: pointer; outline: none; font-weight: 600;">
              ${activeProgs.map(p => `<option value="${p.id}" ${p.id === selectedProgId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>

          <div style="display: flex; flex-direction: column; gap: 2px;">
            <label style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Curriculum Level</label>
            <div style="display: flex; gap: 3px; align-items: center; background: rgba(15,23,42,0.7); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
              <button type="button" class="btn-bp-level-tab" data-lvl="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 5px; cursor: pointer; border: none; ${activeLevel === 'ALL' ? 'background: #3b82f6; color: #fff;' : 'background: transparent; color: #94a3b8;'}">ALL LEVELS</button>
              ${levels.map(lvl => {
                const isActive = (String(activeLevel) === String(lvl));
                const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : `${lvl}`;
                return `<button type="button" class="btn-bp-level-tab" data-lvl="${lvl}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 5px; cursor: pointer; border: none; ${isActive ? 'background: #3b82f6; color: #fff;' : 'background: transparent; color: #94a3b8;'}">${shortLbl}</button>`;
              }).join('')}
            </div>
          </div>

          <!-- Pacing Snapshot -->
          <div style="display: flex; gap: 8px; align-items: center; padding-left: 8px; border-left: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 10.5px; color: #cbd5e1; background: rgba(30,41,59,0.7); border: 1px solid rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 5px;">
              <span style="color:#94a3b8;">Task:</span> <strong style="color:#f8fafc;">15 min</strong> · <strong style="color:#FFFF00;">60%</strong>
            </div>
            <div style="font-size: 10.5px; color: #cbd5e1; background: rgba(30,41,59,0.7); border: 1px solid rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 5px;">
              <span style="color:#94a3b8;">Exam:</span> <strong style="color:#f8fafc;">30 min</strong> · <strong style="color:#FFFF00;">60%</strong>
            </div>
            <div style="font-size: 10.5px; color: #cbd5e1; background: rgba(30,41,59,0.7); border: 1px solid rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 5px;">
              <span style="color:#94a3b8;">Format:</span> <strong style="color:#38bdf8;">Spoken 7x7</strong>
            </div>
          </div>
        </div>

        <!-- Primary Generator Action Buttons -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn btn-secondary btn-sm" id="btn-bp-settings" style="height: 32px; font-size: 11px; font-weight: 700; background: rgba(14,165,233,0.18); border: 1px solid rgba(14,165,233,0.4); color: #38bdf8; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;" title="Test System Settings">⚙️ Test Settings</button>
          <button class="btn btn-primary btn-sm" id="btn-bp-autogen" style="background: var(--clr-primary); font-size: 12px; padding: 0 14px; height: 34px; font-weight: 800; display: inline-flex; align-items: center; gap: 7px; box-shadow: 0 2px 10px rgba(99,102,241,0.45); border: none; cursor: pointer; border-radius: 6px;" title="Auto-Generate Curriculum Tests">⚡ Auto-Generate All Tests</button>
        </div>
      </div>

      <!-- Test Readiness KPI Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 2px; flex-shrink: 0; font-size: 11px; color: #94a3b8;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <span>Tasks Ready: <strong style="color: #22c55e;">${totalTasksReady} / ${totalTasksExpected}</strong></span>
          <span>Exams Ready: <strong style="color: #c084fc;">${totalExamsReady} / ${totalExamsExpected}</strong></span>
          <span>Total Readiness: <strong style="color: ${pctReady === 100 ? '#22c55e' : '#f59e0b'};">${pctReady}%</strong></span>
        </div>
        <input type="search" id="bp-search-input" placeholder="🔍 Search Topics & Tests..." style="width: 220px; height: 28px; font-size: 11px; background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.12); color: #fff; border-radius: 5px; padding: 0 8px; outline: none;">
      </div>

      <!-- Test Status Matrix Table -->
      <div class="table-wrap sticky-first" style="flex: 1; overflow-y: auto; overflow-x: auto; min-height: 0; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px;">
        <table id="blueprint-matrix-table" style="width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; font-size: 11px;">
          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 10; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr>
              <th style="padding: 8px 6px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">LEVEL</th>
              <th style="padding: 8px 6px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">CODE</th>
              <th style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; min-width: 150px; border-right: 1px solid rgba(255,255,255,0.1);">Theme Name</th>
              <th style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);">Topic</th>
              <th style="padding: 8px 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 10px; min-width: 110px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">Vocab Pool</th>
              <th style="padding: 8px 10px; font-weight: 800; color: #86efac; text-transform: uppercase; font-size: 10px; min-width: 160px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">Task Status (Practice)</th>
              <th style="padding: 8px 10px; font-weight: 800; color: #c084fc; text-transform: uppercase; font-size: 10px; min-width: 160px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">Exam Status (Milestone)</th>
              <th style="padding: 8px 8px; font-weight: 800; color: #f8fafc; text-transform: uppercase; font-size: 10px; width: 90px; text-align: center;">ACTIONS</th>
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

  // Program Select Change Handler
  const progSelect = document.getElementById('bp-program-select');
  if (progSelect) {
    progSelect.onchange = (e) => {
      window._bpSelectedProgramId = e.target.value;
      try { localStorage.setItem('topscore_bp_selected_prog_id', e.target.value); } catch (_) {}
      _renderThemeBlueprintTab(area, words, topics, meta);
    };
  }

  // Level Tabs Handler
  area.querySelectorAll('.btn-bp-level-tab').forEach(btn => {
    btn.onclick = (e) => {
      const lvl = e.currentTarget.getAttribute('data-lvl');
      window._bpSelectedLevel = lvl;
      _renderThemeBlueprintTab(area, words, topics, meta);
    };
  });

  // Dynamic Search Handler
  const bpSearch = document.getElementById('bp-search-input');
  if (bpSearch) {
    bpSearch.oninput = (e) => {
      const rows = buildBlueprintTableRows(e.target.value);
      const tbody = document.getElementById('bp-matrix-tbody');
      if (tbody) tbody.innerHTML = rows;
      bindBpActionHandlers();
    };
  }

  // Action Button Binds
  const bindBpActionHandlers = () => {
    area.querySelectorAll('.btn-goto-class-hub').forEach(btn => {
      btn.onclick = (e) => {
        const classId = e.currentTarget.getAttribute('data-class-id');
        if (classId) {
          window.location.hash = `#class-hub?class_id=${classId}`;
        }
      };
    });
  };
  bindBpActionHandlers();

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

  const btnSettingsTop = document.getElementById('btn-bp-settings');
  if (btnSettingsTop) btnSettingsTop.onclick = triggerSettings;
  const btnSettingsBottom = document.getElementById('btn-bp-bottom-settings');
  if (btnSettingsBottom) btnSettingsBottom.onclick = triggerSettings;

  // Auto-Generate Trigger
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

  const btnAutogenTop = document.getElementById('btn-bp-autogen');
  if (btnAutogenTop) btnAutogenTop.onclick = triggerAutoGenerate;
  const btnAutogenBottom = document.getElementById('btn-bp-bottom-autogen');
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

