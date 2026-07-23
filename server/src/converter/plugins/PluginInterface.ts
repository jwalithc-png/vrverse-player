/**
 * VRVerse Player — Conversion Plugin Interface
 * All conversion plugins (geometric, AI depth, NeRF, etc.) must implement this interface.
 * This is the extension point for future AI modules.
 */

export type VRModeType = 'normal' | 'vr180' | 'vr360';
export type QualityType = 'low' | 'medium' | 'high' | 'ultra';

/** Configuration passed to the conversion plugin */
export interface ConversionConfig {
  inputPath: string;
  outputPath: string;
  vrMode: VRModeType;
  resolution: { width: number; height: number };
  fps: number;
  bitrate: string;
  quality: QualityType;
  threads: number;
  projectionType: string;
}

/** Progress callback for reporting conversion status */
export interface ProgressCallback {
  (progress: number, stage: string, eta?: number): void;
}

/** Result of a conversion process */
export interface ConversionResult {
  success: boolean;
  outputPath: string;
  duration: number; // processing time in ms
  error?: string;
}

/**
 * ConversionPlugin Interface
 * 
 * All conversion methods must implement this interface.
 * Current implementation: GeometricPlugin (FFmpeg-based)
 * Future implementations:
 *   - DepthEstimationPlugin (AI depth maps)
 *   - NeRFPlugin (Neural Radiance Fields)
 *   - GaussianSplattingPlugin (3D Gaussian Splatting)
 *   - StereoGenerationPlugin (AI stereo pair generation)
 *   - MeshGenerationPlugin (3D mesh from video)
 */
export interface ConversionPlugin {
  /** Unique name of the plugin */
  readonly name: string;

  /** Plugin priority (lower = higher priority, checked first) */
  readonly priority: number;

  /** Description of the plugin's capabilities */
  readonly description: string;

  /** Check if this plugin can handle the given configuration */
  canHandle(config: ConversionConfig): boolean;

  /** Process the video conversion */
  process(config: ConversionConfig, onProgress: ProgressCallback): Promise<ConversionResult>;

  /** Cancel a running conversion */
  cancel(): void;

  /** Check if plugin dependencies are available */
  isAvailable(): Promise<boolean>;
}
