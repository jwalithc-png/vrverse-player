import * as THREE from 'three';

export interface HeadsetProfile {
  name: string;
  k1: number;
  k2: number;
  chromaticStrength: number;
  edgeMaskRadius: number;
  ipd: number;
  fov: number;
}

export const HEADSET_PROFILES: Record<string, HeadsetProfile> = {
  irusu: {
    name: 'Irusu VR',
    k1: 0.22,
    k2: 0.25,
    chromaticStrength: 0.003,
    edgeMaskRadius: 0.88,
    ipd: 0.063,
    fov: 95
  },
  vrbox: {
    name: 'VR Box',
    k1: 0.18,
    k2: 0.20,
    chromaticStrength: 0.002,
    edgeMaskRadius: 0.90,
    ipd: 0.062,
    fov: 90
  },
  cardboard_v1: {
    name: 'Google Cardboard V1',
    k1: 0.44,
    k2: 0.16,
    chromaticStrength: 0.007,
    edgeMaskRadius: 0.80,
    ipd: 0.060,
    fov: 80
  },
  cardboard_v2: {
    name: 'Google Cardboard V2',
    k1: 0.34,
    k2: 0.55,
    chromaticStrength: 0.005,
    edgeMaskRadius: 0.84,
    ipd: 0.064,
    fov: 95
  },
  homido: {
    name: 'Homido VR',
    k1: 0.25,
    k2: 0.30,
    chromaticStrength: 0.004,
    edgeMaskRadius: 0.87,
    ipd: 0.063,
    fov: 100
  },
  merge: {
    name: 'Merge VR',
    k1: 0.28,
    k2: 0.33,
    chromaticStrength: 0.004,
    edgeMaskRadius: 0.86,
    ipd: 0.064,
    fov: 96
  },
  quest: {
    name: 'Meta Quest Browser',
    k1: 0.0, // Quest relies on internal compositor correction
    k2: 0.0,
    chromaticStrength: 0.0,
    edgeMaskRadius: 1.0, // No mask, full display
    ipd: 0.064,
    fov: 100
  },
  custom: {
    name: 'Custom Calibration',
    k1: 0.20,
    k2: 0.22,
    chromaticStrength: 0.003,
    edgeMaskRadius: 0.85,
    ipd: 0.064,
    fov: 95
  }
};

export class LensDistortion {
  private leftTarget: THREE.WebGLRenderTarget | null = null;
  private rightTarget: THREE.WebGLRenderTarget | null = null;
  
  private orthoScene: THREE.Scene;
  private orthoCamera: THREE.OrthographicCamera;
  private orthoMesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  
  private currentProfile: HeadsetProfile = HEADSET_PROFILES.irusu;
  
  // Custom coefficients
  private k1: number = 0.22;
  private k2: number = 0.25;
  private chromaticStrength: number = 0.003;
  private edgeMaskRadius: number = 0.88;
  private enableDistortion: boolean = true;

  // Visual Adjustment parameters
  private brightness: number = 0.0;
  private contrast: number = 1.0;
  private saturation: number = 1.0;
  private gamma: number = 1.0;

  constructor() {
    this.orthoScene = new THREE.Scene();
    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // WebGL barrel distortion post-processing shader
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uLeftTexture: { value: null },
        uRightTexture: { value: null },
        uDistortion: { value: new THREE.Vector2(0.22, 0.25) },
        uChromaticStrength: { value: 0.003 },
        uEdgeMaskRadius: { value: 0.88 },
        uEnableDistortion: { value: 1.0 },
        uBrightness: { value: 0.0 },
        uContrast: { value: 1.0 },
        uSaturation: { value: 1.0 },
        uGamma: { value: 1.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uLeftTexture;
        uniform sampler2D uRightTexture;
        uniform vec2 uDistortion;
        uniform float uChromaticStrength;
        uniform float uEdgeMaskRadius;
        uniform float uEnableDistortion;
        
        uniform float uBrightness;
        uniform float uContrast;
        uniform float uSaturation;
        uniform float uGamma;
        
        varying vec2 vUv;
        
        void main() {
          // Determine left/right screen split
          float isRight = step(0.5, vUv.x);
          vec2 eyeUv = vec2(isRight == 1.0 ? (vUv.x - 0.5) * 2.0 : vUv.x * 2.0, vUv.y);
          
          vec4 col = vec4(0.0);
          float vignette = 1.0;
          
          if (uEnableDistortion > 0.5) {
            vec2 center = vec2(0.5, 0.5);
            vec2 d = eyeUv - center;
            float r2 = dot(d, d);
            
            // --- Chromatic Aberration Correction ---
            // Scaled distortion coefficients for red, green, and blue wavelengths
            vec2 redUv = center + d * (1.0 + (uDistortion.x + uChromaticStrength) * r2 + (uDistortion.y + uChromaticStrength) * r2 * r2);
            vec2 greenUv = center + d * (1.0 + uDistortion.x * r2 + uDistortion.y * r2 * r2);
            vec2 blueUv = center + d * (1.0 + (uDistortion.x - uChromaticStrength) * r2 + (uDistortion.y - uChromaticStrength) * r2 * r2);
            
            // Out of bounds check (renders black borders outside lens field of view)
            if (greenUv.x < 0.0 || greenUv.x > 1.0 || greenUv.y < 0.0 || greenUv.y > 1.0) {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
              return;
            } else {
              // Lens Vignette / Soft Circular Edge Mask
              float distFromCenter = length(greenUv - center);
              vignette = smoothstep(uEdgeMaskRadius, uEdgeMaskRadius - 0.05, distFromCenter);
              
              if (isRight == 1.0) {
                col.r = texture2D(uRightTexture, redUv).r;
                col.g = texture2D(uRightTexture, greenUv).g;
                col.b = texture2D(uRightTexture, blueUv).b;
              } else {
                col.r = texture2D(uLeftTexture, redUv).r;
                col.g = texture2D(uLeftTexture, greenUv).g;
                col.b = texture2D(uLeftTexture, blueUv).b;
              }
            }
          } else {
            // Direct Side-by-Side (Zero Distortion)
            if (isRight == 1.0) {
              col = texture2D(uRightTexture, eyeUv);
            } else {
              col = texture2D(uLeftTexture, eyeUv);
            }
          }
          
          // --- Visual Adjustments Pipeline ---
          // 1. Brightness
          col.rgb += uBrightness;
          
          // 2. Contrast
          col.rgb = (col.rgb - 0.5) * uContrast + 0.5;
          
          // 3. Saturation
          float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
          col.rgb = mix(vec3(luma), col.rgb, uSaturation);
          
          // 4. Gamma Correction
          col.rgb = max(col.rgb, vec3(0.0)); // prevent NaN
          col.rgb = pow(col.rgb, vec3(1.0 / uGamma));
          
          gl_FragColor = vec4(col.rgb * vignette, 1.0);
        }
      `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.orthoMesh = new THREE.Mesh(geometry, this.material);
    this.orthoScene.add(this.orthoMesh);
  }

  public setProfile(profileKey: string): void {
    const profile = HEADSET_PROFILES[profileKey];
    if (profile) {
      this.currentProfile = profile;
      this.k1 = profile.k1;
      this.k2 = profile.k2;
      this.chromaticStrength = profile.chromaticStrength;
      this.edgeMaskRadius = profile.edgeMaskRadius;
      
      this.updateUniforms();
    }
  }

  public getProfile(): HeadsetProfile {
    return this.currentProfile;
  }

  public setCustomParameters(k1: number, k2: number, chromatic: number, mask: number): void {
    this.k1 = k1;
    this.k2 = k2;
    this.chromaticStrength = chromatic;
    this.edgeMaskRadius = mask;
    this.updateUniforms();
  }

  public setVisualAdjustments(brightness: number, contrast: number, saturation: number, gamma: number): void {
    this.brightness = brightness;
    this.contrast = contrast;
    this.saturation = saturation;
    this.gamma = gamma;
    this.updateUniforms();
  }

  public toggleDistortion(enable: boolean): void {
    this.enableDistortion = enable;
    this.material.uniforms.uEnableDistortion.value = enable ? 1.0 : 0.0;
  }

  public resizeTargets(width: number, height: number, pixelRatio: number): void {
    const w = Math.floor((width / 2) * pixelRatio);
    const h = Math.floor(height * pixelRatio);

    if (!this.leftTarget || this.leftTarget.width !== w || this.leftTarget.height !== h) {
      if (this.leftTarget) this.leftTarget.dispose();
      if (this.rightTarget) this.rightTarget.dispose();

      const options = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        colorSpace: THREE.SRGBColorSpace
      };

      this.leftTarget = new THREE.WebGLRenderTarget(w, h, options);
      this.rightTarget = new THREE.WebGLRenderTarget(w, h, options);
    }
  }

  public getLeftTarget(): THREE.WebGLRenderTarget | null {
    return this.leftTarget;
  }

  public getRightTarget(): THREE.WebGLRenderTarget | null {
    return this.rightTarget;
  }

  public render(renderer: THREE.WebGLRenderer): void {
    if (!this.leftTarget || !this.rightTarget) return;

    // Reset render target to screen/canvas
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight);

    // Update texture uniforms
    this.material.uniforms.uLeftTexture.value = this.leftTarget.texture;
    this.material.uniforms.uRightTexture.value = this.rightTarget.texture;

    // Render orthographic scene to apply barrel distortion shader
    renderer.render(this.orthoScene, this.orthoCamera);
  }

  public dispose(): void {
    if (this.leftTarget) this.leftTarget.dispose();
    if (this.rightTarget) this.rightTarget.dispose();
    this.orthoMesh.geometry.dispose();
    this.material.dispose();
  }

  private updateUniforms(): void {
    this.material.uniforms.uDistortion.value.set(this.k1, this.k2);
    this.material.uniforms.uChromaticStrength.value = this.chromaticStrength;
    this.material.uniforms.uEdgeMaskRadius.value = this.edgeMaskRadius;
    this.material.uniforms.uBrightness.value = this.brightness;
    this.material.uniforms.uContrast.value = this.contrast;
    this.material.uniforms.uSaturation.value = this.saturation;
    this.material.uniforms.uGamma.value = this.gamma;
  }
}
