/**
 * Habit Model & Statistics Engine
 * Computes streaks, schedule validations, completion rates, and milestones
 */

const MILESTONES = [
    { streak: 3, title: 'Spark Ignited! 🔥', message: '3 days strong! The hardest part is starting. You got this!' },
    { streak: 7, title: 'Week Warrior! ⚡', message: '7-day streak! You built real momentum this week.' },
    { streak: 14, title: 'Two-Week Habit Titan! 🌟', message: '14 consecutive days! This is becoming your second nature.' },
    { streak: 21, title: '21-Day Habit Formation! 🧠', message: '21 days! Science says new neural pathways are firmly locked in!' },
    { streak: 30, title: 'Monthly Legend! 🏆', message: '30 whole days! Exceptional discipline and commitment.' },
    { streak: 60, title: 'Unstoppable Force! 💎', message: '60 days! You are operating on pure habit mastery now.' },
    { streak: 100, title: 'Century Champion! 👑', message: '100 DAYS! You have entered the elite club of relentless consistency!' },
    { streak: 365, title: 'Yearly Immortal! 🌌', message: '365 DAYS! A whole year of unshakeable dedication. Pure greatness!' }
];

const HabitModel = {
    /**
     * Get string formatted date: YYYY-MM-DD in local time
     */
    formatDate(date) {
        if (typeof date === 'string') return date.substring(0, 10);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    },

    /**
     * Parse YYYY-MM-DD string into a Date object at local midnight
     */
    parseDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    },

    /**
     * Get array of date objects representing the last N days ending today
     */
    getDaysRange(numDays = 30) {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }
        return dates;
    },

    /**
     * Check if a habit is scheduled on a given Date object or date string
     */
    isScheduledDay(habit, dateInput) {
        const date = typeof dateInput === 'string' ? this.parseDate(dateInput) : dateInput;
        const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

        if (habit.frequencyType === 'daily') {
            return true;
        }

        if (habit.frequencyType === 'weekdays') {
            // targetDays array, e.g. [1, 2, 3, 4, 5]
            if (Array.isArray(habit.targetDays) && habit.targetDays.length > 0) {
                return habit.targetDays.includes(dayOfWeek);
            }
            return dayOfWeek >= 1 && dayOfWeek <= 5; // Default Mon-Fri
        }

        return true;
    },

    /**
     * Check if habit is completed on dateStr
     */
    isCompleted(habitId, dateStr, checkinsMap = null) {
        const checkins = checkinsMap || window.habitStorage.getCheckins(habitId);
        return !!(checkins[dateStr] && checkins[dateStr].completed);
    },

    /**
     * Calculate current streak and longest streak accurately
     * Streak logic:
     * - Considers scheduled days only
     * - If today is scheduled and completed -> streak counts up through today
     * - If today is scheduled but NOT completed yet -> streak still holds from previous scheduled day
     * - If yesterday (or previous scheduled day) was missed -> streak resets to 0 (or 1 if today is completed)
     */
    calculateStreaks(habit, checkinsMap = null) {
        const checkins = checkinsMap || window.habitStorage.getCheckins(habit.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = this.formatDate(today);

        const isTodayDone = this.isCompleted(habit.id, todayStr, checkins);
        const isTodayScheduled = this.isScheduledDay(habit, today);

        // Find all dates from habit creation (or at least 365 days ago) up to today
        const startDate = habit.createdAt ? new Date(habit.createdAt) : new Date(today.getTime() - 365 * 86400000);
        startDate.setHours(0, 0, 0, 0);

        // Ensure we check at least 365 days back if creation is recent
        const earliestDate = new Date(Math.min(startDate.getTime(), today.getTime() - 365 * 86400000));

        // Generate list of all scheduled dates in ascending order
        const scheduledDates = [];
        let curr = new Date(earliestDate);
        while (curr <= today) {
            if (this.isScheduledDay(habit, curr)) {
                scheduledDates.push(this.formatDate(curr));
            }
            curr.setDate(curr.getDate() + 1);
        }

        if (scheduledDates.length === 0) {
            return { currentStreak: isTodayDone ? 1 : 0, longestStreak: isTodayDone ? 1 : 0, isTodayDone };
        }

        // Calculate Longest Streak in history
        let maxStreak = 0;
        let runningStreak = 0;

        for (let i = 0; i < scheduledDates.length; i++) {
            const dateStr = scheduledDates[i];
            const done = this.isCompleted(habit.id, dateStr, checkins);
            if (done) {
                runningStreak++;
                if (runningStreak > maxStreak) {
                    maxStreak = runningStreak;
                }
            } else {
                runningStreak = 0;
            }
        }

        // Calculate Current Active Streak
        let currentStreak = 0;
        const lastScheduledDateStr = scheduledDates[scheduledDates.length - 1];

        // Start checking backwards from the latest scheduled date
        let idx = scheduledDates.length - 1;

        if (lastScheduledDateStr === todayStr) {
            if (isTodayDone) {
                // Today is done, count backwards from today
                while (idx >= 0 && this.isCompleted(habit.id, scheduledDates[idx], checkins)) {
                    currentStreak++;
                    idx--;
                }
            } else {
                // Today is not done yet, grace period: check if previous scheduled day was done
                idx--;
                while (idx >= 0 && this.isCompleted(habit.id, scheduledDates[idx], checkins)) {
                    currentStreak++;
                    idx--;
                }
            }
        } else {
            // Today is not a scheduled day (e.g. weekend for a Mon-Fri habit)
            // Check backwards from the most recent scheduled day
            while (idx >= 0 && this.isCompleted(habit.id, scheduledDates[idx], checkins)) {
                currentStreak++;
                idx--;
            }
        }

        return {
            currentStreak,
            longestStreak: Math.max(maxStreak, currentStreak),
            isTodayDone,
            isTodayScheduled
        };
    },

    /**
     * Calculate Weekly, Monthly, and Overall Completion Percentages
     */
    calculateStats(habit, checkinsMap = null) {
        const checkins = checkinsMap || window.habitStorage.getCheckins(habit.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Weekly (Last 7 Days)
        let weekScheduled = 0;
        let weekCompleted = 0;
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (this.isScheduledDay(habit, d)) {
                weekScheduled++;
                if (this.isCompleted(habit.id, this.formatDate(d), checkins)) {
                    weekCompleted++;
                }
            }
        }
        const weeklyRate = weekScheduled > 0 ? Math.round((weekCompleted / weekScheduled) * 100) : 0;

        // Monthly (Last 30 Days)
        let monthScheduled = 0;
        let monthCompleted = 0;
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            if (this.isScheduledDay(habit, d)) {
                monthScheduled++;
                if (this.isCompleted(habit.id, this.formatDate(d), checkins)) {
                    monthCompleted++;
                }
            }
        }
        const monthlyRate = monthScheduled > 0 ? Math.round((monthCompleted / monthScheduled) * 100) : 0;

        // Total All-Time Checkins
        const totalCompleted = Object.values(checkins).filter(c => c && c.completed).length;

        // Streak info
        const streaks = this.calculateStreaks(habit, checkins);

        return {
            weeklyRate,
            weekCompleted,
            weekScheduled,
            monthlyRate,
            monthCompleted,
            monthScheduled,
            totalCompleted,
            currentStreak: streaks.currentStreak,
            longestStreak: streaks.longestStreak,
            isTodayDone: streaks.isTodayDone,
            isTodayScheduled: streaks.isTodayScheduled
        };
    },

    /**
     * Check if a new milestone has been reached
     */
    checkMilestone(habit, currentStreak) {
        if (currentStreak <= 0) return null;

        const lastAck = window.habitStorage.getLastAcknowledgedMilestone(habit.id);
        
        // Find matching milestone
        const milestone = MILESTONES.find(m => m.streak === currentStreak);
        if (milestone && currentStreak > lastAck) {
            return milestone;
        }

        return null;
    },

    /**
     * Formats frequency text (e.g. "Every day", "Mon, Wed, Fri", "Weekdays")
     */
    getFrequencyLabel(habit) {
        if (habit.frequencyType === 'daily') {
            return 'Every day';
        }
        if (!habit.targetDays || habit.targetDays.length === 0) {
            return 'Weekdays (Mon-Fri)';
        }
        if (habit.targetDays.length === 7) {
            return 'Every day';
        }
        if (habit.targetDays.length === 5 && [1, 2, 3, 4, 5].every(d => habit.targetDays.includes(d))) {
            return 'Mon – Fri';
        }
        if (habit.targetDays.length === 2 && [0, 6].every(d => habit.targetDays.includes(d))) {
            return 'Weekends';
        }

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return habit.targetDays
            .sort((a, b) => a - b)
            .map(d => dayNames[d])
            .join(', ');
    }
};

window.HabitModel = HabitModel;
window.MILESTONES = MILESTONES;
