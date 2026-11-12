import fs from 'fs';

const appJs = fs.readFileSync('js/admin/app.js', 'utf8');

function inspectRoute(name) {
  const idx = appJs.indexOf(`case '${name}':`) !== -1 ? appJs.indexOf(`case '${name}':`) : appJs.indexOf(`case "${name}":`);
  if (idx !== -1) {
    console.log(`=== ROUTE: ${name} ===`);
    console.log(appJs.slice(idx, idx + 400));
  } else {
    console.log(`Route ${name} not found`);
  }
}

inspectRoute('batches');
inspectRoute('classes-hub');
inspectRoute('curriculum');
inspectRoute('organization');
inspectRoute('modules');
inspectRoute('vocab_vault');

