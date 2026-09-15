/**
 * Library Seat Booking & Billing System - Payments Module (payments.js)
 * Manages screenshot uploads, base64 conversions, verification pipelines, and direct payments.
 */

(function () {
  // Global Namespace
  window.Payments = {
    /**
     * Get all payments.
     */
    getAll: function () {
      return DB.getAll(DB.KEYS.PAYMENTS);
    },

    /**
     * Get payments for a specific booking.
     */
    getByBooking: function (bookingId) {
      return this.getAll().find(p => p.bookingId === bookingId) || null;
    },

    /**
     * Get payments for a specific subscription.
     */
    getBySubscription: function (subscriptionId) {
      return this.getAll().find(p => p.subscriptionId === subscriptionId) || null;
    },

    /**
     * Convert a File object to a Base64 string.
     */
    fileToBase64: function (file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
    },

    /**
     * Submit a payment screenshot for a daily seat booking (User action).
     */
    submitPayment: async function (bookingId, amount, file) {
      if (!bookingId || !amount || !file) {
        return { success: false, message: 'Booking ID, amount, and payment screenshot are required.' };
      }

      const booking = DB.getById(DB.KEYS.BOOKINGS, bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found.' };
      }

      const existingPayments = this.getAll();
      const pendingPaymentIdx = existingPayments.findIndex(p => p.bookingId === bookingId && p.status === 'Pending');
      if (pendingPaymentIdx !== -1) {
        return { success: false, message: 'You already have a pending payment verification.' };
      }

      try {
        const base64Data = await this.fileToBase64(file);
        const previousPayment = existingPayments.find(p => p.bookingId === bookingId);

        if (previousPayment) {
          DB.update(DB.KEYS.PAYMENTS, previousPayment.id, {
            amount: parseFloat(amount),
            screenshotBase64: base64Data,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
            verifiedAt: null,
            verifiedBy: null,
            remarks: '',
            confirmedBy: 'user-upload',
            paymentMode: null,
            paymentFor: 'DailyBooking'
          });
          return { success: true, message: 'Receipt re-submitted successfully.' };
        } else {
          const newPayment = {
            id: DB.generateId('pay'),
            bookingId: bookingId,
            subscriptionId: null,
            paymentFor: 'DailyBooking',
            amount: parseFloat(amount),
            screenshotBase64: base64Data,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
            verifiedAt: null,
            verifiedBy: null,
            remarks: '',
            confirmedBy: 'user-upload',
            paymentMode: null
          };
          DB.insert(DB.KEYS.PAYMENTS, newPayment);
          return { success: true, message: 'Receipt submitted successfully.' };
        }
      } catch (error) {
        return { success: false, message: 'Failed to read image file.' };
      }
    },

    /**
     * Submit a payment screenshot for a subscription pass (User action).
     */
    submitSubscriptionPayment: async function (subscriptionId, amount, file) {
      if (!subscriptionId || !amount || !file) {
        return { success: false, message: 'Subscription ID, amount, and payment screenshot are required.' };
      }

      const subscription = DB.getById(DB.KEYS.SUBSCRIPTIONS, subscriptionId);
      if (!subscription) {
        return { success: false, message: 'Subscription not found.' };
      }

      const existingPayments = this.getAll();
      const previousPayment = existingPayments.find(p => p.subscriptionId === subscriptionId);

      try {
        const base64Data = await this.fileToBase64(file);

        if (previousPayment) {
          DB.update(DB.KEYS.PAYMENTS, previousPayment.id, {
            amount: parseFloat(amount),
            screenshotBase64: base64Data,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
            verifiedAt: null,
            verifiedBy: null,
            remarks: '',
            confirmedBy: 'user-upload',
            paymentMode: null,
            paymentFor: 'Subscription'
          });
          return { success: true, message: 'Subscription receipt re-submitted.' };
        } else {
          const newPayment = {
            id: DB.generateId('pay'),
            bookingId: null,
            subscriptionId: subscriptionId,
            paymentFor: 'Subscription',
            amount: parseFloat(amount),
            screenshotBase64: base64Data,
            status: 'Pending',
            submittedAt: new Date().toISOString(),
            verifiedAt: null,
            verifiedBy: null,
            remarks: '',
            confirmedBy: 'user-upload',
            paymentMode: null
          };
          DB.insert(DB.KEYS.PAYMENTS, newPayment);
          return { success: true, message: 'Subscription receipt submitted.' };
        }
      } catch (error) {
        return { success: false, message: 'Failed to read image file.' };
      }
    },

    /**
     * Get all pending payments for admin review.
     */
    getPendingPayments: function () {
      const payments = this.getAll();
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
      const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS);
      const users = DB.getAll(DB.KEYS.USERS);
      const seats = DB.getAll(DB.KEYS.SEATS);

      return payments
        .filter(p => p.status === 'Pending')
        .map(p => {
          let details = { ...p };
          if (p.paymentFor === 'Subscription') {
            const sub = subscriptions.find(s => s.id === p.subscriptionId) || {};
            const plan = plans.find(pl => pl.id === sub.planId) || {};
            const user = users.find(u => u.id === sub.userId) || {};
            const seat = sub.assignedSeatId ? seats.find(s => s.id === sub.assignedSeatId) : null;
            
            details.user = user;
            details.subscription = sub;
            details.plan = plan;
            details.seat = seat;
          } else {
            const booking = bookings.find(b => b.id === p.bookingId) || {};
            const user = users.find(u => u.id === booking.userId) || {};
            const seat = seats.find(s => s.id === booking.seatId) || {};

            details.user = user;
            details.booking = booking;
            details.seat = seat;
          }
          return details;
        });
    },

    /**
     * Approve payment (Admin action).
     * Promotes booking or subscription to confirmed/active status.
     */
    approvePayment: function (paymentId, adminUserId) {
      const payment = DB.getById(DB.KEYS.PAYMENTS, paymentId);
      if (!payment) {
        return { success: false, message: 'Payment record not found.' };
      }

      // Update payment status
      DB.update(DB.KEYS.PAYMENTS, paymentId, {
        status: 'Paid',
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminUserId,
        confirmedBy: 'user-upload',
        paymentMode: 'Other'
      });

      if (payment.paymentFor === 'Subscription') {
        const sub = DB.getById(DB.KEYS.SUBSCRIPTIONS, payment.subscriptionId);
        if (!sub) {
          return { success: false, message: 'Subscription record not found.' };
        }

        const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, sub.planId);
        const todayStr = new Date().toISOString().split('T')[0];

        // Recalculate validity dates starting from approval day
        const startDate = todayStr;
        const startObj = new Date(startDate + 'T00:00:00');
        if (plan.type === 'Monthly') {
          startObj.setMonth(startObj.getMonth() + 1);
        } else {
          startObj.setFullYear(startObj.getFullYear() + 1);
        }
        const endDate = startObj.toISOString().split('T')[0];

        // Activate pass
        DB.update(DB.KEYS.SUBSCRIPTIONS, sub.id, {
          status: 'Active',
          startDate: startDate,
          endDate: endDate,
          paymentId: paymentId
        });

        // Set fixed seat status to occupied if FixedSeat plan
        if (sub.assignedSeatId) {
          DB.update(DB.KEYS.SEATS, sub.assignedSeatId, { status: 'Occupied' });
        }

        // Generate invoice
        const invoiceResult = Invoices.createInvoice(null, paymentId, sub.id);
        return { success: true, message: 'Subscription pass activated.', invoice: invoiceResult.invoice };
      } else {
        // Daily Booking Path
        const booking = DB.getById(DB.KEYS.BOOKINGS, payment.bookingId);
        if (!booking) {
          return { success: false, message: 'Associated booking not found.' };
        }

        DB.update(DB.KEYS.BOOKINGS, booking.id, { status: 'Confirmed' });
        const invoiceResult = Invoices.createInvoice(booking.id, paymentId, null);
        return { success: true, message: 'Payment approved. Booking confirmed.', invoice: invoiceResult.invoice };
      }
    },

    /**
     * Reject payment (Admin action).
     */
    rejectPayment: function (paymentId, adminUserId, remarks) {
      if (!remarks || !remarks.trim()) {
        return { success: false, message: 'Please provide rejection remarks.' };
      }

      const payment = DB.getById(DB.KEYS.PAYMENTS, paymentId);
      if (!payment) {
        return { success: false, message: 'Payment record not found.' };
      }

      DB.update(DB.KEYS.PAYMENTS, paymentId, {
        status: 'Rejected',
        verifiedAt: new Date().toISOString(),
        verifiedBy: adminUserId,
        remarks: remarks.trim()
      });

      return { success: true, message: 'Payment receipt rejected.' };
    },

    /**
     * Directly confirm payment (Admin action - Cash / UPI / Other in person)
     * For Daily Seat Booking.
     */
    createDirectPayment: function (bookingId, amount, paymentMode, remarks, adminUserId) {
      if (parseFloat(amount) <= 0) {
        return { success: false, message: 'Payment amount must be greater than 0.' };
      }

      const booking = DB.getById(DB.KEYS.BOOKINGS, bookingId);
      if (!booking) {
        return { success: false, message: 'Booking not found.' };
      }

      const existingPayments = this.getAll();
      const previousPayment = existingPayments.find(p => p.bookingId === bookingId);
      
      let targetPaymentId = '';

      if (previousPayment) {
        targetPaymentId = previousPayment.id;
        DB.update(DB.KEYS.PAYMENTS, targetPaymentId, {
          amount: parseFloat(amount),
          status: 'Paid',
          verifiedAt: new Date().toISOString(),
          verifiedBy: adminUserId,
          remarks: remarks ? remarks.trim() : 'Direct Payment Collected',
          confirmedBy: 'admin-direct',
          paymentMode: paymentMode,
          paymentFor: 'DailyBooking'
        });
      } else {
        const newPayment = {
          id: DB.generateId('pay'),
          bookingId: bookingId,
          subscriptionId: null,
          paymentFor: 'DailyBooking',
          amount: parseFloat(amount),
          screenshotBase64: null,
          status: 'Paid',
          submittedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          verifiedBy: adminUserId,
          remarks: remarks ? remarks.trim() : 'Direct Payment Collected',
          confirmedBy: 'admin-direct',
          paymentMode: paymentMode
        };
        DB.insert(DB.KEYS.PAYMENTS, newPayment);
        targetPaymentId = newPayment.id;
      }

      DB.update(DB.KEYS.BOOKINGS, bookingId, { status: 'Confirmed' });
      const invoiceResult = Invoices.createInvoice(bookingId, targetPaymentId, null);

      return {
        success: true,
        message: 'Payment recorded directly. Invoice generated.',
        invoice: invoiceResult.invoice
      };
    },

    /**
     * Directly confirm payment (Admin action - Cash / UPI / Other in person)
     * For Subscription passes.
     */
    createDirectSubscriptionPayment: function (subscriptionId, amount, paymentMode, remarks, adminUserId) {
      if (parseFloat(amount) <= 0) {
        return { success: false, message: 'Payment amount must be greater than 0.' };
      }

      const sub = DB.getById(DB.KEYS.SUBSCRIPTIONS, subscriptionId);
      if (!sub) {
        return { success: false, message: 'Subscription record not found.' };
      }

      const plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, sub.planId);
      const todayStr = new Date().toISOString().split('T')[0];

      // Calculate end date
      const startObj = new Date(todayStr + 'T00:00:00');
      if (plan.type === 'Monthly') {
        startObj.setMonth(startObj.getMonth() + 1);
      } else {
        startObj.setFullYear(startObj.getFullYear() + 1);
      }
      const endDate = startObj.toISOString().split('T')[0];

      const existingPayments = this.getAll();
      const previousPayment = existingPayments.find(p => p.subscriptionId === subscriptionId);
      
      let targetPaymentId = '';

      if (previousPayment) {
        targetPaymentId = previousPayment.id;
        DB.update(DB.KEYS.PAYMENTS, targetPaymentId, {
          amount: parseFloat(amount),
          status: 'Paid',
          verifiedAt: new Date().toISOString(),
          verifiedBy: adminUserId,
          remarks: remarks ? remarks.trim() : 'Direct Subscription Payment Collected',
          confirmedBy: 'admin-direct',
          paymentMode: paymentMode,
          paymentFor: 'Subscription'
        });
      } else {
        const newPayment = {
          id: DB.generateId('pay'),
          bookingId: null,
          subscriptionId: subscriptionId,
          paymentFor: 'Subscription',
          amount: parseFloat(amount),
          screenshotBase64: null,
          status: 'Paid',
          submittedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          verifiedBy: adminUserId,
          remarks: remarks ? remarks.trim() : 'Direct Subscription Payment Collected',
          confirmedBy: 'admin-direct',
          paymentMode: paymentMode
        };
        DB.insert(DB.KEYS.PAYMENTS, newPayment);
        targetPaymentId = newPayment.id;
      }

      // Activate subscription
      DB.update(DB.KEYS.SUBSCRIPTIONS, subscriptionId, {
        status: 'Active',
        startDate: todayStr,
        endDate: endDate,
        paymentId: targetPaymentId
      });

      // Update seat status if FixedSeat
      if (sub.assignedSeatId) {
        DB.update(DB.KEYS.SEATS, sub.assignedSeatId, { status: 'Occupied' });
      }

      // Generate invoice
      const invoiceResult = Invoices.createInvoice(null, targetPaymentId, subscriptionId);

      return {
        success: true,
        message: 'Subscription pass activated directly. Invoice generated.',
        invoice: invoiceResult.invoice
      };
    }
  };
})();
