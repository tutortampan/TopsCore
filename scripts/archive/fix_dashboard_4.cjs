const fs = require('fs');
let c = fs.readFileSync('dashboard.html', 'utf8');

let p1 = c.indexOf('<input type="file" id="photo-file-input"');
let p2 = c.indexOf('<input type="file" id="photo-file-input"', p1 + 10);

if (p1 !== -1 && p2 !== -1) {
    c = c.substring(0, p1) + c.substring(p1).replace('id="photo-file-input"', 'id="banner-photo-input"');
    p2 = c.indexOf('<input type="file" id="photo-file-input"');
    c = c.substring(0, p2) + c.substring(p2).replace('id="photo-file-input"', 'id="profile-modal-photo-input"');
}

c = c.replace(/onclick="document.getElementById\('photo-file-input'\)\.click\(\);"/g, 'onclick="document.getElementById(\'banner-photo-input\').click();"');

const oldUploadJS = `      // Photo upload click handler
      const avatarContainer = document.getElementById('avatar-container');
      const fileInput = document.getElementById('photo-file-input');

      avatarContainer.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {`;

const newUploadJS = `      // Photo upload click handlers
      const avatarContainer = document.getElementById('avatar-container');
      const bannerInput = document.getElementById('banner-photo-input');
      const modalInput = document.getElementById('profile-modal-photo-input');

      avatarContainer.addEventListener('click', () => modalInput.click());
      
      const handlePhotoChange = (e) => {`;

c = c.replace(oldUploadJS, newUploadJS);

const endUploadJS = `        reader.readAsDataURL(file);
      });`;
const newEndUploadJS = `        reader.readAsDataURL(file);
      };
      
      if (bannerInput) bannerInput.addEventListener('change', handlePhotoChange);
      if (modalInput) modalInput.addEventListener('change', handlePhotoChange);`;

c = c.replace(endUploadJS, newEndUploadJS);

const oldGenderUI = `      const badge = document.getElementById('prof-gender-badge');
      if (badge) {
        if (g === 'male') {`;
        
const newGenderUI = `      session.gender = g;
      session.student_name = formattedName;
      setStudentSession(session);
      
      // Update initials
      const initChar = cleanFullName ? cleanFullName.charAt(0).toUpperCase() : 'S';
      const bInit = document.getElementById('banner-avatar-initial');
      const hInit = document.getElementById('header-avatar-initial');
      if (bInit) bInit.textContent = initChar;
      if (hInit) hInit.textContent = initChar;

      const badge = document.getElementById('prof-gender-badge');
      if (badge) {
        if (g === 'male') {`;

c = c.replace(oldGenderUI, newGenderUI);

fs.writeFileSync('dashboard.html', c);
console.log("Fixed dashboard");
