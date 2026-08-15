/**
 * reviews.js - Star Ratings and Guest Feedback log (Multi-branch & Permissions updated)
 */

const ReviewsModule = {
  init() {
    window.addEventListener("render-section:reviews", () => this.renderReviewsTable());
    
    // Auto-update dashboard metrics rating on app render
    window.addEventListener("render-section:dashboard", () => this.updateDashboardRatingWidget());
  },

  // Renders guest reviews table
  renderReviewsTable() {
    app.enforcePermission("reviews");

    const tableBody = document.querySelector("#reviews-feed-table tbody");
    tableBody.innerHTML = "";

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const orderIds = orders.map(o => o.id);
    
    const reviews = db.get("reviews").filter(r => orderIds.includes(r.orderId));
    const branches = db.get("branches");

    if (reviews.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-muted); padding:2rem;">No customer ratings recorded.</td></tr>`;
      return;
    }

    // Sort by newest
    const sorted = [...reviews].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

    sorted.forEach(rev => {
      const ord = orders.find(o => o.id === rev.orderId);
      if (!ord) return;
      
      const starRatingStr = '★'.repeat(rev.rating) + '☆'.repeat(5 - rev.rating);

      const branch = branches.find(b => b.id === ord.branchId);
      const branchBadge = currentBranch === "all" && branch 
        ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">[${branch.name}]</span>` 
        : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700;">${ord.orderNo} ${branchBadge}</td>
        <td style="color:var(--color-warning); font-size:1.15rem; font-weight:700;">${starRatingStr}</td>
        <td>${rev.comment}</td>
        <td style="font-size:0.85rem; color:var(--text-secondary);">${new Date(rev.createdAt).toLocaleString()}</td>
      `;
      tableBody.appendChild(tr);
    });
  },

  // Modal selector rating popup
  showAddReviewModal(orderId) {
    const orders = db.get("orders");
    const ord = orders.find(o => o.id === orderId);
    if (!ord) return;

    const modalHTML = `
      <div class="modal-header">
        <h3>Guest Feedback Form</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="modal-body text-center">
        <p style="margin-bottom:1rem; font-size:0.95rem;">How would you rate order <strong>${ord.orderNo}</strong>?</p>
        
        <div id="modal-rating-stars" style="display:flex; justify-content:center; gap:0.5rem; font-size:2.5rem; color:var(--text-muted); margin-bottom:1.5rem; cursor:pointer;">
          <span data-val="1">☆</span>
          <span data-val="2">☆</span>
          <span data-val="3">☆</span>
          <span data-val="4">☆</span>
          <span data-val="5">☆</span>
        </div>

        <div class="form-group" style="text-align:left;">
          <label class="form-label">Review Comment (Optional)</label>
          <textarea id="modal-rating-comment" class="form-control" rows="3" placeholder="Tell us about the taste, service or packaging..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" data-dismiss="modal">Skip Feedback</button>
        <button class="btn btn-primary" id="btn-submit-review">Submit Feedback</button>
      </div>
    `;

    app.showModal(modalHTML);

    let selectedRating = 0;
    const starsDiv = document.getElementById("modal-rating-stars");
    const starsList = starsDiv.querySelectorAll("span");

    starsList.forEach(star => {
      star.addEventListener("mouseover", () => {
        const ratingVal = parseInt(star.dataset.val);
        starsList.forEach(s => {
          s.textContent = parseInt(s.dataset.val) <= ratingVal ? '★' : '☆';
          s.style.color = parseInt(s.dataset.val) <= ratingVal ? 'var(--color-warning)' : 'var(--text-muted)';
        });
      });

      starsDiv.addEventListener("mouseleave", () => {
        starsList.forEach(s => {
          s.textContent = parseInt(s.dataset.val) <= selectedRating ? '★' : '☆';
          s.style.color = parseInt(s.dataset.val) <= selectedRating ? 'var(--color-warning)' : 'var(--text-muted)';
        });
      });

      star.addEventListener("click", () => {
        selectedRating = parseInt(star.dataset.val);
      });
    });

    document.getElementById("btn-submit-review").addEventListener("click", () => {
      if (selectedRating === 0) {
        app.showToast("Please choose a star rating.", "warning");
        return;
      }

      const comment = document.getElementById("modal-rating-comment").value.trim() || "No written review provided.";

      db.insert("reviews", {
        orderId,
        rating: selectedRating,
        comment,
        createdAt: new Date().toISOString()
      });

      app.showToast("Thank you for your feedback!", "success");
      app.closeModal();
      this.updateDashboardRatingWidget();
    });
  },

  // Updates Dashboard metrics average rating widget (filtered by active branch)
  updateDashboardRatingWidget() {
    const displayVal = document.getElementById("dash-avg-rating");
    if (!displayVal) return;

    const currentBranch = db.getCurrentBranch();
    const orders = db.get("orders").filter(o => currentBranch === "all" || o.branchId === currentBranch);
    const orderIds = orders.map(o => o.id);
    
    const reviews = db.get("reviews").filter(r => orderIds.includes(r.orderId));
    if (reviews.length === 0) {
      displayVal.textContent = "0.0 ★";
      return;
    }

    const sum = reviews.reduce((s, r) => s + r.rating, 0);
    const avg = sum / reviews.length;
    displayVal.textContent = `${avg.toFixed(1)} ★`;
  }
};

ReviewsModule.init();
