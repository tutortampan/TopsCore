import { chromium } from '@playwright/test';
import fs from 'fs';

async function audit() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const auditData = {};

  // 1. ADMIN.HTML
  console.log('Auditing admin.html...');
  await page.goto('http://localhost:5500/admin.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  auditData['admin'] = await page.evaluate(() => {
    function getDetails(el) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        height: rect.height,
        offsetHeight: el.offsetHeight,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        margin: cs.margin,
        boxSizing: cs.boxSizing
      };
    }

    return {
      topbar: getDetails(document.querySelector('.admin-topbar')),
      topbarTitle: getDetails(document.querySelector('.admin-topbar h1, .admin-topbar .brand, .admin-topbar-title')),
      sidebarHeader: getDetails(document.querySelector('.sidebar-header')),
      sidebarFooter: getDetails(document.querySelector('.sidebar-footer')),
      lowerPanel: getDetails(document.querySelector('.lower-panel, #admin-lower-panel, #roster-lower-panel, .panel-lower')),
      bottomBanner: getDetails(document.querySelector('#bottom-ad-banner, .topscore-locked-banner')),
      
      // Subheaders / Subnavs / Tabs in Admin
      domainSubnav: getDetails(document.querySelector('.domain-subnav, .admin-subnav, .sub-nav')),
      workspaceHeader: getDetails(document.querySelector('.workspace-header, .page-header, .module-header')),
      toolbar: getDetails(document.querySelector('.admin-toolbar, .datagrid-toolbar, .student-roster-toolbar')),
      tabBar: getDetails(document.querySelector('.tabs, .tab-bar, .nav-tabs, .tab-nav')),
      
      // Table headers if present
      tableThead: getDetails(document.querySelector('thead')),
      tableSuperHeader: getDetails(document.querySelector('thead tr.super-header-row, thead tr:first-child th[colspan]')),
      tableSubHeader: getDetails(document.querySelector('thead tr.sub-header-row, thead tr:nth-child(2) th')),
      tableSingleHeader: getDetails(document.querySelector('thead tr:only-child th, thead th')),
      tableTfoot: getDetails(document.querySelector('tfoot')),
      tableTfootTd: getDetails(document.querySelector('tfoot td, tfoot tr'))
    };
  });

  // Switch tabs in admin to see more tables / toolbars (e.g., student roster, class hub, vocab vault)
  console.log('Auditing admin sub-views...');
  const subviews = {};

  // Try clicking Students (Domain B)
  try {
    const studentBtn = await page.$('[data-tab="students"], #nav-students, [data-domain="B"]');
    if (studentBtn) {
      await studentBtn.click();
      await page.waitForTimeout(500);
      subviews['students'] = await page.evaluate(() => {
        function getDetails(el) {
          if (!el) return null;
          const cs = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            tag: el.tagName.toLowerCase(),
            id: el.id || null,
            className: el.className || null,
            height: rect.height,
            offsetHeight: el.offsetHeight,
            fontSize: cs.fontSize,
            fontFamily: cs.fontFamily,
            fontWeight: cs.fontWeight,
            lineHeight: cs.lineHeight,
            padding: cs.padding
          };
        }
        return {
          toolbar: getDetails(document.querySelector('.student-roster-toolbar, .admin-toolbar')),
          tableTheadTh: getDetails(document.querySelector('#student-roster-table thead th, thead th')),
          tableTfoot: getDetails(document.querySelector('#student-roster-table tfoot, tfoot')),
          tableTfootTd: getDetails(document.querySelector('#student-roster-table tfoot td, tfoot td')),
          lowerPanel: getDetails(document.querySelector('#roster-lower-panel, .lower-panel'))
        };
      });
    }
  } catch (e) {
    console.log('Error inspecting student subview:', e.message);
  }

  // 2. DASHBOARD.HTML
  console.log('Auditing dashboard.html...');
  await page.goto('http://localhost:5500/dashboard.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  auditData['dashboard'] = await page.evaluate(() => {
    function getDetails(el) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        height: rect.height,
        offsetHeight: el.offsetHeight,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        margin: cs.margin
      };
    }

    return {
      topbar: getDetails(document.querySelector('.student-topbar, .dashboard-header, header, .nav-bar')),
      topbarBrand: getDetails(document.querySelector('.student-topbar .brand, header h1, .brand-logo')),
      heroSection: getDetails(document.querySelector('.dashboard-hero, .welcome-banner, #hero-card')),
      subnav: getDetails(document.querySelector('.dashboard-tabs, .tab-bar, .sub-header, .filter-bar')),
      cardHeader: getDetails(document.querySelector('.card-header, .section-header, .test-card-header')),
      footer: getDetails(document.querySelector('footer, .dashboard-footer, #bottom-ad-banner, .locked-banner'))
    };
  });

  // 3. TEST.HTML
  console.log('Auditing test.html...');
  await page.goto('http://localhost:5500/test.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  auditData['test'] = await page.evaluate(() => {
    function getDetails(el) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        height: rect.height,
        offsetHeight: el.offsetHeight,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        margin: cs.margin
      };
    }

    return {
      testHeader: getDetails(document.querySelector('.test-header, header, #test-topbar')),
      testTitle: getDetails(document.querySelector('.test-header h1, #test-title, .test-name')),
      timerDisplay: getDetails(document.querySelector('.timer-container, #timer, .test-timer')),
      subHeader: getDetails(document.querySelector('.question-header, .sub-header, .test-sub-bar, .progress-bar-container')),
      testFooter: getDetails(document.querySelector('.test-footer, footer, #test-action-bar, .test-bottom-bar')),
      submitButton: getDetails(document.querySelector('#submit-test-btn, .btn-submit, #btn-finish'))
    };
  });

  // 4. RESULT.HTML
  console.log('Auditing result.html...');
  await page.goto('http://localhost:5500/result.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  auditData['result'] = await page.evaluate(() => {
    function getDetails(el) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        height: rect.height,
        offsetHeight: el.offsetHeight,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        margin: cs.margin
      };
    }

    return {
      resultHeader: getDetails(document.querySelector('.result-header, header, .nav-header')),
      heroCard: getDetails(document.querySelector('.result-hero, #hero-card, .score-banner')),
      subHeader: getDetails(document.querySelector('.section-header, .breakdown-header, h2, h3')),
      resultFooter: getDetails(document.querySelector('footer, .result-footer, .action-footer, #bottom-ad-banner'))
    };
  });

  // 5. INDEX.HTML (Student Gate)
  console.log('Auditing index.html...');
  await page.goto('http://localhost:5500/index.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  auditData['index'] = await page.evaluate(() => {
    function getDetails(el) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        height: rect.height,
        offsetHeight: el.offsetHeight,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        margin: cs.margin
      };
    }

    return {
      gateHeader: getDetails(document.querySelector('.login-header, header, .brand-header, .auth-header')),
      gateTitle: getDetails(document.querySelector('header h1, .auth-title, .brand-title')),
      stepHeader: getDetails(document.querySelector('.cascade-step-header, .step-header, h2')),
      footer: getDetails(document.querySelector('footer, .auth-footer, .login-footer'))
    };
  });

  // 6. CONVERSATION.HTML
  console.log('Auditing conversation.html...');
  await page.goto('http://localhost:5500/conversation.html');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  auditData['conversation'] = await page.evaluate(() => {
    function getDetails(el) {
      if (!el) return null;
      const cs = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        height: rect.height,
        offsetHeight: el.offsetHeight,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        padding: cs.padding,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        margin: cs.margin
      };
    }

    return {
      header: getDetails(document.querySelector('header, .call-header, .room-header')),
      subHeader: getDetails(document.querySelector('.call-info-bar, .sub-header, .topic-banner')),
      footer: getDetails(document.querySelector('footer, .call-controls, .action-bar, .bottom-bar'))
    };
  });

  // Save results
  auditData['subviews'] = subviews;
  fs.writeFileSync('scripts/audit_rooms_live.json', JSON.stringify(auditData, null, 2), 'utf8');
  console.log('Live audit finished and saved to scripts/audit_rooms_live.json');

  await browser.close();
}

audit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
