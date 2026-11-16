// js/pwa.js
// Production PWA Registration & Install Handler for TopsCore LMS

let deferredInstallPrompt = null;

export function initPWA() {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js?v=20261116_v548')
        .then(reg => {
          reg.update();
          console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
        })
        .catch(err => {
          console.warn('[PWA] ServiceWorker registration failed:', err);
        });
    });
  }

  // 2. Network Resilience & Offline Detection
  initNetworkStatusListener();

  // Check if running in standalone mode (already installed as PWA)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  if (isStandalone) {
    console.log('[PWA] App is running in standalone mode.');
    return;
  }

  // 3. Handle beforeinstallprompt event (Chromium / Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('[PWA] beforeinstallprompt captured.');

    // Only show if user hasn't dismissed it in current session
    if (sessionStorage.getItem('topscore_pwa_dismissed') === '1') {
      return;
    }

    renderInstallBanner();
  });

  // 3. Handle appinstalled event
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] TopsCore was successfully installed as an app!');
    deferredInstallPrompt = null;
    hideInstallBanner();
  });
}

function renderInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.className = 'pwa-install-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Install TopsCore App');
  banner.innerHTML = `
    <div class="pwa-install-card">
      <div class="pwa-install-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      </div>
      <div class="pwa-install-content">
        <div class="pwa-install-title">Install TopsCore App</div>
      </div>
      <div class="pwa-install-actions">
        <button type="button" class="pwa-btn-install" id="pwa-btn-install">Install</button>
        <button type="button" class="pwa-btn-dismiss" id="pwa-btn-dismiss" aria-label="Dismiss">Later</button>
      </div>
    </div>
  `;

  // The PWA install banner is strictly for the Student Gate (index.html)
  const secInstitution = document.getElementById('sec-institution');
  if (secInstitution && secInstitution.parentNode) {
    secInstitution.parentNode.insertBefore(banner, secInstitution);
  } else if (document.querySelector('.login-wrapper')) {
    const loginWrapper = document.querySelector('.login-wrapper');
    loginWrapper.insertBefore(banner, loginWrapper.firstChild);
  } else {
    // Never render the install banner on internal student study pages (dashboard, test, result)
    return;
  }

  // Hook install button
  const installBtn = document.getElementById('pwa-btn-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      installBtn.disabled = true;
      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        console.log('[PWA] User choice:', choice.outcome);
        if (choice.outcome === 'accepted') {
          hideInstallBanner();
        }
      } catch (err) {
        console.warn('[PWA] Prompt error:', err);
      } finally {
        deferredInstallPrompt = null;
        installBtn.disabled = false;
      }
    });
  }

  // Hook dismiss button
  const dismissBtn = document.getElementById('pwa-btn-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      sessionStorage.setItem('topscore_pwa_dismissed', '1');
      hideInstallBanner();
    });
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) {
    banner.remove();
  }
}

function initNetworkStatusListener() {
  if (typeof window === 'undefined') return;

  function showStatus(isOnline) {
    let badge = document.getElementById('pwa-offline-badge');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'pwa-offline-badge';
      badge.className = 'pwa-offline-badge';
      badge.setAttribute('role', 'status');
      badge.setAttribute('aria-live', 'polite');
      document.body.appendChild(badge);
    }

    if (!isOnline) {
      badge.className = 'pwa-offline-badge offline';
      badge.innerHTML = '<span class="pwa-network-dot" aria-hidden="true"></span><span>Offline Mode — Using Cached Data</span>';
      badge.style.display = 'flex';
      badge.style.opacity = '1';
    } else {
      // Only show "Back Online" if it was previously offline
      if (badge.classList.contains('offline')) {
        badge.className = 'pwa-offline-badge online';
        badge.innerHTML = '<span class="pwa-network-dot" aria-hidden="true"></span><span>Back Online</span>';
        badge.style.display = 'flex';
        badge.style.opacity = '1';
        setTimeout(() => {
          badge.style.opacity = '0';
          setTimeout(() => { badge.style.display = 'none'; }, 300);
        }, 2500);
      }
    }
  }

  window.addEventListener('offline', () => showStatus(false));
  window.addEventListener('online', () => showStatus(true));

  // Initial check on load
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    showStatus(false);
  }
}

// Auto-run if imported directly
if (typeof window !== 'undefined') {
  initPWA();
}
