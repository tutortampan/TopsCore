const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Rename titles
html = html.replace('My Next Assessment', 'Next Assessment');
html = html.replace('My Classes', 'Classes');
html = html.replace('My Completed Assessments', 'Completed Assessments');

// 2. Remove subtitles
html = html.replace(/<p class="section-subtitle">The next module you need to complete<\/p>/g, '');
html = html.replace(/<p class="section-subtitle">Choose a class to view levels and available Assessments<\/p>/g, '');
html = html.replace(/<p class="section-subtitle">Review your past test performance, scores, and grade achievements<\/p>/g, '');

fs.writeFileSync('dashboard.html', html);
console.log('Text changes done.');
