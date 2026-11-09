const fs = require('fs');

const normCode = fs.readFileSync('js/admin/tests-access.js', 'utf8').replace(/\r\n/g, '\n');

// Check renderThemeCard start and end
const startTheme = 'function renderThemeCard(theme, context) {';
const endTheme = '/**\n * Event binding and interactive modal controller\n */';
console.log('startTheme exists:', normCode.includes(startTheme));
console.log('endTheme exists:', normCode.includes(endTheme));

// Check openThemeLiveMonitorModal start
const startLiveModal = 'async function openThemeLiveMonitorModal(container, theme, context) {';
console.log('startLiveModal exists:', normCode.includes(startLiveModal));

// Check renderLiveMonitorUI start
const startRenderLive = '  function renderLiveMonitorUI() {';
console.log('startRenderLive exists:', normCode.includes(startRenderLive));
