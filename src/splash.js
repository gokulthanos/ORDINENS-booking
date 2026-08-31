import logoMark from './assets/logo.png';
import logoFull from './assets/ordinens_tech.png';

const PARTICLE_COLORS = ['#38b6ff', '#7c5cff', '#ff5ca8', '#5ad29a'];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function reduceMotionPref() {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function createParticles(container) {
  if (!container || reduceMotionPref()) return;
  const count = 14;
  const fragment = document.createDocumentFragment();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.42;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'splash-particle';
    const size = 3 + Math.random() * 4;
    const x = window.innerWidth * (0.12 + Math.random() * 0.76);
    const y = window.innerHeight * (0.14 + Math.random() * 0.78);
    const tx = (cx - x) * (0.08 + Math.random() * 0.12);
    const ty = (cy - y) * (0.08 + Math.random() * 0.12);
    p.style.left = `${x.toFixed(1)}px`;
    p.style.top = `${y.toFixed(1)}px`;
    p.style.width = `${size.toFixed(1)}px`;
    p.style.height = `${size.toFixed(1)}px`;
    p.style.background = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    p.style.setProperty('--tx', `${tx.toFixed(1)}px`);
    p.style.setProperty('--ty', `${ty.toFixed(1)}px`);
    p.style.setProperty('--po', (0.2 + Math.random() * 0.3).toFixed(2));
    p.style.setProperty('--pd', `${(Math.random() * 0.35).toFixed(2)}s`);
    fragment.appendChild(p);
  }
  container.appendChild(fragment);
}

function resolveAssets() {
  const mark = document.getElementById('splash-mark');
  const brand = document.getElementById('splash-brand');
  let markOnFull = false;

  if (mark) {
    mark.onerror = () => {
      if (!markOnFull) {
        markOnFull = true;
        mark.src = logoFull;
        if (brand) brand.classList.add('splash-hide-img');
      } else {
        mark.classList.add('splash-hide-img');
      }
    };
    mark.src = logoMark;
  }

  if (brand) {
    brand.onerror = () => brand.classList.add('splash-hide-img');
    brand.src = logoFull;
  }
}

export function runSplash(opts = {}) {
  const splash = document.getElementById('splash');
  if (!splash) {
    opts.onVisible?.();
    return Promise.resolve();
  }

  const reduced = reduceMotionPref();
  document.body.classList.add('splash-open');

  if (reduced) {
    document.body.classList.add('reduced-motion');
  }

  createParticles(document.getElementById('splash-particles'));
  resolveAssets();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => splash.classList.add('running'));
  });

  // Timeline (normal):
  //   0.20s  logo.png fades in
  //   0.82s  ORDINENS TECH text rises
  //   1.40s  logo + text fade out
  //   1.85s  ordinens_tech.png fades in
  //   2.20s  "Booking powered by" text rises
  //   2.42s  loading bar appears + fills
  //   2.60s  app initialized (onVisible)
  //   3.10s  splash begins leaving
  const revealMs = reduced ? 250 : 2600;
  const exitMs   = reduced ? 650 : 3100;

  return (async () => {
    await wait(revealMs);
    splash.style.pointerEvents = 'none';
    opts.onVisible?.();
    await wait(exitMs - revealMs);
    splash.classList.add('leaving');
    await wait(460);
    splash.remove();
    document.body.classList.remove('splash-open');
    document.body.classList.remove('reduced-motion');
  })();
}