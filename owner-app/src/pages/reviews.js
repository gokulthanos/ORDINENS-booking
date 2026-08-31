/* =============================================================
   Owner App — Reviews Page (Mocked placeholder)
   ============================================================= */

export default function mount(app) {
  app.innerHTML = `
    <div class="ow-page-header">
      <div>
        <h1 class="ow-page-title">Reviews</h1>
        <p class="ow-page-sub">Customer feedback and ratings</p>
      </div>
    </div>

    <div class="ow-card">
      <div class="ow-reviews-empty">
        <div class="ow-star-row">⭐⭐⭐⭐⭐</div>
        <h2 style="font-size:1.2rem; font-weight:700; margin-bottom:8px;">Reviews coming soon</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; max-width:400px; margin:0 auto;">
          The reviews feature is currently in development. Once available, customers will be able to rate their completed appointments and leave feedback.
        </p>
        <button class="ow-btn ow-btn-secondary" style="margin-top:24px;" disabled>Enable Reviews (Coming Soon)</button>
      </div>
    </div>
  `;
}
