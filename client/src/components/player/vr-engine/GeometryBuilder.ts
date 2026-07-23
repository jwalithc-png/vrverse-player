import * as THREE from 'three';

export class GeometryBuilder {
  /**
   * Generates dynamic geometries for specific VR/Cinema projection formats.
   * Inverts geometry normals using scale(-1, 1, 1) so textures face inward
   * and horizontal coordinates are correctly un-mirrored for the viewer inside.
   */
  public static buildGeometry(
    projection: string,
    mode: 'vr180' | 'vr360' | 'flat' | 'cinema',
    eyeAspect: number,
    radius: number = 500
  ): THREE.BufferGeometry {
    const segments = mode === 'vr360' ? 128 : 96;
    let geom: THREE.BufferGeometry;

    if (mode === 'cinema' || projection === 'perspective') {
      // Premium Curved Cinema Screen in front of user
      const fovHoriz = 110; // 110 degrees horizontal coverage
      const phiLength = THREE.MathUtils.degToRad(fovHoriz);
      // Center the sweep at 3 * Math.PI / 2 (-Z axis)
      const phiStart = (3 * Math.PI) / 2 - phiLength / 2;

      // Calculate vertical FOV based on horizontal FOV and aspect ratio
      const thetaLength = Math.min(Math.PI * 0.85, phiLength / eyeAspect);
      const thetaStart = Math.PI / 2 - thetaLength / 2; // Center vertically on equator

      geom = new THREE.SphereGeometry(radius, segments, segments, phiStart, phiLength, thetaStart, thetaLength);
    } else if (projection === 'cubemap') {
      // 6-face box geometry mapping
      geom = new THREE.BoxGeometry(radius * 1.5, radius * 1.5, radius * 1.5);
    } else if (projection === 'hemisphere') {
      // 180° dome (vertical range 0 to PI/2, covers upper hemisphere)
      // Center the 360° sweep such that the center of the video (U=0.5) is at -Z (3 * Math.PI / 2)
      const phiLength = Math.PI * 2;
      const phiStart = Math.PI / 2;
      geom = new THREE.SphereGeometry(radius, segments, segments, phiStart, phiLength, 0, Math.PI / 2);
    } else if (mode === 'vr180') {
      // 180° (hemisphere centered in front of user)
      const phiLength = Math.PI; // 180 degrees horizontal coverage
      // Center the sweep at 3 * Math.PI / 2 (-Z axis)
      const phiStart = Math.PI;

      // Scale height based on horizontal coverage and aspect ratio to prevent stretching
      const thetaLength = Math.min(Math.PI, phiLength / eyeAspect);
      const thetaStart = Math.PI / 2 - thetaLength / 2; // Center vertically

      geom = new THREE.SphereGeometry(radius, segments, segments, phiStart, phiLength, thetaStart, thetaLength);
    } else {
      // Default: VR 360° / Equirectangular full sphere
      // Center the 360° sweep such that the center of the video (U=0.5) is at -Z (3 * Math.PI / 2)
      const phiLength = Math.PI * 2;
      const phiStart = Math.PI / 2;
      geom = new THREE.SphereGeometry(radius, segments, segments, phiStart, phiLength);
    }

    // Invert geometry normals so they face inside (viewer is at center of coordinate system)
    // This also un-mirrors the horizontal (X) coordinate of the video texture.
    geom.scale(-1, 1, 1);
    return geom;
  }
}
