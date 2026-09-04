/* =============================================================
   Owner App — Settings Page
   ============================================================= */
import { getShopConfig, patchShopConfig } from '../data.js';
import { toast } from '../utils.js';

export default function mount(app) {
  const cfg = getShopConfig();

  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">App Settings</h1>
        <p class="ow-page-sub">Configure booking preferences</p>
      </div>
      <button class="ow-btn ow-btn-primary ripple" type="button" id="app-save-btn">Save Changes</button>
    </div>

    <div class="ow-settings-section">
      <div class="ow-settings-section-header">Booking Rules</div>
      <div class="ow-settings-section-body">
        <div class="ow-form-row">
          <div class="ow-form-group">
            <label class="ow-label" for="st-book-window">Advance booking window</label>
            <select id="st-book-window" class="ow-select">
              ${[7,14,21,30,60,90].map(v => `<option value="${v}" ${v === (cfg.bookingWindow||30) ? 'selected' : ''}>${v} days ahead</option>`).join('')}
            </select>
            <p class="ow-hint">How far in advance customers can book.</p>
          </div>
          <div class="ow-form-group">
            <label class="ow-label" for="st-cancel-hours">Free cancellation window</label>
            <select id="st-cancel-hours" class="ow-select">
              ${[1,2,4,6,12,24].map(v => `<option value="${v}" ${v === (cfg.cancellationHours||2) ? 'selected' : ''}>${v} hour${v>1?'s':''} before appointment</option>`).join('')}
            </select>
            <p class="ow-hint">Deadline for free cancellations.</p>
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top:40px; padding-top:20px; border-top:1px solid var(--danger-bg);">
      <h3 style="color:var(--danger); font-size:1rem; margin-bottom:8px;">Danger Zone</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:16px;">
        Resetting the shop will clear all configuration and force you to go through the onboarding wizard again. Bookings and services data will NOT be deleted.
      </p>
      <button class="ow-btn ow-btn-danger" type="button" id="reset-shop-btn">Reset Shop Configuration</button>
    </div>
  `;

  document.getElementById('app-save-btn').addEventListener('click', () => {
    patchShopConfig({
      bookingWindow: Number(document.getElementById('st-book-window').value),
      cancellationHours: Number(document.getElementById('st-cancel-hours').value),
    });
    toast('Settings saved');
  });

  document.getElementById('reset-shop-btn').addEventListener('click', () => {
    if (confirm('Are you sure you want to reset the shop configuration? You will need to complete onboarding again.')) {
      patchShopConfig({ onboarded: false });
      location.hash = '#onboarding';
    }
  });
}
