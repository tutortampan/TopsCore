const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.mjs')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/TopsCore');
let changed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('v=4.7.6')) {
    content = content.replace(/v=4.7.[0-9]/g, 'v=4.7.7');
    fs.writeFileSync(file, content, 'utf8');
    changed++;
    console.log('Bumped:', file);
  }
});

console.log(`Finished bumping version strings in ${changed} files.`);
