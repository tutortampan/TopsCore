const fs = require('fs');

let content = fs.readFileSync('d:/TopsCore/assessment.html', 'utf8');

content = content.replace(
    /<!-- Student Profile \(Center\/Horizontal\) -->[\s\S]*?<\/div>\s*<\/div>\s*<\/header>/m,
    `<!-- Student Profile (Center/Horizontal) -->
    <div style="display:flex; align-items:center; justify-content:center; text-align:left; gap:12px; margin-top:8px;">
      <img id="assessment-student-avatar" src="https://ui-avatars.com/api/?name=S&background=random" style="width:56px; height:56px; border-radius:50%; object-fit:cover; box-shadow:0 4px 12px rgba(0,0,0,0.15); border:2px solid #06b6d4;" />
      <div style="display:flex; flex-direction:column;">
        <span id="assessment-student-name" style="font-size:1.1rem; font-weight:800; color:#fff; font-family:'Outfit',sans-serif; text-shadow:0 2px 4px rgba(0,0,0,0.5); margin-bottom:2px;">-</span>
        <span id="assessment-student-details" style="font-size:0.85rem; font-weight:600; color:#cbd5e1; text-shadow:0 1px 2px rgba(0,0,0,0.5);">Loading details...</span>
      </div>
    </div>
  </header>`
);

content = content.replace(
    /<!-- GRID CONTAINER: CSS must be grid with 10 columns -->\s*<div class="q-nav-grid" id="q-nav-grid" role="navigation" aria-label="Jump to question" style="display:grid; grid-template-columns:repeat\(10, 1fr\); gap:6px;">\s*<!-- Filled dynamically -->\s*<\/div>/m,
    `<!-- GRID CONTAINER: CSS must be grid with 10 columns -->
      <div style="max-height: 40vh; overflow-y: auto; padding-right: 4px;">
        <div class="q-nav-grid" id="q-nav-grid" role="navigation" aria-label="Jump to question" style="display:grid; grid-template-columns:repeat(10, 1fr); gap:6px;">
          <!-- Filled dynamically -->
        </div>
      </div>`
);

content = content.replace(
    /\/\/ Fetch student info for header[\s\S]*?\/\/ V1: If no answer rows at all/m,
    `// Fetch student info for header
        try {
          const nameEl = document.getElementById('assessment-student-name');
          const avatarEl = document.getElementById('assessment-student-avatar');
          const detailsEl = document.getElementById('assessment-student-details');

          if (nameEl) nameEl.textContent = session.student_name || 'Student';
          
          fetch(\`\${sbUrl}/rest/v1/students?id=eq.\${session.student_id}&select=*,institutions(name),programs(name),batches(name),levels(name)\`, {
            headers: { 'apikey': sbKey, 'Authorization': \`Bearer \${sbKey}\` }
          }).then(r => r.json()).then(stuRes => {
            if (stuRes && stuRes[0]) {
              const s = stuRes[0];
              if (s.photo_url && avatarEl) {
                avatarEl.src = s.photo_url;
              } else if (avatarEl) {
                avatarEl.src = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(session.student_name || 'S')}&background=random\`;
              }
              
              let age = '';
              if (s.date_of_birth) {
                const ageNum = Math.floor((new Date() - new Date(s.date_of_birth)) / 31557600000);
                if (ageNum > 0) age = ageNum + 'thn';
              }
              
              const inst = s.institutions?.name || '';
              const prog = s.programs?.name || '';
              const batch = s.batches?.name || '';
              const lvl = s.levels?.name ? 'Lvl ' + s.levels.name : '';
              
              const details = [age, inst, prog, batch, lvl].filter(Boolean).join(' • ');
              if (detailsEl) detailsEl.textContent = details;
            } else if (avatarEl) {
              avatarEl.src = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(session.student_name || 'S')}&background=random\`;
            }
          }).catch(e => {
            console.warn("Failed to fetch student details", e);
            if (avatarEl) avatarEl.src = \`https://ui-avatars.com/api/?name=\${encodeURIComponent(session.student_name || 'S')}&background=random\`;
          });

        } catch (e) {
          console.warn("Failed to load student profile:", e);
        }

        // V1: If no answer rows at all`
);

fs.writeFileSync('d:/TopsCore/assessment.html', content, 'utf8');
console.log('Done replacement');
