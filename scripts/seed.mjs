/* =============================================================
   Ordinens Tech — Mock Data Seeder (opt-in)
   -----------------------------------------------------------------
   Injects realistic demo data into EACH app's localStorage so the
   Customer, Owner and Admin panels look populated when you demo them.

   WHY opt-in: the verification suite (verify.mjs / verify-owner.mjs /
   verify-admin.mjs) asserts empty / controlled storage state. Baking
   mock data into app startup would break those tests. This script
   keeps the apps clean and seeds data on demand instead.

   Usage:
     node scripts/seed.mjs            # seed all three apps
     node scripts/seed.mjs customer    # seed customer app only (port 4173)
     node scripts/seed.mjs owner       # seed owner app only (port 4174)
     node scripts/seed.mjs admin       # seed admin panel only (port 4175)
     node scripts/seed.mjs --force     # wipe + re-seed (otherwise idempotent:
                                       #   collections that already have data
                                       #   are left untouched)

   Run the built preview first with `npm run preview` in each app, or
   this script will boot short-lived preview servers automatically.
   ============================================================= */

import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const APPS = {
  customer: { dir: root, port: 4173 },
  owner: { dir: path.join(root, 'owner-app'), port: 4174 },
  admin: { dir: path.join(root, 'admin-panel'), port: 4175 },
};

const targets = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
const set = targets.length ? targets : ['customer', 'owner', 'admin'];

/* ------------------------- date helpers ------------------------------- */
function isoAdd(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
const sanitizeKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const iso = () => new Date().toISOString();

/* ------------------------- booking factory ---------------------------- */
let bkSeq = 1;
function booking(o) {
  const b = {
    id: `BK-DEMO-${String(bkSeq++).padStart(3, '0')}`,
    shopId: o.shopId,
    shopName: o.shopName,
    customerName: o.customerName,
    customerIdentifier: o.customerIdentifier,
    dateISO: o.dateISO,
    startMinute: o.startMinute,
    period: o.period,
    serviceId: o.serviceId,
    serviceName: o.serviceName,
    duration: o.duration,
    price: o.price,
    status: o.status,
    createdAt: o.createdAt,
  };
  if (o.advancePaid) b.advancePaid = true;
  if (o.paymentStatus) b.paymentStatus = o.paymentStatus;
  return b;
}

/* ── demo customers ──────────────────────────────────────────────────── */
const DEMO_CUSTOMERS = [
  { identifier: '+91 90000 10001', name: 'Ravi Kumar' },
  { identifier: '+91 90000 10002', name: 'Suraj Menon' },
  { identifier: '+91 90000 10003', name: 'Deepak Nair' },
  { identifier: '+91 90000 10004', name: 'Arun Prakash' },
  { identifier: '+91 90000 10005', name: 'Vivek Anand' },
  { identifier: 'priya@email.com', name: 'Priya Sharma' },
  { identifier: 'faheem@email.com', name: 'Faheem Ali' },
  { identifier: 'gopal@email.com', name: 'Gopal Krishnan' },
];

/* ------------------------- customer seed ------------------------------ */
function seedCustomer(page) {
  return page.evaluate(({ force, customers, bookings }) => {
    function read(k, fb) {
      try { return localStorage.getItem(k) ? JSON.parse(localStorage.getItem(k)) : fb; } catch { return fb; }
    }
    function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    const out = {};

    // users
    const users = read('pt_users', {});
    const hadUsers = Object.keys(users).length > 0;
    if (force || !hadUsers) {
      for (const c of customers) {
        const key = c.identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
        users[key] = {
          identifier: c.identifier,
          name: c.name,
          createdAt: new Date().toISOString(),
          id: 'usr-demo-' + key,
        };
      }
      write('pt_users', users);
      out.users = Object.keys(users).length;
    }

    // bookings
    const list = read('pt_bookings', []);
    if (force || list.length === 0) {
      write('pt_bookings', bookings);
      out.bookings = bookings.length;
    }
    return out;
  }, { force, customers: DEMO_CUSTOMERS, bookings: buildCustomerBookings() });
}

function buildCustomerBookings() {
  const rows = [];
  const svc = [
    { id: 'svc-classic', name: 'Classic Haircut', dur: 30, price: 150 },
    { id: 'svc-beard', name: 'Beard Trim & Shave', dur: 25, price: 100 },
    { id: 'svc-combo', name: 'Hair + Beard Combo', dur: 50, price: 240 },
    { id: 'svc-fade', name: 'Skin Fade & Design', dur: 30, price: 200 },
    { id: 'svc-colour', name: 'Hair Colouring', dur: 60, price: 500 },
  ];
  const shops = [
    { id: 'shop-kings', name: 'Kings Barber Studio' },
    { id: 'shop-elite', name: 'Elite Cuts' },
    { id: 'shop-grooming', name: 'The Grooming Lounge' },
  ];
  const cust = DEMO_CUSTOMERS;
  const now = new Date();
  const at = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };

  const mk = (i, days, h, m, status, paid) => {
    const s = svc[i % svc.length];
    return booking({
      shopId: shops[i % shops.length].id,
      shopName: shops[i % shops.length].name,
      customerName: cust[i % cust.length].name,
      customerIdentifier: cust[i % cust.length].identifier,
      dateISO: isoAdd(days),
      startMinute: h * 60 + m,
      period: h < 12 ? 'morning' : h < 16 ? 'afternoon' : 'evening',
      serviceId: s.id, serviceName: s.name, duration: s.dur, price: s.price,
      status, createdAt: at(days < 0 ? days : -2 - i, h, m),
      advancePaid: paid, paymentStatus: paid ? 'paid' : 'pending',
    });
  };

  rows.push(mk(1, 0, 10, 45, 'completed', true));
  rows.push(mk(2, -1, 11, 30, 'completed', true));
  rows.push(mk(3, 0, 9, 30, 'completed', true));
  rows.push(mk(4, 1, 12, 0, 'confirmed', true));
  rows.push(mk(5, 2, 15, 0, 'confirmed', false));
  rows.push(mk(6, 0, 10, 0, 'confirmed', true));
  rows.push(mk(7, 1, 18, 0, 'pending', false));
  rows.push(mk(8, 2, 9, 45, 'pending', false));
  rows.push(mk(0, -3, 14, 0, 'cancelled', false));
  rows.push(mk(1, -2, 17, 30, 'cancelled', false));
  rows.push(mk(2, -4, 10, 30, 'no-show', false));
  return rows;
}

/* ------------------------- owner seed --------------------------------- */
function seedOwner(page) {
  return page.evaluate(({ force, bookings, shopConfig }) => {
    function read(k, fb) {
      try { return localStorage.getItem(k) ? JSON.parse(localStorage.getItem(k)) : fb; } catch { return fb; }
    }
    function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    const out = {};

    const cfg = read('ow_shop_config', null);
    if (force || !cfg || !cfg.onboarded) {
      write('ow_shop_config', shopConfig);
      out.shop = true;
    }

    const list = read('pt_bookings', []);
    if (force || list.length === 0) {
      write('pt_bookings', bookings);
      out.bookings = bookings.length;
    }
    return out;
  }, { force, bookings: buildOwnerBookings(), shopConfig: buildOwnerShopConfig() });
}

function buildOwnerShopConfig() {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const workingHours = {};
  for (const d of days) {
    workingHours[d] = d === 'sun'
      ? { open: false, start: '09:00', end: '21:00' }
      : { open: true, start: '09:00', end: '21:00' };
  }
  return {
    id: 'ow-shop',
    name: 'Kings Barber Studio',
    shopType: 'barber shop',
    phone: '+91 98765 10001',
    address: '123 Main Road, Madukkarai, Coimbatore',
    description: 'Premium grooming studio offering classic cuts, beard styling and facials.',
    location: 'Coimbatore',
    area: 'Madukkarai',
    status: 'open',
    capacity: 3,
    bookingWindow: 30,
    cancellationHours: 2,
    workingHours,
    breaks: [
      { id: 'brk-lunch', label: 'Lunch Break', start: '13:00', end: '14:00' },
      { id: 'brk-tea', label: 'Tea Break', start: '16:00', end: '16:30' },
    ],
    services: [
      { id: 'svc-classic', name: 'Classic Cut', duration: 30, price: 150, active: true },
      { id: 'svc-beard', name: 'Beard Trim', duration: 25, price: 100, active: true },
      { id: 'svc-combo', name: 'Hair + Beard', duration: 50, price: 240, active: true },
      { id: 'svc-fade', name: 'Skin Fade', duration: 30, price: 200, active: true },
      { id: 'svc-colour', name: 'Hair Colour', duration: 60, price: 500, active: true },
    ],
    staff: [
      { id: 'barber-arjun', name: 'Arjun', role: 'Master Barber', years: 9, specialty: 'Skin fades, classic cuts' },
      { id: 'barber-ravi', name: 'Ravi', role: 'Beard Specialist', years: 6, specialty: 'Beard sculpting, hot-towel shaves' },
      { id: 'barber-vikram', name: 'Vikram', role: 'Styling & Colour', years: 8, specialty: 'Hair colouring, groom styling' },
    ],
    onboarded: true,
  };
}

function buildOwnerBookings() {
  const rows = [];
  const shop = { id: 'ow-shop', name: 'Kings Barber Studio' };
  const svc = [
    { serviceId: 'svc-classic', serviceName: 'Classic Cut', duration: 30, price: 150 },
    { serviceId: 'svc-beard', serviceName: 'Beard Trim', duration: 25, price: 100 },
    { serviceId: 'svc-combo', serviceName: 'Hair + Beard', duration: 50, price: 240 },
    { serviceId: 'svc-fade', serviceName: 'Skin Fade', duration: 30, price: 200 },
    { serviceId: 'svc-colour', serviceName: 'Hair Colour', duration: 60, price: 500 },
  ];
  const cust = DEMO_CUSTOMERS;
  const at = (days, h, m) => { const d = new Date(); d.setDate(d.getDate() + days); d.setHours(h, m, 0, 0); return d.toISOString(); };

  // confirmed / completed
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[0].name, customerIdentifier: cust[0].identifier, dateISO: isoAdd(0), startMinute: 9 * 60 + 30, period: 'morning', ...svc[0], status: 'confirmed', createdAt: at(-1, 9, 0), advancePaid: true, paymentStatus: 'paid' }));
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[1].name, customerIdentifier: cust[1].identifier, dateISO: isoAdd(0), startMinute: 10 * 60 + 0, period: 'morning', ...svc[3], status: 'confirmed', createdAt: at(-1, 9, 10), advancePaid: true, paymentStatus: 'paid' }));
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[2].name, customerIdentifier: cust[2].identifier, dateISO: isoAdd(0), startMinute: 11 * 60 + 0, period: 'morning', ...svc[1], status: 'confirmed', createdAt: at(-1, 9, 20), advancePaid: false }));
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[3].name, customerIdentifier: cust[3].identifier, dateISO: isoAdd(1), startMinute: 12 * 60 + 0, period: 'afternoon', ...svc[2], status: 'confirmed', createdAt: at(0, 9, 5), advancePaid: true, paymentStatus: 'paid' }));
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[4].name, customerIdentifier: cust[4].identifier, dateISO: isoAdd(-1), startMinute: 15 * 60 + 0, period: 'afternoon', ...svc[4], status: 'completed', createdAt: at(-3, 10, 0), advancePaid: true, paymentStatus: 'paid' }));
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[5].name, customerIdentifier: cust[5].identifier, dateISO: isoAdd(-2), startMinute: 17 * 60 + 0, period: 'evening', ...svc[0], status: 'completed', createdAt: at(-4, 10, 0), advancePaid: true, paymentStatus: 'paid' }));

  // pending — ready to allocate
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[6].name, customerIdentifier: cust[6].identifier, dateISO: isoAdd(2), startMinute: null, period: 'morning', ...svc[1], status: 'pending', createdAt: at(0, 8, 40), advancePaid: false, paymentStatus: 'pending' }));
  rows.push(booking({ ...shop, shopId: shop.id, shopName: shop.name, customerName: cust[7].name, customerIdentifier: cust[7].identifier, dateISO: isoAdd(2), startMinute: null, period: 'morning', ...svc[0], status: 'pending', createdAt: at(0, 8, 50), advancePaid: false, paymentStatus: 'pending' }));
  return rows;
}

/* ------------------------- admin seed --------------------------------- */
function seedAdmin(page) {
  return page.evaluate(({ force, customers, shops, issues, bookings }) => {
    function read(k, fb) {
      try { return localStorage.getItem(k) ? JSON.parse(localStorage.getItem(k)) : fb; } catch { return fb; }
    }
    function write(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    const out = {};

    // shared pt_* so admin stats/booking list/customers are filled
    const users = read('pt_users', {});
    if (force || Object.keys(users).length === 0) {
      for (const c of customers) {
        const key = c.identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
        users[key] = { identifier: c.identifier, name: c.name, createdAt: new Date().toISOString(), id: 'usr-demo-' + key };
      }
      write('pt_users', users);
      out.users = Object.keys(users).length;
    }
    const blist = read('pt_bookings', []);
    if (force || blist.length === 0) {
      write('pt_bookings', bookings);
      out.bookings = bookings.length;
    }

    // admin-managed shops
    const sh = read('admin_shops', []);
    if (force || sh.length === 0) {
      write('admin_shops', shops);
      out.shops = shops.length;
    }

    // admin-managed issues
    const iss = read('admin_issues', []);
    if (force || iss.length === 0) {
      write('admin_issues', issues);
      out.issues = issues.length;
    }
    return out;
  }, { force, customers: DEMO_CUSTOMERS, shops: buildAdminShops(), issues: buildAdminIssues(), bookings: buildCustomerBookings() });
}

function buildAdminShops() {
  const now = new Date().toISOString();
  const mk = (name, owner, phone, loc, address, type, status) => ({
    id: 'shop-' + sanitizeKey(name.replace(/[^a-zA-Z]/g, '')),
    name, ownerName: owner, ownerPhone: phone, location: loc, address,
    type, status, createdAt: now,
    description: `${name} — a ${type === 'salon' ? 'modern salon' : 'premium barbershop'} serving the ${loc} area.`,
  });
  return [
    mk('Kings Barber Studio', 'Arjun', '+91 98765 10001', 'Coimbatore', '123 Main Road, Madukkarai', 'barber', 'active'),
    mk('Elite Cuts', 'Ravi', '+91 98765 10002', 'Coimbatore', '45 Gandhi Street, Thirumalayampalayam', 'salon', 'active'),
    mk('The Grooming Lounge', 'Vikram', '+91 98765 10003', 'Coimbatore', '8 Park Avenue, Gandhipuram', 'salon', 'active'),
    mk('Sharp Cuts Studio', 'Imran', '+91 98765 10004', 'Coimbatore', '22 Cross Cut Road, Peelamedu', 'barber', 'pending'),
    mk('Regal Gents Salon', 'Sameer', '+91 98765 10005', 'Coimbatore', '5 Avinashi Road, Gandhipuram', 'salon', 'pending'),
    mk('Urban Chops', 'Dev', '+91 98765 10006', 'Coimbatore', '77 NSR Road, Saibaba Colony', 'barber', 'suspended'),
    mk('Gentleman’s Groom', 'Hari', '+91 98765 10007', 'Coimbatore', '14 Lakshmi Mills, Ramanathapuram', 'barber', 'inactive'),
  ];
}

function buildAdminIssues() {
  const d = iso();
  const mk = (reportedBy, type, relatedBooking, shopId, status, notes) => ({
    id: 'iss-demo-' + String(Math.random()).slice(2, 7),
    reportedBy, type, relatedBooking, shopId,
    status, createdDate: d, notes,
  });
  return [
    mk('Ravi Kumar', 'booking', 'BK-DEMO-001', 'shop-KingsBarberStudio', 'open', 'Requested a later slot than the one allocated.'),
    mk('Suraj Menon', 'refund', 'BK-DEMO-002', 'shop-KingsBarberStudio', 'in_progress', 'Asked for a refund on the advance paid.'),
    mk('Deepak Nair', 'general', '', 'shop-EliteCuts', 'open', 'Wants to know if the shop does appointments on Sundays.'),
    mk('Priya Sharma', 'payment', 'BK-DEMO-004', 'shop-RegalGentsSalon', 'resolved', 'Advance payment not reflecting in the app. Resolved.'),
    mk('Faheem Ali', 'feedback', '', 'shop-TheGroomingLounge', 'open', 'Great service — requests a loyalty discount.'),
    mk('Gopal Krishnan', 'technical', '', '', 'in_progress', 'Page does not load the confirm screen on the app.'),
  ];
}

/* ------------------------- runner -------------------------------------- */
function log(port, label, data) {
  console.log(`  [${label} @ :${port}] users=${data.users ?? '-'} bookings=${data.bookings ?? '-'} shops=${data.shops ?? '-'} issues=${data.issues ?? '-'} shop=${data.shop ?? '-'}`);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  console.log(`Mock data seeder — force=${force} targets=[${set.join(', ')}]\n`);

  for (const name of set) {
    const app = APPS[name];
    if (!app) { console.log(`  ! unknown target "${name}" (use customer|owner|admin|all)\n`); continue; }
    let server;
    try {
      server = await preview({ root: app.dir, preview: { port: app.port, strictPort: true }, logLevel: 'error' });
    } catch (e) {
      console.log(`  ! could not start preview for ${name}: ${e.message}\n`);
      continue;
    }
    const base = `http://localhost:${app.port}`;
    try {
      const page = await browser.newPage();
      await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(400);
      let result;
      if (name === 'customer') result = await seedCustomer(page);
      else if (name === 'owner') result = await seedOwner(page);
      else result = await seedAdmin(page);
      log(app.port, name, result);
      await page.close();
    } catch (e) {
      console.log(`  ! ${name} seeding failed: ${e.message}\n`);
    }
    try { await server.close(); } catch {}
  }

  await browser.close();
  console.log('\nDone. Open each app to see the populated panels.');
  console.log('  Customer: http://localhost:4173   Owner: http://localhost:4174   Admin: http://localhost:4175');
}

await run();
