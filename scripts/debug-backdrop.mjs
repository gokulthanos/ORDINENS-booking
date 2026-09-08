import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({ root: path.join(root, 'owner-app'), preview: { port: 4179, strictPort: true }, logLevel: 'error' });

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4179';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
await page.setViewport({ width: 1280, height: 900 });

await page.goto(BASE + '/#login', { waitUntil: 'networkidle0' });
await page.type('#ow-pass', 'owner123');
await page.click('#ow-login-submit');
await sleep(400);

// Go to services and dump any .ow-modal-backdrop
await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await sleep(400);
const dump = await page.evaluate(() => {
  const ads = [...document.querySelectorAll('.ow-modal-backdrop')];
  const btn = document.querySelector('#add-svc-btn');
  const br = btn?.getBoundingClientRect();
  return {
    backdrops: ads.map(a => ({
      id: a.id,
      hidden: a.hasAttribute('hidden'),
      display: getComputedStyle(a).display,
      pointerEvents: getComputedStyle(a).pointerEvents,
      rect: (() => { const r = a.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; })(),
    })),
    btnCenter: br ? { x: Math.round(br.left + br.width / 2), y: Math.round(br.top + br.height / 2) } : null,
    atBtnCenter: (() => { const bt = document.querySelector('#add-svc-btn'); if (!bt) return null; const r = bt.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el ? el.tagName + '.' + (typeof el.className === 'string' ? el.className : '') : 'none'; })(),
    cssDisplayRule: [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }).filter(r => r.selectorText && r.selectorText.includes('modal-backdrop')).map(r => r.selectorText + ' { ' + r.style.cssText + ' }'),
  };
});
console.log(JSON.stringify(dump, null, 2));

await browser.close();
await server.close();
process.exit(0);