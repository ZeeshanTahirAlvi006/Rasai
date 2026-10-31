// src/components/landing/cinema/SoundEngine.ts
// Web Audio API Synthesizer Engine for Rasai Atmospheric Cinema Journey.
// Zero external MP3/audio file dependencies - 100% synthetic, low-latency, and cross-browser.

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private droneGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneStopTimeout: any = null;
  private cachedNoiseBuffer: AudioBuffer | null = null;
  private listeners: Set<(muted: boolean) => void> = new Set();

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public subscribe(cb: (muted: boolean) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.isMuted));
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.initCtx();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopDrone();
    } else {
      this.startDrone();
      this.playRelayClick();
    }
    this.notify();
    return this.isMuted;
  }

  public startDrone() {
    if (this.isMuted || !this.ctx) return;
    if (this.droneStopTimeout) {
      clearTimeout(this.droneStopTimeout);
      this.droneStopTimeout = null;
    }
    try {
      if (this.droneGain) return; // already active

      const now = this.ctx.currentTime;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.setValueAtTime(0.001, now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.08, now + 2.5);

      this.droneFilter = this.ctx.createBiquadFilter();
      this.droneFilter.type = 'lowpass';
      this.droneFilter.frequency.setValueAtTime(85, now);
      this.droneFilter.Q.setValueAtTime(3.0, now);

      // Low sub-bass frequency drone (55Hz Root A1)
      this.droneOsc1 = this.ctx.createOscillator();
      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(55, now);

      // Detuned fifth (82.5Hz E2) for cinematic atmospheric tension
      this.droneOsc2 = this.ctx.createOscillator();
      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(82.4, now);

      this.droneOsc1.connect(this.droneFilter);
      this.droneOsc2.connect(this.droneFilter);
      this.droneFilter.connect(this.droneGain);
      this.droneGain.connect(this.ctx.destination);

      this.droneOsc1.start();
      this.droneOsc2.start();
    } catch {
      // AudioContext policy restrictions
    }
  }

  public stopDrone() {
    if (!this.ctx || !this.droneGain) return;
    if (this.droneStopTimeout) {
      clearTimeout(this.droneStopTimeout);
    }
    try {
      const now = this.ctx.currentTime;
      this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
      this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
      this.droneStopTimeout = setTimeout(() => {
        try {
          this.droneOsc1?.stop();
          this.droneOsc2?.stop();
          this.droneOsc1?.disconnect();
          this.droneOsc2?.disconnect();
          this.droneFilter?.disconnect();
          this.droneGain?.disconnect();
        } catch {}
        this.droneGain = null;
        this.droneFilter = null;
        this.droneOsc1 = null;
        this.droneOsc2 = null;
        this.droneStopTimeout = null;
      }, 900);
    } catch {
      this.droneGain = null;
      this.droneStopTimeout = null;
    }
  }

  // Mechanical switch / relay click
  public playRelayClick() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // Cinematic transit whoosh between horizontal chapters
  public playWhoosh() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.55;

      // Filtered white noise burst
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1800, now + dur * 0.4);
      filter.frequency.exponentialRampToValueAtTime(120, now + dur);
      filter.Q.setValueAtTime(2.5, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15, now + dur * 0.35);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + dur);
    } catch {}
  }

  // Resonant brass chime on success / completed state transition
  public playSuccessChime() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const freqs = [392, 587.33, 880]; // G4, D5, A5 chords
      freqs.forEach((f, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.06 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.85);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.9);
      });
    } catch {}
  }

  // Telemetry alert ping when fake scan is intercepted
  public playAlertPing() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1174.66, now); // D6
      osc.frequency.setValueAtTime(1396.91, now + 0.08); // F6

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  // Realistic synthetic tape dispenser pulling sound
  public playTapePull() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.45;
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin(i * 0.05);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(1100, now + dur);
      filter.Q.setValueAtTime(4.0, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + dur);
    } catch {}
  }

  // Muffled cardboard carton placement thud
  public playCartonThud() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  // =========================================================================
  // SCENE 2 AUDIO SYNTHESIS: MOTORBIKE ENGINE, WIND RUSH, RICKSHAW HORN
  // =========================================================================
  private engineGain: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  public startEngine(initialRPM: number = 0.3) {
    if (this.isMuted || !this.ctx) return;
    if (this.engineGain) return; // already running

    try {
      const now = this.ctx.currentTime;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.001, now);
      this.engineGain.gain.exponentialRampToValueAtTime(0.12, now + 0.4);

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(320, now);

      // 4-stroke single cylinder base frequency (~30Hz to ~85Hz)
      const baseFreq = 32 + initialRPM * 48;
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(baseFreq, now);

      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineSubOsc.frequency.setValueAtTime(baseFreq * 0.5, now);

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc.start(now);
      this.engineSubOsc.start(now);
    } catch {}
  }

  public updateEngineRPM(rpmRatio: number) {
    if (this.isMuted || !this.ctx || !this.engineOsc || !this.engineFilter) return;
    try {
      const now = this.ctx.currentTime;
      const clamped = Math.max(0, Math.min(1, rpmRatio));
      const targetFreq = 30 + clamped * 58; // 30Hz idle to 88Hz full throttle
      this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
      if (this.engineSubOsc) {
        this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);
      }
      this.engineFilter.frequency.setTargetAtTime(280 + clamped * 420, now, 0.08);
    } catch {}
  }

  public stopEngine() {
    if (!this.ctx || !this.engineGain) return;
    try {
      const now = this.ctx.currentTime;
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
      this.engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      setTimeout(() => {
        try {
          this.engineOsc?.stop();
          this.engineSubOsc?.stop();
          this.engineOsc?.disconnect();
          this.engineSubOsc?.disconnect();
          this.engineFilter?.disconnect();
          this.engineGain?.disconnect();
        } catch {}
        this.engineGain = null;
        this.engineOsc = null;
        this.engineSubOsc = null;
        this.engineFilter = null;
      }, 400);
    } catch {
      this.engineGain = null;
    }
  }

  // Dual-tone auto-rickshaw vintage horn chirp
  public playRickshawHorn() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.22;

      [920, 1150].forEach((freq) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 1.02, now + dur);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + dur);
      });
    } catch {}
  }

  // Dynamic wind rush based on velocity (reuses pre-allocated noise buffer)
  public playWindRush(intensity: number = 0.5) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const dur = 0.35;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);

      if (!this.cachedNoiseBuffer || this.cachedNoiseBuffer.length !== bufferSize) {
        this.cachedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.cachedNoiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = this.cachedNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const centerFreq = 400 + intensity * 600;
      filter.frequency.setValueAtTime(centerFreq, now);
      filter.Q.setValueAtTime(1.8, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(Math.min(0.08, 0.02 + intensity * 0.06), now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + dur);
    } catch {}
  }

  // Haptic smartphone vibration buzz for Scene 3 Phone Match Cut
  public playPhoneBuzz() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [0, 0.18].forEach((offset) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(135, now + offset);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, now + offset);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.11, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.14);
      });
    } catch {}
  }

  // Calm two-note glass chime when Rasai WhatsApp notification arrives on customer's phone
  public playWhatsAppChime() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [783.99, 1174.66]; // G5 -> D6
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.11);

        gain.gain.setValueAtTime(0.001, now + idx * 0.11);
        gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.11 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.11);
        osc.stop(now + idx * 0.11 + 0.48);
      });
    } catch {}
  }

  // Lifecycle disposal to prevent audio node and event listener memory leaks (B3-ML-05)
  public dispose() {
    this.stopDrone();
    if (this.droneStopTimeout) {
      clearTimeout(this.droneStopTimeout);
      this.droneStopTimeout = null;
    }
    this.listeners.clear();
    this.cachedNoiseBuffer = null;
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEngine = new SoundEngine();
