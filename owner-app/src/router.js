/* =============================================================
   Ordinens Tech — Owner App Router
   Hash-based routing matching the customer-app architecture.
   ============================================================= */
import { requiresOwner, isOwner } from './auth.js';

const OWNER_ROUTES = [
  'dashboard',
  'onboarding',
  'bookings',
  'calendar',
  'services',
  'holidays',
  'shop',
  'reviews',
  'settings',
];

const META = {
  login:       'Login — Ordinens Tech Owner',
  dashboard:   'Dashboard — Ordinens Tech Owner',
  onboarding:  'Shop Setup — Ordinens Tech Owner',
  bookings:    'Bookings — Ordinens Tech Owner',
  calendar:    'Calendar — Ordinens Tech Owner',
  services:    'Services — Ordinens Tech Owner',
  holidays:    'Holidays — Ordinens Tech Owner',
  shop:        'Shop Settings — Ordinens Tech Owner',
  reviews:     'Reviews — Ordinens Tech Owner',
  settings:    'Settings — Ordinens Tech Owner',
};

// Lazy-loaded page controllers
const CONTROLLERS = {
  login:      () => import('./pages/login.js').then(m => m.default),
  dashboard:  () => import('./pages/dashboard.js').then(m => m.default),
  onboarding: () => import('./pages/onboarding.js').then(m => m.default),
  bookings:   () => import('./pages/bookings.js').then(m => m.default),
  calendar:   () => import('./pages/calendar.js').then(m => m.default),
  services:   () => import('./pages/services.js').then(m => m.default),
  holidays:   () => import('./pages/holidays.js').then(m => m.default),
  shop:       () => import('./pages/shop.js').then(m => m.default),
  reviews:    () => import('./pages/reviews.js').then(m => m.default),
  settings:   () => import('./pages/settings.js').then(m => m.default),
};

export function getRoute() {
  const raw = location.hash.replace(/^#\/?/, '').toLowerCase();
  if (!raw || raw === '/') return 'dashboard';
  if (raw === 'login') return 'login';
  if (OWNER_ROUTES.includes(raw)) return raw;
  return 'dashboard';
}

export function navigate(hash) {
  location.hash = hash;
}

export async function handleRoute() {
  const route = getRoute();

  // Normalise unknown / removed routes (e.g. #barbers) to the real dashboard URL.
  const canonical = location.hash.replace(/^#\/?/, '').toLowerCase();
  if (route === 'dashboard' && canonical !== '' && canonical !== 'dashboard') {
    location.hash = '#dashboard';
    return;
  }

  document.title = META[route] || META.dashboard;

  // Close any open modal before switching pages (backdrops live on <body>).
  document.querySelectorAll('.ow-modal-backdrop').forEach(el => el.remove());

  const loader = document.getElementById('ow-loader');

  // Fresh #app on every navigation so leftover page-level delegated listeners
  // (e.g. Dashboard's [data-booking-id] handler) are discarded with the old node.
  const oldApp = document.getElementById('app');
  const app = document.createElement('main');
  app.id = 'app';
  app.className = 'page';
  app.tabIndex = -1;
  app.setAttribute('aria-label', 'Main content');
  oldApp.replaceWith(app);

  // Auth guard: redirect to login if not authenticated (except login route itself)
  if (route !== 'login' && requiresOwner()) {
    location.hash = '#login';
    return;
  }

  // If logged in and on login page, redirect to appropriate page
  if (route === 'login' && isOwner()) {
    const config = await import('./data.js').then(m => m.getShopConfig());
    location.hash = config.onboarded ? '#dashboard' : '#onboarding';
    return;
  }

  updateNav(route);

  if (loader) loader.hidden = false;
  try {
    app.innerHTML = '';
    app.classList.remove('ow-fade-in');

    const ctrl = CONTROLLERS[route];
    if (ctrl) {
      const mod = await ctrl();
      if (typeof mod === 'function') mod(app);
      else if (typeof mod.mount === 'function') mod.mount(app);
    }

    void app.offsetWidth;
    app.classList.add('ow-fade-in');
  } catch (err) {
    console.error('Owner route error:', err);
    app.innerHTML = '<p class="ow-error">Something went wrong loading this page.</p>';
  } finally {
    if (loader) loader.hidden = true;
  }
}

function updateNav(route) {
  const links = document.querySelectorAll('[data-ow-route]');
  links.forEach(a => {
    const active = a.dataset.owRoute === route;
    a.classList.toggle('active', active);
    a.setAttribute('aria-current', active ? 'page' : 'false');
  });
}
