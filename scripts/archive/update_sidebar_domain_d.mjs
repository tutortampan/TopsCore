import fs from 'fs';

let html = fs.readFileSync('admin.html', 'utf8');

const target = [
  '        <!-- DOMAIN C: Class (Curriculum & AI Test Engine) -->',
  '        <div class="nav-domain-group" data-domain="class">',
  '          <div class="nav-domain-header"><span class="domain-icon">&#9889;</span>C &mdash; Class</div>',
  '          <div id="sidebar-classes-list"></div>',
  '          <div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;</span>Vocabulary Vault',
  '          </div>',
  '        </div>',
  '',
  '        <!-- DOMAIN D: DATA (System Administration, Security & Health) -->',
  '        <div class="nav-domain-group" data-domain="desk">',
  '          <div class="nav-domain-header"><span class="domain-icon">&#128737;&#65039;</span>D &mdash; System & Data</div>',
  '          <div class="admin-nav-item" data-sub="modules"><span class="nav-icon">&#129513;</span>Modules (Core Blocks)',
  '          </div>',
  '          <div class="admin-nav-item" data-sub="settings"><span class="nav-icon">&#9881;&#65039;</span>System Settings',
  '          </div>',
  '        </div>'
].join('\r\n');

const replacement = [
  '        <!-- DOMAIN C: Class (Active Learning Classes) -->',
  '        <div class="nav-domain-group" data-domain="class">',
  '          <div class="nav-domain-header"><span class="domain-icon">&#9889;</span>C &mdash; Class</div>',
  '          <div id="sidebar-classes-list"></div>',
  '        </div>',
  '',
  '        <!-- DOMAIN D: DATA (System Administration, Security & Master Repositories) -->',
  '        <div class="nav-domain-group" data-domain="desk">',
  '          <div class="nav-domain-header"><span class="domain-icon">&#128737;&#65039;</span>D &mdash; System & Data</div>',
  '          <div class="admin-nav-item" data-sub="modules"><span class="nav-icon">&#129513;</span>Modules (Core Blocks)',
  '          </div>',
  '          <div class="admin-nav-item" data-sub="settings"><span class="nav-icon">&#9881;&#65039;</span>System Settings',
  '          </div>',
  '          <div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;</span>Vocabulary Vault',
  '          </div>',
  '        </div>'
].join('\r\n');

if (!html.includes(target)) {
  // Try LF variant
  const targetLF = target.replace(/\r\n/g, '\n');
  const repLF = replacement.replace(/\r\n/g, '\n');
  if (html.includes(targetLF)) {
    html = html.replace(targetLF, repLF);
    fs.writeFileSync('admin.html', html, 'utf8');
    console.log('Successfully updated admin.html (LF)');
  } else {
    console.error('Target block not found in admin.html');
    process.exit(1);
  }
} else {
  html = html.replace(target, replacement);
  fs.writeFileSync('admin.html', html, 'utf8');
  console.log('Successfully updated admin.html (CRLF)');
}
