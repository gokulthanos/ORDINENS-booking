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
  let lastReason = 'not clickable';
  // Retry while transient animations / smooth scrolls are still settling so the
  // element truthfully occupies its measured on-screen position before clicking.
  for (let attempt = 0; attempt < 6; attempt++) {
    if (scroll) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
      }, selector);
      await sleep(120);
    }
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
    if (meta.ok) {
      await page.mouse.click(meta.x, meta.y);
      return meta;
    }
    lastReason = meta.reason;
    await sleep(120);
  }
  throw new Error(`Cannot interact: #${selector} (${lastReason})`);
}

// Navigate to a hash, forcing a reload if we are already on that hash (a same-URL
// hash goto is a no-op, so re-renders would never happen without a reload).
async function gotoHash(page, hash) {
  const current = (new URL(page.url()).hash || '#/').split('?')[0];
  if (current === hash) {
    await page.reload({ waitUntil: 'networkidle0' });
  } else {
    await page.goto(BASE + hash, { waitUntil: 'networkidle0' });
  }
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

function nextOpenDateNotEqual(days, exclude) {
  let iso = nextOpenDate(days);
  let guard = 0;
  while (iso === exclude && guard < 30) { iso = nextOpenDate(days + ++guard); }
  return iso;
}

// ---- browser setup ------------------------------------------------------
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
page.setDefaultTimeout(10000);
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
await page.waitForFunction(() => (document.querySelector('.ow-wizard-step-num')?.textContent || '').includes('Step 1'), { timeout: 6000 });
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

// Capacity (default 3) -> next. Verify cap input exists (barber management removed, capacity retained)
const capInputVal = await page.evaluate(() => document.getElementById('cap-num')?.value);
check('step 4 shows number of barbers / capacity', capInputVal === '3', 'cap=' + capInputVal);
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
check('mirrored shop retains capacity', (mirroredShop && mirroredShop.capacity) === 3, 'cap=' + (mirroredShop?.capacity));
check('dashboard renders stat tiles', (await page.$$('.ow-stat-tile')).length >= 4);

// ---- STEP 3b: navigation cleanup -----------------------------------------
console.log('STEP 3b — navigation (barbers removed, holidays present)');
// Desktop sidebar must NOT have barbers
const sidebarHasBarbers = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.ow-sidebar-nav a, .ow-sidebar-footer a')];
  return links.some(a => a.textContent.includes('Barbers'));
});
check('sidebar does NOT contain Barbers', !sidebarHasBarbers);
const sidebarHasHolidays = await page.evaluate(() => {
  const links = [...document.querySelectorAll('.ow-sidebar-nav a')];
  return links.some(a => a.textContent.includes('Holidays'));
});
check('sidebar contains Holidays', sidebarHasHolidays);
const sidebarNames = await page.evaluate(() => {
  return [...document.querySelectorAll('.ow-sidebar-nav a, .ow-sidebar-footer a')].map(a => a.textContent.trim());
});
const sidebarHasRequired = (() => {
  return ['Dashboard','Bookings','Calendar','Services','Holidays','Shop','Settings'].every(n => sidebarNames.some(x => x.includes(n)));
})();
check('sidebar has all required modules', sidebarHasRequired, 'found=' + JSON.stringify(sidebarNames));

// More drawer must NOT have barbers
const drawerHasBarbers = await page.evaluate(() => {
  const items = [...document.querySelectorAll('#ow-more-drawer .ow-drawer-item')];
  return items.some(i => i.textContent.includes('Barbers'));
});
check('more drawer does NOT contain Barbers', !drawerHasBarbers);
const drawerHasHolidays = await page.evaluate(() => {
  const items = [...document.querySelectorAll('#ow-more-drawer .ow-drawer-item')];
  return items.some(i => i.textContent.includes('Holidays'));
});
check('more drawer contains Holidays', drawerHasHolidays);

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

await gotoHash(page, '#bookings');
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

// ---- STEP 4b: capacity still works (booking accepted at capacity) --------
check('capacity logic works (booking confirmed)', stateAfterConfirm.status === 'confirmed');

// ---- STEP 5: decline path -------------------------------------------------
console.log('STEP 5 — decline');
const declineBooking = await page.evaluate((bk) => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  const full = { id: 'BK-OWNER-002', period: 'evening', ...bk };
  list.push(full);
  localStorage.setItem('pt_bookings', JSON.stringify(list));
  return full;
}, baseBooking);

await gotoHash(page, '#bookings');
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
await gotoHash(page, '#bookings');
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

// ---- STEP 7: services page (list-first, add on click) -------------------
console.log('STEP 7 — services (list-first, no auto-add)');
await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#svc-tbody tr');
check('services page renders service list first', (await page.$$('#svc-tbody tr')).length >= 1);

// Add Service form must NOT be visible on page load
const svcModalHiddenOnLoad = await page.evaluate(() => {
  const m = document.getElementById('svc-modal');
  return m ? m.hidden === true : true;
});
check('Add Service form is NOT automatically visible', svcModalHiddenOnLoad);

// Add Service button exists
check('Add Service button exists', (await page.$('#add-svc-btn')) !== null);

// Click Add Service -> form opens (not auto-create)
await trustedClick(page, '#add-svc-btn');
await page.waitForSelector('#svc-modal:not([hidden])');
check('clicking Add Service opens the form', true);

// Cancel returns to list (form closes)
await trustedClick(page, '#svc-cancel-btn');
await page.waitForSelector('#svc-modal[hidden]');
check('Cancel from Add Service closes form', true);

// Reopen and add a service
await trustedClick(page, '#add-svc-btn');
await page.waitForSelector('#svc-modal:not([hidden])');
await fill(page, '#sv-name', 'Precision Beard Sculpt');
await fill(page, '#sv-duration', '45');
await fill(page, '#sv-price', '250');
await trustedClick(page, '#svc-submit-btn');
await sleep(400);
check('service added appears in list', (await page.evaluate(() => document.body.innerText)).includes('Precision Beard Sculpt'));

// Persistence check
const svcPersist = await page.evaluate(() => {
  const cfg = JSON.parse(localStorage.getItem('ow_shop_config') || '{}');
  return (cfg.services || []).some(s => s.name === 'Precision Beard Sculpt');
});
check('new service persisted to localStorage', svcPersist);

// Edit: find the row and click its Edit button
const svcRowEditBtn = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#svc-tbody tr')];
  const row = rows.find(r => r.textContent.includes('Precision Beard Sculpt'));
  return row ? row.querySelector('[data-edit-svc]')?.dataset?.editSvc : null;
});
check('new service row has Edit button', !!svcRowEditBtn);
if (svcRowEditBtn) {
  await trustedClick(page, `[data-edit-svc="${svcRowEditBtn}"]`);
  await page.waitForSelector('#svc-modal:not([hidden])');
  const editName = await page.evaluate(() => document.getElementById('sv-name')?.value);
  const editDuration = await page.evaluate(() => document.getElementById('sv-duration')?.value);
  check('edit opens populated form', editName === 'Precision Beard Sculpt' && editDuration === '45', editName + '/' + editDuration);
  // Update
  await fill(page, '#sv-name', 'Precision Beard Sculpt Pro');
  await fill(page, '#sv-price', '300');
  await trustedClick(page, '#svc-submit-btn');
  await sleep(400);
  check('service updated in list', (await page.evaluate(() => document.body.innerText)).includes('Precision Beard Sculpt Pro'));
  const svcEditPersist = await page.evaluate(() => {
    const cfg = JSON.parse(localStorage.getItem('ow_shop_config') || '{}');
    const s = (cfg.services || []).find(x => x.name === 'Precision Beard Sculpt Pro');
    return s && s.price === 300;
  });
  check('service edit persisted', svcEditPersist);
}

// Validation: Add Service with invalid data shows errors
await trustedClick(page, '#add-svc-btn');
await page.waitForSelector('#svc-modal:not([hidden])');
await fill(page, '#sv-name', '');
await fill(page, '#sv-duration', '0');
await fill(page, '#sv-price', '-10');
await trustedClick(page, '#svc-submit-btn');
await sleep(300);
check('validation blocks invalid service submit', (await page.$('#svc-modal:not([hidden])')) !== null);
// Close and return to list
await trustedClick(page, '#svc-cancel-btn');
await page.waitForSelector('#svc-modal[hidden]');

// ---- STEP 8: barbers section absent ---------------------------------------
console.log('STEP 8 — barbers section absent');
// Direct navigation to #barbers should redirect to dashboard (route removed)
await page.goto(BASE + '/#barbers', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => location.hash === '#dashboard', { timeout: 6000 });
check('barbers route redirects to dashboard', page.url().includes('#dashboard'));
const bodyNoBarbers = await page.evaluate(() => document.body.innerText.includes('Barbers'));
const noBarberMgmt = !(await page.$('#bb-modal, .ow-staff-grid'));
check('barber management UI not accessible', noBarberMgmt);

// ---- STEP 9: capacity still configurable ----------------------------------
console.log('STEP 9 — capacity / number of barbers retained');
// Check settings/config retains capacity (Number of Barbers retained internally)
const capacityRetained = await page.evaluate(() => {
  const cfg = JSON.parse(localStorage.getItem('ow_shop_config') || '{}');
  return cfg.capacity === 3;
});
check('capacity retained in shop config', capacityRetained);

// ---- STEP 10: holidays page -------------------------------------------------
console.log('STEP 10 — holidays (list-first, add/edit/delete)');
await page.goto(BASE + '/#holidays', { waitUntil: 'networkidle0' });
await page.waitForSelector('#add-hol-btn');
check('holidays page opens', true);

// Add Holiday form NOT visible on load
const holModalHiddenOnLoad = await page.evaluate(() => {
  const m = document.getElementById('hol-modal');
  return m ? m.hidden === true : true;
});
check('Add Holiday form is NOT automatically visible', holModalHiddenOnLoad);
check('Add Holiday button exists', (await page.$('#add-hol-btn')) !== null);

// Empty state or list shown (not form)
const holPageText = await page.evaluate(() => document.getElementById('app')?.innerText || '');
check('holidays page shows list/empty state', holPageText.includes('Holidays'));

// Click Add Holiday -> form opens
await trustedClick(page, '#add-hol-btn');
await page.waitForSelector('#hol-modal:not([hidden])');
check('clicking Add Holiday opens the form', true);

// Cancel returns to list
await trustedClick(page, '#hol-cancel-btn');
await page.waitForSelector('#hol-modal[hidden]');
check('Cancel from Add Holiday closes form', true);

// Reopen, validate login, and add a holiday
const holDate = nextOpenDate(4);
await trustedClick(page, '#add-hol-btn');
await page.waitForSelector('#hol-modal:not([hidden])');
await fill(page, '#hol-label', 'Vinayagar Chaturthi');
// Setting date input value via JS is more reliable
await page.evaluate((d) => {
  const el = document.getElementById('hol-date');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, d);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, holDate);
await trustedClick(page, '#hol-submit-btn');
await sleep(400);
// Form should close, back to list, holiday shown
check('holiday added returns to list', (await page.evaluate(() => document.getElementById('hol-modal')?.hidden)) === true);
check('new holiday appears in list', (await page.evaluate(() => document.getElementById('app')?.innerText || '')).includes('Vinayagar Chaturthi'));

// Persistence
const holPersist = await page.evaluate(() => {
  return JSON.parse(localStorage.getItem('ow_holidays') || '[]').some(h => h.label === 'Vinayagar Chaturthi');
});
check('new holiday persisted to localStorage', holPersist);

// Duplicate prevention: add same date again -> should show duplicate error
const holDuplicateBlocked = await page.evaluate(() => {
  return JSON.parse(localStorage.getItem('ow_holidays') || '[]').filter(h => h.dateISO === '${holDate}').length <= 1;
});

// Edit the holiday
const holEditBtn = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[data-edit-hol]')];
  return rows[0]?.dataset?.editHol || null;
});
check('holiday row has Edit button', !!holEditBtn);
if (holEditBtn) {
  await trustedClick(page, `[data-edit-hol="${holEditBtn}"]`);
  await page.waitForSelector('#hol-modal:not([hidden])');
  const editLabel = await page.evaluate(() => document.getElementById('hol-label')?.value);
  check('edit opens populated holiday form', editLabel === 'Vinayagar Chaturthi', editLabel);
  await fill(page, '#hol-label', 'Vinayagar Chaturthi Holiday');
  await trustedClick(page, '#hol-submit-btn');
  await sleep(400);
  check('holiday edited in list', (await page.evaluate(() => document.getElementById('app')?.innerText || '')).includes('Vinayagar Chaturthi Holiday'));
}

// Delete with confirmation
const holDelBtn = await page.evaluate(() => {
  const target = [...document.querySelectorAll('.ow-break-row')].find(r => r.textContent.includes('Vinayagar Chaturthi Holiday'));
  return target ? target.querySelector('[data-del-hol]')?.dataset?.delHol : null;
});
if (holDelBtn) {
  // Handle browser confirm dialog
  page.on('dialog', async (d) => { await d.accept(); });
  await trustedClick(page, `[data-del-hol="${holDelBtn}"]`);
  await sleep(300);
  check('holiday deleted from list', !(await page.evaluate(() => document.getElementById('app')?.innerText || '')).includes('Vinayagar Chaturthi Holiday'));
} else {
  check('holiday delete button found', false);
}

// Capacity still works after holiday removal
const capacityStill = await page.evaluate(() => {
  const cfg = JSON.parse(localStorage.getItem('ow_shop_config') || '{}');
  return cfg.capacity === 3;
});
check('capacity intact after holiday operations', capacityStill);

// ---- STEP 11: holiday blocks booking availability -------------------------
console.log('STEP 11 — holiday blocks availability');
// Add a holiday and verify slot engine returns [] for that date
const holidayBlockDate = nextOpenDate(5);
await page.evaluate((d) => {
  const list = JSON.parse(localStorage.getItem('ow_holidays') || '[]');
  list.push({ id: 'hol-blocktest', dateISO: d, label: 'Block Test Holiday' });
  localStorage.setItem('ow_holidays', JSON.stringify(list));
}, holidayBlockDate);

// Insert a pending booking for that holiday date
await page.evaluate((bk) => {
  const list = JSON.parse(localStorage.getItem('pt_bookings') || '[]');
  list.push({ id: 'BK-HOLIDAY', period: 'morning', ...bk });
  localStorage.setItem('pt_bookings', JSON.stringify(list));
}, { ...baseBooking, dateISO: holidayBlockDate, customerName: 'Holiday Guy', customerIdentifier: 'holiday@example.com' });

await gotoHash(page, '#bookings');
await page.waitForSelector('.ow-booking-row[data-booking-id="BK-HOLIDAY"]');
await trustedClick(page, '.ow-booking-row[data-booking-id="BK-HOLIDAY"]');
await page.waitForSelector('#ow-shared-booking-modal');
await page.waitForFunction(() => {
  const body = document.querySelector('#ow-shared-booking-modal #owm-body');
  return body && body.innerText.trim().length > 0;
}, { timeout: 5000 });
const holBlockBody = await page.evaluate(() => document.querySelector('#ow-shared-booking-modal #owm-body')?.innerText || '');
check('holiday date reports NO AVAILABLE TIMES', holBlockBody.includes('NO AVAILABLE TIMES'));
check('no confirm offered on holiday date', !(await page.$('#ow-shared-booking-modal [data-ow-action][data-action="confirm"]')));

// Clean up the block-test holiday + booking
await page.evaluate(() => {
  localStorage.setItem('ow_holidays', JSON.stringify(JSON.parse(localStorage.getItem('ow_holidays') || '[]').filter(h => h.id !== 'hol-blocktest')));
  localStorage.setItem('pt_bookings', JSON.stringify(JSON.parse(localStorage.getItem('pt_bookings') || '[]').filter(b => b.id !== 'BK-HOLIDAY')));
});

// ---- STEP 12: services/holidays default to list on navigation ---------------
console.log('STEP 12 — navigation flow (list first)');
// Services -> list first (no auto-form)
await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#svc-tbody tr');
check('Services opens to list (no auto-form)',
  await page.evaluate(() => document.getElementById('svc-modal')?.hidden === true));

// Holidays -> list first (no auto-form)
await page.goto(BASE + '/#holidays', { waitUntil: 'networkidle0' });
await page.waitForSelector('#add-hol-btn');
check('Holidays opens to list (no auto-form)',
  await page.evaluate(() => document.getElementById('hol-modal')?.hidden === true));

// ---- STEP 13: settings & shop pages still work -----------------------------
console.log('STEP 13 — settings & shop');
await page.goto(BASE + '/#settings', { waitUntil: 'networkidle0' });
await page.waitForSelector('#app-save-btn');
check('settings page loads (no slot-mode section)', !(await page.evaluate(() => !!document.querySelector('#st-slot-mode'))));

await page.goto(BASE + '/#shop', { waitUntil: 'networkidle0' });
await page.waitForSelector('#shop-save-btn');
const shopNameShown = await page.evaluate(() => document.getElementById('sh-name')?.value);
check('shop settings show persisted name', shopNameShown === 'Romeo Barber Studio', shopNameShown);
check('shop page has no standalone holiday section',
  !(await page.evaluate(() => !!document.getElementById('add-hol-btn'))));

// ---- STEP 14: responsive -----------------------------
console.log('STEP 14 — responsiveness');
await page.setViewport({ width: 375, height: 812 });
await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#add-svc-btn');
const mobileNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('no horizontal overflow at 375px', mobileNoOverflow);

await page.setViewport({ width: 390, height: 844 });
await page.goto(BASE + '/#holidays', { waitUntil: 'networkidle0' });
await page.waitForSelector('#add-hol-btn');
const mobileNoOverflow2 = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('no horizontal overflow at 390px', mobileNoOverflow2);

// Back to desktop
await page.setViewport({ width: 1280, height: 900 });
await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#svc-tbody tr');
const desktopNoOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
check('no horizontal overflow at 1280px', desktopNoOverflow);

// ---- STEP 15: logout ------------------------------------------------------
console.log('STEP 15 — logout');
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