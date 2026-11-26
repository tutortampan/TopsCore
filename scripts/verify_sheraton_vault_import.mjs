import XLSX from 'xlsx';

const wb = XLSX.readFile('./docs/TOP_Sheraton_Level_0_Vocabulary_Vault_360_Words.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

console.log(`Parsed ${raw.length} raw rows.`);

// Simulate vocab-vault.js normalization
const parsedRows = raw.map(row => {
  const normalized = {};
  for (const [k, v] of Object.entries(row)) {
    const cleanKey = String(k || '').trim().toUpperCase().replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ');
    normalized[cleanKey] = String(v ?? '').trim();
  }

  let rawCode = normalized['CODE'] || normalized['TOPIC CODE'] || '';
  let rawThemeCode = normalized['THEME CODE'] || '';
  let rawTheme = normalized['THEME NAME'] || normalized['THEME'] || '';
  let rawTopic = normalized['TOPIC NAME'] || normalized['TOPIC'] || '';

  if (/^[A-Za-z][0-9]+$/.test(rawCode)) {
    rawCode = rawCode.toUpperCase();
    if (!rawThemeCode) rawThemeCode = rawCode[0];
  }

  const rawLevelVal = (normalized.LEVEL !== undefined && normalized.LEVEL !== '') ? normalized.LEVEL : '0';
  const cat = normalized.CATEGORY || '';
  const wt = normalized.TYPE || 'Vocab';

  return {
    institution: normalized.INSTITUTION,
    program: normalized.PROGRAM,
    level: String(rawLevelVal).trim(),
    category: cat,
    theme_code: rawThemeCode.toUpperCase(),
    theme: rawTheme,
    topic_code: rawCode.toUpperCase(),
    topic: rawTopic,
    word_type: wt,
    indonesian: normalized.INDONESIAN || '',
    english: normalized.ENGLISH || '',
    _isPhrase: cat.toLowerCase().includes('phrase')
  };
});

console.log(`Total valid normalized rows: ${parsedRows.length}`);
console.log(`Unique theme codes:`, [...new Set(parsedRows.map(r => r.theme_code))]);
console.log(`Unique topic codes:`, [...new Set(parsedRows.map(r => r.topic_code))]);
console.log(`Unique word types:`, [...new Set(parsedRows.map(r => r.word_type))]);
console.log(`Unique institutions:`, [...new Set(parsedRows.map(r => r.institution))]);
console.log(`Unique programs:`, [...new Set(parsedRows.map(r => r.program))]);
console.log(`Unique levels:`, [...new Set(parsedRows.map(r => r.level))]);
console.log(`All items _isPhrase false:`, parsedRows.every(r => !r._isPhrase));
console.log('Sample item 1:', parsedRows[0]);
console.log('Sample item 150:', parsedRows[149]);
console.log('Sample item 360:', parsedRows[359]);
