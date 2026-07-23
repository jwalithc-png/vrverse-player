import * as THREE from 'three';

export class DeviceSensors {
  private isGyroActive: boolean = false;
  private onUpdateCallback?: () => void;
  
  // Orientation states
  private deviceQuaternion = new THREE.Quaternion();
  private recenterQuaternion = new THREE.Quaternion();
  private smoothedQuaternion = new THREE.Quaternion();
  private screenOrientation: number = 0;
  private lastEventTime: number = 0;
  private fallbackTimeout: any = null;
  
  // Smoothing factor (lower = smoother, but higher latency)
  private lerpFactor: number = 0.65;
  
  // Reference Euler / Quaternions for coordinate mapping
  private euler = new THREE.Euler();
  private q0 = new THREE.Quaternion();
  private q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X axis
  
  constructor() {
    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleScreenOrientation = this.handleScreenOrientation.bind(this);
  }

  public static async requestPermission(): Promise<boolean> {
    const DeviceReq = (window as any).DeviceOrientationEvent;
    if (DeviceReq && typeof DeviceReq.requestPermission === 'function') {
      try {
        const permissionState = await DeviceReq.requestPermission();
        return permissionState === 'granted';
      } catch (error) {
        console.error('Sensor permission request error:', error);
        return false;
      }
    }
    return true; // Auto-granted on desktop/non-iOS
  }

  public start(onUpdate: () => void): void {
    if (this.isGyroActive) return;
    this.onUpdateCallback = onUpdate;
    this.lastEventTime = 0;
    
    // Check if deviceorientationabsolute is supported in window
    const useAbsolute = 'ondeviceorientationabsolute' in window || (window as any).DeviceOrientationAbsoluteEvent !== undefined;
    
    if (useAbsolute) {
      window.addEventListener('deviceorientationabsolute', this.handleOrientation as any);
      
      // Fallback timer: if absolute event doesn't fire in 300ms, fall back to standard deviceorientation
      this.fallbackTimeout = window.setTimeout(() => {
        if (this.lastEventTime === 0 && this.isGyroActive) {
          console.warn('deviceorientationabsolute event did not fire. Falling back to standard deviceorientation.');
          window.removeEventListener('deviceorientationabsolute', this.handleOrientation as any);
          window.addEventListener('deviceorientation', this.handleOrientation);
        }
      }, 300);
    } else {
      window.addEventListener('deviceorientation', this.handleOrientation);
    }
    
    window.addEventListener('orientationchange', this.handleScreenOrientation);
    this.handleScreenOrientation();
    this.isGyroActive = true;
  }

  public stop(): void {
    if (!this.isGyroActive) return;
    
    if (this.fallbackTimeout) {
      window.clearTimeout(this.fallbackTimeout);
      this.fallbackTimeout = null;
    }
    
    window.removeEventListener('deviceorientationabsolute', this.handleOrientation as any);
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.removeEventListener('orientationchange', this.handleScreenOrientation);
    this.isGyroActive = false;
  }

  public setLerpFactor(factor: number) {
    this.lerpFactor = THREE.MathUtils.clamp(factor, 0.01, 1.0);
  }

  public recenter(): void {
    // Capture current device quaternion as the reference recenter quaternion
    this.recenterQuaternion.copy(this.deviceQuaternion).invert();
  }

  public getOrientation(outQuaternion: THREE.Quaternion): void {
    // Calculate final orientation: recenterOffset * deviceOrientation
    // Smooth the transition using slerp for low-pass filtering / motion smoothing
    const targetQuaternion = new THREE.Quaternion()
      .copy(this.recenterQuaternion)
      .multiply(this.deviceQuaternion);
      
    this.smoothedQuaternion.slerp(targetQuaternion, this.lerpFactor);
    outQuaternion.copy(this.smoothedQuaternion);
  }

  public getRawQuaternion(): THREE.Quaternion {
    return this.deviceQuaternion;
  }

  private handleOrientation(event: DeviceOrientationEvent): void {
    this.lastEventTime = performance.now();
    const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
    const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
    const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
    const orient = THREE.MathUtils.degToRad(this.screenOrientation);

    // Three.js uses YXZ Euler order to map DeviceOrientation to camera coordinates
    // Z-X'-Y'' orientation corresponds to beta, alpha, -gamma
    this.euler.set(beta, alpha, -gamma, 'YXZ');
    this.deviceQuaternion.setFromEuler(this.euler);

    // Rotate camera to face negative Z-axis (straight forward) instead of straight down (standard Three.js DeviceOrientationControls)
    this.deviceQuaternion.multiply(this.q1);

    // Adjust for landscape vs portrait screen rotation
    this.q0.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -orient);
    this.deviceQuaternion.multiply(this.q0);

    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  public isReceivingData(): boolean {
    return this.isGyroActive && this.lastEventTime > 0;
  }

  private handleScreenOrientation(): void {
    if (window.screen && (window.screen as any).orientation) {
      this.screenOrientation = (window.screen as any).orientation.angle || 0;
    } else {
      this.screenOrientation = (window as any).orientation || 0;
    }
  }
}
