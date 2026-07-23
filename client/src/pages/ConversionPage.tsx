/**
 * VRVerse Player — Conversion Page
 * Select VR mode, configure settings, and start conversion.
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wand2, Play, Settings2 } from 'lucide-react';
import { ModeSelector } from '../components/conversion/ModeSelector';
import { SettingsPanel } from '../components/conversion/SettingsPanel';
import { ConversionProgress } from '../components/conversion/ConversionProgress';
import { videoApi, conversionApi } from '../services/api';
import type { Video, VRMode, Conversion, ConversionSettings } from '../types';

export function ConversionPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [selectedMode, setSelectedMode] = useState<VRMode | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [conversionId, setConversionId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ConversionSettings>({
    outputResolution: '1080p', outputFps: 30, outputBitrate: '5M',
    projectionQuality: 'high', projectionType: 'equirectangular',
  });

  useEffect(() => {
    if (videoId) videoApi.getById(videoId).then(res => setVideo(res.video)).catch(() => navigate('/upload'));
  }, [videoId, navigate]);

  const startConversion = async () => {
    if (!videoId || !selectedMode) return;
    if (selectedMode === 'normal') { navigate(`/player/${videoId}?mode=normal`); return; }
    try {
      const result = await conversionApi.start({
        videoId, vrMode: selectedMode, projectionType: settings.projectionType,
        outputResolution: settings.outputResolution, outputFps: settings.outputFps,
        outputBitrate: settings.outputBitrate, projectionQuality: settings.projectionQuality,
      });
      setConversionId(result.conversion.id);
    } catch (err: any) { alert(err.message); }
  };

  const handleComplete = useCallback((c: Conversion) => {
    navigate(`/player/${videoId}?mode=${c.vrMode}&conversionId=${c.id}`);
  }, [videoId, navigate]);

  if (!video) return <div className="flex items-center justify-center h-96"><div className="animate-spin w-8 h-8 border-2 border-vrverse-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white/90 mb-1">Choose VR Mode</h1>
        <p className="text-white/50">Select how you want to experience <span className="text-vrverse-400">{video.originalName}</span></p>
      </motion.div>

      {!conversionId ? (
        <>
          <ModeSelector onSelect={setSelectedMode} selected={selectedMode || undefined} />

          {selectedMode && selectedMode !== 'normal' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <button onClick={() => setShowSettings(!showSettings)} className="glass-button flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4" /> {showSettings ? 'Hide' : 'Show'} Settings
              </button>
              {showSettings && <SettingsPanel settings={settings} onChange={setSettings} vrMode={selectedMode} />}
            </motion.div>
          )}

          {selectedMode && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-center pt-4">
              <button onClick={startConversion} className="gradient-button flex items-center gap-3 text-lg px-10 py-4">
                {selectedMode === 'normal' ? <><Play className="w-5 h-5" /> Play Now</> : <><Wand2 className="w-5 h-5" /> Start Conversion</>}
              </button>
            </motion.div>
          )}
        </>
      ) : (
        <ConversionProgress conversionId={conversionId} onComplete={handleComplete}
          onCancel={() => setConversionId(null)} />
      )}
    </div>
  );
}
