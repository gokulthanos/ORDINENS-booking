/* =============================================================
   Ordinens Tech — Owner App
   Main entry point
   ============================================================= */
import './styles/owner.css';
import { handleRoute } from './router.js';
import { ownerLogout } from './auth.js';

// Logout button in the sidebar footer
document.addEventListener('click', e => {
  const logoutBtn = e.target.closest('#sidebar-logout');
  if (logoutBtn) {
    ownerLogout();
    location.hash = '#login';
  }
});

function initRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.ripple');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height) * 2;
    const ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - rect.left - d/2}px;top:${e.clientY - rect.top - d/2}px`;
    btn.appendChild(ink);
    setTimeout(() => ink.remove(), 600);
  });
}

// More menu drawer (mobile)
function initMoreDrawer() {
  document.addEventListener('click', e => {
    const moreBtn = e.target.closest('#ow-more-btn');
    if (moreBtn) {
      document.getElementById('ow-more-drawer')?.classList.toggle('open');
      return;
    }
    const drawer = document.getElementById('ow-more-drawer');
    if (drawer?.classList.contains('open') && !e.target.closest('#ow-more-drawer') && !e.target.closest('#ow-more-btn')) {
      drawer.classList.remove('open');
    }
  });
}

// Theme toggle removed (no dark mode per spec)

function init() {
  initRipple();
  initMoreDrawer();

  if (!location.hash) history.replaceState(null, '', '#dashboard');
  handleRoute();
  window.addEventListener('hashchange', handleRoute);
}

init();
