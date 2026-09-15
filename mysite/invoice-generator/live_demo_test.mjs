import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLiveVisibleTest() {
  console.log('🌐 Opening visible browser on your screen for Live Test...');

  // Launch browser with headless: false so the window opens visually on user's desktop!
  const browser = await chromium.launch({
    channel: 'msedge', // or chrome
    headless: false,   // VISIBLE UI WINDOW
    slowMo: 800        // Slow down operations by 800ms so user can watch every action
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 }
  });
  const page = await context.newPage();

  const fileUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  console.log(`📄 Navigating to: ${fileUrl}`);
  await page.goto(fileUrl);
  await page.waitForTimeout(1500);

  // STEP 1: Load Demo Invoice
  console.log('👉 Step 1: Clicking Load Demo Invoice');
  await page.click('#btn-load-demo');
  await page.waitForTimeout(1500);

  // STEP 2: Add a new line item live
  console.log('👉 Step 2: Adding a new line item');
  await page.click('#btn-add-line-item');
  await page.waitForTimeout(1000);

  const lastRow = page.locator('#line-items-tbody tr').last();
  await lastRow.locator('.item-desc').fill('Mobile App UI/UX Redesign');
  await page.waitForTimeout(600);
  await lastRow.locator('.item-qty').fill('10');
  await page.waitForTimeout(600);
  await lastRow.locator('.item-rate').fill('120');
  await lastRow.locator('.item-rate').dispatchEvent('input');
  await page.waitForTimeout(1500);

  // STEP 3: Switch Theme to Dark Mode
  console.log('👉 Step 3: Toggling Dark Mode');
  await page.click('#btn-theme-toggle');
  await page.waitForTimeout(2000);

  // STEP 4: Switch Accent Color to Emerald Green
  console.log('👉 Step 4: Switching Accent Color to Emerald');
  await page.click('.color-swatch[data-accent="emerald"]');
  await page.waitForTimeout(1500);

  // STEP 5: Switch Template to Creative Studio
  console.log('👉 Step 5: Changing Invoice Template to Creative Studio');
  await page.selectOption('#setting-template-select', 'creative');
  await page.waitForTimeout(2000);

  // STEP 6: Switch to Mobile View to show responsive layout
  console.log('👉 Step 6: Testing Mobile Viewport (375x667)');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(1500);

  // Click on Preview tab in mobile navigation
  console.log('👉 Step 7: Mobile Bottom Navigation -> Preview');
  await page.click('.bottom-nav [data-tab="preview"]');
  await page.waitForTimeout(2000);

  // Click on History tab in mobile navigation
  console.log('👉 Step 8: Mobile Bottom Navigation -> History');
  await page.click('.bottom-nav [data-tab="history"]');
  await page.waitForTimeout(2000);

  // Switch back to desktop view
  console.log('👉 Step 9: Returning to Desktop Split View');
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.click('.desktop-tab-btn[data-tab="editor"]');
  await page.waitForTimeout(1500);

  // STEP 7: Save Invoice
  console.log('👉 Step 10: Saving Invoice to LocalStorage');
  await page.click('#btn-save-invoice');
  await page.waitForTimeout(2000);

  console.log('🎉 Live visible demonstration completed!');
  await page.waitForTimeout(2000);
  await browser.close();
}

runLiveVisibleTest().catch(async (err) => {
  console.log('Trying with Chrome channel if Edge fails...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 800
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 850 }
  });
  const page = await context.newPage();
  const fileUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(fileUrl);
  await page.waitForTimeout(4000);
  await browser.close();
});
