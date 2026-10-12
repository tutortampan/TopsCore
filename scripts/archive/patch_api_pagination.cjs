const fs = require('fs');
const file = 'd:/TopsCore/js/api.js';
let content = fs.readFileSync(file, 'utf8');

const target = `    let { data, error } = await query;
    if (error) throw error;
    
    _adminCache.set(cacheKey, JSON.parse(JSON.stringify(data || [])));
    return data || [];`;

const replacement = `    // Fetch all pages to overcome 1000 row limit
    let allData = [];
    let from = 0;
    const pageSize = 1000;
    
    // We need to clone the base query because calling .range() mutates it in some versions,
    // or we can just apply range in the loop. 
    // In Supabase JS, .range() returns a new builder object, so we can re-use the base query.
    while (true) {
      const pageQuery = query.range(from, from + pageSize - 1);
      const { data, error } = await pageQuery;
      if (error) throw error;
      if (!data || data.length === 0) break;
      allData = allData.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    
    _adminCache.set(cacheKey, JSON.parse(JSON.stringify(allData || [])));
    return allData || [];`;

if (content.includes(target.trim())) {
    content = content.replace(target.trim(), replacement.trim());
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed adminFetchAll successfully.');
} else {
    console.log('Could not find target block to replace.');
}
