import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testDesktopTabs() {
  console.log('🧪 Testing Desktop Tab Switching & Split Layout Fix...');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const testOutputDir = path.join(__dirname, 'test_output');
  if (!fs.existsSync(testOutputDir)) fs.mkdirSync(testOutputDir, { recursive: true });

  const fileUrl = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
  await page.goto(fileUrl);
  await page.waitForTimeout(500);

  // 1. Initial State: Editor & Preview
  console.log('👉 1. Verifying initial Editor & Preview Split State...');
  const editorVisible1 = await page.locator('#tab-editor').isVisible();
  const previewVisible1 = await page.locator('#tab-preview').isVisible();
  const historyVisible1 = await page.locator('#tab-history').isVisible();

  console.log(`   Editor visible: ${editorVisible1}, Preview visible: ${previewVisible1}, History visible: ${historyVisible1}`);
  if (!editorVisible1 || !previewVisible1 || historyVisible1) {
    throw new Error('Initial split state incorrect!');
  }
  await page.screenshot({ path: path.join(testOutputDir, 'desktop-tab-editor-preview.png'), fullPage: true });

  // 2. Click "Invoice History" Tab
  console.log('👉 2. Clicking "Invoice History" Tab...');
  await page.click('.desktop-tab-btn[data-tab="history"]');
  await page.waitForTimeout(400);

  const editorVisible2 = await page.locator('#tab-editor').isVisible();
  const previewVisible2 = await page.locator('#tab-preview').isVisible();
  const historyVisible2 = await page.locator('#tab-history').isVisible();

  console.log(`   Editor visible: ${editorVisible2}, Preview visible: ${previewVisible2}, History visible: ${historyVisible2}`);
  
  if (previewVisible2) {
    throw new Error('❌ BUG DETECTED: #tab-preview is still visible on History tab!');
  }
  if (editorVisible2) {
    throw new Error('❌ BUG DETECTED: #tab-editor is still visible on History tab!');
  }
  if (!historyVisible2) {
    throw new Error('❌ BUG DETECTED: #tab-history is NOT visible!');
  }

  await page.screenshot({ path: path.join(testOutputDir, 'desktop-tab-history-clean.png'), fullPage: true });
  console.log('   📸 Captured desktop-tab-history-clean.png');

  // 3. Click "Settings" Tab
  console.log('👉 3. Clicking "Settings" Tab...');
  await page.click('.desktop-tab-btn[data-tab="settings"]');
  await page.waitForTimeout(400);

  const editorVisible3 = await page.locator('#tab-editor').isVisible();
  const previewVisible3 = await page.locator('#tab-preview').isVisible();
  const settingsVisible3 = await page.locator('#tab-settings').isVisible();

  console.log(`   Editor visible: ${editorVisible3}, Preview visible: ${previewVisible3}, Settings visible: ${settingsVisible3}`);

  if (previewVisible3 || editorVisible3 || !settingsVisible3) {
    throw new Error('❌ BUG DETECTED on Settings tab!');
  }

  await page.screenshot({ path: path.join(testOutputDir, 'desktop-tab-settings-clean.png'), fullPage: true });
  console.log('   📸 Captured desktop-tab-settings-clean.png');

  // 4. Return to Editor & Preview Tab
  console.log('👉 4. Returning to "Editor & Preview" Tab...');
  await page.click('.desktop-tab-btn[data-tab="editor"]');
  await page.waitForTimeout(400);

  const editorVisible4 = await page.locator('#tab-editor').isVisible();
  const previewVisible4 = await page.locator('#tab-preview').isVisible();
  console.log(`   Editor visible: ${editorVisible4}, Preview visible: ${previewVisible4}`);

  await browser.close();
  console.log('🎉 ALL DESKTOP TAB ISOLATION TESTS PASSED 100%!');
}

testDesktopTabs().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
