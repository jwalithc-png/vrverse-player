/**
 * VRVerse Player — Drop Zone Component
 * Drag-and-drop file upload with animated border and file validation.
 */

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Film, AlertCircle } from 'lucide-react';
import { isValidVideoFile, formatBytes } from '../../utils/formatters';

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function DropZone({ onFileSelect, disabled = false }: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!isValidVideoFile(file)) {
      setError('Unsupported format. Use MP4, MOV, AVI, MKV, or WEBM.');
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      setError(`File too large (${formatBytes(file.size)}). Maximum is 1GB.`);
      return;
    }

    onFileSelect(file);
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    disabled,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'],
    },
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`drop-zone p-12 text-center ${isDragActive ? 'active' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />

        <motion.div
          animate={isDragActive ? { scale: 1.05, y: -5 } : { scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-4"
        >
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragActive
              ? 'bg-vrverse-500/20 border-2 border-vrverse-500/50'
              : 'bg-white/5 border border-white/10'
          }`}>
            {isDragActive ? (
              <Film className="w-10 h-10 text-vrverse-400" />
            ) : (
              <Upload className="w-10 h-10 text-white/30" />
            )}
          </div>

          <div>
            <p className="text-lg font-semibold text-white/80">
              {isDragActive ? 'Drop your video here' : 'Drag & drop a video file'}
            </p>
            <p className="text-sm text-white/40 mt-1">
              or <span className="text-vrverse-400 hover:text-vrverse-300 cursor-pointer">browse files</span>
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'].map(fmt => (
              <span key={fmt} className="px-3 py-1 rounded-full bg-white/5 text-xs text-white/40 border border-white/5">
                {fmt}
              </span>
            ))}
          </div>

          <p className="text-xs text-white/25 mt-2">Maximum file size: 1GB</p>
        </motion.div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
