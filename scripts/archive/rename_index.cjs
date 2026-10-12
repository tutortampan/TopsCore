const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

// HTML renames
c = c.replace(/id="sec-program"/g, 'id="sec-institution"');
c = c.replace(/id="sel-program-label"/g, 'id="sel-institution-label"');
c = c.replace(/id="change-program-btn"/g, 'id="change-institution-btn"');
c = c.replace(/id="body-program"/g, 'id="body-institution"');
c = c.replace(/id="search-program"/g, 'id="search-institution"');
c = c.replace(/id="list-program"/g, 'id="list-institution"');

c = c.replace(/id="sec-class"/g, 'id="sec-program"');
c = c.replace(/id="sel-class-label"/g, 'id="sel-program-label"');
c = c.replace(/id="change-class-btn"/g, 'id="change-program-btn"');
c = c.replace(/id="body-class"/g, 'id="body-program"');
c = c.replace(/id="search-class"/g, 'id="search-program"');
c = c.replace(/id="list-class"/g, 'id="list-program"');

// JS renames
c = c.replace(/function loadPrograms\(/g, 'function loadInstitutions(');
c = c.replace(/loadPrograms\(\);/g, 'loadInstitutions();');
c = c.replace(/const container = document.getElementById\('list-program'\);/g, 'const container = document.getElementById(\'list-institution\');');
c = c.replace(/renderOptions\('list-program', 'search-program', institutions, \(p\) => {/g, 'renderOptions(\'list-institution\', \'search-institution\', institutions, (p) => {');
c = c.replace(/collapseSection\('sec-program', p\.name, 'step-num-1'\);/g, 'collapseSection(\'sec-institution\', p.name, \'step-num-1\');');
c = c.replace(/resetFrom\('class'\);/g, 'resetFrom(\'program\');');
c = c.replace(/loadClasses\(\);/g, 'loadPrograms();');
c = c.replace(/const card = document\.querySelector\('#list-program \.opt-card'\);/g, 'const card = document.querySelector(\'#list-institution .opt-card\');');

c = c.replace(/function loadClasses\(/g, 'function loadPrograms(');
c = c.replace(/unlockSection\('sec-class'\);/g, 'unlockSection(\'sec-program\');');
c = c.replace(/const container = document.getElementById\('list-class'\);/g, 'const container = document.getElementById(\'list-program\');');
c = c.replace(/const programs = await fetchPrograms\(state\.institutionId\);/g, 'const programs = await fetchPrograms(state.institutionId);');
c = c.replace(/renderOptions\('list-class', 'search-class', programs, \(c\) => {/g, 'renderOptions(\'list-program\', \'search-program\', programs, (c) => {');
c = c.replace(/state\.classId = c\.id; state\.className = c\.name;/g, 'state.programId = c.id; state.programName = c.name;');
c = c.replace(/collapseSection\('sec-class', c\.name, 'step-num-2'\);/g, 'collapseSection(\'sec-program\', c.name, \'step-num-2\');');
c = c.replace(/resetFrom\('batch'\);/g, 'resetFrom(\'batch\');');
c = c.replace(/const card = document\.querySelector\('#list-class \.opt-card'\);/g, 'const card = document.querySelector(\'#list-program .opt-card\');');

c = c.replace(/fetchBatches\(state\.classId\)/g, 'fetchBatches(state.programId)');
c = c.replace(/document\.getElementById\('change-program-btn'\)\.addEventListener/g, 'document.getElementById(\'change-institution-btn\').addEventListener');
c = c.replace(/resetFrom\('program'\)/g, 'resetFrom(\'institution\')');
c = c.replace(/document\.getElementById\('change-class-btn'\)\.addEventListener/g, 'document.getElementById(\'change-program-btn\').addEventListener');

c = c.replace(/case 'program':/g, 'case \'institution\':');
c = c.replace(/reopenSection\('sec-program'\);/g, 'reopenSection(\'sec-institution\');');
c = c.replace(/clearOptions\('list-program'\);/g, 'clearOptions(\'list-institution\');');
c = c.replace(/document\.getElementById\('search-program'\)\.value = '';/g, 'document.getElementById(\'search-institution\').value = \'\';');
c = c.replace(/state\.institutionId = null; state\.institutionName = null;/g, 'state.institutionId = null; state.institutionName = null;');

c = c.replace(/case 'class':/g, 'case \'program\':');
c = c.replace(/reopenSection\('sec-class'\);/g, 'reopenSection(\'sec-program\');');
c = c.replace(/clearOptions\('list-class'\);/g, 'clearOptions(\'list-program\');');
c = c.replace(/document\.getElementById\('search-class'\)\.value = '';/g, 'document.getElementById(\'search-program\').value = \'\';');
c = c.replace(/state\.classId = null; state\.className = null;/g, 'state.programId = null; state.programName = null;');

fs.writeFileSync('index.html', c);
console.log("Renamed steps successfully");
