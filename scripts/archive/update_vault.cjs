const fs = require('fs');
let c = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');

// 1. Fix getHierarchy in _renderBlueprintTab to sort by theme_code and topic_code
const oldGetHierarchy = `  function getHierarchy(wordSubset) {
    const hierarchy = {};
    wordSubset.forEach(w => {
      const level = parseInt(w.target_level) || 1;
      const themeName = (w.theme || '').trim() || 'Unassigned Theme';
      const topicName = (w.topic || '').trim() || 'Unassigned Topic';
      
      if (!hierarchy[level]) hierarchy[level] = {};
      if (!hierarchy[level][themeName]) hierarchy[level][themeName] = {};
      if (!hierarchy[level][themeName][topicName]) hierarchy[level][themeName][topicName] = 0;
      
      hierarchy[level][themeName][topicName]++;
    });
    return hierarchy;
  }`;

const newGetHierarchy = `  function getHierarchy(wordSubset) {
    const hierarchy = {};
    wordSubset.forEach(w => {
      const level = parseInt(w.target_level) || 1;
      const themeName = (w.theme || '').trim() || 'Unassigned Theme';
      const topicName = (w.topic || '').trim() || 'Unassigned Topic';
      const themeCode = (w.theme_code || 'ZZZ').trim();
      const topicCode = (w.topic_code || 'ZZZ').trim();
      
      if (!hierarchy[level]) hierarchy[level] = {};
      if (!hierarchy[level][themeName]) hierarchy[level][themeName] = { code: themeCode, topics: {} };
      if (hierarchy[level][themeName].code === 'ZZZ' && themeCode !== 'ZZZ') hierarchy[level][themeName].code = themeCode;
      
      if (!hierarchy[level][themeName].topics[topicName]) hierarchy[level][themeName].topics[topicName] = { code: topicCode, count: 0 };
      if (hierarchy[level][themeName].topics[topicName].code === 'ZZZ' && topicCode !== 'ZZZ') hierarchy[level][themeName].topics[topicName].code = topicCode;
      
      hierarchy[level][themeName].topics[topicName].count++;
    });
    return hierarchy;
  }`;

c = c.replace(oldGetHierarchy, newGetHierarchy);

// 2. Fix the usage of vocabHierarchy and phraseHierarchy
// For totalTasks calculation:
c = c.replace(`totalTasks += Object.keys(vocabHierarchy[lvl][thm] || {}).length;`, `totalTasks += Object.keys(vocabHierarchy[lvl][thm]?.topics || {}).length;`);
c = c.replace(`totalTasks += Object.keys(phraseHierarchy[lvl][thm] || {}).length;`, `totalTasks += Object.keys(phraseHierarchy[lvl][thm]?.topics || {}).length;`);

// 3. Fix the rendering iteration in blueprint
const oldRenderThemeBlock = `const renderThemeBlock = (themeName, topicsData, titleType, taskType, testType, runningTotal) => {
        if (!topicsData) return { html: '', total: runningTotal };
        const topics = Object.keys(topicsData).sort();`;

const newRenderThemeBlock = `const renderThemeBlock = (themeName, topicsData, titleType, taskType, testType, runningTotal) => {
        if (!topicsData || !topicsData.topics) return { html: '', total: runningTotal };
        const topics = Object.keys(topicsData.topics).sort((a,b) => {
           const cA = topicsData.topics[a].code;
           const cB = topicsData.topics[b].code;
           if (cA !== cB && cA !== 'ZZZ' && cB !== 'ZZZ') return cA.localeCompare(cB);
           return a.localeCompare(b);
        });`;
c = c.replace(oldRenderThemeBlock, newRenderThemeBlock);

const oldTopicLoop = `        topics.forEach(topicName => {
           const count = topicsData[topicName];`;
const newTopicLoop = `        topics.forEach(topicName => {
           const count = topicsData.topics[topicName].count;`;
c = c.replace(oldTopicLoop, newTopicLoop);

const oldVThemes = `     const vThemes = Object.keys(vocabHierarchy[lvl] || {}).sort();`;
const newVThemes = `     const vThemes = Object.keys(vocabHierarchy[lvl] || {}).sort((a,b) => {
        const cA = vocabHierarchy[lvl][a].code;
        const cB = vocabHierarchy[lvl][b].code;
        if (cA !== cB && cA !== 'ZZZ' && cB !== 'ZZZ') return cA.localeCompare(cB);
        return a.localeCompare(b);
     });`;
c = c.replace(oldVThemes, newVThemes);

const oldPThemes = `     const pThemes = Object.keys(phraseHierarchy[lvl] || {}).sort();`;
const newPThemes = `     const pThemes = Object.keys(phraseHierarchy[lvl] || {}).sort((a,b) => {
        const cA = phraseHierarchy[lvl][a].code;
        const cB = phraseHierarchy[lvl][b].code;
        if (cA !== cB && cA !== 'ZZZ' && cB !== 'ZZZ') return cA.localeCompare(cB);
        return a.localeCompare(b);
     });`;
c = c.replace(oldPThemes, newPThemes);

// 4. Compact the blueprint UI
c = c.replace(/padding: 6px 10px;/g, 'padding: 4px 8px;');
c = c.replace(/padding: 8px 10px;/g, 'padding: 5px 8px;');
c = c.replace(/margin-bottom: 12px;/g, 'margin-bottom: 8px;');
c = c.replace(/gap: 16px;/g, 'gap: 12px;');
c = c.replace(/padding: 10px 14px;/g, 'padding: 8px 12px;');
c = c.replace(/font-size: 20px;/g, 'font-size: 16px;');
c = c.replace(/font-size: 13px;/g, 'font-size: 12px;');

// 5. Update Topic Manager table to be compact and hide redundant Theme titles
const topicTbodyBlockOld = `    tbody.innerHTML = filteredEntries.map(([topic, data]) => {
      const themesStr = Array.from(data.theme).join(', ') || '-';
      const themeCodeStr = Array.from(data.themeCodes).join(', ') || '-';
      const topicCodeStr = Array.from(data.topicCodes).join(', ') || '-';
      
      const themeDisplay = \`<span style="color:#6366f1; font-weight:bold; margin-right:6px;">\${escapeHtml(themeCodeStr)}</span> \${escapeHtml(themesStr)}\`;
      const topicDisplay = \`<span style="color:#10b981; font-weight:bold; margin-right:6px;">\${escapeHtml(topicCodeStr)}</span> \${escapeHtml(topic)}\`;`;

const topicTbodyBlockNew = `    let lastTheme = null;
    tbody.innerHTML = filteredEntries.map(([topic, data]) => {
      const themesStr = Array.from(data.theme).join(', ') || '-';
      const themeCodeStr = Array.from(data.themeCodes).join(', ') || '-';
      const topicCodeStr = Array.from(data.topicCodes).join(', ') || '-';
      
      let themeDisplay = '';
      if (lastTheme !== themesStr) {
          themeDisplay = \`<span style="color:#6366f1; font-weight:bold; margin-right:6px;">\${escapeHtml(themeCodeStr)}</span> \${escapeHtml(themesStr)}\`;
          lastTheme = themesStr;
      }
      
      const topicDisplay = \`<span style="color:#10b981; font-weight:bold; margin-right:6px;">\${escapeHtml(topicCodeStr)}</span> \${escapeHtml(topic)}\`;`;

c = c.replace(topicTbodyBlockOld, topicTbodyBlockNew);

// Compact topic manager table
c = c.replace(/padding: 8px 12px;/g, 'padding: 4px 8px;');

fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', c);
console.log('vocab-vault updated');
