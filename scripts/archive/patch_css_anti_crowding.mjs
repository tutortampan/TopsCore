import fs from 'fs';

// 1. Patch css/admin.css
const cssPath = 'd:/Drives/Tutor Tampan/TopsCore/css/admin.css';
let css = fs.readFileSync(cssPath, 'utf8');

const oldCssTarget = `/* Header Cell Badges (Pure White Text) */
#class-attendance-grid .test-hdr-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  line-height: 1.05;
}

#class-attendance-grid .test-subtag {
  font-size: 0.50rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin-top: 1px;
  line-height: 1;
  color: #ffffff !important;
}`;

const newCssReplacement = `/* Header Cell Badges (Pure White Text & Anti-Crowding) */
#class-attendance-grid .test-hdr-cell,
#class-attendance-grid .asm-hdr-cell {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1.0 !important;
  overflow: hidden !important;
  white-space: nowrap !important;
  padding: 0 1px !important;
}

#class-attendance-grid .test-num-total {
  font-size: 0.58rem !important;
  font-weight: 800 !important;
  letter-spacing: -0.02em !important;
  line-height: 1.1 !important;
}

#class-attendance-grid .test-subtag {
  font-size: 0.44rem !important;
  font-weight: 800 !important;
  letter-spacing: -0.01em !important;
  margin-top: 1px !important;
  line-height: 1 !important;
  color: #ffffff !important;
  white-space: nowrap !important;
}

#class-attendance-grid .asm-score {
  letter-spacing: -0.02em;
  white-space: nowrap;
}`;

if (css.includes(oldCssTarget)) {
  css = css.replace(oldCssTarget, newCssReplacement);
} else {
  console.warn('oldCssTarget not found, checking alternatives...');
}

// Also adjust test-rem-sup
css = css.replace(
  `.test-rem-sup {
  font-size: 0.7em !important;
  opacity: 0.85 !important;
  color: inherit !important;
  font-weight: 800 !important;
  margin-left: 1.5px !important;
  vertical-align: super !important;
}`,
  `.test-rem-sup {
  font-size: 0.60em !important;
  opacity: 0.9 !important;
  color: inherit !important;
  font-weight: 900 !important;
  margin-left: 0.5px !important;
  vertical-align: super !important;
  line-height: 0 !important;
}`
);

fs.writeFileSync(cssPath, css, 'utf8');
console.log('css/admin.css updated with tight anti-crowding styles!');

