const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on('pageerror', err => {
    console.error('  [JS Error]', err.message);
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(500);

  // Check what's rendered
  const html = await page.evaluate(() => {
    const root = document.getElementById('app') || document.getElementById('templator-app');
    if (!root) return '<no root elements>';
    return root.innerHTML.substring(0, 2000);
  });
  console.log('Rendered HTML:', html);

  const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Page text:', JSON.stringify(text));

  await page.screenshot({ path: 'playwright-screenshot.png', fullPage: true });
  console.log('Screenshot saved.');

  await browser.close();
})();
