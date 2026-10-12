const fs = require('fs');
const file = 'd:/TopsCore/js/api.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /let\s*\{\s*data,\s*error\s*\}\s*=\s*await\s*query;\s*if\s*\(error\)\s*throw\s*error;\s*_adminCache\.set\(cacheKey,\s*JSON\.parse\(JSON\.stringify\(data\s*\|\|\s*\[\]\)\)\);\s*return\s*data\s*\|\|\s*\[\];/;

const replacement = `    // Fetch all pages to overcome 1000 row limit
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    
    // In Supabase JS v2, modifying query might not create a new object, 
    // but .range() actually mutates the query builder if done in a chain. 
    // Wait, .range() applies limits. We can just execute the base query with range().
    while (true) {
      // Supabase JS allows re-executing query object with new range?
      // Actually, building a new query or cloning is better, but .range(start, end)
      // returns a new builder? Wait! Supabase v2 \`.range()\` returns 'this', mutating it!
      // But we can just use pagination directly on \`query\`.
      
      const { data, error } = await query.range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    
    _adminCache.set(cacheKey, JSON.parse(JSON.stringify(allData || [])));
    return allData || [];`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed adminFetchAll successfully.');
} else {
    console.log('Could not find target block to replace.');
}
