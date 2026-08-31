/* =============================================================
   Owner App — Login Page
   ============================================================= */
import { ownerLogin, isOwner } from '../auth.js';
import { getShopConfig } from '../data.js';
import { OWNER_PASSWORD } from '../auth.js';

export default function mount(app) {
  document.body.classList.add('login-route');

  // Hide sidebar & bottom nav for login
  document.getElementById('ow-sidebar').hidden = true;
  document.getElementById('ow-bottom-nav').hidden = true;

  if (isOwner()) {
    const config = getShopConfig();
    location.hash = config.onboarded ? '#dashboard' : '#onboarding';
    return;
  }

  app.innerHTML = `
    <div class="ow-login-wrap">
      <div class="ow-login-brand">
        <div class="ow-login-logo" aria-hidden="true">✂</div>
        <h1 class="ow-login-title">Ordinens Tech</h1>
        <p class="ow-login-sub">Owner Management Panel</p>
      </div>

      <div class="ow-login-card">
        <form id="ow-login-form" novalidate>
          <div class="ow-form-group" id="fg-pass">
            <label class="ow-label" for="ow-pass">Owner Password</label>
            <input
              id="ow-pass"
              class="ow-input"
              type="password"
              autocomplete="current-password"
              placeholder="Enter your password"
              required
            />
            <span class="ow-field-error" id="ow-pass-err">Incorrect password. Please try again.</span>
          </div>

          <button class="ow-btn ow-btn-primary ow-btn-block ripple" type="submit" id="ow-login-submit">
            Sign In to Owner Panel
          </button>
        </form>

        <p class="ow-demo-hint">
          Demo key: <code>${OWNER_PASSWORD}</code>
        </p>
      </div>

      <p class="ow-demo-hint" style="margin-top:24px; text-align:center;">
        &copy; 2026 Ordinens Tech
      </p>
    </div>`;

  const form = document.getElementById('ow-login-form');
  const passInput = document.getElementById('ow-pass');
  const fg = document.getElementById('fg-pass');

  form.addEventListener('submit', e => {
    e.preventDefault();
    const val = passInput.value.trim();
    if (!val) {
      fg.classList.add('error');
      return;
    }
    if (ownerLogin(val)) {
      fg.classList.remove('error');
      document.body.classList.remove('login-route');
      const config = getShopConfig();
      location.hash = config.onboarded ? '#dashboard' : '#onboarding';
    } else {
      fg.classList.add('error');
      passInput.value = '';
      passInput.focus();
    }
  });

  passInput.addEventListener('input', () => fg.classList.remove('error'));
}
