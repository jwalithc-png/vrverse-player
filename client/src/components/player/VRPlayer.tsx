/**
 * VRVerse Player — Commercial-Grade Stereoscopic VR Player Component
 * Redesigned rendering engine utilizing modular VR subsystems,
 * custom barrel distortion shader passes, and absolute gyroscope tracking.
 */
import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, 
  Settings, Glasses, Compass, Eye, Info, Bookmark, List, 
  Sparkles, Sliders, Sun, Activity, Video, RefreshCw
} from 'lucide-react';

import { DeviceSensors } from './vr-engine/DeviceSensors';
import { GeometryBuilder } from './vr-engine/GeometryBuilder';
import { VideoEngine } from './vr-engine/VideoEngine';
import type { DetectedFormat } from './vr-engine/VideoEngine';
import { TextureManager } from './vr-engine/TextureManager';
import { VRCamera } from './vr-engine/VRCamera';
import { LensDistortion, HEADSET_PROFILES } from './vr-engine/LensDistortion';
import type { HeadsetProfile } from './vr-engine/LensDistortion';
import { CalibrationSystem } from './vr-engine/CalibrationSystem';
import { WebXRManager } from './vr-engine/WebXRManager';
import { PerformanceManager } from './vr-engine/PerformanceManager';
import { conversionApi } from '../../services/api';

interface VRPlayerProps {
  videoUrl: string;
  vrMode: 'vr180' | 'vr360';
  projectionType?: string;
  videoId?: string;
}

interface BookmarkItem {
  time: number;
  label: string;
}

export function VRPlayer({ videoUrl, vrMode, projectionType = 'equirectangular', videoId }: VRPlayerProps) {
  // Container & Engine Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Engine Subsystems (instantiated once per lifecycle)
  const sensorsRef = useRef<DeviceSensors | null>(null);
  const videoEngineRef = useRef<VideoEngine | null>(null);
  const textureManagerRef = useRef<TextureManager | null>(null);
  const cameraEngineRef = useRef<VRCamera | null>(null);
  const distortionRef = useRef<LensDistortion | null>(null);
  const xrRef = useRef<WebXRManager | null>(null);
  const performanceRef = useRef<PerformanceManager | null>(null);

  // Three.js Render States
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const leftMeshRef = useRef<THREE.Mesh | null>(null);
  const rightMeshRef = useRef<THREE.Mesh | null>(null);
  const animationLoopRef = useRef<number | null>(null);

  // Refs that mirror state for the render loop (avoids stale closures)
  const gyroEnabledRef = useRef(false);
  const cardboardSplitModeRef = useRef(false);

  // Wake Lock Ref
  const wakeLockRef = useRef<any>(null);

  // Mouse drag orientation backup controls
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const cameraRotation = useRef({ lon: 180, lat: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });

  // Basic Playback UI States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Format / Mode States
  const [activeVideoUrl, setActiveVideoUrl] = useState(videoUrl);
  const [stereoLayout, setStereoLayout] = useState<'mono' | 'sbs' | 'ou'>('mono');
  const [projectionMode, setProjectionMode] = useState<'vr180' | 'vr360' | 'flat' | 'cinema'>('vr360');
  const [conversions, setConversions] = useState<any[]>([]);
  const [detectedFormatInfo, setDetectedFormatInfo] = useState<DetectedFormat | null>(null);

  // VR / Stereo Mode Controls
  const [cardboardSplitMode, setCardboardSplitMode] = useState(false);
  const [isVRAvailable, setIsVRAvailable] = useState(false);
  const [xrSession, setXrSession] = useState<any>(null);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [isGyroAvailable, setIsGyroAvailable] = useState(false);
  const [previousProjectionMode, setPreviousProjectionMode] = useState<'vr180' | 'vr360' | 'flat' | 'cinema'>('vr360');

  // Calibration Parameters State (binds to Calibration Drawer UI)
  const [activeProfile, setActiveProfile] = useState<string>('irusu');
  const [ipdSlider, setIpdSlider] = useState<number>(0.063);
  const [fovSlider, setFovSlider] = useState<number>(95);
  const [k1Slider, setK1Slider] = useState<number>(0.22);
  const [k2Slider, setK2Slider] = useState<number>(0.25);
  const [chromaticSlider, setChromaticSlider] = useState<number>(0.003);
  const [maskSlider, setMaskSlider] = useState<number>(0.88);
  const [distortionOn, setDistortionOn] = useState(true);

  // Image Adjustment Parameters
  const [brightness, setBrightness] = useState<number>(0.0);
  const [contrast, setContrast] = useState<number>(1.0);
  const [saturation, setSaturation] = useState<number>(1.0);
  const [gamma, setGamma] = useState<number>(1.0);

  // Drawer / Overlay Toggles
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<number | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [debugStats, setDebugStats] = useState<any>({ fps: 0, decodedFrames: 0, droppedFrames: 0, memoryUsage: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [showSensorWarning, setShowSensorWarning] = useState(false);
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

  useEffect(() => {
    setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    let warningTimeout: any = null;
    if (gyroEnabled) {
      setShowSensorWarning(false);
      // Check after 2.5 seconds if we are receiving sensor data
      warningTimeout = window.setTimeout(() => {
        if (sensorsRef.current && !sensorsRef.current.isReceivingData()) {
          setShowSensorWarning(true);
        }
      }, 2500);
    } else {
      setShowSensorWarning(false);
    }
    return () => {
      if (warningTimeout) window.clearTimeout(warningTimeout);
    };
  }, [gyroEnabled]);

  // ----------------------------------------------------
  // Wake Lock Manager
  // ----------------------------------------------------
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.warn('Wake Lock request rejected:', err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      } catch (err) {
        console.error('Wake Lock release failed:', err);
      }
    }
  };

  // ----------------------------------------------------
  // Autohide Controls Timer
  // ----------------------------------------------------
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) window.clearTimeout(controlsTimeout);
    
    if (isPlaying) {
      const timeout = window.setTimeout(() => {
        if (!showCalibration && !showBookmarks && !showDebug) {
          setShowControls(false);
        }
      }, 3500);
      setControlsTimeout(timeout);
    }
  }, [isPlaying, showCalibration, showBookmarks, showDebug, controlsTimeout]);

  // Handle pointer hover inside player to show overlay controls
  const handlePointerMovePlayer = useCallback(() => {
    resetControlsTimer();
  }, [resetControlsTimer]);

  // ----------------------------------------------------
  // Load Available Quality Resolutions
  // ----------------------------------------------------
  useEffect(() => {
    if (videoId) {
      conversionApi.getByVideo(videoId)
        .then(res => {
          const completed = (res.conversions || []).filter((c: any) => c.status === 'completed');
          setConversions(completed);
        })
        .catch(err => console.error('Failed to load quality options:', err));
    }
  }, [videoId]);

  // Set up Gyroscope availability check
  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setIsGyroAvailable(true);
    }
  }, []);

  // Update visual adjustments and calibration uniforms in real-time
  useEffect(() => {
    if (distortionRef.current) {
      distortionRef.current.setCustomParameters(k1Slider, k2Slider, chromaticSlider, maskSlider);
      distortionRef.current.setVisualAdjustments(brightness, contrast, saturation, gamma);
    }
    if (cameraEngineRef.current) {
      cameraEngineRef.current.setIpd(ipdSlider);
      cameraEngineRef.current.setFov(fovSlider);
    }
  }, [k1Slider, k2Slider, chromaticSlider, maskSlider, ipdSlider, fovSlider, brightness, contrast, saturation, gamma]);

  // Request/release Wake Lock depending on play/pause status
  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => {
      releaseWakeLock();
    };
  }, [isPlaying]);

  // Clean up auto-hide timers on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout) window.clearTimeout(controlsTimeout);
    };
  }, [controlsTimeout]);

  // ----------------------------------------------------
  // Headset Profile Preset Selector
  // ----------------------------------------------------
  const handleProfileChange = (profileKey: string) => {
    setActiveProfile(profileKey);
    const profile = HEADSET_PROFILES[profileKey];
    if (profile) {
      setK1Slider(profile.k1);
      setK2Slider(profile.k2);
      setChromaticSlider(profile.chromaticStrength);
      setMaskSlider(profile.edgeMaskRadius);
      setIpdSlider(profile.ipd);
      setFovSlider(profile.fov);
      if (distortionRef.current) {
        distortionRef.current.setProfile(profileKey);
      }
    }
  };

  // ----------------------------------------------------
  // Primary Rebuild Mesh Function
  // ----------------------------------------------------
  const rebuildMeshes = useCallback((
    scene: THREE.Scene, 
    video: HTMLVideoElement, 
    stereo: 'mono' | 'sbs' | 'ou',
    proj: 'vr180' | 'vr360' | 'flat' | 'cinema'
  ) => {
    // Clear out old meshes
    if (leftMeshRef.current) {
      scene.remove(leftMeshRef.current);
      leftMeshRef.current.geometry.dispose();
      leftMeshRef.current = null;
    }
    if (rightMeshRef.current) {
      scene.remove(rightMeshRef.current);
      rightMeshRef.current.geometry.dispose();
      rightMeshRef.current = null;
    }

    if (!textureManagerRef.current) return;

    // Load textures mapping
    const { leftTexture, rightTexture } = textureManagerRef.current.createTextures(video, stereo);

    // Calculate aspect ratio for the camera eye geometry
    const videoAspect = video.videoWidth > 0 ? video.videoWidth / video.videoHeight : 16 / 9;
    const eyeAspect = (stereo === 'sbs') ? (videoAspect / 2) : (stereo === 'ou' ? videoAspect : videoAspect);

    // Construct geometries
    const geometry = GeometryBuilder.buildGeometry(projectionType, proj, eyeAspect);

    if (stereo === 'mono') {
      const mat = new THREE.MeshBasicMaterial({ map: leftTexture, side: THREE.FrontSide });
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.layers.set(0); // Visible to all eyes
      scene.add(mesh);
      leftMeshRef.current = mesh;
    } else {
      // Stereoscopic left mesh
      const matL = new THREE.MeshBasicMaterial({ map: leftTexture, side: THREE.FrontSide });
      const meshL = new THREE.Mesh(geometry, matL);
      meshL.layers.set(1); // Left Eye visible only
      scene.add(meshL);
      leftMeshRef.current = meshL;

      // Stereoscopic right mesh (cloned geometry for separate layers)
      const matR = new THREE.MeshBasicMaterial({ map: rightTexture, side: THREE.FrontSide });
      const meshR = new THREE.Mesh(geometry.clone(), matR);
      meshR.layers.set(2); // Right Eye visible only
      scene.add(meshR);
      rightMeshRef.current = meshR;
    }
  }, [projectionType]);

  // ----------------------------------------------------
  // Three.js Core WebGL Engine Setup
  // ----------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene & Renderer Initialization
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.xr.enabled = true;
    rendererRef.current = renderer;

    // Set linear color mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    // 2. Instantiate Modular VR Subsystems
    const cameraEngine = new VRCamera(fovSlider, width / height, 0.1, 1000);
    cameraEngine.setIpd(ipdSlider);
    cameraEngineRef.current = cameraEngine;

    const textureManager = new TextureManager();
    textureManagerRef.current = textureManager;

    const distortionPass = new LensDistortion();
    distortionPass.setProfile(activeProfile);
    distortionPass.setVisualAdjustments(brightness, contrast, saturation, gamma);
    distortionPass.toggleDistortion(distortionOn);
    distortionRef.current = distortionPass;

    const xrManager = new WebXRManager();
    xrRef.current = xrManager;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    xrManager.checkSupport().then(supported => setIsVRAvailable(supported && !isMobileDevice));

    const sensors = new DeviceSensors();
    sensorsRef.current = sensors;

    // 3. Setup HTML5 Video Element & Video Engine wrapper
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.playsInline = true;
    video.style.position = 'absolute';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    if (containerRef.current) {
      containerRef.current.appendChild(video);
    }
    
    let blobUrl: string | null = null;

    video.addEventListener('error', () => {
      alert(`VR Video error: ${video.error?.message || 'unknown playback error (code ' + video.error?.code + ')'}`);
    });

    // Fetch video as blob to bypass insecure cross-origin restrictions in WebGL
    console.log("Fetching video as blob:", activeVideoUrl);
    fetch(activeVideoUrl)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        blobUrl = URL.createObjectURL(blob);
        console.log("Local blob URL created successfully:", blobUrl);
        video.src = blobUrl;
      })
      .catch(err => {
        console.error("Blob fetch failed, falling back to direct URL:", err);
        // Fallback to direct URL if blob fetch fails
        video.src = activeVideoUrl;
      });

    videoRef.current = video;

    const videoEngine = new VideoEngine(video);
    videoEngineRef.current = videoEngine;

    const performanceTracker = new PerformanceManager(video);
    performanceRef.current = performanceTracker;

    // Metadata Autodetection Handler
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      
      // Auto-detect aspect ratio, 3D SBS, 360/180 projection settings
      const format = videoEngine.detectFormat(activeVideoUrl, vrMode);
      setDetectedFormatInfo(format);
      
      setStereoLayout(format.stereoMode);
      setProjectionMode(format.vrMode);

      // Perform Auto-calibration based on display size and loaded profile
      const calibration = CalibrationSystem.autoCalibrate(
        HEADSET_PROFILES[activeProfile],
        containerRef.current?.clientWidth || window.innerWidth,
        containerRef.current?.clientHeight || window.innerHeight,
        window.devicePixelRatio
      );
      
      setIpdSlider(calibration.ipdOffset);
      setFovSlider(calibration.fov);
      setMaskSlider(calibration.edgeMaskRadius);

      // Trigger mesh creation
      rebuildMeshes(scene, video, format.stereoMode, format.vrMode);

      // Check for resume playback position
      const savedTime = localStorage.getItem(`vrverse_resume_${activeVideoUrl}`);
      if (savedTime) {
        const time = parseFloat(savedTime);
        if (time > 2 && time < video.duration - 2) {
          videoEngine.seek(time);
          console.log(`Auto-resumed playback from position: ${time} seconds`);
        }
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Save playhead for auto-resume
      if (video.currentTime > 2) {
        localStorage.setItem(`vrverse_resume_${activeVideoUrl}`, video.currentTime.toString());
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    // Initial load trigger if video is already cached/cached metadata
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    // 4. Integrated High-Performance Frame Render Loop
    let lastPerfTick = 0;
    const animate = () => {
      performanceTracker.tick();

      // Update developer stats every 500ms
      const now = performance.now();
      if (now - lastPerfTick >= 500) {
        setDebugStats(performanceTracker.getStats());
        lastPerfTick = now;

        // Auto-resolution scaling feedback loops
        const recommend = performanceTracker.getPerformanceRecommendation();
        if (recommend === 'scale-down') {
          renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() - 0.25));
        } else if (recommend === 'scale-up') {
          renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderer.getPixelRatio() + 0.25));
        }
      }

      const activeCamera = cameraEngine.getCamera();

      // Sensor Quaternion combined with Drag Rotation offset
      if (!renderer.xr.isPresenting) {
        const lat = Math.max(-85, Math.min(85, cameraRotation.current.lat));
        
        // Calculate drag rotation quaternion
        const dragQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            THREE.MathUtils.degToRad(lat),
            THREE.MathUtils.degToRad(cameraRotation.current.lon - 180), // offset by 180 to align default view
            0,
            'YXZ'
          )
        );

        if (gyroEnabledRef.current && sensorsRef.current) {
          const gyroQuat = new THREE.Quaternion();
          sensorsRef.current.getOrientation(gyroQuat);
          
          // Combine manual drag offset with device gyroscope tracking
          activeCamera.quaternion.copy(dragQuaternion).multiply(gyroQuat);
        } else {
          activeCamera.quaternion.copy(dragQuaternion);
        }
      }

      // Check if displaying side-by-side cardboard headset mode (and WebXR is not running)
      if (cardboardSplitModeRef.current && !renderer.xr.isPresenting) {
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const h = containerRef.current?.clientHeight || window.innerHeight;
        
        // Setup offscreen targets sizes using the renderer's current pixel ratio (supporting performance scaling)
        distortionPass.resizeTargets(w, h, renderer.getPixelRatio());
        
        const leftTarget = distortionPass.getLeftTarget();
        const rightTarget = distortionPass.getRightTarget();

        if (leftTarget && rightTarget) {
          // Render Left Eye Pass
          renderer.setRenderTarget(leftTarget);
          cameraEngine.prepareLeftEye(w / 2 / h);
          renderer.render(scene, activeCamera);

          // Render Right Eye Pass
          renderer.setRenderTarget(rightTarget);
          cameraEngine.prepareRightEye(w / 2 / h);
          renderer.render(scene, activeCamera);

          // Apply post-processing barrel distortion & chromatic aberration
          distortionPass.render(renderer);
        }
      } else {
        // Direct Mono Screen View Rendering
        renderer.setRenderTarget(null);
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const h = containerRef.current?.clientHeight || window.innerHeight;
        renderer.setViewport(0, 0, w, h);
        cameraEngine.resetMono(w / h);
        renderer.render(scene, activeCamera);
      }
    };

    // Use Three.js animation loop only (synchronizes with screen refresh rate for smooth head tracking and video texture upload)
    renderer.setAnimationLoop(animate);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      setIsPortrait(h > w);
      cameraEngine.updateProjection(w / h);
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // 5. Cleanup Resources
    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', handleResize);
      
      // Dispose WebGL artifacts
      renderer.dispose();
      distortionPass.dispose();
      textureManager.disposeTextures();
      sensors.stop();
      
      if (leftMeshRef.current) {
        scene.remove(leftMeshRef.current);
        leftMeshRef.current.geometry.dispose();
      }
      if (rightMeshRef.current) {
        scene.remove(rightMeshRef.current);
        rightMeshRef.current.geometry.dispose();
      }

      video.pause();
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.src = '';
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [activeVideoUrl, rebuildMeshes]);

  // Rebuild geometries instantly when layout or projection type changes
  useEffect(() => {
    if (sceneRef.current && videoRef.current && textureManagerRef.current) {
      rebuildMeshes(sceneRef.current, videoRef.current, stereoLayout, projectionMode);
    }
  }, [stereoLayout, projectionMode, rebuildMeshes]);

  // Toggle sensor listeners when gyroscope mode is enabled
  useEffect(() => {
    gyroEnabledRef.current = gyroEnabled;
    if (sensorsRef.current) {
      if (gyroEnabled) {
        sensorsRef.current.start(() => {});
      } else {
        sensorsRef.current.stop();
      }
    }
  }, [gyroEnabled]);

  // Keep cardboard split mode ref in sync for the render loop
  useEffect(() => {
    cardboardSplitModeRef.current = cardboardSplitMode;
  }, [cardboardSplitMode]);

  // ----------------------------------------------------
  // Interactive UI Actions
  // ----------------------------------------------------
  const togglePlay = () => {
    if (!videoEngineRef.current) return;
    if (isPlaying) {
      videoEngineRef.current.pause();
      setIsPlaying(false);
    } else {
      videoEngineRef.current.play().then(() => setIsPlaying(true));
    }
    resetControlsTimer();
  };

  const seek = (time: number) => {
    if (videoEngineRef.current) {
      videoEngineRef.current.seek(time);
      setCurrentTime(time);
    }
    resetControlsTimer();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
    resetControlsTimer();
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (videoEngineRef.current) {
      videoEngineRef.current.setVolume(v);
    }
    if (v > 0 && isMuted) {
      setIsMuted(false);
      if (videoRef.current) videoRef.current.muted = false;
    }
    resetControlsTimer();
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        const req = containerRef.current.requestFullscreen || 
                    (containerRef.current as any).webkitRequestFullscreen || 
                    (containerRef.current as any).msRequestFullscreen;
        if (req) {
          await req.call(containerRef.current);
          setIsFullscreen(true);
          
          // Lock screen orientation to landscape if mobile
          if ((screen as any).orientation && (screen as any).orientation.lock) {
            try {
              await (screen as any).orientation.lock('landscape');
            } catch (err) {
              console.warn('Orientation lock failed:', err);
            }
          }
        }
      } else {
        const exit = document.exitFullscreen || 
                     (document as any).webkitExitFullscreen || 
                     (document as any).msExitFullscreen;
        if (exit) {
          await exit.call(document);
          setIsFullscreen(false);
          
          if ((screen as any).orientation && (screen as any).orientation.unlock) {
            try {
              (screen as any).orientation.unlock();
            } catch (err) {
              console.warn('Orientation unlock failed:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Fullscreen operation failed:', error);
    }
    resetControlsTimer();
  };

  const toggleVR = async () => {
    if (!rendererRef.current || !xrRef.current) return;
    
    if (xrSession) {
      await xrRef.current.endSession();
      setXrSession(null);
    } else {
      try {
        const session = await xrRef.current.startSession(rendererRef.current, () => {
          setXrSession(null);
        });
        setXrSession(session);
      } catch (err) {
        alert('WebXR session failed to start. Verify your VR device is connected and active.');
      }
    }
    resetControlsTimer();
  };

  const toggleGyro = async () => {
    if (gyroEnabled) {
      setGyroEnabled(false);
    } else {
      const granted = await DeviceSensors.requestPermission();
      if (granted) {
        setGyroEnabled(true);
      } else {
        alert('Sensor permissions are required to look around using head tracking.');
      }
    }
    resetControlsTimer();
  };

  const toggleCardboardMode = async () => {
    const nextMode = !cardboardSplitMode;
    
    if (nextMode) {
      // 1. Concurrently trigger user-gesture protected actions in the same tick
      const permissionPromise = DeviceSensors.requestPermission();
      
      let fullscreenPromise = Promise.resolve();
      if (!document.fullscreenElement && containerRef.current) {
        const req = containerRef.current.requestFullscreen || 
                    (containerRef.current as any).webkitRequestFullscreen || 
                    (containerRef.current as any).msRequestFullscreen;
        if (req) {
          fullscreenPromise = req.call(containerRef.current);
        }
      }

      // Save current projection mode and force VR projection mode
      setPreviousProjectionMode(projectionMode);
      setProjectionMode(vrMode);

      try {
        await Promise.all([permissionPromise, fullscreenPromise]);
      } catch (err) {
        console.warn('User gesture activations failed:', err);
      }

      // 2. Set states based on results
      const granted = await permissionPromise;
      if (granted) {
        setGyroEnabled(true);
      }
      setIsFullscreen(!!document.fullscreenElement);
      setCardboardSplitMode(true);
      
      // 3. Lock orientation to landscape automatically
      if ((screen as any).orientation && (screen as any).orientation.lock) {
        try {
          await (screen as any).orientation.lock('landscape');
        } catch (err) {
          console.warn('Orientation lock failed:', err);
        }
      }
    } else {
      setCardboardSplitMode(false);
      
      // Restore previous projection mode
      setProjectionMode(previousProjectionMode);
      
      // Exit fullscreen if present
      if (document.fullscreenElement) {
        const exit = document.exitFullscreen || 
                     (document as any).webkitExitFullscreen || 
                     (document as any).msExitFullscreen;
        if (exit) {
          try {
            await exit.call(document);
          } catch (err) {
            console.warn('Exit fullscreen failed:', err);
          }
        }
      }
      setIsFullscreen(false);

      // Unlock orientation
      if ((screen as any).orientation && (screen as any).orientation.unlock) {
        try {
          (screen as any).orientation.unlock();
        } catch (err) {
          console.warn('Orientation unlock failed:', err);
        }
      }
    }
    resetControlsTimer();
  };

  const recenterHeading = () => {
    if (sensorsRef.current) {
      sensorsRef.current.recenter();
    }
    cameraRotation.current = { lon: 180, lat: 0 };
    resetControlsTimer();
  };

  // Drag & Tap listeners
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    prevMouse.current = { x: e.clientX, y: e.clientY };
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - prevMouse.current.x;
    const dy = e.clientY - prevMouse.current.y;
    cameraRotation.current.lon -= dx * 0.15;
    cameraRotation.current.lat += dy * 0.15;
    prevMouse.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    
    // Tap to toggle controls logic (if we moved less than 5 pixels, it's a tap)
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 5) {
      setShowControls(prev => !prev);
      resetControlsTimer();
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    setFovSlider(prev => {
      const next = prev + e.deltaY * 0.04;
      return Math.max(30, Math.min(120, next));
    });
  };

  // Bookmark functions
  const addBookmark = () => {
    const item: BookmarkItem = {
      time: currentTime,
      label: `Marker at ${formatTime(currentTime)}`
    };
    setBookmarks(prev => [...prev, item]);
    resetControlsTimer();
  };

  const removeBookmark = (idx: number) => {
    setBookmarks(prev => prev.filter((_, i) => i !== idx));
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const renderUIElements = (mode: 'left' | 'right' | 'mono') => {
    const isSplit = mode !== 'mono';

    if (isSplit) {
      // Compact, VR-focused controls for headset view
      return (
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none"
            >
              {/* Top Bar: VR badge & Exit */}
              <div className="flex justify-between items-center z-30 pointer-events-auto">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-xl border border-white/10 px-2.5 py-1 rounded-lg">
                  <Glasses className="w-3.5 h-3.5 text-vrverse-400" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">VR Mode ({mode})</span>
                </div>
                <button 
                  onClick={toggleCardboardMode}
                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-300 text-[9px] font-bold pointer-events-auto"
                >
                  Exit VR
                </button>
              </div>

              {/* Center Play Indicator (Only if paused) */}
              {!isPlaying && (
                <div className="flex-1 flex items-center justify-center pointer-events-auto cursor-pointer" onClick={togglePlay}>
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
              )}

              {/* Bottom Bar: Play/Pause, Recenter, Playhead Progress */}
              <div className="space-y-2 pointer-events-auto">
                {/* Playhead Progress */}
                <div className="flex items-center gap-2 text-[9px] text-white/60 font-mono bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                  <span>{formatTime(currentTime)}</span>
                  <div className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-vrverse-500 transition-all duration-100" 
                      style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                    />
                  </div>
                  <span>{formatTime(duration)}</span>
                </div>

                {/* VR Controls Row */}
                <div className="flex justify-between items-center gap-2">
                  <button 
                    onClick={togglePlay}
                    className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/10"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white ml-0.5" />}
                  </button>

                  <button 
                    onClick={recenterHeading}
                    className="flex-1 h-8 rounded-lg bg-vrverse-500 hover:bg-vrverse-600 flex items-center justify-center gap-1.5 border border-vrverse-400/20 text-white font-bold text-xs shadow-lg shadow-vrverse-500/20"
                    title="Recenter Headset View Direction"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recenter VR</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      );
    }

    // Standard Full Controls for Mono Screen View
    return (
      <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
        {/* Glassmorphic Floating Topbar: Stats & Quality Selector */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex justify-between items-center z-30 pointer-events-auto"
            >
              {/* Left: Video Details Badge */}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-xl">
                <Video className="w-4 h-4 text-vrverse-400" />
                <div>
                  <p className="text-white text-xs font-semibold">
                    {projectionMode === 'vr360' ? '360° Sphere' : projectionMode === 'vr180' ? '180° Hemisphere' : 'Cinema Mode'}
                  </p>
                  <p className="text-white/40 text-[10px] uppercase tracking-wider font-semibold font-mono">
                    {stereoLayout} video
                  </p>
                </div>
              </div>

              {/* Right: Mode Toggles & Quality */}
              <div className="flex items-center gap-2">
                {conversions.length > 0 && (
                  <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 px-2 py-1 rounded-xl">
                    <span className="text-[10px] text-white/50 font-bold px-2 uppercase">Quality</span>
                    <select 
                      value={activeVideoUrl}
                      onChange={e => setActiveVideoUrl(e.target.value)}
                      className="bg-transparent text-white text-xs font-bold border-none outline-none pr-6 cursor-pointer"
                    >
                      <option value={videoUrl} className="bg-neutral-900 text-white">Source</option>
                      {conversions.map((conv: any) => (
                        <option key={conv.id} value={conversionApi.getStreamUrl(conv.id)} className="bg-neutral-900 text-white">
                          {conv.outputResolution} ({conv.vrMode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Developer stats toggle */}
                <button 
                  onClick={() => setShowDebug(!showDebug)}
                  className={`p-2 rounded-xl backdrop-blur-xl border transition-all ${showDebug ? 'bg-vrverse-500/20 border-vrverse-500/40 text-vrverse-300' : 'bg-black/40 border-white/10 text-white/70 hover:text-white'}`}
                  title="Performance Debug Panel"
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Developer Debug Panel */}
        <AnimatePresence>
          {showDebug && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute top-16 right-4 w-60 bg-black/60 backdrop-blur-2xl border border-white/15 p-4 rounded-2xl text-white font-mono text-xs z-30 space-y-2 shadow-2xl"
            >
              <div className="flex justify-between border-b border-white/10 pb-1">
                <span className="text-white/50">Performance Monitor</span>
                <span className="text-vrverse-400 font-bold">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span>FPS</span>
                <span className={`font-bold ${debugStats.fps >= 55 ? 'text-green-400' : debugStats.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {debugStats.fps} fps
                </span>
              </div>
              <div className="flex justify-between">
                <span>Decoded Frames</span>
                <span>{debugStats.decodedFrames}</span>
              </div>
              <div className="flex justify-between">
                <span>Dropped Frames</span>
                <span className={debugStats.droppedFrames > 0 ? 'text-red-400 font-bold' : ''}>
                  {debugStats.droppedFrames}
                </span>
              </div>
              <div className="flex justify-between">
                <span>JS Memory</span>
                <span>{debugStats.memoryUsage ? `${debugStats.memoryUsage} MB` : 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-1 mt-1 text-[10px] text-white/40">
                <span>WebGL2 context</span>
                <span>Enabled</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Bookmarks Drawer */}
        <AnimatePresence>
          {showBookmarks && (
            <motion.div
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="absolute top-16 left-4 bottom-20 w-64 bg-black/60 backdrop-blur-2xl border border-white/15 p-4 rounded-2xl text-white z-30 shadow-2xl flex flex-col pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/50">Video Bookmarks</span>
                <button 
                  onClick={addBookmark}
                  className="text-[10px] bg-vrverse-500 hover:bg-vrverse-600 px-2 py-1 rounded-lg text-white font-bold transition-colors"
                >
                  + Add Marker
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {bookmarks.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-[11px] text-white/30 italic">No bookmarks recorded. Add markers to jump to timestamps.</p>
                  </div>
                ) : (
                  bookmarks.map((bm, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <button 
                        onClick={() => seek(bm.time)}
                        className="text-left text-xs font-semibold truncate flex-1 hover:text-vrverse-400"
                      >
                        {bm.label}
                      </button>
                      <button 
                        onClick={() => removeBookmark(idx)}
                        className="text-white/40 hover:text-red-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Primary Floating Glassmorphic Main Controls Overlay */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-black/30 backdrop-blur-xl border border-white/10 p-4 rounded-2xl z-30 flex flex-col gap-3 shadow-2xl pointer-events-auto mt-auto"
            >
              {/* Dynamic Playhead Slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/60 font-mono">{formatTime(currentTime)}</span>
                <div className="relative flex-1 group/slider">
                  <input 
                    type="range" 
                    min={0} 
                    max={duration || 1} 
                    step={0.1}
                    value={currentTime}
                    onChange={e => seek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer outline-none transition-all duration-300 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-vrverse-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-200 group-hover/slider:[&::-webkit-slider-thumb]:scale-125"
                  />
                </div>
                <span className="text-xs text-white/60 font-mono">{formatTime(duration)}</span>
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex items-center justify-between">
                {/* Play, Volume, Loop Controls */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center border border-white/10"
                  >
                    {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
                  </button>

                  <div className="flex items-center gap-2 group/volume">
                    <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>

                  {/* Bookmarks toggle */}
                  <button 
                    onClick={() => setShowBookmarks(!showBookmarks)}
                    className={`p-2 rounded-xl transition-all border ${showBookmarks ? 'bg-vrverse-500/20 border-vrverse-500/40 text-vrverse-300' : 'bg-transparent border-transparent text-white/60 hover:text-white hover:bg-white/5'}`}
                    title="Video Bookmarks"
                  >
                    <Bookmark className="w-4 h-4" />
                  </button>
                </div>

                {/* Central Format Controls (VR Cinema / 180 / 360 / SBS / Mono) */}
                <div className="flex items-center gap-1.5 bg-black/40 p-1 border border-white/10 rounded-xl">
                  {/* 180 / 360 / Cinema Toggle */}
                  <button 
                    onClick={() => setProjectionMode('vr180')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${projectionMode === 'vr180' ? 'bg-vrverse-500 text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    180°
                  </button>
                  <button 
                    onClick={() => setProjectionMode('vr360')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${projectionMode === 'vr360' ? 'bg-vrverse-500 text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    360°
                  </button>
                  <button 
                    onClick={() => setProjectionMode('cinema')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${projectionMode === 'cinema' ? 'bg-vrverse-500 text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    Cinema
                  </button>
                  
                  <span className="w-px h-4 bg-white/10 mx-1"></span>

                  {/* SBS / Mono / OU Toggle */}
                  <button 
                    onClick={() => setStereoLayout('mono')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${stereoLayout === 'mono' ? 'bg-vrverse-500/30 text-vrverse-300' : 'text-white/60 hover:text-white'}`}
                  >
                    Mono
                  </button>
                  <button 
                    onClick={() => setStereoLayout('sbs')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${stereoLayout === 'sbs' ? 'bg-vrverse-500/30 text-vrverse-300' : 'text-white/60 hover:text-white'}`}
                  >
                    SBS
                  </button>
                  <button 
                    onClick={() => setStereoLayout('ou')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${stereoLayout === 'ou' ? 'bg-vrverse-500/30 text-vrverse-300' : 'text-white/60 hover:text-white'}`}
                  >
                    OU
                  </button>
                </div>

                {/* Calibration, Sensor re-alignment, WebXR and Fullscreen toggles */}
                <div className="flex items-center gap-2">
                  <select 
                    value={playbackRate} 
                    onChange={e => setPlaybackRate(parseFloat(e.target.value))}
                    className="bg-white/10 text-white text-xs font-bold px-2 py-1.5 rounded-xl border border-white/10 outline-none pr-4 cursor-pointer"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => <option key={r} value={r} className="bg-neutral-900 text-white">{r}x</option>)}
                  </select>

                  {/* WebXR HMD Session Toggle */}
                  {isVRAvailable && (
                    <button 
                      onClick={toggleVR} 
                      className="px-3 py-1.5 rounded-xl bg-vrverse-500 hover:bg-vrverse-600 text-white transition-all text-xs font-bold flex items-center gap-1 border border-vrverse-400/20"
                      title={xrSession ? "Exit VR Mode" : "Enter VR Mode"}
                    >
                      <Glasses className="w-4 h-4" />
                      <span>{xrSession ? "Exit VR" : "Enter VR"}</span>
                    </button>
                  )}

                  {/* Cardboard Dual View Mode Splitter Toggle */}
                  <button 
                    onClick={toggleCardboardMode}
                    className={`px-3 py-2.5 rounded-xl border flex items-center gap-1.5 transition-all ${cardboardSplitMode ? 'bg-vrverse-500 border-vrverse-400 text-white shadow-lg shadow-vrverse-500/30' : 'bg-white/10 border-white/10 text-white/70 hover:text-white hover:bg-white/20'}`}
                    title="Toggle Cardboard Split-Screen VR Mode"
                  >
                    <Glasses className="w-4 h-4" />
                    <span className="text-xs font-bold hidden sm:inline">
                      {cardboardSplitMode ? "Exit VR" : (isMobile ? "Enter VR" : "Cardboard VR")}
                    </span>
                  </button>

                  {/* Gyro Sensor headtracking toggle */}
                  {isGyroAvailable && (
                    <button 
                      onClick={toggleGyro}
                      className={`p-2.5 rounded-xl border transition-all ${gyroEnabled ? 'bg-vrverse-500/20 border-vrverse-500/40 text-vrverse-300' : 'bg-white/10 border-white/10 text-white/70 hover:text-white hover:bg-white/20'}`}
                      title={gyroEnabled ? "Disable Gyro Head Tracking" : "Enable Gyro Head Tracking"}
                    >
                      <Compass className="w-4 h-4" />
                    </button>
                  )}

                  <button 
                    onClick={recenterHeading} 
                    className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                    title="Recenter Camera Heading"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => setShowCalibration(!showCalibration)}
                    className={`p-2.5 rounded-xl border transition-all ${showCalibration ? 'bg-vrverse-500/20 border-vrverse-500/40 text-vrverse-300' : 'bg-white/10 border-white/10 text-white/70 hover:text-white hover:bg-white/20'}`}
                    title="Open Lens Calibration & Adjustment"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={toggleFullscreen} 
                    className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calibration Drawer */}
        <AnimatePresence>
          {showCalibration && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-24 right-4 w-96 max-h-[70%] bg-black/60 backdrop-blur-2xl border border-white/15 p-5 rounded-2xl text-white z-30 shadow-2xl flex flex-col space-y-4 overflow-y-auto custom-scrollbar pointer-events-auto"
            >
              {/* Header & Close */}
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-sm font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-vrverse-400" />
                  Headset Calibration
                </span>
                <button onClick={() => setShowCalibration(false)} className="text-white/40 hover:text-white text-sm">✕</button>
              </div>

              {/* Presets dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] text-white/50 uppercase font-bold">Select Headset Profile</label>
                <select 
                  value={activeProfile}
                  onChange={e => handleProfileChange(e.target.value)}
                  className="w-full bg-white/5 text-white text-xs font-bold border border-white/15 px-3 py-2 rounded-xl outline-none"
                >
                  {Object.keys(HEADSET_PROFILES).map(key => (
                    <option key={key} value={key} className="bg-neutral-900 text-white">
                      {HEADSET_PROFILES[key].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Distortion Toggle */}
              <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl">
                <span className="text-xs font-bold text-white/70">Enable Barrel Lens Distortion</span>
                <button 
                  onClick={() => {
                    const next = !distortionOn;
                    setDistortionOn(next);
                    if (distortionRef.current) distortionRef.current.toggleDistortion(next);
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${distortionOn ? 'bg-vrverse-500 text-white' : 'bg-neutral-700 text-white/50'}`}
                >
                  {distortionOn ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Calibration Sliders */}
              <div className="space-y-3">
                <div className="border-b border-white/5 pb-1">
                  <span className="text-[10px] text-vrverse-300 font-bold uppercase tracking-wider">Geometric Alignment</span>
                </div>
                
                {/* IPD Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Interpupillary Distance (IPD)</span>
                    <span className="text-vrverse-400 font-mono">{(ipdSlider * 1000).toFixed(1)} mm</span>
                  </div>
                  <input 
                    type="range" min={0.04} max={0.08} step={0.001} value={ipdSlider}
                    onChange={e => setIpdSlider(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full"
                  />
                </div>

                {/* FOV Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Viewer Zoom (FOV)</span>
                    <span className="text-vrverse-400 font-mono">{Math.round(fovSlider)}°</span>
                  </div>
                  <input 
                    type="range" min={50} max={120} step={1} value={fovSlider}
                    onChange={e => setFovSlider(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full"
                  />
                </div>

                {/* Distortion k1 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Distortion Coefficient k1</span>
                    <span className="text-vrverse-400 font-mono">{k1Slider.toFixed(3)}</span>
                  </div>
                  <input 
                    type="range" min={0.0} max={0.8} step={0.01} value={k1Slider}
                    onChange={e => setK1Slider(parseFloat(e.target.value))}
                    disabled={!distortionOn}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full disabled:opacity-30"
                  />
                </div>

                {/* Distortion k2 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Distortion Coefficient k2</span>
                    <span className="text-vrverse-400 font-mono">{k2Slider.toFixed(3)}</span>
                  </div>
                  <input 
                    type="range" min={0.0} max={0.8} step={0.01} value={k2Slider}
                    onChange={e => setK2Slider(parseFloat(e.target.value))}
                    disabled={!distortionOn}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full disabled:opacity-30"
                  />
                </div>

                {/* Chromatic Aberration */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Chromatic Correction</span>
                    <span className="text-vrverse-400 font-mono">{chromaticSlider.toFixed(4)}</span>
                  </div>
                  <input 
                    type="range" min={0.0} max={0.015} step={0.0005} value={chromaticSlider}
                    onChange={e => setChromaticSlider(parseFloat(e.target.value))}
                    disabled={!distortionOn}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full disabled:opacity-30"
                  />
                </div>

                {/* Edge Mask Radius */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Edge Mask Radius (Corner Crop)</span>
                    <span className="text-vrverse-400 font-mono">{maskSlider.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min={0.5} max={1.0} step={0.01} value={maskSlider}
                    onChange={e => setMaskSlider(parseFloat(e.target.value))}
                    disabled={!distortionOn}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full disabled:opacity-30"
                  />
                </div>
              </div>

              {/* Visual Adjustments Sliders */}
              <div className="space-y-3 pt-2">
                <div className="border-b border-white/5 pb-1">
                  <span className="text-[10px] text-vrverse-300 font-bold uppercase tracking-wider">Visual Adjustments</span>
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Brightness</span>
                    <span className="text-vrverse-400 font-mono">{brightness > 0 ? `+${brightness.toFixed(2)}` : brightness.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min={-0.3} max={0.3} step={0.01} value={brightness}
                    onChange={e => setBrightness(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Contrast</span>
                    <span className="text-vrverse-400 font-mono">{contrast.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" min={0.6} max={1.4} step={0.02} value={contrast}
                    onChange={e => setContrast(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Saturation</span>
                    <span className="text-vrverse-400 font-mono">{saturation.toFixed(2)}x</span>
                  </div>
                  <input 
                    type="range" min={0.3} max={1.7} step={0.02} value={saturation}
                    onChange={e => setSaturation(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full"
                  />
                </div>

                {/* Gamma */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white/60">Gamma</span>
                    <span className="text-vrverse-400 font-mono">{gamma.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range" min={0.5} max={2.0} step={0.05} value={gamma}
                    onChange={e => setGamma(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/15 appearance-none rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full aspect-video bg-neutral-950 rounded-2xl overflow-hidden group shadow-2xl border border-white/5 select-none animate-fade-in ${
        cardboardSplitMode ? '!fixed !inset-0 !w-screen !h-screen !z-[99999] !rounded-none !border-none' : ''
      }`}
      onPointerDown={handlePointerDown} 
      onPointerMove={handlePointerMove} 
      onPointerUp={handlePointerUp} 
      onPointerLeave={handlePointerUp}
      onPointerMoveCapture={handlePointerMovePlayer}
      onWheel={handleWheel}
    >
      {/* Three.js Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Render overlay elements based on view mode (split side-by-side vs mono) */}
      {cardboardSplitMode ? (
        <div className="absolute inset-0 pointer-events-none flex z-30">
          {/* Left Eye Overlay */}
          <div className="relative w-1/2 h-full border-r border-white/5 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 scale-[0.8] origin-center pointer-events-none">
              {renderUIElements('left')}
            </div>
          </div>
          {/* Right Eye Overlay */}
          <div className="relative w-1/2 h-full overflow-hidden pointer-events-none">
            <div className="absolute inset-0 scale-[0.8] origin-center pointer-events-none">
              {renderUIElements('right')}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 pointer-events-auto z-30">
          {renderUIElements('mono')}
        </div>
      )}

      {/* Floating VR/Fullscreen Shortcut Badge on top-right of the video in flat mode when controls are visible */}
      {showControls && !cardboardSplitMode && (
        <div className="absolute top-20 right-4 z-40 pointer-events-auto">
          <motion.button
            onClick={toggleCardboardMode}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 px-4 py-2 bg-vrverse-500 hover:bg-vrverse-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-vrverse-500/25 border border-vrverse-400/20"
          >
            <Glasses className="w-4 h-4" />
            <span>Enter VR (Fullscreen)</span>
          </motion.button>
        </div>
      )}

      {/* Large play/VR overlay when paused (only in mono/flat screen view) */}
      {!isPlaying && !cardboardSplitMode && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 cursor-pointer pointer-events-auto z-40 gap-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) togglePlay();
          }}
        >
          <div className="flex gap-4">
            {/* Centered Play Button */}
            <motion.div 
              onClick={togglePlay}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20 shadow-2xl cursor-pointer"
            >
              <Play className="w-6 h-6 text-white ml-1" />
            </motion.div>

            {/* Centered Cardboard VR Button */}
            <motion.div 
              onClick={toggleCardboardMode}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-full bg-vrverse-500 hover:bg-vrverse-600 flex items-center justify-center border border-vrverse-400/20 shadow-2xl cursor-pointer"
              title="Enter Cardboard VR / Fullscreen"
            >
              <Glasses className="w-6 h-6 text-white" />
            </motion.div>
          </div>
          <span className="text-white/80 text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/5 pointer-events-none">
            Play Video  •  Start Cardboard VR Mode
          </span>
        </div>
      )}

      {/* Motion Sensor Permissions Warning Overlay */}
      <AnimatePresence>
        {showSensorWarning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-6 text-center pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-xs bg-neutral-900 border border-white/10 p-5 rounded-2xl space-y-3"
            >
              <Compass className="w-8 h-8 text-vrverse-400 mx-auto animate-pulse" />
              <h3 className="text-white font-bold text-sm">Motion Sensors Blocked</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                Your browser is blocking motion sensor access. Please enable "Motion Sensors" or "Device Orientation" in your browser's site settings to look around using head tracking.
              </p>
              <button 
                onClick={() => setShowSensorWarning(false)}
                className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all"
              >
                Dismiss
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Landscape Orientation Requirement Overlay */}
      <AnimatePresence>
        {cardboardSplitMode && isPortrait && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 z-[100000] p-6 text-center pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md space-y-6 flex flex-col items-center"
            >
              {/* Rotating Phone Animation */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, 90, 90, 0, 0] }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity, 
                    ease: "easeInOut",
                    repeatDelay: 0.5 
                  }}
                  className="w-10 h-16 border-4 border-vrverse-400 rounded-xl relative flex items-center justify-center bg-neutral-900"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-vrverse-400/40 absolute top-1.5" />
                  <div className="w-5 h-8 border border-vrverse-400/20 rounded bg-black/40 flex items-center justify-center text-[8px] font-bold text-vrverse-400/80">
                    VR
                  </div>
                  <div className="w-2 h-2 rounded-full bg-vrverse-400 absolute bottom-1" />
                </motion.div>
                
                {/* Curved Arrow showing Rotation Direction */}
                <motion.div 
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.95, 1.05, 0.95] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full pointer-events-none"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-white font-bold text-lg tracking-wide">Please Rotate Your Device</h3>
                <p className="text-white/60 text-xs leading-relaxed max-w-xs">
                  Cardboard VR split-screen mode requires landscape orientation. Please unlock your device's system <strong>Orientation Lock</strong> / <strong>Auto-Rotate</strong> setting.
                </p>
              </div>

              <button 
                onClick={toggleCardboardMode}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-xl text-xs font-bold transition-all border border-white/5"
              >
                Exit VR Mode
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
