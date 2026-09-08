import { currentUser } from '../auth.js';
import { escapeHtml } from '../utils.js';

export default function mountProfile(root) {
  const user = currentUser();
  if (user) {
    document.getElementById('profile-name').textContent = escapeHtml(user.name);
    document.getElementById('profile-contact').textContent = escapeHtml(user.identifier);
    const avatar = document.getElementById('profile-avatar');
    if (avatar) avatar.textContent = String(user.name || '?').charAt(0).toUpperCase();
  }
}
