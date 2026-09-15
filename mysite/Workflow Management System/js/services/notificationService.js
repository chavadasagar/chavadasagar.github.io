/**
 * ==================================================
 * NOTIFICATION SERVICE (PHASE 14)
 * Client-side Notification Delivery & Management
 * Backed by DatabaseService (hrm_database: notifications)
 * ==================================================
 */

(function () {
  'use strict';

  const NOTIFICATION_TYPES = Object.freeze({
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    DANGER: 'danger'
  });

  class NotificationService {
    constructor() {
      this.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
    }

    _getGenerateId() {
      if (window.HRM && typeof window.HRM.generateId === 'function') {
        return window.HRM.generateId;
      }
      return (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    _dispatchChangeEvent() {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('hrm:notifications-changed'));
      }
    }

    /**
     * Create and store a new notification
     * @param {Object} payload
     * @param {string} payload.employeeId - Recipient user/employee ID (Required)
     * @param {string} payload.title - Notification title (Required)
     * @param {string} payload.message - Notification message (Required)
     * @param {string} [payload.type='info'] - 'info' | 'success' | 'warning' | 'danger'
     * @param {string} [payload.referenceType=null] - e.g. 'ApprovalRequest', 'Leave'
     * @param {string} [payload.referenceId=null] - Target entity identifier
     * @returns {{ success: boolean, notification?: Object, error?: string }}
     */
    createNotification(payload = {}) {
      const { employeeId, title, message, type = 'info', referenceType = null, referenceId = null } = payload;

      if (!employeeId) {
        return { success: false, error: 'Recipient employeeId is required.' };
      }
      if (!title || !title.trim()) {
        return { success: false, error: 'Notification title is required.' };
      }
      if (!message || !message.trim()) {
        return { success: false, error: 'Notification message is required.' };
      }

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) {
        return { success: false, error: 'Database service unavailable.' };
      }

      const db = dbService.getDatabase();
      db.notifications = db.notifications || [];

      const generateId = this._getGenerateId();
      const notification = {
        id: generateId('notif'),
        employeeId: String(employeeId),
        title: title.trim(),
        message: message.trim(),
        type: type || 'info',
        referenceType: referenceType ? String(referenceType) : null,
        referenceId: referenceId ? String(referenceId) : null,
        isRead: false,
        createdAt: new Date().toISOString()
      };

      db.notifications.push(notification);
      dbService.saveDatabase(db);

      this._dispatchChangeEvent();

      return {
        success: true,
        notification
      };
    }

    /**
     * Get all notifications for an employee, sorted newest first
     * @param {string} employeeId
     * @returns {Array<Object>}
     */
    getForEmployee(employeeId) {
      if (!employeeId) return [];

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return [];

      const db = dbService.getDatabase();
      const notifications = db.notifications || [];

      return notifications
        .filter(n => String(n.employeeId) === String(employeeId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get unread notification count for an employee
     * @param {string} employeeId
     * @returns {number}
     */
    getUnreadCount(employeeId) {
      if (!employeeId) return 0;

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return 0;

      const db = dbService.getDatabase();
      const notifications = db.notifications || [];

      return notifications.filter(n => String(n.employeeId) === String(employeeId) && !n.isRead).length;
    }

    /**
     * Mark a specific notification as read
     * @param {string} notificationId
     * @returns {{ success: boolean, error?: string }}
     */
    markAsRead(notificationId) {
      if (!notificationId) return { success: false, error: 'Notification ID required.' };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, error: 'Database service unavailable.' };

      const db = dbService.getDatabase();
      db.notifications = db.notifications || [];

      const notif = db.notifications.find(n => n.id === notificationId);
      if (!notif) {
        return { success: false, error: 'Notification not found.' };
      }

      notif.isRead = true;
      dbService.saveDatabase(db);
      this._dispatchChangeEvent();

      return { success: true, notification: notif };
    }

    /**
     * Mark all notifications for an employee as read
     * @param {string} employeeId
     * @returns {{ success: boolean, count: number }}
     */
    markAllAsRead(employeeId) {
      if (!employeeId) return { success: false, count: 0 };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false, count: 0 };

      const db = dbService.getDatabase();
      db.notifications = db.notifications || [];

      let updatedCount = 0;
      db.notifications.forEach(n => {
        if (String(n.employeeId) === String(employeeId) && !n.isRead) {
          n.isRead = true;
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        dbService.saveDatabase(db);
        this._dispatchChangeEvent();
      }

      return { success: true, count: updatedCount };
    }

    /**
     * Delete a single notification
     * @param {string} notificationId
     * @returns {{ success: boolean }}
     */
    deleteNotification(notificationId) {
      if (!notificationId) return { success: false };

      const dbService = window.HRM ? window.HRM.DatabaseService : null;
      if (!dbService) return { success: false };

      const db = dbService.getDatabase();
      db.notifications = db.notifications || [];

      const initialLen = db.notifications.length;
      db.notifications = db.notifications.filter(n => n.id !== notificationId);

      if (db.notifications.length !== initialLen) {
        dbService.saveDatabase(db);
        this._dispatchChangeEvent();
      }

      return { success: true };
    }
  }

  // Attach to window namespace
  window.HRM = window.HRM || {};
  window.HRM.NotificationService = new NotificationService();
  window.NotificationService = window.HRM.NotificationService;
})();
