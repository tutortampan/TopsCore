import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const BRAIN_DIR = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain';
const TARGET_DIR = path.resolve('docs/plans');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

function getSha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
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

  // Clean snake_case or slug
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

// Find all candidate markdown files
const convDirs = fs.readdirSync(BRAIN_DIR);
const candidateFiles = [];

for (const conv of convDirs) {
  const convPath = path.join(BRAIN_DIR, conv);
  try {
    const st = fs.statSync(convPath);
    if (!st.isDirectory()) continue;

    const items = fs.readdirSync(convPath);
    for (const item of items) {
      if (item.endsWith('.md') && item !== 'tasks.md') {
        const fullPath = path.join(convPath, item);
        const fileStat = fs.statSync(fullPath);
        candidateFiles.push({
          fullPath,
          conv: conv.substring(0, 8),
          name: item,
          size: fileStat.size,
          mtime: fileStat.mtime
        });
      }
    }
  } catch (err) {}
}

console.log(`Discovered ${candidateFiles.length} candidate documents across all brain conversations.`);

// Process and copy
const seenHashes = new Set();
const writtenFiles = new Map(); // targetName -> hash
let copiedCount = 0;
let skippedIdenticalCount = 0;
const report = [];

// Sort by date ascending so earlier versions get base name and later get rev
candidateFiles.sort((a, b) => a.mtime - b.mtime);

for (const item of candidateFiles) {
  const content = fs.readFileSync(item.fullPath);
  const hash = getSha256(content);

  if (seenHashes.has(hash)) {
    skippedIdenticalCount++;
    continue;
  }
  seenHashes.add(hash);

  const norm = normalizeTitle(item.name);
  const datePrefix = norm.datePrefix || formatDatePrefix(item.mtime);
  let baseTargetName = `${datePrefix} - ${norm.title}`;

  let targetFileName = `${baseTargetName}.md`;
  let counter = 2;

  while (fs.existsSync(path.join(TARGET_DIR, targetFileName))) {
    const existingContent = fs.readFileSync(path.join(TARGET_DIR, targetFileName));
    const existingHash = getSha256(existingContent);
    if (existingHash === hash) {
      break; // already identical content
    }
    // different revision! preserve it
    targetFileName = `${baseTargetName} (rev ${counter} - ${item.conv}).md`;
    counter++;
  }

  const destPath = path.join(TARGET_DIR, targetFileName);
  fs.writeFileSync(destPath, content);
  copiedCount++;

  report.push({
    file: targetFileName,
    bytes: item.size,
    date: datePrefix,
    conv: item.conv
  });
}

console.log(`\nProcessed ${candidateFiles.length} files:`);
console.log(`- Copied / Updated: ${copiedCount} unique content files`);
console.log(`- Skipped exact identical duplicates: ${skippedIdenticalCount}`);

report.sort((a, b) => b.file.localeCompare(a.file));
console.log('\nAll Files in docs/plans/:');
report.forEach(r => {
  console.log(`[${r.date}] ${r.file} (${r.bytes} B, conv: ${r.conv})`);
});

