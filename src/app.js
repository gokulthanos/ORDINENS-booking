import './styles.css';
import { handleRoute, updateAuthChip } from './router.js';
import { runSplash } from './splash.js';
import * as auth from './auth.js';

function syncGreeting() {
  const el = document.getElementById('header-greeting');
  if (!el) return;
  const user = auth.currentUser();
  el.textContent = user
    ? `Hello, ${String(user.name).split(' ')[0]}`
    : 'Hello, Guest';
}

function initApp() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  syncGreeting();

  document.addEventListener('pt:userchange', syncGreeting);
  window.addEventListener('hashchange', handleRoute);

  if (!location.hash) history.replaceState(null, '', '#home');
  syncGreeting();
  handleRoute();
}

function boot() {
  runSplash({ onVisible: initApp });
}

boot();
