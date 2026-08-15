/**
 * Strong Password Generator - Logic & Cryptographic Security
 * Powered by Web Cryptography API (window.crypto)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const passwordDisplay = document.getElementById('passwordDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const generateBtn = document.getElementById('generateBtn');

    // Tabs
    const tabPassword = document.getElementById('tabPassword');
    const tabPassphrase = document.getElementById('tabPassphrase');
    const passwordControls = document.getElementById('passwordControls');

    // Controls
    const lengthInput = document.getElementById('lengthInput');
    const lengthValue = document.getElementById('lengthValue');
    const presetChips = document.querySelectorAll('.chip');

    const optUppercase = document.getElementById('optUppercase');
    const optLowercase = document.getElementById('optLowercase');
    const optNumbers = document.getElementById('optNumbers');
    const optSymbols = document.getElementById('optSymbols');
    const optAmbiguous = document.getElementById('optAmbiguous');

    // Strength Meter
    const strengthStatus = document.getElementById('strengthStatus');
    const strengthFill = document.getElementById('strengthFill');
    const crackTimeValue = document.getElementById('crackTimeValue');
    const entropyValue = document.getElementById('entropyValue');

    // History
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const toastContainer = document.getElementById('toastContainer');

    // App State
    let activeMode = 'password'; // 'password' or 'passphrase'
    let generatedHistory = JSON.parse(localStorage.getItem('pwd_gen_history') || '[]');

    // Character Sets
    const CHAR_SETS = {
        uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        lowercase: 'abcdefghijklmnopqrstuvwxyz',
        numbers: '0123456789',
        symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        ambiguous: /[O0l1Ii|\\/]/g
    };

    // Curated Wordlist for Passphrase Mode
    const WORDLIST = [
        'alpha', 'beacon', 'canyon', 'dragon', 'echo', 'falcon', 'galaxy', 'harbor',
        'island', 'jungle', 'knight', 'legend', 'matrix', 'nexus', 'orbit', 'phoenix',
        'quantum', 'river', 'shadow', 'timber', 'ultra', 'vortex', 'whisper', 'xenon',
        'yellow', 'zephyr', 'anchor', 'breeze', 'castle', 'desert', 'emerald', 'forest',
        'glacier', 'horizon', 'iceberg', 'journey', 'kingdom', 'lantern', 'meadow', 'nebula',
        'oasis', 'palace', 'quartz', 'radar', 'summit', 'thunder', 'universe', 'volcano'
    ];

    // Theme Toggle
    const currentTheme = localStorage.getItem('pwd_gen_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('pwd_gen_theme', theme);
        updateThemeIcon(theme);
    });

    function updateThemeIcon(theme) {
        themeToggleBtn.innerHTML = theme === 'dark'
            ? `<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3z"/></svg>`
            : `<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1z"/></svg>`;
    }

    // Cryptographically Secure Random Integer Generator
    function getSecureRandomInt(min, max) {
        const range = max - min + 1;
        const array = new Uint32Array(1);
        window.crypto.getRandomValues(array);
        return min + (array[0] % range);
    }

    // Mode Switcher
    tabPassword.addEventListener('click', () => setMode('password'));
    tabPassphrase.addEventListener('click', () => setMode('passphrase'));

    function setMode(mode) {
        activeMode = mode;
        if (mode === 'password') {
            tabPassword.classList.add('active');
            tabPassphrase.classList.remove('active');
            passwordControls.style.display = 'flex';
        } else {
            tabPassphrase.classList.add('active');
            tabPassword.classList.remove('active');
            passwordControls.style.display = 'none';
        }
        generatePassword();
    }

    // Length Slider & Presets Sync
    lengthInput.addEventListener('input', (e) => {
        const val = e.target.value;
        lengthValue.textContent = val;
        updateActivePresetChip(val);
        generatePassword();
    });

    presetChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const length = chip.getAttribute('data-length');
            lengthInput.value = length;
            lengthValue.textContent = length;
            updateActivePresetChip(length);
            generatePassword();
        });
    });

    function updateActivePresetChip(val) {
        presetChips.forEach(chip => {
            if (chip.getAttribute('data-length') === String(val)) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // Options Listeners
    [optUppercase, optLowercase, optNumbers, optSymbols, optAmbiguous].forEach(opt => {
        opt.addEventListener('change', () => {
            // Ensure at least one set is checked
            if (!optUppercase.checked && !optLowercase.checked && !optNumbers.checked && !optSymbols.checked) {
                optLowercase.checked = true;
                showToast('At least one character set must be selected');
            }
            generatePassword();
        });
    });

    // Generate Password Core Function
    function generatePassword() {
        let password = '';
        
        if (activeMode === 'passphrase') {
            const numWords = 4;
            const words = [];
            for (let i = 0; i < numWords; i++) {
                const idx = getSecureRandomInt(0, WORDLIST.length - 1);
                words.push(WORDLIST[idx]);
            }
            const randNumber = getSecureRandomInt(10, 99);
            password = words.join('-') + '-' + randNumber;
        } else {
            const length = parseInt(lengthInput.value, 10);
            let pool = '';
            const guaranteedChars = [];

            if (optUppercase.checked) {
                let set = CHAR_SETS.uppercase;
                if (optAmbiguous.checked) set = set.replace(CHAR_SETS.ambiguous, '');
                pool += set;
                guaranteedChars.push(set[getSecureRandomInt(0, set.length - 1)]);
            }
            if (optLowercase.checked) {
                let set = CHAR_SETS.lowercase;
                if (optAmbiguous.checked) set = set.replace(CHAR_SETS.ambiguous, '');
                pool += set;
                guaranteedChars.push(set[getSecureRandomInt(0, set.length - 1)]);
            }
            if (optNumbers.checked) {
                let set = CHAR_SETS.numbers;
                if (optAmbiguous.checked) set = set.replace(CHAR_SETS.ambiguous, '');
                pool += set;
                guaranteedChars.push(set[getSecureRandomInt(0, set.length - 1)]);
            }
            if (optSymbols.checked) {
                let set = CHAR_SETS.symbols;
                if (optAmbiguous.checked) set = set.replace(CHAR_SETS.ambiguous, '');
                pool += set;
                guaranteedChars.push(set[getSecureRandomInt(0, set.length - 1)]);
            }

            if (pool.length === 0) pool = CHAR_SETS.lowercase;

            const remainingLength = length - guaranteedChars.length;
            const randomChars = [];

            for (let i = 0; i < remainingLength; i++) {
                const randIndex = getSecureRandomInt(0, pool.length - 1);
                randomChars.push(pool[randIndex]);
            }

            // Combine and Shuffle guaranteed + random chars using Fisher-Yates
            const combined = [...guaranteedChars, ...randomChars];
            for (let i = combined.length - 1; i > 0; i--) {
                const j = getSecureRandomInt(0, i);
                [combined[i], combined[j]] = [combined[j], combined[i]];
            }

            password = combined.join('');
        }

        // Render Password
        passwordDisplay.textContent = password;
        passwordDisplay.classList.remove('placeholder');

        // Evaluate Strength
        evaluateStrength(password);

        // Add to history (debounced/capped)
        addToHistory(password);
    }

    // Evaluate Password Strength & Crack Time
    function evaluateStrength(pwd) {
        let poolSize = 0;
        if (/[a-z]/.test(pwd)) poolSize += 26;
        if (/[A-Z]/.test(pwd)) poolSize += 26;
        if (/[0-9]/.test(pwd)) poolSize += 10;
        if (/[^a-zA-Z0-9]/.test(pwd)) poolSize += 32;

        if (poolSize === 0) poolSize = 26;

        // Entropy in bits = length * log2(poolSize)
        const entropy = Math.round(pwd.length * Math.log2(poolSize));
        entropyValue.textContent = `${entropy} bits`;

        // Estimate Crack Time (Assuming 10 billion guesses/sec)
        const totalCombinations = Math.pow(poolSize, pwd.length);
        const secondsToCrack = totalCombinations / 1e10;
        crackTimeValue.textContent = formatTime(secondsToCrack);

        // Determine Strength Tier
        let score = 0; // 0 to 100
        let label = 'Very Weak';
        let color = 'var(--strength-very-weak)';

        if (entropy < 28) {
            score = 15;
            label = 'Very Weak';
            color = 'var(--strength-very-weak)';
        } else if (entropy < 45) {
            score = 35;
            label = 'Weak';
            color = 'var(--strength-weak)';
        } else if (entropy < 65) {
            score = 65;
            label = 'Medium';
            color = 'var(--strength-medium)';
        } else if (entropy < 90) {
            score = 85;
            label = 'Strong';
            color = 'var(--strength-strong)';
        } else {
            score = 100;
            label = 'Very Strong';
            color = 'var(--strength-very-strong)';
        }

        strengthStatus.textContent = label;
        strengthStatus.style.color = color;
        strengthFill.style.width = `${score}%`;
        strengthFill.style.backgroundColor = color;
    }

    function formatTime(seconds) {
        if (seconds < 1) return 'Instantly';
        if (seconds < 60) return `${Math.round(seconds)} seconds`;
        if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
        if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
        if (seconds < 3153600000) return `${Math.round(seconds / 31536000)} years`;
        return 'Centuries';
    }

    // Copy to Clipboard
    copyBtn.addEventListener('click', () => {
        const textToCopy = passwordDisplay.textContent;
        if (!textToCopy || passwordDisplay.classList.contains('placeholder')) return;

        navigator.clipboard.writeText(textToCopy).then(() => {
            showToast('Password copied to clipboard! 🚀');
        }).catch(() => {
            showToast('Failed to copy password.');
        });
    });

    refreshBtn.addEventListener('click', () => {
        generatePassword();
    });

    generateBtn.addEventListener('click', () => {
        generatePassword();
    });

    // Toast Notification
    function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> ${msg}`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // History Logic
    function addToHistory(pwd) {
        if (!pwd || generatedHistory.includes(pwd)) return;
        generatedHistory.unshift(pwd);
        if (generatedHistory.length > 5) generatedHistory.pop();
        localStorage.setItem('pwd_gen_history', JSON.stringify(generatedHistory));
        renderHistory();
    }

    function renderHistory() {
        if (generatedHistory.length === 0) {
            historyList.innerHTML = `<div class="history-empty">No generated history yet.</div>`;
            return;
        }

        historyList.innerHTML = generatedHistory.map(pwd => `
            <div class="history-item">
                <span class="history-item-pwd">${pwd}</span>
                <button class="history-item-copy" title="Copy" data-pwd="${pwd}">Copy</button>
            </div>
        `).join('');

        document.querySelectorAll('.history-item-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPwd = e.target.getAttribute('data-pwd');
                navigator.clipboard.writeText(targetPwd).then(() => {
                    showToast('History password copied!');
                });
            });
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        generatedHistory = [];
        localStorage.removeItem('pwd_gen_history');
        renderHistory();
        showToast('History cleared.');
    });

    // Initial Trigger
    renderHistory();
    generatePassword();
});
