import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

// Load the parsed rows
const jsonPath = 'C:/Users/Top/.gemini/antigravity/brain/72b57f3a-ebf1-48f3-b861-e326a260763a/scratch/parsed_rows.json';
const rows = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log(`Loaded ${rows.length} rows.`);

// Define headers according to TopsCore Vocabulary Vault standard
const headers = [
  'Institution',
  'Program',
  'Level',
  'Category',
  'Code',
  'Theme',
  'Topic',
  'Type',
  'Indonesian',
  'English'
];

// Convert rows into 2D array: [headers, ...data]
const sheetData = [headers];

rows.forEach(r => {
  sheetData.push([
    r.Institution,
    r.Program,
    r.Level,
    r.Category,
    r.Code,
    r.Theme,
    r.Topic,
    r.Type,
    r.Indonesian,
    r.English
  ]);
});

// Create worksheet
const ws = XLSX.utils.aoa_to_sheet(sheetData);

// Set column widths for readability
ws['!cols'] = [
  { wch: 14 }, // Institution
  { wch: 14 }, // Program
  { wch: 8 },  // Level
  { wch: 12 }, // Category
  { wch: 8 },  // Code
  { wch: 34 }, // Theme
  { wch: 48 }, // Topic
  { wch: 14 }, // Type
  { wch: 36 }, // Indonesian
  { wch: 28 }  // English
];

// Create workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'VaultWords');

// Output file path
const outPath = path.resolve('docs/TOP_Sheraton_Level_0_Vocabulary_Vault_360_Words.xlsx');
XLSX.writeFile(wb, outPath);

console.log(`Excel file successfully created at: ${outPath}`);
console.log(`Total rows: ${sheetData.length} (1 header + ${rows.length} data rows)`);

// Verification check
const readBackWb = XLSX.readFile(outPath);
const readBackWs = readBackWb.Sheets['VaultWords'];
const readBackRows = XLSX.utils.sheet_to_json(readBackWs, { header: 1 });
console.log('Read back headers:', JSON.stringify(readBackRows[0]));
console.log('Read back Row 1:', JSON.stringify(readBackRows[1]));
console.log('Read back Row 360:', JSON.stringify(readBackRows[360]));
console.log('Total read back rows:', readBackRows.length);
