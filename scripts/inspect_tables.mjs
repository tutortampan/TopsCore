import fs from 'fs';

// Let's inspect js/admin/datagrid.js
const datagridCode = fs.readFileSync('js/admin/datagrid.js', 'utf8');
console.log('=== js/admin/datagrid.js summary ===');
// Find how headers and thead are constructed
const tableMarkup = datagridCode.match(/<table[\s\S]*?<\/thead>/i);
if (tableMarkup) {
    console.log('DataGrid thead markup snippet:\n', tableMarkup[0].substring(0, 500));
}

// Find superHeaders handling
const superHeaderMatch = datagridCode.match(/superHeaders[\s\S]{1,400}/g);
console.log('superHeaders occurrences:', superHeaderMatch ? superHeaderMatch.length : 0);

// Let's inspect js/admin/class.js for #class-attendance-grid
const classCode = fs.readFileSync('js/admin/class.js', 'utf8');
const classAttendanceThead = classCode.match(/<thead[\s\S]*?<\/thead>/i);
if (classAttendanceThead) {
    console.log('\n=== js/admin/class.js thead snippet ===\n', classAttendanceThead[0].substring(0, 500));
}

// Let's inspect js/admin/vocab-vault.js
const vocabCode = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const vocabTable = vocabCode.match(/<table[\s\S]*?<\/thead>/gi);
console.log('\n=== js/admin/vocab-vault.js tables ===', vocabTable ? vocabTable.length : 0);
if (vocabTable) {
    vocabTable.forEach((t, i) => console.log(`Table ${i+1}:\n`, t.substring(0, 300)));
}

// Let's inspect dashboard.html and js/dashboard.js
const dashHtml = fs.readFileSync('dashboard.html', 'utf8');
const dashTables = dashHtml.match(/<table[\s\S]*?<\/thead>/gi);
console.log('\n=== dashboard.html tables ===', dashTables ? dashTables.length : 0);
if (dashTables) {
    dashTables.forEach((t, i) => console.log(`Dashboard Table ${i+1}:\n`, t.substring(0, 300)));
}

// Let's inspect result.html and js/result.js
const resultHtml = fs.readFileSync('result.html', 'utf8');
const resultTables = resultHtml.match(/<table[\s\S]*?<\/thead>/gi);
console.log('\n=== result.html tables ===', resultTables ? resultTables.length : 0);
if (resultTables) {
    resultTables.forEach((t, i) => console.log(`Result Table ${i+1}:\n`, t.substring(0, 300)));
}

const resultJs = fs.readFileSync('js/result.js', 'utf8');
const resultJsTables = resultJs.match(/<table[\s\S]*?<\/thead>/gi);
console.log('\n=== js/result.js tables ===', resultJsTables ? resultJsTables.length : 0);
if (resultJsTables) {
    resultJsTables.forEach((t, i) => console.log(`Result JS Table ${i+1}:\n`, t.substring(0, 300)));
}

