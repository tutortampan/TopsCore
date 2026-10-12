const fs = require('fs');
const file = 'd:/TopsCore/js/admin/vocab-vault.js';
let js = fs.readFileSync(file, 'utf8');

// 1. Update getHierarchy
const oldGetHierarchy = `  function getHierarchy(wordSubset) {
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

const newGetHierarchy = `  function getHierarchy(wordSubset) {
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
  }`;

// 2. Update renderThemeBlock topic sorting
const oldRenderThemeBlockTopics = `        if (!topicsData) return { html: '', total: runningTotal };
        const topics = Object.keys(topicsData).sort();
        if (topics.length === 0) return { html: '', total: runningTotal };
        let themeWordCount = 0;`;

const newRenderThemeBlockTopics = `        if (!topicsData) return { html: '', total: runningTotal };
        const topics = Object.keys(topicsData).sort((a,b) => {
           const cA = topicsData[a].code;
           const cB = topicsData[b].code;
           if (cA !== cB && cA !== 'ZZZ' && cB !== 'ZZZ') return cA.localeCompare(cB);
           return a.localeCompare(b);
        });
        if (topics.length === 0) return { html: '', total: runningTotal };
        let themeWordCount = 0;`;

// 3. Update count access
const oldRenderThemeBlockCount = `        // Tasks
        topics.forEach(topicName => {
           const count = topicsData[topicName];
           themeWordCount += count;`;

const newRenderThemeBlockCount = `        // Tasks
        topics.forEach(topicName => {
           const count = topicsData[topicName].count;
           themeWordCount += count;`;


function replaceIgnoringWhitespace(str, search, replace) {
    const searchRegex = new RegExp(search.replace(/\\s+/g, '\\s+').replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'), 'g');
    return str.replace(searchRegex, replace);
}

js = replaceIgnoringWhitespace(js, oldGetHierarchy, newGetHierarchy);
js = replaceIgnoringWhitespace(js, oldRenderThemeBlockTopics, newRenderThemeBlockTopics);
js = replaceIgnoringWhitespace(js, oldRenderThemeBlockCount, newRenderThemeBlockCount);

fs.writeFileSync(file, js);
console.log('Topic sorting added');
