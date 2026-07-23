/**
 * VRVerse Player — Normal Player Component
 * Standard HTML5 video player with custom controls.
 */
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Maximize, Volume2, VolumeX, SkipForward, SkipBack } from 'lucide-react';

interface NormalPlayerProps { videoUrl: string; }

export function NormalPlayer({ videoUrl }: NormalPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); setIsPlaying(true); }
    else { videoRef.current.pause(); setIsPlaying(false); }
  };
  const seek = (t: number) => { if (videoRef.current) videoRef.current.currentTime = t; };
  const toggleMute = () => { if (videoRef.current) { videoRef.current.muted = !isMuted; setIsMuted(!isMuted); } };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group">
      <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain"
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onError={(e) => {
          const err = (e.target as HTMLVideoElement).error;
          alert(`Video playback error: ${err?.message || 'unknown error (code ' + err?.code + ')'}`);
        }}
        onClick={togglePlay} playsInline />

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <input type="range" min={0} max={duration || 1} step={0.1} value={currentTime}
          onChange={e => seek(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer mb-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-vrverse-400 [&::-webkit-slider-thumb]:rounded-full" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => seek(Math.max(0, currentTime - 10))} className="p-2 rounded-lg hover:bg-white/10"><SkipBack className="w-4 h-4 text-white/60" /></button>
            <button onClick={togglePlay} className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20">
              {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white ml-0.5" />}
            </button>
            <button onClick={() => seek(Math.min(duration, currentTime + 10))} className="p-2 rounded-lg hover:bg-white/10"><SkipForward className="w-4 h-4 text-white/60" /></button>
            <span className="text-xs text-white/60 font-mono">{fmt(currentTime)} / {fmt(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="p-2 rounded-lg hover:bg-white/10">
              {isMuted ? <VolumeX className="w-4 h-4 text-white/60" /> : <Volume2 className="w-4 h-4 text-white/60" />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={isMuted ? 0 : volume}
              onChange={e => { setVolume(parseFloat(e.target.value)); if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value); setIsMuted(false); }}
              className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full" />
            <button onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); else document.querySelector('.group')?.requestFullscreen?.(); }}
              className="p-2 rounded-lg hover:bg-white/10"><Maximize className="w-4 h-4 text-white/60" /></button>
          </div>
        </div>
      </div>
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/20">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </div>
      )}
    </motion.div>
  );
}
