const fs = require('fs');
let c = fs.readFileSync('d:/TopsCore/assessment.html', 'utf8');

// Update renderDropdown
c = c.replace(/sel\.className = 'form-control';/, `sel.className = 'form-control';
      sel.style.cssText = 'width:100%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:1rem 1.25rem; color:#fff; font-size:1.1rem; box-sizing:border-box; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); outline:none; font-family:inherit; appearance:none; cursor:pointer;';
`);
c = c.replace(/return \`<option value="\$\{v\}" \$\{savedAnswer === v \? 'selected' : ''\}>\$\{v\}<\/option>\`;/, 
  `return \`<option style="background:#1e293b; color:#fff;" value="\${v}" \${savedAnswer === v ? 'selected' : ''}>\${v}</option>\`;`
);

// Update renderWritten
c = c.replace(/ta\.className = 'written-input';/, `ta.className = 'written-input frosted-input';
      ta.style.cssText = 'width:100%; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); border-radius:12px; padding:1rem 1.25rem; color:#fff; font-size:1.1rem; box-sizing:border-box; backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); resize:vertical; min-height:100px; outline:none; font-family:inherit; transition:all 0.2s;';
`);

// Add CSS for :focus state on frosted inputs
if (!c.includes('.frosted-input:focus')) {
    c = c.replace(/<\/style>/, `
    .frosted-input:focus, .form-control:focus {
      border-color: #34d399 !important;
      box-shadow: 0 0 15px rgba(52, 211, 153, 0.2) !important;
      background: rgba(255, 255, 255, 0.12) !important;
    }
  </style>`);
}

fs.writeFileSync('d:/TopsCore/assessment.html', c);
console.log('assessment updated');
