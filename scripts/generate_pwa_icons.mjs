// scripts/generate_pwa_icons.mjs
// Generates official Option A (Outfit 900, identical font size, zero divider) PWA icons for TopsCore LMS

import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const ROOT_DIR = process.cwd();
const ICONS_DIR = path.join(ROOT_DIR, 'icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

const htmlTemplate = (size, badgeSize, fontSize, radius, letterSpacing = 3) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${size}px;
    height: ${size}px;
    background: radial-gradient(circle at 50% 25%, #0d2242 0%, #060911 85%);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .badge {
    width: ${badgeSize}px;
    height: ${badgeSize}px;
    border-radius: ${radius}px;
    background: radial-gradient(circle at 50% 25%, #0d2242 0%, #060911 85%);
    border: ${Math.max(2, Math.round(badgeSize * 0.022))}px solid rgba(56, 189, 248, 0.48);
    box-shadow: 0 0 ${Math.round(badgeSize * 0.16)}px rgba(56, 189, 248, 0.32), inset 0 0 ${Math.round(badgeSize * 0.12)}px rgba(56, 189, 248, 0.14);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: ${Math.max(2, Math.round(fontSize * 0.15))}px;
  }
  .text-tops {
    font-size: ${fontSize}px;
    font-weight: 900;
    color: #ffffff;
    letter-spacing: ${letterSpacing}px;
    line-height: 0.95;
    text-shadow: 0 0 ${Math.max(2, Math.round(fontSize * 0.3))}px rgba(255, 255, 255, 0.35);
  }
  .text-core {
    font-size: ${fontSize}px; /* 100% IDENTICAL SIZE */
    font-weight: 900;
    color: #38bdf8;
    letter-spacing: ${letterSpacing}px; /* 100% IDENTICAL SPACING */
    line-height: 0.95;
    text-shadow: 0 0 ${Math.max(4, Math.round(fontSize * 0.45))}px rgba(56, 189, 248, 0.65);
  }
</style>
</head>
<body>
  <div class="badge">
    <div class="text-tops">TOPS</div>
    <div class="text-core">CORE</div>
  </div>
</body>
</html>`;

// Standalone Vector SVG with embedded Outfit/system styling
const standaloneSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="25%" r="85%">
      <stop offset="0%" stop-color="#0d2242"/>
      <stop offset="100%" stop-color="#060911"/>
    </radialGradient>
    <filter id="glow-core" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#bg)"/>
  <rect x="76" y="76" width="360" height="360" rx="88" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(56, 189, 248, 0.48)" stroke-width="8"/>
  <g font-family="'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" text-anchor="middle">
    <text x="256" y="235" font-size="92" fill="#ffffff" letter-spacing="6">TOPS</text>
    <text x="256" y="335" font-size="92" fill="#38bdf8" letter-spacing="6" filter="url(#glow-core)">CORE</text>
  </g>
</svg>`;

async function main() {
  console.log('Generating Official Option A TOPS CORE PWA Icons...');
  fs.writeFileSync(path.join(ICONS_DIR, 'icon.svg'), standaloneSvg, 'utf-8');
  console.log('✔ Created icons/icon.svg');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  const targets = [
    { file: 'icon-512.png', size: 512, badgeSize: 360, fontSize: 90, radius: 88, letterSpacing: 6 },
    { file: 'icon-192.png', size: 192, badgeSize: 135, fontSize: 34, radius: 33, letterSpacing: 2 },
    { file: 'icon-maskable-512.png', size: 512, badgeSize: 300, fontSize: 75, radius: 72, letterSpacing: 5 },
    { file: 'icon-maskable-192.png', size: 192, badgeSize: 112, fontSize: 28, radius: 27, letterSpacing: 2 },
    { file: 'apple-touch-icon.png', size: 180, badgeSize: 126, fontSize: 31, radius: 30, letterSpacing: 2 }
  ];

  for (const t of targets) {
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(htmlTemplate(t.size, t.badgeSize, t.fontSize, t.radius, t.letterSpacing), { waitUntil: 'networkidle' });
    const outPath = path.join(ICONS_DIR, t.file);
    await page.screenshot({ path: outPath, type: 'png' });
    const stat = fs.statSync(outPath);
    console.log(`✔ Created icons/${t.file} (${t.size}x${t.size} px, ${Math.round(stat.size / 1024 * 10) / 10} KB)`);
  }

  await browser.close();
  console.log('🎉 All official Option A PWA icons generated successfully!');
}

main().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
