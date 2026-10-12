const fs = require('fs');

// 1. Update admin.css
let css = fs.readFileSync('d:/TopsCore/css/admin.css', 'utf8');

css = css.replace(/--fm-bg-main: #[a-fA-F0-9]+;/, '--fm-bg-main: #0f172a;');
css = css.replace(/--fm-bg-sidebar: #[a-fA-F0-9]+;/, '--fm-bg-sidebar: #1e293b;');
css = css.replace(/--fm-bg-topbar: #[a-fA-F0-9]+;/, '--fm-bg-topbar: #1e293b;');
css = css.replace(/--fm-bg-panel: #[a-fA-F0-9]+;/, '--fm-bg-panel: #1e293b;');
css = css.replace(/--fm-bg-panel-elevated: #[a-fA-F0-9]+;/, '--fm-bg-panel-elevated: #334155;');
css = css.replace(/--fm-bg-hover: #[a-fA-F0-9]+;/, '--fm-bg-hover: #334155;');
css = css.replace(/--fm-bg-input: #[a-fA-F0-9]+;/, '--fm-bg-input: #0f172a;');

css = css.replace(/--fm-border-subtle: #[a-fA-F0-9]+;/, '--fm-border-subtle: #334155;');
css = css.replace(/--fm-border-medium: #[a-fA-F0-9]+;/, '--fm-border-medium: #475569;');
css = css.replace(/--fm-border-strong: #[a-fA-F0-9]+;/, '--fm-border-strong: #64748b;');

fs.writeFileSync('d:/TopsCore/css/admin.css', css);

// 2. Update vocab-vault.js
let js = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');

// Replace them sequentially to avoid cascading overwrites by using a function
const replacer = (match) => {
  const m = match.toLowerCase();
  if (m === '#334155') return '#475569';
  if (m === '#1e293b') return '#334155';
  if (m === '#0f172a') return '#1e293b';
  if (m === '#090e1a') return '#1e293b';
  if (m === '#020617') return '#0f172a';
  return match;
};

js = js.replace(/#(334155|1e293b|0f172a|090e1a|020617)/gi, replacer);

fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', js);
console.log('theme brightened');
