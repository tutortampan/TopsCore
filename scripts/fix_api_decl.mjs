import fs from 'fs';

let c = fs.readFileSync('js/api.js', 'utf-8');
c = c.replace(
  "const defaultAnswerType = isTest ? (isPhrase ? 'selection' : 'spoken') : 'spoken';",
  "const defaultAnswerType = isTest ? (isPhrase ? 'selection' : 'written') : 'spoken';"
);
c = c.replace(
  "  const defaultAnswerType = (isTest && !isPhrase) ? 'written' : 'spoken';\r\n",
  ""
);
c = c.replace(
  "  const defaultAnswerType = (isTest && !isPhrase) ? 'written' : 'spoken';\n",
  ""
);
fs.writeFileSync('js/api.js', c, 'utf-8');
console.log('Fixed api.js declaration!');
