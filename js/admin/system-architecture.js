/**
 * TOPSCORE LMS — SYSTEM ARCHITECTURE STUDIO (SSOT)
 * Interactive Living Component Architecture & Token Laboratory
 * Route: admin.html#interface-settings (Domain D — DATA)
 */

import { getSupabase } from '../supabase.js?v=20261106_v160';
import { showToast, escHtml } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { 
  DEFAULT_COLOR_SYSTEM, 
  DEFAULT_INTERFACE_SYSTEM, 
  applyGlobalColorSystem, 
  applyGlobalInterfaceSystem 
} from '../grading.js';

// Component Architecture Catalog Definition
const ARCH_CATALOG = {
  tables: {
    label: 'Tables & Datagrid',
    icon: 'clipboard',
    components: [
      {
        id: 'two-tier-header',
        name: 'Two-Tier Sticky Header',
        realm: 'Admin Desktop (100vh)',
        ruleRef: 'AGENTS.md §2.9 & ui-invariants.md §4.3',
        description: 'Super-Header locked at top:0 (30px) + Sub-Header locked at top:30px (30px). Total 60px height.',
        specs: {
          superHeight: 30,
          subHeight: 30,
          totalHeight: 60,
          fontSize: 12,
          fontWeight: 800,
          borderBottom: '1.5px solid rgba(255, 255, 255, 0.16)',
          bgHeader: '#0f172a'
        },
        tokens: [
          { key: 'bgHeader', label: 'Header Background', token: '--fm-bg-header', hex: '#0f172a' },
          { key: 'textHeader', label: 'Header Text', token: '--clr-text-1', hex: '#ffffff' },
          { key: 'accentBar', label: 'Theme Accent', token: '--quad-c', hex: '#95ff00' }
        ],
        renderPreview: (specs) => `
          <div style="background:#090d16; border:1px solid rgba(255,255,255,0.12); border-radius:6px; overflow:hidden; width:100%; max-width:540px;">
            <div style="display:flex; height:${specs.superHeight}px; background:${specs.bgHeader}; border-bottom:1px solid rgba(255,255,255,0.1); line-height:${specs.superHeight}px; padding:0 10px; font-size:${specs.fontSize}px; font-weight:${specs.fontWeight}; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em;">
              <div style="flex:1;">ROSTER DATA</div>
              <div style="flex:2; text-align:center; border-left:1px solid rgba(255,255,255,0.1); border-right:1px solid rgba(255,255,255,0.1); color:#38bdf8;">THEME A · WORK OF WORLD</div>
              <div style="flex:1; text-align:right;">OVERALL</div>
            </div>
            <div style="display:flex; height:${specs.subHeight}px; background:rgba(15,23,42,0.95); line-height:${specs.subHeight}px; padding:0 10px; font-size:${specs.fontSize}px; font-weight:700; color:#94a3b8; text-transform:uppercase; border-bottom:${specs.borderBottom};">
              <div style="flex:1;">STUDENT</div>
              <div style="flex:0.6; text-align:center;">TASK</div>
              <div style="flex:0.7; text-align:center;">RATE</div>
              <div style="flex:0.7; text-align:center;">PTS</div>
              <div style="flex:0.6; text-align:center;">GRD</div>
              <div style="flex:1; text-align:right;">DONE</div>
            </div>
            <div style="padding:8px 10px; font-size:12px; color:#cbd5e1; display:flex; align-items:center; background:rgba(255,255,255,0.01);">
              <div style="flex:1; font-weight:700; color:#ffffff;">Ahmad Fauzi</div>
              <div style="flex:0.6; text-align:center;"><span style="color:#00c000; font-weight:700;">14/14</span></div>
              <div style="flex:0.7; text-align:center; font-variant-numeric:tabular-nums;">95%</div>
              <div style="flex:0.7; text-align:center; font-variant-numeric:tabular-nums; font-weight:700;">285</div>
              <div style="flex:0.6; text-align:center;"><span class="badge" style="background:#00c000; color:#ffffff; font-weight:800; font-size:12px; padding:2px 8px; border-radius:4px;">A</span></div>
              <div style="flex:1; text-align:right; font-weight:700; color:#95ff00;">100% ★</div>
            </div>
          </div>
        `
      },
      {
        id: 'grade-badges',
        name: 'Authoritative Grade Badges',
        realm: 'Universal (Student & Admin)',
        ruleRef: 'AGENTS.md §2.10 & ui-invariants.md §3.1',
        description: 'Official centralized grading scale tokens. Star (★) is exclusively Vibrant Purple (var(--grade-star, #a855f7)).',
        specs: {
          badgeHeight: 24,
          badgePadding: '2px 10px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 800
        },
        tokens: [
          { key: 'star', label: 'Star (100% Excellent)', token: '--grade-star', hex: 'var(--grade-star, #a855f7)' },
          { key: 'gradeA', label: 'Grade A (90-99% Very Good)', token: '--grade-a', hex: '#00c000' },
          { key: 'gradeB', label: 'Grade B (80-89% Good)', token: '--grade-b', hex: '#95ff00' },
          { key: 'gradeC', label: 'Grade C (60-79% Enough)', token: '--grade-c', hex: '#FFFF00' },
          { key: 'gradeD', label: 'Grade D (30-59% Less)', token: '--grade-d', hex: '#FF8C00' },
          { key: 'gradeE', label: 'Grade E (0-29% Fail)', token: '--grade-e', hex: '#FF0000' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center;">
            <span style="background:${tokens.star || 'var(--grade-star, #a855f7)'}; color:#0f172a; font-weight:${specs.fontWeight}; font-size:${specs.fontSize}px; padding:${specs.badgePadding}; border-radius:${specs.borderRadius}px; box-shadow:0 0 10px rgba(192,132,252,0.4);">★ 100% EXCELLENT</span>
            <span style="background:${tokens.gradeA || '#00c000'}; color:#ffffff; font-weight:${specs.fontWeight}; font-size:${specs.fontSize}px; padding:${specs.badgePadding}; border-radius:${specs.borderRadius}px;">A 95% VERY GOOD</span>
            <span style="background:${tokens.gradeB || '#95ff00'}; color:#0f172a; font-weight:${specs.fontWeight}; font-size:${specs.fontSize}px; padding:${specs.badgePadding}; border-radius:${specs.borderRadius}px;">B 85% GOOD</span>
            <span style="background:${tokens.gradeC || '#FFFF00'}; color:#0f172a; font-weight:${specs.fontWeight}; font-size:${specs.fontSize}px; padding:${specs.badgePadding}; border-radius:${specs.borderRadius}px;">C 70% ENOUGH</span>
            <span style="background:${tokens.gradeD || '#FF8C00'}; color:#0f172a; font-weight:${specs.fontWeight}; font-size:${specs.fontSize}px; padding:${specs.badgePadding}; border-radius:${specs.borderRadius}px;">D 45% LESS</span>
            <span style="background:${tokens.gradeE || '#FF0000'}; color:#ffffff; font-weight:${specs.fontWeight}; font-size:${specs.fontSize}px; padding:${specs.badgePadding}; border-radius:${specs.borderRadius}px;">E 20% FAIL</span>
          </div>
        `
      }
    ]
  },
  cards: {
    label: 'Cards Realm',
    icon: 'award',
    components: [
      {
        id: 'grade-card',
        name: 'Student Grade Card',
        realm: 'Student Mobile Corridor (430px)',
        ruleRef: 'AGENTS.md §2.10 & ui-invariants.md §5.2',
        description: 'Class-scoped authoritative grade card displaying Grade Symbol, Predicate, and Score Rate %.',
        specs: {
          padding: 10,
          borderRadius: 12,
          symbolSize: 32,
          bgCard: '#121c35',
          borderColor: 'rgba(255,255,255,0.08)'
        },
        tokens: [
          { key: 'gradeColor', label: 'Grade Tone', token: '--grade-star', hex: 'var(--grade-star, #a855f7)' },
          { key: 'bgCard', label: 'Card Background', token: '--fm-card-bg', hex: '#121c35' },
          { key: 'textPrimary', label: 'Text White', token: '--clr-text-1', hex: '#ffffff' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="background:${specs.bgCard}; border:1px solid ${specs.borderColor}; border-radius:${specs.borderRadius}px; padding:${specs.padding}px; width:100%; max-width:380px; display:flex; align-items:center; gap:12px; box-sizing:border-box;">
            <div style="width:64px; height:64px; border-radius:10px; background:linear-gradient(135deg, ${tokens.gradeColor || 'var(--grade-star, #a855f7)'}, #6d28d9); display:flex; align-items:center; justify-content:center; font-size:${specs.symbolSize}px; font-weight:900; color:#0f172a; box-shadow:0 0 16px rgba(192,132,252,0.45); flex-shrink:0;">
              ★
            </div>
            <div style="flex:1; min-width:0;">
              <div style="font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em;">Current Standing</div>
              <div style="font-size:16px; font-weight:800; color:${tokens.textPrimary || '#ffffff'}; text-transform:uppercase; margin-top:2px;">EXCELLENT</div>
              <div style="font-size:12px; color:#cbd5e1; margin-top:4px; font-variant-numeric:tabular-nums;">Passing Rate: <strong style="color:${tokens.gradeColor || 'var(--grade-star, #a855f7)'}; font-size:12px;">100%</strong></div>
            </div>
          </div>
        `
      },
      {
        id: 'hero-card',
        name: 'Student Dashboard Hero Card',
        realm: 'Student Mobile Corridor (430px)',
        ruleRef: 'AGENTS.md §2.5.2 & ui-invariants.md §5.1',
        description: 'Primary landing card with dynamic Tier Aura, 40px big score typography, and Level indicator.',
        specs: {
          padding: 10,
          borderRadius: 14,
          scoreSize: 40,
          bgHero: '#0f172a',
          auraColor: '#38bdf8'
        },
        tokens: [
          { key: 'auraColor', label: 'Tier Aura Glow', token: '--tier-tactical', hex: '#38bdf8' },
          { key: 'bgHero', label: 'Hero Background', token: '--fm-card-bg', hex: '#0f172a' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="background:${specs.bgHero}; border:1.5px solid ${tokens.auraColor || '#38bdf8'}40; border-radius:${specs.borderRadius}px; padding:${specs.padding}px; width:100%; max-width:380px; box-shadow:0 0 24px ${(tokens.auraColor || '#38bdf8')}30; box-sizing:border-box;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span class="badge" style="background:${tokens.auraColor || '#38bdf8'}; color:#0f172a; font-size:12px; font-weight:800; padding:2px 8px; border-radius:4px;">CAMP LEVEL 3</span>
              <span style="font-size:12px; color:#94a3b8; font-weight:700;">CAMP 3RD VOCABULARY</span>
            </div>
            <div style="display:flex; align-items:baseline; gap:6px;">
              <span style="font-size:${specs.scoreSize}px; font-weight:900; color:#f8fafc; line-height:1; font-variant-numeric:tabular-nums;">980</span>
              <span style="font-size:14px; font-weight:800; color:${tokens.auraColor || '#38bdf8'};">PTS</span>
            </div>
            <div style="margin-top:8px; font-size:12px; color:#cbd5e1;">Next: <strong style="color:#ffffff;">Task D2 - Job Hunting &amp; Application</strong></div>
          </div>
        `
      },
      {
        id: 'stat-card',
        name: 'Glass Stat Card',
        realm: 'Universal Workstations',
        ruleRef: 'AGENTS.md §0.2.1 & ui-invariants.md §1.7',
        description: 'Metric container strictly enforcing 10px internal padding lock and 30px whole-integer typography.',
        specs: {
          padding: 10,
          borderRadius: 8,
          numberSize: 30,
          bgCard: 'rgba(15,23,42,0.65)'
        },
        tokens: [
          { key: 'metricColor', label: 'Metric Accent', token: '--quad-d', hex: '#38bdf8' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="background:${specs.bgCard}; border:1px solid rgba(255,255,255,0.08); border-radius:${specs.borderRadius}px; padding:${specs.padding}px !important; width:160px; text-align:center; box-sizing:border-box;">
            <div style="font-size:${specs.numberSize}px; font-weight:800; color:${tokens.metricColor || '#38bdf8'}; line-height:1.1; font-variant-numeric:tabular-nums;">169</div>
            <div style="font-size:12px; color:#94a3b8; text-transform:uppercase; font-weight:700; margin-top:4px;">Students</div>
            <div style="font-size:12px; color:#64748b; margin-top:2px;">164 active</div>
          </div>
        `
      }
    ]
  },
  panels: {
    label: 'Panels & Modals',
    icon: 'layers',
    components: [
      {
        id: 'title-area',
        name: 'Standardized 60px Title Area Header',
        realm: 'Admin Floating Windows & Modals',
        ruleRef: 'ui-invariants.md §1.5.1',
        description: 'Fixed 60px height, semantic background, left-aligned 16px Inter 800 ALL CAPS title, zero subtitle.',
        specs: {
          height: 60,
          padding: '0 16px',
          fontSize: 16,
          fontWeight: 800,
          borderBottom: '1.5px solid rgba(255,255,255,0.16)'
        },
        tokens: [
          { key: 'themeBg', label: 'Theme Banner Accent', token: '--theme-hex', hex: '#38bdf8' },
          { key: 'titleColor', label: 'Title Text', token: '--clr-text-1', hex: '#ffffff' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="height:${specs.height}px; width:100%; max-width:480px; background:linear-gradient(90deg, ${(tokens.themeBg || '#38bdf8')}66 0%, ${(tokens.themeBg || '#38bdf8')}22 60%, rgba(15,23,42,0.95) 100%); border-bottom:${specs.borderBottom}; border-left:4px solid ${tokens.themeBg || 'var(--primary-tactical, #38bdf8)'}; display:flex; align-items:center; padding:${specs.padding}; box-sizing:border-box; border-radius:8px 8px 0 0;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:34px; height:34px; border-radius:6px; background:${tokens.themeBg || 'var(--primary-tactical, #38bdf8)'}; display:flex; align-items:center; justify-content:center; color:#ffffff;">
                ${getSvgIcon('shield', 18)}
              </div>
              <div style="font-size:${specs.fontSize}px; font-weight:${specs.fontWeight}; color:${tokens.titleColor || '#ffffff'}; text-transform:uppercase; letter-spacing:0.04em;">
                MASTER CURRICULUM CONFIG
              </div>
            </div>
          </div>
        `
      },
      {
        id: 'cta-area',
        name: 'Standardized 60px CTA Area',
        realm: 'Admin Floating Windows & Modals',
        ruleRef: 'ui-invariants.md §1.5.2 & §1.5.4',
        description: 'Fixed 60px height with 36px-40px Ghost-to-Solid buttons. Left-anchored CLOSE and right action.',
        specs: {
          height: 60,
          padding: '0 16px',
          buttonHeight: 38,
          borderTop: '1.5px solid rgba(255,255,255,0.16)'
        },
        tokens: [
          { key: 'ctaPrimary', label: 'Primary CTA Color', token: '--primary-tactical', hex: '#38bdf8' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="height:${specs.height}px; width:100%; max-width:480px; background:#0f172a; border-top:${specs.borderTop}; display:flex; align-items:center; justify-content:space-between; padding:${specs.padding}; box-sizing:border-box; border-radius:0 0 8px 8px;">
            <button type="button" class="btn btn-outline" style="height:${specs.buttonHeight}px; padding:0 18px; font-size:14px; font-weight:800; border-radius:6px; background:transparent; border:1.5px solid #64748b; color:#cbd5e1; cursor:pointer;">
              CLOSE
            </button>
            <button type="button" class="btn btn-primary" style="height:${specs.buttonHeight}px; padding:0 20px; font-size:14px; font-weight:800; border-radius:6px; background:${tokens.ctaPrimary || '#38bdf8'}; border:1px solid ${tokens.ctaPrimary || '#38bdf8'}; color:#0f172a; box-shadow:0 0 14px ${(tokens.ctaPrimary || '#38bdf8')}66; cursor:pointer;">
              SAVE CHANGES
            </button>
          </div>
        `
      }
    ]
  },
  landmarks: {
    label: 'Landmarks & Invariants',
    icon: 'shield',
    components: [
      {
        id: 'sub-panel',
        name: 'Universal 40px Sub Panel (Lower Panel)',
        realm: 'Admin Desktop Workstations (100vh)',
        ruleRef: 'AGENTS.md §2.28 & ui-invariants.md §1.3',
        description: 'Strict 40px height alignment with sidebar footer. Features 30px buttons with exact 5px vertical margin.',
        specs: {
          height: 40,
          buttonHeight: 30,
          padding: '0 12px',
          fontSize: 12
        },
        tokens: [
          { key: 'subPanelBg', label: 'Sub Panel Canvas', token: '--fm-bg-subpanel', hex: '#0f172a' },
          { key: 'btnAccent', label: 'Action Button Color', token: '--quad-a', hex: '#ff2d87' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="height:${specs.height}px; width:100%; max-width:540px; background:${tokens.subPanelBg || '#0f172a'}; border:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:space-between; padding:${specs.padding}; box-sizing:border-box; border-radius:6px;">
            <div style="display:flex; align-items:center; gap:8px; font-size:${specs.fontSize}px; color:#94a3b8; font-weight:600;">
              <span><strong style="color:#f8fafc;">Domain D</strong> · System Architecture Studio</span>
              <span>·</span>
              <span style="color:#00c000; font-weight:700;">● Online</span>
            </div>
            <button type="button" style="height:${specs.buttonHeight}px; line-height:28px; padding:0 12px; font-size:12px; font-weight:700; border-radius:4px; background:${tokens.btnAccent || '#ff2d87'}; border:1px solid ${tokens.btnAccent || '#ff2d87'}; color:#ffffff; cursor:pointer;">
              Edit Mode
            </button>
          </div>
        `
      },
      {
        id: 'locked-banner',
        name: 'Standardized 50px Locked Base Banner',
        realm: 'Universal Footer Landmark',
        ruleRef: 'AGENTS.md §2.32 & ui-invariants.md §1.8',
        description: 'Strict 50px height locked at the base of the viewport. Tactical Blue brand glow and White Slate author tag.',
        specs: {
          height: 50,
          brandSize: 16,
          authorSize: 14,
          bgBanner: '#030a12',
          borderTop: '1px solid rgba(56, 189, 248, 0.25)'
        },
        tokens: [
          { key: 'brandColor', label: 'Brand Tactical Glow', token: '--primary-tactical', hex: '#38bdf8' }
        ],
        renderPreview: (specs, tokens) => `
          <div style="height:${specs.height}px; width:100%; max-width:480px; background:${specs.bgBanner}; border-top:${specs.borderTop}; display:flex; align-items:center; padding:0 16px; box-sizing:border-box; border-radius:6px;">
            <span style="font-size:${specs.brandSize}px; font-weight:900; color:${tokens.brandColor || '#38bdf8'}; letter-spacing:0.05em; text-shadow:0 0 14px ${(tokens.brandColor || '#38bdf8')}66;">
              TopsCore
            </span>
            <span style="font-size:${specs.authorSize}px; font-weight:800; color:#f8fafc; margin-left:6px; letter-spacing:0.02em;">
              by Mr. Top
            </span>
          </div>
        `
      }
    ]
  }
};

// Global Studio State
let activeCategory = 'tables';
let activeComponentId = 'two-tier-header';
let workingSpecs = {};
let workingTokens = {};

export async function renderSystemArchitecture(container) {
  const sb = await getSupabase();
  let serverSettings = {};
  try {
    const { data } = await sb.from('site_settings').select('*');
    serverSettings = Object.fromEntries((data || []).map(r => [r.key, r.value]));
  } catch (e) {
    console.warn('[System Architecture] Failed to fetch server settings:', e);
  }

  // Load active component initial state
  loadComponentState();

  // Primary Studio Scaffold
  container.innerHTML = `
    <div style="height:100%; display:flex; flex-direction:column; gap:10px; box-sizing:border-box; overflow:hidden;">
      
      <!-- TOP CONTROL STRIP (40px) -->
      <div style="height:40px; min-height:40px; display:flex; align-items:center; justify-content:space-between; background:rgba(15,23,42,0.7); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:0 10px; box-sizing:border-box;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="color:var(--quad-d, #38bdf8);">${getSvgIcon('layers', 16)}</span>
          <span style="font-size:14px; font-weight:800; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em;">System Architecture Studio</span>
          <span class="badge" style="background:rgba(56,189,248,0.15); color:var(--quad-d, #38bdf8); font-size:12px; font-weight:700; border:1px solid rgba(56,189,248,0.3); padding:2px 6px; border-radius:4px;">SSOT LABORATORY</span>
        </div>
        
        <!-- Category Pill Tabs -->
        <div style="display:flex; align-items:center; gap:6px;">
          ${Object.entries(ARCH_CATALOG).map(([catKey, cat]) => `
            <button type="button" class="arch-cat-tab btn btn-sm ${catKey === activeCategory ? 'active' : ''}" data-cat="${catKey}" style="height:28px; line-height:26px; padding:0 12px; font-size:12px; font-weight:700; border-radius:4px; cursor:pointer; background:${catKey === activeCategory ? 'var(--quad-d, #38bdf8)' : 'transparent'}; color:${catKey === activeCategory ? '#0f172a' : '#94a3b8'}; border:1px solid ${catKey === activeCategory ? 'var(--quad-d, #38bdf8)' : 'rgba(255,255,255,0.1)'};">
              ${cat.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- MAIN WORKSPACE DUAL-ZONE (Split Horizontal 62% Mockup / 38% Blueprint) -->
      <div style="flex:1 1 0; min-height:0; display:flex; gap:10px; overflow:hidden;">
        
        <!-- ZONE 1: LIVE MOCKUP CANVAS (62%) -->
        <div style="flex:6.2; min-width:340px; display:flex; flex-direction:column; gap:10px; background:rgba(15,23,42,0.45); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; box-sizing:border-box; overflow-y:auto;">
          
          <!-- Sub-Component Selector Pills -->
          <div id="arch-comp-selector" style="display:flex; gap:6px; flex-wrap:wrap; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06);">
            <!-- Rendered dynamically -->
          </div>

          <!-- Active Component Banner -->
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div id="arch-comp-title" style="font-size:16px; font-weight:800; color:#f8fafc; text-transform:uppercase;"></div>
              <div id="arch-comp-desc" style="font-size:12px; color:#94a3b8; margin-top:2px;"></div>
            </div>
            <div id="arch-comp-badges" style="display:flex; gap:6px;"></div>
          </div>

          <!-- Live Mockup Sandbox Stage -->
          <div style="flex:1; min-height:240px; background:#060911; border:1px dashed rgba(255,255,255,0.15); border-radius:8px; padding:24px; display:flex; align-items:center; justify-content:center; position:relative; overflow:auto;">
            <div style="position:absolute; top:8px; left:8px; font-size:12px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">Live Component Preview</div>
            <div id="live-mockup-stage" style="width:100%; display:flex; justify-content:center;">
              <!-- Live preview rendered dynamically -->
            </div>
          </div>

          <!-- Architectural Invariant Notes -->
          <div class="glass-card" style="padding:10px !important; border-left:4px solid var(--quad-d, #38bdf8);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:12px; font-weight:800; color:#f8fafc; text-transform:uppercase;">SSOT Architectural Governance</span>
              <span id="arch-rule-ref" style="font-size:12px; color:var(--quad-d, #38bdf8); font-weight:700;"></span>
            </div>
          </div>

        </div>

        <!-- ZONE 2: BLUEPRINT SPEC & LIVE MODIFIER PANEL (38%) -->
        <div style="flex:3.8; min-width:300px; display:flex; flex-direction:column; gap:10px; background:rgba(15,23,42,0.85); border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px; box-sizing:border-box; overflow-y:auto;">
          
          <div style="display:flex; justify-content:space-between; align-items:center; padding-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="font-size:14px; font-weight:800; color:#38bdf8; text-transform:uppercase; display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('edit', 14)}</span>
              <span>Architectural Blueprint</span>
            </div>
            <button type="button" id="btn-reset-comp" class="btn btn-outline btn-sm" style="height:26px; font-size:12px; padding:0 8px; border-radius:4px;">
              ${getSvgIcon('refresh', 12)} Reset
            </button>
          </div>

          <!-- Dynamic Specification Fields -->
          <div id="blueprint-spec-fields" style="display:flex; flex-direction:column; gap:10px;">
            <!-- Rendered dynamically -->
          </div>

          <!-- Color Tokens Editor -->
          <div style="margin-top:4px;">
            <div style="font-size:12px; font-weight:800; color:#cbd5e1; text-transform:uppercase; margin-bottom:8px;">
              Color &amp; Semantic Tokens
            </div>
            <div id="blueprint-token-fields" style="display:flex; flex-direction:column; gap:8px;">
              <!-- Rendered dynamically -->
            </div>
          </div>

        </div>

      </div>

    </div>
  `;

  // Bind Sub Panel
  if (typeof window.setBottomInfobar === 'function') {
    const leftHtml = `
      <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#94a3b8;font-weight:600;">
        <span><strong style="color:#f8fafc;">Domain D</strong> · System Architecture Studio</span>
        <span>·</span>
        <span style="color:var(--grade-a);font-weight:700;">● Online</span>
      </div>
    `;
    const rightHtml = `
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="btn btn-outline btn-sm" id="btn-restore-ssot" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;border:1px solid rgba(255,255,255,0.2);color:#cbd5e1;background:transparent;cursor:pointer;">
          ${getSvgIcon('refresh', 12)} Reset to SSOT Defaults
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-save-system-arch" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 14px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:6px;background:var(--quad-d,#38bdf8);border:1px solid #38bdf8;color:#0f172a;box-shadow:0 0 10px rgba(56,189,248,0.4);cursor:pointer;">
          ${getSvgIcon('save', 12)} Save &amp; Apply System Architecture
        </button>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
  }

  // Event Listeners
  bindStudioEvents(container);

  // Initial Full Render
  renderActiveView(container);
}

function loadComponentState() {
  const cat = ARCH_CATALOG[activeCategory];
  const comp = cat.components.find(c => c.id === activeComponentId) || cat.components[0];
  activeComponentId = comp.id;
  workingSpecs = { ...comp.specs };
  workingTokens = {};
  (comp.tokens || []).forEach(t => {
    workingTokens[t.key] = t.hex;
  });
}

function renderActiveView(container) {
  const cat = ARCH_CATALOG[activeCategory];
  const comp = cat.components.find(c => c.id === activeComponentId) || cat.components[0];

  // 1. Render Sub-Component Selector Pills
  const selectorEl = container.querySelector('#arch-comp-selector');
  if (selectorEl) {
    selectorEl.innerHTML = cat.components.map(c => `
      <button type="button" class="arch-comp-btn btn btn-sm ${c.id === activeComponentId ? 'active' : ''}" data-id="${c.id}" style="height:26px; line-height:24px; padding:0 10px; font-size:12px; font-weight:700; border-radius:4px; cursor:pointer; background:${c.id === activeComponentId ? 'rgba(56,189,248,0.2)' : 'transparent'}; color:${c.id === activeComponentId ? '#38bdf8' : '#94a3b8'}; border:1px solid ${c.id === activeComponentId ? '#38bdf8' : 'rgba(255,255,255,0.08)'};">
        ${c.name}
      </button>
    `).join('');
  }

  // 2. Render Header details
  const titleEl = container.querySelector('#arch-comp-title');
  const descEl = container.querySelector('#arch-comp-desc');
  const ruleEl = container.querySelector('#arch-rule-ref');
  const badgesEl = container.querySelector('#arch-comp-badges');
  if (titleEl) titleEl.textContent = comp.name;
  if (descEl) descEl.textContent = comp.description;
  if (ruleEl) ruleEl.textContent = comp.ruleRef;
  if (badgesEl) {
    badgesEl.innerHTML = `
      <span class="badge" style="background:#1e293b; color:#cbd5e1; font-size:12px; font-weight:700; border:1px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">${comp.realm}</span>
    `;
  }

  // 3. Render Live Mockup
  updateLiveMockup(container, comp);

  // 4. Render Blueprint Spec Fields
  renderBlueprintSpecs(container, comp);
}

function updateLiveMockup(container, comp) {
  const stageEl = container.querySelector('#live-mockup-stage');
  if (stageEl && typeof comp.renderPreview === 'function') {
    stageEl.innerHTML = comp.renderPreview(workingSpecs, workingTokens);
  }
}

function renderBlueprintSpecs(container, comp) {
  const specFieldsEl = container.querySelector('#blueprint-spec-fields');
  const tokenFieldsEl = container.querySelector('#blueprint-token-fields');

  if (specFieldsEl) {
    specFieldsEl.innerHTML = Object.entries(workingSpecs).map(([key, val]) => {
      const isNum = typeof val === 'number';
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:6px 10px; border-radius:6px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:#f8fafc; text-transform:capitalize;">${key.replace(/([A-Z])/g, ' $1')}</div>
            <div style="font-size:12px; color:#64748b;">${isNum ? 'Unit: px' : 'CSS Value'}</div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="${isNum ? 'number' : 'text'}" class="form-control arch-spec-input" data-key="${key}" value="${val}" style="width:${isNum ? '64px' : '140px'}; height:28px; font-size:12px; font-weight:700; text-align:${isNum ? 'center' : 'left'}; padding:0 6px; background:#090d16; border:1px solid rgba(255,255,255,0.15); color:#ffffff; border-radius:4px;">
            ${isNum ? '<span style="font-size:12px; color:#94a3b8;">px</span>' : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  if (tokenFieldsEl) {
    tokenFieldsEl.innerHTML = (comp.tokens || []).map(t => {
      const currentHex = workingTokens[t.key] || t.hex;
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:6px 10px; border-radius:6px;">
          <div>
            <div style="font-size:12px; font-weight:700; color:#f8fafc;">${t.label}</div>
            <div style="font-size:12px; color:#38bdf8; font-family:monospace;">${t.token}</div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <input type="color" class="arch-token-color" data-key="${t.key}" value="${currentHex.substring(0, 7)}" style="width:28px; height:28px; border:none; border-radius:4px; cursor:pointer; background:transparent;">
            <input type="text" class="form-control arch-token-hex" data-key="${t.key}" value="${currentHex}" style="width:80px; height:28px; font-size:12px; font-weight:700; font-family:monospace; text-align:center; background:#090d16; border:1px solid rgba(255,255,255,0.15); color:#ffffff; border-radius:4px;">
          </div>
        </div>
      `;
    }).join('');
  }
}

function bindStudioEvents(container) {
  // 1. Category Tabs Switching
  container.querySelectorAll('.arch-cat-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const catKey = e.currentTarget.dataset.cat;
      if (catKey && catKey !== activeCategory) {
        activeCategory = catKey;
        loadComponentState();
        container.querySelectorAll('.arch-cat-tab').forEach(b => {
          const isActive = b.dataset.cat === activeCategory;
          b.style.background = isActive ? 'var(--quad-d, #38bdf8)' : 'transparent';
          b.style.color = isActive ? '#0f172a' : '#94a3b8';
          b.style.borderColor = isActive ? 'var(--quad-d, #38bdf8)' : 'rgba(255,255,255,0.1)';
        });
        renderActiveView(container);
      }
    });
  });

  // 2. Sub-Component Switching
  container.addEventListener('click', (e) => {
    const compBtn = e.target.closest('.arch-comp-btn');
    if (compBtn) {
      const compId = compBtn.dataset.id;
      if (compId && compId !== activeComponentId) {
        activeComponentId = compId;
        loadComponentState();
        renderActiveView(container);
      }
    }
  });

  // 3. Live Blueprint Input Listeners
  container.addEventListener('input', (e) => {
    const specInput = e.target.closest('.arch-spec-input');
    if (specInput) {
      const key = specInput.dataset.key;
      const isNum = typeof workingSpecs[key] === 'number';
      workingSpecs[key] = isNum ? parseFloat(specInput.value) || 0 : specInput.value;
      const cat = ARCH_CATALOG[activeCategory];
      const comp = cat.components.find(c => c.id === activeComponentId);
      updateLiveMockup(container, comp);
    }

    const colorPicker = e.target.closest('.arch-token-color');
    if (colorPicker) {
      const key = colorPicker.dataset.key;
      workingTokens[key] = colorPicker.value;
      const hexInput = container.querySelector(`.arch-token-hex[data-key="${key}"]`);
      if (hexInput) hexInput.value = colorPicker.value;
      const cat = ARCH_CATALOG[activeCategory];
      const comp = cat.components.find(c => c.id === activeComponentId);
      updateLiveMockup(container, comp);
    }

    const hexInput = e.target.closest('.arch-token-hex');
    if (hexInput) {
      const key = hexInput.dataset.key;
      workingTokens[key] = hexInput.value;
      const colorPicker = container.querySelector(`.arch-token-color[data-key="${key}"]`);
      if (colorPicker && hexInput.value.startsWith('#') && hexInput.value.length === 7) {
        colorPicker.value = hexInput.value;
      }
      const cat = ARCH_CATALOG[activeCategory];
      const comp = cat.components.find(c => c.id === activeComponentId);
      updateLiveMockup(container, comp);
    }
  });

  // 4. Reset Active Component
  container.addEventListener('click', (e) => {
    if (e.target.closest('#btn-reset-comp')) {
      loadComponentState();
      renderActiveView(container);
      showToast('Component reset to canonical SSOT specs.', 'info');
    }
  });

  // 5. Reset All Defaults (Sub Panel)
  const btnRestore = document.getElementById('btn-restore-ssot');
  if (btnRestore) {
    btnRestore.addEventListener('click', () => {
      localStorage.removeItem('topscore_interface_system');
      applyGlobalInterfaceSystem(DEFAULT_INTERFACE_SYSTEM);
      loadComponentState();
      renderActiveView(container);
      showToast('Restored all system architecture tokens to SSOT defaults.', 'success');
    });
  }

  // 6. Save & Apply System Architecture (Sub Panel)
  const btnSave = document.getElementById('btn-save-system-arch');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      try {
        btnSave.disabled = true;
        btnSave.innerHTML = `${getSvgIcon('refresh', 12)} Applying...`;

        const payload = {
          colors: { ...DEFAULT_INTERFACE_SYSTEM.colors, ...workingTokens },
          typography: { ...DEFAULT_INTERFACE_SYSTEM.typography },
          surface: { ...DEFAULT_INTERFACE_SYSTEM.surface }
        };

        // 1. Apply to live runtime document :root
        applyGlobalInterfaceSystem(payload);
        localStorage.setItem('topscore_interface_system', JSON.stringify(payload));

        // 2. Persist to Supabase site_settings
        const sb = await getSupabase();
        await sb.from('site_settings').upsert({
          key: 'interface_system_settings',
          value: JSON.stringify(payload),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        showToast('System Architecture persisted and applied globally!', 'success');
      } catch (err) {
        console.error('[System Architecture] Save failed:', err);
        showToast('Saved locally. (Server sync failed: ' + (err.message || 'Network') + ')', 'warning');
      } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = `${getSvgIcon('save', 12)} Save &amp; Apply System Architecture`;
      }
    });
  }
}
