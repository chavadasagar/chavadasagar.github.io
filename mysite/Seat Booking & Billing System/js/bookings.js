/**
 * Library Seat Booking & Billing System - Bookings Module (bookings.js)
 * Handles seat maps, booking records, check-in/check-out timers, and auto-release checkers.
 */

(function () {
  // Global Namespace
  window.Bookings = {
    /**
     * Get all bookings.
     */
    getAll: function () {
      return DB.getAll(DB.KEYS.BOOKINGS);
    },

    /**
     * Get bookings for a specific user.
     */
    getByUser: function (userId) {
      return this.getAll().filter(b => b.userId === userId);
    },

    /**
     * Find active subscription for a user on a given date (defaults to today local).
     */
    getActiveSubscription: function (userId, targetDateStr) {
      if (!targetDateStr) {
        targetDateStr = new Date().toISOString().split('T')[0];
      }
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
      const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS);

      const activeSub = subscriptions.find(sub => 
        sub.userId === userId && 
        sub.status === 'Active' && 
        sub.startDate <= targetDateStr && 
        sub.endDate >= targetDateStr
      );

      if (!activeSub) return null;

      const plan = plans.find(p => p.id === activeSub.planId);
      return {
        ...activeSub,
        plan
      };
    },

    /**
     * Get seat availability details for a given date.
     * Returns an array of seats, with status relative to the target date.
     */
    getSeatAvailability: function (dateStr) {
      const seats = DB.getAll(DB.KEYS.SEATS);
      const bookings = this.getAll();

      return seats.map(seat => {
        // Default status is the base seat status (Blocked vs Available)
        let statusOnDate = seat.status;
        let activeBooking = null;

        if (seat.status !== 'Blocked') {
          // Find if there is an active booking on this date for this seat
          const booking = bookings.find(b => 
            b.seatId === seat.id && 
            b.bookingDate === dateStr &&
            ['PendingPayment', 'Confirmed', 'CheckedIn'].includes(b.status)
          );

          if (booking) {
            statusOnDate = 'Occupied';
            activeBooking = booking;
          }
        }

        return {
          ...seat,
          statusOnDate: statusOnDate,
          activeBooking: activeBooking
        };
      });
    },

    /**
     * Create a new seat booking.
     */
    createBooking: function (userId, seatId, bookingDate, ratePerDay, createdByRole) {
      if (!userId || !seatId || !bookingDate) {
        return { success: false, message: 'All booking fields are required.' };
      }

      // Check if user exists
      const user = DB.getById(DB.KEYS.USERS, userId);
      if (!user) {
        return { success: false, message: 'Selected user does not exist.' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Selected user is deactivated and cannot book a seat.' };
      }

      // Check if seat exists and is available
      const seat = DB.getById(DB.KEYS.SEATS, seatId);
      if (!seat) {
        return { success: false, message: 'Selected seat does not exist.' };
      }

      if (seat.status === 'Blocked') {
        return { success: false, message: 'Seat is currently blocked for maintenance.' };
      }

      // Prevent duplicate/double bookings for the same seat on the same date
      const bookings = this.getAll();
      const doubleBooked = bookings.some(b => 
        b.seatId === seatId && 
        b.bookingDate === bookingDate && 
        ['PendingPayment', 'Confirmed', 'CheckedIn'].includes(b.status)
      );

      if (doubleBooked) {
        return { success: false, message: 'This seat is already booked/occupied for the selected date.' };
      }

      // Verify if the user has an active subscription covering this date
      const activeSub = this.getActiveSubscription(userId, bookingDate);
      let isCovered = false;
      let subscriptionId = null;
      let finalRate = parseFloat(ratePerDay);

      if (activeSub && activeSub.plan) {
        const plan = activeSub.plan;
        const zoneMatch = (plan.seatType === 'Any' || plan.seatType === seat.zone);
        
        if (zoneMatch) {
          if (plan.seatAllocationType === 'FixedSeat') {
            if (activeSub.assignedSeatId === seatId) {
              isCovered = true;
              subscriptionId = activeSub.id;
              finalRate = 0;
            }
          } else {
            isCovered = true;
            subscriptionId = activeSub.id;
            finalRate = 0;
          }
        }
      }

      // Create new booking record
      const newBooking = {
        id: DB.generateId('book'),
        userId: userId,
        seatId: seatId,
        bookingDate: bookingDate,
        ratePerDay: finalRate,
        status: isCovered ? 'Confirmed' : 'PendingPayment',
        coveredBySubscriptionId: subscriptionId,
        checkInTime: null,
        checkOutTime: null,
        createdBy: createdByRole,
        createdAt: new Date().toISOString()
      };

      DB.insert(DB.KEYS.BOOKINGS, newBooking);
      return { success: true, booking: newBooking };
    },

    /**
     * Automatically ensure a booking record is generated for FixedSeat subscription users today.
     * Runs on Dashboard load.
     */
    ensureFixedSeatBookingForToday: function (userId) {
      const todayStr = new Date().toISOString().split('T')[0];
      const activeSub = this.getActiveSubscription(userId, todayStr);

      if (activeSub && activeSub.plan && activeSub.plan.seatAllocationType === 'FixedSeat') {
        const bookings = this.getAll();
        const bookingToday = bookings.find(b => b.userId === userId && b.bookingDate === todayStr && b.status !== 'Cancelled');
        
        if (!bookingToday && activeSub.assignedSeatId) {
          // Ensure no other active booking exists for this seat today
          const otherBooking = bookings.find(b => 
            b.seatId === activeSub.assignedSeatId && 
            b.bookingDate === todayStr && 
            b.userId !== userId && 
            ['Confirmed', 'CheckedIn', 'PendingPayment'].includes(b.status)
          );
          
          if (!otherBooking) {
            this.createBooking(userId, activeSub.assignedSeatId, todayStr, 0, 'system');
            console.log(`[Auto-Booking] Created daily booking for Fixed Seat`);
          }
        }
      }
    },

    /**
     * Execute check-in for today's booking.
     */
    checkIn: function (bookingId) {
      const booking = DB.getById(DB.KEYS.BOOKINGS, bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found.' };
      }

      if (booking.status !== 'Confirmed') {
        return { success: false, message: 'Check-in is only allowed for Confirmed bookings.' };
      }

      // Validate booking date is today
      const todayStr = new Date().toISOString().split('T')[0];
      if (booking.bookingDate !== todayStr) {
        return { success: false, message: `Check-in is only allowed on the day of booking (${booking.bookingDate}).` };
      }

      // Update booking
      DB.update(DB.KEYS.BOOKINGS, bookingId, {
        status: 'CheckedIn',
        checkInTime: new Date().toISOString()
      });

      // Update seat to occupied
      DB.update(DB.KEYS.SEATS, booking.seatId, { status: 'Occupied' });

      return { success: true, message: 'Checked-in successfully!' };
    },

    /**
     * Execute check-out.
     */
    checkOut: function (bookingId) {
      const booking = DB.getById(DB.KEYS.BOOKINGS, bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found.' };
      }

      if (booking.status !== 'CheckedIn') {
        return { success: false, message: 'Booking is not checked-in.' };
      }

      // Update booking
      DB.update(DB.KEYS.BOOKINGS, bookingId, {
        status: 'CheckedOut',
        checkOutTime: new Date().toISOString()
      });

      // Reset seat to available
      DB.update(DB.KEYS.SEATS, booking.seatId, { status: 'Available' });

      return { success: true, message: 'Checked-out successfully!' };
    },

    /**
     * Cancel a booking (releases seat if occupied).
     */
    cancelBooking: function (bookingId, reason = 'Cancelled by user') {
      const booking = DB.getById(DB.KEYS.BOOKINGS, bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found.' };
      }

      if (['CheckedOut', 'Cancelled', 'Overdue'].includes(booking.status)) {
        return { success: false, message: 'Booking is already finalized.' };
      }

      // Reset seat to available if it was occupied/checked-in
      if (booking.status === 'CheckedIn') {
        DB.update(DB.KEYS.SEATS, booking.seatId, { status: 'Available' });
      }

      DB.update(DB.KEYS.BOOKINGS, bookingId, { status: 'Cancelled' });

      return { success: true, message: 'Booking cancelled successfully.' };
    },

    /**
     * Background routine to verify and auto-release seats for no-shows/overdues
     * AND update expired subscriptions.
     */
    runAutoReleaseChecks: function () {
      const settings = DB.getAll(DB.KEYS.SETTINGS);
      if (Array.isArray(settings)) return;
      
      const overdueDays = settings.overdueDays || 2;
      const bookings = this.getAll();
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      let updatedCount = 0;

      // 1. Release bookings
      bookings.forEach(booking => {
        // No-Show Auto-Release
        if (booking.status === 'Confirmed') {
          const bookingDayStart = new Date(`${booking.bookingDate}T08:00:00`);
          const cutoffTime = new Date(bookingDayStart.getTime() + 2 * 60 * 60 * 1000); // 10:00 AM

          if (now > cutoffTime) {
            DB.update(DB.KEYS.BOOKINGS, booking.id, { status: 'Cancelled' });
            
            const seat = DB.getById(DB.KEYS.SEATS, booking.seatId);
            if (seat && seat.status === 'Occupied') {
              DB.update(DB.KEYS.SEATS, booking.seatId, { status: 'Available' });
            }
            updatedCount++;
          }
        }

        // Overdue Payments
        if (booking.status === 'PendingPayment') {
          const bookingDateObj = new Date(`${booking.bookingDate}T00:00:00`);
          const limitTime = bookingDateObj.getTime() + overdueDays * 24 * 60 * 60 * 1000;
          const limitDate = new Date(limitTime);

          if (now > limitDate) {
            DB.update(DB.KEYS.BOOKINGS, booking.id, { status: 'Overdue' });
            const payments = DB.getAll(DB.KEYS.PAYMENTS);
            const payment = payments.find(p => p.bookingId === booking.id);
            if (payment && payment.status === 'Pending') {
              DB.update(DB.KEYS.PAYMENTS, payment.id, { status: 'Overdue', remarks: 'Auto-marked: threshold exceeded.' });
            }
            updatedCount++;
          }
        }
      });

      // 2. Sweep Expirations of Subscriptions
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
      let expiredSubsCount = 0;
      
      subscriptions.forEach(sub => {
        if (sub.status === 'Active' && sub.endDate < todayStr) {
          DB.update(DB.KEYS.SUBSCRIPTIONS, sub.id, { status: 'Expired' });
          expiredSubsCount++;

          // If FixedSeat plan, clear seat allocation status
          if (sub.assignedSeatId) {
            const seat = DB.getById(DB.KEYS.SEATS, sub.assignedSeatId);
            if (seat && seat.status === 'Occupied') {
              DB.update(DB.KEYS.SEATS, sub.assignedSeatId, { status: 'Available' });
            }
          }
        }
      });

      if (updatedCount > 0) {
        console.log(`[Auto-Release] Released/Cancelled ${updatedCount} overdue or no-show bookings.`);
      }
      if (expiredSubsCount > 0) {
        console.log(`[Auto-Release] Expired ${expiredSubsCount} passes.`);
      }
    }
  };
})();
