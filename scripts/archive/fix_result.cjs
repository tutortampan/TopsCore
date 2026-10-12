const fs = require('fs');
let c = fs.readFileSync('result.html', 'utf8');
c = c.replace(
    "sessionStorage.setItem('topscore_assessment_id', eid);",
    "sessionStorage.setItem('topscore_assessment_id', eid);\n              sessionStorage.removeItem('topscore_attempt_id');"
);
fs.writeFileSync('result.html', c);
console.log('Fixed result.html Try Again');
