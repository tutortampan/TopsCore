export async function renderVocabularyVault(area) {
  showLoading();
  try {
    const [words, topics] = await Promise.all([
      fetchVaultWords({ limit: 10000, targetLevel: null }),
      fetchVaultTopics()
    ]);
    hideLoading();
    
    area.innerHTML = `
      <div style="display: flex; flex-direction: column; height: 100%; overflow: hidden;">
        <div style="background: #020617; border-bottom: 1px solid #1e293b; display: flex; gap: 8px; padding: 12px 24px; overflow-x: auto; flex-shrink: 0;">
          <button id="vault_vocab_tab" style="background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;">
            ≡ƒôÜ Single Words
          </button>
          <button id="vault_phrases_tab" style="background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#f8fafc'" onmouseout="if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'">
            ≡ƒÆ¼ Expressions, Idioms & Proverbs
          </button>
          <button id="vault_topics_tab" style="background: transparent; color: #94a3b8; border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.color='#f8fafc'" onmouseout="if(!this.classList.contains('active-tab')) this.style.color='#94a3b8'">
            ≡ƒôæ Topic Manager
          </button>
        </div>
        <div id="vault-tab-content" style="flex-grow: 1; overflow-y: auto; padding: 24px; box-sizing: border-box;">
        </div>
      </div>
    `;

    const tabContent = document.getElementById('vault-tab-content');
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

    const allTabs = [tabWords, tabPhrases, tabTopics];
    
    tabWords.addEventListener('click', () => {
      setActiveTab(tabWords, allTabs.filter(t => t !== tabWords), () => _renderVaultGrid(tabContent, words, topics, 'single_words'));
    });
    tabPhrases.addEventListener('click', () => {
      setActiveTab(tabPhrases, allTabs.filter(t => t !== tabPhrases), () => _renderVaultGrid(tabContent, words, topics, 'phrases'));
    });
    tabTopics.addEventListener('click', () => {
      setActiveTab(tabTopics, allTabs.filter(t => t !== tabTopics), () => _renderTopicManager(tabContent, words, topics));
    });

    // Default to Single Words tab
    setActiveTab(tabWords, allTabs.filter(t => t !== tabWords), () => _renderVaultGrid(tabContent, words, topics, 'single_words'));

  } catch (e) {
    hideLoading();
    area.innerHTML = `<div class="empty-state"><div class="empty-state__icon">&#9888;&#65039;</div><h3>Failed to load Vocabulary Vault</h3><p class="text-muted">${escapeHtml(e.message)}</p></div>`;
  }
}


// ΓöÇΓöÇΓöÇ Grid View ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
