const fs = require('fs');
const file = 'd:/TopsCore/assessment.html';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<div class="bottom-nav-bar" style="flex-shrink:0; position:relative; margin-top:auto; padding:8px 12px; background: rgba\(15,23,42,0\.95\); display: flex; justify-content: space-between; align-items: center;">/,
  '<div class="bottom-nav-bar" style="flex-shrink:0; position:relative; padding:12px 16px; background: transparent; display: flex; justify-content: space-between; align-items: center; gap:8px;">'
);

content = content.replace(
  /<div class="bottom-nav-status" id="question-counter">0\/0 answered<\/div>/,
  '<div class="bottom-nav-status" id="question-counter" style="font-weight:700; font-size:0.9rem; color:#94a3b8; text-align:center; min-width:100px;">0/0</div>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Replaced successfully');
