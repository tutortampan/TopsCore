const fs = require('fs');

let css = fs.readFileSync('d:/TopsCore/css/admin.css', 'utf8');

// Update CSS variables
css = css.replace(/--fm-bg-main: #[a-fA-F0-9]+;/, '--fm-bg-main: #090D16;');
css = css.replace(/--fm-bg-sidebar: #[a-fA-F0-9]+;/, '--fm-bg-sidebar: #0F172A;');
css = css.replace(/--fm-bg-topbar: #[a-fA-F0-9]+;/, '--fm-bg-topbar: #0F172A;');
css = css.replace(/--fm-bg-panel: #[a-fA-F0-9]+;/, '--fm-bg-panel: #0F172A;');
css = css.replace(/--fm-bg-panel-elevated: #[a-fA-F0-9]+;/, '--fm-bg-panel-elevated: #1E293B;');
css = css.replace(/--fm-bg-hover: #[a-fA-F0-9]+;/, '--fm-bg-hover: rgba(255, 255, 255, 0.03);');
css = css.replace(/--fm-bg-input: #[a-fA-F0-9]+;/, '--fm-bg-input: #090D16;');

css = css.replace(/--fm-border-subtle: #[a-fA-F0-9]+;/, '--fm-border-subtle: rgba(255, 255, 255, 0.08);');
css = css.replace(/--fm-border-medium: #[a-fA-F0-9]+;/, '--fm-border-medium: rgba(255, 255, 255, 0.12);');
css = css.replace(/--fm-border-strong: #[a-fA-F0-9]+;/, '--fm-border-strong: rgba(255, 255, 255, 0.2);');

// Accent Palette
css = css.replace(/--fm-accent-tactical: #[a-fA-F0-9]+;/, '--fm-accent-tactical: #6366f1;'); // Use Indigo as primary accent

// Stat Cards Inner Highlight
// We'll add this to .stat-card if it exists, or just tell the user we'll do it in JS if it's rendered there.
if (!css.includes('.stat-card {') && css.includes('.stat-card')) {
  css = css.replace(/\.stat-card\s*\{/, '.stat-card { box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); ');
} else if (!css.includes('.stat-card')) {
    css += `\n.stat-card { box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); background: var(--fm-bg-panel); }\n`;
}

// Add tabular nums globally for numeric badges
if (!css.includes('.tabular-nums')) {
    css += `\n.tabular-nums { font-variant-numeric: tabular-nums; }\n`;
}

fs.writeFileSync('d:/TopsCore/css/admin.css', css);

// 2. Update vocab-vault.js styling
let js = fs.readFileSync('d:/TopsCore/js/admin/vocab-vault.js', 'utf8');

// Top stat cards (Levels Detected, Drill Tasks, etc.) in _renderBlueprintTab
const oldStatCard = /background:\s*(#1e293b|#090e1a|var\(--fm-bg-panel\)|#334155|#0f172a|#020617)[^;]*;\s*border-radius:\s*8px;\s*padding:\s*16px;/g;
js = js.replace(oldStatCard, 'background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 16px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);');

// Theme Header (THEME: CCU)
// Previous: background: rgba(30, 41, 85, 0.4); border-bottom: 1px solid #...; padding: 6px 10px; ... span: color: #cbd5e1; font-weight: 600; font-size: 11px; text-transform: uppercase;
const oldThemeHeader = /background: rgba\(30, 41, 85, 0\.4\);[^>]+>([\s\S]*?)color: #cbd5e1; font-weight: 600; font-size: 11px; text-transform: uppercase;/g;
js = js.replace(oldThemeHeader, 'background: transparent; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center;">$1color: #94a3b8; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;');

// The block wrapping the theme:
// <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; overflow: hidden; margin-bottom: 8px;">
js = js.replace(/<div style="background: (#[0-9a-f]+|var\(--fm-bg-panel\)); border: 1px solid (#[0-9a-f]+|rgba[^;]+); border-radius: 6px; overflow: hidden; margin-bottom: [0-9]+px;">/gi, 
  '<div style="background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; overflow: hidden; margin-bottom: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);">');

// Task Items vs Tests
// Task Row: padding: 4px 8px; border-bottom: 1px solid #...;
js = js.replace(/<div style="padding: 4px 8px; border-bottom: 1px solid (#[0-9a-f]+|rgba[^;]+); display: flex; justify-content: space-between; align-items: center;"/g, 
  '<div style="padding: 6px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; justify-content: space-between; align-items: center; transition: background-color 150ms ease;" onmouseover="this.style.backgroundColor=\'rgba(255,255,255,0.03)\'" onmouseout="this.style.backgroundColor=\'transparent\'"');

// Task row text:
// <span style="color: #94a3b8; font-size: 11px; ...
js = js.replace(/<span style="color: #94a3b8; font-size: 11px; max-width/g, '<span style="color: #e2e8f0; font-size: 12px; font-weight: 500; max-width');

// Task Pill (Speech/Dropdown)
// <span style="background: #334155; color: #cbd5e1; font-size: 9px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">${taskType}</span>
js = js.replace(/<span style="background: (#[0-9a-f]+|rgba[^;]+); color: (#[0-9a-f]+); font-size: 9px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">\$\{taskType\}<\/span>/gi, 
  '<span style="background: rgba(30, 41, 59, 0.6); color: #cbd5e1; font-size: 9.5px; padding: 3px 8px; border-radius: 12px; font-weight: 600; border: 1px solid rgba(51, 65, 85, 0.5);">${taskType}</span>');

// Task count number
// <span style="color: #cbd5e1; font-size: 11px; font-weight: 600; width: 24px; text-align: right;">${count}</span>
js = js.replace(/<span style="color: #cbd5e1; font-size: 11px; font-weight: 600; width: 24px; text-align: right;">\$\{count\}<\/span>/g, 
  '<span style="color: #94a3b8; font-size: 12px; font-weight: 600; width: 28px; text-align: right; font-variant-numeric: tabular-nums;">${count}</span>');


// Test Row:
// padding: 5px 8px; background: rgba(99, 102, 241, 0.1); 
js = js.replace(/<div style="padding: 5px 8px; background: rgba\(99, 102, 241, 0\.1\);/g, 
  '<div style="padding: 8px 10px; background: transparent; border-top: 1px solid rgba(255,255,255,0.04); border-left: 2px solid #6366f1;');

// Test title: color: #f8fafc; font-size: 11px; font-weight: 700;
js = js.replace(/color: #f8fafc; font-size: 11px; font-weight: 700;/g, 'color: #f8fafc; font-size: 12px; font-weight: 700;');

// Test pill:
// <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; font-size: 9px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">
js = js.replace(/<span style="background: rgba\(99, 102, 241, 0\.2\); color: #818cf8; font-size: 9px; padding: 2px 6px; border-radius: 12px; font-weight: 500;">/g, 
  '<span style="background: rgba(99, 102, 241, 0.15); color: #a5b4fc; font-size: 9.5px; padding: 3px 8px; border-radius: 12px; font-weight: 600; border: 1px solid rgba(99, 102, 241, 0.3);">');

// Test count number
// <span style="color: #38bdf8; font-size: 12px; font-weight: 700; width: 24px; text-align: right;">${newRunningTotal}</span>
// Wait, the color here was #38bdf8. Let's make it match the brand accent #818cf8 or white.
js = js.replace(/<span style="color: #38bdf8; font-size: 12px; font-weight: 700; width: 24px; text-align: right;">\$\{newRunningTotal\}<\/span>/g, 
  '<span style="color: #f8fafc; font-size: 13px; font-weight: 700; width: 28px; text-align: right; font-variant-numeric: tabular-nums;">${newRunningTotal}</span>');

// Stat values font size & color (the large numbers at the top)
// They are rendered like: <div style="font-size: 24px; font-weight: bold; color: #fff;">${totalTasks}</div>
// Wait, they might be in HTML or JS. 
// "font-size: 16px; font-weight: bold; color: #fff;" was previously compacted from 20px or 24px.
js = js.replace(/font-size: 16px; font-weight: bold; color: #fff;/g, 'font-size: 1.5rem; font-weight: 600; color: #fff; font-variant-numeric: tabular-nums;');

fs.writeFileSync('d:/TopsCore/js/admin/vocab-vault.js', js);
console.log('UI elevated to Vercel/Linear style');
