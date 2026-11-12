import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('docs/plans/20261112 - Complete Cross-Realm Palette Architecture and Room Color Inventory Plan.md');
const target = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/20261112 - Complete Cross-Realm Palette Architecture and Room Color Inventory Plan.md';

const content = fs.readFileSync(source, 'utf8');
fs.writeFileSync(target, content, 'utf8');
console.log(`✔ Successfully mirrored ${content.length} characters to ${target}`);
