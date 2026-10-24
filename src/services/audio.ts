/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorldTheme } from '../types/game';

const AUDIO_STORAGE_KEY = 'bouncy_quest_audio_settings_v2';

export interface AudioSettingsState {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

class SoundController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Independent Controls
  private musicEnabled: boolean = true;
  private sfxEnabled: boolean = true;
  private musicVolume: number = 0.5;
  private sfxVolume: number = 0.8;

  // Background Music Sequencing
  private musicTimer: number | null = null;
  private currentTheme: WorldTheme | null = null;
  private musicStep: number = 0;
  private isMusicPlaying: boolean = false;
  private isMuted: boolean = false;

  private initialized: boolean = false;

  constructor() {
    this.loadSettings();
    this.attachAutoUnlockListeners();
  }

  /**
   * Load audio preferences from localStorage
   */
  public loadSettings(): AudioSettingsState {
    try {
      const stored = localStorage.getItem(AUDIO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.musicEnabled === 'boolean') this.musicEnabled = parsed.musicEnabled;
        if (typeof parsed.sfxEnabled === 'boolean') this.sfxEnabled = parsed.sfxEnabled;
        if (typeof parsed.musicVolume === 'number') this.musicVolume = Math.max(0, Math.min(1, parsed.musicVolume));
        if (typeof parsed.sfxVolume === 'number') this.sfxVolume = Math.max(0, Math.min(1, parsed.sfxVolume));
      }
    } catch (e) {
      console.warn('Could not load audio settings from localStorage:', e);
    }
    return this.getSettings();
  }

  /**
   * Save audio preferences to localStorage
   */
  public saveSettings(): void {
    try {
      const state: AudioSettingsState = {
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
        musicVolume: this.musicVolume,
        sfxVolume: this.sfxVolume,
      };
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save audio settings to localStorage:', e);
    }
  }

  public getSettings(): AudioSettingsState {
    return {
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      musicVolume: this.musicVolume,
      sfxVolume: this.sfxVolume,
    };
  }

  /**
   * Auto-unlock Web Audio on first user gesture across mobile & desktop browsers
   */
  private attachAutoUnlockListeners(): void {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.musicEnabled && this.currentTheme && !this.isMusicPlaying) {
            this.startMusic(this.currentTheme);
          }
        }).catch(() => {});
      }
    };

    const events = ['pointerdown', 'touchstart', 'touchend', 'keydown', 'click'];
    events.forEach((evt) => {
      window.addEventListener(evt, unlockHandler, { once: false, passive: true });
    });
  }

  /**
   * Initialize AudioContext and master routing graph
   */
  public init(): void {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // Dedicated SFX channel
      this.sfxGain = this.ctx.createGain();
      const effectiveSfx = this.sfxEnabled ? this.sfxVolume : 0;
      this.sfxGain.gain.setValueAtTime(effectiveSfx, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Dedicated Music channel
      this.musicGain = this.ctx.createGain();
      const effectiveMusic = this.musicEnabled ? this.musicVolume : 0;
      this.musicGain.gain.setValueAtTime(effectiveMusic, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn('AudioContext failed to initialize:', e);
    }
  }

  /* ---------------- INDEPENDENT CONTROLS ---------------- */

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    this.updateMusicGain();
    this.saveSettings();

    if (!enabled) {
      // Immediately silence and stop scheduling
      this.stopMusic();
    } else {
      // Resume music if theme is set
      if (this.currentTheme && !this.isMusicPlaying) {
        this.startMusic(this.currentTheme);
      }
    }
  }

  public getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    this.updateSfxGain();
    this.saveSettings();
  }

  public getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setMusicVolume(vol: number): void {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.updateMusicGain();
    this.saveSettings();
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxVolume(vol: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    this.updateSfxGain();
    this.saveSettings();
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  private updateMusicGain(): void {
    if (this.musicGain && this.ctx) {
      const target = !this.isMuted && this.musicEnabled ? this.musicVolume : 0;
      this.musicGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.musicGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
  }

  private updateSfxGain(): void {
    if (this.sfxGain && this.ctx) {
      const target = !this.isMuted && this.sfxEnabled ? this.sfxVolume : 0;
      this.sfxGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  /* ---------------- SOUND EFFECTS (SFX) ---------------- */

  private initAndCheckSfx(): boolean {
    if (!this.sfxEnabled) return false;
    if (!this.initialized || !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return !!this.ctx && !this.isMuted && this.sfxEnabled;
  }

  public playJump(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.16);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playBounce(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.1);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playTrampoline(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.28);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playStarCollect(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    // Cheerful arpeggio: C5 -> E5 -> G5 -> C6
    const notes = [523.25, 659.25, 783.99, 1046.5];

    notes.forEach((freq, i) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);

      gain.gain.setValueAtTime(0.24, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  }

  public playCoin(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.06); // E6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playEnemyStomp(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    // Punchy square pitch drop followed by bounce pop
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.14);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.16);

    // Secondary celebratory pop
    const popOsc = this.ctx!.createOscillator();
    const popGain = this.ctx!.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(400, now + 0.05);
    popOsc.frequency.exponentialRampToValueAtTime(800, now + 0.18);

    popGain.gain.setValueAtTime(0.2, now + 0.05);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    popOsc.connect(popGain);
    popGain.connect(this.sfxGain!);

    popOsc.start(now + 0.05);
    popOsc.stop(now + 0.2);
  }

  public playHurt(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playDeath(): void {
    this.playHurt();
  }

  public playGameOver(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    // Sad descending minor progression: F4 -> Eb4 -> D4 -> C4
    const notes = [349.23, 311.13, 293.66, 261.63];

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.22);

      gain.gain.setValueAtTime(0.3, now + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.22 + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.22);
      osc.stop(now + idx * 0.22 + 0.45);
    });
  }

  public playCheckpoint(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const notes = [392.0, 523.25, 659.25, 783.99]; // G4, C5, E5, G5

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.28, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.32);
    });
  }

  public playPortal(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(950, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.38);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playVictory(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const chords = [
      [523.25, 659.25], // C5, E5
      [587.33, 698.46], // D5, F5
      [659.25, 783.99], // E5, G5
      [783.99, 1046.5], // G5, C6
    ];

    chords.forEach((chord, i) => {
      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.14);

        gain.gain.setValueAtTime(0.25, now + i * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain!);

        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.45);
      });
    });
  }

  public playSwitch(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(960, now + 0.05);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playKeyCollect(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const notes = [659.25, 880.0, 1318.5]; // E5, A5, E6

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  public playGateUnlock(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.28);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playBossHit(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.28);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playLaser(): void {
    if (!this.initAndCheckSfx()) return;
    const now = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  /* ---------------- PROCEDURAL ADVENTURE BACKGROUND MUSIC ---------------- */

  public startMusic(theme: WorldTheme): void {
    this.currentTheme = theme;
    if (!this.musicEnabled) {
      return;
    }
    if (this.currentTheme === theme && this.isMusicPlaying) {
      return;
    }

    this.stopMusic();
    this.isMusicPlaying = true;
    this.musicStep = 0;
    this.scheduleNextMusicBar();
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
    this.isMusicPlaying = false;
  }

  private scheduleNextMusicBar(): void {
    if (!this.isMusicPlaying || !this.musicEnabled) return;

    this.playThemeStep(this.currentTheme || 'meadows', this.musicStep);
    this.musicStep = (this.musicStep + 1) % 16;

    const stepDurationMs = 170; // ~132 BPM adventure groove
    this.musicTimer = window.setTimeout(() => {
      this.scheduleNextMusicBar();
    }, stepDurationMs);
  }

  private playThemeStep(theme: WorldTheme, step: number): void {
    if (!this.musicEnabled || !this.initialized || !this.ctx || this.isMuted) {
      return;
    }

    const isBoss =
      theme.startsWith('boss') ||
      theme === 'boss_goliath' ||
      theme === 'boss_mecha' ||
      theme === 'boss_wyrm' ||
      theme === 'boss_cyber' ||
      theme === 'boss_void';

    // Scales based on environmental worlds
    let melodyScale: number[];
    let bassScale: number[];

    if (isBoss) {
      // Dramatic, intense minor battle theme
      melodyScale = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 440];
      bassScale = [55, 65.41, 73.42, 82.41];
    } else if (theme === 'ice' || theme === 'crystal' || theme === 'cosmic' || theme === 'lunar') {
      // Crystalline ethereal shimmer
      melodyScale = [329.63, 392.0, 440.0, 523.25, 659.25, 783.99];
      bassScale = [110, 130.81, 146.83, 164.81];
    } else if (theme === 'desert' || theme === 'magma' || theme === 'canyon' || theme === 'hazard') {
      // Exotic harmonic minor adventure
      melodyScale = [293.66, 311.13, 369.99, 392.0, 440.0, 466.16];
      bassScale = [73.42, 77.78, 92.5, 110.0];
    } else {
      // Uplifting, cheerful adventure (Meadows, Sky, Bounce, Ruins, Forest)
      melodyScale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
      bassScale = [65.41, 82.41, 98.0, 110.0];
    }

    const now = this.ctx.currentTime;

    // Rhythmic bass on beats 0, 4, 8, 12 + offbeat groove
    if (step % 4 === 0 || (step % 4 === 2 && (isBoss || theme === 'magma'))) {
      const bassIndex = (Math.floor(step / 4) + (isBoss ? step : 0)) % bassScale.length;
      const bassNote = bassScale[bassIndex];

      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = isBoss ? 'sawtooth' : 'triangle';
      bassOsc.frequency.setValueAtTime(bassNote, now);

      bassGain.gain.setValueAtTime(0.18, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain!);

      bassOsc.start(now);
      bassOsc.stop(now + 0.28);
    }

    // Melodic adventure lead
    const shouldPlayMelody = step % 2 === 0 || (step % 3 === 0 && !isBoss);
    if (shouldPlayMelody) {
      const noteIdx = (step * 3 + (isBoss ? 4 : 2)) % melodyScale.length;
      const noteFreq = melodyScale[noteIdx];

      const melOsc = this.ctx.createOscillator();
      const melGain = this.ctx.createGain();

      melOsc.type = theme === 'ice' || theme === 'crystal' ? 'sine' : 'square';
      melOsc.frequency.setValueAtTime(noteFreq, now);

      melGain.gain.setValueAtTime(0.065, now);
      melGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      melOsc.connect(melGain);
      melGain.connect(this.musicGain!);

      melOsc.start(now);
      melOsc.stop(now + 0.18);
    }

    // Soft rhythmic hi-hat click for adventure groove
    if (step % 2 === 1) {
      this.playRhythmicClick(now);
    }
  }

  private playRhythmicClick(time: number): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'highpass' as any; // fallback
      osc.frequency.setValueAtTime(1200, time);

      gain.gain.setValueAtTime(0.015, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

      osc.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      osc.stop(time + 0.04);
    } catch (e) {}
  }
}

export const SoundSystem = new SoundController();
