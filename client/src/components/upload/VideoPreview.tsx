/**
 * VRVerse Player — Video Preview Component
 * Displays uploaded video info with thumbnail, metadata, and action buttons.
 */

import { motion } from 'framer-motion';
import { Play, Clock, Monitor, Zap, Trash2 } from 'lucide-react';
import type { Video } from '../../types';
import { videoApi } from '../../services/api';
import { formatBytes, formatDuration, formatResolution } from '../../utils/formatters';

interface VideoPreviewProps {
  video: Video;
  onSelectMode: () => void;
  onDelete?: () => void;
}

export function VideoPreview({ video, onSelectMode, onDelete }: VideoPreviewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black/40 overflow-hidden">
        {video.thumbnailPath ? (
          <img
            src={videoApi.getThumbnailUrl(video.id)}
            alt={video.originalName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-16 h-16 text-white/10" />
          </div>
        )}

        {/* Duration overlay */}
        {video.duration > 0 && (
          <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm text-xs font-medium text-white">
            {formatDuration(video.duration)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5">
        <h3 className="text-base font-semibold text-white/90 truncate mb-3">{video.originalName}</h3>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Monitor className="w-4 h-4" />
            <span>{video.width && video.height ? formatResolution(video.width, video.height) : 'Unknown'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(video.duration)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Zap className="w-4 h-4" />
            <span>{video.fps > 0 ? `${video.fps} FPS` : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Play className="w-4 h-4" />
            <span>{formatBytes(video.size)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onSelectMode} className="gradient-button flex-1 flex items-center justify-center gap-2">
            <Play className="w-4 h-4" />
            Choose VR Mode
          </button>
          {onDelete && (
            <button onClick={onDelete} className="glass-button px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
