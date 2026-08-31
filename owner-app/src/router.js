/* =============================================================
   Ordinens Tech — Owner App Router
   Hash-based routing matching the customer-app architecture.
   ============================================================= */
import { isOwner } from './auth.js';

const OWNER_ROUTES = [
  'login',
  'dashboard',
  'onboarding',
  'bookings',
  'calendar',
  'services',
  'barbers',
  'shop',
  'reviews',
  'settings',
];

const PROTECTED = ['dashboard','onboarding','bookings','calendar','services','barbers','shop','reviews','settings'];

const META = {
  login:       'Sign In — Ordinens Tech Owner',
  dashboard:   'Dashboard — Ordinens Tech Owner',
  onboarding:  'Shop Setup — Ordinens Tech Owner',
  bookings:    'Bookings — Ordinens Tech Owner',
  calendar:    'Calendar — Ordinens Tech Owner',
  services:    'Services — Ordinens Tech Owner',
  barbers:     'Barbers — Ordinens Tech Owner',
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
  barbers:    () => import('./pages/barbers.js').then(m => m.default),
  shop:       () => import('./pages/shop.js').then(m => m.default),
  reviews:    () => import('./pages/reviews.js').then(m => m.default),
  settings:   () => import('./pages/settings.js').then(m => m.default),
};

export function getRoute() {
  const raw = location.hash.replace(/^#\/?/, '').toLowerCase();
  if (!raw || raw === '/') return 'dashboard';
  if (OWNER_ROUTES.includes(raw)) return raw;
  return 'dashboard';
}

export function navigate(hash) {
  location.hash = hash;
}

export async function handleRoute() {
  const route = getRoute();
  document.title = META[route] || META.dashboard;

  // Auth guard
  if (PROTECTED.includes(route) && !isOwner()) {
    location.hash = '#login';
    return;
  }

  // Hide onboarding guard check is handled inside dashboard
  const app = document.getElementById('app');
  const loader = document.getElementById('ow-loader');

  updateNav(route);

  // Show/hide shell elements
  const sidebar = document.getElementById('ow-sidebar');
  const bottomNav = document.getElementById('ow-bottom-nav');
  const isLoginRoute = route === 'login';
  if (sidebar) sidebar.hidden = isLoginRoute;
  if (bottomNav) bottomNav.hidden = isLoginRoute;

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
