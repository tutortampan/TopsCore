const fs = require('fs');
const path = require('path');

// 1. Update admin.html
const adminHtmlPath = path.join(__dirname, '..', 'admin.html');
let adminHtml = fs.readFileSync(adminHtmlPath, 'utf8');

const targetA = `        <!-- DOMAIN A: Admin (Executive Workspace) -->
        <div class="nav-domain-group" data-domain="admin">
          <div class="nav-domain-header"><span class="domain-icon">&#128188;</span>A &mdash; Admin</div>
          <div class="admin-nav-item active" data-sub="dashboard"><span class="nav-icon">&#128202;</span>Dashboard</div>
          <div class="admin-nav-item" data-sub="organization"><span class="nav-icon">&#127970;</span>Organization</div>
          <div class="admin-nav-item" data-sub="classes-hub"><span class="nav-icon">&#127891;</span>Curriculum</div>
        </div>

        <!-- DOMAIN B: Board (Registry & Roster) -->
        <div class="nav-domain-group" data-domain="board">
          <div class="nav-domain-header"><span class="domain-icon">&#128208;</span>B &mdash; Board</div>
          <div class="admin-nav-item" data-sub="student-registration"><span class="nav-icon">&#128203;</span>Students
            Registration</div>
          <div id="sidebar-programs-list"></div>

        </div>`;

const replaceA = `        <!-- DOMAIN A: Admin (Executive Workspace) -->
        <div class="nav-domain-group" data-domain="admin">
          <div class="nav-domain-header"><span class="domain-icon">&#128188;</span>A &mdash; Admin</div>
          <div class="admin-nav-item" data-sub="classes-hub"><span class="nav-icon">&#127891;</span>Curriculum</div>
          <div class="admin-nav-item active" data-sub="dashboard"><span class="nav-icon">&#128202;</span>Dashboard</div>
          <div class="admin-nav-item" data-sub="organization"><span class="nav-icon">&#127970;</span>Organization</div>
        </div>

        <!-- DOMAIN B: Board (Registry & Roster) -->
        <div class="nav-domain-group" data-domain="board">
          <div class="nav-domain-header"><span class="domain-icon">&#128208;</span>B &mdash; Board</div>
          <div id="sidebar-programs-list"></div>
          <div class="admin-nav-item" data-sub="student-registration"><span class="nav-icon">&#128203;</span>Students Registration</div>
        </div>`;

// Normalize CRLF to LF for matching, then convert back
const normHtml = adminHtml.replace(/\r\n/g, '\n');
const normTarget = targetA.replace(/\r\n/g, '\n');
const normReplace = replaceA.replace(/\r\n/g, '\n');

if (normHtml.includes(normTarget)) {
  const updatedNorm = normHtml.replace(normTarget, normReplace);
  fs.writeFileSync(adminHtmlPath, updatedNorm.replace(/\n/g, '\r\n'), 'utf8');
  console.log('Successfully updated admin.html with alphabetical domains A & B layout.');
} else {
  console.error('Target block not found in admin.html!');
  process.exit(1);
}
