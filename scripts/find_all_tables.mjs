import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === 'vendor' || file === 'archive') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walk('.');
const allTables = [];

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const regex = /<table[\s\S]*?<\/thead>/gi;
    let match;
    while ((match = regex.exec(content)) !== null) {
        // extract surrounding lines/context
        const index = match.index;
        const line = content.substring(0, index).split('\n').length;
        allTables.push({
            file: f,
            line: line,
            snippet: match[0].replace(/\s+/g, ' ').substring(0, 150)
        });
    }
});

console.log('Total <table> blocks found:', allTables.length);
allTables.forEach((t, i) => {
    console.log(`${i+1}. [${t.file}:${t.line}] ${t.snippet}`);
});

