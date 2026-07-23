/**
 * Library Seat Booking & Billing System - Seat Management Module (seats.js)
 * Manages seats list, status toggling, blocking/unblocking, and CRUD safety checks.
 */

(function () {
  // Global Namespace
  window.Seats = {
    /**
     * Get all seats.
     */
    getAll: function () {
      return DB.getAll(DB.KEYS.SEATS);
    },

    /**
     * Add a new seat.
     */
    addSeat: function (seatNumber, zone) {
      if (!seatNumber || !zone) {
        return { success: false, message: 'Seat number and zone are required.' };
      }

      const seats = this.getAll();
      const duplicate = seats.some(s => s.seatNumber.toLowerCase() === seatNumber.trim().toLowerCase());
      if (duplicate) {
        return { success: false, message: `Seat "${seatNumber}" already exists.` };
      }

      const newSeat = {
        id: DB.generateId('seat'),
        seatNumber: seatNumber.trim(),
        zone: zone,
        status: 'Available',
        blockedReason: ''
      };

      DB.insert(DB.KEYS.SEATS, newSeat);
      return { success: true, seat: newSeat };
    },

    /**
     * Edit an existing seat.
     */
    editSeat: function (id, updates) {
      const seat = DB.getById(DB.KEYS.SEATS, id);
      if (!seat) {
        return { success: false, message: 'Seat not found.' };
      }

      // If seatNumber is being updated, verify it is unique
      if (updates.seatNumber && updates.seatNumber.trim().toLowerCase() !== seat.seatNumber.toLowerCase()) {
        const seats = this.getAll();
        const duplicate = seats.some(s => s.seatNumber.toLowerCase() === updates.seatNumber.trim().toLowerCase());
        if (duplicate) {
          return { success: false, message: `Seat "${updates.seatNumber}" already exists.` };
        }
        updates.seatNumber = updates.seatNumber.trim();
      }

      const updated = DB.update(DB.KEYS.SEATS, id, updates);
      return { success: true, seat: updated };
    },

    /**
     * Block a seat manually for maintenance.
     */
    blockSeat: function (id, reason) {
      if (!reason || !reason.trim()) {
        return { success: false, message: 'A reason is required to block a seat.' };
      }
      return this.editSeat(id, { status: 'Blocked', blockedReason: reason.trim() });
    },

    /**
     * Unblock a seat, making it available.
     */
    unblockSeat: function (id) {
      return this.editSeat(id, { status: 'Available', blockedReason: '' });
    },

    /**
     * Delete a seat if there are no active/upcoming bookings.
     */
    deleteSeat: function (id) {
      const seat = DB.getById(DB.KEYS.SEATS, id);
      if (!seat) {
        return { success: false, message: 'Seat not found.' };
      }

      // Check for active bookings (PendingPayment, Confirmed, CheckedIn)
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const hasActiveBookings = bookings.some(b => 
        b.seatId === id && 
        ['PendingPayment', 'Confirmed', 'CheckedIn'].includes(b.status)
      );

      if (hasActiveBookings) {
        return { 
          success: false, 
          message: 'Cannot delete seat: It is currently occupied or has pending/confirmed upcoming bookings.' 
        };
      }

      const deleted = DB.remove(DB.KEYS.SEATS, id);
      if (deleted) {
        return { success: true, message: 'Seat removed successfully.' };
      } else {
        return { success: false, message: 'Failed to delete seat.' };
      }
    }
  };
})();
