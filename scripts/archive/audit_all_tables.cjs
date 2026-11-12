const fs = require('fs'), path = require('path');

// Broader scan: any file with '<table', 'innerHTML' containing table, or DataGrid
function scanDir(dir, results = []) {
  try {
    fs.readdirSync(dir, {withFileTypes:true}).forEach(e => {
      const fp = path.join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'vendor' && e.name !== 'node_modules' && e.name !== 'tests' && e.name !== 'supabase') {
        scanDir(fp, results);
      } else if (e.name.endsWith('.js') || e.name.endsWith('.html')) {
        const c = fs.readFileSync(fp, 'utf8');
        const dgCount = (c.match(/new DataGrid\(\{/g) || []).length;
        // Count tables in HTML or JS innerHTML
        const tableStrings = (c.match(/class="[^"]*table[^"]*"|<table[^>]*>|modern-table|class-hub-table|super-hdr|table-wrap/g) || []).length;
        
        if (dgCount > 0 || tableStrings > 2) {
          const autoFit = (c.match(/autoFitOnMount\s*:\s*(true|false)/) || [])[1] || '-';
          // Find column definitions with widths
          const widths = (c.match(/width\s*:\s*'(\d+)px'/g) || []).slice(0,6).join(' ');
          const noWidth = c.includes('minWidth') && !c.includes("width: '");
          const shortFile = fp.replace('d:\\Drives\\Tutor Tampan\\TopsCore\\', '').replace(/\\/g, '/');
          results.push({ file: shortFile, dgCount, tableStrings, autoFit, widths, noWidth });
        }
      }
    });
  } catch(e) {}
  return results;
}

const r = scanDir('.');
r.sort((a,b) => a.file.localeCompare(b.file));
r.forEach(x => {
  console.log(x.file);
  console.log('  DataGrid:' + x.dgCount + ' | table patterns:' + x.tableStrings + ' | autoFit:' + x.autoFit + (x.noWidth ? ' | FLEX (no fixed width)' : ''));
  if (x.widths) console.log('  col widths:', x.widths.substring(0,80));
});
console.log('\n--- Total:', r.length, 'files');
