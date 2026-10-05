const fs = require('fs');

const file = 'd:/TopsCore/js/admin/vocab-vault.js';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

const newFunc = `  function getHierarchy(wordSubset) {
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
  }`.split('\n');

lines.splice(1381, 15, ...newFunc);
fs.writeFileSync(file, lines.join('\r\n'));
console.log('Hierarchy updated successfully via lines replacement');
