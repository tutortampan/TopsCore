function _renderAssessmentBlueprint(area, words) {
  area.innerHTML = `
    <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
      <div>
        <h2 class="section-title text-gradient">🗺️ Vocabulary Assessment Blueprint</h2>
        <p class="section-subtitle">Visual mapping of generated assessments across levels and themes.</p>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button class="btn btn-primary btn-sm" id="btn-blueprint-auto-gen-words" style="background:var(--clr-primary);">⚡ Gen Words</button>
        <button class="btn btn-primary btn-sm" id="btn-blueprint-auto-gen-phrases" style="background:#10b981;">⚡ Gen Phrases</button>
      </div>
    </div>
    <div id="blueprint-tables-content" style="display: flex; flex-direction: column; gap: 32px;"></div>
  `;

  const contentArea = area.querySelector('#blueprint-tables-content');

  const ordinal = (n) => {
    const num = parseInt(n, 10);
    if (isNaN(num)) return n;
    const s = ["th", "st", "nd", "rd"];
    const v = num % 100;
    return num + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Build Hierarchy: Level -> Theme -> Category -> Topic
  const levels = {};

  words.forEach(w => {
    const lvl = w.target_level ? String(w.target_level) : 'Unassigned';
    const tName = w.theme || 'No Theme';
    const topName = w.topic || 'No Topic';
    const wt = (w.word_type || '').toLowerCase();
    
    const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
    const category = isPhrase ? 'phrases' : 'vocab';

    if (!levels[lvl]) levels[lvl] = {};
    if (!levels[lvl][tName]) levels[lvl][tName] = { vocab: {}, phrases: {} };
    if (!levels[lvl][tName][category][topName]) levels[lvl][tName][category][topName] = 0;
    
    levels[lvl][tName][category][topName]++;
  });

  const sortedLevels = Object.keys(levels).sort((a,b) => {
    if (a==='Unassigned') return 1;
    if (b==='Unassigned') return -1;
    return a.localeCompare(b, undefined, {numeric: true});
  });

  let html = '';

  if (sortedLevels.length === 0) {
    html = '<p class="text-muted" style="margin:0; font-style: italic;">No assessment data available.</p>';
  }

  sortedLevels.forEach(lvl => {
    const lvlPrefix = lvl === 'Unassigned' ? 'Unassigned Level' : ordinal(lvl) + ' Level';
    
    html += '<div class="blueprint-level-section">';

    const themes = levels[lvl];
    const sortedThemeKeys = Object.keys(themes).sort();
    
    sortedThemeKeys.forEach(tName => {
      const vocabTopics = themes[tName].vocab;
      const phraseTopics = themes[tName].phrases;
      
      const sortedVocabTopics = Object.keys(vocabTopics).sort();
      const sortedPhraseTopics = Object.keys(phraseTopics).sort();
      
      if (sortedVocabTopics.length === 0 && sortedPhraseTopics.length === 0) return;

      let vocabTotal = 0;
      let phraseTotal = 0;

      html += \`
        <div style="display: flex; gap: 32px; margin-bottom: 40px; flex-wrap: wrap;">
          
          <!-- Vocabulary Table -->
          <div style="flex: 1; min-width: 450px; background: #fff; border: 2px solid #000;">
            <table style="width: 100%; border-collapse: collapse; color: #000; font-family: sans-serif; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 2px solid #000;">
                  <th style="padding: 6px 12px; text-align: center; border-right: 2px solid #000; font-weight: normal; background: #fff;">\${lvl === 'Unassigned' ? 'Unassigned Level' : 'Level ' + lvl}</th>
                  <th style="padding: 6px 12px; text-align: center; width: 60px; font-weight: normal; background: #fff;">Q</th>
                </tr>
              </thead>
              <tbody>
      \`;

      sortedVocabTopics.forEach(topName => {
        const count = vocabTopics[topName];
        vocabTotal += count;
        html += \`
                <tr style="border-bottom: 1px solid #000;">
                  <td style="padding: 4px 12px; border-right: 2px solid #000; background: #fff;">\${lvlPrefix} Vocabulary Task - \${escapeHtml(topName)}</td>
                  <td style="padding: 4px 12px; text-align: right; background: #fff;">\${count}</td>
                </tr>
        \`;
      });
      
      // Vocab Test Row
      html += \`
                <tr>
                  <td style="padding: 4px 12px; border-right: 2px solid #000; font-weight: bold; background: #fff;">\${lvlPrefix} Vocabulary Test - \${escapeHtml(tName)}</td>
                  <td style="padding: 4px 12px; text-align: right; font-weight: bold; background: #fff;">\${vocabTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Phrase Table -->
          <div style="flex: 1; min-width: 450px; background: #fff; border: 2px solid #000;">
            <table style="width: 100%; border-collapse: collapse; color: #000; font-family: sans-serif; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 2px solid #000;">
                  <th style="padding: 6px 12px; text-align: center; border-right: 2px solid #000; font-weight: normal; background: #fff;">\${lvl === 'Unassigned' ? 'Unassigned Level' : 'Level ' + lvl}</th>
                  <th style="padding: 6px 12px; text-align: center; width: 60px; font-weight: normal; background: #fff;">Q</th>
                </tr>
              </thead>
              <tbody>
      \`;

      sortedPhraseTopics.forEach(topName => {
        const count = phraseTopics[topName];
        phraseTotal += count;
        html += \`
                <tr style="border-bottom: 1px solid #000;">
                  <td style="padding: 4px 12px; border-right: 2px solid #000; background: #fff;">\${lvlPrefix} Phrase Task - \${escapeHtml(topName)}</td>
                  <td style="padding: 4px 12px; text-align: right; background: #fff;">\${count}</td>
                </tr>
        \`;
      });

      // Phrase Test Row
      html += \`
                <tr>
                  <td style="padding: 4px 12px; border-right: 2px solid #000; font-weight: bold; background: #fff;">\${lvlPrefix} Phrase Test - \${escapeHtml(tName)}</td>
                  <td style="padding: 4px 12px; text-align: right; font-weight: bold; background: #fff;">\${phraseTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      \`;
    });
    
    html += \`</div>\`;
  });

  contentArea.innerHTML = html;

  const btnGenWords = area.querySelector('#btn-blueprint-auto-gen-words');
  if (btnGenWords) {
    btnGenWords.addEventListener('click', async () => {
      const { openAutoGenerateModal } = await import('./js/admin/auto-gen-modal.js?v=4.7.6');
      openAutoGenerateModal({ category: 'words' });
    });
  }

  const btnGenPhrases = area.querySelector('#btn-blueprint-auto-gen-phrases');
  if (btnGenPhrases) {
    btnGenPhrases.addEventListener('click', async () => {
      const { openAutoGenerateModal } = await import('./js/admin/auto-gen-modal.js?v=4.7.6');
      openAutoGenerateModal({ category: 'phrases' });
    });
  }
}
