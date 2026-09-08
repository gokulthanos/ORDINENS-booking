import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({
  root: path.join(root, 'owner-app'),
  preview: { port: 4178, strictPort: true },
  logLevel: 'error',
});

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4178';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
await page.setViewport({ width: 1280, height: 900 });

await page.goto(BASE + '/#dashboard', { waitUntil: 'networkidle0' });
await sleep(300);
await page.evaluate(() => {
  localStorage.setItem('ow_auth', 'true');
  const wh = {};
  for (const d of ['mon','tue','wed','thu','fri','sat','sun']) wh[d] = { open: d !== 'sun', start: '09:00', end: '21:00' };
  localStorage.setItem('ow_shop_config', JSON.stringify({ id: 'ow-shop', name: 'Romeo Barber Studio', onboarded: true, status: 'open', capacity: 3, appointments: 30, slotDuration: 15, workingHours: wh, breaks: [] }));
  const d = new Date(); d.setDate(d.getDate() + 1); while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  const iso = d.toISOString().split('T')[0];
  const bk = { id: 'BK-T-1', shopId: 'ow-shop', shopName: 'Romeo Barber Studio', period: 'morning', serviceId: 'svc-classic', serviceName: 'Classic Haircut', duration: 30, price: 150, dateISO: iso, customerName: 'Ravi Kumar', customerIdentifier: 'ravi@example.com', status: 'pending', startMinute: null, createdAt: new Date().toISOString() };
  localStorage.setItem('pt_bookings', JSON.stringify([bk]));
});

await page.goto(BASE + '/#bookings', { waitUntil: 'networkidle0' });
await page.waitForSelector('.ow-booking-row');
await page.evaluate(() => {
  const el = document.querySelector('.ow-booking-row');
  el.scrollIntoView({ block: 'center' });
});
await sleep(250);
// open modal via real click
const r = await page.evaluate(() => {
  const el = document.querySelector('.ow-booking-row');
  const rc = el.getBoundingClientRect();
  return { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 };
});
await page.mouse.click(r.x, r.y);
await page.waitForSelector('.ow-time-chip');
await sleep(100);

for (let attempt = 0; attempt < 5; attempt++) {
  const info = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('.ow-time-chip')];
    const rows = chips.map((el) => {
      const rc = el.getBoundingClientRect();
      const at = document.elementFromPoint(rc.left + rc.width / 2, rc.top + rc.height / 2);
      return {
        text: el.textContent,
        selected: el.classList.contains('selected'),
        rect: { l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) },
        centerInside: at ? el.contains(at) : false,
        atDesc: at ? at.tagName + '.' + (typeof at.className === 'string' ? at.className : '') : 'none',
        modalScroll: document.querySelector('.ow-modal')?.scrollTop,
        modalRect: (() => { const m = document.querySelector('.ow-modal').getBoundingClientRect(); return { t: Math.round(m.top), h: Math.round(m.height) }; })(),
      };
    });
    return { rows, viewportH: innerHeight };
  });
  console.log('attempt', attempt, JSON.stringify(info, null, 1));
  await sleep(200);
}

await browser.close();
await server.close();
process.exit(0);