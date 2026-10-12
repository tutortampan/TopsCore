const fs = require('fs');

const headFile = fs.readFileSync('vocab_vault_head.js', 'utf16le');
const currFile = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const blueprintFile = fs.readFileSync('renderAssessmentBlueprint.js', 'utf8');

// 1. Get the original _renderTopicManager from headFile
const topicManagerStart = headFile.indexOf('function _renderTopicManager(area, words, topics)');
const topicManagerEnd = headFile.indexOf('function openDuplicateCheckerModal(allWords, onResolved)');
if (topicManagerStart === -1 || topicManagerEnd === -1) {
    console.log("Could not find _renderTopicManager in vocab_vault_head.js");
    process.exit(1);
}
// Remove the comment block above openDuplicateCheckerModal if it exists
let endIdx = topicManagerEnd;
while (endIdx > 0 && headFile[endIdx - 1] !== '\n') {
    endIdx--;
}
let originalTopicManager = headFile.slice(topicManagerStart, endIdx).trim() + '\n\n';

// 2. We also need to extract _renderAssessmentBlueprint from blueprintFile
let blueprintFunc = blueprintFile.trim() + '\n\n';

// 3. Update renderVocabularyVault tabs
// In currFile, find the renderVocabularyVault function.
const tabsStart = currFile.indexOf('<button id="vault_vocab_tab"');
const tabsEnd = currFile.indexOf('<div id="vault-tab-content"');

if (tabsStart === -1 || tabsEnd === -1) {
    console.log("Could not find tabs in js/admin/vocab-vault.js");
    process.exit(1);
}

const newTabs = `
          <button id="vault_blueprint_tab" style="background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
            🗺️ Assessment Blueprint
          </button>
          <button id="vault_vocab_tab" style="background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#f8fafc'" onmouseout="if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'">
            📚 Single Words
          </button>
          <button id="vault_phrases_tab" style="background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#f8fafc'" onmouseout="if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'">
            💬 Expressions, Idioms & Proverbs
          </button>
          <button id="vault_topics_tab" style="background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#f8fafc'" onmouseout="if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'">
            📑 Topic Manager
          </button>
          `;
          
let modifiedCurrFile = currFile.substring(0, tabsStart) + newTabs + currFile.substring(tabsEnd);

// 4. Update tab logic
const tabLogicStart = modifiedCurrFile.indexOf("const tabWords = document.getElementById('vault_vocab_tab');");
const tabLogicEnd = modifiedCurrFile.indexOf("const allTabs = [tabWords, tabPhrases, tabTopics];") + "const allTabs = [tabWords, tabPhrases, tabTopics];".length;

if (tabLogicStart === -1) {
    console.log("Could not find tabLogicStart");
    process.exit(1);
}

const newTabLogic = `const tabBlueprint = document.getElementById('vault_blueprint_tab');
    const tabWords = document.getElementById('vault_vocab_tab');
    const tabPhrases = document.getElementById('vault_phrases_tab');
    const tabTopics = document.getElementById('vault_topics_tab');

    function setActiveTab(activeBtn, inactiveBtns, renderFn) {
      if (!Array.isArray(inactiveBtns)) inactiveBtns = [inactiveBtns];
      activeBtn.style.background = '#4f46e5';
      activeBtn.style.color = 'white';
      activeBtn.classList.add('active-tab');

      inactiveBtns.forEach(btn => {
        if (!btn) return;
        btn.style.background = 'transparent';
        btn.style.color = '#94a3b8';
        btn.classList.remove('active-tab');
      });

      renderFn();
    }

    const allTabs = [tabBlueprint, tabWords, tabPhrases, tabTopics];`;

modifiedCurrFile = modifiedCurrFile.substring(0, tabLogicStart) + newTabLogic + modifiedCurrFile.substring(tabLogicEnd);

// 5. Update event listeners for tabs
const tabEventStart = modifiedCurrFile.indexOf("tabWords.addEventListener('click', () => {");
const tabEventEnd = modifiedCurrFile.indexOf("setActiveTab(tabTopics, [tabWords, tabPhrases], () => {") + "setActiveTab(tabTopics, [tabWords, tabPhrases], () => {".length + "\n        _renderThemeTopicManager(tabContent, allVaultWords);\n      });\n    });".length;

const newTabEvents = `tabBlueprint.addEventListener('click', () => {
      setActiveTab(tabBlueprint, [tabWords, tabPhrases, tabTopics], () => {
        _renderAssessmentBlueprint(tabContent, allVaultWords);
      });
    });

    tabWords.addEventListener('click', () => {
      setActiveTab(tabWords, [tabBlueprint, tabPhrases, tabTopics], () => {
        _renderVaultGrid(tabContent, allVaultWords, allTopics, 'single_words');
      });
    });

    tabPhrases.addEventListener('click', () => {
      setActiveTab(tabPhrases, [tabBlueprint, tabWords, tabTopics], () => {
        _renderVaultGrid(tabContent, allVaultWords, allTopics, 'phrases');
      });
    });

    tabTopics.addEventListener('click', () => {
      setActiveTab(tabTopics, [tabBlueprint, tabWords, tabPhrases], () => {
        _renderTopicManager(tabContent, allVaultWords, allTopics);
      });
    });`;

if (tabEventStart !== -1) {
    // Find the end precisely
    const endStr = "});\n    });";
    const actualEnd = modifiedCurrFile.indexOf(endStr, tabEventStart) + endStr.length;
    modifiedCurrFile = modifiedCurrFile.substring(0, tabEventStart) + newTabEvents + modifiedCurrFile.substring(actualEnd);
} else {
    console.log("Could not find tabEventStart");
    process.exit(1);
}

// Ensure default rendering targets blueprint tab
const defaultRenderStart = modifiedCurrFile.indexOf("setActiveTab(tabWords, [tabPhrases, tabTopics], () => {");
if (defaultRenderStart !== -1) {
    const endStr = "});";
    const actualEnd = modifiedCurrFile.indexOf(endStr, defaultRenderStart) + endStr.length;
    const newDefaultRender = `setActiveTab(tabBlueprint, [tabWords, tabPhrases, tabTopics], () => {
      _renderAssessmentBlueprint(tabContent, allVaultWords);
    });`;
    modifiedCurrFile = modifiedCurrFile.substring(0, defaultRenderStart) + newDefaultRender + modifiedCurrFile.substring(actualEnd);
} else {
    console.log("Warning: Could not find default render block");
}

// 6. Replace _renderThemeTopicManager with _renderTopicManager and _renderAssessmentBlueprint
const managerStart = modifiedCurrFile.indexOf('function _renderThemeTopicManager(area, words) {');
const managerEnd = modifiedCurrFile.indexOf('function openDuplicateCheckerModal(allWords, onResolved) {');

if (managerStart !== -1 && managerEnd !== -1) {
    let actualEnd = managerEnd;
    while (actualEnd > 0 && modifiedCurrFile[actualEnd - 1] !== '\n') {
        actualEnd--;
    }
    
    // Also remove the `// ─── Duplicate Checker Modal` from modifiedCurrFile if it's there
    let earlierEnd = modifiedCurrFile.lastIndexOf('//', actualEnd - 1);
    if(earlierEnd !== -1 && modifiedCurrFile.substring(earlierEnd, actualEnd).includes('Duplicate Checker Modal')) {
        actualEnd = earlierEnd;
    }
    
    modifiedCurrFile = modifiedCurrFile.substring(0, managerStart) + 
                       blueprintFunc + 
                       originalTopicManager + "\n\n// ─── Duplicate Checker Modal ──────────────────────────────────\n" + 
                       modifiedCurrFile.substring(managerEnd);
} else {
    console.log("Could not find _renderThemeTopicManager in currFile");
    process.exit(1);
}

fs.writeFileSync('js/admin/vocab-vault.js', modifiedCurrFile);
console.log("Tabs and TopicManager restored successfully.");
