const fs = require('fs');

let apiCode = fs.readFileSync('d:/TopsCore/js/api.js', 'utf8');
apiCode = apiCode.replace(
  "const code = tier === 'TEST' ? `${levelNum}${modulePrefix}-${themeCode}-TEST-${suffix}` : `${levelNum}${modulePrefix}-${topicCode}-${suffix}`;",
  "const code = tier === 'TEST' ? `${levelNum}VOCAB-${themeCode}-TEST-${suffix}` : `${levelNum}VOCAB-${topicCode}-${suffix}`;"
);
fs.writeFileSync('d:/TopsCore/js/api.js', apiCode);

console.log("Hardcoded VOCAB in shell_code generation.");
