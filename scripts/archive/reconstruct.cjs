const fs = require('fs');
const currFile = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const oldHead = fs.readFileSync('vocab_vault_head.js', 'utf16le');

const importsEnd = currFile.indexOf('export async function renderVocabularyVault');
const importsAndHelpers = currFile.substring(0, importsEnd);

const backtick = String.fromCharCode(96);
const dollar = String.fromCharCode(36);

const newRenderVault = "export async function renderVocabularyVault(area) {\n" +
"  showLoading();\n" +
"  try {\n" +
"    const [words, topics] = await Promise.all([\n" +
"      fetchVaultWords({ limit: 10000, targetLevel: null }),\n" +
"      fetchVaultTopics()\n" +
"    ]);\n" +
"    hideLoading();\n" +
"    \n" +
"    area.innerHTML = " + backtick + "\n" +
"      <div style=\"display: flex; flex-direction: column; height: 100%; overflow: hidden;\">\n" +
"        <div style=\"background: #020617; border-bottom: 1px solid #1e293b; display: flex; gap: 8px; padding: 12px 24px; overflow-x: auto; flex-shrink: 0;\">\n" +
"          <button id=\"vault_blueprint_tab\" style=\"background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;\">\n" +
"            Assessment Blueprint\n" +
"          </button>\n" +
"          <button id=\"vault_vocab_tab\" style=\"background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;\" onmouseover=\"this.style.color='#f8fafc'\" onmouseout=\"if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'\">\n" +
"            Single Words\n" +
"          </button>\n" +
"          <button id=\"vault_phrases_tab\" style=\"background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;\" onmouseover=\"this.style.color='#f8fafc'\" onmouseout=\"if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'\">\n" +
"            Expressions, Idioms & Proverbs\n" +
"          </button>\n" +
"          <button id=\"vault_topics_tab\" style=\"background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;\" onmouseover=\"this.style.color='#f8fafc'\" onmouseout=\"if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'\">\n" +
"            Topic Manager\n" +
"          </button>\n" +
"        </div>\n" +
"        <div id=\"vault-tab-content\" style=\"flex-grow: 1; overflow-y: auto; padding: 24px; box-sizing: border-box;\">\n" +
"        </div>\n" +
"      </div>\n" +
"    " + backtick + ";\n" +
"\n" +
"    const tabContent = document.getElementById('vault-tab-content');\n" +
"    const tabBlueprint = document.getElementById('vault_blueprint_tab');\n" +
"    const tabWords = document.getElementById('vault_vocab_tab');\n" +
"    const tabPhrases = document.getElementById('vault_phrases_tab');\n" +
"    const tabTopics = document.getElementById('vault_topics_tab');\n" +
"\n" +
"    function setActiveTab(activeBtn, inactiveBtns, renderFn) {\n" +
"      if (!Array.isArray(inactiveBtns)) inactiveBtns = [inactiveBtns];\n" +
"      activeBtn.style.background = '#4f46e5';\n" +
"      activeBtn.style.color = 'white';\n" +
"      activeBtn.classList.add('active-tab');\n" +
"\n" +
"      inactiveBtns.forEach(btn => {\n" +
"        if (!btn) return;\n" +
"        btn.style.background = 'transparent';\n" +
"        btn.style.color = '#94a3b8';\n" +
"        btn.classList.remove('active-tab');\n" +
"      });\n" +
"\n" +
"      renderFn();\n" +
"    }\n" +
"\n" +
"    tabBlueprint.addEventListener('click', () => {\n" +
"      setActiveTab(tabBlueprint, [tabWords, tabPhrases, tabTopics], () => {\n" +
"        _renderAssessmentBlueprint(tabContent, words);\n" +
"      });\n" +
"    });\n" +
"\n" +
"    tabWords.addEventListener('click', () => {\n" +
"      setActiveTab(tabWords, [tabBlueprint, tabPhrases, tabTopics], () => {\n" +
"        _renderVaultGrid(tabContent, words, topics, 'single_words');\n" +
"      });\n" +
"    });\n" +
"\n" +
"    tabPhrases.addEventListener('click', () => {\n" +
"      setActiveTab(tabPhrases, [tabBlueprint, tabWords, tabTopics], () => {\n" +
"        _renderVaultGrid(tabContent, words, topics, 'phrases');\n" +
"      });\n" +
"    });\n" +
"\n" +
"    tabTopics.addEventListener('click', () => {\n" +
"      setActiveTab(tabTopics, [tabBlueprint, tabWords, tabPhrases], () => {\n" +
"        _renderTopicManager(tabContent, words, topics);\n" +
"      });\n" +
"    });\n" +
"\n" +
"    setActiveTab(tabBlueprint, [tabWords, tabPhrases, tabTopics], () => {\n" +
"      _renderAssessmentBlueprint(tabContent, words);\n" +
"    });\n" +
"\n" +
"  } catch (e) {\n" +
"    hideLoading();\n" +
"    area.innerHTML = " + backtick + "<div class=\"empty-state\"><h3>Failed to load Vocabulary Vault</h3><p class=\"text-muted\">" + dollar + "{escapeHtml(e.message)}</p></div>" + backtick + ";\n" +
"  }\n" +
"}\n\n";

const bpStart = currFile.indexOf('function _renderAssessmentBlueprint(area, words) {');
const bpEnd = currFile.indexOf('function _renderTopicManager(area, words, topics) {');
const blueprintFunc = currFile.substring(bpStart, bpEnd).trim() + '\n\n';

const vgStart = oldHead.indexOf("function _renderVaultGrid(area, words, topics, mode = 'single_words') {");
const vgEnd = oldHead.indexOf("function _renderTopicManager(area, words, topics) {");
let gridFunc = oldHead.substring(vgStart, vgEnd).trim() + '\n\n';

gridFunc = gridFunc.replace(/let title = mode === 'single_words' \? '[^']+' : '[^']+';/g, "let title = mode === 'single_words' ? '📚 Single Words' : '💬 Expressions, Idioms & Proverbs';");
gridFunc = gridFunc.replace(/btn\.innerHTML = '&#[^']+;'; \/\/ Save icon/g, "btn.innerHTML = '&#128190;'; // Save icon");
gridFunc = gridFunc.replace(/btn\.innerHTML = '&#[^']+;'; \/\/ wait/g, "btn.innerHTML = '&#8987;'; // wait");
gridFunc = gridFunc.replace(/%\'A'Ao/g, '📚');
gridFunc = gridFunc.replace(/%\'A\+A/g, '💬');
gridFunc = gridFunc.replace(/%\'A'A/g, '📑');
gridFunc = gridFunc.replace(/%\\?/g, '⚠️');
gridFunc = gridFunc.replace(/%\'A'A½/g, '🗑️');
gridFunc = gridFunc.replace(/%\'\\?/g, '💾');
gridFunc = gridFunc.replace(/%\'\\?/g, '✏️');

const restContent = currFile.substring(bpEnd);

const finalFile = importsAndHelpers + newRenderVault + blueprintFunc + gridFunc + restContent;
fs.writeFileSync('js/admin/vocab-vault.js', finalFile, 'utf8');
console.log('Successfully reconstructed vocab-vault.js!');