import puppeteer from 'puppeteer-core';
import path from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const server = await preview({
  root: path.join(root, 'owner-app'),
  preview: { port: 4175, strictPort: true },
  logLevel: 'error',
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: 'new', args:['--no-sandbox','--disable-gpu'] });
const p = await b.newPage();
await p.setViewport({width:1280,height:900});
await p.goto('http://localhost:4175/#login', {waitUntil:'networkidle0'});
await p.waitForSelector('#ow-pass');
await p.type('#ow-pass','owner123');
await p.click('#ow-login-submit');
await p.waitForFunction(()=>location.hash==='#onboarding');
await p.waitForSelector('#sd-name');
await p.type('#sd-name','Romeo Barber Studio');
await p.type('#sd-phone','+91 98765 40001');
await p.type('#sd-address','12 Gandhi St, Coimbatore');
await p.click('#wiz-next');
await p.waitForFunction(()=> (document.querySelector('.ow-wizard-step-num')?.textContent||'').includes('Step 2'));
await p.click('#wiz-next');
await p.waitForFunction(()=> (document.querySelector('.ow-wizard-step-num')?.textContent||'').includes('Step 3'));
await p.click('#wiz-skip');
await p.waitForFunction(()=> (document.querySelector('.ow-wizard-step-num')?.textContent||'').includes('Step 4'));
await p.click('#wiz-next');
await p.waitForFunction(()=> (document.querySelector('.ow-wizard-step-num')?.textContent||'').includes('Step 5'));
console.log('step 5 - next rect', await p.evaluate(()=>{const el=document.querySelector('#wiz-next'); const r=el.getBoundingClientRect(); return JSON.stringify({t:r.top,l:r.left,b:r.bottom,w:r.width,h:r.height});}));
console.log('step 5 - drawer rect', await p.evaluate(()=>{const el=document.querySelector('#ow-more-drawer'); const r=el.getBoundingClientRect(); return JSON.stringify({t:r.top,b:r.bottom,left:r.left,right:r.right});}));
console.log('scrollY', await p.evaluate(()=>window.scrollY));
console.log('pl at next center', await p.evaluate(()=>{const el=document.querySelector('#wiz-next'); const r=el.getBoundingClientRect(); const at=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2); return at? at.tagName+'.'+(at.className||at.id) : 'none';}));
await b.close();
server.close();