// DOM Element References
document.addEventListener("DOMContentLoaded", () => {
    const numberToWords = window.numberToWords;

    const numberInput = document.getElementById("numberInput");
    const clearInputBtn = document.getElementById("clearInput");
    const systemSelect = document.getElementById("systemSelect");
    const currencySelect = document.getElementById("currencySelect");
    const casingSelect = document.getElementById("casingSelect");
    const chequeToggle = document.getElementById("chequeToggle");
    const resultWords = document.getElementById("resultWords");
    const formattedDigit = document.getElementById("formattedDigit");
    const systemBadge = document.getElementById("systemBadge");
    const copyBtn = document.getElementById("copyBtn");
    const speakBtn = document.getElementById("speakBtn");
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const themeText = document.getElementById("themeText");
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    const presetChips = document.querySelectorAll(".preset-chip");

    // Initialize Lucide Icons safely
    function refreshIcons() {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Convert Function
    function performConversion() {
        const rawVal = numberInput.value.trim();

        // Toggle clear button
        clearInputBtn.style.display = rawVal ? "block" : "none";

        if (!rawVal) {
            resultWords.style.color = "";
            resultWords.textContent = "Zero";
            formattedDigit.textContent = "Formatted: 0";
            return;
        }

        const options = {
            system: systemSelect.value,
            currency: currencySelect.value,
            casing: casingSelect.value,
            chequeFormat: chequeToggle.checked
        };

        if (typeof numberToWords !== 'function') {
            resultWords.textContent = "Engine error: numberToWords not loaded";
            return;
        }

        const res = numberToWords(rawVal, options);

        if (res.error) {
            resultWords.textContent = res.error;
            resultWords.style.color = "#f87171";
            formattedDigit.textContent = "";
        } else {
            resultWords.style.color = "";
            resultWords.textContent = res.words;
            formattedDigit.textContent = `Formatted: ${res.formattedNumber}`;
        }

        // Update Badge
        systemBadge.textContent = systemSelect.value === "indian" ? "Indian System" : "International System";
    }

    // Input Filter: restrict non-numeric chars except hyphen and dot
    numberInput.addEventListener("input", (e) => {
        let val = e.target.value;
        let sanitized = val.replace(/[^0-9.-]/g, "");
        
        if (sanitized.indexOf("-") > 0) {
            sanitized = sanitized.replace(/-/g, "");
        }
        
        const parts = sanitized.split(".");
        if (parts.length > 2) {
            sanitized = parts[0] + "." + parts.slice(1).join("");
        }

        if (val !== sanitized) {
            e.target.value = sanitized;
        }

        performConversion();
    });

    // Event Listeners for Control Selectors
    [systemSelect, currencySelect, casingSelect, chequeToggle].forEach(ctrl => {
        if (ctrl) ctrl.addEventListener("change", performConversion);
    });

    // Clear Button
    if (clearInputBtn) {
        clearInputBtn.addEventListener("click", () => {
            numberInput.value = "";
            performConversion();
            numberInput.focus();
        });
    }

    // Presets Click Handler
    presetChips.forEach(chip => {
        chip.addEventListener("click", () => {
            numberInput.value = chip.dataset.value;
            performConversion();
        });
    });

    // Copy to Clipboard
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const textToCopy = resultWords.textContent;
            if (!textToCopy || (textToCopy === "Zero" && !numberInput.value)) {
                showToast("Nothing to copy!");
                return;
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast("Copied to clipboard!");
            }).catch(() => {
                showToast("Failed to copy");
            });
        });
    }

    // Text to Speech (Audio Playback)
    if (speakBtn) {
        speakBtn.addEventListener("click", () => {
            const textToSpeak = resultWords.textContent;
            if (!textToSpeak || textToSpeak.includes("valid number")) return;

            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const utterance = new SpeechSynthesisUtterance(textToSpeak);
                utterance.rate = 0.9;
                utterance.pitch = 1;
                window.speechSynthesis.speak(utterance);

                showToast("Playing audio...");
            } else {
                showToast("Text-to-speech not supported on this browser.");
            }
        });
    }

    // Toast Notification Helper
    function showToast(msg) {
        if (!toast || !toastMsg) return;
        toastMsg.textContent = msg;
        toast.classList.add("show");
        setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }

    // Theme Switching
    let currentTheme = localStorage.getItem("numwords_theme") || "dark";
    applyTheme(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            currentTheme = currentTheme === "dark" ? "light" : "dark";
            localStorage.setItem("numwords_theme", currentTheme);
            applyTheme(currentTheme);
        });
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        if (themeIcon && themeText) {
            if (theme === "light") {
                themeIcon.setAttribute("data-lucide", "moon");
                themeText.textContent = "Dark Mode";
            } else {
                themeIcon.setAttribute("data-lucide", "sun");
                themeText.textContent = "Light Mode";
            }
        }
        refreshIcons();
    }

    // Initial Call
    refreshIcons();
    performConversion();
});