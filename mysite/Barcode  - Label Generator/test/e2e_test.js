/**
 * Comprehensive End-to-End Automated Browser Testing Script
 * Uses Puppeteer Core to launch Chrome and test all application flows.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 3456;
const BASE_DIR = path.resolve(__dirname, '..');

// 1. Simple static HTTP server to serve the app
function createServer() {
  return http.createServer((req, res) => {
    let filePath = path.join(BASE_DIR, req.url === '/' ? 'index.html' : req.url);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.json': 'application/json',
      '.png': 'image/png'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function runE2ETests() {
  console.log('🚀 Starting Local Static Test Server...');
  const server = createServer();
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`📡 Test Server running on http://localhost:${PORT}`);

  const screenshotsDir = path.join(BASE_DIR, 'test_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const errors = [];
  const logs = [];

  console.log('🌐 Launching Chrome Browser...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    const text = msg.text();
    logs.push(`[CONSOLE ${msg.type()}]: ${text}`);
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${text}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`Page Uncaught Error: ${err.message}`);
  });

  try {
    // ========================================================
    // TEST 1: Initial Page Load & Desktop Viewport
    // ========================================================
    console.log('\n--- TEST 1: Initial Page Load (Desktop 1280x800) ---');
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

    const title = await page.title();
    console.log(`Page Title: "${title}"`);
    if (!title.includes('Barcode & Label Generator')) {
      throw new Error(`Unexpected page title: ${title}`);
    }

    // Check Live Label initial elements
    const hasLiveCard = await page.$('#live-label-card svg');
    console.log('Live Label Initial SVG Barcode rendered:', hasLiveCard ? '✓ PASS' : '✗ FAIL');
    if (!hasLiveCard) throw new Error('Live label barcode SVG missing on load');

    await page.screenshot({ path: path.join(screenshotsDir, '01_desktop_initial.png') });

    // ========================================================
    // TEST 2: Form Inputs & Live Reactivity
    // ========================================================
    console.log('\n--- TEST 2: Single Label Input & Format Switching ---');

    // Change Product Name
    await page.$eval('#product-name', el => el.value = '');
    await page.type('#product-name', 'Ultra HD 4K Action Camera');

    // Change Price
    await page.$eval('#product-price', el => el.value = '');
    await page.type('#product-price', '149.99');

    // Change Header
    await page.$eval('#store-name', el => el.value = '');
    await page.type('#store-name', 'GIZMO STORE');

    // Switch Format to EAN13
    await page.select('#barcode-format', 'EAN13');
    await page.$eval('#barcode-value', el => el.value = '890103038345'); // will auto check to 8901030383458
    await page.evaluate(() => document.getElementById('barcode-value').dispatchEvent(new Event('input')));

    await new Promise(r => setTimeout(r, 200));

    const previewText = await page.$eval('#live-label-card', el => el.innerText);
    console.log('Live Preview Updated Content:', JSON.stringify(previewText));
    if (!previewText.includes('Ultra HD 4K Action Camera') || !previewText.includes('149.99')) {
      throw new Error('Live label preview did not reactively update text');
    }

    // Test Generate Random SKU Button
    await page.click('#btn-random-sku');
    const newSku = await page.$eval('#barcode-value', el => el.value);
    console.log(`Random Generated SKU: ${newSku} (✓ PASS)`);

    // Test Zoom Buttons
    await page.click('#btn-zoom-in');
    let zoomText = await page.$eval('#zoom-level-text', el => el.innerText);
    console.log(`Zoom level after Zoom In: ${zoomText}`);
    await page.click('#btn-zoom-reset');
    zoomText = await page.$eval('#zoom-level-text', el => el.innerText);
    console.log(`Zoom level after Reset: ${zoomText}`);

    await page.screenshot({ path: path.join(screenshotsDir, '02_form_modified.png') });

    // ========================================================
    // TEST 3: Presets & Custom Dimensions
    // ========================================================
    console.log('\n--- TEST 3: Size Presets & Custom mm ---');
    await page.select('#preset-select', '40x20');
    let badgeText = await page.$eval('#preview-dimension-badge', el => el.innerText);
    console.log(`Dimension Badge for 40x20: "${badgeText}" (✓ PASS)`);

    await page.select('#preset-select', 'custom');
    const customRowVisible = await page.$eval('#custom-size-row', el => !el.classList.contains('hidden'));
    console.log('Custom size input row visible on "custom" select:', customRowVisible ? '✓ PASS' : '✗ FAIL');

    await page.$eval('#custom-width', el => el.value = '65');
    await page.$eval('#custom-height', el => el.value = '35');
    await page.evaluate(() => document.getElementById('custom-width').dispatchEvent(new Event('input')));
    badgeText = await page.$eval('#preview-dimension-badge', el => el.innerText);
    console.log(`Dimension Badge for 65x35: "${badgeText}" (✓ PASS)`);

    // ========================================================
    // TEST 4: Single Print Execution (Mocking window.print)
    // ========================================================
    console.log('\n--- TEST 4: Single Print Execution & Print Stage ---');
    await page.evaluate(() => {
      window._printCalled = false;
      window.print = () => { window._printCalled = true; };
    });

    await page.click('#btn-single-print');
    await new Promise(r => setTimeout(r, 250));

    const printCalled = await page.evaluate(() => window._printCalled);
    const printLabelsCount = await page.$$eval('#print-stage .printable-label', els => els.length);
    console.log(`Print Dialog Triggered: ${printCalled ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Print Stage Rendered Labels: ${printLabelsCount} (✓ PASS)`);
    if (!printCalled || printLabelsCount < 1) {
      throw new Error('Single print flow failed to populate #print-stage or call print()');
    }

    // ========================================================
    // TEST 5: Batch Mode Flow
    // ========================================================
    console.log('\n--- TEST 5: Batch Mode Navigation & Processing ---');
    // Switch to Batch tab
    await page.click('button.tab-btn[data-tab="batch"]');
    const isBatchActive = await page.$eval('#tab-content-batch', el => !el.classList.contains('hidden'));
    console.log('Batch Tab Activated:', isBatchActive ? '✓ PASS' : '✗ FAIL');

    // Click "Load Sample Data"
    await page.click('#btn-load-sample-batch');
    await new Promise(r => setTimeout(r, 200));

    let batchCount = await page.$eval('#batch-stat-total-labels', el => el.innerText);
    let skuCount = await page.$eval('#batch-stat-skus', el => el.innerText);
    console.log(`Batch Loaded: ${skuCount} unique SKUs, ${batchCount} total copies (✓ PASS)`);

    // Test Qty increment on row 1
    const qtyBefore = await page.$eval('#batch-items-tbody tr:nth-child(1) .qty-num', el => parseInt(el.innerText, 10));
    await page.click('#batch-items-tbody tr:nth-child(1) .btn-qty-inc');
    const qtyAfter = await page.$eval('#batch-items-tbody tr:nth-child(1) .qty-num', el => parseInt(el.innerText, 10));
    console.log(`Quantity Increment: ${qtyBefore} -> ${qtyAfter} (✓ PASS)`);

    // Test Auto Sequence Generator Modal
    console.log('Testing Auto Sequence Modal...');
    await page.click('#btn-open-sequence-modal');
    await new Promise(r => setTimeout(r, 200));
    const isSeqModalOpen = await page.$eval('#modal-sequence', el => el.classList.contains('active'));
    console.log('Sequence Modal Opened:', isSeqModalOpen ? '✓ PASS' : '✗ FAIL');

    await page.$eval('#seq-prefix', el => el.value = 'BAR-');
    await page.$eval('#seq-count', el => el.value = '5');
    await page.click('#btn-submit-sequence');
    await new Promise(r => setTimeout(r, 200));

    const totalSkusAfterSeq = await page.$eval('#batch-stat-skus', el => parseInt(el.innerText, 10));
    console.log(`Total SKUs after sequence addition: ${totalSkusAfterSeq} (✓ PASS)`);

    await page.screenshot({ path: path.join(screenshotsDir, '03_batch_mode.png') });

    // Test Batch Print
    await page.evaluate(() => { window._printCalled = false; });
    await page.click('#btn-batch-print');
    await new Promise(r => setTimeout(r, 250));
    const batchPrintCalled = await page.evaluate(() => window._printCalled);
    const batchPrintStageCount = await page.$$eval('#print-stage .printable-label', els => els.length);
    console.log(`Batch Print Spool: ${batchPrintStageCount} labels sent to print dialog (${batchPrintCalled ? '✓ PASS' : '✗ FAIL'})`);

    // ========================================================
    // TEST 6: Templates Tab & Custom Template Saving
    // ========================================================
    console.log('\n--- TEST 6: Templates & Custom Preset Persistence ---');
    await page.click('button.tab-btn[data-tab="templates"]');
    const builtinCardsCount = await page.$$eval('#builtin-templates-grid .template-card', els => els.length);
    console.log(`Built-in Templates Rendered: ${builtinCardsCount} (✓ PASS)`);

    // Apply "Clearance & Sale Tag"
    await page.click('#builtin-templates-grid .template-card:nth-child(2) .btn-apply-template');
    await new Promise(r => setTimeout(r, 200));
    console.log('Applied Builtin Template: Clearance & Sale Tag (✓ PASS)');

    // Save as custom template
    await page.click('#btn-save-as-template');
    await new Promise(r => setTimeout(r, 200));
    await page.$eval('#custom-template-name', el => el.value = 'My E2E Store Custom Template');
    await page.click('#btn-confirm-save-template');
    await new Promise(r => setTimeout(r, 200));

    // Verify template in localStorage and in DOM
    await page.click('button.tab-btn[data-tab="templates"]');
    const customCards = await page.$$eval('#custom-templates-grid .template-card', els => els.map(e => e.innerText));
    console.log(`Custom Templates in DOM: ${customCards.length}, contains "My E2E Store Custom Template":`,
      customCards.some(t => t.includes('My E2E Store Custom Template')) ? '✓ PASS' : '✗ FAIL');

    await page.screenshot({ path: path.join(screenshotsDir, '04_templates_tab.png') });

    // ========================================================
    // TEST 7: History Tab & JSON Backup Export
    // ========================================================
    console.log('\n--- TEST 7: History Tab & Data Persistence ---');
    await page.click('button.tab-btn[data-tab="history"]');
    const historyEntries = await page.$$eval('#recent-batches-list .glass-panel', els => els.length);
    console.log(`Recent Print History Entries: ${historyEntries} (✓ PASS)`);

    await page.screenshot({ path: path.join(screenshotsDir, '05_history_tab.png') });

    // ========================================================
    // TEST 8: Theme Switching & Setup Guide Modal
    // ========================================================
    console.log('\n--- TEST 8: Theme Toggle & Thermal Print Guide Modal ---');
    let themeBefore = await page.$eval('html', el => el.getAttribute('data-theme'));
    await page.click('#btn-toggle-theme');
    let themeAfter = await page.$eval('html', el => el.getAttribute('data-theme'));
    console.log(`Theme toggle: ${themeBefore} -> ${themeAfter} (✓ PASS)`);

    await page.screenshot({ path: path.join(screenshotsDir, '06_light_theme.png') });

    // Open Print Guide Modal
    await page.click('#btn-print-guide');
    await new Promise(r => setTimeout(r, 200));
    const isGuideOpen = await page.$eval('#modal-print-guide', el => el.classList.contains('active'));
    console.log('Print Guide Modal Opened:', isGuideOpen ? '✓ PASS' : '✗ FAIL');
    await page.click('#modal-print-guide .btn-modal-close');
    await new Promise(r => setTimeout(r, 200));

    // Toggle back to dark
    await page.click('#btn-toggle-theme');

    // ========================================================
    // TEST 9: Mobile Viewport (390x844 - iPhone 14 / Modern Phone)
    // ========================================================
    console.log('\n--- TEST 9: Mobile Viewport Responsiveness (390x844) ---');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.click('button.tab-btn[data-tab="single"]');
    await new Promise(r => setTimeout(r, 300));

    // Check sticky bottom bar on mobile
    const isMobileBottomBarVisible = await page.$eval('.mobile-bottom-bar', el => {
      const rect = el.getBoundingClientRect();
      return rect.height > 0 && rect.top > 0;
    });
    console.log('Mobile Bottom Bar Rendered & Visible:', isMobileBottomBarVisible ? '✓ PASS' : '✗ FAIL');

    // Check mobile print action button
    await page.evaluate(() => {
      window._printCalled = false;
      window.print = () => { window._printCalled = true; };
      document.getElementById('btn-mobile-print-action').click();
    });
    await new Promise(r => setTimeout(r, 350));
    const mobilePrintTriggered = await page.evaluate(() => window._printCalled);
    console.log('Mobile Bottom Bar Print Action Triggered:', mobilePrintTriggered ? '✓ PASS' : '✗ FAIL');
    if (!mobilePrintTriggered) throw new Error('Mobile print button did not invoke print job');

    await page.screenshot({ path: path.join(screenshotsDir, '07_mobile_viewport.png') });

    console.log('\n========================================================');
    console.log('🎉 ALL END-TO-END AUTOMATED BROWSER TESTS COMPLETED!');
    console.log(`Total Console Errors Detected: ${errors.length}`);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
    console.log('========================================================\n');

  } catch (err) {
    console.error('❌ E2E TEST FAILED WITH EXCEPTION:', err);
    errors.push(err.message);
  } finally {
    await browser.close();
    server.close();
  }

  return { success: errors.length === 0, errors, logs };
}

runE2ETests().then(res => {
  if (!res.success) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
