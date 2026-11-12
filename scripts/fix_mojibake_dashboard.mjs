import fs from 'fs';

let html = fs.readFileSync('dashboard.html', 'utf8');

// Fix mojibake chars using raw byte sequences
// ðŸ" = bytes: c3 b0 c5 b8 e2 80 9c c2 9d → 📊 (U+1F4CA)
// ðŸ'¬ = bytes: c3 b0 c5 b8 e2 80 99 c2 ac → 💬 (U+1F4AC)
// ðŸŒŸ = bytes: c3 b0 c5 b8 c5 92 c5 b8 e2 80 9e → 🌟 (U+1F31F)

// Use Buffer approach to find and replace exact byte sequences
const buf = Buffer.from(html, 'utf8');

// Find ðŸ" sequence (the chars seen in line 292)
const badBarChart = Buffer.from([0xc3, 0xb0, 0xc5, 0xb8, 0xe2, 0x80, 0x9c, 0xc2, 0x9d]);
const goodBarChart = Buffer.from('📊', 'utf8');

// Find ðŸ'¬ sequence (line 306)  
const badSpeech = Buffer.from([0xc3, 0xb0, 0xc5, 0xb8, 0xe2, 0x80, 0x99, 0xc2, 0xac]);
const goodSpeech = Buffer.from('💬', 'utf8');

function replaceBuf(src, search, replacement) {
  let result = src;
  let idx;
  while ((idx = result.indexOf(search)) !== -1) {
    result = Buffer.concat([result.slice(0, idx), replacement, result.slice(idx + search.length)]);
    console.log(`Fixed at byte offset ${idx}`);
  }
  return result;
}

let fixed = replaceBuf(buf, badBarChart, goodBarChart);
fixed = replaceBuf(fixed, badSpeech, goodSpeech);

fs.writeFileSync('dashboard.html', fixed);
console.log('Write done.');

// Verify
const check = fs.readFileSync('dashboard.html', 'utf8');
const lines = check.split('\n');
console.log('Line 292:', lines[291]);
console.log('Line 306:', lines[305]);
