import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({
  root: path.join(root, 'owner-app'),
  preview: { port: 4174, strictPort: true },
  logLevel: 'error',
});

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4174';
const OWNER_PASS = 'owner123';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- helpers ------------------------------------------------------------
let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${extra ? ' — ' + extra : ''}`);
  }
}

/**
 * Perform a genuine browser-level interaction (trusted mouse click at the real
 * on-screen coordinates) AFTER verifying the target is truthfully clickable:
 *  1. exists in the DOM
 *  2. visible (has layout size)
 *  3. not disabled
 *  4. not covered by a blocking overlay
 */
async function trustedClick(page, selector, { scroll = true } = {}) {
  await page.waitForSelector(selector, { timeout: 6000 });
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }, selector);
  await sleep(150);

  const meta = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { ok: false, reason: 'missing' };
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return { ok: false, reason: 'not visible' };
    if (el.disabled) return { ok: false, reason: 'disabled' };
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!at || !el.contains(at)) return { ok: false, reason: 'covered by ' + (at ? at.tagName + '.' + (at.className || at.id || '') : 'nothing') };
    return { ok: true, x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);

  if (!meta.ok) throw new Error(`Cannot interact: #${selector} (${meta.reason})`);
  await page.mouse.click(meta.x, meta.y);
  return meta;
}

async function fill(page, selector, value) {
  await trustedClick(page, selector, { scroll: true });
  await page.keyboard.down('Control');
  for (let i = 0; i < 40; i++) await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await page.type(selector, value);
}

function nextOpenDate(daysFromNow = 1) {
  // Return an ISO date that falls on a Mon..Sat (shop open by default config)
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ---- browser setup ------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
page.setDefaultTimeout(8000);
await page.setViewport({ width: 1280, height: 900 });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));

const stepNum = () => page.evaluate(() => document.querySelector('.ow-wizard-step-num')?.textContent || '');
const wizardBtn = (id) => `#${id}`;

// ---- STEP 1: login & guard ----------------------------------------------
console.log('STEP 1 — login & guard');
await page.goto(BASE + '/#login', { waitUntil: 'networkidle0' });
await page.waitForSelector('#ow-login-form');
check('login form renders', (await page.$('#ow-login-form')) !== null);
check('owner auth not present on login', (await page.evaluate(() => localStorage.getItem('ow_auth'))) === null);

await fill(page, '#ow-pass', 'wrong-pass');
await trustedClick(page, '#ow-login-submit');
await sleep(250);
check('wrong password stays on login', page.url().includes('#login'));
check('wrong password no auth', (await page.evaluate(() => localStorage.getItem('ow_auth'))) === null);

await fill(page, '#ow-pass', OWNER_PASS);
await trustedClick(page, '#ow-login-submit');
await page.waitForFunction(() => location.hash === '#onboarding', { timeout: 6000 });
check('login redirects to onboarding (not onboarded)', page.url().includes('#onboarding'));

// ---- STEP 2: onboarding is 7 steps, no slot-mode step 5 -----------------
console.log('STEP 2 — onboarding (7 steps, step 5 removed)');
const step1Text = await stepNum();
check('onboarding shows 7 steps', step1Text.includes('Step 1 of 7'), step1Text);

await fill(page, '#sd-name', 'Romeo Barber Studio');
await fill(page, '#sd-phone', '+91 98765 40001');
await fill(page, '#sd-address', '12 Gandhi St, Coimbatore');
await trustedClick(page, wizardBtn('wiz-next'));
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 2'), { timeout: 4000 });
check('step 1 -> 2 (shop details -> working hours)', (await stepNum()).includes('Step 2'));

// Working hours (defaults: Mon-Sat 09-21) -> next
await trustedClick(page, wizardBtn('wiz-next'));
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 3'), { timeout: 4000 });
check('step 2 -> 3 (working hours -> breaks)', (await stepNum()).includes('Step 3'));

// Breaks -> skip (keeps default lunch break)
await trustedClick(page, wizardBtn('wiz-skip'));
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 4'), { timeout: 4000 });
check('step 3 -> 4 (breaks -> number of barbers)', (await stepNum()).includes('Step 4'));

// Capacity (default 3) -> next
await trustedClick(page, wizardBtn('wiz-next'));
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 5'), { timeout: 4000 });
check('step 4 -> 5 (capacity -> services)', (await stepNum()).includes('Step 5'));

// Step 5 = SERVICES, not slot mode. Verify no slot-mode UI on this step.
const step5HasSlotMode = await page.evaluate(() => {
  return !!document.querySelector('#mode-grid, [data-mode]');
});
check('step 5 is services (slot-mode step removed)', !step5HasSlotMode);
const step5Services = await page.evaluate(() => document.querySelectorAll('[data-del-svc]').length);
check('step 5 lists seeded services', step5Services >= 1, 'count=' + step5Services);

// Services -> next
await trustedClick(page, wizardBtn('wiz-next'));
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 6'), { timeout: 4000 });
check('step 5 -> 6 (services -> booking rules)', (await stepNum()).includes('Step 6'));

// Booking rules -> next
await trustedClick(page, wizardBtn('wiz-next'));
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 7'), { timeout: 4000 });
check('step 6 -> 7 (booking rules -> go live)', (await stepNum()).includes('Step 7'));

// ---- STEP 3: go live -> dashboard + mirror to pt_shops ------------------
console.log('STEP 3 — go live & dashboard');
check('shop summary shows name', (await page.evaluate(() => document.body.innerText)).includes('Romeo Barber Studio'));
await trustedClick(page, '#go-live-btn');
await page.waitForFunction(() => location.hash === '#dashboard', { timeout: 6000 });
check('go live redirects to dashboard', page.url().includes('#dashboard'));
check('shop config persisted onboarded', (await page.evaluate(() => JSON.parse(localStorage.getItem('ow_shop_config') || '{}').onboarded)) === true);
const mirroredShop = await page.evaluate(() => {
  const shops = JSON.parse(localStorage.getItem('pt_shops') || '[]');
  return shops.find(s => s.id === 'ow-shop') || null;
});
check('shop mirrored into customer pt_shops', !!mirroredShop && mirroredShop.name === 'Romeo Barber Studio');
check('mirrored shop has services', (mirroredShop && mirroredShop.services && mirroredShop.services.length) >= 1);
check('dashboard renders stat tiles', (await page.$$('.ow-stat-tile')).length >= 4);

// Reload persistence
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('.ow-stat-tile');
check('dashboard survives reload (config persisted)', true);

// ---- STEP 4: bookings page + pending allocation flow --------------------
console.log('STEP 4 — pending booking allocation & confirm');
const bookingDate = nextOpenDate(2);
const baseBooking = {
  shopId: 'ow-shop',
  shopName: 'Romeo Barber Studio',
  serviceId: 'svc-classic',
  serviceName: 'Classic Haircut',
  duration: 30,
  price: 150,
  dateISO: bookingDate,
  customerName: 'Ravi Kumar',
  customerPhone: '+91 90000 12345',
  customerIdentifier: 'ravi@example.com',
  status: 'pending',
  startMinute: null,
  createdAt: new Date().toISOString(),
};

const inserted = await page.evaluate((bk) => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  const full = { id: 'BK-OWNER-001', period: 'morning', ...bk };
  list.push(full);
  localStorage.setItem('pt_bookings', JSON.stringify(list));
  return full;
}, baseBooking);

await page.goto(BASE + '/#bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ow-booking-row');
check('pending booking appears in bookings list', (await page.evaluate(() => document.body.innerText)).includes('Ravi Kumar'));

// Open the booking (real click) -> allocation UI
await trustedClick(page, '.ow-booking-row[data-booking-id="BK-OWNER-001"]');
await page.waitForSelector('#ow-shared-booking-modal');
await page.waitForSelector('.ow-time-chip');
const chips = await page.$$('.ow-time-chip');
check('allocation shows valid time options', chips.length >= 1, 'chips=' + chips.length);

// Verify the chips all fall within the requested period (morning < 12:00)
const chipTimes = await page.evaluate(() => {
  return [...document.querySelectorAll('.ow-time-chip')].map(b => Number(b.dataset.pickTime));
});
const allMorning = chipTimes.every(t => t < 12 * 60);
check('all proposed times fall in morning period', allMorning, JSON.stringify(chipTimes));

// Select the first chip (trusted click) and confirm (trusted click)
await trustedClick(page, '.ow-time-chip:first-of-type');
await trustedClick(page, '[data-ow-action][data-action="confirm"]');
await sleep(400);
const stateAfterConfirm = await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  return list.find(b => b.id === 'BK-OWNER-001');
});
check('pending -> confirmed after allocation', stateAfterConfirm.status === 'confirmed');
check('startMinute allocated on confirm', stateAfterConfirm.startMinute != null);
check('allocated time is one of offered chips', chipTimes.includes(stateAfterConfirm.startMinute));

// ---- STEP 5: decline path -------------------------------------------------
console.log('STEP 5 — decline');
const declineBooking = await page.evaluate((bk) => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  const full = { id: 'BK-OWNER-002', period: 'evening', ...bk };
  list.push(full);
  localStorage.setItem('pt_bookings', JSON.stringify(list));
  return full;
}, baseBooking);

await page.goto(BASE + '/#bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ow-booking-row[data-booking-id="BK-OWNER-002"]');
await trustedClick(page, '.ow-booking-row[data-booking-id="BK-OWNER-002"]');
await page.waitForSelector('#ow-shared-booking-modal [data-ow-action][data-action="decline"]');
await trustedClick(page, '[data-ow-action][data-action="decline"]');
await sleep(400);
const declined = await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  return list.find(b => b.id === 'BK-OWNER-002');
});
check('owner can decline a pending request', declined.status === 'declined');

// ---- STEP 6: confirm re-check when no slot remains available ------------
console.log('STEP 6 — capacity re-check (no availability)');
const cDate = nextOpenDate(3);
await page.evaluate((bk) => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  const full = { id: 'BK-OWNER-003', period: 'morning', ...bk };
  list.push(full);
  localStorage.setItem('pt_bookings', JSON.stringify(list));
}, { ...baseBooking, dateISO: cDate });

// Saturate EVERY morning slot (09:00–12:00, 30-min steps = 6 slots) with
// capacity (3) confirmed bookings, so no morning slot is available at all.
// This is a genuine end-to-end scenario for the slot engine's re-check.
const fillStats = await page.evaluate(({ dateISO }) => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  const shop = JSON.parse(localStorage.getItem('ow_shop_config') || '{}');
  const capacity = Math.max(1, shop.capacity || 1);
  const morningSlots = [540, 570, 600, 630, 660, 690]; // 09:00..11:30 in 30-min steps
  let added = 0;
  for (const t of morningSlots) {
    for (let k = 0; k < capacity; k++) {
      list.push({
        id: 'BK-FILL-' + t + '-' + k,
        shopId: shop.id, status: 'confirmed', startMinute: t,
        dateISO, period: 'morning',
        serviceId: 'svc-classic', serviceName: 'Classic Haircut', duration: 30, price: 150,
        customerName: 'Fill', customerIdentifier: 'fill' + t + '-' + k,
      });
      added++;
    }
  }
  localStorage.setItem('pt_bookings', JSON.stringify(list));
  return { capacity, slots: morningSlots.length, added };
}, { dateISO: cDate });

// Open booking C -> slot engine should report no available times
await page.goto(BASE + '/#bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ow-booking-row[data-booking-id="BK-OWNER-003"]');
await trustedClick(page, '.ow-booking-row[data-booking-id="BK-OWNER-003"]');
await page.waitForSelector('#ow-shared-booking-modal');
await page.waitForFunction(() => {
  const body = document.querySelector('#ow-shared-booking-modal #owm-body');
  return body && body.innerText.trim().length > 0;
}, { timeout: 5000 });

check('no available times message shown when period full',
  await page.evaluate(() => (document.querySelector('#ow-shared-booking-modal #owm-body')?.innerText || '').includes('NO AVAILABLE TIMES')));
check('no allocate/confirm button offered when full',
  !(await page.$('#ow-shared-booking-modal [data-ow-action][data-action="confirm"]')));
check('decline still offered when full',
  (await page.$('#ow-shared-booking-modal [data-ow-action][data-action="decline"]')) !== null);
check('fill scenario saturated ' + fillStats.slots + ' slots x capacity ' + fillStats.capacity,
  fillStats.added >= fillStats.slots * fillStats.capacity, JSON.stringify(fillStats));

// Genuinely decline it via the remaining decline button
await trustedClick(page, '#ow-shared-booking-modal [data-ow-action][data-action="decline"]');
await sleep(300);
const declined3 = await page.evaluate(() => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  return (list.find(b => b.id === 'BK-OWNER-003') || {}).status;
});
check('fully-saturated pending booking can be declined', declined3 === 'declined');

// ---- STEP 7: services page + persistence --------------------------------
console.log('STEP 7 — services & persistence');
await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#svc-tbody tr');
check('services page renders seeded services', (await page.$$('#svc-tbody tr')).length >= 1);

await page.goto(BASE + '/#settings', { waitUntil: 'networkidle0' });
await page.waitForSelector('#app-save-btn');
check('settings page loads (no slot-mode section)', !(await page.evaluate(() => !!document.querySelector('#st-slot-mode'))));

await page.goto(BASE + '/#shop', { waitUntil: 'networkidle0' });
await page.waitForSelector('#shop-save-btn');
const shopNameShown = await page.evaluate(() => document.getElementById('sh-name')?.value);
check('shop settings show persisted name', shopNameShown === 'Romeo Barber Studio', shopNameShown);

// ---- STEP 8: logout ------------------------------------------------------
console.log('STEP 8 — logout');
await page.goto(BASE + '/#dashboard', { waitUntil: 'networkidle0' });
await page.waitForSelector('#sidebar-logout');
await trustedClick(page, '#sidebar-logout');
await page.waitForSelector('#ow-login-form');
check('logout returns to login', page.url().includes('#login'));
check('logout clears owner auth', (await page.evaluate(() => localStorage.getItem('ow_auth'))) === null);

console.log(`\nConsole/page errors during run: ${consoleErrors.length}`);
if (consoleErrors.length) {
  console.log(consoleErrors.slice(0, 10).join('\n'));
  failures += 1;
}

await browser.close();
await server.close();

console.log(failures === 0 ? '\nALL OWNER CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
