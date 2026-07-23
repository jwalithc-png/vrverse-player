/**
 * VRVerse Player — Conversion Progress Component
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProgressCircle } from '../ui/ProgressCircle';
import { conversionApi } from '../../services/api';
import { formatETA } from '../../utils/formatters';
import type { Conversion } from '../../types';

interface ConversionProgressProps {
  conversionId: string;
  onComplete: (conversion: Conversion) => void;
  onCancel: () => void;
}

export function ConversionProgress({ conversionId, onComplete, onCancel }: ConversionProgressProps) {
  const [conversion, setConversion] = useState<Conversion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const poll = async () => {
      try {
        const { conversion: c } = await conversionApi.getStatus(conversionId);
        setConversion(c);
        if (c.status === 'completed') { clearInterval(interval); onComplete(c); }
        if (c.status === 'failed') { clearInterval(interval); setError(c.error || 'Conversion failed'); }
        if (c.status === 'cancelled') { clearInterval(interval); }
      } catch (err: any) { setError(err.message); clearInterval(interval); }
    };
    poll();
    interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [conversionId, onComplete]);

  const handleCancel = async () => {
    try { await conversionApi.cancel(conversionId); onCancel(); } catch {}
  };

  const status = conversion?.status || 'queued';
  const progress = conversion?.progress || 0;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-10 text-center max-w-lg mx-auto">
      {status === 'completed' ? (
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="w-20 h-20 text-emerald-400" />
          <h3 className="text-2xl font-bold text-white">Conversion Complete!</h3>
          <p className="text-white/50">Your VR video is ready to play.</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-20 h-20 text-red-400" />
          <h3 className="text-2xl font-bold text-white">Conversion Failed</h3>
          <p className="text-red-400/80 text-sm">{error}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <ProgressCircle progress={progress} stage={conversion?.currentStage || 'Initializing...'} size={180} strokeWidth={10} />
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Converting to {conversion?.vrMode === 'vr360' ? '360°' : '180°'} VR</h3>
            <p className="text-sm text-white/40">{formatETA(conversion?.estimatedTimeRemaining || 0)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-xs text-sm">
            <div className="glass rounded-xl p-3"><p className="text-white/40 text-xs">Stage</p><p className="text-white/80 font-medium">{conversion?.currentStage || 'Queued'}</p></div>
            <div className="glass rounded-xl p-3"><p className="text-white/40 text-xs">Progress</p><p className="text-white/80 font-medium">{Math.round(progress)}%</p></div>
          </div>
          <button onClick={handleCancel} className="glass-button flex items-center gap-2 text-red-400 hover:bg-red-500/10">
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}
