const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const upNextSection = `
      <!-- UP NEXT SECTION -->
      <section id="up-next-section" class="hidden" style="margin-top: 16px;">
        <div class="section-header">
          <div>
            <h2 class="section-title">🎯 My Next Assessment</h2>
            <p class="section-subtitle">The next module you need to complete</p>
          </div>
        </div>
        <div id="up-next-container" style="background: var(--clr-bg-2, #0b1523); border-radius: 12px; padding: 16px; border: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          <!-- Populated by JS -->
        </div>
      </section>
`;

if (!html.includes('id="up-next-section"')) {
  html = html.replace(
    /<section class="classes-section"/,
    upNextSection + '\n      <section class="classes-section"'
  );
}

// Now insert logic to populate "Up Next".
// The computeOverallStats function takes (attempts, myAssessments). We can find the next assessment there.
const populateUpNextCode = `
    function populateUpNext(attempts, myAssessments) {
      const upNextSection = document.getElementById('up-next-section');
      const upNextContainer = document.getElementById('up-next-container');
      if (!upNextSection || !upNextContainer) return;

      // Completed assessment IDs (score > 0)
      const completedIds = new Set();
      attempts.forEach(a => {
        if (parseFloat(a.percentage || 0) > 0) {
          const aid = a.assessment_id || a.Assessment_id || (a.assessments && a.assessments.id) || a.id;
          completedIds.add(aid);
        }
      });

      // Find the first uncompleted assessment that matches the student's level_number
      // Sort by level_number, then display_order
      let available = myAssessments.filter(a => a.status === 'PUBLISHED' && !completedIds.has(a.id));
      
      // Filter out assessments that exceed the student's level
      const sessionLvlNum = parseInt(session.level_number) || 999; 
      available = available.filter(a => {
         const aLvlNum = a.levels?.level_number || 999;
         return aLvlNum <= sessionLvlNum;
      });
      
      available.sort((a, b) => {
         const aLvl = a.levels?.level_number || 999;
         const bLvl = b.levels?.level_number || 999;
         if (aLvl !== bLvl) return aLvl - bLvl;
         return (a.display_order || 99) - (b.display_order || 99);
      });

      const nextAssessment = available[0];

      if (nextAssessment) {
        upNextSection.classList.remove('hidden');
        
        // Build card HTML
        const classObj = window._loadedClasses?.find(c => c.id === nextAssessment.class_id) || {};
        const className = classObj.name || nextAssessment.classes?.name || 'Class';
        const typeStr = nextAssessment.assessment_type || 'TEST';
        const title = nextAssessment.title || 'Untitled Assessment';
        
        const navLink = \`window.location.href='assessment.html?id=\${nextAssessment.id}&program_id=\${session.program_id}&institution_id=\${session.institution_id}&class_id=\${nextAssessment.class_id}'\`;

        upNextContainer.innerHTML = \`
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 4px;">\${escapeHtml(title)}</div>
              <div style="font-size: 0.8rem; color: #94a3b8; display: flex; gap: 8px; align-items: center;">
                <span class="badge badge-neutral" style="font-size: 0.65rem; padding: 2px 6px;">\${escapeHtml(className)}</span>
                <span class="badge badge-primary" style="font-size: 0.65rem; padding: 2px 6px;">\${escapeHtml(typeStr)}</span>
              </div>
            </div>
            <button onclick="\${navLink}" class="btn btn-primary" style="padding: 8px 16px; border-radius: 8px; font-weight: 700; white-space: nowrap;">Start Now</button>
          </div>
        \`;
      } else {
        upNextSection.classList.add('hidden');
      }
    }
`;

if (!html.includes('function populateUpNext')) {
  // Inject before computeOverallStats
  html = html.replace(
    /async function computeOverallStats/,
    populateUpNextCode + '\n    async function computeOverallStats'
  );
}

if (!html.includes('populateUpNext(attempts, myAssessments);')) {
  html = html.replace(
    /renderCompletedAssessmentsBottom\(attempts, typeof avgPct !== 'undefined' \? avgPct : 0\);/g,
    'renderCompletedAssessmentsBottom(attempts, typeof avgPct !== \'undefined\' ? avgPct : 0);\n        populateUpNext(attempts, myAssessments);'
  );
}

// We also need to save Classes to window._loadedClasses so we can look up their names
if (!html.includes('window._loadedClasses = rawClasses;')) {
  html = html.replace(
    /function renderClasses\(rawClasses, progress\) {/,
    'function renderClasses(rawClasses, progress) {\n        window._loadedClasses = rawClasses;'
  );
}

fs.writeFileSync('dashboard.html', html);
console.log('Added Up Next logic');
