const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/js/api.js', 'utf8');

// Update checkVaultDuplicates to fetch item_code
code = code.replace(
  ".select('id, theme, topic, indonesian, english, target_level, word_type')",
  ".select('id, item_code, theme, topic, indonesian, english, target_level, word_type')"
);

// Update conflict checking to check item_code first
const oldConflictLogic = `    const conflict = vault.find(v => 
        normStr(v.topic) === rowTopic &&
        (normStr(v.indonesian) === rowInd || normStr(v.english) === rowEng)
    );`;

const newConflictLogic = `    const rowItemCode = row['Item Code'] || row.item_code;
    let conflict = null;
    if (rowItemCode) {
      conflict = vault.find(v => v.item_code === rowItemCode);
    }
    if (!conflict) {
      conflict = vault.find(v => 
          normStr(v.topic) === rowTopic &&
          (normStr(v.indonesian) === rowInd || normStr(v.english) === rowEng)
      );
    }`;

code = code.replace(oldConflictLogic, newConflictLogic);

fs.writeFileSync('d:/TopsCore/js/api.js', code);
console.log("api.js patched for checkVaultDuplicates.");
