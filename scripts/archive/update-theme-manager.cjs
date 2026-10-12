const fs = require('fs');
let c = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');

const startStr = 'function _renderThemeTopicManager(area, words) {';
const endStr = '// ─── Blueprint View';

const startIdx = c.indexOf(startStr);
const endIdx = c.indexOf(endStr, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find bounds");
  process.exit(1);
}

const newFunc = `function _renderThemeTopicManager(area, words) {
  area.innerHTML = \`
    <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
      <div>
        <h2 class="section-title text-gradient">📑 Theme & Topic Manager</h2>
        <p class="section-subtitle">Manage themes and topics across the vault.</p>
      </div>
      <div>
        <button class="btn btn-secondary btn-sm" id="btn-blueprint-dup-checker">&#9874; Check Topic Duplicates</button>
      </div>
    </div>
    <div id="blueprint-content"></div>
  \`;

  const btnDupChecker = document.getElementById('btn-blueprint-dup-checker');
  if (btnDupChecker) {
    btnDupChecker.addEventListener('click', () => {
      const topicMap = new Map();
      words.forEach(w => { if (w.topic) topicMap.set(w.topic, true); });
      const topicEntries = Array.from(topicMap.keys()).map(t => [t]);
      openTopicDuplicateCheckerModal(topicEntries, words, async () => {
        showLoading('Refreshing Blueprint...');
        const newWords = await fetchVaultWords({ limit: 10000, targetLevel: null });
        hideLoading();
        _renderThemeTopicManager(area, newWords);
      });
    });
  }

  const content = document.getElementById('blueprint-content');
  if (!words || words.length === 0) {
    content.innerHTML = '<div class="empty-state"><div class="empty-state__icon">&#128218;</div><p>No data found.</p></div>';
    return;
  }

  // Build Hierarchy: Level -> Theme -> Topic
  const levels = {};
  words.forEach(w => {
    const lvl = w.target_level ? String(w.target_level) : 'Unassigned';
    const tCode = w.theme_code || '';
    const tName = w.theme || 'No Theme';
    const topCode = w.topic_code || '';
    const topName = w.topic || 'No Topic';
    
    if (!levels[lvl]) levels[lvl] = {};
    const themeKey = tName;
    if (!levels[lvl][themeKey]) levels[lvl][themeKey] = { code: tCode, topics: {} };
    
    const topicKey = topName;
    if (!levels[lvl][themeKey].topics[topicKey]) levels[lvl][themeKey].topics[topicKey] = { code: topCode, count: 0 };
    
    levels[lvl][themeKey].topics[topicKey].count++;
  });

  const sortedLevels = Object.keys(levels).sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));

  let html = \`
    <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--clr-border); border-radius: 8px; overflow-x: auto;">
      <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 14px; text-align: left;">
        <thead>
          <tr style="border-bottom: 2px solid var(--clr-border); background: rgba(0,0,0,0.2);">
            <th style="padding: 12px 16px; color: #a5b4fc; font-weight: 600; width: 100px;">Level</th>
            <th style="padding: 12px 16px; color: #a5b4fc; font-weight: 600;">Theme</th>
            <th style="padding: 12px 16px; color: #a5b4fc; font-weight: 600;">Topic</th>
            <th style="padding: 12px 16px; color: #a5b4fc; font-weight: 600; width: 100px; text-align: center;">Words</th>
            <th style="padding: 12px 16px; color: #a5b4fc; font-weight: 600; width: 220px; text-align: right;">Actions</th>
          </tr>
        </thead>
  \`;

  sortedLevels.forEach(lvl => {
    const themes = levels[lvl];
    const sortedThemes = Object.keys(themes).sort();
    
    sortedThemes.forEach(tName => {
      const themeData = themes[tName];
      const topics = themeData.topics;
      const sortedTopics = Object.keys(topics).sort();
      
      html += \`
        <tbody style="border-bottom: 2px solid var(--clr-border);">
          <tr style="background: rgba(255,255,255,0.05); border-bottom: 1px solid var(--clr-border);">
            <td colspan="5" style="padding: 8px 16px;">
              <div class="d-flex justify-between align-center">
                <div>
                  <span style="color: #94a3b8; font-weight: 600; margin-right: 8px;">Level \${escapeHtml(lvl)}</span>
                  <span style="color: #f8fafc; font-weight: 700; font-size: 1.05em;">\${escapeHtml(tName)}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                  <button class="btn-blueprint-rename-theme btn btn-xs btn-secondary" data-theme="\${escapeHtml(tName)}" title="Rename Theme">✏️ Rename Theme</button>
                  <button class="btn-blueprint-delete-theme btn btn-xs btn-danger" data-theme="\${escapeHtml(tName)}" title="Delete Theme">🗑️ Delete Theme</button>
                </div>
              </div>
            </td>
          </tr>
      \`;

      sortedTopics.forEach((topName, idx) => {
        const topData = topics[topName];
        const isLast = idx === sortedTopics.length - 1;
        html += \`
          <tr style="transition: background 0.2s; \${!isLast ? 'border-bottom: 1px solid var(--clr-border);' : ''}" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 10px 16px; color: #cbd5e1;">\${escapeHtml(lvl)}</td>
            <td style="padding: 10px 16px; color: #cbd5e1;">\${escapeHtml(tName)}</td>
            <td style="padding: 10px 16px; color: #f8fafc; font-weight: 500;">
              \${topData.code ? \`<span style="background: #334155; color: #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-right: 6px; font-family: monospace;">\${escapeHtml(topData.code)}</span>\` : ''}
              \${escapeHtml(topName)}
            </td>
            <td style="padding: 10px 16px; text-align: center;">
              <span style="background: rgba(16, 185, 129, 0.1); color: #10b981; padding: 2px 8px; border-radius: 12px; font-weight: 700;">\${topData.count}</span>
            </td>
            <td style="padding: 10px 16px; text-align: right;">
              <div style="display: flex; gap: 6px; justify-content: flex-end;">
                <button class="btn-blueprint-rename-topic btn btn-sm btn-secondary" data-topic="\${escapeHtml(topName)}" style="padding: 4px 10px; font-size: 0.75rem;" title="Rename Topic">✏️ Edit</button>
                <button class="btn-blueprint-delete-topic btn btn-sm btn-danger" data-topic="\${escapeHtml(topName)}" style="padding: 4px 10px; font-size: 0.75rem;" title="Delete Topic">🗑️ Delete</button>
              </div>
            </td>
          </tr>
        \`;
      });
      html += \`</tbody>\`;
    });
  });

  html += \`
      </table>
    </div>
  \`;
  
  content.innerHTML = html;
}
`;

const before = c.substring(0, startIdx);
const after = c.substring(endIdx);
fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', before + newFunc + after);
console.log('Replaced _renderThemeTopicManager');
