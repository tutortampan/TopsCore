
const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// Replace all myAssessments -> assessments for populateUpNext
html = html.replace(/populateUpNext\(attempts, myAssessments\);/g, 'populateUpNext(attempts, assessments);');

// Remove duplicate populateUpNext calls
html = html.replace(/populateUpNext\(attempts, assessments\);\s*populateUpNext\(attempts, assessments\);/g, 'populateUpNext(attempts, assessments);');

fs.writeFileSync('dashboard.html', html);
console.log('Fixed dashboard.html');

