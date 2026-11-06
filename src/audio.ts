const MENU_BGM_URL = "https://res.cloudinary.com/zk5g8xpx/video/upload/v1784694822/Moon_Sigil_Menu_odt2eu.mp3";
const BATTLE_BGM_URL = "https://res.cloudinary.com/zk5g8xpx/video/upload/v1784694873/Iron_Oath_Clash_qwttfx.mp3";

export class SoundEffects {
  private ctx: AudioContext | null = null;

  // Music & SFX state
  public musicVolume: number = 0.5; // 0.0 to 1.0
  public sfxVolume: number = 0.7;   // 0.0 to 1.0
  public musicMuted: boolean = false;
  public sfxMuted: boolean = false;
  public muted: boolean = false;    // legacy general mute

  private menuBgm: HTMLAudioElement | null = null;
  private battleBgm: HTMLAudioElement | null = null;
  public currentBgmTrack: 'menu' | 'battle' | 'none' = 'none';
  private userGestureOccurred: boolean = false;

  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.menuBgm = new Audio(MENU_BGM_URL);
        this.menuBgm.loop = true;
        this.menuBgm.volume = this.getEffectiveMusicVolume();

        this.battleBgm = new Audio(BATTLE_BGM_URL);
        this.battleBgm.loop = true;
        this.battleBgm.volume = this.getEffectiveMusicVolume();
      } catch (e) {
        console.warn("Failed to instantiate Audio tracks:", e);
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public handleUserInteraction() {
    this.userGestureOccurred = true;
    this.init();
    if (this.currentBgmTrack !== 'none') {
      this.playBgm(this.currentBgmTrack);
    }
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      // @ts-ignore
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public isMasterMuted(): boolean {
    return this.musicMuted && (this.sfxMuted || this.muted);
  }

  public toggleMasterMute() {
    const nextMute = !this.isMasterMuted();
    this.musicMuted = nextMute;
    this.sfxMuted = nextMute;
    this.muted = nextMute;
    const eff = this.getEffectiveMusicVolume();
    if (this.menuBgm) this.menuBgm.volume = eff;
    if (this.battleBgm) this.battleBgm.volume = eff;
    this.notify();
  }

  private getEffectiveMusicVolume(): number {
    if (this.musicMuted || this.muted) return 0;
    return Math.max(0, Math.min(1, this.musicVolume));
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    const eff = this.getEffectiveMusicVolume();
    if (this.menuBgm) this.menuBgm.volume = eff;
    if (this.battleBgm) this.battleBgm.volume = eff;
    this.notify();
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.notify();
  }

  public setMusicMuted(muted: boolean) {
    this.musicMuted = muted;
    const eff = this.getEffectiveMusicVolume();
    if (this.menuBgm) this.menuBgm.volume = eff;
    if (this.battleBgm) this.battleBgm.volume = eff;
    this.notify();
  }

  public setSfxMuted(muted: boolean) {
    this.sfxMuted = muted;
    this.muted = muted;
    this.notify();
  }

  public toggleMusicMute() {
    this.setMusicMuted(!this.musicMuted);
  }

  public toggleSfxMute() {
    this.setSfxMuted(!this.sfxMuted);
  }

  public playBgm(track: 'menu' | 'battle' | 'none') {
    this.currentBgmTrack = track;

    // Cleanly pause and reset previous tracks before playing new track
    if (track !== 'menu' && this.menuBgm) {
      this.menuBgm.pause();
      this.menuBgm.currentTime = 0;
    }
    if (track !== 'battle' && this.battleBgm) {
      this.battleBgm.pause();
      this.battleBgm.currentTime = 0;
    }

    if (!this.userGestureOccurred) {
      this.notify();
      return;
    }

    this.init();

    if (track === 'menu' && this.menuBgm) {
      this.menuBgm.volume = this.getEffectiveMusicVolume();
      this.menuBgm.play().catch((err) => {
        console.warn("Audio play prevented:", err);
      });
    } else if (track === 'battle' && this.battleBgm) {
      this.battleBgm.volume = this.getEffectiveMusicVolume();
      this.battleBgm.play().catch((err) => {
        console.warn("Audio play prevented:", err);
      });
    }
    this.notify();
  }

  public syncBgmForScreen(screenState: string) {
    if (screenState === 'ARENA') {
      if (this.currentBgmTrack !== 'battle') {
        this.playBgm('battle');
      }
    } else {
      if (this.currentBgmTrack !== 'menu') {
        this.playBgm('menu');
      }
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    if (this.sfxMuted || this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const effVol = volume * this.sfxVolume;
      if (effVol <= 0.0001) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(effVol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  }

  playDraw() {
    this.playTone(450, 'triangle', 0.12, 0.12);
    setTimeout(() => this.playTone(650, 'triangle', 0.12, 0.10), 40);
  }

  playTick() {
    this.playTone(800, 'sine', 0.04, 0.06);
  }

  playDeploy() {
    this.playTone(300, 'sine', 0.3, 0.15);
    this.playTone(450, 'triangle', 0.15, 0.06);
  }

  playAttack() {
    this.playTone(220, 'sawtooth', 0.2, 0.15);
  }

  playDirectHit() {
    this.playTone(100, 'sawtooth', 0.4, 0.25);
    this.playTone(150, 'sine', 0.4, 0.15);
  }

  playHeal() {
    this.playTone(523, 'sine', 0.15, 0.12);
    setTimeout(() => this.playTone(659, 'sine', 0.15, 0.12), 60);
  }

  playCast() {
    this.playTone(500, 'sine', 0.2, 0.08);
  }
}

export const sfx = new SoundEffects();
