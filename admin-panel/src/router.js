/* =============================================================
   Ordinens Tech — Admin Panel Router
   Dedicated hash router. All #admin/* routes REQUIRE an admin
   session. Unauthenticated access is redirected to #admin-login.
   ============================================================= */
import { mountDashboard } from './pages/dashboard/dashboard.js';
import { mountCustomers } from './pages/customers/customers.js';
import { mountShops } from './pages/shops/shops.js';
import { mountBarbers } from './pages/barbers/barbers.js';
import { mountServices } from './pages/services/services.js';
import { mountBookings } from './pages/bookings/bookings.js';
import { mountPayments } from './pages/payments/payments.js';
import { mountIssues } from './pages/issues/issues.js';
import { mountReports } from './pages/reports/reports.js';
import { mountSettings } from './pages/settings/settings.js';
import { renderShell, showSidebar, hideSidebar } from './shell.js';

const APP_ROUTES = {
  dashboard: { title: 'Dashboard', mount: mountDashboard },
  customers: { title: 'Customers', mount: mountCustomers },
  shops: { title: 'Shops', mount: mountShops },
  barbers: { title: 'Barbers', mount: mountBarbers },
  services: { title: 'Services', mount: mountServices },
  bookings: { title: 'Bookings', mount: mountBookings },
  payments: { title: 'Payments', mount: mountPayments },
  issues: { title: 'Issues', mount: mountIssues },
  reports: { title: 'Reports', mount: mountReports },
  settings: { title: 'Settings', mount: mountSettings },
};

export function navigate(hash) {
  location.hash = hash;
}

/**
 * Resolve the current hash to an app route key.
 * Recognised patterns:
 *   #admin                 -> dashboard
 *   #admin/bookings        -> bookings
 *   #admin/bookings/:id    -> bookings detail (handled by page)
 *   #admin/shops/:id       -> shops detail (handled by page)
 *   #admin/customers/:id   -> customers detail
 */
export function currentRoute() {
  const hash = location.hash.replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  if (parts[0] !== 'admin') return null;
  if (parts.length === 1) return { key: 'dashboard', parts };
  return { key: parts[1], parts };
}

export function handleRoute() {
  hideSidebar();
  const route = currentRoute();

  // Public route: admin login
  if (!route || location.hash === '#admin-login') {
    if (isAdmin()) {
      // Already signed in — drop a stray login hash to dashboard
      if (!route) {
        navigate('#admin');
        return;
      }
    }
    document.getElementById('app').innerHTML = '';
    mountLogin();
    return;
  }

  // Any other #admin/* route requires an admin session (role guard)
  if (!isAdmin()) {
    navigate('#admin-login');
    return;
  }

  const def = APP_ROUTES[route.key];
  if (!def) {
    // Unknown admin route -> dashboard
    navigate('#admin');
    return;
  }

  renderShell(def.title);
  showSidebar(def.key);
  setActiveNav(route.key);
  setHeaderTitle(def.title);
  def.mount(route.parts);
}

export function setHeaderTitle(title) {
  const el = document.getElementById('ad-header-title');
  if (el) el.textContent = title;
}

export function setActiveNav(key) {
  document.querySelectorAll('.ad-sidebar-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.adRoute === key);
  });
}
