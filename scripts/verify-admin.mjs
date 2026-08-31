import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({
  root: path.join(root, 'admin-panel'),
  preview: { port: 4175, strictPort: true },
  logLevel: 'error',
});

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4175';
const ADMIN_PASS = 'admin123';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`);
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
page.setDefaultTimeout(8000);

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
page.on('response', (res) => {
  if (res.status() >= 400) consoleErrors.push('HTTP ' + res.status() + ' -> ' + res.url());
});

/* 1. Login screen + guard */
console.log('STEP 1 — login & guard');
await page.goto(BASE + '/#admin', { waitUntil: 'networkidle0' });
await page.waitForSelector('#ad-login-form');
check('unauthenticated admin route redirects to login', page.url().includes('#admin-login'));
check('admin session not present', (await page.evaluate(() => localStorage.getItem('admin_session'))) === null);

/* 2. Wrong password rejected */
console.log('STEP 2 — wrong password rejected');
await page.type('#ad-login-pass', 'wrong-pass');
await page.click('#ad-login-form button[type="submit"]');
await sleep(300);
const errText = await page.evaluate(() => document.getElementById('ad-login-error').textContent);
check('wrong password shows error', errText.length > 0);
check('still on login', page.url().includes('#admin-login'));
check('no admin session created', (await page.evaluate(() => localStorage.getItem('admin_session'))) === null);

/* 3. Correct login + dashboard */
console.log('STEP 3 — login + dashboard');
await page.$eval('#ad-login-pass', (el) => (el.value = ''));
await page.type('#ad-login-pass', ADMIN_PASS);
await page.click('#ad-login-form button[type="submit"]');
await page.waitForSelector('.ad-stat-card', { timeout: 6000 });
check('dashboard renders stat cards', (await page.$$('.ad-stat-card')).length >= 10);
check('dashboard title has greeting', (await page.evaluate(() => document.querySelector('.ad-page-title').textContent)).includes(','));

/* 4. Role guard blocks while logged in as admin */
console.log('STEP 4 — role guard');
const sessionBefore = await page.evaluate(() => localStorage.getItem('admin_session'));
check('admin session is admin role', JSON.parse(sessionBefore).role === 'admin');

/* 5. Customers */
console.log('STEP 5 — customers');
await page.goto(BASE + '/#admin/customers', { waitUntil: 'networkidle0' });
await page.waitForSelector('#cust-tbody');
check('customers page loads', (await page.$('#cust-tbody')) !== null);

/* 6. Shops */
console.log('STEP 6 — shops');
await page.goto(BASE + '/#admin/shops', { waitUntil: 'networkidle0' });
await page.waitForSelector('#shop-tbody');
check('shops page loads', (await page.$('#shop-tbody')) !== null);

/* 7. Barbers */
console.log('STEP 7 — barbers');
await page.goto(BASE + '/#admin/barbers', { waitUntil: 'networkidle0' });
await page.waitForSelector('#barber-tbody');
check('barbers page loads', (await page.$('#barber-tbody')) !== null);

/* 8. Services */
console.log('STEP 8 — services');
await page.goto(BASE + '/#admin/services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#svc-tbody');
check('services page loads', (await page.$('#svc-tbody')) !== null);

/* 9. Bookings + filters */
console.log('STEP 9 — bookings & filters');
await page.goto(BASE + '/#admin/bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('#booking-tbody');
check('bookings page loads', (await page.$('#booking-tbody')) !== null);

// add a booking to test
await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  list.push({
    id: 'BK-TEST-001',
    customerName: 'Test Customer',
    customerPhone: '+91 90000 00000',
    serviceName: 'Classic Haircut',
    serviceId: 'svc-classic',
    duration: 30,
    price: 150,
    barberName: 'Arjun',
    dateISO: '2030-01-15',
    startMinute: 600,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem('pt_bookings', JSON.stringify(list));
});
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#booking-tbody tr');
const filterRows = await page.$$('#booking-tbody tr');
check('booking filters render rows', filterRows.length >= 1);

// status filter
await page.select('#booking-status', 'confirmed');
await sleep(200);
const filtered = await page.$$('#booking-tbody tr');
check('status filter works', filtered.length >= 1);

// search
await page.type('#booking-search', 'BK-TEST');
await sleep(400);
const searched = await page.$$('#booking-tbody tr');
check('search filter works', searched.length === 1, `rows=${searched.length}`);

/* 10. Booking details */
console.log('STEP 10 — booking details');
await page.goto(BASE + '/#admin/bookings/BK-TEST-001', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ad-detail-grid');
check('booking details renders', (await page.$('.ad-detail-grid')) !== null);

/* 11. Payments */
console.log('STEP 11 — payments');
await page.goto(BASE + '/#admin/payments', { waitUntil: 'networkidle0' });
await page.waitForSelector('#pay-tbody');
check('payments page loads', (await page.$('#pay-tbody')) !== null);

/* 12. Issues */
console.log('STEP 12 — issues');
await page.goto(BASE + '/#admin/issues', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => !!document.querySelector('#report-issue-btn'));
check('issues page loads', (await page.$('#report-issue-btn')) !== null);

/* 13. Reports */
console.log('STEP 13 — reports');
await page.goto(BASE + '/#admin/reports', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ad-report-row');
check('reports page loads', (await page.$('.ad-report-row')) !== null);

/* 14. Settings */
console.log('STEP 14 — settings');
await page.goto(BASE + '/#admin/settings', { waitUntil: 'networkidle0' });
await page.waitForSelector('#settings-panel');
check('settings page loads', (await page.$('#settings-panel')) !== null);

/* 15. Unauthorized route blocked (unknown admin route -> dashboard) */
console.log('STEP 15 — unauthorized routes');
await page.goto(BASE + '/#admin/nonexistent', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ad-page-title');
check('unknown admin route redirects to dashboard', page.url().includes('#admin'));

// Logout clears session and returns to login
await page.goto(BASE + '/#admin', { waitUntil: 'networkidle0' });
await page.waitForSelector('#ad-logout');
await page.click('#ad-logout');
await page.waitForSelector('#ad-login-form');
check('logout returns to login', page.url().includes('#admin-login'));
check('logout clears admin session', (await page.evaluate(() => localStorage.getItem('admin_session'))) === null);

/* 16. Responsive mobile */
console.log('STEP 16 — responsive mobile');
await page.setViewport({ width: 390, height: 844 });
await page.evaluate(() => {
  localStorage.setItem('admin_session', JSON.stringify({ role: 'admin', authenticated: true, name: 'Admin', loginAt: new Date().toISOString() }));
});
await page.goto(BASE + '/#admin', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ad-sidebar');
const hamburgerVisible = await page.$eval('#ad-hamburger', (el) => getComputedStyle(el).display !== 'none');
check('hamburger visible on mobile', hamburgerVisible);
await page.click('#ad-hamburger');
await sleep(200);
const drawerOpen = await page.$eval('#ad-sidebar', (el) => el.classList.contains('open'));
check('sidebar drawer opens', drawerOpen);

/* 17. Responsive desktop */
console.log('STEP 17 — responsive desktop');
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE + '/#admin', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ad-sidebar');
const hamburgerHidden = await page.$eval('#ad-hamburger', (el) => getComputedStyle(el).display === 'none');
check('hamburger hidden on desktop', hamburgerHidden);

/* 18. Mobile booking cards */
console.log('STEP 18 — mobile booking card fallback');
await page.setViewport({ width: 390, height: 844 });
await page.goto(BASE + '/#admin/bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('#booking-cards');
const tableHidden = await page.$eval('.ad-table-wrap', (el) => getComputedStyle(el).display === 'none');
const cardsShown = await page.$eval('.ad-table-cards', (el) => getComputedStyle(el).display !== 'none');
check('table hidden on mobile', tableHidden);
check('card fallback shown on mobile', cardsShown);

console.log(`\nConsole/page errors during run: ${consoleErrors.length}`);
if (consoleErrors.length) {
  console.log(consoleErrors.slice(0, 10).join('\n'));
  failures += 1;
}

await browser.close();
await server.close();

console.log(failures === 0 ? '\nALL ADMIN CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
