/**
 * Sound Synthesizer using Web Audio API
 * Provides responsive haptic-like sound feedback without external asset dependencies
 */

class SoundEffects {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    getAudioContext() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Satisfying pop/click sound on button tap
     */
    playTap() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.04);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    /**
     * Crispy positive chime when checking off a habit
     */
    playCheck() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        
        // Two pleasant harmonious tones (E5 -> B5)
        const notes = [659.25, 987.77];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.07);

            gain.gain.setValueAtTime(0.12, now + i * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.18);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + i * 0.07);
            osc.stop(now + i * 0.07 + 0.2);
        });
    }

    /**
     * Uncheck subtle reverse soft tone
     */
    playUncheck() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.08);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    /**
     * Triumphant fanfare arpeggio on streak milestone hit!
     */
    playFanfare() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        // C Major upward chord (C5 -> E5 -> G5 -> C6)
        const chord = [523.25, 659.25, 783.99, 1046.50];

        chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            const startTime = now + idx * 0.1;
            const duration = idx === chord.length - 1 ? 0.6 : 0.25;

            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }
}

window.soundFx = new SoundEffects();
