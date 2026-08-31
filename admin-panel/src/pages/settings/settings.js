/* =============================================================
   Admin Panel — Settings
   Admin profile, platform preferences, theme, security, logout.
   Theme preference is persisted locally (admin_theme).
   ============================================================= */
import { getSettings, saveSettings } from '../../data.js';
import { adminLogout, getAdminSession } from '../../auth.js';
import { escapeHtml, toast } from '../../utils.js';

export function mountSettings() {
  const content = document.getElementById('ad-content');
  const session = getAdminSession() || { name: 'Admin' };
  const settings = getSettings();

  content.innerHTML = `
    <div class="ad-page-head">
      <div>
        <h1 class="ad-page-title">Settings</h1>
        <p class="ad-page-sub">Administrator settings and platform preferences.</p>
      </div>
    </div>
    <div class="ad-settings-grid">
      <div class="ad-settings-nav" role="tablist" aria-label="Settings sections">
        ${settingsNav.map((s) => `<button type="button" data-panel="${s.key}" class="${s.key === 'profile' ? 'active' : ''}">${escapeHtml(s.label)}</button>`).join('')}
        <button type="button" data-panel="logout" class="" style="color:var(--bad);">Logout</button>
      </div>
      <div class="ad-settings-panel" id="settings-panel"></div>
    </div>`;

  const panelsContainer = document.getElementById('settings-panel');
  const showPanel = (key) => {
    if (key === 'logout') {
      adminLogout();
      toast('Signed out.');
      location.hash = '#admin-login';
      return;
    }
    panelsContainer.innerHTML = panels[key](settings);
    bindPanel(key);
    content.querySelectorAll('.ad-settings-nav button').forEach((b) =>
      b.classList.toggle('active', b.dataset.panel === key)
    );
  };

  content.querySelectorAll('.ad-settings-nav button').forEach((b) =>
    b.addEventListener('click', () => showPanel(b.dataset.panel))
  );

  showPanel('profile');

  function bindPanel(key) {
    if (key === 'profile') {
      document.getElementById('settings-profile-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('set-name').value.trim();
        if (!name) {
          toast('Admin name is required.', 'warn');
          return;
        }
        saveSettings({ displayName: name });
        toast('Profile updated.');
      });
    }
    if (key === 'prefs' || key === 'theme') {
      document.querySelectorAll('[data-theme-choice]').forEach((b) => {
        b.addEventListener('click', () => {
          const theme = b.dataset.themeChoice;
          document.documentElement.setAttribute('data-theme', theme);
          localStorage.setItem('admin_theme', theme);
          document.getElementById('ad-theme-toggle').textContent = theme === 'dark' ? '🌙' : '☀️';
          toast(`Theme set to ${theme === 'dark' ? 'dark' : 'light'}.`);
        });
      });
      const langSelect = document.getElementById('set-lang');
      if (langSelect) {
        langSelect.addEventListener('change', () => {
          saveSettings({ locale: langSelect.value });
          toast('Preference saved.');
        });
      }
    }
    if (key === 'security') {
      document.getElementById('security-change').addEventListener('click', () => {
        toast('Password change requires the common backend. Stubbed in this prototype.', 'warn');
      });
    }
  }
}

const settingsNav = [
  { key: 'profile', label: 'Admin profile' },
  { key: 'prefs', label: 'Platform preferences' },
  { key: 'theme', label: 'Theme' },
  { key: 'security', label: 'Security' },
];

const panels = {
  profile: (settings) => `
    <div class="ad-card">
      <h2 class="ad-card-title">Admin profile</h2>
      <form id="settings-profile-form">
        <div class="ad-field"><label for="set-name">Display name</label><input class="ad-input" id="set-name" value="${escapeHtml(settings.displayName || 'Admin')}" /></div>
        <div class="ad-field"><label>Role</label><input class="ad-input" value="Platform Administrator" disabled /></div>
        <button class="ad-btn ad-btn-primary" type="submit">Save profile</button>
      </form>
    </div>`,
  prefs: (settings) => `
    <div class="ad-card">
      <h2 class="ad-card-title">Platform preferences</h2>
      <div class="ad-field">
        <label for="set-lang">Language / locale</label>
        <select class="ad-select" id="set-lang">
          <option value="en-IN" ${(settings.locale || 'en-IN') === 'en-IN' ? 'selected' : ''}>English (India)</option>
        </select>
      </div>
      <p style="color:var(--text-muted);font-size:13px;">Advanced platform configuration is not implemented in this phase.</p>
    </div>`,
  theme: () => `
    <div class="ad-card">
      <h2 class="ad-card-title">Theme</h2>
      <p style="color:var(--text-muted);font-size:14px;">Choose the Admin Panel colour theme. Your preference is saved locally.</p>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button class="ad-btn ad-btn-ghost" data-theme-choice="dark" type="button">🌙 Dark</button>
        <button class="ad-btn ad-btn-ghost" data-theme-choice="light" type="button">☀️ Light</button>
      </div>
    </div>`,
  security: () => `
    <div class="ad-card">
      <h2 class="ad-card-title">Security</h2>
      <button class="ad-btn ad-btn-ghost" id="security-change" type="button">Change admin password</button>
      <p style="color:var(--text-muted);font-size:13px;margin-top:12px;">Password management requires the common backend and is stubbed in this prototype phase.</p>
    </div>`,
};
