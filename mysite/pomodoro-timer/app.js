/**
 * POMODORO FOCUS TIMER - CORE LOGIC
 * High precision timer, Web Audio synthesizer, Screen Wake Lock API,
 * LocalStorage stats engine, SVG circular ring & dynamic 7-day bar chart.
 */

(() => {
  'use strict';

  /* ==========================================================================
     CONSTANTS & DEFAULT CONFIGURATION
     ========================================================================== */

  const DEFAULTS = {
    workDuration: 25,       // in minutes
    shortDuration: 5,       // in minutes
    longDuration: 15,       // in minutes
    cycleSessions: 4,       // sessions before long break
    autoBreaks: false,      // auto-start break when work finishes
    autoPomodoros: false,   // auto-start pomodoro when break finishes
    soundType: 'bell',      // 'bell' | 'marimba' | 'digital' | 'gong'
    soundVolume: 80,        // 0 - 100
    soundEnabled: true,     // boolean
    vibrate: true,          // mobile haptics
    notifications: false,   // desktop notifications
    wakeLock: true,         // keep-awake screen lock
    theme: 'dark'           // 'dark' | 'oled' | 'sunset' | 'forest'
  };

  const STORAGE_KEYS = {
    SETTINGS: 'pomofocus_settings_v1',
    STATS: 'pomofocus_daily_stats_v1',
    STATE: 'pomofocus_timer_state_v1'
  };

  const MODES = {
    WORK: 'work',
    SHORT_BREAK: 'shortBreak',
    LONG_BREAK: 'longBreak'
  };

  const RING_RADIUS = 140;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ~879.6459

  /* ==========================================================================
     AUDIO SYNTHESIZER (WEB AUDIO API)
     Zero external asset dependencies - 100% offline & instant playback
     ========================================================================== */

  class AudioManager {
    constructor() {
      this.ctx = null;
      this.enabled = true;
      this.volume = 0.8;
    }

    initContext() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    play(soundType = 'bell', customVol = null) {
      if (!this.enabled) return;
      this.initContext();
      if (!this.ctx) return;

      const vol = customVol !== null ? customVol / 100 : this.volume;
      if (vol <= 0) return;

      const now = this.ctx.currentTime;

      switch (soundType) {
        case 'marimba':
          this.playMarimba(now, vol);
          break;
        case 'digital':
          this.playDigital(now, vol);
          break;
        case 'gong':
          this.playGong(now, vol);
          break;
        case 'bell':
        default:
          this.playZenBell(now, vol);
          break;
      }
    }

    playZenBell(now, vol) {
      const freqs = [528, 1056, 1584]; // 528Hz Solfeggio Love frequency
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = (vol * (0.5 / (idx + 1)));
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(initialGain, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 2.6);
      });
    }

    playMarimba(now, vol) {
      const chord = [440, 554.37, 659.25, 880]; // A Major arpeggio
      chord.forEach((freq, i) => {
        const noteTime = now + (i * 0.1);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(vol * 0.4, noteTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.85);
      });
    }

    playDigital(now, vol) {
      for (let i = 0; i < 3; i++) {
        const noteTime = now + (i * 0.12);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880 + (i * 120), noteTime);

        gain.gain.setValueAtTime(0.001, noteTime);
        gain.gain.linearRampToValueAtTime(vol * 0.25, noteTime + 0.02);
        gain.gain.linearRampToValueAtTime(0.0001, noteTime + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(noteTime);
        osc.stop(noteTime + 0.1);
      }
    }

    playGong(now, vol) {
      const freqs = [220, 277.18, 330, 440];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        const initialGain = vol * (0.6 / (idx + 1));
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(initialGain, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 3.6);
      });
    }
  }

  /* ==========================================================================
     SCREEN WAKE LOCK API MANAGER
     Prevents mobile screen sleep during focus sessions
     ========================================================================== */

  class WakeLockManager {
    constructor(onStatusChange) {
      this.wakeLock = null;
      this.enabled = true;
      this.isSupported = 'wakeLock' in navigator;
      this.onStatusChange = onStatusChange;

      // Handle visibility changes (re-acquire lock when user returns to tab)
      document.addEventListener('visibilitychange', () => {
        if (this.wakeLock !== null && document.visibilityState === 'visible') {
          this.request();
        }
      });
    }

    async request() {
      if (!this.isSupported || !this.enabled) {
        this.updateStatus();
        return;
      }

      try {
        if (!this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
            this.updateStatus();
          });
        }
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
      this.updateStatus();
    }

    async release() {
      if (this.wakeLock) {
        try {
          await this.wakeLock.release();
        } catch (err) {
          console.warn('Wake Lock release failed:', err);
        }
        this.wakeLock = null;
      }
      this.updateStatus();
    }

    updateStatus() {
      if (this.onStatusChange) {
        this.onStatusChange({
          supported: this.isSupported,
          active: Boolean(this.wakeLock),
          enabled: this.enabled
        });
      }
    }
  }

  /* ==========================================================================
     STORAGE & STATS ENGINE
     Persists settings, daily completed counts, and computes 7-day volume
     ========================================================================== */

  class StorageManager {
    static getSettings() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
      } catch (e) {
        return { ...DEFAULTS };
      }
    }

    static saveSettings(settings) {
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
      }
    }

    static getStats() {
      try {
        const stored = localStorage.getItem(STORAGE_KEYS.STATS);
        return stored ? JSON.parse(stored) : {};
      } catch (e) {
        return {};
      }
    }

    static saveStats(stats) {
      try {
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
      } catch (e) {
        console.error('Failed to save stats to localStorage:', e);
      }
    }

    static recordCompletedSession(mode, durationMinutes) {
      if (mode !== MODES.WORK) return; // Only log productive focus sessions

      const dateKey = StorageManager.formatDateKey(new Date());
      const stats = StorageManager.getStats();

      if (!stats[dateKey]) {
        stats[dateKey] = {
          count: 0,
          minutes: 0
        };
      }

      stats[dateKey].count += 1;
      stats[dateKey].minutes += durationMinutes;

      StorageManager.saveStats(stats);
    }

    static formatDateKey(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    static getPast7Days() {
      const days = [];
      const stats = StorageManager.getStats();

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = StorageManager.formatDateKey(d);
        const dayRecord = stats[dateKey] || { count: 0, minutes: 0 };

        days.push({
          date: d,
          dateKey: dateKey,
          dayName: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
          count: dayRecord.count,
          minutes: dayRecord.minutes,
          isToday: i === 0
        });
      }

      return days;
    }

    static getKPIs() {
      const stats = StorageManager.getStats();
      const todayKey = StorageManager.formatDateKey(new Date());
      const todayRecord = stats[todayKey] || { count: 0, minutes: 0 };

      // Calculate this week count (past 7 days)
      const past7 = StorageManager.getPast7Days();
      const weekCount = past7.reduce((sum, d) => sum + d.count, 0);

      // Total focus minutes ever
      let totalMinutes = 0;
      Object.values(stats).forEach(val => {
        totalMinutes += val.minutes || 0;
      });

      // Calculate current active streak (consecutive days with count > 0)
      let streak = 0;
      const cur = new Date();
      while (true) {
        const k = StorageManager.formatDateKey(cur);
        if (stats[k] && stats[k].count > 0) {
          streak++;
          cur.setDate(cur.getDate() - 1);
        } else {
          // If today has 0 sessions yet, check if yesterday continued streak
          if (streak === 0) {
            cur.setDate(cur.getDate() - 1);
            const yk = StorageManager.formatDateKey(cur);
            if (stats[yk] && stats[yk].count > 0) {
              streak++;
              cur.setDate(cur.getDate() - 1);
              continue;
            }
          }
          break;
        }
      }

      return {
        todayCount: todayRecord.count,
        weekCount: weekCount,
        totalMinutes: totalMinutes,
        streakDays: streak
      };
    }
  }

  /* ==========================================================================
     MAIN POMODORO APPLICATION CONTROLLER
     ========================================================================== */

  class PomodoroApp {
    constructor() {
      this.settings = StorageManager.getSettings();
      this.audio = new AudioManager();
      this.wakeLock = new WakeLockManager(status => this.renderWakeLockStatus(status));

      // Timer runtime state
      this.mode = MODES.WORK;
      this.isRunning = false;
      this.totalSeconds = this.settings.workDuration * 60;
      this.remainingSeconds = this.totalSeconds;
      this.completedSessionsInCycle = 0; // 0 to settings.cycleSessions
      this.endTime = null;
      this.intervalId = null;

      // Cache DOM Elements
      this.initDomElements();

      // Setup audio and theme
      this.audio.enabled = this.settings.soundEnabled;
      this.audio.volume = this.settings.soundVolume / 100;
      this.wakeLock.enabled = this.settings.wakeLock;
      this.applyTheme(this.settings.theme);

      // Bind events
      this.bindEvents();

      // Initial render
      this.updateProgressRing();
      this.renderDisplay();
      this.renderCycleDots();
      this.renderStatsSummary();
      this.populateSettingsForm();
    }

    initDomElements() {
      // Buttons & Inputs
      this.dom = {
        appHeader: document.getElementById('app-header'),
        btnToggleSound: document.getElementById('btn-toggle-sound'),
        iconSoundOn: document.querySelector('.icon-sound-on'),
        iconSoundOff: document.querySelector('.icon-sound-off'),
        btnOpenStats: document.getElementById('btn-open-stats'),
        btnOpenSettings: document.getElementById('btn-open-settings'),
        
        modeTabs: {
          work: document.getElementById('mode-work'),
          shortBreak: document.getElementById('mode-shortBreak'),
          longBreak: document.getElementById('mode-longBreak')
        },

        progressStroke: document.getElementById('progress-stroke'),
        timerDisplay: document.getElementById('timer-display'),
        sessionBadge: document.getElementById('session-badge'),
        cycleTracker: document.getElementById('cycle-tracker'),
        
        btnAdd1m: document.getElementById('btn-add-1m'),
        btnAdd5m: document.getElementById('btn-add-5m'),
        btnReset: document.getElementById('btn-reset'),
        btnMainAction: document.getElementById('btn-main-action'),
        btnSkip: document.getElementById('btn-skip'),
        iconPlay: document.getElementById('icon-play'),
        iconPause: document.getElementById('icon-pause'),
        labelMainAction: document.getElementById('label-main-action'),

        wakeStatusDot: document.getElementById('wake-status-dot'),
        wakeTitle: document.getElementById('wake-title'),
        wakeDesc: document.getElementById('wake-desc'),
        btnToggleWakeLock: document.getElementById('btn-toggle-wakelock'),

        miniTodayCount: document.getElementById('mini-today-count'),
        miniWeekCount: document.getElementById('mini-week-count'),
        miniCycleCount: document.getElementById('mini-cycle-count'),

        // Stats Modal
        modalStats: document.getElementById('modal-stats'),
        btnCloseStats: document.getElementById('btn-close-stats'),
        kpiTodaySessions: document.getElementById('kpi-today-sessions'),
        kpiWeekSessions: document.getElementById('kpi-week-sessions'),
        kpiFocusHours: document.getElementById('kpi-focus-hours'),
        kpiStreakDays: document.getElementById('kpi-streak-days'),
        chartContainer: document.getElementById('chart-container'),
        btnExportStats: document.getElementById('btn-export-stats'),
        btnResetStats: document.getElementById('btn-reset-stats'),

        // Settings Modal
        modalSettings: document.getElementById('modal-settings'),
        btnCloseSettings: document.getElementById('btn-close-settings'),
        inputWorkDuration: document.getElementById('setting-work-duration'),
        inputShortDuration: document.getElementById('setting-short-duration'),
        inputLongDuration: document.getElementById('setting-long-duration'),
        inputCycleSessions: document.getElementById('setting-cycle-sessions'),
        inputAutoBreaks: document.getElementById('setting-auto-breaks'),
        inputAutoPomodoros: document.getElementById('setting-auto-pomodoros'),
        selectSoundType: document.getElementById('setting-sound-type'),
        sliderSoundVolume: document.getElementById('setting-sound-volume'),
        volumeValDisplay: document.getElementById('volume-val-display'),
        btnPreviewSound: document.getElementById('btn-preview-sound'),
        inputVibrate: document.getElementById('setting-vibrate'),
        inputNotifications: document.getElementById('setting-notifications'),
        inputWakeLock: document.getElementById('setting-wakelock'),
        themeOptions: document.querySelectorAll('.theme-option'),
        btnRestoreDefaults: document.getElementById('btn-restore-defaults'),
        btnSaveSettings: document.getElementById('btn-save-settings'),

        toast: document.getElementById('toast'),
        dynamicFavicon: document.getElementById('dynamic-favicon')
      };

      // Set initial stroke dasharray
      this.dom.progressStroke.style.strokeDasharray = RING_CIRCUMFERENCE;
      this.dom.progressStroke.style.strokeDashoffset = 0;
    }

    bindEvents() {
      // Mode selection
      Object.entries(this.dom.modeTabs).forEach(([modeKey, tabBtn]) => {
        tabBtn.addEventListener('click', () => {
          this.switchMode(modeKey, false);
        });
      });

      // Timer Controls
      this.dom.btnMainAction.addEventListener('click', () => this.toggleStartPause());
      this.dom.btnReset.addEventListener('click', () => this.resetTimer());
      this.dom.btnSkip.addEventListener('click', () => this.skipPhase());
      this.dom.btnAdd1m.addEventListener('click', () => this.addMinutes(1));
      this.dom.btnAdd5m.addEventListener('click', () => this.addMinutes(5));

      // Sound Toggle in Header
      this.dom.btnToggleSound.addEventListener('click', () => this.toggleSound());

      // Wake lock toggle link
      this.dom.btnToggleWakeLock.addEventListener('click', () => {
        this.settings.wakeLock = !this.settings.wakeLock;
        this.wakeLock.enabled = this.settings.wakeLock;
        StorageManager.saveSettings(this.settings);
        if (this.isRunning && this.settings.wakeLock) {
          this.wakeLock.request();
        } else {
          this.wakeLock.release();
        }
        this.dom.inputWakeLock.checked = this.settings.wakeLock;
        this.showToast(`Screen Keep-Awake ${this.settings.wakeLock ? 'Enabled' : 'Disabled'}`);
      });

      // Modals
      this.dom.btnOpenStats.addEventListener('click', () => this.openStatsModal());
      this.dom.btnCloseStats.addEventListener('click', () => this.closeStatsModal());
      this.dom.btnOpenSettings.addEventListener('click', () => this.openSettingsModal());
      this.dom.btnCloseSettings.addEventListener('click', () => this.closeSettingsModal());

      // Close modal when clicking backdrop
      [this.dom.modalStats, this.dom.modalSettings].forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeStatsModal();
            this.closeSettingsModal();
          }
        });
      });

      // Settings actions
      this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettingsFromForm());
      this.dom.btnRestoreDefaults.addEventListener('click', () => this.restoreDefaults());
      this.dom.btnPreviewSound.addEventListener('click', () => {
        const soundType = this.dom.selectSoundType.value;
        const volume = Number(this.dom.sliderSoundVolume.value);
        this.audio.play(soundType, volume);
      });
      this.dom.sliderSoundVolume.addEventListener('input', (e) => {
        this.dom.volumeValDisplay.textContent = `${e.target.value}%`;
      });

      // Theme picker in settings
      this.dom.themeOptions.forEach(opt => {
        opt.addEventListener('click', () => {
          const themeName = opt.getAttribute('data-theme-name');
          this.applyTheme(themeName);
          this.dom.themeOptions.forEach(o => o.classList.toggle('active', o === opt));
        });
      });

      // Notification permission request when toggled
      this.dom.inputNotifications.addEventListener('change', async (e) => {
        if (e.target.checked && 'Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            e.target.checked = false;
            this.showToast('Notification permission was not granted');
          }
        }
      });

      // Stats actions
      this.dom.btnExportStats.addEventListener('click', () => this.exportStatsJSON());
      this.dom.btnResetStats.addEventListener('click', () => this.resetStatsHistory());

      // Global Keyboard Shortcuts
      window.addEventListener('keydown', (e) => {
        // Ignore if user is typing in an input
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.code === 'Space') {
          e.preventDefault();
          this.toggleStartPause();
        } else if (e.key.toLowerCase() === 'r') {
          e.preventDefault();
          this.resetTimer();
        } else if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          this.skipPhase();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          this.toggleSound();
        } else if (e.key === 'Escape') {
          this.closeStatsModal();
          this.closeSettingsModal();
        }
      });
    }

    /* ==========================================================================
       TIMER ENGINE & LIFECYCLE
       ========================================================================== */

    getModeDuration(mode = this.mode) {
      switch (mode) {
        case MODES.WORK:
          return this.settings.workDuration * 60;
        case MODES.SHORT_BREAK:
          return this.settings.shortDuration * 60;
        case MODES.LONG_BREAK:
          return this.settings.longDuration * 60;
        default:
          return 25 * 60;
      }
    }

    switchMode(newMode, autoStart = false) {
      if (this.isRunning) {
        this.pauseTimer();
      }

      this.mode = newMode;
      this.totalSeconds = this.getModeDuration(newMode);
      this.remainingSeconds = this.totalSeconds;

      // Update mode styling token on root
      const root = document.documentElement;
      let gradientId = 'url(#ring-gradient-work)';
      let modeName = 'Focus Session';

      if (newMode === MODES.WORK) {
        root.style.setProperty('--current-mode-color', 'var(--accent-work)');
        root.style.setProperty('--current-mode-glow', 'var(--accent-work-glow)');
        gradientId = 'url(#ring-gradient-work)';
        modeName = 'Focus Session';
      } else if (newMode === MODES.SHORT_BREAK) {
        root.style.setProperty('--current-mode-color', 'var(--accent-short)');
        root.style.setProperty('--current-mode-glow', 'var(--accent-short-glow)');
        gradientId = 'url(#ring-gradient-short)';
        modeName = 'Short Break';
      } else if (newMode === MODES.LONG_BREAK) {
        root.style.setProperty('--current-mode-color', 'var(--accent-long)');
        root.style.setProperty('--current-mode-glow', 'var(--accent-long-glow)');
        gradientId = 'url(#ring-gradient-long)';
        modeName = 'Long Break';
      }

      this.dom.progressStroke.setAttribute('stroke', gradientId);
      this.dom.sessionBadge.textContent = modeName;

      // Update active tabs
      Object.entries(this.dom.modeTabs).forEach(([key, tab]) => {
        tab.classList.toggle('active', key === newMode);
      });

      this.updateProgressRing();
      this.renderDisplay();

      if (autoStart) {
        this.startTimer();
      }
    }

    toggleStartPause() {
      if (this.isRunning) {
        this.pauseTimer();
      } else {
        this.startTimer();
      }
    }

    startTimer() {
      this.isRunning = true;
      this.endTime = Date.now() + (this.remainingSeconds * 1000);

      // Acquire screen wake lock
      this.wakeLock.request();

      // UI state
      this.dom.iconPlay.style.display = 'none';
      this.dom.iconPause.style.display = 'block';
      this.dom.labelMainAction.textContent = 'PAUSE';

      // Clear any prior interval
      if (this.intervalId) clearInterval(this.intervalId);

      // High-precision tick with timestamp delta
      this.intervalId = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((this.endTime - now) / 1000);

        if (diff <= 0) {
          this.remainingSeconds = 0;
          this.updateProgressRing();
          this.renderDisplay();
          this.handleSessionComplete();
        } else {
          this.remainingSeconds = diff;
          this.updateProgressRing();
          this.renderDisplay();
        }
      }, 250);

      this.updateProgressRing();
      this.renderDisplay();
    }

    pauseTimer() {
      this.isRunning = false;
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      // Release screen wake lock
      this.wakeLock.release();

      // UI state
      this.dom.iconPlay.style.display = 'block';
      this.dom.iconPause.style.display = 'none';
      this.dom.labelMainAction.textContent = 'START';

      this.updateProgressRing();
      this.renderDisplay();
    }

    resetTimer() {
      this.pauseTimer();
      this.remainingSeconds = this.getModeDuration(this.mode);
      this.totalSeconds = this.remainingSeconds;
      this.updateProgressRing();
      this.renderDisplay();
      this.showToast('Timer reset');
    }

    skipPhase() {
      this.pauseTimer();
      this.advanceToNextPhase(false);
    }

    addMinutes(mins) {
      this.remainingSeconds += mins * 60;
      this.totalSeconds += mins * 60;
      if (this.isRunning) {
        this.endTime += (mins * 60 * 1000);
      }
      this.updateProgressRing();
      this.renderDisplay();
      this.showToast(`+${mins} min added`);
    }

    handleSessionComplete() {
      this.pauseTimer();

      // Trigger Audio Chime
      this.audio.play(this.settings.soundType);

      // Trigger Mobile Haptics (Vibration API)
      if (this.settings.vibrate && 'vibrate' in navigator) {
        try {
          navigator.vibrate([250, 100, 250, 100, 400]);
        } catch (e) {
          console.warn('Vibration failed:', e);
        }
      }

      // Trigger Desktop Notification if permitted & tab not focused
      this.triggerDesktopNotification();

      // Log statistics if completed work mode
      if (this.mode === MODES.WORK) {
        StorageManager.recordCompletedSession(this.mode, this.settings.workDuration);
        this.completedSessionsInCycle = (this.completedSessionsInCycle + 1) % this.settings.cycleSessions;
        this.renderStatsSummary();
        this.renderCycleDots();
        this.showToast('🍅 Focus session completed! Great job!');
      } else {
        this.showToast('☕ Break ended! Ready for another focus session?');
      }

      // Auto advance to next phase
      const shouldAutoStart = this.mode === MODES.WORK 
        ? this.settings.autoBreaks 
        : this.settings.autoPomodoros;

      this.advanceToNextPhase(shouldAutoStart);
    }

    advanceToNextPhase(autoStart = false) {
      if (this.mode === MODES.WORK) {
        if (this.completedSessionsInCycle === 0) {
          // Reached long break threshold
          this.switchMode(MODES.LONG_BREAK, autoStart);
        } else {
          this.switchMode(MODES.SHORT_BREAK, autoStart);
        }
      } else {
        // Break is over -> back to work
        this.switchMode(MODES.WORK, autoStart);
      }
    }

    triggerDesktopNotification() {
      if (this.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
        const title = this.mode === MODES.WORK ? '🍅 Focus Session Complete!' : '☕ Break Finished!';
        const body = this.mode === MODES.WORK ? 'Time for a well-deserved break.' : 'Ready to start your next focus session?';
        
        try {
          new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ff5e57"/><text y=".9em" x="50%" text-anchor="middle" font-size="60" fill="white">🍅</text></svg>'
          });
        } catch (e) {
          console.warn('Desktop notification failed:', e);
        }
      }
    }

    /* ==========================================================================
       RENDERING & UI UPDATES
       ========================================================================== */

    formatTime(totalSecs) {
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    renderDisplay() {
      const formatted = this.formatTime(this.remainingSeconds);
      this.dom.timerDisplay.textContent = formatted;

      // Update Tab Title
      const modeEmoji = this.mode === MODES.WORK ? '🍅' : '☕';
      const modeText = this.mode === MODES.WORK ? 'Focus' : 'Break';
      document.title = `(${formatted}) ${modeEmoji} ${modeText} | PomoFocus`;

      // Update Dynamic Favicon
      this.renderDynamicFavicon();
    }

    updateProgressRing() {
      if (this.totalSeconds <= 0) return;
      const progress = Math.max(0, Math.min(1, this.remainingSeconds / this.totalSeconds));
      // Offset: 0 is full circle, RING_CIRCUMFERENCE is empty
      const offset = RING_CIRCUMFERENCE * (1 - progress);
      this.dom.progressStroke.style.strokeDashoffset = offset;
    }

    renderCycleDots() {
      this.dom.cycleTracker.innerHTML = '';
      const totalRounds = this.settings.cycleSessions;

      for (let i = 0; i < totalRounds; i++) {
        const dot = document.createElement('div');
        dot.className = 'cycle-dot';
        if (i < this.completedSessionsInCycle) {
          dot.classList.add('completed');
        } else if (i === this.completedSessionsInCycle && this.mode === MODES.WORK) {
          dot.classList.add('active');
        }
        this.dom.cycleTracker.appendChild(dot);
      }

      this.dom.miniCycleCount.textContent = `${this.completedSessionsInCycle} / ${totalRounds}`;
    }

    renderStatsSummary() {
      const kpi = StorageManager.getKPIs();
      this.dom.miniTodayCount.textContent = `${kpi.todayCount} 🍅`;
      this.dom.miniWeekCount.textContent = `${kpi.weekCount} 🍅`;

      // In Stats Modal
      this.dom.kpiTodaySessions.textContent = kpi.todayCount;
      this.dom.kpiWeekSessions.textContent = kpi.weekCount;
      
      const hours = Math.floor(kpi.totalMinutes / 60);
      const mins = kpi.totalMinutes % 60;
      this.dom.kpiFocusHours.textContent = `${hours}h ${mins}m`;
      this.dom.kpiStreakDays.textContent = `${kpi.streakDays} ${kpi.streakDays === 1 ? 'day' : 'days'}`;
    }

    renderWakeLockStatus({ supported, active, enabled }) {
      if (!supported) {
        this.dom.wakeStatusDot.className = 'wake-status-dot unsupported';
        this.dom.wakeTitle.textContent = 'Keep-Awake: Unsupported on browser';
        this.dom.wakeDesc.innerHTML = 'Screen Wake Lock API is not supported in this browser. Keep your screen unlocked manually while focusing.';
        this.dom.btnToggleWakeLock.style.display = 'none';
      } else if (!enabled) {
        this.dom.wakeStatusDot.className = 'wake-status-dot inactive';
        this.dom.wakeTitle.textContent = 'Keep-Awake: Disabled in Settings';
        this.dom.wakeDesc.innerHTML = 'Screen may turn off according to your device timeout. Click Toggle to re-enable.';
        this.dom.btnToggleWakeLock.style.display = 'inline-block';
      } else if (active) {
        this.dom.wakeStatusDot.className = 'wake-status-dot';
        this.dom.wakeTitle.textContent = 'Screen Keep-Awake: Active ⚡';
        this.dom.wakeDesc.innerHTML = 'Screen will remain illuminated during this timer session.';
        this.dom.btnToggleWakeLock.style.display = 'inline-block';
      } else {
        this.dom.wakeStatusDot.className = 'wake-status-dot inactive';
        this.dom.wakeTitle.textContent = 'Screen Keep-Awake: Ready';
        this.dom.wakeDesc.innerHTML = 'Will activate automatically when the timer is started.';
        this.dom.btnToggleWakeLock.style.display = 'inline-block';
      }
    }

    renderDynamicFavicon() {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      const progress = this.totalSeconds > 0 ? this.remainingSeconds / this.totalSeconds : 1;
      const themeColor = this.mode === MODES.WORK ? '#ff5252' : '#00d2d3';

      // Background Circle
      ctx.beginPath();
      ctx.arc(32, 32, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#12141a';
      ctx.fill();

      // Progress Arc
      ctx.beginPath();
      ctx.arc(32, 32, 24, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * progress));
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Mini text or tomato emoji in center
      ctx.font = '28px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.mode === MODES.WORK ? '🍅' : '☕', 32, 34);

      this.dom.dynamicFavicon.href = canvas.toDataURL('image/png');
    }

    /* ==========================================================================
       SVG 7-DAY BAR CHART
       ========================================================================== */

    render7DayBarChart() {
      const days = StorageManager.getPast7Days();
      const maxCount = Math.max(5, ...days.map(d => d.count)); // At least 5 for nice scale

      const width = 480;
      const height = 180;
      const paddingX = 40;
      const paddingBottom = 30;
      const paddingTop = 25;
      const chartHeight = height - paddingBottom - paddingTop;
      const barWidth = 32;
      const spacing = (width - paddingX * 2) / 7;

      let barsSvg = '';

      // Grid lines
      const gridLevels = [0, Math.ceil(maxCount / 2), maxCount];
      let gridSvg = '';
      gridLevels.forEach(val => {
        const y = height - paddingBottom - (val / maxCount) * chartHeight;
        gridSvg += `
          <line x1="${paddingX - 10}" y1="${y}" x2="${width - 10}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3,3" stroke-width="1" />
          <text x="${paddingX - 16}" y="${y + 4}" fill="#64748b" font-size="10" text-anchor="end" font-family="JetBrains Mono">${val}</text>
        `;
      });

      days.forEach((day, idx) => {
        const x = paddingX + idx * spacing + (spacing - barWidth) / 2;
        const barH = (day.count / maxCount) * chartHeight;
        const y = height - paddingBottom - barH;
        const fillColor = day.isToday ? 'var(--current-mode-color)' : 'rgba(255, 255, 255, 0.25)';
        const countY = Math.min(y - 6, height - paddingBottom - 10);

        barsSvg += `
          <g class="bar-group" data-count="${day.count}" data-date="${day.dayName}">
            <rect 
              class="bar-rect"
              x="${x}" 
              y="${y}" 
              width="${barWidth}" 
              height="${Math.max(barH, 3)}" 
              rx="6" 
              fill="${fillColor}"
            >
              <title>${day.dayName}: ${day.count} completed pomodoro${day.count === 1 ? '' : 's'} (${day.minutes} min)</title>
            </rect>
            
            ${day.count > 0 ? `
              <text 
                x="${x + barWidth / 2}" 
                y="${countY}" 
                fill="${day.isToday ? 'var(--current-mode-color)' : '#94a3b8'}" 
                font-size="11" 
                font-weight="700"
                font-family="JetBrains Mono"
                text-anchor="middle"
              >${day.count}</text>
            ` : ''}

            <text 
              x="${x + barWidth / 2}" 
              y="${height - 10}" 
              fill="${day.isToday ? '#ffffff' : '#64748b'}" 
              font-size="11" 
              font-weight="${day.isToday ? '700' : '500'}"
              text-anchor="middle"
            >${day.dayName}</text>
          </g>
        `;
      });

      const svgMarkup = `
        <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
          ${gridSvg}
          ${barsSvg}
        </svg>
      `;

      this.dom.chartContainer.innerHTML = svgMarkup;
    }

    /* ==========================================================================
       MODALS & SETTINGS HANDLING
       ========================================================================== */

    openStatsModal() {
      this.renderStatsSummary();
      this.render7DayBarChart();
      this.dom.modalStats.classList.add('open');
      this.dom.modalStats.setAttribute('aria-hidden', 'false');
    }

    closeStatsModal() {
      this.dom.modalStats.classList.remove('open');
      this.dom.modalStats.setAttribute('aria-hidden', 'true');
    }

    openSettingsModal() {
      this.populateSettingsForm();
      this.dom.modalSettings.classList.add('open');
      this.dom.modalSettings.setAttribute('aria-hidden', 'false');
    }

    closeSettingsModal() {
      this.dom.modalSettings.classList.remove('open');
      this.dom.modalSettings.setAttribute('aria-hidden', 'true');
    }

    populateSettingsForm() {
      this.dom.inputWorkDuration.value = this.settings.workDuration;
      this.dom.inputShortDuration.value = this.settings.shortDuration;
      this.dom.inputLongDuration.value = this.settings.longDuration;
      this.dom.inputCycleSessions.value = this.settings.cycleSessions;
      this.dom.inputAutoBreaks.checked = this.settings.autoBreaks;
      this.dom.inputAutoPomodoros.checked = this.settings.autoPomodoros;
      this.dom.selectSoundType.value = this.settings.soundType;
      this.dom.sliderSoundVolume.value = this.settings.soundVolume;
      this.dom.volumeValDisplay.textContent = `${this.settings.soundVolume}%`;
      this.dom.inputVibrate.checked = this.settings.vibrate;
      this.dom.inputNotifications.checked = this.settings.notifications;
      this.dom.inputWakeLock.checked = this.settings.wakeLock;

      // Theme
      this.dom.themeOptions.forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-theme-name') === this.settings.theme);
      });

      // Sound button in header
      this.renderSoundButton();
    }

    saveSettingsFromForm() {
      const work = Math.max(1, Math.min(90, parseInt(this.dom.inputWorkDuration.value) || 25));
      const short = Math.max(1, Math.min(30, parseInt(this.dom.inputShortDuration.value) || 5));
      const long = Math.max(1, Math.min(60, parseInt(this.dom.inputLongDuration.value) || 15));
      const cycle = Math.max(1, Math.min(12, parseInt(this.dom.inputCycleSessions.value) || 4));

      this.settings.workDuration = work;
      this.settings.shortDuration = short;
      this.settings.longDuration = long;
      this.settings.cycleSessions = cycle;
      this.settings.autoBreaks = this.dom.inputAutoBreaks.checked;
      this.settings.autoPomodoros = this.dom.inputAutoPomodoros.checked;
      this.settings.soundType = this.dom.selectSoundType.value;
      this.settings.soundVolume = Number(this.dom.sliderSoundVolume.value);
      this.settings.vibrate = this.dom.inputVibrate.checked;
      this.settings.notifications = this.dom.inputNotifications.checked;
      this.settings.wakeLock = this.dom.inputWakeLock.checked;

      // Active theme
      const activeThemeBtn = document.querySelector('.theme-option.active');
      if (activeThemeBtn) {
        this.settings.theme = activeThemeBtn.getAttribute('data-theme-name');
      }

      StorageManager.saveSettings(this.settings);

      this.audio.enabled = this.settings.soundEnabled;
      this.audio.volume = this.settings.soundVolume / 100;
      this.wakeLock.enabled = this.settings.wakeLock;

      // If timer is not running, adjust display duration for current mode
      if (!this.isRunning) {
        this.totalSeconds = this.getModeDuration(this.mode);
        this.remainingSeconds = this.totalSeconds;
        this.updateProgressRing();
        this.renderDisplay();
      }

      this.renderCycleDots();
      this.closeSettingsModal();
      this.showToast('Settings saved successfully!');
    }

    restoreDefaults() {
      this.settings = { ...DEFAULTS };
      StorageManager.saveSettings(this.settings);
      this.populateSettingsForm();
      this.applyTheme(this.settings.theme);

      if (!this.isRunning) {
        this.totalSeconds = this.getModeDuration(this.mode);
        this.remainingSeconds = this.totalSeconds;
        this.updateProgressRing();
        this.renderDisplay();
      }

      this.renderCycleDots();
      this.showToast('Restored default settings');
    }

    toggleSound() {
      this.settings.soundEnabled = !this.settings.soundEnabled;
      this.audio.enabled = this.settings.soundEnabled;
      StorageManager.saveSettings(this.settings);
      this.renderSoundButton();
      this.showToast(`Sound ${this.settings.soundEnabled ? 'Unmuted 🔔' : 'Muted 🔕'}`);
    }

    renderSoundButton() {
      if (this.settings.soundEnabled) {
        this.dom.iconSoundOn.style.display = 'block';
        this.dom.iconSoundOff.style.display = 'none';
      } else {
        this.dom.iconSoundOn.style.display = 'none';
        this.dom.iconSoundOff.style.display = 'block';
      }
    }

    applyTheme(themeName) {
      document.documentElement.setAttribute('data-theme', themeName);
      this.settings.theme = themeName;
    }

    exportStatsJSON() {
      const stats = StorageManager.getStats();
      const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pomofocus_stats_${StorageManager.formatDateKey(new Date())}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.showToast('Stats data exported!');
    }

    resetStatsHistory() {
      if (confirm('Are you sure you want to reset all completed pomodoro history? This cannot be undone.')) {
        StorageManager.saveStats({});
        this.completedSessionsInCycle = 0;
        this.renderStatsSummary();
        this.render7DayBarChart();
        this.renderCycleDots();
        this.showToast('Stats history cleared.');
      }
    }

    showToast(message) {
      if (!this.dom.toast) return;
      this.dom.toast.textContent = message;
      this.dom.toast.classList.add('show');
      
      if (this.toastTimeout) clearTimeout(this.toastTimeout);
      this.toastTimeout = setTimeout(() => {
        this.dom.toast.classList.remove('show');
      }, 3000);
    }
  }

  /* Initialize the application when DOM is ready */
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new PomodoroApp();
  });
})();
