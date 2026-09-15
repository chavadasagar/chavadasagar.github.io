/**
 * slots.js - Doctor Slot Generation & Date Blocking Business Logic
 */

const SLOTS = {
  /**
   * Helper to format Date object to YYYY-MM-DD
   */
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Generates or syncs slots for a doctor for the next N days starting from today.
   * Preserves existing slots to avoid wiping out booked appointments.
   */
  generateSlots(doctorId, daysAhead = 30) {
    if (!window.DB) return;

    const schedules = window.DB.get(window.DB_COLLECTIONS.DOCTOR_SCHEDULES);
    const slots = window.DB.get(window.DB_COLLECTIONS.DOCTOR_SLOTS);
    const blocks = window.DB.get('doctorBlocks') || []; // List of { doctorId, blockDate, reason }

    const doctorSchedules = schedules.filter(s => s.doctorId === doctorId);
    if (doctorSchedules.length === 0) {
      console.log(`No weekly schedules found for doctor ${doctorId}`);
      return;
    }

    const today = new Date();
    
    // We will generate/update slots day-by-day
    for (let i = 0; i < daysAhead; i++) {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() + i);
      const dateStr = this.formatDate(targetDate);
      const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday

      // Get schedules for this day of the week
      const dayScheds = doctorSchedules.filter(s => s.dayOfWeek === dayOfWeek);
      if (dayScheds.length === 0) continue;

      // Check if this date is blocked for this doctor
      const isBlockedDate = blocks.some(b => b.doctorId === doctorId && b.blockDate === dateStr);

      dayScheds.forEach(sched => {
        // Calculate start and end for slotting
        // e.g. '09:00' to '17:00'
        let current = new Date(`${dateStr}T${sched.startTime}`);
        const end = new Date(`${dateStr}T${sched.endTime}`);
        const duration = sched.slotDurationMinutes || 15;

        // If there's an optional break, we can check for that, but simple start-to-end is standard.
        while (current < end) {
          const startH = String(current.getHours()).padStart(2, '0');
          const startM = String(current.getMinutes()).padStart(2, '0');
          const slotStart = `${startH}:${startM}`;
          
          current.setMinutes(current.getMinutes() + duration);
          
          const endH = String(current.getHours()).padStart(2, '0');
          const endM = String(current.getMinutes()).padStart(2, '0');
          const slotEnd = `${endH}:${endM}`;
          
          if (current <= end) {
            const slotId = `slot-${doctorId}-${dateStr}-${slotStart.replace(':', '')}`;
            
            // Check if slot already exists
            let existingSlotIndex = slots.findIndex(s => s.id === slotId);

            if (existingSlotIndex !== -1) {
              // Update isBlocked status based on date blocking, preserving isBooked
              slots[existingSlotIndex].isBlocked = isBlockedDate;
            } else {
              // Create new slot
              slots.push({
                id: slotId,
                doctorId: doctorId,
                slotDate: dateStr,
                startTime: slotStart,
                endTime: slotEnd,
                isBooked: false,
                isBlocked: isBlockedDate
              });
            }
          }
        }
      });
    }

    // Save updated slots
    window.DB.save(window.DB_COLLECTIONS.DOCTOR_SLOTS, slots);
    console.log(`Generated/Sync'd slots for doctor ${doctorId} for next ${daysAhead} days.`);
  },

  /**
   * Block a specific date for a doctor
   */
  blockDate(doctorId, dateStr, reason) {
    if (!window.DB) return false;
    
    let blocks = window.DB.get('doctorBlocks') || [];
    
    // Check if already blocked
    if (blocks.some(b => b.doctorId === doctorId && b.blockDate === dateStr)) {
      return false; // Already blocked
    }

    blocks.push({
      id: Math.random().toString(36).substring(2, 15),
      doctorId,
      blockDate: dateStr,
      reason,
      createdAt: new Date().toISOString()
    });

    window.DB.save('doctorBlocks', blocks);

    // After blocking a date, regenerate slots for this doctor to set isBlocked = true for this date
    this.generateSlots(doctorId, 30);
    return true;
  },

  /**
   * Unblock a date for a doctor
   */
  unblockDate(doctorId, dateStr) {
    if (!window.DB) return false;

    let blocks = window.DB.get('doctorBlocks') || [];
    const filtered = blocks.filter(b => !(b.doctorId === doctorId && b.blockDate === dateStr));
    
    if (filtered.length === blocks.length) return false;

    window.DB.save('doctorBlocks', filtered);

    // Regenerate slots to clear isBlocked
    this.generateSlots(doctorId, 30);
    return true;
  },

  /**
   * Check if blocking a date will conflict with already booked appointments.
   * Returns list of affected appointments.
   */
  getConflictsForDate(doctorId, dateStr) {
    if (!window.DB) return [];
    
    const appointments = window.DB.get(window.DB_COLLECTIONS.APPOINTMENTS);
    return appointments.filter(apt => 
      apt.doctorId === doctorId && 
      apt.appointmentDate === dateStr && 
      !['CANCELLED', 'NO_SHOW'].includes(apt.status)
    );
  },

  /**
   * Check if removing/modifying schedule for a dayOfWeek conflicts with booked appointments.
   * Returns list of affected appointments (occurring in the next 30 days).
   */
  getScheduleConflicts(doctorId, schedulesToKeep) {
    if (!window.DB) return [];

    const appointments = window.DB.get(window.DB_COLLECTIONS.APPOINTMENTS);
    const today = new Date();
    
    // Find active appointments for this doctor in the next 30 days
    const activeApts = appointments.filter(apt => {
      if (apt.doctorId !== doctorId) return false;
      if (['CANCELLED', 'NO_SHOW'].includes(apt.status)) return false;
      
      const aptDate = new Date(apt.appointmentDate);
      const diffTime = aptDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 30;
    });

    const conflicts = [];

    activeApts.forEach(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const dayOfWeek = aptDate.getDay();

      // Check if this dayOfWeek is no longer offered in schedulesToKeep
      const isAvailable = schedulesToKeep.some(s => s.dayOfWeek === dayOfWeek);
      if (!isAvailable) {
        conflicts.push(apt);
        return;
      }

      // Check if slot falls outside schedule time window
      const matchingScheds = schedulesToKeep.filter(s => s.dayOfWeek === dayOfWeek);
      let withinTimes = false;

      matchingScheds.forEach(sched => {
        if (apt.startTime >= sched.startTime && apt.endTime <= sched.endTime) {
          withinTimes = true;
        }
      });

      if (!withinTimes) {
        conflicts.push(apt);
      }
    });

    return conflicts;
  }
};

window.SLOTS = SLOTS;
