const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// Fix 1: assessments -> myAssessments
html = html.replace(/const assessments = assessmentsRaw\.filter\(a => myClassIds\.includes\(a\.class_id\) \|\| myClassIds\.includes\(a\.Class_id\)\);/g, 'const myAssessments = assessmentsRaw.filter(a => myClassIds.includes(a.class_id) || myClassIds.includes(a.Class_id));');

// Fix 2: stat-overall-grade-value encoding artifact
// I will just replace the specific span content. The encoding might be multiple weird bytes, so I'll just match the span and its attributes, and replace its inner text.
html = html.replace(/(<span id="stat-overall-grade-value"[^>]*>)(.*?)(<\/span>)/g, '$1&mdash;$3');

fs.writeFileSync('dashboard.html', html);
console.log('Fixed bugs');
