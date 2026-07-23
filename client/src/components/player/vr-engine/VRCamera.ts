import * as THREE from 'three';

export class VRCamera {
  private mainCamera: THREE.PerspectiveCamera;
  
  // Independent eye offsets and properties
  private ipd: number = 0.064; // Default Interpupillary Distance of 6.4cm
  private fov: number = 95;    // FOV between 90-100 degrees
  private near: number = 0.1;
  private far: number = 1000;

  constructor(fov: number = 95, aspect: number = 1.0, near: number = 0.1, far: number = 1000) {
    this.fov = fov;
    this.near = near;
    this.far = far;
    
    // Create the primary perspective camera
    this.mainCamera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.mainCamera;
  }

  public updateProjection(aspect: number): void {
    this.mainCamera.aspect = aspect;
    this.mainCamera.fov = this.fov;
    this.mainCamera.near = this.near;
    this.mainCamera.far = this.far;
    this.mainCamera.updateProjectionMatrix();
  }

  public setFov(fov: number): void {
    this.fov = THREE.MathUtils.clamp(fov, 30, 120);
    this.mainCamera.fov = this.fov;
    this.mainCamera.updateProjectionMatrix();
  }

  public getFov(): number {
    return this.fov;
  }

  public setIpd(ipd: number): void {
    this.ipd = THREE.MathUtils.clamp(ipd, 0.01, 0.15); // Clamp between 1cm and 15cm
  }

  public getIpd(): number {
    return this.ipd;
  }

  public setClippingPlanes(near: number, far: number): void {
    this.near = near;
    this.far = far;
    this.mainCamera.near = this.near;
    this.mainCamera.far = this.far;
    this.mainCamera.updateProjectionMatrix();
  }

  /**
   * Configures camera for Left Eye rendering.
   * Shifts camera left by half of IPD and enables Left Eye rendering layers.
   */
  public prepareLeftEye(eyeAspect: number): void {
    this.mainCamera.aspect = eyeAspect;
    this.mainCamera.position.x = -this.ipd / 2;
    this.mainCamera.updateProjectionMatrix();

    // Enable Layer 1 (Left Eye meshes) and Layer 0 (Mono fallback meshes)
    this.mainCamera.layers.disableAll();
    this.mainCamera.layers.enable(1);
    this.mainCamera.layers.enable(0);
  }

  /**
   * Configures camera for Right Eye rendering.
   * Shifts camera right by half of IPD and enables Right Eye rendering layers.
   */
  public prepareRightEye(eyeAspect: number): void {
    this.mainCamera.aspect = eyeAspect;
    this.mainCamera.position.x = this.ipd / 2;
    this.mainCamera.updateProjectionMatrix();

    // Enable Layer 2 (Right Eye meshes) and Layer 0 (Mono fallback meshes)
    this.mainCamera.layers.disableAll();
    this.mainCamera.layers.enable(2);
    this.mainCamera.layers.enable(0);
  }

  /**
   * Resets camera back to normal mono screen mode (zero offset, visible to layer 0 + 1).
   */
  public resetMono(aspect: number): void {
    this.mainCamera.aspect = aspect;
    this.mainCamera.position.x = 0;
    this.mainCamera.updateProjectionMatrix();

    this.mainCamera.layers.disableAll();
    this.mainCamera.layers.enable(0);
    this.mainCamera.layers.enable(1); // Enable Left layer too so SBS Left Eye works as mono preview
  }
}
