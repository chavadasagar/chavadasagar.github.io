/**
 * reviews.js - Guest feedback catalog, star aggregates, and check-out reviews logging
 */

const reviewsController = {
  render(container) {
    const reviews = window.db.getAll('reviews');
    const guests = window.db.getAll('guests');
    const bookings = window.db.getAll('bookings');

    // Aggregate statistics
    const totalCount = reviews.length;
    const avgRating = totalCount > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1) : '0.0';

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      starCounts[r.rating] = (starCounts[r.rating] || 0) + 1;
    });

    container.innerHTML = `
      <div class="reviews-header animate-fade-in">
        <h2>Guest Feedback & Reviews</h2>
        <button class="btn btn-primary" id="btn-add-review">+ Add Post-Stay Review</button>
      </div>

      <div class="reviews-dashboard animate-fade-in">
        <div class="reviews-summary-card card">
          <div class="average-rating-col">
            <span class="rating-value">${avgRating}</span>
            <span class="rating-stars">${this._renderStars(Math.round(parseFloat(avgRating)))}</span>
            <span class="rating-count">Based on ${totalCount} reviews</span>
          </div>
          <div class="stars-breakdown-col">
            ${[5, 4, 3, 2, 1].map(star => {
              const count = starCounts[star] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return `
                <div class="breakdown-row">
                  <span class="star-label">${star} ★</span>
                  <div class="breakdown-bar"><div class="fill" style="width: ${pct}%;"></div></div>
                  <span class="count-label">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div class="reviews-list-col">
          <h3>Recent Guest Comments</h3>
          <div class="comments-cards-list">
            ${reviews.map(r => {
              const g = guests.find(guest => guest.id === r.guestId) || { name: 'Anonymous Guest' };
              const bk = bookings.find(b => b.id === r.bookingId) || { bookingReferenceNo: '-' };
              
              return `
                <div class="comment-card card">
                  <div class="cc-header">
                    <strong>${g.name}</strong>
                    <span class="cc-stars">${this._renderStars(r.rating)}</span>
                  </div>
                  <p class="cc-text">"${r.comment}"</p>
                  <div class="cc-meta">
                    <span>Stay Ref: <code>${bk.bookingReferenceNo}</code></span>
                    <span>Submitted: ${window.utils.formatDate(r.createdAt)}</span>
                  </div>
                </div>
              `;
            }).join('')}
            ${totalCount === 0 ? '<div class="empty-state">No feedback submitted yet.</div>' : ''}
          </div>
        </div>
      </div>

      <!-- Add Review Modal -->
      <div id="review-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Guest Review</h3>
            <button class="modal-close-btn" id="btn-close-rev-modal">&times;</button>
          </div>
          <form id="review-form">
            <div class="modal-body">
              <div class="form-group">
                <label for="rev-booking-field">Link to Checkout Booking*</label>
                <select id="rev-booking-field" required></select>
              </div>
              <div class="form-group">
                <label>Rating*</label>
                <div class="stars-rating-input">
                  <select id="rev-rating-field" required style="width: 100px;">
                    <option value="5">5 Stars ★</option>
                    <option value="4">4 Stars ★</option>
                    <option value="3">3 Stars ★</option>
                    <option value="2">2 Stars ★</option>
                    <option value="1">1 Star ★</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="rev-comment-field">Review Comments*</label>
                <textarea id="rev-comment-field" required rows="4" placeholder="How was their stay experience?"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-rev-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Review</button>
            </div>
          </form>
        </div>
      </div>
    `;

    // Bind triggers
    document.getElementById('btn-add-review').addEventListener('click', () => {
      const select = document.getElementById('rev-booking-field');
      const checkoutBookings = window.db.query('bookings', b => b.bookingStatus === 'CheckedOut');
      const guests = window.db.getAll('guests');

      if (checkoutBookings.length === 0) {
        window.utils.showToast("No checked out stays found to associate reviews with.", "warning");
        return;
      }

      select.innerHTML = checkoutBookings.map(b => {
        const g = guests.find(guest => guest.id === b.guestId) || { name: 'Guest' };
        return `<option value="${b.id}">${g.name} (${b.bookingReferenceNo}) - Checkout: ${window.utils.formatDate(b.actualCheckOutTime)}</option>`;
      }).join('');

      document.getElementById('rev-comment-field').value = '';
      document.getElementById('review-modal').style.display = 'flex';
    });

    document.getElementById('btn-close-rev-modal').addEventListener('click', () => this.closeModal());
    document.getElementById('btn-cancel-rev-modal').addEventListener('click', () => this.closeModal());
    
    document.getElementById('review-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const bookingId = document.getElementById('rev-booking-field').value;
      const rating = parseInt(document.getElementById('rev-rating-field').value) || 5;
      const comment = document.getElementById('rev-comment-field').value.trim();

      const bk = window.db.getById('bookings', bookingId);
      if (!bk) return;

      window.db.create('reviews', {
        bookingId,
        guestId: bk.guestId,
        rating,
        comment
      });

      window.utils.showToast("Feedback reviews saved successfully!");
      this.closeModal();
      this.render(container);
    });
  },

  closeModal() {
    document.getElementById('review-modal').style.display = 'none';
  },

  _renderStars(count) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      s += i < count ? '★' : '☆';
    }
    return s;
  }
};

window.reviewsController = reviewsController;
