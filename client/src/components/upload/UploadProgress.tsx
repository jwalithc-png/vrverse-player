/**
 * VRVerse Player — Upload Progress Component
 * Shows upload progress with animated bar and file info.
 */

import { motion } from 'framer-motion';
import { Film, X } from 'lucide-react';
import { formatBytes } from '../../utils/formatters';

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number;
  onCancel?: () => void;
}

export function UploadProgress({ fileName, fileSize, progress, onCancel }: UploadProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-vrverse-500/20 flex items-center justify-center">
            <Film className="w-6 h-6 text-vrverse-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/90 truncate max-w-[200px]">{fileName}</p>
            <p className="text-xs text-white/40">{formatBytes(fileSize)}</p>
          </div>
        </div>

        {onCancel && progress < 100 && (
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/40" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-vrverse-500 via-purple-500 to-pink-500"
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-white/40">
          {progress < 100 ? 'Uploading...' : 'Processing...'}
        </span>
        <span className="text-xs font-medium text-vrverse-400">{Math.round(progress)}%</span>
      </div>
    </motion.div>
  );
}
