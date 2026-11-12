const fs = require('fs');
const path = require('path');

const allJsFiles = [];
function findJs(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== 'vendor') findJs(full);
    } else if (f.endsWith('.js') || f.endsWith('.mjs')) {
      allJsFiles.push(full);
    }
  }
}
findJs('js');

const htmlFiles = ['admin.html', 'dashboard.html', 'test.html', 'result.html', 'index.html', 'offline.html'];

// Read all HTML contents and all JS contents
const htmlContents = htmlFiles.map(h => fs.readFileSync(h, 'utf8')).join('\n');
const jsContentsMap = new Map();
for (const f of allJsFiles) {
  jsContentsMap.set(f, fs.readFileSync(f, 'utf8'));
}

const windowProps = new Set();
const topLevelFunctions = new Set();
for (const [f, content] of jsContentsMap.entries()) {
  for (const m of content.matchAll(/window\.([a-zA-Z0-9_$]+)\s*=/g)) {
    windowProps.add(m[1]);
  }
  for (const m of content.matchAll(/^function\s+([a-zA-Z0-9_$]+)\s*\(/gm)) {
    topLevelFunctions.add(m[1]);
  }
}

const unguardedBindings = [];

for (const [file, content] of jsContentsMap.entries()) {
  // Regex for document.getElementById('xxx').onclick or .addEventListener without optional chaining ?.
  const matches = [...content.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)\s*\.(onclick|addEventListener|onchange|onsubmit)/g)];
  for (const m of matches) {
    const id = m[1];
    const op = m[2];
    // Check if id exists in htmlContents or in ANY js template
    let found = false;
    if (htmlContents.includes('id="' + id + '"') || htmlContents.includes("id='" + id + "'") || htmlContents.includes('id=`' + id + '`')) {
      found = true;
    } else {
      for (const [jf, jc] of jsContentsMap.entries()) {
        if (jc.includes('id="' + id + '"') || jc.includes("id='" + id + "'") || jc.includes('id=\\"' + id + '\\"') || jc.includes('id=`' + id + '`')) {
          found = true;
          break;
        }
      }
    }
    if (!found) {
      unguardedBindings.push({ file, id, op, line: content.substring(0, m.index).split('\n').length });
    }
  }
}

// 2. Deep check tests-access.js buttons
const testsAccessContent = fs.readFileSync('js/admin/tests-access.js', 'utf8');
const btnRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi;
const buttonsInAccess = [...testsAccessContent.matchAll(btnRegex)];
console.log('Buttons defined in tests-access.js HTML templates:', buttonsInAccess.length);

const allButtons = [];
for (const [file, content] of jsContentsMap.entries()) {
  const matches = [...content.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/gi)];
  for (const m of matches) {
    const attrs = m[1];
    const text = m[2].trim().replace(/<[^>]+>/g, '').substring(0, 30);
    const idMatch = attrs.match(/id=['"]([^'"]+)['"]/i);
    const classMatch = attrs.match(/class=['"]([^'"]+)['"]/i);
    const onclickMatch = attrs.match(/onclick=['"]([^'"]+)['"]/i);
    allButtons.push({
      file,
      id: idMatch ? idMatch[1] : null,
      cls: classMatch ? classMatch[1] : null,
      hasOnclick: !!onclickMatch,
      onclick: onclickMatch ? onclickMatch[1] : null,
      text
    });
  }
}
console.log('Total buttons found across JS files:', allButtons.length);

// Check if any button has no ID, no class, and no onclick
// 5. Scan for unguarded querySelector('.selector').onclick or addEventListener
const unguardedQuerySelectors = [];
for (const [file, content] of jsContentsMap.entries()) {
  const matches = [...content.matchAll(/(?:document|[a-zA-Z0-9_$]+)\.querySelector\(['"]([^'"]+)['"]\)\s*\.(onclick|addEventListener|onchange|onsubmit)/g)];
  for (const m of matches) {
    const sel = m[1];
    const op = m[2];
    const line = content.substring(0, m.index).split('\n').length;
    unguardedQuerySelectors.push({ file, sel, op, line });
  }
}
console.log('UNGUARDED QUERY SELECTOR BINDINGS:', unguardedQuerySelectors.length);
// 6. Deep check tests-access.js event bindings
const testsAccessFile = 'js/admin/tests-access.js';
const testsAccessCode = fs.readFileSync(testsAccessFile, 'utf8');

const accessIdBindings = [...testsAccessCode.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)\s*\.(onclick|addEventListener|onchange)/g)];
console.log('tests-access.js direct getElementById event bindings:', accessIdBindings.length);
for (const b of accessIdBindings) {
  const id = b[1];
  if (!testsAccessCode.includes('id="' + id + '"') && !testsAccessCode.includes("id='" + id + "'") && !testsAccessCode.includes('id=`' + id + '`')) {
    console.log('  ⚠️ tests-access.js references ID not in its template:', id);
  }
}

// 7. Check if tests-access.js attaches event listeners to dynamic querySelectorAll
const qsAllBindings = [...testsAccessCode.matchAll(/querySelectorAll\(['"]([^'"]+)['"]\)/g)];
console.log('tests-access.js querySelectorAll calls:', qsAllBindings.map(m => m[1]));

// 8. Check all window calls in tests-access.js
const windowCalls = [...testsAccessCode.matchAll(/window\.([a-zA-Z0-9_$]+)\s*\(/g)];
const unexposedWindowCalls = new Set();
for (const wc of windowCalls) {
  const fn = wc[1];
  if (!windowProps.has(fn) && !topLevelFunctions.has(fn) && !global[fn]) {
    unexposedWindowCalls.add(fn);
  }
}
console.log('tests-access.js unexposed window function calls:', [...unexposedWindowCalls]);

// 9. Scan ALL files for window.someMethod() calls that are not exposed
const unexposedMap = new Map();
const browserWindowMethods = new Set([
  'addEventListener', 'removeEventListener', 'alert', 'confirm', 'prompt',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'requestAnimationFrame',
  'cancelAnimationFrame', 'matchMedia', 'scrollTo', 'scrollBy', 'fetch',
  'getComputedStyle', 'open', 'close', 'focus', 'blur', 'postMessage',
  'dispatchEvent', 'location', 'history', 'navigator', 'document', 'localStorage',
  'sessionStorage', 'console', 'encodeURIComponent', 'decodeURIComponent'
]);

for (const [file, content] of jsContentsMap.entries()) {
  const matches = [...content.matchAll(/window\.([a-zA-Z0-9_$]+)\s*\(/g)];
  for (const m of matches) {
    const fn = m[1];
    if (browserWindowMethods.has(fn)) continue;
    if (!windowProps.has(fn) && !topLevelFunctions.has(fn)) {
      if (!unexposedMap.has(fn)) unexposedMap.set(fn, []);
      unexposedMap.get(fn).push(file);
    }
  }
}

console.log('Unexposed window function calls across ALL files:');
// 10. Check all sidebar navigation routes
const adminHtmlContent = fs.readFileSync('admin.html', 'utf8');
const appJsContent = fs.readFileSync('js/admin/app.js', 'utf8');

const navItems = [...adminHtmlContent.matchAll(/data-route=['"]([^'"]+)['"]/g)].map(m => m[1]);
const navLinks = [...adminHtmlContent.matchAll(/href=['"]#([^'"]+)['"]/g)].map(m => m[1]);
console.log('data-route items in admin.html:', navItems);
console.log('href hash links in admin.html:', navLinks);

const handledCases = [...appJsContent.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g)].map(m => m[1]);
console.log('Total handled cases in app.js router:', handledCases.length);

// 11. Student Dashboard Buttons Audit
const dashHtml = fs.readFileSync('dashboard.html', 'utf8');
const dashJs = fs.readFileSync('js/dashboard.js', 'utf8');
const dashButtons = [...dashHtml.matchAll(/<button[^>]*id=['"]([^'"]+)['"][^>]*>/gi)].map(m => m[1]);
console.log('Dashboard HTML button IDs:', dashButtons);
const unhandledDashButtons = dashButtons.filter(id => !dashJs.includes(id) && !dashHtml.includes('onclick='));
console.log('Unhandled Dashboard buttons:', unhandledDashButtons);

// 12. Test Room Buttons Audit
const testHtml = fs.readFileSync('test.html', 'utf8');
const testJs = fs.readFileSync('js/test.js', 'utf8');
const testButtons = [...testHtml.matchAll(/<button[^>]*id=['"]([^'"]+)['"][^>]*>/gi)].map(m => m[1]);
console.log('Test Room HTML button IDs:', testButtons);
const unhandledTestButtons = testButtons.filter(id => !testJs.includes(id) && !testHtml.includes('onclick='));
console.log('Unhandled Test Room buttons:', unhandledTestButtons);

// 14. Check all admin JS files for document.getElementById where ID is NOT in the file and NOT in admin.html
const allAdminFiles = fs.readdirSync('js/admin').filter(f => f.endsWith('.js'));
const globalAdminHtml = fs.readFileSync('admin.html', 'utf8');

const crossFileMissing = [];
for (const af of allAdminFiles) {
  const filePath = path.join('js/admin', af);
  const code = fs.readFileSync(filePath, 'utf8');
  const ids = [...code.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
  for (const id of new Set(ids)) {
    // If ID is not in code itself, and not in admin.html, check if it's in any other file or if it's unguarded
    if (!code.includes('id="' + id + '"') && !code.includes("id='" + id + "'") && !code.includes('id=`' + id + '`') &&
        !globalAdminHtml.includes('id="' + id + '"') && !globalAdminHtml.includes("id='" + id + "'")) {
      // Check if it's bound unguarded (e.g. .onclick =)
      const subIdx = code.indexOf(`document.getElementById('${id}')`) !== -1 ? code.indexOf(`document.getElementById('${id}')`) : code.indexOf(`document.getElementById("${id}")`);
      const snippet = code.substring(subIdx, subIdx + 80);
      const isGuarded = snippet.includes('?.') || snippet.includes('if (') || snippet.includes('const ') || snippet.includes('let ') || snippet.includes('var ');
      crossFileMissing.push({ file: af, id, isGuarded, snippet: snippet.replace(/\n/g, ' ') });
    }
  }
}

console.log('Cross file missing getElementById in js/admin/ (total):', crossFileMissing.length);
const dangerousUnguarded = crossFileMissing.filter(c => !c.isGuarded && (c.snippet.includes('.onclick') || c.snippet.includes('.addEventListener')));
console.log('DANGEROUS UNGUARDED:', dangerousUnguarded);








