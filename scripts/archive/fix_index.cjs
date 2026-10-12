const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');

c = c.replace(/const order = \['class', 'batch', 'student', 'pin'\];/g, "const order = ['program', 'batch', 'student', 'pin'];");
c = c.replace(/if \(key === 'class'\) { state\.programId = null; state\.programName = null; }/g, "if (key === 'program') { state.programId = null; state.programName = null; }");

fs.writeFileSync('index.html', c);
console.log("Fixed resetFrom");
