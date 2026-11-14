const fs = require('fs');

// 1. Clean js/admin/tests-management.js
let testsJs = fs.readFileSync('js/admin/tests-management.js', 'utf8');
testsJs = testsJs.replace(/<button type="button" class="tac-drill-btn".*?<\/button>/gs, '');

const fnStart = testsJs.indexOf('  let _classFcCards = [];');
const fnEnd = testsJs.indexOf('function formatAnswerType(type) {');
if (fnStart !== -1 && fnEnd !== -1) {
  // make sure we leave the closing brace of renderClassThemeAnalytics
  testsJs = testsJs.substring(0, fnStart) + '}\n\n' + testsJs.substring(fnEnd);
  fs.writeFileSync('js/admin/tests-management.js', testsJs, 'utf8');
  console.log('Cleaned js/admin/tests-management.js');
}

// 2. Clean js/dashboard.js
let dashJs = fs.readFileSync('js/dashboard.js', 'utf8');
// remove calls to setupLobbyFlashcards
dashJs = dashJs.replace(/setupLobbyFlashcards\([^)]*\);?/g, '');
// remove hash check for flashcard
dashJs = dashJs.replace(/\} else if \(hash === '#practice' \|\| hash === '#flashcards'\) \{[^}]*\}/gs, '');
// remove student lobby flashcard engine block
const dashStart = dashJs.indexOf('// ===== 🎯 STUDENT LOBBY FLASHCARD RECOVERY ENGINE =====');
if (dashStart !== -1) {
  const dashEnd = dashJs.indexOf('// ===== 🎯 STUDENT PROFILE MODAL & PIN ENGINE =====', dashStart);
  if (dashEnd !== -1) {
    dashJs = dashJs.substring(0, dashStart) + dashJs.substring(dashEnd);
    fs.writeFileSync('js/dashboard.js', dashJs, 'utf8');
    console.log('Cleaned js/dashboard.js');
  }
}

// 3. Clean js/result.js
let resultJs = fs.readFileSync('js/result.js', 'utf8');
resultJs = resultJs.replace(/setupFlashcardRecovery\([^)]*\);?/g, '');
const resStart = resultJs.indexOf('// ===== 🗂️ FLASHCARD RECOVERY ENGINE =====');
if (resStart !== -1) {
  resultJs = resultJs.substring(0, resStart).trimEnd() + '\n';
  fs.writeFileSync('js/result.js', resultJs, 'utf8');
  console.log('Cleaned js/result.js');
}

// 4. Clean css/result.css
let resCss = fs.readFileSync('css/result.css', 'utf8');
const fcCssStart = resCss.indexOf('/* ===== 🗂️ FLASHCARD RECOVERY MODAL STYLING ===== */');
if (fcCssStart !== -1) {
  resCss = resCss.substring(0, fcCssStart).trimEnd() + '\n';
  fs.writeFileSync('css/result.css', resCss, 'utf8');
  console.log('Cleaned css/result.css');
}

// 5. Clean css/style.css
let styleCss = fs.readFileSync('css/style.css', 'utf8');
const stFcStart = styleCss.indexOf('/* ===== 🗂️ UNIVERSAL 3D FLASHCARD RECOVERY MODAL STYLING ===== */');
if (stFcStart !== -1) {
  styleCss = styleCss.substring(0, stFcStart).trimEnd() + '\n';
  fs.writeFileSync('css/style.css', styleCss, 'utf8');
  console.log('Cleaned css/style.css');
}
