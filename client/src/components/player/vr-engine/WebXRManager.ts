import * as THREE from 'three';

export class WebXRManager {
  private xrSupported: boolean = false;
  private currentSession: any = null;

  public async checkSupport(): Promise<boolean> {
    if ('xr' in navigator) {
      try {
        const supported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        this.xrSupported = supported;
        return supported;
      } catch (e) {
        console.warn('WebXR support check failed:', e);
        this.xrSupported = false;
        return false;
      }
    }
    return false;
  }

  public isSupported(): boolean {
    return this.xrSupported;
  }

  public isPresenting(): boolean {
    return this.currentSession !== null;
  }

  public async startSession(
    renderer: THREE.WebGLRenderer,
    onSessionEnd: () => void
  ): Promise<any> {
    if (this.currentSession) return this.currentSession;

    try {
      const session = await (navigator as any).xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor']
      });

      renderer.xr.setSession(session);
      this.currentSession = session;

      // Event listener to configure sub-cameras layers for true stereoscopic separation in VR headsets
      const onSessionStart = () => {
        const xrCamera = renderer.xr.getCamera();
        if (xrCamera.cameras.length >= 2) {
          // Left Camera L
          xrCamera.cameras[0].layers.enable(1); // enable Left layer
          xrCamera.cameras[0].layers.disable(2); // disable Right layer
          
          // Right Camera R
          xrCamera.cameras[1].layers.enable(2); // enable Right layer
          xrCamera.cameras[1].layers.disable(1); // disable Left layer
        }
      };
      
      // Delay slightly or hook immediately when camera layout becomes available
      renderer.xr.addEventListener('sessionstart', onSessionStart);

      session.addEventListener('end', () => {
        this.currentSession = null;
        renderer.xr.removeEventListener('sessionstart', onSessionStart);
        onSessionEnd();
      });

      return session;
    } catch (err) {
      console.error('Failed to start WebXR session:', err);
      throw err;
    }
  }

  public async endSession(): Promise<void> {
    if (this.currentSession) {
      await this.currentSession.end();
      this.currentSession = null;
    }
  }
}
