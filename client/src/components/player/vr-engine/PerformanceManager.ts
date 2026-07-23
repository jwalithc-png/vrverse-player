export interface PerformanceStats {
  fps: number;
  decodedFrames: number;
  droppedFrames: number;
  memoryUsage: number; // MB if performance.memory is available
}

export class PerformanceManager {
  private video?: HTMLVideoElement;
  
  // FPS calculation states
  private lastTime = performance.now();
  private frameCount = 0;
  private currentFps = 0;
  
  // History for averages
  private fpsHistory: number[] = [];
  private maxHistoryLen = 30;

  constructor(videoElement?: HTMLVideoElement) {
    this.video = videoElement;
  }

  public setVideo(videoElement: HTMLVideoElement): void {
    this.video = videoElement;
  }

  public tick(): void {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      // Add to history
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > this.maxHistoryLen) {
        this.fpsHistory.shift();
      }
    }
  }

  public getStats(): PerformanceStats {
    let decodedFrames = 0;
    let droppedFrames = 0;

    if (this.video && typeof (this.video as any).getVideoPlaybackQuality === 'function') {
      const quality = (this.video as any).getVideoPlaybackQuality();
      decodedFrames = quality.totalVideoFrames || 0;
      droppedFrames = quality.droppedVideoFrames || 0;
    }

    let memoryUsage = 0;
    if (typeof window !== 'undefined' && (performance as any).memory) {
      memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
    }

    return {
      fps: this.currentFps,
      decodedFrames,
      droppedFrames,
      memoryUsage
    };
  }

  /**
   * Evaluates if rendering performance is poor and recommends action.
   * Returns 'scale-down' if performance is consistently low, or 'ok' / 'scale-up'.
   */
  public getPerformanceRecommendation(): 'scale-down' | 'scale-up' | 'stable' {
    if (this.fpsHistory.length < 5) return 'stable';

    const recentFps = this.fpsHistory.slice(-5);
    const averageFps = recentFps.reduce((a, b) => a + b, 0) / recentFps.length;

    if (averageFps < 48) {
      return 'scale-down'; // Recommends dropping pixelRatio or quality
    } else if (averageFps > 58 && recentFps.every(fps => fps >= 55)) {
      return 'scale-up';   // Recommends raising quality
    }
    
    return 'stable';
  }
}
