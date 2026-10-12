const fs = require('fs');

// Update CSS
let css = fs.readFileSync('css/dashboard.css', 'utf8');
css = css.replace(
  /\.dashboard-header\s*{[^}]*}/,
  `.dashboard-header {
  padding: clamp(1rem, 3vw, 1.5rem) clamp(1.25rem, 4vw, 2rem) clamp(0.75rem, 2vw, 1rem);
  border-bottom: 1px solid var(--clr-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 100;
  position: sticky;
  top: 0;
  backdrop-filter: blur(12px);
  background: rgba(9, 13, 22, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}`
);
fs.writeFileSync('css/dashboard.css', css);
console.log('Updated css/dashboard.css');

// Update HTML
let html = fs.readFileSync('dashboard.html', 'utf8');

// 2. Tighten Profile Card (.welcome-banner):
// - padding: 32px -> 14px 18px
html = html.replace(/padding: 32px;/g, 'padding: 14px 18px;');
// - student name margin: 0 -> margin: 0 0 8px 0; font-size: 1.35rem;
html = html.replace(/margin: 0; font-family: var\(--font-display\);/g, 'margin: 0 0 8px 0; font-family: var(--font-display);');
html = html.replace(/font-size: 1\.75rem;/g, 'font-size: 1.35rem;');
// - divider lines
html = html.replace(/margin: 16px 0;/g, 'margin: 8px 0; background: rgba(148, 163, 184, 0.18);');
// - avatar wrapper size
html = html.replace(/width: 108px; height: 108px;/g, 'width: 86px; height: 86px;');
// - Stat boxes (Score & Grade) padding and font size
html = html.replace(/padding: 24px 16px;/g, 'padding: 10px 8px;');
html = html.replace(/font-size: 2\.25rem;/g, 'font-size: 1.7rem;');
html = html.replace(/font-size: 0\.75rem; font-weight: 700; text-transform: uppercase;/g, 'font-size: 0.65rem; font-weight: 700; text-transform: uppercase;');

// - Bottom metadata row (margin-top: 16px; font-size: 0.85rem; gap: 1rem)
html = html.replace(/margin-top: 16px; font-size: 0\.85rem; gap: 1rem;/g, 'margin: 4px 0 0 0; font-size: 0.75rem; gap: 0.5rem;');

// 3. Compress Section Blocks:
// - margin-top: 16px; -> margin-top: 10px; margin-bottom: 0;
html = html.replace(/margin-top: 16px;/g, 'margin-top: 10px; margin-bottom: 0;');
// - Next Assessment CTA: padding: 12px 24px; font-size: 0.875rem; -> padding: 6px 14px; font-size: 0.8rem;
// Actually I need to check what the CTA looks like. I'll defer the specific CTA replacement if I don't know the exact current string.
// Let's replace the generic padding: 16px; to padding: 10px 14px; for inner module cards? I will check the HTML.

fs.writeFileSync('dashboard.html', html);
console.log('Updated dashboard.html partially');
