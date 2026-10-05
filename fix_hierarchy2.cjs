const fs = require('fs');

let js = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');

const getHierarchyOld = `  function getHierarchy(wordSubset) {
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

const getHierarchyNew = `  function getHierarchy(wordSubset) {
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

// Remove whitespace sensitivity for replace
function replaceIgnoringWhitespace(str, search, replace) {
    const searchRegex = new RegExp(search.replace(/\s+/g, '\\s+').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    return str.replace(searchRegex, replace);
}

js = replaceIgnoringWhitespace(js, getHierarchyOld, getHierarchyNew);

const renderVOld = `vThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, vocabHierarchy[lvl][themeName], 'Vocabulary', 'Speech', 'Written', currentTotal);`;

const renderVNew = `vThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, vocabHierarchy[lvl][themeName].topics, 'Vocabulary', 'Speech', 'Written', currentTotal);`;

js = replaceIgnoringWhitespace(js, renderVOld, renderVNew);

const renderPOld = `pThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, phraseHierarchy[lvl][themeName], 'Phrases', 'Dropdown', 'Dropdown', currentTotal);`;

const renderPNew = `pThemes.forEach(themeName => {
           const result = renderThemeBlock(themeName, phraseHierarchy[lvl][themeName].topics, 'Phrases', 'Dropdown', 'Dropdown', currentTotal);`;

js = replaceIgnoringWhitespace(js, renderPOld, renderPNew);

fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', js);
console.log('Hierarchy fixed for real');
