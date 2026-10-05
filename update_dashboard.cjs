const fs = require('fs');
let d = fs.readFileSync('d:/TopsCore/dashboard.html', 'utf8');

// Add shake keyframes if not exists
if (!d.includes('@keyframes shake')) {
  d = d.replace(/<\/style>/, `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }
    .shake-anim {
      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
      border-color: rgba(239, 68, 68, 0.4) !important;
    }
  </style>`);
}

// Update card rendering to allow pointer-events but use data-locked
const oldCardStyle = `\${isLocked ? 'opacity: 0.65; filter: grayscale(100%); pointer-events: none;' : ''}`;
const newCardStyle = `\${isLocked ? 'opacity: 0.65; filter: grayscale(100%); cursor: not-allowed;' : ''}`;

d = d.replace(oldCardStyle, newCardStyle);
d = d.replace(/<div class="v1-assessment-card" data-assessment-id="\$\{asm\.id\}"/, 
  `<div class="v1-assessment-card" data-assessment-id="\${asm.id}" \${isLocked ? 'data-locked="true"' : ''}`);

// Add click listener in wire-up
const wireupSection = `      // Wire up buttons
      section.querySelectorAll('[data-aid]').forEach(btn => {`;

const wireupNew = `      // Wire up buttons
      section.querySelectorAll('.v1-assessment-card[data-locked="true"]').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          card.classList.remove('shake-anim');
          void card.offsetWidth; // trigger reflow
          card.classList.add('shake-anim');
        });
      });

      section.querySelectorAll('[data-aid]').forEach(btn => {`;

d = d.replace(wireupSection, wireupNew);

fs.writeFileSync('d:/TopsCore/dashboard.html', d);
console.log('dashboard updated');
