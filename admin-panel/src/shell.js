/* =============================================================
   Ordinens Tech — Admin Panel Shell
   Renders the app shell: desktop sidebar (drawer on mobile),
   top header, and main content area.
   ============================================================= */
import { adminLogout, getAdminSession } from './auth.js';
import { toast, escapeHtml } from './utils.js';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊' },
  { key: 'customers', label: 'Customers', icon: '👤' },
  { key: 'shops', label: 'Shops', icon: '🏪' },
  { key: 'barbers', label: 'Barbers', icon: '💈' },
  { key: 'services', label: 'Services', icon: '✂' },
  { key: 'bookings', label: 'Bookings', icon: '📋' },
  { key: 'payments', label: 'Payments', icon: '💳' },
  { key: 'issues', label: 'Issues', icon: '⚠' },
  { key: 'reports', label: 'Reports', icon: '📈' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

let drawerOpen = false;

export function renderShell(title) {
  const app = document.getElementById('app');
  const session = getAdminSession() || { name: 'Admin' };
  const initial = (session.name || 'A').charAt(0).toUpperCase();

  app.innerHTML = `
    <div class="ad-shell">
      <aside class="ad-sidebar" id="ad-sidebar" aria-label="Admin navigation">
        <div class="ad-sidebar-brand">
          <div class="ad-sidebar-logo" aria-hidden="true">✂</div>
          <div class="ad-sidebar-brand-text">
            <strong>ORDINENS TECH</strong>
            <small>Admin Panel</small>
          </div>
        </div>
        <nav class="ad-sidebar-nav">
          ${NAV.map(
            (n) => `
            <a href="#admin/${n.key === 'dashboard' ? '' : n.key}" data-ad-route="${n.key}">
              <span class="ad-nav-icon" aria-hidden="true">${n.icon}</span>
              ${n.label}
            </a>`
          ).join('')}
        </nav>
        <div class="ad-sidebar-footer">
          <div class="ad-profile">
            <div class="ad-avatar" aria-hidden="true">${escapeHtml(initial)}</div>
            <div class="ad-profile-meta">
              <strong>${escapeHtml(session.name || 'Admin')}</strong>
              <span>Administrator</span>
            </div>
          </div>
          <button class="ad-sidebar-logout" type="button" id="ad-logout">
            <span class="ad-nav-icon" aria-hidden="true">🚪</span>
            Logout
          </button>
        </div>
      </aside>

      <div class="ad-main">
        <header class="ad-header">
          <button class="ad-hamburger" type="button" id="ad-hamburger" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
          <div class="ad-header-title" id="ad-header-title">${escapeHtml(title)}</div>
          <div class="ad-header-right">
            <span class="ad-profile-meta" style="display:flex;flex-direction:column;align-items:flex-end;">
              <strong>${escapeHtml(session.name || 'Admin')}</strong>
              <span style="font-size:12px;color:var(--text-muted);">Platform Admin</span>
            </span>
            <button class="ad-theme-btn" type="button" id="ad-theme-toggle" aria-label="Toggle theme">🌙</button>
          </div>
        </header>
        <main class="ad-content" id="ad-content" aria-label="Main content"></main>
      </div>
    </div>`;

  const close = () => {
    drawerOpen = false;
    const s = document.getElementById('ad-sidebar');
    s?.classList.remove('open');
    document.getElementById('ad-hamburger')?.setAttribute('aria-expanded', 'false');
  };

  document.getElementById('ad-hamburger')?.addEventListener('click', () => {
    drawerOpen = !drawerOpen;
    document.getElementById('ad-sidebar')?.classList.toggle('open', drawerOpen);
    document.getElementById('ad-hamburger')?.setAttribute('aria-expanded', String(drawerOpen));
  });

  document.getElementById('ad-theme-toggle')?.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('admin_theme', next);
    document.getElementById('ad-theme-toggle').textContent = next === 'dark' ? '🌙' : '☀️';
  });

  document.getElementById('ad-logout')?.addEventListener('click', () => {
    adminLogout();
    toast('Signed out.');
    location.hash = '#admin-login';
  });

  // Close drawer when clicking a nav link (mobile)
  document.querySelectorAll('.ad-sidebar-nav a').forEach((a) =>
    a.addEventListener('click', close)
  );

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) close();
  });
}

export function showSidebar(key) {
  document.querySelectorAll('.ad-sidebar-nav a').forEach((a) => {
    a.classList.toggle('active', a.dataset.adRoute === key);
  });
}

export function hideSidebar() {
  drawerOpen = false;
  const s = document.getElementById('ad-sidebar');
  if (s && window.innerWidth <= 768) s.classList.remove('open');
}
