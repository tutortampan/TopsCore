const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const regex = /const avatarBox = document\.getElementById\('banner-avatar-container'\);\s*if \(avatarBox\) \{\s*const gradePalette[^}]+\s*const targetColor[^}]+\s*avatarBox\.style[^}]+\s*avatarBox\.style[^}]+\s*\}/;

if (regex.test(html)) {
  // It matches the SECOND block which we don't want (the original one)
  // Wait, let's just make the FIRST `const avatarBox` into `let avatarBox` or rename it, or remove the duplicate
  
  // Just find the second instance of `const avatarBox = document.getElementById('banner-avatar-container');`
  let count = 0;
  html = html.replace(/const avatarBox = document\.getElementById\('banner-avatar-container'\);/g, (match) => {
    count++;
    if (count === 2) {
      return "/* duplicate removed */";
    }
    return match;
  });
  
  html = html.replace(/if \(typeof avatarBox !== 'undefined' && avatarBox\) {/g, ""); // if we changed something

  fs.writeFileSync('dashboard.html', html);
  console.log('Fixed double avatarBox declaration');
} else {
  console.log('Regex did not match, let us just replace all `const avatarBox` with `var avatarBox`');
  html = html.replace(/const avatarBox /g, 'var avatarBox ');
  html = html.replace(/const scoreBox /g, 'var scoreBox ');
  html = html.replace(/const scoreVal /g, 'var scoreVal ');
  html = html.replace(/const gradePalette /g, 'var gradePalette ');
  html = html.replace(/const targetColor /g, 'var targetColor ');
  fs.writeFileSync('dashboard.html', html);
  console.log('Changed const to var to prevent redeclaration errors');
}
