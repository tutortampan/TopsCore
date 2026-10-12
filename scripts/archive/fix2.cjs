const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

// Replace Vocabulary Vault from DATA
html = html.replace(/<div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;<\/span>Vocabulary Vault<\/div>\r?\n\s*/, '');

// Insert Question Banks into CLASS
html = html.replace(/(<div id="sidebar-classes-list")/, '<div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;</span>Question Banks</div>\n          $1');

fs.writeFileSync('admin.html', html);
console.log('Done');
