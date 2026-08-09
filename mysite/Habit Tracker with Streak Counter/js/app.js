/**
 * Main Application Controller - HabitFlow
 */

const APP_PALETTES = [
    { color: '#6366f1', name: 'Indigo' },
    { color: '#10b981', name: 'Emerald' },
    { color: '#06b6d4', name: 'Cyan' },
    { color: '#f97316', name: 'Orange' },
    { color: '#8b5cf6', name: 'Purple' },
    { color: '#f43f5e', name: 'Rose' },
    { color: '#f59e0b', name: 'Amber' },
    { color: '#0284c7', name: 'Sky' },
    { color: '#84cc16', name: 'Lime' }
];

const APP_EMOJIS = [
    '💧', '⚡', '📚', '🧘', '🏃', '💪', '🍎', '💤', 
    '🎯', '🎨', '💻', '🎸', '🌱', '✍️', '🚴', '🧠', 
    '🔥', '✨', '🏆', '⭐', '☕', '🥦', '🚶', '❤️'
];

const MOTIVATIONAL_QUOTES = [
    { quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
    { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
    { quote: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
    { quote: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
    { quote: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
    { quote: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" }
];

class HabitApp {
    constructor() {
        this.storage = window.habitStorage;
        this.model = window.HabitModel;
        this.sound = window.soundFx;
        this.confetti = window.confettiCelebration;

        this.settings = this.storage.getSettings();
        this.activeFilter = 'active'; // 'active' | 'archived'
        this.categoryFilter = 'all';
        this.selectedHabitId = null;

        this.selectedFormEmoji = '💧';
        this.selectedFormColor = '#6366f1';
        this.selectedFormDays = [0, 1, 2, 3, 4, 5, 6];

        this.init();
    }

    init() {
        // Apply theme & sound settings
        this.applyTheme(this.settings.theme || 'dark');
        this.sound.setEnabled(this.settings.soundEnabled !== false);

        this.setupEventListeners();
        this.populateFormSelectors();
        this.startReminderChecker();
        this.renderApp();
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.settings.theme = theme;
        this.storage.saveSettings({ theme });

        const themeIcon = document.getElementById('theme-icon-moon');
        if (themeIcon) {
            if (theme === 'light') {
                themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
            } else {
                themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
            }
        }
    }

    toggleTheme() {
        const nextTheme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(nextTheme);
        this.sound.playTap();
    }

    toggleSound() {
        const newState = !this.sound.enabled;
        this.sound.setEnabled(newState);
        this.storage.saveSettings({ soundEnabled: newState });

        const soundBtn = document.getElementById('btn-toggle-sound');
        if (soundBtn) {
            soundBtn.style.opacity = newState ? '1' : '0.45';
        }
        if (newState) {
            this.sound.playTap();
        }
        this.showToast(newState ? '🔊 Sound effects enabled' : '🔇 Sound effects muted');
    }

    setupEventListeners() {
        // Theme & Sound toggles
        document.getElementById('btn-toggle-theme')?.addEventListener('click', () => this.toggleTheme());
        document.getElementById('btn-toggle-sound')?.addEventListener('click', () => this.toggleSound());
        document.getElementById('btn-open-settings')?.addEventListener('click', () => this.openSettingsModal());

        // FAB and Modal open
        document.getElementById('fab-add-habit')?.addEventListener('click', () => {
            this.sound.playTap();
            this.openHabitForm();
        });

        // Filter tabs (Active vs Archived)
        document.getElementById('tab-active-habits')?.addEventListener('click', (e) => {
            this.setActiveFilter('active', e.currentTarget);
        });
        document.getElementById('tab-archived-habits')?.addEventListener('click', (e) => {
            this.setActiveFilter('archived', e.currentTarget);
        });

        // Grid View Switcher (30 vs 90 days)
        document.getElementById('btn-view-30')?.addEventListener('click', (e) => {
            this.setGridDaysView(30, e.currentTarget);
        });
        document.getElementById('btn-view-90')?.addEventListener('click', (e) => {
            this.setGridDaysView(90, e.currentTarget);
        });

        // Category Filter Chips
        document.getElementById('category-chips-bar')?.addEventListener('click', (e) => {
            const chip = e.target.closest('.chip-btn');
            if (chip) {
                this.setCategoryFilter(chip.dataset.category, chip);
            }
        });

        // Form Emoji Trigger
        document.getElementById('form-emoji-trigger')?.addEventListener('click', () => {
            const wrapper = document.getElementById('emoji-picker-wrapper');
            if (wrapper) {
                wrapper.style.display = wrapper.style.display === 'none' ? 'block' : 'none';
            }
        });

        // Frequency Radio Switches
        document.getElementById('freq-daily')?.addEventListener('change', () => {
            document.getElementById('weekday-selector-group').style.display = 'none';
            this.selectedFormDays = [0, 1, 2, 3, 4, 5, 6];
        });
        document.getElementById('freq-weekdays')?.addEventListener('change', () => {
            document.getElementById('weekday-selector-group').style.display = 'flex';
            if (this.selectedFormDays.length === 7) {
                this.selectedFormDays = [1, 2, 3, 4, 5]; // Default Mon-Fri
                this.updateWeekdayButtonsUI();
            }
        });

        // Weekday Buttons
        document.getElementById('weekday-selector-group')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.weekday-btn');
            if (btn) {
                const dayNum = parseInt(btn.dataset.day, 10);
                if (this.selectedFormDays.includes(dayNum)) {
                    if (this.selectedFormDays.length > 1) { // keep at least 1 day
                        this.selectedFormDays = this.selectedFormDays.filter(d => d !== dayNum);
                    }
                } else {
                    this.selectedFormDays.push(dayNum);
                }
                this.updateWeekdayButtonsUI();
            }
        });

        // Form Submit
        document.getElementById('habit-edit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHabitFromForm();
        });

        // Form Cancel & Close
        document.getElementById('btn-close-form')?.addEventListener('click', () => this.closeModal('modal-habit-form'));
        document.getElementById('btn-cancel-form')?.addEventListener('click', () => this.closeModal('modal-habit-form'));

        // Milestone Close
        document.getElementById('btn-close-milestone')?.addEventListener('click', () => {
            this.closeModal('modal-milestone');
            this.sound.playTap();
        });

        // Habit Details / Stats Modal Actions
        document.getElementById('btn-close-stats')?.addEventListener('click', () => this.closeModal('modal-habit-stats'));
        document.getElementById('btn-stats-edit')?.addEventListener('click', () => {
            this.closeModal('modal-habit-stats');
            if (this.selectedHabitId) {
                const habit = this.storage.getHabitById(this.selectedHabitId);
                if (habit) this.openHabitForm(habit);
            }
        });
        document.getElementById('btn-stats-archive')?.addEventListener('click', () => {
            this.closeModal('modal-habit-stats');
            if (this.selectedHabitId) {
                this.toggleArchiveHabit(this.selectedHabitId);
            }
        });
        document.getElementById('btn-stats-delete')?.addEventListener('click', () => {
            this.closeModal('modal-habit-stats');
            if (this.selectedHabitId) {
                const habit = this.storage.getHabitById(this.selectedHabitId);
                if (habit) this.openDeleteConfirm(habit);
            }
        });

        // Delete Confirm Actions
        document.getElementById('btn-cancel-delete')?.addEventListener('click', () => this.closeModal('modal-confirm-delete'));
        document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
            if (this.selectedHabitId) {
                this.storage.deleteHabit(this.selectedHabitId);
                this.closeModal('modal-confirm-delete');
                this.showToast('🗑️ Habit deleted');
                this.renderApp();
            }
        });

        // Settings Actions
        document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeModal('modal-settings'));
        document.getElementById('btn-request-notification-perm')?.addEventListener('click', () => this.requestNotificationPermission());
        document.getElementById('btn-export-backup')?.addEventListener('click', () => this.exportBackupJSON());
        document.getElementById('btn-import-trigger')?.addEventListener('click', () => {
            document.getElementById('file-import-input')?.click();
        });
        document.getElementById('file-import-input')?.addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('btn-reset-data')?.addEventListener('click', () => {
            if (confirm('Reset all habits and check-in history to demo defaults?')) {
                this.storage.resetAllData();
                this.closeModal('modal-settings');
                this.showToast('✨ Demo data loaded');
                this.renderApp();
            }
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal-backdrop').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('open');
                }
            });
        });
    }

    setActiveFilter(filter, buttonEl) {
        this.activeFilter = filter;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        buttonEl?.classList.add('active');
        this.sound.playTap();
        this.renderApp();
    }

    setCategoryFilter(category, buttonEl) {
        this.categoryFilter = category;
        document.querySelectorAll('.chip-btn').forEach(btn => btn.classList.remove('active'));
        buttonEl?.classList.add('active');
        this.sound.playTap();
        this.renderApp();
    }

    setGridDaysView(days, buttonEl) {
        this.settings.gridDaysView = days;
        this.storage.saveSettings({ gridDaysView: days });
        document.querySelectorAll('.grid-view-btn').forEach(btn => btn.classList.remove('active'));
        buttonEl?.classList.add('active');
        this.sound.playTap();
        this.renderHabits();
    }

    populateFormSelectors() {
        // Emoji Picker
        const emojiContainer = document.getElementById('emoji-picker-list');
        if (emojiContainer) {
            emojiContainer.innerHTML = APP_EMOJIS.map(em => `
                <button type="button" class="emoji-choice-btn ${em === this.selectedFormEmoji ? 'selected' : ''}" data-emoji="${em}">
                    ${em}
                </button>
            `).join('');

            emojiContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.emoji-choice-btn');
                if (btn) {
                    this.selectedFormEmoji = btn.dataset.emoji;
                    document.getElementById('form-emoji-trigger').textContent = this.selectedFormEmoji;
                    document.querySelectorAll('.emoji-choice-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    document.getElementById('emoji-picker-wrapper').style.display = 'none';
                    this.sound.playTap();
                }
            });
        }

        // Color Picker
        const colorContainer = document.getElementById('color-picker-list');
        if (colorContainer) {
            colorContainer.innerHTML = APP_PALETTES.map(p => `
                <button type="button" class="color-swatch-btn ${p.color === this.selectedFormColor ? 'selected' : ''}" 
                        style="background-color: ${p.color};" 
                        data-color="${p.color}" 
                        title="${p.name}">
                </button>
            `).join('');

            colorContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.color-swatch-btn');
                if (btn) {
                    this.selectedFormColor = btn.dataset.color;
                    document.querySelectorAll('.color-swatch-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    this.sound.playTap();
                }
            });
        }
    }

    updateWeekdayButtonsUI() {
        document.querySelectorAll('.weekday-btn').forEach(btn => {
            const day = parseInt(btn.dataset.day, 10);
            if (this.selectedFormDays.includes(day)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    openHabitForm(habitToEdit = null) {
        const form = document.getElementById('habit-edit-form');
        const modalTitle = document.getElementById('modal-form-title');
        form.reset();

        if (habitToEdit) {
            modalTitle.textContent = 'Edit Habit';
            document.getElementById('form-habit-id').value = habitToEdit.id;
            document.getElementById('form-habit-name').value = habitToEdit.name;
            document.getElementById('form-habit-category').value = habitToEdit.category || 'General';
            document.getElementById('form-reminder-time').value = habitToEdit.reminderTime || '08:00';
            document.getElementById('form-reminder-enable').checked = !!habitToEdit.enableReminder;

            this.selectedFormEmoji = habitToEdit.emoji || '💧';
            this.selectedFormColor = habitToEdit.color || '#6366f1';
            this.selectedFormDays = habitToEdit.targetDays ? [...habitToEdit.targetDays] : [0, 1, 2, 3, 4, 5, 6];

            if (habitToEdit.frequencyType === 'weekdays') {
                document.getElementById('freq-weekdays').checked = true;
                document.getElementById('weekday-selector-group').style.display = 'flex';
            } else {
                document.getElementById('freq-daily').checked = true;
                document.getElementById('weekday-selector-group').style.display = 'none';
            }
        } else {
            modalTitle.textContent = 'Create New Habit';
            document.getElementById('form-habit-id').value = '';
            this.selectedFormEmoji = APP_EMOJIS[Math.floor(Math.random() * APP_EMOJIS.length)];
            this.selectedFormColor = APP_PALETTES[Math.floor(Math.random() * APP_PALETTES.length)].color;
            this.selectedFormDays = [0, 1, 2, 3, 4, 5, 6];
            document.getElementById('freq-daily').checked = true;
            document.getElementById('weekday-selector-group').style.display = 'none';
            document.getElementById('form-reminder-time').value = '08:00';
            document.getElementById('form-reminder-enable').checked = false;
        }

        document.getElementById('form-emoji-trigger').textContent = this.selectedFormEmoji;
        document.querySelectorAll('.emoji-choice-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.emoji === this.selectedFormEmoji);
        });
        document.querySelectorAll('.color-swatch-btn').forEach(b => {
            b.classList.toggle('selected', b.dataset.color === this.selectedFormColor);
        });
        this.updateWeekdayButtonsUI();
        document.getElementById('emoji-picker-wrapper').style.display = 'none';

        this.openModal('modal-habit-form');
        setTimeout(() => document.getElementById('form-habit-name')?.focus(), 150);
    }

    saveHabitFromForm() {
        const id = document.getElementById('form-habit-id').value;
        const name = document.getElementById('form-habit-name').value.trim();
        const category = document.getElementById('form-habit-category').value;
        const frequencyType = document.querySelector('input[name="frequencyType"]:checked').value;
        const reminderTime = document.getElementById('form-reminder-time').value;
        const enableReminder = document.getElementById('form-reminder-enable').checked;

        if (!name) return;

        const habitData = {
            name,
            emoji: this.selectedFormEmoji,
            category,
            color: this.selectedFormColor,
            frequencyType,
            targetDays: frequencyType === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : this.selectedFormDays,
            reminderTime,
            enableReminder
        };

        if (id) {
            this.storage.updateHabit(id, habitData);
            this.showToast('✅ Habit updated!');
        } else {
            this.storage.addHabit(habitData);
            this.showToast('✨ New habit created!');
            this.confetti.fire(30);
        }

        this.sound.playCheck();
        this.closeModal('modal-habit-form');
        this.renderApp();
    }

    toggleTodayHabit(habitId, targetEl = null) {
        const todayStr = this.model.formatDate(new Date());
        const isNowCompleted = this.storage.toggleCheckin(habitId, todayStr);
        const habit = this.storage.getHabitById(habitId);

        if (isNowCompleted) {
            this.sound.playCheck();
            if (targetEl) {
                targetEl.classList.add('checked');
            }

            // Calculate streak and check for milestones
            const streaks = this.model.calculateStreaks(habit);
            const milestone = this.model.checkMilestone(habit, streaks.currentStreak);

            if (milestone) {
                this.triggerMilestoneCelebration(habit, milestone);
            } else if (streaks.currentStreak > 1) {
                this.showToast(`🔥 Streak: ${streaks.currentStreak} days in a row!`);
            } else {
                this.showToast(`🎯 Great job checking in ${habit.name}!`);
            }
        } else {
            this.sound.playUncheck();
            if (targetEl) {
                targetEl.classList.remove('checked');
            }
            this.showToast(`Checked off today`);
        }

        this.renderApp();
    }

    toggleDayCell(habitId, dateStr, cellEl) {
        const isCompleted = this.storage.toggleCheckin(habitId, dateStr);
        const habit = this.storage.getHabitById(habitId);

        if (isCompleted) {
            this.sound.playCheck();
            cellEl.classList.add('completed');
            const streaks = this.model.calculateStreaks(habit);
            const milestone = this.model.checkMilestone(habit, streaks.currentStreak);
            if (milestone) {
                this.triggerMilestoneCelebration(habit, milestone);
            }
        } else {
            this.sound.playUncheck();
            cellEl.classList.remove('completed');
        }

        this.renderApp();
    }

    triggerMilestoneCelebration(habit, milestone) {
        this.sound.playFanfare();
        this.confetti.fire(120);
        this.storage.setLastAcknowledgedMilestone(habit.id, milestone.streak);

        document.getElementById('milestone-icon-display').textContent = habit.emoji || '🔥';
        document.getElementById('milestone-count-display').textContent = milestone.streak;
        document.getElementById('milestone-title-display').textContent = milestone.title;
        document.getElementById('milestone-message-display').textContent = `${milestone.message} (${habit.name})`;

        this.openModal('modal-milestone');
    }

    toggleArchiveHabit(habitId) {
        const habit = this.storage.toggleArchiveHabit(habitId);
        if (habit) {
            this.sound.playTap();
            this.showToast(habit.archived ? '📦 Habit archived' : '📂 Habit restored to active');
            this.renderApp();
        }
    }

    openHabitStatsModal(habitId) {
        this.selectedHabitId = habitId;
        const habit = this.storage.getHabitById(habitId);
        if (!habit) return;

        const stats = this.model.calculateStats(habit);

        document.getElementById('stats-modal-emoji').textContent = habit.emoji;
        document.getElementById('stats-modal-name').textContent = habit.name;
        document.getElementById('stats-modal-category').textContent = `${habit.category} • Created ${new Date(habit.createdAt).toLocaleDateString()}`;

        document.getElementById('stats-modal-current-streak').textContent = `🔥 ${stats.currentStreak}d`;
        document.getElementById('stats-modal-longest-streak').textContent = `🏆 ${stats.longestStreak}d`;
        document.getElementById('stats-modal-weekly-rate').textContent = `${stats.weeklyRate}%`;
        document.getElementById('stats-modal-monthly-rate').textContent = `${stats.monthlyRate}%`;

        document.getElementById('stats-modal-frequency').textContent = this.model.getFrequencyLabel(habit);
        document.getElementById('stats-modal-total-checks').textContent = `${stats.totalCompleted} times`;
        document.getElementById('stats-modal-reminder').textContent = habit.enableReminder ? `🔔 ${habit.reminderTime}` : 'Disabled';

        const archiveBtn = document.getElementById('btn-stats-archive');
        if (archiveBtn) {
            archiveBtn.textContent = habit.archived ? '📂 Unarchive' : '📦 Archive';
        }

        this.openModal('modal-habit-stats');
    }

    openDeleteConfirm(habit) {
        this.selectedHabitId = habit.id;
        document.getElementById('delete-habit-name').textContent = habit.name;
        this.openModal('modal-confirm-delete');
    }

    openSettingsModal() {
        this.sound.playTap();
        this.updateNotificationPermissionUI();
        this.openModal('modal-settings');
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('open');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('open');
        }
    }

    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 2600);
    }

    /**
     * Render the full dashboard, summary, and habit list
     */
    renderApp() {
        const allHabits = this.storage.getHabits();
        const activeHabits = allHabits.filter(h => !h.archived);
        const archivedHabits = allHabits.filter(h => h.archived);

        // Update Tab Counts
        document.getElementById('count-active').textContent = activeHabits.length;
        document.getElementById('count-archived').textContent = archivedHabits.length;

        // Render Today Summary Card
        this.renderSummary(activeHabits);

        // Render Habits Grid
        this.renderHabits();
    }

    renderSummary(activeHabits) {
        const today = new Date();
        const todayStr = this.model.formatDate(today);

        // Format Date string: e.g. "TODAY, AUG 8"
        const dateOptions = { month: 'short', day: 'numeric', weekday: 'short' };
        const dateLabel = today.toLocaleDateString('en-US', dateOptions).toUpperCase();
        document.getElementById('summary-date-display').textContent = dateLabel;

        // Scheduled habits for today
        const scheduledToday = activeHabits.filter(h => this.model.isScheduledDay(h, today));
        const completedToday = scheduledToday.filter(h => this.model.isCompleted(h.id, todayStr));

        const totalScheduled = scheduledToday.length;
        const totalDone = completedToday.length;
        const pct = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : 0;

        // Update Headline
        const headlineEl = document.getElementById('summary-headline');
        if (totalScheduled === 0) {
            headlineEl.textContent = 'No habits scheduled today';
        } else if (totalDone === totalScheduled) {
            headlineEl.textContent = '🎉 All Habits Done Today!';
        } else {
            headlineEl.textContent = `${totalDone} of ${totalScheduled} Completed`;
        }

        // Circular progress ring animation (Circumference = 201)
        const circle = document.getElementById('summary-ring-circle');
        const pctEl = document.getElementById('summary-ring-percentage');
        if (circle && pctEl) {
            const offset = 201 - (201 * (pct / 100));
            circle.style.strokeDashoffset = offset;
            pctEl.textContent = `${pct}%`;
        }

        // Random Daily Quote
        const quoteObj = MOTIVATIONAL_QUOTES[today.getDate() % MOTIVATIONAL_QUOTES.length];
        document.getElementById('summary-quote-text').textContent = `"${quoteObj.quote}" — ${quoteObj.author}`;
    }

    renderHabits() {
        const container = document.getElementById('habits-container');
        if (!container) return;

        const allHabits = this.storage.getHabits();
        let filteredHabits = allHabits.filter(h => {
            if (this.activeFilter === 'active' && h.archived) return false;
            if (this.activeFilter === 'archived' && !h.archived) return false;
            if (this.categoryFilter !== 'all' && h.category !== this.categoryFilter) return false;
            return true;
        });

        if (filteredHabits.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">${this.activeFilter === 'archived' ? '📦' : '🌱'}</div>
                    <h3 class="empty-state-title">${this.activeFilter === 'archived' ? 'No archived habits' : 'No habits found'}</h3>
                    <p class="empty-state-text">${this.activeFilter === 'archived' ? 'Habits you archive will appear here for safe keeping.' : 'Start building consistent daily routines today!'}</p>
                    ${this.activeFilter === 'active' ? `<button class="btn btn-primary" id="empty-state-add-btn">+ Add Your First Habit</button>` : ''}
                </div>
            `;
            document.getElementById('empty-state-add-btn')?.addEventListener('click', () => {
                this.openHabitForm();
            });
            return;
        }

        const daysCount = this.settings.gridDaysView || 30;
        const daysRange = this.model.getDaysRange(daysCount);
        const todayStr = this.model.formatDate(new Date());

        container.innerHTML = filteredHabits.map(habit => {
            const checkins = this.storage.getCheckins(habit.id);
            const stats = this.model.calculateStats(habit, checkins);
            const isTodayCompleted = stats.isTodayDone;
            const isTodayTarget = stats.isTodayScheduled;
            const freqText = this.model.getFrequencyLabel(habit);

            return `
                <article class="habit-card ${habit.archived ? 'archived' : ''}" 
                         id="habit-card-${habit.id}"
                         style="--habit-color: ${habit.color}; --habit-glow: ${habit.color}55;">
                    
                    <!-- Header -->
                    <div class="habit-header">
                        <div class="habit-info-group" onclick="window.habitApp.openHabitStatsModal('${habit.id}')" style="cursor: pointer;">
                            <div class="habit-emoji-badge" style="background-color: ${habit.color}22; color: ${habit.color};">
                                ${habit.emoji || '💧'}
                            </div>
                            <div class="habit-title-container">
                                <h3 class="habit-name">${this.escapeHtml(habit.name)}</h3>
                                <div class="habit-tags">
                                    <span class="habit-tag">${habit.category}</span>
                                    <span class="habit-tag">${freqText}</span>
                                    ${habit.enableReminder && habit.reminderTime ? `<span class="habit-tag reminder-active">🔔 ${habit.reminderTime}</span>` : ''}
                                </div>
                            </div>
                        </div>

                        <!-- Streak Flame Badge -->
                        <div class="streak-badge ${stats.currentStreak > 0 ? 'active-streak' : ''}" title="Current Streak: ${stats.currentStreak} consecutive days">
                            <span class="streak-flame-icon">🔥</span>
                            <span>${stats.currentStreak}</span>
                        </div>

                        <!-- More Menu -->
                        <button class="habit-actions-menu-btn" onclick="window.habitApp.openHabitStatsModal('${habit.id}')" title="Habit Details">
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="1.5"></circle>
                                <circle cx="12" cy="5" r="1.5"></circle>
                                <circle cx="12" cy="19" r="1.5"></circle>
                            </svg>
                        </button>
                    </div>

                    <!-- Quick Today Check Button -->
                    <div class="habit-action-row">
                        <button class="today-check-btn ${isTodayCompleted ? 'checked' : ''}" 
                                onclick="window.habitApp.toggleTodayHabit('${habit.id}', this)"
                                aria-label="Toggle today check-off">
                            <span class="check-icon">${isTodayCompleted ? '✓ Completed Today' : (isTodayTarget ? '○ Check In Today' : '○ Rest Day (Check In anyway)')}</span>
                        </button>
                    </div>

                    <!-- GitHub Style Contribution Grid -->
                    <div class="contribution-grid-container">
                        <div class="contribution-grid-scroll" id="grid-scroll-${habit.id}">
                            <div class="grid-columns-wrapper">
                                ${daysRange.map(dateObj => {
                                    const dateStr = this.model.formatDate(dateObj);
                                    const isCompleted = this.model.isCompleted(habit.id, dateStr, checkins);
                                    const isScheduled = this.model.isScheduledDay(habit, dateObj);
                                    const isToday = dateStr === todayStr;

                                    let cellClasses = 'grid-day-cell';
                                    if (isCompleted) cellClasses += ' completed';
                                    if (isToday) cellClasses += ' today-cell';
                                    if (!isScheduled && !isCompleted) cellClasses += ' rest-day';

                                    const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getDay()];

                                    return `
                                        <div class="grid-day-col">
                                            <span class="grid-day-header">${dayName}</span>
                                            <div class="${cellClasses}" 
                                                 data-habit-id="${habit.id}"
                                                 data-date="${dateStr}"
                                                 data-completed="${isCompleted}"
                                                 data-scheduled="${isScheduled}"
                                                 data-name="${this.escapeHtml(habit.name)}"
                                                 onmouseenter="window.habitApp.showTooltip(event, this)"
                                                 onmouseleave="window.habitApp.hideTooltip()"
                                                 onclick="window.habitApp.toggleDayCell('${habit.id}', '${dateStr}', this)">
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Footer Statistics -->
                    <div class="habit-footer-stats">
                        <div class="stat-item" title="Last 7 days completion rate">
                            <span>Week:</span> <strong>${stats.weeklyRate}%</strong>
                        </div>
                        <div class="stat-item" title="Last 30 days completion rate">
                            <span>Month:</span> <strong>${stats.monthlyRate}%</strong>
                        </div>
                        <div class="stat-item" title="All-time longest consecutive streak">
                            <span>Best:</span> <strong>🏆 ${stats.longestStreak}d</strong>
                        </div>
                        <div class="stat-item" title="Total lifetime check-ins">
                            <span>Total:</span> <strong>${stats.totalCompleted}</strong>
                        </div>
                    </div>
                </article>
            `;
        }).join('');

        // Auto-scroll all contribution grids to the latest day (right side)
        setTimeout(() => {
            filteredHabits.forEach(habit => {
                const scrollEl = document.getElementById(`grid-scroll-${habit.id}`);
                if (scrollEl) {
                    scrollEl.scrollLeft = scrollEl.scrollWidth;
                }
            });
        }, 50);
    }

    showTooltip(e, cell) {
        const tooltip = document.getElementById('app-grid-tooltip');
        if (!tooltip) return;

        const dateStr = cell.dataset.date;
        const isCompleted = cell.dataset.completed === 'true';
        const isScheduled = cell.dataset.scheduled === 'true';

        const [y, m, d] = dateStr.split('-');
        const dateObj = new Date(y, m - 1, d);
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });

        let statusText = isCompleted ? '✅ Done' : (isScheduled ? '❌ Missed / Pending' : '☕ Rest Day');
        tooltip.innerHTML = `<strong>${formattedDate}</strong>: ${statusText}`;

        const rect = cell.getBoundingClientRect();
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.classList.add('visible');
    }

    hideTooltip() {
        const tooltip = document.getElementById('app-grid-tooltip');
        if (tooltip) {
            tooltip.classList.remove('visible');
        }
    }

    /**
     * Reminder Notification Worker
     */
    startReminderChecker() {
        setInterval(() => {
            const now = new Date();
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMinutes = String(now.getMinutes()).padStart(2, '0');
            const currentTimeStr = `${currentHours}:${currentMinutes}`;
            const todayStr = this.model.formatDate(now);

            const habits = this.storage.getHabits();
            habits.forEach(habit => {
                if (!habit.archived && habit.enableReminder && habit.reminderTime === currentTimeStr) {
                    // Check if habit is scheduled today and not yet completed
                    if (this.model.isScheduledDay(habit, now) && !this.model.isCompleted(habit.id, todayStr)) {
                        this.triggerReminderNotification(habit);
                    }
                }
            });
        }, 60000); // Check once per minute
    }

    requestNotificationPermission() {
        if (!("Notification" in window)) {
            this.showToast('⚠️ Notifications not supported on this browser');
            return;
        }

        Notification.requestPermission().then(permission => {
            this.updateNotificationPermissionUI();
            if (permission === 'granted') {
                this.sound.playCheck();
                this.showToast('🔔 Notifications enabled!');
                new Notification('HabitFlow Reminders Active', {
                    body: 'You will receive reminders when it is time to check off your habits!',
                    icon: '🔥'
                });
            } else {
                this.showToast('Notifications permission not granted');
            }
        });
    }

    updateNotificationPermissionUI() {
        const badge = document.getElementById('notification-perm-badge');
        if (!badge) return;

        if (!("Notification" in window)) {
            badge.textContent = 'Unsupported';
            badge.style.color = '#ef4444';
        } else if (Notification.permission === 'granted') {
            badge.textContent = 'Active';
            badge.style.color = '#10b981';
        } else if (Notification.permission === 'denied') {
            badge.textContent = 'Blocked';
            badge.style.color = '#ef4444';
        } else {
            badge.textContent = 'Request';
            badge.style.color = '#f59e0b';
        }
    }

    triggerReminderNotification(habit) {
        this.showToast(`⏰ Reminder: Time for ${habit.emoji} ${habit.name}!`);
        if ("Notification" in window && Notification.permission === 'granted') {
            new Notification(`${habit.emoji} ${habit.name}`, {
                body: `Keep your streak burning! Tap to check in today.`,
                icon: '🔥'
            });
        }
    }

    exportBackupJSON() {
        const json = this.storage.exportAllData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `habitflow_backup_${this.model.formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('📥 Backup JSON downloaded');
    }

    handleFileImport(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const res = this.storage.importData(content);
            if (res.success) {
                this.sound.playFanfare();
                this.showToast(`🎉 Restored ${res.count} habits successfully!`);
                this.closeModal('modal-settings');
                this.renderApp();
            } else {
                this.showToast(`❌ Import failed: ${res.error}`);
            }
        };
        reader.readAsText(file);
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// Instantiate and attach to window
window.addEventListener('DOMContentLoaded', () => {
    window.habitApp = new HabitApp();
});
