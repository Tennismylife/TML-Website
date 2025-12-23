const { chromium } = require('playwright');

(async () => {
  const BASE = process.env.BASE_URL || 'http://localhost:3000';
  console.log('Launching Chromium');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  console.log('Launched Chromium');
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  const requests = [];
  page.on('request', req => {
    if (req.url().includes('/api/records/wins')) requests.push(req.url());
  });

  try {
    console.log('Navigating to', `${BASE}/records`);
    await page.goto(`${BASE}/records`, { waitUntil: 'networkidle' });

    // Click the Wins tab
    console.log('Clicking Wins tab');
    await page.click('button:has-text("Wins")');

    // Wait for initial fetch to complete
    await page.waitForResponse(r => r.url().includes('/api/records/wins') && r.status() === 200, { timeout: 10000 });

    // Click a surface filter (Hard)
    console.log('Clicking Hard surface filter');
    await page.click('fieldset:has(legend:has-text("Surface")) button:has-text("Hard")');

    // Wait for fetch triggered by filter change
    await page.waitForResponse(r => r.url().includes('/api/records/wins') && r.status() === 200, { timeout: 10000 });

    // Allow any additional activity to settle
    await page.waitForTimeout(500);

    const winsRequests = requests.filter(u => u.includes('/api/records/wins'));
    console.log('Wins requests captured after interaction:', winsRequests.length);

    await browser.close();
    process.exit(winsRequests.length <= 1 ? 0 : 2);
  } catch (err) {
    console.error('E2E script error:', err);
    await browser.close();
    process.exit(3);
  }
})();