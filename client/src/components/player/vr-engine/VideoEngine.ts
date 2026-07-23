import * as THREE from 'three';

export interface DetectedFormat {
  width: number;
  height: number;
  aspect: number;
  stereoMode: 'mono' | 'sbs' | 'ou';
  vrMode: 'vr180' | 'vr360' | 'flat' | 'cinema';
  fps: number;
}

export class VideoEngine {
  private video: HTMLVideoElement;
  private isRvfcSupported: boolean = false;
  private rvfcId: number | null = null;
  private onFrameCallback?: () => void;

  constructor(videoElement: HTMLVideoElement) {
    this.video = videoElement;
    this.isRvfcSupported = 'requestVideoFrameCallback' in this.video;
  }

  public detectFormat(fileName: string = '', fallbackVrMode: 'vr180' | 'vr360' = 'vr360'): DetectedFormat {
    const width = this.video.videoWidth || 1920;
    const height = this.video.videoHeight || 1080;
    const aspect = width / height;
    const nameLower = fileName.toLowerCase();

    let stereoMode: 'mono' | 'sbs' | 'ou' = 'mono';
    let vrMode: 'vr180' | 'vr360' | 'flat' | 'cinema' = 'flat';

    // --- Step 1: Detect VR projection mode (180 vs 360 vs Flat) ---
    if (nameLower.includes('360') || nameLower.includes('pano')) {
      vrMode = 'vr360';
    } else if (nameLower.includes('180') || nameLower.includes('dome') || nameLower.includes('fisheye')) {
      vrMode = 'vr180';
    } else {
      // Guess VR mode from aspect ratio
      if (Math.abs(aspect - 2.0) < 0.1) {
        // Standard 2:1 is either a 360° mono view or a 180° SBS (1:1 per eye) view
        vrMode = fallbackVrMode; 
      } else if (aspect > 2.2) {
        // Wider than 2.2 (e.g. 32:9) is typically a 180° SBS or 360° SBS view
        vrMode = fallbackVrMode;
      } else {
        vrMode = 'cinema'; // Normal flat screen video
      }
    }

    // --- Step 2: Detect Stereoscopic Layout (SBS vs Over-Under vs Mono) ---
    if (nameLower.includes('sbs') || nameLower.includes('lr') || nameLower.includes('sidebyside')) {
      stereoMode = 'sbs';
    } else if (nameLower.includes('ou') || nameLower.includes('tb') || nameLower.includes('overunder') || nameLower.includes('topbottom')) {
      stereoMode = 'ou';
    } else {
      // Auto-detect based on aspect ratios
      if (aspect > 2.2) {
        // Extremely wide (e.g. 32:9) is always Side-by-Side
        stereoMode = 'sbs';
      } else if (aspect < 0.95) {
        // Tall/square (e.g. 9:16 or 1:1) in a VR context is typically Over-Under (e.g. 1:1 OU or 4:3 OU)
        stereoMode = 'ou';
      } else if (Math.abs(aspect - 2.0) < 0.05) {
        // 2:1 ratio:
        // VR 360 Mono is 2:1.
        // VR 180 SBS (each eye 1:1) is also 2:1.
        if (vrMode === 'vr180') {
          stereoMode = 'sbs';
        } else {
          stereoMode = 'mono';
        }
      } else {
        stereoMode = 'mono';
      }
    }

    // Guess frame rate (default to 30)
    let fps = 30;
    if (nameLower.includes('60fps') || nameLower.includes('60p')) {
      fps = 60;
    } else if (nameLower.includes('90fps') || nameLower.includes('90p')) {
      fps = 90;
    } else if (nameLower.includes('120fps') || nameLower.includes('120p')) {
      fps = 120;
    }

    return { width, height, aspect, stereoMode, vrMode, fps };
  }

  public registerFrameCallback(onFrame: () => void): void {
    this.onFrameCallback = onFrame;
    if (this.isRvfcSupported) {
      const updateFrame = () => {
        if (this.onFrameCallback) this.onFrameCallback();
        this.rvfcId = this.video.requestVideoFrameCallback(updateFrame);
      };
      this.rvfcId = this.video.requestVideoFrameCallback(updateFrame);
    }
  }

  public unregisterFrameCallback(): void {
    if (this.isRvfcSupported && this.rvfcId !== null) {
      this.video.cancelVideoFrameCallback(this.rvfcId);
      this.rvfcId = null;
    }
    this.onFrameCallback = undefined;
  }

  // Playback wrapper methods
  public play(): Promise<void> {
    return this.video.play();
  }

  public pause(): void {
    this.video.pause();
  }

  public seek(seconds: number): void {
    this.video.currentTime = seconds;
  }

  public setVolume(volume: number): void {
    this.video.volume = THREE.MathUtils.clamp(volume, 0, 1);
  }

  public setPlaybackRate(rate: number): void {
    this.video.playbackRate = rate;
  }
}
