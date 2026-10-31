import fs from 'fs';
import path from 'path';

const cssFiles = ['css/style.css', 'css/admin.css', 'css/dashboard.css', 'css/result.css', 'css/test.css', 'css/auth.css'];

console.log('--- AUDITING CSS FILES ---');
cssFiles.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');
    console.log(`\n=== FILE: ${file} ===`);
    
    // font-family
    const fontFamilies = content.match(/font-family\s*:\s*[^;]+;/gi) || [];
    const uniqueFonts = [...new Set(fontFamilies.map(f => f.trim()))];
    console.log('Unique Font-family declarations:');
    uniqueFonts.forEach(f => console.log('  ', f));

    // Sticky rules
    const stickyMatches = [];
    const blocks = content.split('}');
    blocks.forEach(block => {
        if (/position\s*:\s*sticky/i.test(block)) {
            const parts = block.split('{');
            if (parts.length >= 2) {
                const selector = parts[0].trim().replace(/\/\*[\s\S]*?\*\//g, '');
                const body = parts.slice(1).join('{').trim();
                stickyMatches.push({ selector, body: body.replace(/\s+/g, ' ') });
            }
        }
    });
    console.log(`Sticky positions found: ${stickyMatches.length}`);
    stickyMatches.forEach(s => console.log(`  [${s.selector}] -> ${s.body.substring(0, 100)}...`));

    // Table rules
    const tableRules = [];
    blocks.forEach(block => {
        if (/(table|thead|tbody|tfoot|\bth\b|\.datagrid)/i.test(block)) {
            const parts = block.split('{');
            if (parts.length >= 2) {
                const selector = parts[0].trim().replace(/\/\*[\s\S]*?\*\//g, '');
                if (/(table|thead|tbody|tfoot|\bth\b|\.datagrid)/i.test(selector)) {
                    tableRules.push(selector);
                }
            }
        }
    });
    console.log(`Table selectors found: ${tableRules.length}`);
    tableRules.slice(0, 10).forEach(s => console.log(`  ${s}`));
});
