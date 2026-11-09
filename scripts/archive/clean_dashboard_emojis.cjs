const fs = require('fs');

let text = fs.readFileSync('dashboard.html', 'utf8');

text = text.replace(/â„¹ï¸\s*/g, 'ℹ️ ');
text = text.replace(/ðŸ“¸/g, '📷');
text = text.replace(/ðŸ”„/g, '🔄');
text = text.replace(/ðŸ“ˆ/g, '📁');
text = text.replace(/ðŸ“š/g, '📚');
text = text.replace(/ðŸŽ™ï¸\s*/g, '🎙️');
text = text.replace(/ðŸŽ¯/g, '🎯');
text = text.replace(/ðŸ‘†/g, '👆');
text = text.replace(/ðŸ”Š/g, '🔊');
text = text.replace(/ðŸ” /g, '🔍');
text = text.replace(/â–¾/g, '▼');
text = text.replace(/â€¦/g, '...');

fs.writeFileSync('dashboard.html', text, 'utf8');
console.log('Cleaned emojis in dashboard.html successfully');

