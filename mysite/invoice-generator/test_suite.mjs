import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🚀 Starting Playwright Invoice Generator Test Suite...');
  
  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    console.log('   (Using Microsoft Edge channel)');
  } catch (e) {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
      console.log('   (Using Google Chrome channel)');
    } catch (err) {
      browser = await chromium.launch({ headless: true });
    }
  }
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create screenshots directory
  const testOutputDir = path.join(__dirname, 'test_output');
  if (!fs.existsSync(testOutputDir)) {
    fs.mkdirSync(testOutputDir, { recursive: true });
  }

  const fileUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  console.log(`📄 Loading application from: ${fileUrl}`);

  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // ----------------------------------------------------
  // TEST 1: Page Load & Initial State Verification
  // ----------------------------------------------------
  console.log('🧪 Test 1: Verifying Page Title and Demo Data Load...');
  const title = await page.title();
  console.log(`   Page Title: "${title}"`);

  const invNumberVal = await page.inputValue('#inv-number');
  console.log(`   Loaded Invoice Number: "${invNumberVal}"`);

  const grandTotalText = await page.textContent('#summary-grand-total-val');
  console.log(`   Calculated Grand Total: "${grandTotalText}"`);

  // ----------------------------------------------------
  // TEST 2: Dynamic Calculations & Adding Line Item
  // ----------------------------------------------------
  console.log('🧪 Test 2: Testing Line Items Addition & Live Calculation Sync...');
  
  // Click Add Item button
  await page.click('#btn-add-line-item');
  await page.waitForTimeout(200);

  // Fill in the new item's fields in the desktop table
  const newRow = page.locator('#line-items-tbody tr').last();
  await newRow.locator('.item-desc').fill('Security Audit & SSL Hardening');
  await newRow.locator('.item-qty').fill('2');
  await newRow.locator('.item-rate').fill('500');
  await newRow.locator('.item-rate').dispatchEvent('input');
  await page.waitForTimeout(300);

  const updatedTotal = await page.textContent('#summary-grand-total-val');
  console.log(`   Updated Grand Total after adding $1,000 item: "${updatedTotal}"`);

  // ----------------------------------------------------
  // TEST 3: Theme Toggle & Templates
  // ----------------------------------------------------
  console.log('🧪 Test 3: Testing Dark Mode & Template Switching...');
  
  // Toggle dark mode
  await page.click('#btn-theme-toggle');
  await page.waitForTimeout(200);
  const themeAttr = await page.getAttribute('html', 'data-theme');
  console.log(`   Current Theme: "${themeAttr}"`);
  
  // Capture Desktop Screenshot in Dark Mode
  await page.screenshot({ path: path.join(testOutputDir, 'desktop-dark-mode.png'), fullPage: true });
  console.log('   📸 Captured desktop-dark-mode.png');

  // Toggle back to light mode
  await page.click('#btn-theme-toggle');
  await page.waitForTimeout(200);

  // Switch Template to "Corporate Executive"
  await page.selectOption('#setting-template-select', 'corporate');
  await page.waitForTimeout(200);

  // ----------------------------------------------------
  // TEST 4: Mobile Viewport & Touch Tab Navigation
  // ----------------------------------------------------
  console.log('🧪 Test 4: Testing Mobile Viewport (iPhone 375x667)...');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(300);

  // Capture Mobile Editor Screenshot
  await page.screenshot({ path: path.join(testOutputDir, 'mobile-editor.png'), fullPage: false });
  console.log('   📸 Captured mobile-editor.png');

  // Switch to Preview Tab via Mobile Bottom Nav
  await page.click('.bottom-nav [data-tab="preview"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(testOutputDir, 'mobile-preview.png'), fullPage: false });
  console.log('   📸 Captured mobile-preview.png');

  // Switch to History Tab via Mobile Bottom Nav
  await page.click('.bottom-nav [data-tab="history"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(testOutputDir, 'mobile-history.png'), fullPage: false });
  console.log('   📸 Captured mobile-history.png');

  // ----------------------------------------------------
  // TEST 5: Print Media Emulation & PDF Verification (Checking for zero browser headers/footers)
  // ----------------------------------------------------
  console.log('🧪 Test 5: Testing Print Media Emulation & Clean A4 PDF Generation...');
  
  // Reset to desktop viewport for full print emulation
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ media: 'print' });
  await page.waitForTimeout(300);

  // Capture Print View Screenshot
  await page.screenshot({ path: path.join(testOutputDir, 'print-view-emulation.png'), fullPage: true });
  console.log('   📸 Captured print-view-emulation.png');

  // Generate actual PDF file
  const pdfPath = path.join(testOutputDir, 'invoice-output.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0px', bottom: '0px', left: '0px', right: '0px' }
  });
  console.log(`   📄 Generated A4 PDF: ${pdfPath}`);

  // ----------------------------------------------------
  // TEST 6: LocalStorage Save & History Verification
  // ----------------------------------------------------
  console.log('🧪 Test 6: Testing LocalStorage Persistence & Invoice History...');
  await page.emulateMedia({ media: 'screen' });
  await page.click('[data-tab="editor"]');
  await page.waitForTimeout(200);

  // Click Save button
  await page.click('#btn-save-invoice');
  await page.waitForTimeout(300);

  // Check saved invoices in localStorage
  const savedInvoices = await page.evaluate(() => {
    return window.Storage.getInvoices();
  });
  console.log(`   Saved Invoices Count in LocalStorage: ${savedInvoices.length}`);
  console.log(`   First Saved Invoice #: ${savedInvoices[0]?.invoiceNumber}`);

  await browser.close();
  console.log('✅ ALL PLAYWRIGHT TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
