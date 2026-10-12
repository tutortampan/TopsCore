const fs = require('fs');

const landscapeCSS = `
/* Portrait Lock Overlay */
#landscape-blocker {
  display: none;
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--clr-bg-1, #0b1523);
  z-index: 999999;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  text-align: center;
  padding: 2rem;
}
#landscape-blocker h2 { margin-bottom: 1rem; font-weight: 800; font-size: 1.5rem; }
#landscape-blocker p { color: var(--clr-text-2); font-size: 0.95rem; line-height: 1.5; }
@media screen and (max-width: 1024px) and (orientation: landscape) {
  #landscape-blocker {
    display: flex !important;
  }
}
`;

const landscapeHTML = `
  <!-- Portrait Lock Blocker -->
  <div id="landscape-blocker">
    <h2>Please Rotate Your Device</h2>
    <p>This application is designed specifically for portrait mode.<br>Please rotate your device back to portrait orientation to continue.</p>
  </div>
`;

// 1. Add CSS to style.css
let cssContent = fs.readFileSync('css/style.css', 'utf8');
if (!cssContent.includes('#landscape-blocker')) {
  cssContent += landscapeCSS;
  
  // Add micro animations
  cssContent += `
/* Micro-animations */
.btn, .mc-option, .select-option-card {
  transition: transform 0.15s ease-out, background-color 0.15s ease-out, opacity 0.15s ease-out !important;
}
.btn:active, .select-option-card:active {
  transform: scale(0.96) !important;
}
`;
  fs.writeFileSync('css/style.css', cssContent);
}

// 2. Inject landscapeHTML into HTML files right after <body>
const htmlFiles = ['index.html', 'dashboard.html', 'assessment.html', 'result.html', 'admin.html'];
htmlFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('id="landscape-blocker"')) {
    content = content.replace(/<body[^>]*>/, match => match + '\n' + landscapeHTML);
    fs.writeFileSync(file, content);
    console.log(`Injected landscape blocker to ${file}`);
  }
});

// 3. Update padding in assessment.html
let assessHtml = fs.readFileSync('assessment.html', 'utf8');
if (assessHtml.includes('padding: 1rem 1.25rem;')) {
  assessHtml = assessHtml.replace('padding: 1rem 1.25rem;', 'padding: 0.75rem 1rem;');
  fs.writeFileSync('assessment.html', assessHtml);
  console.log('Adjusted .mc-option padding in assessment.html');
}

console.log('Done modifying CSS and injecting landscape blockers.');
