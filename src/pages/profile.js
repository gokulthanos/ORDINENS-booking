import { currentUser, logout, requiresLogin } from '../auth.js';
import { escapeHtml } from '../utils.js';

export default function mountProfile(root) {
  const user = currentUser();
  if (requiresLogin() && !user) {
    location.hash = '#login';
    return;
  }

  if (user) {
    document.getElementById('profile-name').textContent = escapeHtml(user.name);
    document.getElementById('profile-contact').textContent = escapeHtml(user.identifier);
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = String(user.name || '?').charAt(0).toUpperCase();
  } else {
    // Not signed in — offer sign in
    document.getElementById('menu-personal').setAttribute('href', '#login');
  }

  const logoutBtn = document.getElementById('profile-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      const evt = new CustomEvent('pt:userchange');
      document.dispatchEvent(evt);
      location.hash = '#home';
    });
  }
}
