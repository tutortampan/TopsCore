import fs from 'fs';

// 1. Update AGENTS.md Rule 2.1
let agentsMd = fs.readFileSync('AGENTS.md', 'utf8');
const oldAgentsRule = `The admin navigation uses the **ABCD System** hierarchy:
1. \`A — ADMIN\` (Executive Dashboard, Profiles, etc.)
2. \`B — BOARD\` (Batches, Rosters, Progress)
3. \`C — CLASS\` (Classes, Levels, Topics, Tests, Banks, Vaults)
4. \`D — DATA\` (Audit Logs, Analytics, Exports)`;

const newAgentsRule = `The admin navigation uses the **ABCD System** hierarchy:
1. \`A — ADMIN\` (Executive Dashboard, Profiles, Curriculum & Level Master, Organization)
2. \`B — BOARD\` (Batches, Rosters, Progress, Student Attendance)
3. \`C — CLASS\` (Active Classes, Learning Sessions, Rosters, Class Tests)
4. \`D — DATA\` (Vocabulary Vault, Item Banks, Modules, System Settings, Audit Logs)`;

if (agentsMd.includes(oldAgentsRule)) {
  agentsMd = agentsMd.replace(oldAgentsRule, newAgentsRule);
  fs.writeFileSync('AGENTS.md', agentsMd, 'utf8');
  console.log('Successfully updated AGENTS.md');
} else {
  console.log('AGENTS.md target rule not found or already updated');
}

// 2. Update js/admin/vocab-vault.js
let vaultJs = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

// A. Deterministic sorting for Lexicon Code indexing
const oldPreIndex = `  // Pre-index all words/phrases per composite topic with stable deterministic Lexicon Codes
  const topicWordIndexMap = new Map();
  const topicCounters = {};
  _allWords.forEach(w => {
    const cleanLvl = parseInt(w.target_level, 10) || 1;
    const cleanThCode = (w.theme_code || 'A').trim().toUpperCase();
    const rawTpCode = (w.topic_code || '1').trim();
    const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '') || rawTpCode || '1';
    const compositeTopic = \`\${cleanLvl}\${cleanThCode}\${cleanTpCode}\`;

    if (!topicCounters[compositeTopic]) topicCounters[compositeTopic] = 0;
    topicCounters[compositeTopic]++;
    const prefix = mode === 'phrases' ? 'P' : 'W';
    const numStr = String(topicCounters[compositeTopic]).padStart(2, '0');
    const lexCode = \`\${compositeTopic}-\${prefix}\${numStr}\`;
    topicWordIndexMap.set(w.id, lexCode);
  });`;

const newPreIndex = `  // Sort deterministically before indexing to guarantee stable Lexicon Code coordinates
  _allWords.sort((a, b) => {
    const lvlA = parseInt(a.target_level, 10) || 1;
    const lvlB = parseInt(b.target_level, 10) || 1;
    if (lvlA !== lvlB) return lvlA - lvlB;
    const codeA = \`\${a.theme_code || 'A'}\${a.topic_code || '1'}\`;
    const codeB = \`\${b.theme_code || 'A'}\${b.topic_code || '1'}\`;
    if (codeA !== codeB) return codeA.localeCompare(codeB, undefined, { numeric: true });
    return (a.english || '').localeCompare(b.english || '');
  });

  // Pre-index all words/phrases per composite topic with stable deterministic Lexicon Codes
  const topicWordIndexMap = new Map();
  const topicCounters = {};
  _allWords.forEach(w => {
    const cleanLvl = parseInt(w.target_level, 10) || 1;
    const cleanThCode = (w.theme_code || 'A').trim().toUpperCase();
    const rawTpCode = (w.topic_code || '1').trim();
    const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '') || rawTpCode || '1';
    const compositeTopic = \`\${cleanLvl}\${cleanThCode}\${cleanTpCode}\`;

    if (!topicCounters[compositeTopic]) topicCounters[compositeTopic] = 0;
    topicCounters[compositeTopic]++;
    const prefix = mode === 'phrases' ? 'P' : 'W';
    const numStr = String(topicCounters[compositeTopic]).padStart(2, '0');
    const lexCode = \`\${compositeTopic}-\${prefix}\${numStr}\`;
    topicWordIndexMap.set(w.id, lexCode);
  });`;

if (vaultJs.includes(oldPreIndex)) {
  vaultJs = vaultJs.replace(oldPreIndex, newPreIndex);
  console.log('Successfully updated Lexicon Code pre-indexing in vocab-vault.js');
}

// B. Add Program filter and Alphabetical sort in Words & Phrases Grid
const oldFilterSelects = `        <select id="vault-wordtype-filter" style="width: 110px; height: 32px; font-size: 11px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Types</option>`;

const newFilterSelects = `        <select id="vault-program-filter" style="width: 105px; height: 32px; font-size: 11px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Programs</option>
          <option value="Camp" \${window._vaultGridProgram === 'Camp' ? 'selected' : ''}>Camp</option>
          <option value="Evnikom" \${window._vaultGridProgram === 'Evnikom' ? 'selected' : ''}>Evnikom</option>
          <option value="Sheraton" \${window._vaultGridProgram === 'Sheraton' ? 'selected' : ''}>Sheraton</option>
        </select>

        <select id="vault-wordtype-filter" style="width: 110px; height: 32px; font-size: 11px; background: rgba(15,23,42,0.85); border: 1px solid rgba(255,255,255,0.15); color: #fff; border-radius: 6px; padding: 0 6px; cursor: pointer;">
          <option value="">All Types</option>`;

if (vaultJs.includes(oldFilterSelects)) {
  vaultJs = vaultJs.replace(oldFilterSelects, newFilterSelects);
  console.log('Successfully added vault-program-filter in vocab-vault.js');
}

// C. Wire program filter and sort alphabetically in filterAndRender
const oldFilterAndRender = `  function filterAndRender() {
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
  }`;

const newFilterAndRender = `  function filterAndRender() {
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
      (w.theme || '').toLowerCase().includes(search)
    );

    // Alphabetical sort by English (A-Z)
    filtered = [...filtered].sort((a, b) => (a.english || '').localeCompare(b.english || ''));

    renderRows(filtered);
  }`;

if (vaultJs.includes(oldFilterAndRender)) {
  vaultJs = vaultJs.replace(oldFilterAndRender, newFilterAndRender);
  console.log('Successfully updated filterAndRender with alphabetical sort and program filter');
}

// D. Bind vault-program-filter in bindVaultGridBottomActions
const oldBindActions = `    const typeSelect = document.getElementById('vault-wordtype-filter');
    if (typeSelect && !typeSelect.dataset.bound) {
      typeSelect.dataset.bound = 'true';
      typeSelect.addEventListener('change', (e) => {
        window._vaultGridType = e.target.value;
        filterAndRender();
      });
    }`;

const newBindActions = `    const typeSelect = document.getElementById('vault-wordtype-filter');
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
    }`;

if (vaultJs.includes(oldBindActions)) {
  vaultJs = vaultJs.replace(oldBindActions, newBindActions);
  console.log('Successfully bound vault-program-filter');
}

// E. Theme Manager Alphabetical Sorting & Program Filter Pills
const oldThemeSort = `      const themeList = Array.from(themesMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        const assignedProgs = allOrderedProgs.filter(p => assignSet.has(\`\${thCode}_\${lvl}_\${p.id}\`));

        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || th.code.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));`;

const newThemeSort = `      // Sort themes alphabetically A-Z by name
      const themeList = Array.from(themesMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        const assignedProgs = allOrderedProgs.filter(p => assignSet.has(\`\${thCode}_\${lvl}_\${p.id}\`));

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
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));`;

if (vaultJs.includes(oldThemeSort)) {
  vaultJs = vaultJs.replace(oldThemeSort, newThemeSort);
  console.log('Successfully updated Theme Manager sorting & program filtering');
}

// F. Theme Manager Bottom Bar Program Pills
const oldBottomBarLvl = `        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn-theme-curriculum-tab" data-lvl="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; \${activeLevel === 'ALL' ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">🎯 ALL (\${totalTopicsAll})</button>
          \${levels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const count = levelStats[lvl]?.topics || 0;
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : \`\${lvl}\`;
            return \`<button type="button" class="btn-theme-curriculum-tab" data-lvl="\${lvl}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; \${isActive ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'};">\${shortLbl} (\${count})</button>\`;
          }).join('')}
        </div>`;

const newBottomBarLvl = `        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn-theme-curriculum-tab" data-lvl="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; \${activeLevel === 'ALL' ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">🎯 ALL (\${totalTopicsAll})</button>
          \${levels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const count = levelStats[lvl]?.topics || 0;
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : \`\${lvl}\`;
            return \`<button type="button" class="btn-theme-curriculum-tab" data-lvl="\${lvl}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; \${isActive ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'};">\${shortLbl} (\${count})</button>\`;
          }).join('')}
        </div>

        <!-- Program Quick Filter Pills -->
        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn-theme-prog-tab" data-prog="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; \${(window._vaultActiveProgramFilter || 'ALL') === 'ALL' ? 'background: #00c000ff; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">PROG: ALL</button>
          \${(() => {
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
              return \`<button type="button" class="btn-theme-prog-tab" data-prog="\${escapeHtml(p.name)}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; \${isPActive ? 'background: #00c000ff; color: #ffffff;' : 'background: transparent; color: #94a3b8;'};">\${escapeHtml(code)}</button>\`;
            }).join('');
          })()}
        </div>`;

if (vaultJs.includes(oldBottomBarLvl)) {
  vaultJs = vaultJs.replace(oldBottomBarLvl, newBottomBarLvl);
  console.log('Successfully added Program Filter Pills in Theme Manager bottom bar');
}

// G. Bind .btn-theme-prog-tab in bindBottomControls
const oldBindTheme = `    document.querySelectorAll('.btn-theme-curriculum-tab').forEach(btn => {
      if (!btn.dataset.bound) {
        btn.dataset.bound = 'true';
        btn.addEventListener('click', (e) => {
          const targetLvl = e.currentTarget.getAttribute('data-lvl');
          window._themeManagerSelectedLevel = targetLvl;
          _renderThemeManagerTab(area, words, topics, meta);
        });
      }
    });`;

const newBindTheme = `    document.querySelectorAll('.btn-theme-curriculum-tab').forEach(btn => {
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
    });`;

if (vaultJs.includes(oldBindTheme)) {
  vaultJs = vaultJs.replace(oldBindTheme, newBindTheme);
  console.log('Successfully bound btn-theme-prog-tab event listeners');
}

// H. Theme Blueprint Alphabetical Sort
const oldBpSort = `      const themeList = Array.from(thMap.values()).sort((a, b) => a.code.localeCompare(b.code));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        // Exclude themes that do not belong to the active program
        if (!isThemeAssignedToProgram(lvl, thCode, targetClass?.id)) return;

        const thExam = findExamForTheme(lvl, thCode, th.name, targetClass?.id);

        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || t.topicCode.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));`;

const newBpSort = `      // Sort blueprint themes alphabetically A-Z by name
      const themeList = Array.from(thMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      themeList.forEach(th => {
        const thCode = String(th.code || '').trim().toUpperCase();
        // Exclude themes that do not belong to the active program
        if (!isThemeAssignedToProgram(lvl, thCode, targetClass?.id)) return;

        const thExam = findExamForTheme(lvl, thCode, th.name, targetClass?.id);

        // Sort blueprint topics alphabetically A-Z by name
        const topics = Array.from(th.topicsMap.values())
          .filter(t => {
            if (!q) return true;
            return t.name.toLowerCase().includes(q) || th.name.toLowerCase().includes(q) || t.topicCode.toLowerCase().includes(q);
          })
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));`;

if (vaultJs.includes(oldBpSort)) {
  vaultJs = vaultJs.replace(oldBpSort, newBpSort);
  console.log('Successfully updated Theme Blueprint sorting');
}

fs.writeFileSync('js/admin/vocab-vault.js', vaultJs, 'utf8');
console.log('Saved all updates to js/admin/vocab-vault.js');
