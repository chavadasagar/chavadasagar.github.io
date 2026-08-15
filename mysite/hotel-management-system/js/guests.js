/**
 * guests.js - Guest CRM database, ID proofs verification, loyalty tracking, profile stays history
 */

const guestsController = {
  activeView: 'list', // 'list', 'profile'
  selectedGuestId: null,

  render(container) {
    if (this.activeView === 'list') {
      this.renderList(container);
    } else if (this.activeView === 'profile') {
      this.renderProfile(container);
    }
  },

  renderList(container) {
    container.innerHTML = `
      <div class="guests-header animate-fade-in">
        <h2>Guest CRM Database</h2>
        <button class="btn btn-primary" id="btn-add-guest-modal"><span class="icon">👤</span> Add Guest Profile</button>
      </div>

      <div class="list-actions card animate-fade-in">
        <div class="search-box-wrapper">
          <input type="text" id="filter-guest-search" placeholder="Search by name, phone, email...">
        </div>
      </div>

      <div class="table-responsive card animate-fade-in">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Nationality</th>
              <th>Loyalty Tier</th>
              <th>Total Stays</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="guests-tbody"></tbody>
        </table>
      </div>

      <!-- Add/Edit Guest Modal -->
      <div id="guest-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="guest-modal-title">Create Guest Profile</h3>
            <button class="modal-close-btn" id="btn-close-guest-modal">&times;</button>
          </div>
          <form id="guest-form">
            <input type="hidden" id="guest-id-field">
            <div class="modal-body">
              <div class="form-group">
                <label for="gst-name-field">Full Name*</label>
                <input type="text" id="gst-name-field" required placeholder="e.g. John Doe">
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="gst-phone-field">Phone Number*</label>
                  <input type="text" id="gst-phone-field" required placeholder="e.g. +91 9988776655">
                </div>
                <div class="form-group">
                  <label for="gst-email-field">Email Address</label>
                  <input type="email" id="gst-email-field" placeholder="e.g. name@example.com">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="gst-dob-field">Date of Birth</label>
                  <input type="date" id="gst-dob-field">
                </div>
                <div class="form-group">
                  <label for="gst-gender-field">Gender</label>
                  <select id="gst-gender-field">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label for="gst-nation-field">Nationality</label>
                  <input type="text" id="gst-nation-field" value="Indian" placeholder="Country">
                </div>
                <div class="form-group">
                  <label for="gst-address-field">Address</label>
                  <input type="text" id="gst-address-field" placeholder="e.g. City, State">
                </div>
              </div>
              
              <!-- ID proof sub-section -->
              <h4 style="margin: 20px 0 10px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 5px;">Verification ID Document</h4>
              <div class="form-row">
                <div class="form-group">
                  <label for="gst-idtype-field">ID Type</label>
                  <select id="gst-idtype-field">
                    <option value="None">None</option>
                    <option value="Aadhaar">Aadhaar Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID">Voter ID Card</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="gst-idnum-field">ID Serial Number</label>
                  <input type="text" id="gst-idnum-field" placeholder="Number">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-guest-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('btn-add-guest-modal').addEventListener('click', () => this.openGuestModal());
    document.getElementById('btn-close-guest-modal').addEventListener('click', () => this.closeGuestModal());
    document.getElementById('btn-cancel-guest-modal').addEventListener('click', () => this.closeGuestModal());
    document.getElementById('guest-form').addEventListener('submit', (e) => this.handleSaveGuest(e));

    const tbody = document.getElementById('guests-tbody');
    const searchInput = document.getElementById('filter-guest-search');

    const updateDisplay = () => {
      const guests = window.db.getAll('guests');
      const loyalties = window.db.getAll('loyaltyAccounts');
      const query = searchInput.value.toLowerCase().trim();

      const filtered = guests.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.phone.includes(query) ||
        (g.email && g.email.toLowerCase().includes(query))
      );

      tbody.innerHTML = filtered.map(g => {
        const loy = loyalties.find(l => l.guestId === g.id) || { tier: 'Silver', totalStays: 0 };
        let tierClass = 'tier-silver';
        if (loy.tier === 'Gold') tierClass = 'tier-gold';
        else if (loy.tier === 'Platinum') tierClass = 'tier-platinum';

        return `
          <tr>
            <td><strong>${g.name}</strong></td>
            <td>${g.phone}</td>
            <td>${g.email || '-'}</td>
            <td>${g.nationality || '-'}</td>
            <td><span class="loyalty-badge ${tierClass}">${loy.tier}</span></td>
            <td>${loy.totalStays || 0} stays</td>
            <td>
              <button class="btn btn-xs btn-outline btn-view-profile" data-id="${g.id}">View Profile</button>
              <button class="btn btn-xs btn-outline btn-edit-guest" data-id="${g.id}">Edit</button>
              <button class="btn btn-xs btn-danger btn-delete-guest" data-id="${g.id}">Delete</button>
            </td>
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No guest profiles found.</td></tr>';
      }

      // Bind buttons
      tbody.querySelectorAll('.btn-view-profile').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.selectedGuestId = e.currentTarget.getAttribute('data-id');
          this.activeView = 'profile';
          this.render(container);
        });
      });

      tbody.querySelectorAll('.btn-edit-guest').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.openGuestModal(e.currentTarget.getAttribute('data-id'));
        });
      });

      tbody.querySelectorAll('.btn-delete-guest').forEach(btn => {
        btn.addEventListener('click', (e) => {
          this.handleDeleteGuest(e.currentTarget.getAttribute('data-id'));
        });
      });
    };

    searchInput.addEventListener('input', updateDisplay);
    updateDisplay();
  },

  openGuestModal(guestId = null) {
    const form = document.getElementById('guest-form');
    form.reset();

    if (guestId) {
      const g = window.db.getById('guests', guestId);
      if (!g) return;

      document.getElementById('guest-modal-title').innerText = "Edit Guest Profile";
      document.getElementById('guest-id-field').value = g.id;
      document.getElementById('gst-name-field').value = g.name;
      document.getElementById('gst-phone-field').value = g.phone;
      document.getElementById('gst-email-field').value = g.email || '';
      document.getElementById('gst-dob-field').value = g.dob || '';
      document.getElementById('gst-gender-field').value = g.gender || 'Male';
      document.getElementById('gst-nation-field').value = g.nationality || 'Indian';
      document.getElementById('gst-address-field').value = g.address || '';

      // ID document
      const idProofs = window.db.query('guestIdProofs', idp => idp.guestId === g.id);
      if (idProofs.length > 0) {
        document.getElementById('gst-idtype-field').value = idProofs[0].type;
        document.getElementById('gst-idnum-field').value = idProofs[0].number;
      }
    } else {
      document.getElementById('guest-modal-title').innerText = "Create Guest Profile";
      document.getElementById('guest-id-field').value = '';
    }

    document.getElementById('guest-modal').style.display = 'flex';
  },

  closeGuestModal() {
    document.getElementById('guest-modal').style.display = 'none';
  },

  handleSaveGuest(e) {
    e.preventDefault();

    const id = document.getElementById('guest-id-field').value;
    const name = document.getElementById('gst-name-field').value.trim();
    const phone = document.getElementById('gst-phone-field').value.trim();
    const email = document.getElementById('gst-email-field').value.trim();
    const dob = document.getElementById('gst-dob-field').value;
    const gender = document.getElementById('gst-gender-field').value;
    const nationality = document.getElementById('gst-nation-field').value.trim();
    const address = document.getElementById('gst-address-field').value.trim();

    const idType = document.getElementById('gst-idtype-field').value;
    const idNumber = document.getElementById('gst-idnum-field').value.trim();

    if (!name || !phone) {
      window.utils.showToast("Name and phone number are required.", "error");
      return;
    }

    if (email && !window.utils.validateEmail(email)) {
      window.utils.showToast("Please enter a valid email address.", "error");
      return;
    }

    // Duplicate verification logic
    const guests = window.db.getAll('guests');
    const duplicate = guests.find(g => (g.phone === phone || (email && g.email === email)) && g.id !== id);

    const executeSave = () => {
      const payload = { name, phone, email, dob, gender, nationality, address };
      let savedObj = null;

      if (id) {
        savedObj = window.db.update('guests', id, payload);
        window.utils.showToast("Guest profile updated successfully.");
      } else {
        savedObj = window.db.create('guests', payload);
        // Create matching loyalty account
        window.db.create('loyaltyAccounts', { guestId: savedObj.id, tier: 'Silver', pointsBalance: 0, totalStays: 0 });
        window.utils.showToast("Guest profile created successfully.");
      }

      // Handle ID proofs update
      if (idType !== 'None' && idNumber) {
        const idProofs = window.db.query('guestIdProofs', idp => idp.guestId === savedObj.id);
        if (idProofs.length > 0) {
          window.db.update('guestIdProofs', idProofs[0].id, { type: idType, number: idNumber });
        } else {
          window.db.create('guestIdProofs', { guestId: savedObj.id, type: idType, number: idNumber, filePlaceholder: 'id_document.png' });
        }
      }

      this.closeGuestModal();
      this.renderList(document.getElementById('app-content'));
    };

    if (duplicate) {
      window.utils.confirm(
        "Possible Duplicate Warning",
        `A profile already exists for guest "${duplicate.name}" with the same phone or email. Do you still want to save this profile?`,
        () => executeSave()
      );
    } else {
      executeSave();
    }
  },

  handleDeleteGuest(guestId) {
    const activeStays = window.db.query('bookings', b => b.guestId === guestId && b.bookingStatus !== 'CheckedOut' && b.bookingStatus !== 'Cancelled');
    if (activeStays.length > 0) {
      window.utils.confirm(
        "Cannot Delete Profile",
        "This guest has active or confirmed upcoming stays. You must cancel their reservations before deleting this profile.",
        () => {}
      );
      return;
    }

    window.utils.confirm(
      "Confirm Profile Deletion",
      "Are you sure you want to delete this guest profile? This will clean up all associated ID proofs and loyalty balances.",
      () => {
        window.db.delete('guests', guestId);
        
        // Clean up linked records
        const proofs = window.db.query('guestIdProofs', idp => idp.guestId === guestId);
        proofs.forEach(p => window.db.delete('guestIdProofs', p.id));
        
        const loys = window.db.query('loyaltyAccounts', l => l.guestId === guestId);
        loys.forEach(l => window.db.delete('loyaltyAccounts', l.id));

        window.utils.showToast("Guest profile deleted successfully.");
        this.renderList(document.getElementById('app-content'));
      }
    );
  },

  renderProfile(container) {
    const guest = window.db.getById('guests', this.selectedGuestId);
    if (!guest) {
      container.innerHTML = '<div class="empty-state">Guest record not found.</div>';
      return;
    }

    const idProofs = window.db.query('guestIdProofs', idp => idp.guestId === guest.id);
    const loyalty = window.db.query('loyaltyAccounts', loy => loy.guestId === guest.id)[0] || { tier: 'Silver', pointsBalance: 0, totalStays: 0 };
    const stays = window.db.query('bookings', b => b.guestId === guest.id);

    // Sort stays by check-in date desc
    stays.sort((a, b) => new Date(b.checkInDate) - new Date(a.checkInDate));

    container.innerHTML = `
      <div class="guests-header animate-fade-in">
        <h2>Guest Profile: ${guest.name}</h2>
        <button class="btn btn-outline btn-sm" id="profile-btn-back">← Back to List</button>
      </div>

      <div class="guest-profile-grid animate-fade-in">
        <!-- Details Card -->
        <div class="profile-card card">
          <h3>Personal Details</h3>
          <div class="detail-row"><span>Phone:</span><strong>${guest.phone}</strong></div>
          <div class="detail-row"><span>Email:</span><strong>${guest.email || '-'}</strong></div>
          <div class="detail-row"><span>DOB:</span><strong>${window.utils.formatDate(guest.dob) || '-'}</strong></div>
          <div class="detail-row"><span>Gender:</span><strong>${guest.gender || '-'}</strong></div>
          <div class="detail-row"><span>Nationality:</span><strong>${guest.nationality || '-'}</strong></div>
          <div class="detail-row"><span>Address:</span><strong>${guest.address || '-'}</strong></div>

          <h3 style="margin-top:25px;">Identity Documents</h3>
          ${idProofs.map(idp => `
            <div class="id-proof-item">
              <span class="id-icon">📄</span>
              <div class="id-details">
                <strong>${idp.type}</strong>
                <span>No. ${idp.number}</span>
              </div>
            </div>
          `).join('')}
          ${idProofs.length === 0 ? '<p class="text-muted" style="font-size:12px;">No ID document submitted.</p>' : ''}
        </div>

        <!-- Loyalty & History Card -->
        <div class="profile-card card">
          <h3>Loyalty Program</h3>
          <div class="loyalty-status-card">
            <span class="loyalty-tier-label">Member Tier</span>
            <span class="loyalty-tier-value ${loyalty.tier.toLowerCase()}">${loyalty.tier}</span>
            <div class="loyalty-stats-row">
              <div class="l-stat"><span>Points Balance</span><strong>${loyalty.pointsBalance} pts</strong></div>
              <div class="l-stat"><span>Completed Stays</span><strong>${loyalty.totalStays} nights</strong></div>
            </div>
          </div>

          <h3 style="margin-top:25px;">Stay History</h3>
          <div class="table-responsive">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th>Billing</th>
                </tr>
              </thead>
              <tbody>
                ${stays.map(s => {
                  let badge = 'badge-secondary';
                  if (s.bookingStatus === 'CheckedIn') badge = 'badge-success';
                  else if (s.bookingStatus === 'CheckedOut') badge = 'badge-info';
                  else if (s.bookingStatus === 'Cancelled') badge = 'badge-danger';
                  
                  return `
                    <tr>
                      <td><strong>${s.bookingReferenceNo}</strong></td>
                      <td>${window.utils.formatDate(s.checkInDate)} - ${window.utils.formatDate(s.checkOutDate)}</td>
                      <td><span class="badge ${badge}">${s.bookingStatus}</span></td>
                      <td>${window.utils.formatCurrency(s.totalAmount)}</td>
                    </tr>
                  `;
                }).join('')}
                ${stays.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">No reservations booked under this profile.</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('profile-btn-back').addEventListener('click', () => {
      this.activeView = 'list';
      this.render(container);
    });
  }
};

window.guestsController = guestsController;
