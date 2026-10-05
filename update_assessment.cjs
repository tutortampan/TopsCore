const fs = require('fs');
let a = fs.readFileSync('d:/TopsCore/assessment.html', 'utf8');

// Add CSS for Focus Mode if not exists
if (!a.includes('body.focus-mode header')) {
  a = a.replace(/<\/style>/, `
    /* FOCUS MODE CSS */
    body.focus-mode header,
    body.focus-mode #progress-bar-toggle,
    body.focus-mode .bottom-nav-bar {
      opacity: 0.15 !important;
      pointer-events: none !important;
    }
    header, #progress-bar-toggle, .bottom-nav-bar {
      transition: opacity 0.5s ease;
    }
  </style>`);
}

// Add JS for Focus Mode if not exists
if (!a.includes('FOCUS MODE JS')) {
  const focusScript = `
  <!-- FOCUS MODE JS -->
  <script>
    document.addEventListener('focusin', (e) => {
      if (e.target.matches('textarea.written-input, select.form-control, input.form-control, .frosted-input')) {
        document.body.classList.add('focus-mode');
      }
    });
    document.addEventListener('focusout', (e) => {
      if (e.target.matches('textarea.written-input, select.form-control, input.form-control, .frosted-input')) {
        document.body.classList.remove('focus-mode');
      }
    });
    document.addEventListener('click', (e) => {
      const micBtn = e.target.closest('.speech-mic-btn-lg');
      if (micBtn) {
        setTimeout(() => {
          if (micBtn.classList.contains('listening')) {
            document.body.classList.add('focus-mode');
          } else {
            document.body.classList.remove('focus-mode');
          }
        }, 50);
      }
    });
  </script>
</body>`;
  
  a = a.replace(/<\/body>/, focusScript);
}

fs.writeFileSync('d:/TopsCore/assessment.html', a);
console.log('assessment updated');
