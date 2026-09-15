/**
 * appointments.js - Booking, Rescheduling, Cancelling, Status Flow & Review Logic
 */

const APPOINTMENTS = {
  /**
   * Helper to parse HH:MM and YYYY-MM-DD to a JS Date object
   */
  getDateTime(dateStr, timeStr) {
    return new Date(`${dateStr}T${timeStr}`);
  },

  /**
   * Check if appointment is within the cancellation window (e.g. less than X hours before start)
   */
  isWithinCancellationWindow(aptDateStr, aptTimeStr) {
    if (!window.DB) return false;
    const settings = window.DB.get(window.DB_COLLECTIONS.SETTINGS)[0] || { cancellationWindowHours: 2 };
    const windowHours = settings.cancellationWindowHours || 2;

    const aptDateTime = this.getDateTime(aptDateStr, aptTimeStr);
    const now = new Date();

    const diffMs = aptDateTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours < windowHours;
  },

  /**
   * Book an appointment
   */
  book(patientId, doctorId, clinicId, slotId, reason, paymentMode, bookingType = 'ONLINE') {
    if (!window.DB) return { success: false, error: "Database not loaded." };

    const slots = window.DB.get(window.DB_COLLECTIONS.DOCTOR_SLOTS);
    const slotIndex = slots.findIndex(s => s.id === slotId);

    if (slotIndex === -1) {
      return { success: false, error: "Slot not found." };
    }

    const slot = slots[slotIndex];

    // 1. Double-booking / Blocked check
    if (slot.isBooked) {
      return { success: false, error: "This slot has already been booked by another patient." };
    }
    if (slot.isBlocked) {
      return { success: false, error: "This slot is blocked and unavailable." };
    }

    const doctor = window.DB.getById(window.DB_COLLECTIONS.DOCTORS, doctorId);
    if (!doctor) {
      return { success: false, error: "Doctor not found." };
    }

    // 2. Lock / Book Slot
    slots[slotIndex].isBooked = true;
    window.DB.save(window.DB_COLLECTIONS.DOCTOR_SLOTS, slots);

    // 3. Create Appointment
    const appointmentId = Math.random().toString(36).substring(2, 15);
    const now = new Date().toISOString();
    
    // Receptionist/Admin walk-ins can set status directly
    const initialStatus = 'CONFIRMED'; 

    const newApt = {
      id: appointmentId,
      patientId,
      doctorId,
      clinicId,
      slotId,
      appointmentDate: slot.slotDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      reason,
      status: initialStatus,
      bookingType,
      createdAt: now
    };

    window.DB.insert(window.DB_COLLECTIONS.APPOINTMENTS, newApt);

    // 4. Create Status History Row
    const hist = {
      id: Math.random().toString(36).substring(2, 15),
      appointmentId,
      oldStatus: 'PENDING',
      newStatus: initialStatus,
      changedBy: bookingType === 'WALK_IN' ? 'Receptionist' : 'Patient',
      changedAt: now,
      remarks: 'Initial appointment booking'
    };
    window.DB.insert(window.DB_COLLECTIONS.STATUS_HISTORY, hist);

    // 5. Create Payment Row
    const payment = {
      id: Math.random().toString(36).substring(2, 15),
      appointmentId,
      amount: doctor.consultationFee,
      paymentMode, // PAY_NOW or PAY_AT_CLINIC
      paymentStatus: paymentMode === 'PAY_NOW' ? 'PAID' : 'PENDING',
      paidAt: paymentMode === 'PAY_NOW' ? now : null
    };
    window.DB.insert(window.DB_COLLECTIONS.PAYMENTS, payment);

    // 6. Auto-generate reminders
    // 24hr and 1hr before
    const aptDateTime = this.getDateTime(slot.slotDate, slot.startTime);
    
    const r24 = new Date(aptDateTime);
    r24.setHours(r24.getHours() - 24);
    
    const r1 = new Date(aptDateTime);
    r1.setHours(r1.getHours() - 1);

    const reminders = window.DB.get('appointmentReminders') || [];
    reminders.push({
      id: Math.random().toString(36).substring(2, 15),
      appointmentId,
      type: '24HR',
      sendTime: r24.toISOString(),
      status: 'PENDING',
      message: `Reminder: You have an appointment with ${doctor.fullName} tomorrow at ${slot.startTime}.`
    });
    reminders.push({
      id: Math.random().toString(36).substring(2, 15),
      appointmentId,
      type: '1HR',
      sendTime: r1.toISOString(),
      status: 'PENDING',
      message: `Reminder: Your appointment with ${doctor.fullName} is in 1 hour at ${slot.startTime}.`
    });
    window.DB.save('appointmentReminders', reminders);

    return { success: true, appointment: newApt };
  },

  /**
   * Cancel an appointment
   */
  cancel(appointmentId, cancelledBy, reason, bypassRules = false) {
    if (!window.DB) return { success: false, error: "Database not loaded." };

    const apt = window.DB.getById(window.DB_COLLECTIONS.APPOINTMENTS, appointmentId);
    if (!apt) return { success: false, error: "Appointment not found." };

    if (['CANCELLED', 'NO_SHOW'].includes(apt.status)) {
      return { success: false, error: "Appointment is already cancelled or marked as no-show." };
    }

    // Check cancellation window rule
    if (!bypassRules && this.isWithinCancellationWindow(apt.appointmentDate, apt.startTime)) {
      const settings = window.DB.get(window.DB_COLLECTIONS.SETTINGS)[0] || { cancellationWindowHours: 2 };
      return { 
        success: false, 
        error: `Cancellation window is closed. Appointments cannot be cancelled online less than ${settings.cancellationWindowHours} hours prior.` 
      };
    }

    const oldStatus = apt.status;
    const now = new Date().toISOString();

    // 1. Update Appointment Status
    window.DB.update(window.DB_COLLECTIONS.APPOINTMENTS, appointmentId, {
      status: 'CANCELLED',
      cancelledBy,
      cancellationReason: reason
    });

    // 2. Free Slot
    const slots = window.DB.get(window.DB_COLLECTIONS.DOCTOR_SLOTS);
    const slotIndex = slots.findIndex(s => s.id === apt.slotId);
    if (slotIndex !== -1) {
      slots[slotIndex].isBooked = false;
      window.DB.save(window.DB_COLLECTIONS.DOCTOR_SLOTS, slots);
    }

    // 3. Add Status History
    window.DB.insert(window.DB_COLLECTIONS.STATUS_HISTORY, {
      appointmentId,
      oldStatus,
      newStatus: 'CANCELLED',
      changedBy: cancelledBy,
      changedAt: now,
      remarks: `Cancelled. Reason: ${reason}`
    });

    // 4. Update Payment Status to cancelled if pending, or keep track of refund
    const payments = window.DB.get(window.DB_COLLECTIONS.PAYMENTS);
    const payIndex = payments.findIndex(p => p.appointmentId === appointmentId);
    if (payIndex !== -1) {
      if (payments[payIndex].paymentStatus === 'PENDING') {
        payments[payIndex].paymentStatus = 'CANCELLED';
      } else {
        payments[payIndex].paymentStatus = 'REFUNDED';
      }
      window.DB.save(window.DB_COLLECTIONS.PAYMENTS, payments);
    }

    return { success: true };
  },

  /**
   * Reschedule appointment (Cancel old one, book new one)
   */
  reschedule(appointmentId, newSlotId, reason, changedBy, bypassRules = false) {
    if (!window.DB) return { success: false, error: "Database not loaded." };

    const apt = window.DB.getById(window.DB_COLLECTIONS.APPOINTMENTS, appointmentId);
    if (!apt) return { success: false, error: "Appointment not found." };

    // Check cancellation window rule
    if (!bypassRules && this.isWithinCancellationWindow(apt.appointmentDate, apt.startTime)) {
      const settings = window.DB.get(window.DB_COLLECTIONS.SETTINGS)[0] || { cancellationWindowHours: 2 };
      return { 
        success: false, 
        error: `Rescheduling window is closed. Appointments cannot be rescheduled online less than ${settings.cancellationWindowHours} hours prior.` 
      };
    }

    // Find new slot
    const slots = window.DB.get(window.DB_COLLECTIONS.DOCTOR_SLOTS);
    const newSlot = slots.find(s => s.id === newSlotId);
    if (!newSlot) {
      return { success: false, error: "New slot not found." };
    }
    if (newSlot.isBooked || newSlot.isBlocked) {
      return { success: false, error: "New slot is unavailable." };
    }

    // Get original payment mode
    const payments = window.DB.get(window.DB_COLLECTIONS.PAYMENTS);
    const originalPayment = payments.find(p => p.appointmentId === appointmentId);
    const payMode = originalPayment ? originalPayment.paymentMode : 'PAY_AT_CLINIC';

    // 1. Cancel the old appointment (bypassing rules since we checked them here)
    const cancelRes = this.cancel(appointmentId, changedBy, `Rescheduled: ${reason}`, true);
    if (!cancelRes.success) {
      return cancelRes;
    }

    // 2. Book the new appointment
    const bookRes = this.book(apt.patientId, apt.doctorId, apt.clinicId, newSlotId, reason, payMode, apt.bookingType);
    if (!bookRes.success) {
      // Rollback? Since cancel succeeded, just return error. The slot was freed.
      return bookRes;
    }

    // 3. Link reschedule info in new appointment
    window.DB.update(window.DB_COLLECTIONS.APPOINTMENTS, bookRes.appointment.id, {
      rescheduledFromId: appointmentId
    });

    // 4. Update status history remark for cancel to note reschedule target
    const histories = window.DB.get(window.DB_COLLECTIONS.STATUS_HISTORY);
    const cancelHistory = histories.filter(h => h.appointmentId === appointmentId).pop();
    if (cancelHistory) {
      cancelHistory.remarks += `. Rescheduled to appointment ${bookRes.appointment.id}`;
      window.DB.save(window.DB_COLLECTIONS.STATUS_HISTORY, histories);
    }

    return { success: true, appointment: bookRes.appointment };
  },

  /**
   * Enforce valid transitions only
   */
  isValidTransition(oldStatus, newStatus) {
    const transitions = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
      'IN_PROGRESS': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': [],
      'NO_SHOW': []
    };

    return (transitions[oldStatus] || []).includes(newStatus);
  },

  /**
   * Change appointment status directly (for Doctor/Receptionist flows)
   */
  changeStatus(appointmentId, newStatus, changedBy, remarks = '') {
    if (!window.DB) return { success: false, error: "Database not loaded." };

    const apt = window.DB.getById(window.DB_COLLECTIONS.APPOINTMENTS, appointmentId);
    if (!apt) return { success: false, error: "Appointment not found." };

    if (!this.isValidTransition(apt.status, newStatus)) {
      return { success: false, error: `Invalid transition from ${apt.status} to ${newStatus}.` };
    }

    const oldStatus = apt.status;
    const now = new Date().toISOString();

    // 1. Update Appointment Status
    window.DB.update(window.DB_COLLECTIONS.APPOINTMENTS, appointmentId, { status: newStatus });

    // 2. If transitioning to CANCELLED or NO_SHOW, free the slot
    if (['CANCELLED', 'NO_SHOW'].includes(newStatus)) {
      const slots = window.DB.get(window.DB_COLLECTIONS.DOCTOR_SLOTS);
      const slotIndex = slots.findIndex(s => s.id === apt.slotId);
      if (slotIndex !== -1) {
        slots[slotIndex].isBooked = false;
        window.DB.save(window.DB_COLLECTIONS.DOCTOR_SLOTS, slots);
      }
    }

    // 3. Create Status History Row
    window.DB.insert(window.DB_COLLECTIONS.STATUS_HISTORY, {
      appointmentId,
      oldStatus,
      newStatus,
      changedBy,
      changedAt: now,
      remarks: remarks || `Status changed by ${changedBy}`
    });

    // 4. Update payment status if marked COMPLETED
    if (newStatus === 'COMPLETED') {
      const payments = window.DB.get(window.DB_COLLECTIONS.PAYMENTS);
      const payIndex = payments.findIndex(p => p.appointmentId === appointmentId);
      if (payIndex !== -1 && payments[payIndex].paymentStatus === 'PENDING') {
        payments[payIndex].paymentStatus = 'PAID';
        payments[payIndex].paidAt = now;
        window.DB.save(window.DB_COLLECTIONS.PAYMENTS, payments);
      }
    }

    return { success: true };
  },

  /**
   * Leave a review for a completed appointment
   */
  leaveReview(appointmentId, rating, comment) {
    if (!window.DB) return { success: false, error: "Database not loaded." };

    const apt = window.DB.getById(window.DB_COLLECTIONS.APPOINTMENTS, appointmentId);
    if (!apt) return { success: false, error: "Appointment not found." };

    if (apt.status !== 'COMPLETED') {
      return { success: false, error: "Reviews can only be submitted for completed appointments." };
    }

    // Check if review already exists
    const reviews = window.DB.get(window.DB_COLLECTIONS.REVIEWS);
    const existing = reviews.find(r => r.appointmentId === appointmentId);
    if (existing) {
      return { success: false, error: "You have already left a review for this appointment." };
    }

    // 1. Insert review
    const newReview = {
      id: Math.random().toString(36).substring(2, 15),
      appointmentId,
      patientId: apt.patientId,
      doctorId: apt.doctorId,
      rating: Number(rating),
      comment,
      createdAt: new Date().toISOString()
    };
    window.DB.insert(window.DB_COLLECTIONS.REVIEWS, newReview);

    // 2. Recalculate doctor average rating
    const docReviews = window.DB.get(window.DB_COLLECTIONS.REVIEWS).filter(r => r.doctorId === apt.doctorId);
    const avg = docReviews.reduce((sum, r) => sum + r.rating, 0) / docReviews.length;
    
    window.DB.update(window.DB_COLLECTIONS.DOCTORS, apt.doctorId, {
      rating: parseFloat(avg.toFixed(1))
    });

    return { success: true };
  }
};

window.APPOINTMENTS = APPOINTMENTS;
