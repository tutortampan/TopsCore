const fs = require('fs');
let c = fs.readFileSync('js/admin/assessment-builder.js', 'utf8');

c = c.replace(/\/\/ Step 2 -> Step 3[\s\S]*?\/\/ Step 3 -> Step 4 \(Review\)/, `// Step 2 -> Step 3 (Review)
    document.getElementById('btn-topics-prev').onclick = () => switchTab('tab-details');
    document.getElementById('btn-topics-next').onclick = () => {
      if (selectedTopicIds.size === 0) {
        showToast('Please select at least one topic (or source evaluation) for this assessment.', 'warning');
        return;
      }
      
      const typeVal = builderDiv.querySelector('input[name="wiz-type"]:checked').value;
      const title = document.getElementById('wiz-title').value;
      const duration = document.getElementById('wiz-duration').value;
      const order = document.getElementById('wiz-order').value;

      document.getElementById('rev-title').textContent = title;
      document.getElementById('rev-type').textContent = typeVal;
      document.getElementById('rev-class').textContent = subSel.options[subSel.selectedIndex]?.text || '';
      document.getElementById('rev-duration').textContent = \`\${duration} minutes\`;
      document.getElementById('rev-order').textContent = order;
      document.getElementById('rev-assignment').textContent = 'Auto by Level';
      
      switchTab('tab-publish');
    };

    // (Removed Step 3 tab logic)
`);

// Also fix the btn-publish-prev button to go to tab-topics
c = c.replace(/document\.getElementById\('btn-publish-prev'\)\.onclick = \(\) => switchTab\('tab-assign'\);/, "document.getElementById('btn-publish-prev').onclick = () => switchTab('tab-topics');");

// Remove the assignment strategy logic from payload building
c = c.replace(/const strategy = assignStrategySel\.value;/, "const strategy = 'NONE';");
c = c.replace(/const assignBatchId = strategy === 'BATCH' \? batchSel\.value : null;/, "const assignBatchId = null;");
c = c.replace(/const assignStudentId = strategy === 'STUDENT' \? studentSel\.value : null;/, "const assignStudentId = null;");

fs.writeFileSync('js/admin/assessment-builder.js', c);
console.log('Done!');
