const pageHTML = import.meta.glob('./pages/*.html', { query: '?raw', import: 'default', eager: true });
const adminHTML = import.meta.glob('./admin/*.html', { query: '?raw', import: 'default', eager: true });

const controllers = {
  home: () => import('./pages/home.js').then((m) => m.default),
  shop: () => import('./pages/shop.js').then((m) => m.default),
  bookings: () => import('./pages/bookings.js').then((m) => m.default),
  profile: () => import('./pages/profile.js').then((m) => m.default),
  settings: () => import('./pages/settings.js').then((m) => m.default),
  booking: () => import('./pages/booking.js').then((m) => m.default),
  confirmation: () => import('./pages/confirmation.js').then((m) => m.default),
  login: () => import('./pages/login.js').then((m) => m.default),
  admin: () => import('./admin/admin.js').then((m) => m.default),
};

const META = {
  home: ['Ordinens Tech — Book your barber online'],
  shop: ['Shop Details — Ordinens Tech'],
  bookings: ['My Bookings — Ordinens Tech'],
  profile: ['My Profile — Ordinens Tech'],
  settings: ['Settings — Ordinens Tech'],
  booking: ['Book a Slot — Ordinens Tech'],
  confirmation: ['Booking Confirmed — Ordinens Tech'],
  login: ['Sign In — Ordinens Tech'],
  admin: ['Admin Panel — Ordinens Tech'],
  'admin/services': ['Admin / Services — Ordinens Tech'],
  'admin/staff': ['Admin / Barbers — Ordinens Tech'],
  'admin/bookings': ['Admin / Bookings — Ordinens Tech'],
};

const DESCRIPTIONS = {
  home: 'Skip the queue. Book a barber and slot at Ordinens Tech.',
  booking: 'Reserve a service, barber, date and time slot in under a minute.',
  admin: 'Ordinens Tech admin dashboard — services, barbers and bookings.',
};

function normalize(hash) {
  const raw = hash.replace(/^#\/?/, '').toLowerCase();
  const known = Object.keys(META);
  if (raw === '' || raw === '/') return 'home';
  if (known.includes(raw)) return raw;
  if (raw.startsWith('shop/')) return 'shop';
  const adminChild = ['admin/services', 'admin/staff', 'admin/bookings'];
  if (adminChild.includes(raw)) return raw;
  return 'home';
}

export function getRoute() {
  return normalize(location.hash);
}

function setMeta(route) {
  document.title = META[route] || META.home;
  const desc = document.querySelector('meta[name="description"]');
  if (desc && DESCRIPTIONS[route]) desc.setAttribute('content', DESCRIPTIONS[route]);
}

export function navigate(hash) {
  location.hash = hash;
}

export async function handleRoute() {
  const app = document.getElementById('app');
  const loader = document.getElementById('loader');

  const route = getRoute();
  setMeta(route);

  const isAdmin = route.startsWith('admin');

  if (loader) loader.hidden = false;
  try {
    const adminFile = route === 'admin' ? 'dashboard' : route.split('/')[1];
    const html = isAdmin ? adminHTML[`./admin/${adminFile}.html`] : pageHTML[`./pages/${route}.html`];

    if (route === 'confirmation' && !sessionStorage.getItem('pt_last_booking')) {
      location.hash = '#home';
      return;
    }

    app.innerHTML = html || '<p>Page not found.</p>';
    app.classList.remove('fade-in');
    void app.offsetWidth;
    app.classList.add('fade-in');

    updateNav(route);
    updateAuthChip();

    if (controllers[route]) {
      const ctrl = await controllers[route]();
      if (typeof ctrl.mount === 'function') ctrl.mount(app);
      else ctrl(app);
    } else if (isAdmin && controllers.admin) {
      const ctrl = await controllers.admin();
      if (typeof ctrl.mount === 'function') ctrl.mount(app);
      else ctrl(app);
    }
  } catch (err) {
    console.error('Route error:', err);
    app.innerHTML = '<p>Something went wrong loading this page.</p>';
  } finally {
    if (loader) loader.hidden = true;
  }
}

function updateNav(route) {
  const links = document.querySelectorAll('.bottom-nav a[data-route]');
  primaryRoute = route === 'home' ? 'home' : route.split('/')[0];
  links.forEach((a) => {
    const active = a.dataset.route === primaryRoute;
    a.classList.toggle('active', active);
    a.setAttribute('aria-current', active ? 'page' : 'false');
  });
}

export function updateAuthChip() {
  const chip = document.getElementById('auth-chip');
  if (!chip) return;
  // populated by auth.js/header sync in app.js
  const evt = new CustomEvent('pt:userchange');
  document.dispatchEvent(evt);
}

let primaryRoute = 'home';