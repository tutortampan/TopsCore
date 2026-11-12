import fs from 'fs';

// dashboard.html — bump css/dashboard.css and js/dashboard.js
let html = fs.readFileSync('dashboard.html', 'utf8');
html = html.replace('css/dashboard.css?v=20261107_v161', 'css/dashboard.css?v=20261113_v176');
html = html.replace('js/dashboard.js?v=20261108_v162', 'js/dashboard.js?v=20261113_v176');
fs.writeFileSync('dashboard.html', html, 'utf8');

// sw.js — bump cache and dashboard asset versions
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace('css/dashboard.css?v=20261113_v174', 'css/dashboard.css?v=20261113_v176');
sw = sw.replace('js/dashboard.js?v=20261108_v162', 'js/dashboard.js?v=20261113_v176');
fs.writeFileSync('sw.js', sw, 'utf8');

console.log('✅ Cache versions bumped: dashboard.css + dashboard.js → v176');

// verify
const checkHtml = fs.readFileSync('dashboard.html', 'utf8');
const checkSw = fs.readFileSync('sw.js', 'utf8');
console.log('dashboard.html has v176 dashboard.css:', checkHtml.includes('dashboard.css?v=20261113_v176'));
console.log('dashboard.html has v176 dashboard.js:', checkHtml.includes('dashboard.js?v=20261113_v176'));
console.log('sw.js has v176 dashboard.css:', checkSw.includes('dashboard.css?v=20261113_v176'));
console.log('sw.js has v176 dashboard.js:', checkSw.includes('dashboard.js?v=20261113_v176'));
