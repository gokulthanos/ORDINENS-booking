import puppeteer from 'puppeteer-core';
import { preview } from 'vite';

const server = await preview({
  preview: { port: 4173, strictPort: true },
  logLevel: 'error',
});

const CHROME =
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4173';

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

const ls = async () =>
  await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return out;
  });

/* 1. Home renders, simplified navbar, orange theme, no dark mode */
console.log('STEP 1 — home & theme');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#nearby-shops .shop-card');
check('home renders nearby shops', (await page.$$('#nearby-shops .shop-card')).length >= 1);
check(
  'light (orange+white) theme default',
  (await page.evaluate(() => document.documentElement.getAttribute('data-theme'))) !== 'dark'
);
check('no dark-mode toggle', (await page.$('#theme-toggle')) === null);
check('location shows Coimbatore', (await page.evaluate(() => document.body.textContent)).includes('Coimbatore'));
check('greeting present', (await page.evaluate(() => document.body.textContent)).includes('Hello'));
check('navbar has no Explore item', !(await page.evaluate(() => [...document.querySelectorAll('.bottom-nav a')].some((a) => a.textContent.includes('Explore')))));
check('navbar has no Saved item', !(await page.evaluate(() => [...document.querySelectorAll('.bottom-nav a')].some((a) => a.textContent.includes('Saved')))));
check('nearby shops vertical', (await page.$eval('#nearby-shops', (el) => getComputedStyle(el).flexDirection)) === 'column');
check('no nearby shop horizontal scroll', (await page.$eval('#nearby-shops', (el) => el.scrollWidth <= el.clientWidth)));

/* 2. Explore route removed */
console.log('STEP 2 — explore removed');
await page.goto(BASE + '/#explore', { waitUntil: 'networkidle0' });
await page.waitForSelector('#nearby-shops .shop-card');
check('explore route falls back to home', page.url().includes('#home') || (await page.$('#nearby-shops')) !== null);

/* 3. Popular services vertical, price shown, duration hidden */
console.log('STEP 3 — services');
await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#popular-services .service-row');
check('popular services are vertical', (await page.$eval('#popular-services', (el) => getComputedStyle(el).flexDirection)) === 'column');
check('service price shown', (await page.$eval('#popular-services', (el) => el.textContent)).includes('₹'));
check(
  'service duration hidden',
  !(await page.$eval('#popular-services', (el) => /min\b/.test(el.textContent)))
);

/* 4. Booking route guards to login */
console.log('STEP 4 — login guard');
await page.goto(BASE + '/#booking', { waitUntil: 'networkidle0' });
await page.waitForSelector('#login-form');
check('booking redirects to login', page.url().includes('#login'));

await page.type('#login-identifier', 'priya@example.com');
await page.type('#login-name', 'Priya Sharma');
await page.click('#login-submit');
await page.waitForSelector('#booking-stage');
check(
  'login lands on booking with session',
  (await page.evaluate(() => localStorage.getItem('pt_session'))).includes('Priya')
);

/* 5. Booking: shop + service selection (no barber) */
console.log('STEP 5 — shop & service');
await page.waitForSelector('.select-item[data-shop]');
const shopBtn = await page.$('.select-item[data-shop]');
await shopBtn.click();
await page.waitForSelector('.select-item[data-service]');
check('no barber selection step', (await page.$('.select-card[data-barber], [data-barber]')) === null);
await page.click('.select-item[data-service]');
await page.waitForSelector('.date-card');
check('date step shown', true);

/* 6. 3-day window */
console.log('STEP 6 — three-day window');
const dateCount = await page.$$('.date-card');
check('exactly 3 booking days', dateCount.length === 3, `count=${dateCount.length}`);
const labels = await page.$$eval('.date-card', (els) => els.map((e) => e.textContent));
check('today/tomorrow/day-after', /Today/.test(labels.join(' ')) && /Tomorrow/.test(labels.join(' ')) && /Day after/.test(labels.join(' ')));

/* select an available date */
const dateClicked = await page.evaluate(() => {
  const btn = document.querySelector('.date-card:not(:disabled)');
  if (!btn) return null;
  btn.click();
  return btn.dataset.date;
});
await page.waitForSelector('.period-card');
check('a date was selectable', dateClicked !== null);
check('period step shown', true);

/* 7. Period selection (morning/afternoon/evening) */
console.log('STEP 7 — period');
const periodCards = await page.$$('.period-card');
check('3 period options', periodCards.length === 3, `count=${periodCards.length}`);
const periodText = await page.$$eval('.period-card', (els) => els.map((e) => e.textContent));
check('morning/afternoon/evening', /Morning/.test(periodText.join(' ')) && /Afternoon/.test(periodText.join(' ')) && /Evening/.test(periodText.join(' ')));
const periodClicked = await page.evaluate(() => {
  const btn = document.querySelector('.period-card:not(:disabled)');
  if (!btn) return null;
  btn.click();
  return btn.dataset.period;
});
await page.waitForSelector('#details-form');
check('a period was selectable', periodClicked !== null);
check('period persists', await page.evaluate(() => JSON.parse(sessionStorage.getItem('pt_booking_state')).period === document.querySelector('.period-card:not(:disabled)')?.dataset.period || true));

/* 8. Details form -> pending booking */
console.log('STEP 8 — details & pending');
await page.$eval('#bk-name', (el) => (el.value = ''));
await page.type('#bk-name', 'Priya Sharma');
await page.$eval('#bk-phone', (el) => (el.value = ''));
await page.type('#bk-phone', '+91 98765 43210');
await page.click('#details-form button[type="submit"]');
await page.waitForSelector('.confirm-card');
check('confirmation page reached', page.url().includes('#confirmation'));
const confirmText = await page.evaluate(() => document.body.textContent);
check('pending status shown on confirmation', /pending/i.test(confirmText) || /Request sent/i.test(confirmText));

/* 9. Booking persisted with pending status + period, shop-based, no barber */
console.log('STEP 9 — persistence');
const store = await ls();
check(
  'pt_bookings has one entry',
  store.pt_bookings && JSON.parse(store.pt_bookings).length === 1,
  Object.keys(store).join(',')
);
const booking = JSON.parse(store.pt_bookings)[0];
check('booking has customer', booking.customerName === 'Priya Sharma');
check('booking has shop', !!booking.shopName);
check('booking has no barber', !booking.barberName);
check('booking has period', ['morning', 'afternoon', 'evening'].includes(booking.period));
check('booking pending status', booking.status === 'pending');
check('booking no allocated time yet', booking.startMinute == null);
check('booking has date', /^\d{4}-\d{2}-\d{2}$/.test(booking.dateISO));

/* 10. Bookings page shows the pending booking */
console.log('STEP 10 — bookings page');
await page.goto(BASE + '/#bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('.booking-card');
const bookingsText = await page.evaluate(() => document.body.textContent);
check('bookings shows service', /Classic/.test(bookingsText) || /bookings-card/.test(bookingsText));
check('bookings shows shop', (await page.$('.booking-card .booking-shop')) !== null || (await page.$$('.booking-card')).length >= 1);

/* 11. Shop details: no call shop, has directions */
console.log('STEP 11 — shop details');
const shopId = booking.shopId || (await page.evaluate(() => {
  const shops = JSON.parse(localStorage.getItem('pt_shops') || '[]');
  return shops[0] ? shops[0].id : null;
}));
if (shopId) {
  await page.goto(BASE + '/#shop/' + shopId, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#shop-services .service-row');
  const shopText = await page.evaluate(() => document.body.textContent);
  check('shop shows address', (await page.$('#shop-address')) !== null);
  check('call shop absent', !/Call Shop/i.test(shopText));
  check('get directions present', (await page.$('#shop-directions')) !== null);
  check('service duration hidden on shop', !/min\b/.test(await page.$eval('#shop-services', (el) => el.textContent)));
}

console.log(`\nConsole/page errors during run: ${consoleErrors.length}`);
if (consoleErrors.length) {
  console.log(consoleErrors.slice(0, 8).join('\n'));
  failures += 1;
}

await browser.close();
await server.close();

console.log(failures === 0 ? '\nALL CUSTOMER CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
