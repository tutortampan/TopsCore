const fs = require('fs');
let c = fs.readFileSync('js/admin/assessment-management.js', 'utf8');

c = c.replace(/window\.openAssessmentBuilder\('\$\{id\}'\)/g, "window.openCrudModal('assessments', window._aRecords['${id}'])");
c = c.replace(/window\.openAssessmentGatewayModal\(\)/g, "window.openCrudModal('assessments', null)");
c = c.replace(/const gridData = liveData\.map\(r => \{/, "window._aRecords = {};\n  liveData.forEach(r => window._aRecords[r.id] = r);\n\n  const gridData = liveData.map(r => {");

fs.writeFileSync('js/admin/assessment-management.js', c);
console.log('done');
