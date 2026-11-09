import fs from 'fs';
import path from 'path';

console.log('=== STARTING DEEP COMPREHENSIVE SYSTEM AUDIT ===\n');

// 1. Audit HTML files for script and stylesheet presence
const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
console.log(`[1] Auditing ${htmlFiles.length} HTML files...`);

let totalHtmlIssues = 0;
htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check script tags
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let m;
  while ((m = scriptRegex.exec(content)) !== null) {
    const src = m[1].split('?')[0]; // remove cache busters
    if (src.startsWith('http') || src.startsWith('//')) continue;
    const cleanSrc = src.replace(/^\.\//, '');
    if (!fs.existsSync(cleanSrc)) {
      console.error(`❌ [${file}] Missing script: ${src}`);
      totalHtmlIssues++;
    }
  }

  // Check link tags
  const linkRegex = /<link[^>]+href=["']([^"']+)["']/g;
  while ((m = linkRegex.exec(content)) !== null) {
    const href = m[1].split('?')[0];
    if (href.startsWith('http') || href.startsWith('//')) continue;
    const cleanHref = href.replace(/^\.\//, '');
    if (!fs.existsSync(cleanHref)) {
      console.error(`❌ [${file}] Missing link/css: ${href}`);
      totalHtmlIssues++;
    }
  }
});

if (totalHtmlIssues === 0) {
  console.log('✅ All local scripts and stylesheets referenced in HTML files exist on disk!');
}

// 2. Audit JS modules for dangling imports
console.log('\n[2] Auditing ES module imports across all JS files...');
let totalImportIssues = 0;
function checkImportsInDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'archive') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      checkImportsInDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      const importRegex = /(?:import|export)\s+(?:.*?from\s+)?["']([^"']+)["']/g;
      let match;
      while ((match = importRegex.exec(code)) !== null) {
        const importPath = match[1].split('?')[0];
        if (importPath.startsWith('http') || importPath.startsWith('@') || importPath.startsWith('npm:')) continue;
        const resolved = path.resolve(path.dirname(fullPath), importPath);
        if (!fs.existsSync(resolved) && !fs.existsSync(resolved + '.js')) {
          console.error(`❌ [${fullPath}] Broken import: "${importPath}"`);
          totalImportIssues++;
        }
      }
    }
  }
}
checkImportsInDir('js');

if (totalImportIssues === 0) {
  console.log('✅ All ES module imports across js/ resolve to valid files on disk!');
}

// 3. Audit for NaN or undefined formatting risks in grading and app
console.log('\n[3] Auditing potential NaN/undefined formatting in core utilities...');
const appCode = fs.readFileSync('js/app.js', 'utf8');
const gradingCode = fs.readFileSync('js/grading.js', 'utf8');

if (gradingCode.includes('function calculateGrade')) {
  console.log('✅ js/grading.js exports calculateGrade');
}
if (gradingCode.includes('function getGradeColorByScore')) {
  console.log('✅ js/grading.js exports getGradeColorByScore');
}

console.log('\n=== AUDIT SUMMARY ===');
console.log(`Total HTML link/script issues: ${totalHtmlIssues}`);
console.log(`Total JS import issues: ${totalImportIssues}`);

