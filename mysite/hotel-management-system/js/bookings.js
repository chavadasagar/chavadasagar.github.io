/**
 * bookings.js - Reservation Engine, Booking Wizard, Check-in/out logic, Overlapping booking validator
 */

const bookingsController = {
  activeView: 'list', // 'list', 'details', 'wizard'
  selectedBookingId: null,

  // Wizard state
  wizardStep: 1,
  wizardData: {
    checkInDate: '',
    checkOutDate: '',
    adults: 1,
    children: 0,
    selectedRoomIds: [],
    guestId: '',
    specialRequests: '',
    promoCode: '',
    bookingSource: 'Website'
  },

  render(container) {
    if (this.activeView === 'list') {
      this.renderList(container);
    } else if (this.activeView === 'details') {
      this.renderDetails(container);
    } else if (this.activeView === 'wizard') {
      this.renderWizard(container);
    }
  },

  renderList(container) {
    const bookings = window.db.getAll('bookings');
    const guests = window.db.getAll('guests');

    container.innerHTML = `
      <div class="bookings-header animate-fade-in">
        <h2>Reservations</h2>
        <button class="btn btn-primary" id="btn-open-wizard"><span class="icon">📅</span> New Booking</button>
      </div>

      <!-- Filters -->
      <div class="list-filters card animate-fade-in">
        <div class="filter-row">
          <div class="filter-group">
            <label>Search:</label>
            <input type="text" id="filter-booking-search" placeholder="Guest name, email or Ref...">
          </div>
          <div class="filter-group">
            <label>Status:</label>
            <select id="filter-booking-status">
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="CheckedIn">Checked In</option>
              <option value="CheckedOut">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="filter-group">
            <label>Source:</label>
            <select id="filter-booking-source">
              <option value="All">All Sources</option>
              <option value="Website">Website</option>
              <option value="WalkIn">Walk-In</option>
              <option value="Phone">Phone</option>
              <option value="OTA">OTA (Online Travel Agent)</option>
            </select>
          </div>
        </div>
      </div>

      <div class="table-responsive card animate-fade-in">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Ref No</th>
              <th>Guest Name</th>
              <th>Dates</th>
              <th>Rooms</th>
              <th>Source</th>
              <th>Status</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="bookings-tbody"></tbody>
        </table>
      </div>
    `;

    document.getElementById('btn-open-wizard').addEventListener('click', () => {
      this.openBookingWizard();
    });

    const tbody = document.getElementById('bookings-tbody');
    const searchInput = document.getElementById('filter-booking-search');
    const statusSelect = document.getElementById('filter-booking-status');
    const sourceSelect = document.getElementById('filter-booking-source');

    const updateDisplay = () => {
      const query = searchInput.value.trim().toLowerCase();
      const status = statusSelect.value;
      const source = sourceSelect.value;

      let filtered = bookings.filter(b => {
        const guestObj = guests.find(g => g.id === b.guestId) || { name: '', email: '', phone: '' };
        const matchSearch = b.bookingReferenceNo.toLowerCase().includes(query) || 
                            guestObj.name.toLowerCase().includes(query) ||
                            guestObj.email.toLowerCase().includes(query) ||
                            guestObj.phone.includes(query);
        const matchStatus = status === 'All' || b.bookingStatus === status;
        const matchSource = source === 'All' || b.bookingSource === source;

        return matchSearch && matchStatus && matchSource;
      });

      // Sort bookings: CheckedIn & Confirmed on top, then by check-in date
      filtered.sort((a, b) => {
        const priority = { CheckedIn: 1, Confirmed: 2, Pending: 3, CheckedOut: 4, Cancelled: 5 };
        const scoreA = priority[a.bookingStatus] || 9;
        const scoreB = priority[b.bookingStatus] || 9;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return new Date(a.checkInDate) - new Date(b.checkInDate);
      });

      tbody.innerHTML = filtered.map(b => {
        const guestObj = guests.find(g => g.id === b.guestId) || { name: 'Unknown' };
        
        // Find mapped rooms
        const bookingRooms = window.db.query('bookingRooms', br => br.bookingId === b.id);
        const roomIds = bookingRooms.map(br => br.roomId);
        const allRooms = window.db.getAll('rooms');
        const roomNumbers = roomIds.map(rid => {
          const rObj = allRooms.find(r => r.id === rid);
          return rObj ? `#${rObj.roomNumber}` : 'Room';
        }).join(', ');

        let badgeClass = 'badge-secondary';
        if (b.bookingStatus === 'Confirmed') badgeClass = 'badge-primary';
        else if (b.bookingStatus === 'CheckedIn') badgeClass = 'badge-success';
        else if (b.bookingStatus === 'CheckedOut') badgeClass = 'badge-info';
        else if (b.bookingStatus === 'Cancelled') badgeClass = 'badge-danger';

        return `
          <tr>
            <td><strong>${b.bookingReferenceNo}</strong></td>
            <td>${guestObj.name}</td>
            <td>${window.utils.formatDate(b.checkInDate)} - ${window.utils.formatDate(b.checkOutDate)}</td>
            <td>${roomNumbers || 'None'}</td>
            <td>${b.bookingSource}</td>
            <td><span class="badge ${badgeClass}">${b.bookingStatus}</span></td>
            <td>${window.utils.formatCurrency(b.totalAmount)}</td>
            <td>
              <button class="btn btn-xs btn-outline btn-view-details" data-id="${b.id}">Manage</button>
            </td>
          </tr>
        `;
      }).join('');

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No reservations match the filters.</td></tr>';
      }

      // Action listener
      tbody.querySelectorAll('.btn-view-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          this.viewBookingDetails(id);
        });
      });
    };

    searchInput.addEventListener('input', updateDisplay);
    statusSelect.addEventListener('change', updateDisplay);
    sourceSelect.addEventListener('change', updateDisplay);

    updateDisplay();
  },

  openBookingWizard(source = 'Website') {
    this.activeView = 'wizard';
    this.wizardStep = 1;
    this.wizardData = {
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
      adults: 1,
      children: 0,
      selectedRoomIds: [],
      guestId: '',
      specialRequests: '',
      promoCode: '',
      bookingSource: source
    };
    this.render(document.getElementById('app-content'));
  },

  viewBookingDetails(bookingId) {
    this.activeView = 'details';
    this.selectedBookingId = bookingId;
    this.render(document.getElementById('app-content'));
  },

  renderWizard(container) {
    container.innerHTML = `
      <div class="wizard-container card animate-fade-in">
        <div class="wizard-header">
          <h2>Reservation Wizard</h2>
          <button class="btn btn-sm btn-outline" id="btn-cancel-wizard">Cancel</button>
        </div>

        <div class="wizard-steps-indicator">
          <span class="step-dot ${this.wizardStep >= 1 ? 'active' : ''} ${this.wizardStep > 1 ? 'completed' : ''}">1. Search Availability</span>
          <span class="step-dot ${this.wizardStep >= 2 ? 'active' : ''} ${this.wizardStep > 2 ? 'completed' : ''}">2. Select Rooms</span>
          <span class="step-dot ${this.wizardStep >= 3 ? 'active' : ''} ${this.wizardStep > 3 ? 'completed' : ''}">3. Assign Guest</span>
          <span class="step-dot ${this.wizardStep >= 4 ? 'active' : ''}">4. Review & Confirm</span>
        </div>

        <div class="wizard-step-body" id="wizard-step-body"></div>

        <div class="wizard-footer">
          <button class="btn btn-secondary" id="btn-wizard-prev" ${this.wizardStep === 1 ? 'disabled' : ''}>Previous</button>
          <button class="btn btn-primary" id="btn-wizard-next">Next</button>
        </div>
      </div>
    `;

    document.getElementById('btn-cancel-wizard').addEventListener('click', () => {
      this.activeView = 'list';
      this.render(container);
    });

    document.getElementById('btn-wizard-prev').addEventListener('click', () => {
      if (this.wizardStep > 1) {
        this.wizardStep--;
        this.renderWizardStep();
      }
    });

    document.getElementById('btn-wizard-next').addEventListener('click', () => {
      this.handleWizardNext();
    });

    this.renderWizardStep();
  },

  renderWizardStep() {
    const stepBody = document.getElementById('wizard-step-body');
    const data = this.wizardData;

    if (this.wizardStep === 1) {
      stepBody.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="wiz-checkin">Check-in Date*</label>
            <input type="date" id="wiz-checkin" value="${data.checkInDate}" required min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="wiz-checkout">Check-out Date*</label>
            <input type="date" id="wiz-checkout" value="${data.checkOutDate}" required>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="wiz-adults">Adults*</label>
            <input type="number" id="wiz-adults" min="1" max="10" value="${data.adults}">
          </div>
          <div class="form-group">
            <label for="wiz-children">Children</label>
            <input type="number" id="wiz-children" min="0" max="10" value="${data.children}">
          </div>
        </div>
        <div class="form-group">
          <label for="wiz-source">Booking Source</label>
          <select id="wiz-source">
            <option value="Website" ${data.bookingSource === 'Website' ? 'selected' : ''}>Website</option>
            <option value="WalkIn" ${data.bookingSource === 'WalkIn' ? 'selected' : ''}>Walk-in</option>
            <option value="Phone" ${data.bookingSource === 'Phone' ? 'selected' : ''}>Phone Booking</option>
            <option value="OTA" ${data.bookingSource === 'OTA' ? 'selected' : ''}>OTA (Online Travel Agent)</option>
          </select>
        </div>
      `;

      // Date verification
      const cin = document.getElementById('wiz-checkin');
      const cout = document.getElementById('wiz-checkout');
      
      const checkDates = () => {
        if (cin.value) {
          const minCout = new Date(cin.value);
          minCout.setDate(minCout.getDate() + 1);
          cout.min = minCout.toISOString().split('T')[0];
          if (cout.value <= cin.value) {
            cout.value = cout.min;
          }
        }
      };
      cin.addEventListener('change', checkDates);
      checkDates();

    } else if (this.wizardStep === 2) {
      // Step 2: Show available rooms
      const availableRooms = this.getAvailableRoomsForDates(data.checkInDate, data.checkOutDate);
      const roomTypes = window.db.getAll('roomTypes');
      
      if (availableRooms.length === 0) {
        stepBody.innerHTML = `
          <div class="empty-state">
            <p>⚠️ No rooms are available for the selected dates (${window.utils.formatDate(data.checkInDate)} to ${window.utils.formatDate(data.checkOutDate)}).</p>
            <button class="btn btn-outline" onclick="bookingsController.wizardStep = 1; bookingsController.renderWizardStep();">Change Dates</button>
          </div>
        `;
        document.getElementById('btn-wizard-next').disabled = true;
        return;
      }

      document.getElementById('btn-wizard-next').disabled = false;

      stepBody.innerHTML = `
        <p class="step-instructions">Select one or more rooms for this stay:</p>
        <div class="room-selection-grid">
          ${availableRooms.map(r => {
            const rt = roomTypes.find(t => t.id === r.roomTypeId) || { name: 'Unknown', basePrice: 0, image: '🏨' };
            const isChecked = data.selectedRoomIds.includes(r.id);
            return `
              <div class="room-select-card ${isChecked ? 'selected' : ''}" data-id="${r.id}">
                <div class="card-header">
                  <h3>Room #${r.roomNumber}</h3>
                  <input type="checkbox" class="room-select-cb" data-id="${r.id}" ${isChecked ? 'checked' : ''}>
                </div>
                <div class="card-body">
                  <div class="room-type-title">${rt.image} ${rt.name}</div>
                  <div class="room-details-small">View: ${r.viewType || 'Standard'} • Beds: ${rt.bedType}</div>
                  <div class="room-price">${window.utils.formatCurrency(rt.basePrice)} <span class="per-night">/ night</span></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Card selection click
      stepBody.querySelectorAll('.room-select-card').forEach(card => {
        card.addEventListener('click', (e) => {
          const rid = card.getAttribute('data-id');
          const cb = card.querySelector('.room-select-cb');
          
          if (e.target.type !== 'checkbox') {
            cb.checked = !cb.checked;
          }

          if (cb.checked) {
            card.classList.add('selected');
            if (!data.selectedRoomIds.includes(rid)) data.selectedRoomIds.push(rid);
          } else {
            card.classList.remove('selected');
            data.selectedRoomIds = data.selectedRoomIds.filter(id => id !== rid);
          }
        });
      });

    } else if (this.wizardStep === 3) {
      // Step 3: Choose or Create Guest
      const guests = window.db.getAll('guests');

      stepBody.innerHTML = `
        <div class="guest-selector-container">
          <div class="guest-search-pane card">
            <h4>Select Existing Guest</h4>
            <div class="form-group">
              <input type="text" id="wiz-guest-search" placeholder="Search by name, phone, email...">
            </div>
            <div class="guest-search-results" id="wiz-guest-search-results"></div>
          </div>
          
          <div class="guest-create-pane card">
            <h4>Or Add New Guest Inline</h4>
            <form id="wiz-guest-inline-form">
              <div class="form-group">
                <label>Full Name*</label>
                <input type="text" id="w-gst-name" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="w-gst-email">
                </div>
                <div class="form-group">
                  <label>Phone*</label>
                  <input type="text" id="w-gst-phone" required>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>Gender</label>
                  <select id="w-gst-gender">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Nationality</label>
                  <input type="text" id="w-gst-nationality" value="Indian">
                </div>
              </div>
              <button type="button" class="btn btn-secondary btn-block" id="btn-create-guest-inline">Create & Use Guest</button>
            </form>
          </div>
        </div>
        <div class="selected-guest-alert alert alert-info" id="selected-guest-info-alert">
          ${data.guestId ? `Active Selection: <strong>${(guests.find(g => g.id === data.guestId) || {}).name}</strong>` : 'No guest assigned yet.'}
        </div>
      `;

      // Live Search Guest
      const searchBox = document.getElementById('wiz-guest-search');
      const resultsDiv = document.getElementById('wiz-guest-search-results');

      const renderSearchResults = () => {
        const query = searchBox.value.toLowerCase();
        if (query.length < 2) {
          resultsDiv.innerHTML = '<p class="text-muted text-center" style="font-size:12px; margin-top:20px;">Type at least 2 characters to search...</p>';
          return;
        }

        const filtered = guests.filter(g => 
          g.name.toLowerCase().includes(query) ||
          g.phone.includes(query) ||
          (g.email && g.email.toLowerCase().includes(query))
        );

        resultsDiv.innerHTML = filtered.map(g => `
          <div class="guest-search-row ${data.guestId === g.id ? 'active' : ''}" data-id="${g.id}">
            <div class="g-search-name">${g.name}</div>
            <div class="g-search-meta">${g.phone} | ${g.email || 'No Email'}</div>
          </div>
        `).join('');

        if (filtered.length === 0) {
          resultsDiv.innerHTML = '<p class="text-center text-muted">No guests match. Create one on the right!</p>';
        }

        // Bind clicks
        resultsDiv.querySelectorAll('.guest-search-row').forEach(row => {
          row.addEventListener('click', () => {
            data.guestId = row.getAttribute('data-id');
            const targetName = row.querySelector('.g-search-name').innerText;
            document.getElementById('selected-guest-info-alert').innerHTML = `Active Selection: <strong>${targetName}</strong>`;
            renderSearchResults(); // updates active highlight
          });
        });
      };

      searchBox.addEventListener('input', renderSearchResults);
      renderSearchResults();

      // Inline Creation handler
      document.getElementById('btn-create-guest-inline').addEventListener('click', () => {
        const name = document.getElementById('w-gst-name').value.trim();
        const email = document.getElementById('w-gst-email').value.trim();
        const phone = document.getElementById('w-gst-phone').value.trim();
        const gender = document.getElementById('w-gst-gender').value;
        const nationality = document.getElementById('w-gst-nationality').value.trim();

        if (!name || !phone) {
          window.utils.showToast("Name and phone number are required.", "error");
          return;
        }

        if (email && !window.utils.validateEmail(email)) {
          window.utils.showToast("Invalid email address.", "error");
          return;
        }

        // Check duplicates warning
        const duplicate = guests.find(g => g.phone === phone || (email && g.email === email));
        if (duplicate) {
          window.utils.confirm(
            "Duplicate Guest Found",
            `A guest named ${duplicate.name} already exists with the same phone/email. Do you want to use the existing guest profile instead?`,
            () => {
              data.guestId = duplicate.id;
              document.getElementById('selected-guest-info-alert').innerHTML = `Active Selection: <strong>${duplicate.name}</strong>`;
            }
          );
          return;
        }

        // Save new guest
        const newGuest = window.db.create('guests', { name, email, phone, gender, nationality, dob: '', address: '' });
        
        // Auto create loyalty record
        window.db.create('loyaltyAccounts', { guestId: newGuest.id, tier: 'Silver', pointsBalance: 0, totalStays: 0 });

        data.guestId = newGuest.id;
        document.getElementById('selected-guest-info-alert').innerHTML = `Active Selection: <strong>${newGuest.name}</strong>`;
        window.utils.showToast(`Guest profile created and selected! ✅`);
        
        // Clear inline form
        document.getElementById('wiz-guest-inline-form').reset();
      });

    } else if (this.wizardStep === 4) {
      // Step 4: Summarize stay details, pricing, discount, promo code
      const guestObj = window.db.getById('guests', data.guestId) || { name: 'Unknown' };
      const rooms = window.db.getAll('rooms');
      const roomTypes = window.db.getAll('roomTypes');
      
      const selectedRooms = data.selectedRoomIds.map(id => rooms.find(r => r.id === id));
      const nights = window.utils.calculateNights(data.checkInDate, data.checkOutDate);

      // Pricing logic
      let subTotal = 0;
      selectedRooms.forEach(r => {
        const rt = roomTypes.find(t => t.id === r.roomTypeId) || { basePrice: 0 };
        subTotal += rt.basePrice * nights;
      });

      // Promo validation
      let discountAmount = 0;
      let promoAppliedText = '';
      if (data.promoCode) {
        const promo = window.db.getAll('promoCodes').find(p => p.code.toUpperCase() === data.promoCode.trim().toUpperCase() && p.active);
        if (promo) {
          // Check limits/minAmount
          const today = new Date().toISOString().split('T')[0];
          if (today >= promo.startDate && today <= promo.endDate) {
            if (subTotal >= promo.minAmount) {
              if (promo.usageCount < promo.usageLimit) {
                if (promo.type === 'Percentage') {
                  discountAmount = parseFloat(((subTotal * promo.value) / 100).toFixed(2));
                } else {
                  discountAmount = promo.value;
                }
                promoAppliedText = `<span class="text-success">Promo Applied: ${promo.code} (-${window.utils.formatCurrency(discountAmount)})</span>`;
              } else {
                promoAppliedText = '<span class="text-danger">Promo usage limit exceeded.</span>';
              }
            } else {
              promoAppliedText = `<span class="text-danger">Min billing amount for promo is ${window.utils.formatCurrency(promo.minAmount)}.</span>`;
            }
          } else {
            promoAppliedText = '<span class="text-danger">Promo code expired or not active yet.</span>';
          }
        } else {
          promoAppliedText = '<span class="text-danger">Invalid promo code.</span>';
        }
      }

      const taxRate = 12; // 12% GST
      const taxableSubTotal = Math.max(0, subTotal - discountAmount);
      const taxAmount = parseFloat(((taxableSubTotal * taxRate) / 100).toFixed(2));
      const totalAmount = taxableSubTotal + taxAmount;

      // Store in memory to retrieve during completion
      this.calculatedBookingTotal = {
        subTotal,
        discountAmount,
        taxAmount,
        totalAmount
      };

      stepBody.innerHTML = `
        <div class="review-wizard-grid">
          <div class="review-details card">
            <h4>Stay Details</h4>
            <div class="detail-row"><span>Guest:</span><strong>${guestObj.name}</strong></div>
            <div class="detail-row"><span>Dates:</span><strong>${window.utils.formatDate(data.checkInDate)} to ${window.utils.formatDate(data.checkOutDate)} (${nights} nights)</strong></div>
            <div class="detail-row"><span>Occupants:</span><strong>${data.adults} Adults, ${data.children} Children</strong></div>
            <div class="detail-row"><span>Booking Source:</span><strong>${data.bookingSource}</strong></div>
            <div class="detail-row"><span>Rooms:</span><strong>${selectedRooms.map(r => `#${r.roomNumber}`).join(', ')}</strong></div>
            <div class="form-group" style="margin-top:15px;">
              <label>Special Requests / Notes</label>
              <textarea id="wiz-requests" rows="3" placeholder="Dietary requests, floor preferences...">${data.specialRequests}</textarea>
            </div>
          </div>
          
          <div class="review-pricing card">
            <h4>Rate Breakdown</h4>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Rate/Night</th>
                    <th>Nights</th>
                    <th class="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${selectedRooms.map(r => {
                    const rt = roomTypes.find(t => t.id === r.roomTypeId) || { basePrice: 0 };
                    return `
                      <tr>
                        <td>Room #${r.roomNumber}</td>
                        <td>${window.utils.formatCurrency(rt.basePrice)}</td>
                        <td>${nights}</td>
                        <td class="text-right">${window.utils.formatCurrency(rt.basePrice * nights)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <div class="promo-application-box">
              <div class="form-row">
                <input type="text" id="wiz-promo-input" value="${data.promoCode}" placeholder="Promo Code (e.g. WELCOME10)">
                <button class="btn btn-secondary" id="btn-apply-promo">Apply</button>
              </div>
              <div id="promo-msg-holder" style="margin-top: 5px; font-size: 12px;">${promoAppliedText}</div>
            </div>

            <hr>
            
            <div class="billing-summary-section">
              <div class="detail-row"><span>Billing Subtotal:</span><strong>${window.utils.formatCurrency(subTotal)}</strong></div>
              ${discountAmount > 0 ? `<div class="detail-row text-success"><span>Discounts:</span><strong>-${window.utils.formatCurrency(discountAmount)}</strong></div>` : ''}
              <div class="detail-row"><span>GST (${taxRate}%):</span><strong>${window.utils.formatCurrency(taxAmount)}</strong></div>
              <div class="detail-row total-row"><span>Total Amount:</span><strong>${window.utils.formatCurrency(totalAmount)}</strong></div>
            </div>
          </div>
        </div>
      `;

      // Special request sync
      document.getElementById('wiz-requests').addEventListener('input', (e) => {
        data.specialRequests = e.target.value;
      });

      // Apply promo trigger
      document.getElementById('btn-apply-promo').addEventListener('click', () => {
        data.promoCode = document.getElementById('wiz-promo-input').value.toUpperCase().trim();
        this.renderWizardStep(); // Refresh step 4 billing totals
      });
    }
  },

  handleWizardNext() {
    const data = this.wizardData;

    if (this.wizardStep === 1) {
      // Validate dates
      if (!data.checkInDate || !data.checkOutDate) {
        window.utils.showToast("Please pick check-in and check-out dates.", "error");
        return;
      }
      if (new Date(data.checkInDate) >= new Date(data.checkOutDate)) {
        window.utils.showToast("Check-out date must be after check-in date.", "error");
        return;
      }
      
      const sourceSelect = document.getElementById('wiz-source');
      if (sourceSelect) {
        data.bookingSource = sourceSelect.value;
        data.adults = parseInt(document.getElementById('wiz-adults').value) || 1;
        data.children = parseInt(document.getElementById('wiz-children').value) || 0;
      }

      this.wizardStep = 2;
      this.renderWizardStep();

    } else if (this.wizardStep === 2) {
      if (data.selectedRoomIds.length === 0) {
        window.utils.showToast("Please select at least one available room.", "error");
        return;
      }
      this.wizardStep = 3;
      this.renderWizardStep();

    } else if (this.wizardStep === 3) {
      if (!data.guestId) {
        window.utils.showToast("Please choose or register a guest to proceed.", "error");
        return;
      }
      this.wizardStep = 4;
      this.renderWizardStep();

    } else if (this.wizardStep === 4) {
      // Confirm Booking
      this.executeCreateBooking();
    }
  },

  executeCreateBooking() {
    const data = this.wizardData;
    const pricing = this.calculatedBookingTotal;
    const rooms = window.db.getAll('rooms');
    const roomTypes = window.db.getAll('roomTypes');
    const user = window.auth.getCurrentUser() || { id: 'unknown_system' };

    // Final overlap check to prevent double bookings
    for (const rid of data.selectedRoomIds) {
      const isRoomFree = this.checkRoomAvailabilityForDates(rid, data.checkInDate, data.checkOutDate);
      if (!isRoomFree) {
        const roomObj = rooms.find(r => r.id === rid) || { roomNumber: 'Unknown' };
        window.utils.showToast(`Double Booking Alert: Room #${roomObj.roomNumber} has just been reserved by another transaction. Please search again. ❌`, 'error');
        this.wizardStep = 2;
        this.renderWizardStep();
        return;
      }
    }

    // Incremental reference number
    const allBookings = window.db.getAll('bookings');
    const lastNum = allBookings.length + 101;
    const refNum = `STAY-${new Date().getFullYear()}-${String(lastNum).padStart(4, '0')}`;

    const newBooking = {
      bookingReferenceNo: refNum,
      guestId: data.guestId,
      hotelId: 'hot_1',
      bookingSource: data.bookingSource,
      bookingStatus: 'Confirmed',
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      actualCheckInTime: null,
      actualCheckOutTime: null,
      totalAdults: data.adults,
      totalChildren: data.children,
      specialRequests: data.specialRequests,
      totalAmount: pricing.totalAmount,
      discountAmount: pricing.discountAmount,
      createdByEmployeeId: user.id
    };

    const savedBooking = window.db.create('bookings', newBooking);

    // Create bookingRoom entries
    data.selectedRoomIds.forEach(rid => {
      const room = rooms.find(r => r.id === rid);
      const rt = roomTypes.find(t => t.id === room.roomTypeId);
      const nights = window.utils.calculateNights(data.checkInDate, data.checkOutDate);
      
      window.db.create('bookingRooms', {
        bookingId: savedBooking.id,
        roomId: rid,
        ratePerNight: rt.basePrice,
        nights: nights,
        roomStatus: 'Reserved'
      });
    });

    // Increment promo usage code
    if (data.promoCode) {
      const promo = window.db.getAll('promoCodes').find(p => p.code.toUpperCase() === data.promoCode.trim().toUpperCase() && p.active);
      if (promo) {
        window.db.update('promoCodes', promo.id, { usageCount: (promo.usageCount || 0) + 1 });
      }
    }

    // Trigger Notification badge check
    if (window.mainApp && typeof window.mainApp.checkNotifications === 'function') {
      window.mainApp.checkNotifications();
    }

    window.utils.showToast(`Booking ${refNum} Confirmed successfully! ✅`, 'success');
    this.viewBookingDetails(savedBooking.id);
  },

  renderDetails(container) {
    const booking = window.db.getById('bookings', this.selectedBookingId);
    if (!booking) {
      container.innerHTML = '<div class="empty-state">Booking record not found.</div>';
      return;
    }

    const guest = window.db.getById('guests', booking.guestId) || { name: 'Unknown', phone: '-', email: '-' };
    const bookingRooms = window.db.query('bookingRooms', br => br.bookingId === booking.id);
    const rooms = window.db.getAll('rooms');
    const roomTypes = window.db.getAll('roomTypes');
    const employee = window.db.getById('users', booking.createdByEmployeeId) || { name: 'System' };

    // Find linked invoices
    const invoice = window.db.query('invoices', inv => inv.bookingId === booking.id)[0];

    let actionButtons = '';
    const user = window.auth.getCurrentUser();

    if (booking.bookingStatus === 'Confirmed') {
      actionButtons = `
        <button class="btn btn-success" id="detail-btn-checkin">📥 Check-In Guest</button>
        <button class="btn btn-danger" id="detail-btn-cancel">❌ Cancel Booking</button>
      `;
    } else if (booking.bookingStatus === 'CheckedIn') {
      actionButtons = `
        <button class="btn btn-warning" id="detail-btn-checkout">📤 Check-Out Guest</button>
        <button class="btn btn-primary" id="detail-btn-order-service">🍽️ Order Room Service</button>
      `;
    }

    container.innerHTML = `
      <div class="bookings-header animate-fade-in">
        <h2>Booking Details: ${booking.bookingReferenceNo}</h2>
        <button class="btn btn-outline btn-sm" id="detail-btn-back">← Back to List</button>
      </div>

      <div class="booking-detail-grid animate-fade-in">
        <div class="detail-col-left">
          <!-- Reservation Summary -->
          <div class="detail-card card">
            <div class="card-title-row">
              <h3>Stay Summary</h3>
              <span class="badge ${booking.bookingStatus === 'Confirmed' ? 'badge-primary' : booking.bookingStatus === 'CheckedIn' ? 'badge-success' : booking.bookingStatus === 'CheckedOut' ? 'badge-info' : 'badge-danger'}">${booking.bookingStatus}</span>
            </div>
            
            <div class="detail-row"><span>Source:</span><strong>${booking.bookingSource}</strong></div>
            <div class="detail-row"><span>Dates:</span><strong>${window.utils.formatDate(booking.checkInDate)} to ${window.utils.formatDate(booking.checkOutDate)}</strong></div>
            <div class="detail-row"><span>Actual Check-in:</span><strong>${window.utils.formatDate(booking.actualCheckInTime, true)}</strong></div>
            <div class="detail-row"><span>Actual Check-out:</span><strong>${window.utils.formatDate(booking.actualCheckOutTime, true)}</strong></div>
            <div class="detail-row"><span>Occupants:</span><strong>${booking.totalAdults} Adults, ${booking.totalChildren} Children</strong></div>
            <div class="detail-row"><span>Created By:</span><strong>${employee.name}</strong></div>
            <div class="detail-row"><span>Booked Rooms:</span><strong>
              ${bookingRooms.map(br => {
                const r = rooms.find(rm => rm.id === br.roomId) || { roomNumber: '?' };
                const rt = roomTypes.find(t => t.id === r.roomTypeId) || { name: '?' };
                return `Room #${r.roomNumber} (${rt.name})`;
              }).join('<br>')}
            </strong></div>
            <div class="detail-row"><span>Requests:</span><p style="font-size:12px; margin: 4px 0 0 0; color:var(--text-muted);">${booking.specialRequests || 'No special requests.'}</p></div>

            <div class="detail-actions" style="margin-top:20px;">
              ${actionButtons}
            </div>
          </div>

          <!-- Services Ordered during stay -->
          <div class="detail-card card" style="margin-top:20px;">
            <h3>Room Service & Charges</h3>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="detail-services-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="detail-col-right">
          <!-- Guest Profile Box -->
          <div class="detail-card card">
            <h3>Guest Information</h3>
            <div class="detail-row"><span>Name:</span><strong>${guest.name}</strong></div>
            <div class="detail-row"><span>Phone:</span><strong>${guest.phone}</strong></div>
            <div class="detail-row"><span>Email:</span><strong>${guest.email || '-'}</strong></div>
            <div class="detail-row"><span>Nationality:</span><strong>${guest.nationality || '-'}</strong></div>
            
            <div id="guest-id-warnings-box" style="margin-top:10px;"></div>
          </div>

          <!-- Invoice & Payments Box -->
          <div class="detail-card card" style="margin-top:20px;">
            <h3>Invoice & Payments</h3>
            ${invoice ? `
              <div class="invoice-summary-box">
                <div class="detail-row"><span>Invoice Number:</span><strong>${invoice.invoiceNumber}</strong></div>
                <div class="detail-row"><span>Subtotal:</span><strong>${window.utils.formatCurrency(invoice.subTotal)}</strong></div>
                <div class="detail-row"><span>Discount:</span><strong>-${window.utils.formatCurrency(invoice.discountAmount)}</strong></div>
                <div class="detail-row"><span>Tax (12%):</span><strong>${window.utils.formatCurrency(invoice.taxAmount)}</strong></div>
                <div class="detail-row"><span>Total Payable:</span><strong>${window.utils.formatCurrency(invoice.totalAmount)}</strong></div>
                <div class="detail-row"><span>Status:</span><span class="badge ${invoice.paymentStatus === 'Paid' ? 'badge-success' : invoice.paymentStatus === 'PartiallyPaid' ? 'badge-warning' : 'badge-danger'}">${invoice.paymentStatus}</span></div>
                
                <div class="invoice-buttons" style="margin-top:15px; display:flex; gap:10px;">
                  <button class="btn btn-secondary btn-sm" id="detail-btn-view-invoice">📄 Open Invoice</button>
                  ${invoice.paymentStatus !== 'Paid' ? `<button class="btn btn-primary btn-sm" id="detail-btn-add-payment">💰 Add Payment</button>` : ''}
                </div>
              </div>
            ` : `
              <p class="text-muted">Invoice will be automatically generated upon guest check-out, or you can create a preliminary invoice.</p>
              <button class="btn btn-secondary btn-sm" id="detail-btn-create-invoice">Generate Bill Preview</button>
            `}
          </div>
        </div>
      </div>

      <!-- Add Payment Modal -->
      <div id="payment-modal" class="modal-backdrop" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Add Transaction Payment</h3>
            <button class="modal-close-btn" id="btn-close-payment-modal">&times;</button>
          </div>
          <form id="payment-form">
            <div class="modal-body">
              <div class="detail-row"><span>Invoice Balance:</span><strong id="pay-balance-label"></strong></div>
              <div class="form-group" style="margin-top: 15px;">
                <label for="pay-amount">Amount*</label>
                <input type="number" id="pay-amount" step="0.01" required>
              </div>
              <div class="form-group">
                <label for="pay-mode">Payment Method*</label>
                <select id="pay-mode" required>
                  <option value="Cash">Cash</option>
                  <option value="Card">Credit/Debit Card</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="NetBanking">Net Banking</option>
                </select>
              </div>
              <div class="form-group">
                <label for="pay-ref">Transaction Reference (ID)</label>
                <input type="text" id="pay-ref" placeholder="UPI transaction ID / receipt number">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-cancel-payment-modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Process Payment</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('detail-btn-back').addEventListener('click', () => {
      this.activeView = 'list';
      this.render(container);
    });

    // Populate active services ordered list
    const activeServicesTbody = document.getElementById('detail-services-tbody');
    const serviceOrders = window.db.query('serviceOrders', svo => svo.bookingId === booking.id);
    const services = window.db.getAll('services');

    activeServicesTbody.innerHTML = serviceOrders.map(svo => {
      const s = services.find(srv => srv.id === svo.serviceId) || { name: 'Service Item', price: 0 };
      return `
        <tr>
          <td>${s.name}</td>
          <td>x${svo.quantity}</td>
          <td>${window.utils.formatCurrency(s.price)}</td>
          <td>${window.utils.formatCurrency(s.price * svo.quantity)}</td>
          <td><span class="badge ${svo.status === 'Delivered' ? 'badge-success' : svo.status === 'InProgress' ? 'badge-warning' : 'badge-secondary'}">${svo.status}</span></td>
        </tr>
      `;
    }).join('');

    if (serviceOrders.length === 0) {
      activeServicesTbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No additional service charges.</td></tr>';
    }

    // Verify Guest ID proof warning
    const idProofs = window.db.query('guestIdProofs', idp => idp.guestId === booking.guestId);
    const warningsBox = document.getElementById('guest-id-warnings-box');
    if (idProofs.length === 0) {
      warningsBox.innerHTML = `
        <div class="alert alert-danger" style="margin-bottom:0; font-size:12px;">
          ⚠️ ID Verification Required! Guest has not submitted identity proofs.
        </div>
      `;
    } else {
      warningsBox.innerHTML = `
        <div class="alert alert-success" style="margin-bottom:0; font-size:12px;">
          ✓ ID Verified: ${idProofs[0].type} (${idProofs[0].number})
        </div>
      `;
    }

    // Check-in action
    if (booking.bookingStatus === 'Confirmed') {
      document.getElementById('detail-btn-checkin').addEventListener('click', () => {
        // If ID proof is missing, warning check first
        if (idProofs.length === 0) {
          window.utils.confirm(
            "Missing Guest ID Proof",
            "This guest does not have any ID proof registered in the system. Would you like to check them in anyway and record the ID proof later?",
            () => this.executeCheckIn(booking)
          );
        } else {
          this.executeCheckIn(booking);
        }
      });

      document.getElementById('detail-btn-cancel').addEventListener('click', () => {
        window.utils.confirm(
          "Cancel Reservation",
          `Are you sure you want to cancel booking reference ${booking.bookingReferenceNo}?`,
          () => {
            window.db.update('bookings', booking.id, { bookingStatus: 'Cancelled' });
            // Release rooms
            bookingRooms.forEach(br => {
              window.db.update('bookingRooms', br.id, { roomStatus: 'Released' });
            });
            window.utils.showToast("Booking cancelled successfully.");
            this.viewBookingDetails(booking.id);
          }
        );
      });
    }

    // Order Service quick-launch
    if (booking.bookingStatus === 'CheckedIn') {
      document.getElementById('detail-btn-order-service').addEventListener('click', () => {
        window.location.hash = '#services';
        setTimeout(() => {
          if (window.servicesController && typeof window.servicesController.openOrderModal === 'function') {
            const firstRoomId = bookingRooms[0] ? bookingRooms[0].roomId : '';
            window.servicesController.openOrderModal(booking.id, firstRoomId);
          }
        }, 100);
      });

      // Check-out action
      document.getElementById('detail-btn-checkout').addEventListener('click', () => {
        // If invoice is unpaid or partially paid, trigger warn prompt
        if (invoice && invoice.paymentStatus !== 'Paid') {
          const unpaidVal = invoice.totalAmount - this.getInvoicePaidSum(invoice.id);
          window.utils.confirm(
            "Pending Invoice Payment",
            `Guest has an outstanding balance of ${window.utils.formatCurrency(unpaidVal)}. Please process final payment before checking out.`,
            () => {
              this.openPaymentModal(invoice);
            }
          );
        } else {
          window.utils.confirm(
            "Guest Check-out",
            "Proceed with guest check-out? Rooms will be marked DIRTY and housekeeping tasks created.",
            () => this.executeCheckOut(booking, invoice)
          );
        }
      });
    }

    // Invoicing actions
    if (invoice) {
      document.getElementById('detail-btn-view-invoice').addEventListener('click', () => {
        window.location.hash = '#billing';
        setTimeout(() => {
          if (window.billingController && typeof window.billingController.viewInvoiceDetails === 'function') {
            window.billingController.viewInvoiceDetails(invoice.id);
          }
        }, 100);
      });

      if (invoice.paymentStatus !== 'Paid') {
        document.getElementById('detail-btn-add-payment').addEventListener('click', () => {
          this.openPaymentModal(invoice);
        });
      }
    } else {
      document.getElementById('detail-btn-create-invoice').addEventListener('click', () => {
        this.generateInvoice(booking);
        this.viewBookingDetails(booking.id);
      });
    }
  },

  executeCheckIn(booking) {
    const bookingRooms = window.db.query('bookingRooms', br => br.bookingId === booking.id);
    
    // Update booking status
    window.db.update('bookings', booking.id, {
      bookingStatus: 'CheckedIn',
      actualCheckInTime: new Date().toISOString()
    });

    // Update mapped rooms status
    bookingRooms.forEach(br => {
      window.db.update('bookingRooms', br.id, { roomStatus: 'CheckedIn' });
      window.db.update('rooms', br.roomId, { status: 'Occupied', housekeepingStatus: 'Clean' });
    });

    window.utils.showToast("Guest checked in successfully! Room status marked as OCCUPIED. 🔑");
    this.viewBookingDetails(booking.id);
  },

  executeCheckOut(booking, invoice) {
    const bookingRooms = window.db.query('bookingRooms', br => br.bookingId === booking.id);
    
    // Update booking status
    window.db.update('bookings', booking.id, {
      bookingStatus: 'CheckedOut',
      actualCheckOutTime: new Date().toISOString()
    });

    // Update rooms to Dirty/Available (Available to book next, but dirty)
    bookingRooms.forEach(br => {
      window.db.update('bookingRooms', br.id, { roomStatus: 'CheckedOut' });
      window.db.update('rooms', br.roomId, { status: 'Available', housekeepingStatus: 'Dirty' });
      
      // Auto-trigger housekeeping cleaning task
      window.db.create('housekeepingTasks', {
        roomId: br.roomId,
        taskType: 'Cleaning',
        status: 'Pending',
        assignedEmployeeId: null,
        notes: `Auto-created upon guest checkout of booking ${booking.bookingReferenceNo}.`
      });
    });

    // Generate Invoice if not created yet
    if (!invoice) {
      this.generateInvoice(booking);
    }

    // Recalculate loyalty account stays + points
    const loyalty = window.db.query('loyaltyAccounts', loy => loy.guestId === booking.guestId)[0];
    if (loyalty) {
      const activeInv = window.db.query('invoices', inv => inv.bookingId === booking.id)[0];
      const spent = activeInv ? activeInv.subTotal : booking.totalAmount;
      
      const newStays = (loyalty.totalStays || 0) + 1;
      // 1 point per 10 INR spent
      const newPoints = (loyalty.pointsBalance || 0) + Math.round(spent / 10);
      let tier = 'Silver';
      if (newStays >= 8) tier = 'Platinum';
      else if (newStays >= 4) tier = 'Gold';

      window.db.update('loyaltyAccounts', loyalty.id, {
        totalStays: newStays,
        pointsBalance: newPoints,
        tier: tier
      });
    }

    window.utils.showToast("Checkout finalized! Rooms marked DIRTY. Housekeeping notified. 🧹");
    this.viewBookingDetails(booking.id);
  },

  generateInvoice(booking) {
    const allInvs = window.db.getAll('invoices');
    const invNum = `INV-2026-${String(allInvs.length + 101).padStart(4, '0')}`;
    
    const bookingRooms = window.db.query('bookingRooms', br => br.bookingId === booking.id);
    const rooms = window.db.getAll('rooms');
    const roomTypes = window.db.getAll('roomTypes');

    let subTotal = 0;
    
    // Create new Invoice record
    const invoice = window.db.create('invoices', {
      invoiceNumber: invNum,
      bookingId: booking.id,
      subTotal: 0,
      taxAmount: 0,
      discountAmount: booking.discountAmount,
      totalAmount: 0,
      invoiceDate: new Date().toISOString().split('T')[0],
      paymentStatus: 'Unpaid'
    });

    // 1. Add Room Charges
    bookingRooms.forEach(br => {
      const room = rooms.find(rm => rm.id === br.roomId);
      const rt = roomTypes.find(t => t.id === room.roomTypeId);
      const rowPrice = br.ratePerNight * br.nights;
      subTotal += rowPrice;

      window.db.create('invoiceItems', {
        invoiceId: invoice.id,
        itemType: 'RoomCharge',
        description: `Room #${room.roomNumber} - ${rt.name} (${br.nights} nights)`,
        quantity: br.nights,
        unitPrice: br.ratePerNight,
        amount: rowPrice
      });
    });

    // 2. Add Service charges
    const serviceOrders = window.db.query('serviceOrders', svo => svo.bookingId === booking.id);
    const services = window.db.getAll('services');

    serviceOrders.forEach(svo => {
      const s = services.find(srv => srv.id === svo.serviceId) || { name: 'Service Charge', price: 0 };
      const rowPrice = s.price * svo.quantity;
      subTotal += rowPrice;

      window.db.create('invoiceItems', {
        invoiceId: invoice.id,
        itemType: 'ServiceCharge',
        description: `Room Service: ${s.name} (x${svo.quantity})`,
        quantity: svo.quantity,
        unitPrice: s.price,
        amount: rowPrice
      });
    });

    const taxAmount = parseFloat(((subTotal - booking.discountAmount) * 0.12).toFixed(2));
    const totalAmount = (subTotal - booking.discountAmount) + taxAmount;

    // Update main invoice totals
    window.db.update('invoices', invoice.id, {
      subTotal,
      taxAmount,
      totalAmount
    });

    window.utils.showToast(`Invoice ${invNum} generated!`);
  },

  getInvoicePaidSum(invoiceId) {
    const pmts = window.db.query('payments', p => p.invoiceId === invoiceId);
    return pmts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
  },

  openPaymentModal(invoice) {
    const paid = this.getInvoicePaidSum(invoice.id);
    const bal = Math.max(0, invoice.totalAmount - paid);
    
    document.getElementById('pay-balance-label').innerText = window.utils.formatCurrency(bal);
    document.getElementById('pay-amount').value = bal.toFixed(2);
    document.getElementById('pay-amount').max = bal;
    
    // Bind submission
    const form = document.getElementById('payment-form');
    form.replaceWith(form.cloneNode(true)); // remove old listeners
    
    const newForm = document.getElementById('payment-form');
    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = parseFloat(document.getElementById('pay-amount').value);
      const mode = document.getElementById('pay-mode').value;
      const ref = document.getElementById('pay-ref').value.trim() || 'REF-' + Date.now();

      if (isNaN(amount) || amount <= 0 || amount > bal + 0.01) {
        window.utils.showToast("Invalid payment amount entered.", "error");
        return;
      }

      // Record transaction
      window.db.create('payments', {
        invoiceId: invoice.id,
        paymentMode: mode,
        amount: amount,
        transactionReference: ref,
        paymentDate: new Date().toISOString()
      });

      // Update status
      const totalPaidNow = paid + amount;
      let status = 'PartiallyPaid';
      if (totalPaidNow >= invoice.totalAmount - 0.05) {
        status = 'Paid';
      }

      window.db.update('invoices', invoice.id, { paymentStatus: status });
      window.utils.showToast(`Payment of ${window.utils.formatCurrency(amount)} processed successfully! ✅`);
      
      document.getElementById('payment-modal').style.display = 'none';
      this.viewBookingDetails(invoice.bookingId);
    });

    document.getElementById('payment-modal').style.display = 'flex';

    const cleanUp = () => {
      document.getElementById('payment-modal').style.display = 'none';
    };
    document.getElementById('btn-close-payment-modal').addEventListener('click', cleanUp);
    document.getElementById('btn-cancel-payment-modal').addEventListener('click', cleanUp);
  },

  // Overlap dates search
  getAvailableRoomsForDates(checkIn, checkOut) {
    const rooms = window.db.getAll('rooms');
    const filterAvailable = rooms.filter(r => r.status !== 'Maintenance' && r.status !== 'Blocked');
    
    return filterAvailable.filter(r => {
      return this.checkRoomAvailabilityForDates(r.id, checkIn, checkOut);
    });
  },

  // Core business logic to prevent double bookings
  checkRoomAvailabilityForDates(roomId, targetCheckIn, targetCheckOut) {
    const bookings = window.db.getAll('bookings');
    // Find active overlapping bookings
    const overlapping = bookings.filter(b => 
      b.bookingStatus !== 'Cancelled' &&
      b.bookingStatus !== 'CheckedOut' &&
      ((targetCheckIn < b.checkOutDate && targetCheckOut > b.checkInDate))
    );

    if (overlapping.length === 0) return true;

    // Verify if target room is linked to these overlaps
    const bookingRooms = window.db.getAll('bookingRooms');
    const overlapRoomMappings = bookingRooms.filter(br => 
      br.roomId === roomId &&
      br.roomStatus !== 'CheckedOut' &&
      br.roomStatus !== 'Released' &&
      overlapping.some(ob => ob.id === br.bookingId)
    );

    return overlapRoomMappings.length === 0;
  }
};

window.bookingsController = bookingsController;
