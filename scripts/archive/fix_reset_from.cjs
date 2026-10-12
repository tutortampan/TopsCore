const fs = require('fs');
let lines = fs.readFileSync('d:/TopsCore/index.html', 'utf8');
lines = lines.replace("const order = ['program', 'batch', 'student', 'pin'];", "const order = ['institution', 'program', 'batch', 'student', 'pin'];");
fs.writeFileSync('d:/TopsCore/index.html', lines);
console.log('Fixed order array');
