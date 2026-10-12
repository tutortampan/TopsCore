const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');
const originalHtml = html;

// Use regex to remove the Assessment-card-badges div and all its contents
const regex = /<div class="Assessment-card-badges"[^>]*>[\s\S]*?<\/div>/g;
html = html.replace(regex, '');

if (html !== originalHtml) {
  fs.writeFileSync('dashboard.html', html);
  console.log('Successfully removed the extra badges from the mobile card.');
} else {
  console.log('Could not find the badges to remove.');
}
