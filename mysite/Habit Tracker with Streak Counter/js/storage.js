/**
 * Storage Module for Habit Tracker
 * Handles localStorage persistence, seed initialization, export, and import
 */

const STORAGE_KEYS = {
    HABITS: 'habittracker_habits',
    CHECKINS_PREFIX: 'habittracker_checkins_', // keyed by habitId
    SETTINGS: 'habittracker_settings',
    LAST_MILESTONE: 'habittracker_milestones_' // keyed by habitId
};

// Default starter habits for new users
const DEFAULT_HABITS = [
    {
        id: 'habit_1',
        name: 'Drink 2.5L Water',
        emoji: '💧',
        category: 'Health',
        color: '#06b6d4', // Cyan
        frequencyType: 'daily', // 'daily' | 'weekdays'
        targetDays: [0, 1, 2, 3, 4, 5, 6], // 0=Sun, 1=Mon, ..., 6=Sat
        reminderTime: '09:00',
        enableReminder: true,
        archived: false,
        createdAt: new Date(Date.now() - 35 * 86400000).toISOString()
    },
    {
        id: 'habit_2',
        name: 'Morning Workout / Stretch',
        emoji: '⚡',
        category: 'Fitness',
        color: '#f97316', // Orange
        frequencyType: 'weekdays',
        targetDays: [1, 2, 3, 4, 5], // Mon-Fri
        reminderTime: '07:30',
        enableReminder: false,
        archived: false,
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
        id: 'habit_3',
        name: 'Read 20 Pages of Book',
        emoji: '📚',
        category: 'Learning',
        color: '#8b5cf6', // Purple
        frequencyType: 'daily',
        targetDays: [0, 1, 2, 3, 4, 5, 6],
        reminderTime: '21:30',
        enableReminder: true,
        archived: false,
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString()
    },
    {
        id: 'habit_4',
        name: '10 min Mindfulness / Meditation',
        emoji: '🧘',
        category: 'Mindfulness',
        color: '#10b981', // Emerald
        frequencyType: 'daily',
        targetDays: [0, 1, 2, 3, 4, 5, 6],
        reminderTime: '22:00',
        enableReminder: false,
        archived: false,
        createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
    }
];

class HabitStorage {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(STORAGE_KEYS.HABITS)) {
            this.seedData();
        }
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            this.saveSettings({
                theme: 'dark',
                soundEnabled: true,
                gridDaysView: 30, // 30 or 90 days
                notificationsEnabled: false
            });
        }
    }

    seedData() {
        this.saveHabits(DEFAULT_HABITS);

        // Pre-fill realistic check-in history for demo habits so user sees beautiful graphs immediately
        const today = new Date();
        
        // Habit 1: Drink water (strong streak of ~12 days, occasional misses before)
        const checkins1 = {};
        for (let i = 0; i < 35; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = this.formatDate(d);
            // 85% completion rate, solid recent streak
            if (i < 8 || (i >= 9 && i <= 15) || (i > 16 && Math.random() > 0.3)) {
                checkins1[dateStr] = { completed: true, timestamp: d.toISOString() };
            }
        }
        this.saveCheckins('habit_1', checkins1);

        // Habit 2: Workout (weekday only, active streak)
        const checkins2 = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayOfWeek = d.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Mon-Fri
                if (i < 10 || Math.random() > 0.25) {
                    checkins2[this.formatDate(d)] = { completed: true, timestamp: d.toISOString() };
                }
            }
        }
        this.saveCheckins('habit_2', checkins2);

        // Habit 3: Read book (21-day streak)
        const checkins3 = {};
        for (let i = 0; i < 40; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (i < 21 || (i >= 23 && i <= 35)) {
                checkins3[this.formatDate(d)] = { completed: true, timestamp: d.toISOString() };
            }
        }
        this.saveCheckins('habit_3', checkins3);

        // Habit 4: Meditation (5-day streak)
        const checkins4 = {};
        for (let i = 0; i < 25; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (i < 5 || (i >= 7 && i <= 12) || i === 15 || i === 18) {
                checkins4[this.formatDate(d)] = { completed: true, timestamp: d.toISOString() };
            }
        }
        this.saveCheckins('habit_4', checkins4);
    }

    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    getHabits() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.HABITS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse habits from localStorage', e);
            return [];
        }
    }

    saveHabits(habits) {
        try {
            localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
        } catch (e) {
            console.error('Failed to save habits to localStorage', e);
        }
    }

    getHabitById(id) {
        return this.getHabits().find(h => h.id === id) || null;
    }

    addHabit(habitData) {
        const habits = this.getHabits();
        const newHabit = {
            id: 'habit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: habitData.name.trim(),
            emoji: habitData.emoji || '✨',
            category: habitData.category || 'General',
            color: habitData.color || '#6366f1',
            frequencyType: habitData.frequencyType || 'daily',
            targetDays: habitData.targetDays && habitData.targetDays.length ? habitData.targetDays : [0, 1, 2, 3, 4, 5, 6],
            reminderTime: habitData.reminderTime || '',
            enableReminder: !!habitData.enableReminder,
            archived: false,
            createdAt: new Date().toISOString()
        };
        habits.push(newHabit);
        this.saveHabits(habits);
        this.saveCheckins(newHabit.id, {});
        return newHabit;
    }

    updateHabit(id, updateData) {
        const habits = this.getHabits();
        const index = habits.findIndex(h => h.id === id);
        if (index === -1) return null;

        habits[index] = {
            ...habits[index],
            ...updateData,
            name: updateData.name ? updateData.name.trim() : habits[index].name,
            updatedAt: new Date().toISOString()
        };
        this.saveHabits(habits);
        return habits[index];
    }

    deleteHabit(id) {
        let habits = this.getHabits();
        habits = habits.filter(h => h.id !== id);
        this.saveHabits(habits);
        localStorage.removeItem(STORAGE_KEYS.CHECKINS_PREFIX + id);
        localStorage.removeItem(STORAGE_KEYS.LAST_MILESTONE + id);
    }

    toggleArchiveHabit(id) {
        const habit = this.getHabitById(id);
        if (habit) {
            return this.updateHabit(id, { archived: !habit.archived });
        }
        return null;
    }

    getCheckins(habitId) {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.CHECKINS_PREFIX + habitId);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error(`Failed to parse checkins for habit ${habitId}`, e);
            return {};
        }
    }

    saveCheckins(habitId, checkins) {
        try {
            localStorage.setItem(STORAGE_KEYS.CHECKINS_PREFIX + habitId, JSON.stringify(checkins));
        } catch (e) {
            console.error(`Failed to save checkins for habit ${habitId}`, e);
        }
    }

    toggleCheckin(habitId, dateStr) {
        const checkins = this.getCheckins(habitId);
        const isCurrentlyCompleted = !!(checkins[dateStr] && checkins[dateStr].completed);

        if (isCurrentlyCompleted) {
            delete checkins[dateStr];
        } else {
            checkins[dateStr] = {
                completed: true,
                timestamp: new Date().toISOString()
            };
        }

        this.saveCheckins(habitId, checkins);
        return !isCurrentlyCompleted;
    }

    setCheckinStatus(habitId, dateStr, isCompleted) {
        const checkins = this.getCheckins(habitId);
        if (isCompleted) {
            checkins[dateStr] = {
                completed: true,
                timestamp: new Date().toISOString()
            };
        } else {
            delete checkins[dateStr];
        }
        this.saveCheckins(habitId, checkins);
    }

    getLastAcknowledgedMilestone(habitId) {
        const val = localStorage.getItem(STORAGE_KEYS.LAST_MILESTONE + habitId);
        return val ? parseInt(val, 10) : 0;
    }

    setLastAcknowledgedMilestone(habitId, streakCount) {
        localStorage.setItem(STORAGE_KEYS.LAST_MILESTONE + habitId, String(streakCount));
    }

    getSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return raw ? JSON.parse(raw) : {
                theme: 'dark',
                soundEnabled: true,
                gridDaysView: 30,
                notificationsEnabled: false
            };
        } catch (e) {
            return {
                theme: 'dark',
                soundEnabled: true,
                gridDaysView: 30,
                notificationsEnabled: false
            };
        }
    }

    saveSettings(settings) {
        const current = this.getSettings();
        const updated = { ...current, ...settings };
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
        return updated;
    }

    exportAllData() {
        const habits = this.getHabits();
        const checkins = {};
        habits.forEach(h => {
            checkins[h.id] = this.getCheckins(h.id);
        });

        const exportPayload = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            settings: this.getSettings(),
            habits: habits,
            checkins: checkins
        };

        return JSON.stringify(exportPayload, null, 2);
    }

    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data || !Array.isArray(data.habits)) {
                throw new Error('Invalid habit backup format');
            }

            this.saveHabits(data.habits);
            if (data.checkins) {
                Object.keys(data.checkins).forEach(habitId => {
                    this.saveCheckins(habitId, data.checkins[habitId]);
                });
            }
            if (data.settings) {
                this.saveSettings(data.settings);
            }
            return { success: true, count: data.habits.length };
        } catch (err) {
            console.error('Import error:', err);
            return { success: false, error: err.message };
        }
    }

    resetAllData() {
        localStorage.clear();
        this.init();
    }
}

// Export singleton instance
window.habitStorage = new HabitStorage();
