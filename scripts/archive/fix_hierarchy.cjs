const fs = require('fs');

let js = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');

// Update getHierarchy
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
      const themeCode = (w.theme_code || '').trim() || 'ZZZ';
      
      if (!hierarchy[level]) hierarchy[level] = {};
      if (!hierarchy[level][themeName]) hierarchy[level][themeName] = { code: themeCode, topics: {} };
      if (!hierarchy[level][themeName].topics[topicName]) hierarchy[level][themeName].topics[topicName] = 0;
      
      hierarchy[level][themeName].topics[topicName]++;
      
      if (hierarchy[level][themeName].code === 'ZZZ' && themeCode !== 'ZZZ') {
        hierarchy[level][themeName].code = themeCode;
      }
    });
    return hierarchy;
  }`;

// Remove whitespace sensitivity
const cleanRegex = (str) => new RegExp(str.replace(/\s+/g, '\\s+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');

js = js.replace(cleanRegex(oldGetHierarchy), newGetHierarchy);

// Update renderThemeBlock for Vocabulary
const oldRenderV = `vThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, vocabHierarchy[lvl][themeName], 'Vocabulary', 'Speech', 'Written', currentTotal);`;

const newRenderV = `vThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, vocabHierarchy[lvl][themeName].topics, 'Vocabulary', 'Speech', 'Written', currentTotal);`;

js = js.replace(cleanRegex(oldRenderV), newRenderV);

// Update renderThemeBlock for Phrases
const oldRenderP = `pThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, phraseHierarchy[lvl][themeName], 'Phrases', 'Dropdown', 'Dropdown', currentTotal);`;

const newRenderP = `pThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, phraseHierarchy[lvl][themeName].topics, 'Phrases', 'Dropdown', 'Dropdown', currentTotal);`;

js = js.replace(cleanRegex(oldRenderP), newRenderP);

fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', js);
console.log('Hierarchy fixed');
