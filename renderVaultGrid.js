function _renderVaultGrid(area, words, topics, mode = 'single_words') {
  let title = mode === 'single_words' ? '≡ƒôÜ Single Words' : '≡ƒÆ¼ Expressions, Idioms & Proverbs';
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

  area.innerHTML = `
    <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
      <div>
        <h2 class="section-title text-gradient">${title}</h2>
        <p class="section-subtitle">${desc}</p>
      </div>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-primary btn-sm" id="btn-manual-auto-generate" style="background:var(--clr-primary);">&#9881; Auto-Gen Hierarchy</button>
        <button class="btn btn-secondary btn-sm" id="btn-import-vault">&#128229; Import Excel</button>
        <button class="btn btn-secondary btn-sm" id="btn-export-vault">&#128228; Export Excel</button>
        <button class="btn btn-secondary btn-sm" id="btn-check-duplicates">&#9874; Check Duplicates</button>
        <button class="btn btn-danger btn-sm" id="btn-reset-vault" title="Truncate all vault words ΓÇö clean slate" style="opacity:0.7;">&#128465; Reset Vault</button>
        <button class="btn btn-primary btn-sm" id="btn-create-vocab-assessment">${mode === 'phrases' ? '+ Create Phrase Assessment' : '+ Create Vocab Assessment'}</button>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="card p-3 mb-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
      <div class="d-flex align-center gap-3 flex-wrap">
        <input type="search" class="form-control" id="vault-search" placeholder="Search Indonesian, English, or Topic..." style="max-width:320px;" />
        <select class="form-control" id="vault-topic-filter" style="max-width:220px;">
          <option value="">All Topics</option>
          ${topics.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
        </select>
        <select class="form-control" id="vault-wordtype-filter" style="max-width:180px;">
          <option value="">All Word Types</option>
          ${wordTypeOptions}
        </select>
        <span class="text-muted text-sm" id="vault-count">${words.length} words</span>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <table id="vault-table" style="table-layout: fixed; width: 100%;">
        <thead>
          <tr>
            <th class="text-center" style="width:50px;">NO</th>
            <th class="text-center" style="width:60px;">LEVEL</th>
            <th style="width:15%;">THEME</th>
            <th style="width:15%;">TOPIC</th>
            <th class="text-center" style="width:100px;">WORD TYPE</th>
            <th style="width:20%;">INDONESIAN</th>
            <th style="width:20%;">ENGLISH</th>
            <th class="text-right" style="width:90px;">ACTIONS</th>
          </tr>
        </thead>
        <tbody id="vault-tbody"></tbody>
      </table>
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

  function renderRows(filtered) {
    const tbody = document.getElementById('vault-tbody');
    if (!tbody) return;
    const uniqueIndoCount = new Set(filtered.map(w => w.indonesian.toLowerCase().trim())).size;
    document.getElementById('vault-count').textContent = `${uniqueIndoCount} questions (${filtered.length} entries)`;
    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><div class="empty-state__icon">&#128218;</div><p>No words found. Import an Excel file to get started.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = filtered.map((w, i) => {
      let typeColor = "#3b82f6"; // default blue
      const wt = (w.word_type || 'Vocab').toLowerCase();
      if (wt === 'vocab' || wt === 'vocabulary') typeColor = "#10b981"; // green
      if (wt === 'idiom') typeColor = "#f59e0b"; // yellow/orange
      if (wt === 'expression') typeColor = "#8b5cf6"; // purple
      if (wt === 'proverb') typeColor = "#ef4444"; // red

      return `
      <tr data-word-id="${escapeHtml(w.id)}">
        <td class="text-center text-muted text-sm">${i + 1}</td>
        <td class="text-center cell-level"><span class="badge" style="background:#334155;color:#e2e8f0;font-size:0.75rem;">${escapeHtml(String(w.target_level || '1'))}</span></td>
        <td class="cell-theme"><span class="badge" style="background:rgba(236,72,153,0.15);color:#f472b6;border:1px solid rgba(236,72,153,0.3);font-size:0.75rem;text-transform:capitalize;">${escapeHtml(w.theme || '-')}</span></td>
        <td class="cell-topic"><span class="badge" style="background:rgba(99,102,241,0.15);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3);font-size:0.75rem;text-transform:capitalize;">${escapeHtml(w.topic)}</span></td>
        <td class="text-center cell-wordtype">
          <span style="font-size:0.75rem; padding: 4px 8px; border-radius: 4px; background: ${typeColor}20; color: ${typeColor}; border: 1px solid ${typeColor}40; display: inline-block; text-transform: capitalize;">${escapeHtml(w.word_type || 'Vocab')}</span>
        </td>
        <td class="fw-600 cell-indonesian">${escapeHtml(w.indonesian)}</td>
        <td style="color:var(--clr-text-2);" class="cell-english">${escapeHtml(w.english)}</td>
        <td class="text-right">
          <button class="btn btn-xs btn-edit-vault" data-edit-vault="${escapeHtml(w.id)}" style="background: transparent; color: #3b82f6; border: 1px solid #3b82f6;" title="Edit word">&#9998;</button>
          <button class="btn btn-danger btn-xs" data-del-vault="${escapeHtml(w.id)}" title="Delete word">&#128465;</button>
        </td>
      </tr>
    `}).join('');

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
          const newTheme = tr.querySelector('.edit-theme').value.trim();
          const newTopic = tr.querySelector('.edit-topic').value.trim();
          const newIndo = tr.querySelector('.edit-indo').value.trim();
          const newEng = tr.querySelector('.edit-eng').value.trim();
          const newType = tr.querySelector('.edit-type').value;

          if (!newTopic || !newIndo || !newEng) return showToast('Please fill all required fields.', 'error');

          btn.innerHTML = '&#8987;'; // wait
          btn.disabled = true;

          updateVaultWord(id, {
            theme: newTheme,
            topic: newTopic,
            indonesian: newIndo,
            english: newEng,
            word_type: newType
          }).then(() => {
            showToast('Word updated successfully.', 'success');
            word.theme = newTheme;
            word.topic = newTopic;
            word.indonesian = newIndo;
            word.english = newEng;
            word.word_type = newType;
            filterAndRender();
          }).catch(e => {
            showToast('Update failed: ' + e.message, 'error');
            filterAndRender(); // reset
          });
        } else {
          // Enter edit mode
          tr.classList.add('editing');
          tr.querySelector('.cell-level').innerHTML = '<input type="number" class="input edit-level" style="width: 50px; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.target_level || '1') + '">';
          tr.querySelector('.cell-theme').innerHTML = '<input type="text" class="input edit-theme" style="width: 80px; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.theme || '') + '">';
          tr.querySelector('.cell-topic').innerHTML = '<input type="text" class="input edit-topic" style="width: 80px; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.topic) + '">';
          tr.querySelector('.cell-english').innerHTML = '<input type="text" class="input edit-eng" style="width: 100px; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.english) + '">';
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
          tr.querySelector('.cell-wordtype').innerHTML = `<select class="input edit-type" style="width: 80px; padding: 2px 4px; font-size: 0.8rem;">
            ${mode === 'phrases' ? phraseOpts : vocabOpts}
          </select>`;
          tr.querySelector('.cell-indonesian').innerHTML = '<input type="text" class="input edit-indo" style="width: 100px; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.indonesian) + '">';
          btn.innerHTML = '&#128190;'; // Save icon
          btn.title = 'Save';
          btn.style.color = '#10b981';
          btn.style.borderColor = '#10b981';
        }
      });
    });
  }

  function filterAndRender() {
    const search = (document.getElementById('vault-search')?.value || '').toLowerCase().trim();
    const topic = document.getElementById('vault-topic-filter')?.value || '';
    const wordType = document.getElementById('vault-wordtype-filter')?.value || '';
    let filtered = _allWords;
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

  document.getElementById('vault-search')?.addEventListener('input', filterAndRender);
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
  
  document.getElementById('btn-manual-auto-generate')?.addEventListener('click', async () => {
    const { fetchInstitutions, fetchPrograms, autoGenerateAssessmentsHierarchy } = await import('../api.js?v=4.7.5');
    showLoading();
    try {
      const institutions = await fetchInstitutions();
      hideLoading();
      if (!institutions.length) return showToast('No institutions found.', 'error');
      
      const instId = institutions[0].id; 
      const programs = await fetchPrograms(instId);
      if (!programs.length) return showToast('No programs found in institution.', 'error');
      
      const vaultLevels = [...new Set(_allWords.map(w => parseInt(w.target_level || 1, 10)))].filter(Boolean).sort();
      
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="background:var(--clr-bg-2);padding:2rem;border-radius:12px;width:400px;max-width:90%;">
          <h3 style="margin-top:0;">Auto-Generate Assessments</h3>
          <p>Re-build Assessment Hierarchy (Tasks -> Quizzes -> Exam) using words currently in the Vault.</p>
          <label style="display:block;margin-bottom:0.5rem;font-size:0.85rem;">Select Levels to Generate:</label>
          <div style="max-height:120px;overflow-y:auto;border:1px solid var(--clr-border);padding:0.5rem;margin-bottom:1rem;border-radius:6px;background:var(--clr-bg-1);">
            ${vaultLevels.length ? vaultLevels.map(lvl => `
              <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.25rem;">
                <input type="checkbox" class="autogen-level-chk" value="${lvl}" checked> Level ${lvl}
              </label>
            `).join('') : '<p class="text-muted text-sm m-0">No levels found in Vault.</p>'}
          </div>
          <label style="display:block;margin-bottom:0.5rem;font-size:0.85rem;">Select Program (Target for Gating):</label>
          <select id="auto-gen-prog-select" style="width:100%;padding:0.75rem;margin-bottom:1.5rem;background:var(--clr-bg-1);color:var(--clr-text-1);border:1px solid var(--clr-border);border-radius:6px;">
            ${programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
          <div style="display:flex;justify-content:flex-end;gap:1rem;">
            <button id="auto-gen-cancel" class="btn btn-ghost">Cancel</button>
            <button id="auto-gen-confirm" class="btn btn-primary">Generate</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      
      document.getElementById('auto-gen-cancel').onclick = () => overlay.remove();
      document.getElementById('auto-gen-confirm').onclick = async () => {
        const progId = document.getElementById('auto-gen-prog-select').value;
        const selectedLevels = Array.from(document.querySelectorAll('.autogen-level-chk:checked')).map(cb => parseInt(cb.value, 10));
        
        if (selectedLevels.length === 0) return showToast('Please select at least one level.', 'error');
        
        overlay.innerHTML = `<div style="color:white;text-align:center;"><div class="spinner" style="margin:0 auto 1rem;"></div>Generating Assessment Hierarchy for Level(s) ${selectedLevels.join(', ')}...</div>`;
        try {
           const res = await autoGenerateAssessmentsHierarchy(progId, instId, selectedLevels);
           overlay.remove();
           showToast(`Auto-Gen Success: ${res.tasks} Tasks, ${res.quizzes} Quizzes, ${res.exams} Exams created!`, 'success');
        } catch(err) {
           overlay.remove();
           showToast('Failed to auto-generate: ' + err.message, 'error');
        }
      };
    } catch(err) {
      hideLoading();
      showToast('Error loading auto-gen config: ' + err.message, 'error');
    }
  });
  document.getElementById('btn-check-duplicates')?.addEventListener('click', () => {
    openDuplicateCheckerModal(_allWords, (updatedWords) => {
      _allWords = updatedWords;
      filterAndRender();
    });
  });
  document.getElementById('btn-create-vocab-assessment')?.addEventListener('click', () => {
    if (mode === 'phrases') {
      openAssessmentBuilderModal(topics, { assessmentType: 'IDIOM_PROVERB' });
    } else {
      openAssessmentBuilderModal(topics, { assessmentType: 'VOCAB_MASTERY' });
    }
  });

  document.getElementById('btn-reset-vault')?.addEventListener('click', async () => {
    if (!confirm('ΓÜá∩╕Å DANGER: This will permanently delete ALL vault words from the database. This cannot be undone. Are you absolutely sure?')) return;
    if (!confirm('Second confirmation required. Type OK in the next prompt to confirm.')) return;
    const confirmText = prompt('Type RESET to confirm truncation of all vault words:');
    if (confirmText?.trim().toUpperCase() !== 'RESET') { showToast('Reset cancelled.', 'info'); return; }
    showLoading('Resetting vault...');
    try {
      const sb = await getSupabase();
      const { error } = await sb.from('vocabulary_vault').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      hideLoading();
      if (error) throw error;
      showToast('Γ£ô Vault reset complete. All words deleted.', 'success');
      _allWords = [];
      filterAndRender();
    } catch (e) {
      hideLoading();
      showToast('Reset failed: ' + e.message, 'error');
    }
  });
}

// ΓöÇΓöÇΓöÇ Import Modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function openImportModal(existingWords, topics, onSuccess, mode = 'single_words') {
  const allowedTypesStr = 'Vocab, Noun, Verb, Adjective, Adverb, Expression, Idiom, Proverb';

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.id = 'vault-import-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="modal-box" style="max-width:680px;">
      <div class="d-flex justify-between align-center mb-4">
        <h3 class="fw-700" style="margin:0;">&#128229; Import Vocabulary &amp; Phrases from Excel (Auto-Split)</h3>
        <button class="btn btn-ghost btn-sm" id="close-import-modal">&#10005;</button>
      </div>
      <p class="text-muted text-sm mb-4">
        Upload an <strong>.xlsx</strong> file with columns: <code>TOPIC</code>, <code>INDONESIAN</code>, <code>ENGLISH</code>, <code>WORD TYPE</code><br>
        <span class="text-xs" style="color: #6366f1;">All word types accepted: ${allowedTypesStr}. Rows are auto-classified ΓÇö phrases (Expression/Idiom/Proverb) and single words are split automatically.</span>
      </p>
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
      // Normalize column names
      _parsedRows = raw.map(row => {
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
          normalized[k.trim().toUpperCase()] = String(v).trim();
        }
        return {
          level:      normalized.LEVEL || normalized.TARGET_LEVEL || '1',
          theme:      normalized.THEME || '',
          topic:      normalized.TOPIC || '',
          indonesian: normalized.INDONESIAN || '',
          english:    normalized.ENGLISH || '',
          word_type:  normalized['WORD TYPE'] || normalized.WORD_TYPE || 'Vocab'
        };
      }).filter(r => r.topic && r.indonesian && r.english);

      // Auto-classify rows ΓÇö no filtering/discarding
      const allowedPhraseTypes = ['expression', 'idiom', 'proverb'];
      _parsedRows = _parsedRows.map(r => {
        const wt = (r.word_type || '').toLowerCase();
        return { ...r, _isPhrase: allowedPhraseTypes.includes(wt) };
      });

      hideLoading();
      if (!_parsedRows.length) {
        showToast('No valid rows found. Ensure the file has TOPIC, INDONESIAN, ENGLISH, and WORD TYPE columns.', 'error');
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
      const vocabDupes = duplicateConflicts.filter(c => !allowedPhraseTypes.includes((c.row.word_type||'').toLowerCase())).length;
      const phraseDupes = duplicateConflicts.filter(c => allowedPhraseTypes.includes((c.row.word_type||'').toLowerCase())).length;

      const distributionBadge = `
        <div class="d-flex gap-2 flex-wrap mt-2">
          <span style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">≡ƒôÜ Single Words: ${vocabRows.length} (${vocabDupes} dupes)</span>
          <span style="background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">≡ƒÆ¼ Phrases: ${phraseRows.length} (${phraseDupes} dupes)</span>
          <span style="background:rgba(99,102,241,0.1);color:#818cf8;border:1px solid rgba(99,102,241,0.25);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">≡ƒöû Unique Questions: ${uniqueIndoCount}</span>
          <span style="background:rgba(236,72,153,0.15);color:#f472b6;border:1px solid rgba(236,72,153,0.3);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;">≡ƒôæ Themes: ${uniqueThemes} | Topics: ${uniqueTopics}</span>
        </div>`;

      if (!duplicateConflicts.length) {
        previewArea.innerHTML = `
          <div class="p-3 rounded mb-3" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);">
            <p class="text-success fw-600 mb-1">&#10003; ${_parsedRows.length} total rows parsed ΓÇö no conflicts detected.</p>
            ${distributionBadge}
          </div>
        `;
      } else {
        previewArea.innerHTML = `
          <div class="p-3 rounded mb-3" style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);">
            <p class="fw-600 mb-1" style="color:#f59e0b;">&#9888; ${duplicateConflicts.length} conflict(s) detected ΓÇö choose an action for each:</p>
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

      // Check if any words were imported and extract levels
      const importedLevels = [...new Set(_parsedRows.map(r => parseInt(r.target_level || 1, 10)))].filter(Boolean);
      if (importedLevels.length > 0) {
        if (confirm(`Do you want to Auto-Generate the Assessment Hierarchy (Sequential Gating) for Level(s): ${importedLevels.join(', ')}?`)) {
           // Show simple prompt to get Program ID
           const { fetchInstitutions, fetchPrograms, autoGenerateAssessmentsHierarchy } = await import('../api.js?v=4.7.5');
           
           const institutions = await fetchInstitutions();
           if (!institutions.length) return showToast('No institutions found.', 'error');
           
           // For simplicity in prompt, assume first institution or ask
           const instId = institutions[0].id; 
           const programs = await fetchPrograms(instId);
           
           if (!programs.length) return showToast('No programs found in institution.', 'error');
           
           // Create a simple overlay
           const overlay = document.createElement('div');
           overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
           overlay.innerHTML = `
             <div style="background:var(--clr-bg-2);padding:2rem;border-radius:12px;width:400px;max-width:90%;">
               <h3 style="margin-top:0;">Auto-Generate Assessments</h3>
               <p>Levels to generate: <b>${importedLevels.join(', ')}</b></p>
               <label style="display:block;margin-bottom:0.5rem;font-size:0.85rem;">Select Program (Target for Gating):</label>
               <select id="auto-gen-prog-select" style="width:100%;padding:0.75rem;margin-bottom:1.5rem;background:var(--clr-bg-1);color:var(--clr-text-1);border:1px solid var(--clr-border);border-radius:6px;">
                 ${programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
               </select>
               <div style="display:flex;justify-content:flex-end;gap:1rem;">
                 <button id="auto-gen-cancel" class="btn btn-ghost">Cancel</button>
                 <button id="auto-gen-confirm" class="btn btn-primary">Generate</button>
               </div>
             </div>
           `;
           document.body.appendChild(overlay);
           
           document.getElementById('auto-gen-cancel').onclick = () => overlay.remove();
           document.getElementById('auto-gen-confirm').onclick = async () => {
             const progId = document.getElementById('auto-gen-prog-select').value;
             overlay.innerHTML = `<div style="color:white;text-align:center;"><div class="spinner" style="margin:0 auto 1rem;"></div>Generating Assessment Hierarchy (Tasks -> Quizzes -> Exam) with PREREQUISITES...</div>`;
             try {
                const res = await autoGenerateAssessmentsHierarchy(progId, instId, importedLevels);
                overlay.remove();
                showToast(`Auto-Gen Success: ${res.tasks} Tasks, ${res.quizzes} Quizzes, ${res.exams} Exams created!`, 'success');
             } catch(err) {
                overlay.remove();
                showToast('Failed to auto-generate: ' + err.message, 'error');
             }
           };
        }
      }
    } catch (e) {
      hideLoading();
      showToast('Import failed: ' + e.message, 'error');
    }
  });
}

// ΓöÇΓöÇΓöÇ Assessment Builder Modal (5 Steps) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export async function openAssessmentBuilderModal(initialVaultTopics, overrides = {}) {
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
        <h3 class="fw-700" style="margin:0;">&#10133; ${overrides.editAssessment ? 'Edit' : 'Create'} Vocabulary Assessment</h3>
        <button class="btn btn-ghost btn-sm" id="close-builder-modal">&#10005;</button>
      </div>

      <!-- Step Indicators -->
      <div class="d-flex gap-2 mb-5 flex-wrap" id="step-indicators">
        ${['Scope & Tier','Source','Order & Quota','Schedule'].map((s,i) => `
          <div class="d-flex align-center gap-1 step-ind" data-step="${i+1}" style="font-size:0.78rem;color:${i===0?'var(--clr-primary)':'var(--clr-text-3)'};">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
              background:${i===0?'var(--clr-primary)':'rgba(255,255,255,0.1)'};color:${i===0?'#fff':'var(--clr-text-3)'};font-size:0.72rem;font-weight:700;">${i+1}</span>
            ${s}${i<3?'<span style="color:var(--clr-border);margin-left:6px;">ΓåÆ</span>':''}
          </div>
        `).join('')}
      </div>

      <div id="builder-step-content"></div>

      <div class="d-flex gap-3 justify-between mt-5">
        <button class="btn btn-secondary btn-sm" id="builder-back-btn" style="display:none;">ΓåÉ Back</button>
        <button class="btn btn-primary btn-sm" id="builder-next-btn">Next ΓåÆ</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-builder-modal')?.addEventListener('click', () => modal.remove());

  // State
  const editAsm = overrides.editAssessment || null;
  const state = {
    isEdit: !!editAsm,
    assessmentId: editAsm?.id || null,
    step: overrides.skipStep1 ? 2 : 1,
    institutionId: editAsm?.institution_id || overrides.institutionId || '', institutionName: overrides.institutionName || '',
    programId: editAsm?.program_id || overrides.programId || '', programName: overrides.programName || '',
    classId: editAsm?.class_id || overrides.classId || '', className: overrides.className || '',
    levelId: editAsm?.level_id || overrides.levelId || '', levelName: overrides.levelName || '',
    assessmentType: editAsm?.assessment_type || overrides.assessmentType || 'VOCAB_MASTERY',
    tier: editAsm ? (editAsm.assessment_type.includes('TASK') ? 'TASK' : (editAsm.assessment_type.includes('QUIZ') ? 'QUIZ' : 'EXAM')) : 'TASK',
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
      circle.style.background = isActive ? 'var(--clr-primary)' : isDone ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.1)';
      circle.style.color = (isActive || isDone) ? '#fff' : 'var(--clr-text-3)';
      el.style.color = isActive ? 'var(--clr-primary)' : isDone ? '#10b981' : 'var(--clr-text-3)';
    });
    document.getElementById('builder-back-btn').style.display = currentStep > 1 ? '' : 'none';
    document.getElementById('builder-next-btn').innerHTML = currentStep === 4 ? (state.isEdit ? '&#10003; Save Changes' : '&#10003; Create Assessment') : 'Next ΓåÆ';
  }

  function updateAutoTitle() {
    const parts = [state.institutionName, state.programName, state.levelName, state.className].filter(Boolean);
    let suffix = state.tier === 'TASK' ? 'Task' : (state.tier === 'QUIZ' ? 'Quiz' : 'Exam');
    if (state.tier === 'TASK' && state.sourceTopic) suffix += ` - ${state.sourceTopic}`;
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
      // Scope: Institution ΓåÆ Program ΓåÆ Class ΓåÆ Level + Tier
      showLoading();
      const institutions = await fetchInstitutions();
      hideLoading();
      content.innerHTML = `
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 1 ΓÇö Select Scope & Tier</h4>
        <div class="d-flex gap-4 flex-wrap">
          <div style="flex: 1; min-width: 250px;">
            <div class="form-group">
              <label class="form-label">Institution</label>
              <select class="form-control" id="b-institution">
                <option value="">ΓÇö Select Institution ΓÇö</option>
                ${institutions.map(i => `<option value="${escapeHtml(i.id)}">${escapeHtml(i.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Program</label>
              <select class="form-control" id="b-program" disabled><option value="">ΓÇö Select Institution first ΓÇö</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Target Level</label>
              <select class="form-control" id="b-level" disabled><option value="">ΓÇö Select Program first ΓÇö</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Class</label>
              <select class="form-control" id="b-class" disabled><option value="">ΓÇö Select Level first ΓÇö</option></select>
            </div>
            ${state.isEdit ? '<div class="text-sm mt-3" style="color:var(--clr-warning);"><strong>Note:</strong> Scope and Tier are locked in Edit Mode to preserve history.</div>' : ''}
          </div>
          <div style="flex: 1; min-width: 250px;">
            <label class="form-label">Assessment Tier</label>
            <div class="d-flex flex-column gap-3 mb-3">
              ${[
                { val: 'TASK', icon: '&#128203;', label: 'Task', desc: 'Single topic drill' },
                { val: 'QUIZ', icon: '&#128220;', label: 'Quiz', desc: 'Multi-topic aggregation' },
                { val: 'EXAM', icon: '&#127891;', label: 'Exam', desc: 'Comprehensive aggregation' }
              ].map(t => `
                <label class="d-flex align-center gap-3 p-2 rounded" style="cursor:pointer;border:2px solid ${state.tier===t.val?'var(--clr-primary)':'var(--clr-border)'};background:${state.tier===t.val?'rgba(99,102,241,0.08)':'rgba(255,255,255,0.02)'};">
                  <input type="radio" name="vocab-tier" value="${t.val}" ${state.tier===t.val?'checked':''} style="accent-color:var(--clr-primary);" />
                  <div>
                    <div class="fw-700">${t.icon} ${t.label}</div>
                    <div class="text-muted text-xs mt-1">${t.desc}</div>
                  </div>
                </label>
              `).join('')}
            </div>
            <div class="form-group">
              <label class="form-label">Assessment Title</label>
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
          const [{data:iData}, {data:pData}, {data:lData}, {data:cData}] = await Promise.all([
            state.institutionId ? sb.from('institutions').select('name').eq('id', state.institutionId).single() : {data:null},
            state.programId ? sb.from('programs').select('name').eq('id', state.programId).single() : {data:null},
            state.levelId ? sb.from('levels').select('name,level_number').eq('id', state.levelId).single() : {data:null},
            state.classId ? sb.from('classes').select('name').eq('id', state.classId).single() : {data:null}
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
        bLevel.innerHTML = '<option value="">ΓÇö Select Program first ΓÇö</option>';
        bLevel.disabled = true;
        bClass.innerHTML = '<option value="">ΓÇö Select Level first ΓÇö</option>';
        bClass.disabled = true;
        updateAutoTitle();
        if (!state.institutionId) return;
        const sb = await getSupabase();
        const { data } = await sb.from('programs').select('id,name').eq('institution_id', state.institutionId).eq('is_active', true).is('deleted_at', null).order('name');
        bProgram.innerHTML = '<option value="">ΓÇö Select Program ΓÇö</option>' + (data || []).map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
        bProgram.disabled = false;
        if (state.programId) bProgram.value = state.programId;
      });

      bProgram.addEventListener('change', async () => {
        state.programId = bProgram.value;
        state.programName = bProgram.options[bProgram.selectedIndex]?.text || '';
        bLevel.innerHTML = '<option value="">Loading...</option>';
        bLevel.disabled = true;
        bClass.innerHTML = '<option value="">ΓÇö Select Level first ΓÇö</option>';
        bClass.disabled = true;
        updateAutoTitle();
        if (!state.programId) return;
        const sb = await getSupabase();
        const { data } = await sb.from('levels')
            .select('id,name,level_number')
            .order('level_number', { ascending: true });
        
        let levelData = data || [];
        levelData = levelData.map(l => {
            if (l.level_number === 0) return { ...l, name: 'Level 0 (Universal)' };
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
        bClass.innerHTML = '<option value="">ΓÇö Select Class ΓÇö</option>' + (data || []).map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join('');
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
      content.innerHTML = `<h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 2 ΓÇö Select Source</h4><div id="source-area"><div class="spinner"></div></div>`;
      const sourceArea = document.getElementById('source-area');

      if (state.tier === 'TASK') {
        sourceArea.innerHTML = `
          <p class="text-muted text-sm mb-3">Select the Vault topic for this Task:</p>
          <div class="d-flex flex-column gap-2" style="max-height:280px;overflow-y:auto;" id="topic-radio-list">
            ${vaultTopics.map(t => `
              <label class="d-flex align-center gap-2 p-2 rounded" style="cursor:pointer;border:1px solid ${state.sourceTopic===t?'var(--clr-primary)':'var(--clr-border)'};">
                <input type="radio" name="vault-topic" value="${escapeHtml(t)}" ${state.sourceTopic===t?'checked':''} style="accent-color:var(--clr-primary);" />
                <span class="fw-600 text-sm">${escapeHtml(t)}</span>
              </label>
            `).join('')}
          </div>
        `;
        document.querySelectorAll('input[name="vault-topic"]').forEach(r => {
          r.addEventListener('change', () => { state.sourceTopic = r.value; updateAutoTitle(); });
        });
      } else if (state.tier === 'QUIZ') {
        // Load existing TASK assessments in selected class
        const sb = await getSupabase();
        const { data: tasks } = await sb.from('assessments')
          .select('id,title,description')
          .eq('assessment_type', 'VOCAB_TASK')
          .eq('class_id', state.classId)
          .eq('status', 'PUBLISHED')
          .is('deleted_at', null)
          .order('created_at');
        if (!tasks || !tasks.length) {
          sourceArea.innerHTML = `<p class="text-warning">No Task assessments found in this class. Create Tasks first.</p>`;
        } else {
          sourceArea.innerHTML = `
            <p class="text-muted text-sm mb-3">Select Tasks to aggregate for this Quiz:</p>
            <div class="d-flex flex-column gap-2" style="max-height:280px;overflow-y:auto;">
              ${tasks.map(t => {
                const topicDesc = t.description?.split('Topics: ')?.[1] || 'ΓÇö';
                return `
                <label class="d-flex align-center gap-2 p-2 rounded" style="cursor:pointer;border:1px solid var(--clr-border);">
                  <input type="checkbox" class="source-task-cb" value="${escapeHtml(t.id)}" ${state.sourceTaskIds.includes(t.id)?'checked':''} style="accent-color:var(--clr-primary);" />
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
            });
          });
        }
      } else if (state.tier === 'EXAM') {
        // Load existing QUIZ assessments
        const sb = await getSupabase();
        const { data: quizzes } = await sb.from('assessments')
          .select('id,title,description')
          .eq('assessment_type', 'VOCAB_QUIZ')
          .eq('class_id', state.classId)
          .eq('status', 'PUBLISHED')
          .is('deleted_at', null)
          .order('created_at');
        if (!quizzes || !quizzes.length) {
          sourceArea.innerHTML = `<p class="text-warning">No Quiz assessments found in this class. Create Quizzes first.</p>`;
        } else {
          sourceArea.innerHTML = `
            <p class="text-muted text-sm mb-3">Select Quizzes to aggregate for this Exam:</p>
            <div class="d-flex flex-column gap-2" style="max-height:280px;overflow-y:auto;">
              ${quizzes.map(q => {
                const topicDesc = q.description?.split('Topics: ')?.[1] || 'ΓÇö';
                return `
                <label class="d-flex align-center gap-2 p-2 rounded" style="cursor:pointer;border:1px solid var(--clr-border);">
                  <input type="checkbox" class="source-quiz-cb" value="${escapeHtml(q.id)}" ${state.sourceQuizIds.includes(q.id)?'checked':''} style="accent-color:var(--clr-primary);" />
                  <span class="fw-600 text-sm">${escapeHtml(q.title)}</span>
                  <span class="text-xs text-muted ml-2">Topics: ${escapeHtml(topicDesc)}</span>
                </label>
                `;
              }).join('')}
            </div>
          `;
          document.querySelectorAll('.source-quiz-cb').forEach(cb => {
            cb.addEventListener('change', () => {
              state.sourceQuizIds = [...document.querySelectorAll('.source-quiz-cb:checked')].map(c => c.value);
            });
          });
        }
      }
    }

    else if (step === 3) {
      // Question Order & Quota
      content.innerHTML = `
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 3 ΓÇö Question Order &amp; Quota</h4>

        <div class="form-group">
          <label class="form-label">Question Order</label>
          <div class="d-flex gap-3 flex-wrap">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-order" value="random" ${state.questionOrder==='random'?'checked':''} style="accent-color:var(--clr-primary);" />
              <span>&#128256; Random (Default)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-order" value="sequential" ${state.questionOrder==='sequential'?'checked':''} style="accent-color:var(--clr-primary);" />
              <span>&#10132; Sequential (Vault Order)</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Question Quota</label>
          <div class="d-flex flex-column gap-2">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-quota" value="full" ${state.quotaMode==='full'?'checked':''} style="accent-color:var(--clr-primary);" />
              <span>&#9989; All Questions (100% Full ΓÇö Default)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="q-quota" value="custom" ${state.quotaMode==='custom'?'checked':''} style="accent-color:var(--clr-primary);" />
              <span>&#9881; Custom Sample (Stratified)</span>
            </label>
          </div>
          <div id="custom-quota-area" style="display:${state.quotaMode==='custom'?'block':'none'};margin-top:0.75rem;">
            <input type="number" class="form-control" id="custom-quota-input" min="1" placeholder="Number of questions to sample" value="${state.customQuota||''}" style="max-width:240px;" />
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
        <h4 class="fw-600 mb-3 text-sm" style="color:var(--clr-text-2);">Step 4 ΓÇö Schedule <span style="color:#38bdf8;font-size:0.78rem;">(WITA / GMT+8)</span></h4>

        <div class="form-group">
          <label class="form-label">Schedule Mode</label>
          <div class="d-flex gap-3 flex-wrap">
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="sched-mode" value="batch" ${state.scheduleMode==='batch' || state.scheduleMode==='flexible' ? 'checked' : ''} style="accent-color:var(--clr-primary);" />
              <span>&#128336; Batch Duration (Flexible Self-Paced)</span>
            </label>
            <label class="d-flex align-center gap-2" style="cursor:pointer;">
              <input type="radio" name="sched-mode" value="manual" ${state.scheduleMode==='manual'?'checked':''} style="accent-color:var(--clr-primary);" />
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
          <p class="text-xs fw-700 mb-2" style="color:var(--clr-text-2);">ASSESSMENT SUMMARY</p>
          <div class="text-sm" style="line-height:1.8;">
            <div><strong>Title:</strong> ${escapeHtml(state.title||'(not set)')}</div>
            <div><strong>Tier:</strong> ${escapeHtml(state.tier)}</div>
            <div><strong>Quota:</strong> ${state.quotaMode === 'custom' ? `${state.customQuota||'?'} questions (stratified)` : 'All (100%)'}</div>
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
      if (state.tier === 'TASK' && !state.sourceTopic) {
        showToast('Please select a Vault topic.', 'warning'); return;
      }
      if (state.tier === 'QUIZ' && !state.sourceTaskIds.length) {
        showToast('Please select at least one Task.', 'warning'); return;
      }
      if (state.tier === 'EXAM' && !state.sourceQuizIds.length) {
        showToast('Please select at least one Quiz.', 'warning'); return;
      }
    } else if (state.step === 4) {
      // Final submission
      if (!state.title) { showToast('Assessment title is required.', 'warning'); return; }
      state.windowStart = null;
      state.windowEnd = document.getElementById('b-window-end')?.value
        ? parseWita(document.getElementById('b-window-end').value) : null;
      state.durationMinutes = parseInt(document.getElementById('b-duration')?.value) || 60;

      showLoading(state.isEdit ? 'Saving changes...' : 'Creating assessment...');
      try {
        if (state.isEdit) {
          await updateAssessmentDefinition(state.assessmentId, {
            title: state.title,
            working_duration_minutes: state.durationMinutes,
            availability_start: state.windowStart,
            availability_end: state.windowEnd,
          });
          hideLoading();
          modal.remove();
          showToast(`&#10003; Assessment saved successfully.`, 'success');
        } else {
          const result = await createVocabMasteryAssessment({
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
            assessmentType: state.assessmentType,
            answerType: state.assessmentType === 'IDIOM_PROVERB' ? 'dropdown_10' : 'written'
          });
          hideLoading();
          modal.remove();
          showToast(`&#10003; ${state.tier} created: "${result.title}" ΓÇö ${result.sampledWords} questions.`, 'success');
        }
      } catch (e) {
        hideLoading();
        showToast('Failed to save assessment: ' + e.message, 'error');
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


// ΓöÇΓöÇΓöÇ Domain D: Topic Management Panel ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
