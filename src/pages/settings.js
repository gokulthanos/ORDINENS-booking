import { currentUser, requiresLogin } from '../auth.js';
import { escapeHtml } from '../utils.js';

export default function mountSettings(root) {
  const user = currentUser();
  if (requiresLogin() && !user) {
    location.hash = '#login';
    return;
  }
  const personal = document.getElementById('settings-personal');
  if (personal && user) {
    personal.innerHTML = `
      <div class="detail-row"><span>Name</span><strong>${escapeHtml(user.name)}</strong></div>
      <div class="detail-row"><span>Contact</span><strong>${escapeHtml(user.identifier)}</strong></div>`;
  }
}
