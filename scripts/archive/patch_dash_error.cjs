const fs = require('fs');
const file = 'd:/TopsCore/dashboard.html';
let content = fs.readFileSync(file, 'utf8');

const target = `      } catch(e) {
        hideLoading();
        showToast('Failed to load dashboard: ' + e.message, 'error');
      }`;

const replacement = `      } catch(e) {
        hideLoading();
        showToast('Failed to load dashboard: ' + e.message, 'error');
        // Clear loading placeholders if there's an error
        renderClasses([], []);
        renderCompletedAssessmentsBottom([], 0);
      }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed dashboard.html catch block successfully.');
} else {
    console.log('Could not find target block to replace.');
}
