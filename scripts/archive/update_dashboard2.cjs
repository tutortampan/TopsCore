const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// Replace renderCompletedAssessmentsBottom(attempts); with passing avgPct
html = html.replace(/renderCompletedAssessmentsBottom\(attempts\);/g, "renderCompletedAssessmentsBottom(attempts, typeof avgPct !== 'undefined' ? avgPct : 0);");

// Update function signature
html = html.replace('function renderCompletedAssessmentsBottom(attempts) {', 'function renderCompletedAssessmentsBottom(attempts, avgPct = 0) {');

// Update avgScore logic
html = html.replace(
  "const avgScore = uniqueAssessmentsCount > 0 ? (totalPctSum / uniqueAssessmentsCount).toFixed(1) : '0.0';",
  "const avgScore = avgPct;"
);

fs.writeFileSync('dashboard.html', html);
console.log("Updated dashboard.html with unified avgPct");
