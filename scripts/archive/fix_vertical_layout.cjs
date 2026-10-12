const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// Fix 'Start Now' button layout in populateUpNext
const oldUpNextHtml = `upNextContainer.innerHTML = \`
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 4px;">\${escapeHtml(title)}</div>
                <div style="font-size: 0.8rem; color: #94a3b8; display: flex; gap: 8px; align-items: center;">
                  <span class="badge badge-primary" style="font-size: 0.65rem; padding: 2px 6px;">\${escapeHtml(typeStr)}</span>
                </div>
              </div>
              <button onclick="\${navLink}" class="btn btn-primary" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 8px; font-weight: 700; white-space: nowrap;">Start Now</button>
            </div>
          \`;`;

const newUpNextHtml = `upNextContainer.innerHTML = \`
            <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; background: rgba(255, 255, 255, 0.025); border: 1px solid var(--clr-border); border-radius: var(--radius-md); padding: 12px 14px;">
              <div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 6px; line-height: 1.3;">\${escapeHtml(title)}</div>
                <div style="font-size: 0.8rem; color: #94a3b8; display: flex; gap: 8px; align-items: center;">
                  <span class="badge badge-primary" style="font-size: 0.65rem; padding: 2px 6px;">\${escapeHtml(typeStr)}</span>
                </div>
              </div>
              <button onclick="\${navLink}" class="btn btn-primary w-100" style="padding: 10px; font-size: 0.95rem; border-radius: 8px; font-weight: 800; text-align: center;">Start Now</button>
            </div>
          \`;`;

html = html.replace(oldUpNextHtml, newUpNextHtml);

// Also verify if the inner container for classes needs background/borders since we removed it from .classes-section
const oldGridHtml = `<div class="class-icon">\${classIcons[idx % classIcons.length]}</div>`;
const newGridHtml = `<div class="class-icon">\${classIcons[idx % classIcons.length]}</div>`;

// Wait, class cards already have .class-card class which likely has a background. Let's check css/dashboard.css
// But completed assessments mobile card has background. We already verified that.
// What about the overall page container padding?
// In dashboard.html: <main class="dashboard-page flex-grow-1" style="padding: 1rem; max-width: 800px; margin: 0 auto; width: 100%;">
html = html.replace(
  /<main class="dashboard-page flex-grow-1" style="padding: 1rem; max-width: 800px; margin: 0 auto; width: 100%;">/g,
  '<main class="dashboard-page flex-grow-1" style="padding: 12px 8px; max-width: 800px; margin: 0 auto; width: 100%;">'
);

// We need to fix the outer banner padding too, it has margin: 0 auto; and fixed width
// Currently: <section class="welcome-banner card" ... max-width: 540px; margin: 0 auto; border-radius: 24px; padding: 14px 18px; margin-bottom: 24px;>
html = html.replace(
  /<section class="welcome-banner card" aria-labelledby="welcome-name" style="width: 100%; max-width: 540px; margin: 0 auto; border-radius: 24px; background: #0f172a; padding: 14px 18px; color: white; box-shadow: 0 25px 50px -12px rgba\(0, 0, 0, 0\.25\); border: 1px solid rgba\(255, 255, 255, 0\.06\); position: relative; margin-bottom: 24px;">/g,
  '<section class="welcome-banner card" aria-labelledby="welcome-name" style="width: 100%; max-width: 540px; margin: 0 auto; border-radius: 24px; background: #0f172a; padding: 14px 18px; color: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); position: relative; margin-bottom: 12px;">'
);

fs.writeFileSync('dashboard.html', html);
console.log('Fixed vertical layout for Start Now and page padding');

