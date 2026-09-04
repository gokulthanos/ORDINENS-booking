/* =============================================================
   Owner App — Login Page
   ============================================================= */
import { requiresOwner, ownerLogin, isOwner } from '../auth.js';
import { getShopConfig } from '../data.js';
import { toast } from '../utils.js';

export default function mount(app) {
  document.body.classList.add('login-route');

  app.innerHTML = `
    <div class="ow-login-wrap">
      <div class="ow-login-brand">
        <div class="ow-login-logo" aria-hidden="true">✂</div>
        <div class="ow-login-title">ORDINENS TECH</div>
        <div class="ow-login-sub">Owner Panel</div>
      </div>
      <div class="ow-login-card">
        <form id="ow-login-form" novalidate>
          <div class="ow-form-group" id="fg-login-pass">
            <label class="ow-label" for="ow-pass">Password</label>
            <input id="ow-pass" class="ow-input" type="password" placeholder="Enter owner password" autocomplete="current-password" required />
            <span class="ow-field-error">Password is required.</span>
          </div>
          <button class="ow-btn ow-btn-primary ow-btn-block ripple" type="submit" id="ow-login-submit">Sign In</button>
        </form>
      </div>
      <div class="ow-demo-hint">Demo password: <code>owner123</code></div>
    </div>`;

  const form = document.getElementById('ow-login-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('ow-pass').value;
    if (!pass) {
      document.getElementById('fg-login-pass').classList.add('error');
      return;
    }
    const ok = ownerLogin(pass);
    if (!ok) {
      document.getElementById('fg-login-pass').classList.add('error');
      toast('Invalid password', 'error');
      return;
    }
    const config = getShopConfig();
    if (config.onboarded) {
      location.hash = '#dashboard';
    } else {
      location.hash = '#onboarding';
    }
  });
}
