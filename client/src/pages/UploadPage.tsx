/**
 * VRVerse Player — Upload Page
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { DropZone } from '../components/upload/DropZone';
import { UploadProgress } from '../components/upload/UploadProgress';
import { VideoPreview } from '../components/upload/VideoPreview';
import { videoApi } from '../services/api';
import type { Video } from '../types';

export function UploadPage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setSelectedFile(file);
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      const result = await videoApi.upload(file, (p) => setProgress(p));
      setVideo(result.video);
      setUploading(false);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vrverse-500 to-purple-600 flex items-center justify-center">
            <Upload className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white/90">Upload Video</h1>
        </div>
        <p className="text-white/50">Upload a video file to convert it into an immersive VR experience.</p>
      </motion.div>

      {!video && !uploading && <DropZone onFileSelect={handleUpload} />}
      {uploading && selectedFile && <UploadProgress fileName={selectedFile.name} fileSize={selectedFile.size} progress={progress} />}
      {error && <div className="glass-card p-4 border-red-500/20 text-red-400 text-sm">{error}</div>}
      {video && (
        <VideoPreview video={video} onSelectMode={() => navigate(`/convert/${video.id}`)}
          onDelete={() => { videoApi.delete(video.id); setVideo(null); }} />
      )}
    </div>
  );
}
