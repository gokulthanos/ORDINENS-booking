/* =============================================================
   Admin Panel — Login
   Dedicated admin login screen. On success the admin-only
   session (admin_session) is created and the dashboard loads.
   ============================================================= */
import { adminLogin, isAdmin } from '../../auth.js';

export function mountLogin() {
  if (isAdmin()) {
    location.hash = '#admin';
    return;
  }
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="ad-login">
      <div class="ad-login-brand">
        <div class="ad-sidebar-logo" aria-hidden="true">✂</div>
        <div>
          <p style="margin:0 0 4px;color:var(--text-muted);font-size:13px;letter-spacing:1px;text-transform:uppercase;">Restricted area</p>
          <h1>ORDINENS TECH</h1>
        </div>
        <p>Platform Admin Panel — the internal control center for the entire Ordinens Tech platform. Manage customers, shops, barbers, services, bookings and payments.</p>
      </div>
      <div class="ad-login-form-side">
        <div class="ad-login-card">
          <h2>Admin sign in</h2>
          <p class="ad-login-sub">Role-based access control. Only authorized administrators may enter.</p>
          <form id="ad-login-form" novalidate>
            <div class="ad-field">
              <label for="ad-login-pass">Admin password</label>
              <input class="ad-input" id="ad-login-pass" type="password" autocomplete="current-password" required />
            </div>
            <p class="ad-login-error" id="ad-login-error" role="alert"></p>
            <button class="ad-btn ad-btn-primary ad-btn-block" type="submit">Sign in</button>
          </form>
        </div>
      </div>
    </div>`;

  const form = document.getElementById('ad-login-form');
  const pass = document.getElementById('ad-login-pass');
  const error = document.getElementById('ad-login-error');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = pass.value.trim();
    if (!value) {
      error.textContent = 'Enter the admin password.';
      return;
    }
    if (adminLogin(value)) {
      error.textContent = '';
      location.hash = '#admin';
    } else {
      error.textContent = 'Invalid admin password. Access denied.';
      pass.select();
    }
  });

  pass.focus();
}
