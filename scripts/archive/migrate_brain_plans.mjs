import fs from 'fs';
import path from 'path';

const BRAIN_DIR = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain';
const TARGET_DIR = path.resolve('docs/plans');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push({ fullPath, stat, name: file });
      }
    } catch {
      // skip permission or locked files
    }
  });

  return arrayOfFiles;
}

function formatDatePrefix(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function normalizeTitle(rawName) {
  let base = rawName.replace(/\.md$/i, '');
  
  // If already has YYYYMMDD prefix
  const dateMatch = base.match(/^(\d{8})\s*-\s*(.+)$/);
  if (dateMatch) {
    return { datePrefix: dateMatch[1], title: dateMatch[2].trim() };
  }

  // Convert snake_case or slug to Title Case
  let clean = base
    .replace(/^plan_/i, '')
    .replace(/_plan$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize words
  clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return { datePrefix: null, title: clean };
}

console.log('Scanning brain directory:', BRAIN_DIR);
const allFiles = getAllFiles(BRAIN_DIR);

// Filter plan files
const planFiles = allFiles.filter(f => {
  const lower = f.name.toLowerCase();
  return lower.endsWith('.md') && (lower.includes('plan') || /^\d{8}\s*-/.test(f.name));
});

console.log(`Found ${planFiles.length} candidate plan files across brain sessions.`);

// Group by normalized title to eliminate older duplicate versions
const planMap = new Map();

for (const item of planFiles) {
  const norm = normalizeTitle(item.name);
  const key = norm.title.toLowerCase();

  const fileDate = norm.datePrefix || formatDatePrefix(item.stat.mtime);
  const targetFileName = `${fileDate} - ${norm.title}.md`;

  if (!planMap.has(key)) {
    planMap.set(key, { ...item, targetFileName, mtime: item.stat.mtime });
  } else {
    const existing = planMap.get(key);
    // keep newer or larger
    if (item.stat.mtime > existing.mtime || (item.stat.mtime.getTime() === existing.mtime.getTime() && item.stat.size > existing.stat.size)) {
      planMap.set(key, { ...item, targetFileName, mtime: item.stat.mtime });
    }
  }
}

console.log(`Unique plans after deduplication: ${planMap.size}`);

let copiedCount = 0;
const results = [];

for (const [key, item] of planMap.entries()) {
  const destPath = path.join(TARGET_DIR, item.targetFileName);
  fs.copyFileSync(item.fullPath, destPath);
  copiedCount++;
  results.push({
    title: item.targetFileName,
    bytes: item.stat.size,
    sourceConv: path.basename(path.dirname(item.fullPath))
  });
}

console.log(`\nSuccessfully migrated ${copiedCount} plan files to docs/plans/:\n`);
results.sort((a, b) => b.title.localeCompare(a.title));
results.forEach(r => {
  console.log(`- ${r.title} (${r.bytes} bytes, from ${r.sourceConv})`);
});

