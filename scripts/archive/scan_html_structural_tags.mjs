import fs from 'fs';

const files = [
  'admin.html',
  'dashboard.html',
  'test.html',
  'result.html',
  'index.html',
  'conversation.html'
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n================== ${file} ==================`);
  
  // Find all header tags, footer tags, nav tags, and elements with header/footer/topbar/banner in class or id
  const matches = content.match(/<([a-z0-9]+)[^>]*(?:class|id)=["'][^"']*(?:header|topbar|footer|subnav|toolbar|banner|lower-panel|action-bar|nav)[^"']*["'][^>]*>/gi) || [];
  const tags = content.match(/<(?:header|footer|nav|thead|tfoot)[^>]*>/gi) || [];
  
  const allFound = Array.from(new Set([...matches, ...tags]));
  for (const el of allFound) {
    console.log(el.slice(0, 120));
  }
}
