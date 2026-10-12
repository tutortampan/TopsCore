const fs = require('fs');
let c = fs.readFileSync('assessment.html', 'utf8');

c = c.replace(
    /answerArea\.className = 'h-\[175px\] max-h-\[180px\]/g,
    "answerArea.className = 'flex-1 max-h-[180px]"
);
c = c.replace(
    /answerArea\.style\.cssText = 'height:175px; max-height:180px;/g,
    "answerArea.style.cssText = 'flex:1; min-height:80px; max-height:180px;"
);

c = c.replace(
    /controlArea\.className = 'flex-1 min-h-\[260px\]/g,
    "controlArea.className = 'flex-1 min-h-[120px]"
);
c = c.replace(
    /controlArea\.style\.cssText = 'flex:1; min-height:260px;/g,
    "controlArea.style.cssText = 'flex:1; min-height:120px;"
);

fs.writeFileSync('assessment.html', c);
console.log("Fixed assessment layout");
