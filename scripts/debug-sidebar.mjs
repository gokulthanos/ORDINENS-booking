import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({
  root: path.join(root, 'owner-app'),
  preview: { port: 4177, strictPort: true },
  logLevel: 'error',
});

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:4177';

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.setDefaultTimeout(10000);
await page.setViewport({ width: 1280, height: 900 });

await page.goto(BASE + '/#dashboard', { waitUntil: 'networkidle0' });
await sleep(400);

const dump = await page.evaluate(() => {
  const nav = document.querySelector('#ow-sidebar-nav');
  const shell = document.querySelector('#ow-shell');
  return {
    navExists: !!nav,
    navHtml: nav ? nav.outerHTML.slice(0, 2000) : null,
    sidebarHidden: document.querySelector('#ow-sidebar')?.hasAttribute('hidden') ?? null,
    sidebarOuter: document.querySelector('#ow-sidebar')?.outerHTML.slice(0, 1500) ?? null,
    shellHasNav: shell ? (/ow-sidebar-nav/.test(shell.innerHTML)) : null,
    locationHash: location.hash,
  };
});
const rawHtml = await (await fetch(BASE + '/index.html')).text();
const servedHasNav = /ow-sidebar-nav/.test(rawHtml);
console.log(JSON.stringify({ dump, rawHtmlHasNav: servedHasNav, rawHtmlIncludesBarbers: /barbers/i.test(rawHtml) }, null, 2));
console.log(JSON.stringify(dump, null, 2));

await browser.close();
await server.close();
process.exit(0);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }