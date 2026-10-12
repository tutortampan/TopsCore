const fs = require('fs');
const file = 'd:/TopsCore/assessment.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /let securityConfig = \{ enabled: true, soundEnabled: true, countdownSeconds: 10 \};/g,
  "let securityConfig = { enabled: false, soundEnabled: true, countdownSeconds: 10 };"
);

content = content.replace(
  /if \(fetchedConfig\) securityConfig = fetchedConfig;/g,
  "if (fetchedConfig) { securityConfig = fetchedConfig; securityConfig.enabled = false; } // TEMPORARILY DISABLED BY REQUEST"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Anticheat disabled successfully');
