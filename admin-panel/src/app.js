/* =============================================================
   Ordinens Tech — Admin Panel
   Main entry point. Independent Vite application.
   ============================================================= */
import './styles.css';
import { handleRoute } from './router.js';
import { isAdmin } from './auth.js';

function initTheme() {
  const saved = localStorage.getItem('admin_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

function initConfirmDialog() {
  const dialog = document.getElementById('ad-confirm');
  const title = document.getElementById('ad-confirm-title');
  const message = document.getElementById('ad-confirm-message');
  const okBtn = document.getElementById('ad-confirm-ok');
  const cancelBtn = document.getElementById('ad-confirm-cancel');

  window.adConfirm = (opts = {}) =>
    new Promise((resolve) => {
      title.textContent = opts.title || 'Are you sure?';
      message.textContent = opts.message || '';
      okBtn.textContent = opts.okText || 'Confirm';
      dialog.hidden = false;
      cancelBtn.focus();

      const cleanup = () => {
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        dialog.onclick = null;
        dialog.hidden = true;
      };

      okBtn.onclick = () => {
        cleanup();
        resolve(true);
      };
      cancelBtn.onclick = () => {
        cleanup();
        resolve(false);
      };
      dialog.onclick = (e) => {
        if (e.target.classList.contains('ad-modal-backdrop')) {
          cleanup();
          resolve(false);
        }
      };
    });
}

function init() {
  initTheme();
  initConfirmDialog();

  if (!location.hash) {
    history.replaceState(null, '', isAdmin() ? '#admin' : '#admin-login');
  }
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

init();
