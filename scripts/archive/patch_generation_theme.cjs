const fs = require('fs');

let apiCode = fs.readFileSync('d:/TopsCore/js/api.js', 'utf8');
apiCode = apiCode.replace(
  "const code = tier === 'TEST' ? `${levelNum}VOCAB-${themeCode}-TEST-${suffix}` : `${levelNum}VOCAB-${topicCode}-${suffix}`; // e.g. 3VOCAB-A1-PHR",
  "const code = tier === 'TEST' ? `${levelNum}VOCAB-${themeCode}-TEST-${suffix}` : `${levelNum}VOCAB-${themeCode}${topicCode}-${suffix}`; // e.g. 3VOCAB-A1-PHR"
);
fs.writeFileSync('d:/TopsCore/js/api.js', apiCode);

console.log("Patched api.js to include themeCode in the topic task shell_code.");
