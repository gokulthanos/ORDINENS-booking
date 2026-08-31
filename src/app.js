import './styles.css';
import { handleRoute, updateAuthChip } from './router.js';
import { runSplash } from './splash.js';
import * as auth from './auth.js';

const LOGIN_GUARDED = ['booking', 'confirmation'];

function syncGreeting() {
  const el = document.getElementById('header-greeting');
  if (!el) return;
  const user = auth.currentUser();
  el.textContent = user
    ? `Hello, ${String(user.name).split(' ')[0]}`
    : 'Hello, Guest';
}

async function routeWithGuard() {
  const route = location.hash.replace(/^#\/?/, '').toLowerCase();
  const [track] = route.split('/');

  if (LOGIN_GUARDED.includes(track) && auth.requiresLogin()) {
    sessionStorage.setItem('pt_next', '#' + track);
    location.hash = '#login';
    return;
  }

  await handleRoute();
}

function initApp() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  syncGreeting();

  document.addEventListener('pt:userchange', syncGreeting);
  window.addEventListener('hashchange', routeWithGuard);

  if (!location.hash) history.replaceState(null, '', '#home');
  syncGreeting();
  routeWithGuard();
}

function boot() {
  runSplash({ onVisible: initApp });
}

boot();
