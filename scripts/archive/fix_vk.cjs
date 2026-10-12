const fs = require('fs'); 
let html = fs.readFileSync('assessment.html', 'utf8'); 
const startIdx = html.indexOf('#virtual-keyboard-container {'); 
const endIdx = html.indexOf('</style>', startIdx); 

const newCss = `#virtual-keyboard-container { 
    flex-shrink: 0; 
    height: auto; 
    padding: 8px 6px; 
    background: rgba(10, 15, 30, 0.95); 
    border-top: 1px solid rgba(255,255,255,0.05); 
    backdrop-filter: blur(10px); 
    display: none; 
    flex-direction: column; 
    box-sizing: border-box; 
    z-index: 1000; 
    box-shadow: 0 -4px 15px rgba(0,0,0,0.3); 
} 
.vk-row { 
    display: flex; 
    justify-content: center; 
    gap: 6px; 
    margin-bottom: 6px; 
} 
.vk-row:last-child { 
    margin-bottom: 0; 
} 
.vk-key { 
    flex: 1; 
    aspect-ratio: 1 / 1.15; 
    max-height: 44px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    max-width: 9%; 
    border-radius: 6px; 
    background: rgba(255,255,255,0.08); 
    border: 1px solid rgba(255,255,255,0.1); 
    color: #e2e8f0; 
    font-size: 1.15rem; 
    font-family: inherit; 
    font-weight: 500; 
    cursor: pointer; 
    -webkit-user-select: none; 
    user-select: none; 
    transition: all 0.1s ease; 
} 
.vk-key:active { 
    background: rgba(255,255,255,0.25); 
    transform: scale(0.95); 
    border-color: rgba(255,255,255,0.3); 
} 
.vk-key.special { 
    max-width: 15%; 
    background: rgba(99, 102, 241, 0.2); 
    color: #a5b4fc; 
    font-size: 0.95rem; 
    border-color: rgba(99, 102, 241, 0.3); 
} 
.vk-key.special:active { 
    background: rgba(99, 102, 241, 0.4); 
} 
.vk-key.space { 
    max-width: 45%; 
    aspect-ratio: unset; 
} 
`; 

html = html.substring(0, startIdx) + newCss + html.substring(endIdx); 
fs.writeFileSync('assessment.html', html);
