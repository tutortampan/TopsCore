const fs = require('fs');

let dashboardHtml = fs.readFileSync('dashboard.html', 'utf8');

const oldLogic = `      if (availableAssms.length > 0) {
        // Global average strictly counts unopened/unattempted available modules as 0
        scores = availableAssms.map(a => {
          const score = bestMap[a.id];
          return score != null ? score : 0;
        });
      } else {
        scores = Object.entries(bestMap)
          .filter(([k]) => !k.endsWith('_locked'))
          .map(([, v]) => v);
      }`;

const newLogic = `      // User explicitly requested: only count assessments that have already been taken.
      // Unattempted assessments are NO LONGER counted as 0 towards the average score.
      scores = Object.entries(bestMap)
        .filter(([k]) => !k.endsWith('_locked'))
        .map(([, v]) => v);`;

dashboardHtml = dashboardHtml.replace(oldLogic, newLogic);
fs.writeFileSync('dashboard.html', dashboardHtml);

console.log("Updated average score logic in dashboard.html");
