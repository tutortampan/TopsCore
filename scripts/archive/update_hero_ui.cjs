const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Add top divider
const nameSection = `        <div style="width: 100%; text-align: center;">
          <h1 id="welcome-name" style="margin: 0; font-size: 1.35rem; font-weight: 800; color: #ffffff; letter-spacing: 0.02em; font-family: var(--font-display); line-height: 1.2;">Student</h1>
        </div>`;
const nameWithDivider = nameSection + `\n        <hr style="width: 100%; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 0;">`;

if (html.includes(nameSection) && !html.includes(nameWithDivider)) {
    html = html.replace(nameSection, nameWithDivider);
}

// 2. Add bottom divider
const boxesSectionEnd = `        </div>
  
        <!-- 3. Keterangan Siswa Horizontal Rapi Tanpa Titik Liar -->`;
const boxesWithDivider = `        </div>
        <hr style="width: 100%; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 0;">
  
        <!-- 3. Keterangan Siswa Horizontal Rapi Tanpa Titik Liar -->`;

if (html.includes(boxesSectionEnd) && !html.includes(boxesWithDivider)) {
    html = html.replace(boxesSectionEnd, boxesWithDivider);
}

// 3. Make photo circular and bigger
// Find the avatar container definition
const avatarRegex = /<div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 94px; height: 94px; border-radius: 22px; overflow: hidden; border: 3\.5px solid #ea580c; position: relative; cursor: pointer; box-shadow: 0 10px 28px rgba\(0, 0, 0, 0\.5\); flex-shrink: 0; transition: border-color 0\.3s ease; transform: scale\(1\.02\); background: #1e293b;">/;

const newAvatar = `<div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 110px; height: 110px; border-radius: 50%; overflow: hidden; border: 4px solid #ea580c; position: relative; cursor: pointer; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6); flex-shrink: 0; transition: border-color 0.3s ease; transform: scale(1.02); background: #1e293b;">`;

if (avatarRegex.test(html)) {
    html = html.replace(avatarRegex, newAvatar);
}

// If it has line breaks, try this generic approach to fix avatar size
const replaceAvatarFuncCode = `
    html = html.replace(/width: 94px; height: 94px; border-radius: 22px;/g, 'width: 110px; height: 110px; border-radius: 50%;');
    html = html.replace(/border: 3.5px solid/g, 'border: 4px solid');
`;
eval(replaceAvatarFuncCode);

fs.writeFileSync('dashboard.html', html);
console.log('Applied banner UI updates');
