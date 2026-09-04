import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({ root: path.join(root, 'owner-app'), preview: { port: 4180, strictPort: true }, logLevel: 'error' });
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4180';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
await page.setViewport({ width: 375, height: 812 });

await page.goto(BASE + '/#login', { waitUntil: 'networkidle0' });
await page.type('#ow-pass', 'owner123');
await page.click('#ow-login-submit');
await sleep(400);

await page.goto(BASE + '/#services', { waitUntil: 'networkidle0' });
await page.waitForSelector('#add-svc-btn');
await sleep(400);

const info = await page.evaluate(() => {
  const vw = window.innerWidth;
  const offenders = [];
  const all = document.querySelectorAll('*');
  for (const el of all) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      offenders.push({
        tag: el.tagName,
        id: el.id,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
      });
    }
    if (offenders.length > 25) break;
  }
  return {
    vw,
    scrollW: document.documentElement.scrollWidth,
    offenders,
    bodyStyle: document.body.getAttribute('style'),
    computed: {
      owShell: (() => { const el = document.querySelector('#ow-shell'); const s = getComputedStyle(el); return { display: s.display, w: el.getBoundingClientRect().width, minW: s.minWidth, scrollW: el.scrollWidth }; })(),
      owMain: (() => { const el = document.querySelector('#ow-main'); const s = getComputedStyle(el); return { display: s.display, w: el.getBoundingClientRect().width, marginL: s.marginLeft, minW: s.minWidth, maxW: s.maxWidth, scrollW: el.scrollWidth, clientW: el.clientWidth }; })(),
      app: (() => { const el = document.querySelector('#app'); const s = getComputedStyle(el); return { display: s.display, w: el.getBoundingClientRect().width, minW: s.minWidth, maxW: s.maxWidth, padding: s.padding, scrollW: el.scrollWidth, clientW: el.clientWidth, ow: el.scrollWidth > el.clientWidth }; })(),
      header: (() => { const el = document.querySelector('.ow-page-header'); const s = getComputedStyle(el); return { display: s.display, flexWrap: s.flexWrap, w: el.getBoundingClientRect().width, minW: s.minWidth, padding: s.padding }; })(),
      tableWrap: (() => { const el = document.querySelector('.ow-table-wrap'); const s = getComputedStyle(el); return { w: el.getBoundingClientRect().width, overflowX: s.overflowX, minW: s.minWidth, scrollW: el.scrollWidth, clientW: el.clientWidth }; })(),
      table: (() => { const el = document.querySelector('.ow-table'); const s = getComputedStyle(el); return { w: el.getBoundingClientRect().width, minW: s.minWidth, scrollW: el.scrollWidth }; })(),
      sidebar: (() => { const el = document.querySelector('#ow-sidebar'); const s = getComputedStyle(el); return { display: s.display, w: el.getBoundingClientRect().width }; })(),
    },
  };
});
console.log(JSON.stringify(info, null, 2));

await browser.close();
await server.close();
process.exit(0);