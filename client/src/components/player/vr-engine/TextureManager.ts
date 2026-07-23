import * as THREE from 'three';

export class TextureManager {
  private textures: THREE.VideoTexture[] = [];

  /**
   * Creates or updates video textures for mono/stereoscopic rendering.
   * Returns left and right eye textures.
   */
  public createTextures(
    video: HTMLVideoElement,
    stereoMode: 'mono' | 'sbs' | 'ou',
    anisotropy: number = 4
  ): { leftTexture: THREE.VideoTexture; rightTexture: THREE.VideoTexture } {
    // Clean up existing textures
    this.disposeTextures();

    if (stereoMode === 'sbs') {
      // Left eye texture: maps to left half of video frame
      const leftTexture = new THREE.VideoTexture(video);
      leftTexture.colorSpace = THREE.SRGBColorSpace;
      leftTexture.minFilter = THREE.LinearFilter;
      leftTexture.magFilter = THREE.LinearFilter;
      leftTexture.repeat.set(0.5, 1);
      leftTexture.offset.set(0, 0);

      // Right eye texture: maps to right half of video frame
      const rightTexture = new THREE.VideoTexture(video);
      rightTexture.colorSpace = THREE.SRGBColorSpace;
      rightTexture.minFilter = THREE.LinearFilter;
      rightTexture.magFilter = THREE.LinearFilter;
      rightTexture.repeat.set(0.5, 1);
      rightTexture.offset.set(0.5, 0);

      // Enable anisotropic filtering if supported
      if (anisotropy > 1) {
        leftTexture.anisotropy = anisotropy;
        rightTexture.anisotropy = anisotropy;
      }

      this.textures.push(leftTexture, rightTexture);
      return { leftTexture, rightTexture };
    } else if (stereoMode === 'ou') {
      // Over-Under (top/bottom) split
      // Left eye texture: maps to top half of video frame
      const leftTexture = new THREE.VideoTexture(video);
      leftTexture.colorSpace = THREE.SRGBColorSpace;
      leftTexture.minFilter = THREE.LinearFilter;
      leftTexture.magFilter = THREE.LinearFilter;
      leftTexture.repeat.set(1, 0.5);
      leftTexture.offset.set(0, 0.5); // Top half

      // Right eye texture: maps to bottom half of video frame
      const rightTexture = new THREE.VideoTexture(video);
      rightTexture.colorSpace = THREE.SRGBColorSpace;
      rightTexture.minFilter = THREE.LinearFilter;
      rightTexture.magFilter = THREE.LinearFilter;
      rightTexture.repeat.set(1, 0.5);
      rightTexture.offset.set(0, 0); // Bottom half

      if (anisotropy > 1) {
        leftTexture.anisotropy = anisotropy;
        rightTexture.anisotropy = anisotropy;
      }

      this.textures.push(leftTexture, rightTexture);
      return { leftTexture, rightTexture };
    } else {
      // Mono Mode: Left and right eyes share the exact same texture mapping
      const monoTexture = new THREE.VideoTexture(video);
      monoTexture.colorSpace = THREE.SRGBColorSpace;
      monoTexture.minFilter = THREE.LinearFilter;
      monoTexture.magFilter = THREE.LinearFilter;
      monoTexture.repeat.set(1, 1);
      monoTexture.offset.set(0, 0);

      if (anisotropy > 1) {
        monoTexture.anisotropy = anisotropy;
      }

      this.textures.push(monoTexture);
      return { leftTexture: monoTexture, rightTexture: monoTexture };
    }
  }

  public disposeTextures(): void {
    this.textures.forEach((texture) => texture.dispose());
    this.textures = [];
  }
}
