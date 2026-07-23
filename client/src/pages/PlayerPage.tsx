/**
 * VRVerse Player — Player Page
 */
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { VRPlayer } from '../components/player/VRPlayer';
import { NormalPlayer } from '../components/player/NormalPlayer';
import { videoApi, conversionApi } from '../services/api';

export function PlayerPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'normal';
  const conversionId = searchParams.get('conversionId');

  const videoUrl = conversionId
    ? conversionApi.getStreamUrl(conversionId)
    : videoApi.getStreamUrl(videoId || '');

  return (
    <div className="page-enter max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white/90 mb-1">
          {mode === 'normal' ? 'Video Player' : mode === 'vr360' ? '360° VR Player' : '180° VR Player'}
        </h1>
        <p className="text-sm text-white/40">
          {mode !== 'normal' ? 'Drag to look around • Scroll to zoom • Double-click sides to skip' : 'Standard video playback'}
        </p>
      </motion.div>

      {mode === 'normal' ? (
        <NormalPlayer videoUrl={videoUrl} />
      ) : (
        <VRPlayer videoUrl={videoUrl} vrMode={mode as 'vr180' | 'vr360'} videoId={videoId} />
      )}
    </div>
  );
}
