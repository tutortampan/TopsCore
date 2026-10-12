const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

// 1. ADMIN DOMAIN
html = html.replace(/<div class="admin-nav-item" data-sub="cv_generator">[\s\S]*?<\/div>/, '');
html = html.replace(/<div class="admin-nav-item" data-sub="profile">[\s\S]*?<\/div>/, '');
html = html.replace(/<div class="admin-nav-item" data-sub="schedule">[\s\S]*?<\/div>/, '');
html = html.replace(/<div class="admin-nav-item" data-sub="work_records">[\s\S]*?<\/div>/, '');

html = html.replace(/Executive Dashboard/, 'Dashboard');

// 2. BOARD DOMAIN
html = html.replace(/<div class="admin-nav-item" data-sub="institutions">.*?<\/div>/, 
  '<div class="admin-nav-item" data-sub="institutions"><span class="nav-icon">&#127970;</span>Students & Batches</div>');

html = html.replace(/<div class="admin-nav-item" data-sub="import-students">[\s\S]*?<\/div>\s*/, '');
html = html.replace(/<div class="admin-nav-item" data-sub="students">[\s\S]*?<\/div>\s*/, '');

// 3. CLASS DOMAIN
html = html.replace(/(<div id="sidebar-classes-list".*?><\/div>)/, 
  '<div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;</span>Question Banks</div>\n          $1');

// 4. DATA DOMAIN
html = html.replace(/<div class="admin-nav-item" data-sub="vocab_vault">.*?<\/div>\s*/, '');

html = html.replace(/<div class="nav-domain-header">.*?D &mdash; DATA<\/div>/, 
  '<div class="nav-domain-header"><span class="domain-icon">&#128737;&#65039;</span>D &mdash; System & Data</div>');

html = html.replace(/<div class="admin-nav-item" data-sub="audit">[\s\S]*?<\/div>\s*/, '');
html = html.replace(/<div class="admin-nav-item" data-sub="health">[\s\S]*?<\/div>\s*/, '');
html = html.replace(/<div class="admin-nav-item" data-sub="recycle">[\s\S]*?<\/div>\s*/, '');

html = html.replace(/<div class="admin-nav-item" data-sub="settings">.*?<\/div>/, 
  '<div class="admin-nav-item" data-sub="settings"><span class="nav-icon">&#9881;&#65039;</span>System Settings</div>');

fs.writeFileSync('admin.html', html);
console.log('Sidebar updated');
