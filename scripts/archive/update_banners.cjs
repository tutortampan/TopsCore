const fs = require('fs');
const files = ['assessment.html', 'index.html', 'admin.html', 'dashboard.html', 'result.html', 'css/style.css'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Insert banner before </body>
  if (f.endsWith('.html')) {
    const banner = `\n  <div id="bottom-ad-banner" class="topscore-locked-banner">\n    TopsCore &copy; 2026 | Created by Mr. Top\n  </div>\n</body>`;
    if (!content.includes('topscore-locked-banner')) {
      content = content.replace(/<\/body>/i, banner);
    }
  }

  // Remove blur filters and apply solid backgrounds in assessment.html
  if (f === 'assessment.html') {
    // .mc-option in renderMC and renderPhraseChips
    content = content.replace(/background:rgba\(255,255,255,0.08\);/g, 'background:#0f1d2d;');
    content = content.replace(/border:1px solid rgba\(255,255,255,0.15\);/g, 'border:1px solid rgba(255,255,255,0.12);');
    
    // Remove backdrop filters everywhere
    content = content.replace(/backdrop-filter:\s*blur\([^)]+\);?/g, '');
    content = content.replace(/-webkit-backdrop-filter:\s*blur\([^)]+\);?/g, '');

    // modal popup #matrix-popup
    content = content.replace(/<div id="matrix-popup" style="(.*?)">/g, (m, p1) => {
      let styles = p1;
      styles = styles.replace(/background:\s*rgba[^;]+;/g, '');
      return `<div id="matrix-popup" style="${styles} background: #0b1523; border: 1px solid rgba(255, 255, 255, 0.18);">`;
    });

    // #virtual-keyboard-container
    content = content.replace(/<div id="virtual-keyboard-container" style="(.*?)">/g, (m, p1) => {
      let styles = p1;
      styles = styles.replace(/background:\s*rgba[^;]+;/g, '');
      return `<div id="virtual-keyboard-container" style="${styles} background: #0b1523; border: 1px solid rgba(255, 255, 255, 0.18);">`;
    });

    // #fixed-bottom-area
    content = content.replace(/<div id="fixed-bottom-area" style="([^>]*?bottom:\s*)0(px|;)?/g, '<div id="fixed-bottom-area" style="$1calc(38px + env(safe-area-inset-bottom, 0px)) !important;');
  }

  if (content !== original) {
    fs.writeFileSync(f, content);
    console.log('Updated ' + f);
  }
});
