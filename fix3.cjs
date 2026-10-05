const fs = require('fs');
const file = 'd:/TopsCore/js/admin/vocab-vault.js';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

// Find getHierarchy
const getHierStart = lines.findIndex(l => l.includes('function getHierarchy(wordSubset) {'));
const getHierEnd = lines.findIndex((l, i) => i > getHierStart && l === '  }');

const newGetHier = `  function getHierarchy(wordSubset) {
    const hierarchy = {};
    wordSubset.forEach(w => {
      const level = parseInt(w.target_level) || 1;
      const themeName = (w.theme || '').trim() || 'Unassigned Theme';
      const topicName = (w.topic || '').trim() || 'Unassigned Topic';
      const themeCode = (w.theme_code || '').trim() || 'ZZZ';
      const topicCode = (w.topic_code || '').trim() || 'ZZZ';
      
      if (!hierarchy[level]) hierarchy[level] = {};
      if (!hierarchy[level][themeName]) hierarchy[level][themeName] = { code: themeCode, topics: {} };
      if (!hierarchy[level][themeName].topics[topicName]) hierarchy[level][themeName].topics[topicName] = { code: topicCode, count: 0 };
      
      hierarchy[level][themeName].topics[topicName].count++;
      
      if (hierarchy[level][themeName].code === 'ZZZ' && themeCode !== 'ZZZ') {
        hierarchy[level][themeName].code = themeCode;
      }
      if (hierarchy[level][themeName].topics[topicName].code === 'ZZZ' && topicCode !== 'ZZZ') {
        hierarchy[level][themeName].topics[topicName].code = topicCode;
      }
    });
    return hierarchy;
  }`.split('\n');

lines.splice(getHierStart, getHierEnd - getHierStart + 1, ...newGetHier);

// Find renderThemeBlock topics sorting
const topicsSortStart = lines.findIndex(l => l.includes('const topics = Object.keys(topicsData).sort();'));
if (topicsSortStart !== -1) {
    const newTopicsSort = `        const topics = Object.keys(topicsData).sort((a,b) => {
           const cA = topicsData[a].code;
           const cB = topicsData[b].code;
           if (cA !== cB && cA !== 'ZZZ' && cB !== 'ZZZ') return cA.localeCompare(cB);
           return a.localeCompare(b);
        });`.split('\n');
    lines.splice(topicsSortStart, 1, ...newTopicsSort);
}

// Find count = topicsData[topicName]
let c = 0;
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('const count = topicsData[topicName];')) {
       lines[i] = lines[i].replace('const count = topicsData[topicName];', 'const count = topicsData[topicName].count;');
       c++;
   }
}

fs.writeFileSync(file, lines.join('\r\n'));
console.log('Done, replacements:', c);
