import type { HeadsetProfile } from './LensDistortion';

export class CalibrationSystem {
  /**
   * Automatically calculates optimal calibration parameters based on hardware factors.
   */
  public static autoCalibrate(
    profile: HeadsetProfile,
    screenWidth: number,
    screenHeight: number,
    pixelRatio: number
  ): {
    ipdOffset: number;
    fov: number;
    edgeMaskRadius: number;
    overscan: number;
  } {
    // Basic heuristics:
    // Smaller screens (e.g. mobile width < 800px landscape) require slightly wider separation
    // to match physical lenses.
    const isSmallScreen = Math.max(screenWidth, screenHeight) < 1000;
    
    // IPD offset (expressed in WebGL units)
    let ipdOffset = profile.ipd;
    if (isSmallScreen) {
      ipdOffset += 0.002; // slightly shift outwards for small screens
    }

    // FOV adjustment based on pixel ratio (high density devices can support wider FOV Zoom)
    let fov = profile.fov;
    if (pixelRatio >= 3.0) {
      fov += 2; // sharper screens can afford wider zoom without pixelation
    }

    // Edge mask radius - expand if pixel density is high to maximize area
    let edgeMaskRadius = profile.edgeMaskRadius;
    if (pixelRatio > 2) {
      edgeMaskRadius = Math.min(1.0, edgeMaskRadius + 0.04);
    }

    // Overscan factor to prevent black corners in high-distortion setups
    let overscan = 1.0;
    if (profile.k1 > 0.3) {
      overscan = 1.15; // 15% scaling zoom to crop distorted corners
    } else if (profile.k1 > 0.1) {
      overscan = 1.08;
    }

    return {
      ipdOffset,
      fov,
      edgeMaskRadius,
      overscan
    };
  }
}
