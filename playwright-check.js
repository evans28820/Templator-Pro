const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('  [console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('  [PAGE ERROR]', err.message));
  
  await page.goto('http://localhost:5173', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1500);
  
  const title = await page.title();
  const bodyText = await page.evaluate(() => document.body?.innerText || 'NO BODY');
  const rootHtml = await page.evaluate(() => {
    const el = document.getElementById('app') || document.getElementById('templator-app');
    return el ? el.innerHTML.substring(0, 300) : 'NO ROOT EL';
  });
  
  console.log('Title:', JSON.stringify(title));
  console.log('Body:', JSON.stringify(bodyText.substring(0, 500)));
  console.log('Root:', JSON.stringify(rootHtml));
  
  await page.screenshot({ path: 'playwright-screenshot.png', fullPage: true });
  console.log('Screenshot saved.');
  await browser.close();
})();
