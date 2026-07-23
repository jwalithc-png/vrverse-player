import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Trash2, Play, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../components/ui/GlassCard';
import { historyApi, conversionApi, videoApi } from '../services/api';
import { formatRelativeTime, getVRModeLabel } from '../utils/formatters';

export function DownloadsPage() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { historyApi.getDownloads().then(r => { setDownloads(r.downloads); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  if (loading) return <div className="flex justify-center h-96 items-center"><div className="animate-spin w-8 h-8 border-2 border-vrverse-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"><Download className="w-5 h-5 text-white" /></div>
          <h1 className="text-3xl font-bold text-white/90">Downloads</h1>
        </div>
        <p className="text-white/50">Your converted VR videos ready for download.</p>
      </motion.div>
      {downloads.length === 0 ? (
        <GlassCard className="p-12 text-center" hover={false}><AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" /><p className="text-white/50">No downloads yet.</p></GlassCard>
      ) : (
        <div className="space-y-3">{downloads.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 flex items-center gap-4">
              <div className="w-24 h-14 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {d.video?.thumbnailPath ? <img src={videoApi.getThumbnailUrl(d.video.id)} alt="" className="w-full h-full object-cover" /> : <Play className="w-6 h-6 text-white/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{d.video?.originalName || 'Converted Video'}</p>
                <div className="flex gap-3 mt-1 text-xs text-white/30">
                  <span className="text-emerald-400">{getVRModeLabel(d.vrMode)}</span>
                  <span>{d.outputResolution}</span>
                  <span>{formatRelativeTime(d.completedAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/player/${d.videoId}?mode=${d.vrMode}&conversionId=${d.id}`} className="p-2 rounded-lg hover:bg-white/10"><Play className="w-4 h-4 text-vrverse-400" /></Link>
                <a href={conversionApi.getDownloadUrl(d.id)} className="gradient-button px-4 py-2 flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Download</a>
                <button onClick={async () => { await conversionApi.delete(d.id); load(); }} className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-white/30" /></button>
              </div>
            </GlassCard>
          </motion.div>
        ))}</div>
      )}
    </div>
  );
}
