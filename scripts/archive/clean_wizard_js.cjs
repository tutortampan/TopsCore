const fs = require('fs');
let c = fs.readFileSync('js/admin/assessment-builder.js', 'utf8');

// Replace tab-assign with tab-publish
c = c.replace(/switchTab\('tab-assign'\)/g, "switchTab('tab-publish')");

// Fix btn-publish-prev
c = c.replace(/document\.getElementById\('btn-publish-prev'\)\.onclick\s*=\s*\(\)\s*=>\s*switchTab\('tab-publish'\);/, "document.getElementById('btn-publish-prev').onclick = () => switchTab('tab-topics');");

// The button btn-assign-next has all the logic that prepares the review tab! 
// We should move that logic to btn-topics-next!
// Wait! I can just merge it.

fs.writeFileSync('js/admin/assessment-builder.js', c);
