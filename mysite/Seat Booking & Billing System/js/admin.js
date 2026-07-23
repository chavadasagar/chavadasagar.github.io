/**
 * Library Seat Booking & Billing System - Admin Operations Module (admin.js)
 * Computes dashboard aggregates, enforces user deactivation rules, and handles CSV exports.
 */

(function () {
  // Global Namespace
  window.Admin = {
    /**
     * Compute dashboard summary statistics, including subscriptions.
     */
    getDashboardStats: function () {
      const seats = DB.getAll(DB.KEYS.SEATS);
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const users = DB.getAll(DB.KEYS.USERS);
      const invoices = DB.getAll(DB.KEYS.INVOICES);
      const settings = DB.getAll(DB.KEYS.SETTINGS);
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
      const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS);

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Total Seats
      const totalSeats = seats.length;

      // 2. Occupied Today (bookings active today and checked in)
      const occupiedToday = bookings.filter(b => 
        b.bookingDate === todayStr && 
        b.status === 'CheckedIn'
      ).length;

      // 3. Total Users (excluding main admin)
      const totalUsers = users.filter(u => !u.isAdmin).length;

      // 4. Revenue metrics
      let totalRevenue = 0;
      let dailyRevenue = 0;
      let subscriptionRevenue = 0;

      invoices.forEach(inv => {
        const amt = inv.totalAmount || 0;
        totalRevenue += amt;
        if (inv.invoiceType === 'Subscription') {
          subscriptionRevenue += amt;
        } else {
          dailyRevenue += amt;
        }
      });

      // 5. Pending Dues (both daily bookings and subscriptions in PendingPayment)
      const gstPercentage = settings.gstPercentage || 18;
      const gstEnabled = settings.gstEnabled !== false;

      let pendingDues = 0;

      // Add pending bookings
      bookings.forEach(b => {
        if (b.status === 'PendingPayment') {
          let amt = b.ratePerDay;
          if (gstEnabled) {
            amt += amt * (gstPercentage / 100);
          }
          pendingDues += amt;
        }
      });

      // Add pending subscriptions
      subscriptions.forEach(sub => {
        if (sub.status === 'PendingPayment') {
          const plan = plans.find(p => p.id === sub.planId);
          if (plan) {
            let amt = plan.price;
            if (gstEnabled) {
              amt += amt * (gstPercentage / 100);
            }
            pendingDues += amt;
          }
        }
      });

      // 6. Overdue daily bookings
      const overdueCount = bookings.filter(b => b.status === 'Overdue').length;

      // 7. Active subscriptions count
      const activeSubscriptions = subscriptions.filter(s => s.status === 'Active').length;

      // 8. Expiring soon & Expired subscriptions list
      const expiringSoon = [];
      const expiredList = [];
      const today = new Date(todayStr + 'T00:00:00');

      subscriptions.forEach(sub => {
        const user = users.find(u => u.id === sub.userId) || { name: 'Deleted User' };
        const plan = plans.find(p => p.id === sub.planId) || { name: 'Unknown Plan' };

        if (sub.status === 'Active') {
          const end = new Date(sub.endDate + 'T00:00:00');
          const diffTime = end.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 0 && diffDays <= 5) {
            expiringSoon.push({
              ...sub,
              user,
              plan,
              daysRemaining: diffDays
            });
          }
        } else if (sub.status === 'Expired') {
          expiredList.push({
            ...sub,
            user,
            plan
          });
        }
      });

      return {
        totalSeats,
        occupiedToday,
        totalUsers,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        dailyRevenue: parseFloat(dailyRevenue.toFixed(2)),
        subscriptionRevenue: parseFloat(subscriptionRevenue.toFixed(2)),
        pendingDues: parseFloat(pendingDues.toFixed(2)),
        overdueCount,
        activeSubscriptions,
        expiringSoon,
        expiredList
      };
    },

    /**
     * Get list of all registered users (excluding admin).
     */
    getUsers: function () {
      return DB.getAll(DB.KEYS.USERS).filter(u => !u.isAdmin);
    },

    /**
     * Toggle a user's active status.
     * Prevents deactivating a user with pending booking or subscription payments.
     */
    toggleUserStatus: function (userId) {
      const user = DB.getById(DB.KEYS.USERS, userId);
      if (!user) {
        return { success: false, message: 'User not found.' };
      }

      if (user.isActive) {
        const bookings = DB.getAll(DB.KEYS.BOOKINGS);
        const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
        
        const hasPendingBookings = bookings.some(b => b.userId === userId && b.status === 'PendingPayment');
        const hasPendingSubs = subscriptions.some(s => s.userId === userId && s.status === 'PendingPayment');
        
        if (hasPendingBookings || hasPendingSubs) {
          return {
            success: false,
            message: 'Cannot deactivate user: This user has outstanding pending payments.'
          };
        }
      }

      const updatedStatus = !user.isActive;
      DB.update(DB.KEYS.USERS, userId, { isActive: updatedStatus });

      return {
        success: true,
        message: `User account is now ${updatedStatus ? 'Activated' : 'Deactivated'}.`,
        isActive: updatedStatus
      };
    },

    /**
     * Generate CSV content of invoices and download it.
     */
    exportBillingToCSV: function (fromDateStr, toDateStr) {
      const invoices = DB.getAll(DB.KEYS.INVOICES);
      const bookings = DB.getAll(DB.KEYS.BOOKINGS);
      const subscriptions = DB.getAll(DB.KEYS.SUBSCRIPTIONS);
      const plans = DB.getAll(DB.KEYS.SUBSCRIPTION_PLANS);
      const users = DB.getAll(DB.KEYS.USERS);
      const seats = DB.getAll(DB.KEYS.SEATS);
      const payments = DB.getAll(DB.KEYS.PAYMENTS);

      // Filter invoices by date range if provided
      let filteredInvoices = invoices;
      if (fromDateStr) {
        filteredInvoices = filteredInvoices.filter(inv => inv.invoiceDate >= fromDateStr);
      }
      if (toDateStr) {
        filteredInvoices = filteredInvoices.filter(inv => inv.invoiceDate <= toDateStr);
      }

      // Construct CSV Rows
      const csvHeader = [
        'Invoice Number',
        'Invoice Date',
        'Invoice Type',
        'User Name',
        'Username',
        'Contact',
        'Seat / Plan Details',
        'Booking / Pass Period',
        'Base Amount',
        'GST Amount',
        'Total Paid Amount',
        'Payment Mode',
        'Confirmed By'
      ];

      const csvRows = [csvHeader.join(',')];

      filteredInvoices.forEach(inv => {
        const payment = payments.find(p => p.bookingId === inv.bookingId || p.subscriptionId === inv.subscriptionId) || {};
        
        let userName = 'Deleted User';
        let userUsername = '';
        let userContact = '';
        let seatOrPlanDetails = '';
        let periodDetails = '';

        if (inv.invoiceType === 'Subscription') {
          const sub = subscriptions.find(s => s.id === inv.subscriptionId) || {};
          const plan = plans.find(p => p.id === sub.planId) || {};
          const user = users.find(u => u.id === sub.userId) || {};
          const seat = sub.assignedSeatId ? seats.find(s => s.id === sub.assignedSeatId) : null;

          userName = user.name || '';
          userUsername = user.username || '';
          userContact = user.contact || '';
          
          seatOrPlanDetails = `Pass: ${plan.name || 'Plan'} ${seat ? '(Seat ' + seat.seatNumber + ')' : '(Flexible)'}`;
          periodDetails = `${sub.startDate} to ${sub.endDate}`;
        } else {
          const booking = bookings.find(b => b.id === inv.bookingId) || {};
          const user = users.find(u => u.id === booking.userId) || {};
          const seat = seats.find(s => s.id === booking.seatId) || {};

          userName = user.name || '';
          userUsername = user.username || '';
          userContact = user.contact || '';
          
          seatOrPlanDetails = `Seat ${seat.seatNumber || 'N/A'}`;
          periodDetails = booking.bookingDate || '';
        }

        // Escape text containing commas
        const userNameEscaped = `"${userName.replace(/"/g, '""')}"`;
        const seatOrPlanEscaped = `"${seatOrPlanDetails.replace(/"/g, '""')}"`;

        const rowData = [
          inv.invoiceNumber,
          inv.invoiceDate,
          inv.invoiceType || 'DailyBooking',
          userNameEscaped,
          userUsername,
          userContact,
          seatOrPlanEscaped,
          periodDetails,
          inv.amount,
          inv.gstAmount,
          inv.totalAmount,
          payment.paymentMode || 'Other',
          payment.confirmedBy || 'user-upload'
        ];

        csvRows.push(rowData.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Trigger File Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      
      const filename = `Library_Revenue_Report_${fromDateStr || 'ALL'}_to_${toDateStr || 'ALL'}.csv`;
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      return { success: true, message: 'CSV Report exported successfully.' };
    }
  };
})();
