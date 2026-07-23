/**
 * Library Seat Booking & Billing System - Invoices Module (invoices.js)
 * Computes GST breakdowns, increments invoice sequences, and fetches printable templates.
 */

(function () {
  // Global Namespace
  window.Invoices = {
    /**
     * Get all invoices.
     */
    getAll: function () {
      return DB.getAll(DB.KEYS.INVOICES);
    },

    /**
     * Get an invoice by its ID.
     */
    getById: function (invoiceId) {
      return DB.getById(DB.KEYS.INVOICES, invoiceId);
    },

    /**
     * Get all invoices for a specific user (both daily bookings and subscriptions).
     */
    getByUser: function (userId) {
      const invoices = this.getAll();
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);

      return invoices
        .map(inv => {
          let targetUserId = null;
          let details = { ...inv };

          if (inv.invoiceType === 'Subscription') {
            const sub = subscriptions.find(s => s.id === inv.subscriptionId);
            if (sub) {
              targetUserId = sub.userId;
              details.subscription = sub;
            }
          } else {
            const booking = bookings.find(b => b.id === inv.bookingId);
            if (booking) {
              targetUserId = booking.userId;
              details.booking = booking;
            }
          }

          details.targetUserId = targetUserId;
          return details;
        })
        .filter(inv => inv.targetUserId === userId);
    },

    /**
     * Create a new invoice on payment approval (handles both daily bookings and subscriptions).
     */
    createInvoice: function (bookingId, paymentId, subscriptionId = null) {
      if (!paymentId) {
        return { success: false, message: 'Payment ID is required.' };
      }

      const invoices = this.getAll();
      
      // Check if invoice already exists
      const existing = invoices.find(inv => 
        (bookingId && inv.bookingId === bookingId && inv.paymentId === paymentId) ||
        (subscriptionId && inv.subscriptionId === subscriptionId && inv.paymentId === paymentId)
      );
      if (existing) {
        return { success: true, invoice: existing };
      }

      const payment = DB.getById(DB.KEYS.PAYMENTS, paymentId);
      if (!payment) {
        return { success: false, message: 'Payment not found.' };
      }

      const settings = DB.getAll(DB.KEYS.SETTINGS);
      const gstPercentage = settings.gstPercentage || 18;
      const gstEnabled = settings.gstEnabled !== false;

      const baseAmount = payment.amount;
      let gstAmount = 0;
      let totalAmount = baseAmount;

      if (gstEnabled) {
        gstAmount = parseFloat((baseAmount * (gstPercentage / 100)).toFixed(2));
        totalAmount = parseFloat((baseAmount + gstAmount).toFixed(2));
      }

      const year = new Date().getFullYear();
      const yearInvoices = invoices.filter(inv => inv.invoiceNumber && inv.invoiceNumber.startsWith(`INV-${year}`));
      const sequence = yearInvoices.length + 1;
      const paddedSequence = String(sequence).padStart(4, '0');
      const invoiceNumber = `INV-${year}-${paddedSequence}`;

      const newInvoice = {
        id: DB.generateId('inv'),
        bookingId: bookingId,
        subscriptionId: subscriptionId,
        invoiceType: subscriptionId ? 'Subscription' : 'DailyBooking',
        paymentId: paymentId,
        invoiceNumber: invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        amount: baseAmount,
        gstApplicable: gstEnabled,
        gstAmount: gstAmount,
        totalAmount: totalAmount
      };

      DB.insert(DB.KEYS.INVOICES, newInvoice);
      return { success: true, invoice: newInvoice };
    },

    /**
     * Fetch complete consolidated details for printing an invoice.
     */
    getInvoicePrintData: function (invoiceId) {
      const invoice = this.getById(invoiceId);
      if (!invoice) return null;

      const settings = DB.getAll(DB.KEYS.SETTINGS);
      let user = null;
      let booking = null;
      let subscription = null;
      let plan = null;
      let seat = null;

      if (invoice.invoiceType === 'Subscription') {
        subscription = DB.getById(DB.KEYS.SUBSCRIPTIONS, invoice.subscriptionId);
        if (subscription) {
          user = DB.getById(DB.KEYS.USERS, subscription.userId);
          plan = DB.getById(DB.KEYS.SUBSCRIPTION_PLANS, subscription.planId);
          if (subscription.assignedSeatId) {
            seat = DB.getById(DB.KEYS.SEATS, subscription.assignedSeatId);
          }
        }
      } else {
        booking = DB.getById(DB.KEYS.BOOKINGS, invoice.bookingId);
        if (booking) {
          user = DB.getById(DB.KEYS.USERS, booking.userId);
          seat = DB.getById(DB.KEYS.SEATS, booking.seatId);
        }
      }

      return {
        invoice,
        booking,
        subscription,
        plan,
        user,
        seat,
        settings
      };
    }
  };
})();
