import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Play, Trash2, Download, AlertCircle } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { historyApi, conversionApi, videoApi } from '../services/api';
import type { HistoryItem } from '../types';
import { formatRelativeTime, getVRModeLabel, getStatusColor } from '../utils/formatters';

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const load = () => { historyApi.getAll().then(r => { setHistory(r.history); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(load, []);

  const handleDelete = async (id: string) => { if (!confirm('Delete?')) return; await conversionApi.delete(id); load(); };

  if (loading) return <div className="flex justify-center h-96 items-center"><div className="animate-spin w-8 h-8 border-2 border-vrverse-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="page-enter max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vrverse-500 to-purple-600 flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
          <h1 className="text-3xl font-bold text-white/90">History</h1>
        </div>
      </motion.div>
      {history.length === 0 ? (
        <GlassCard className="p-12 text-center" hover={false}><AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" /><p className="text-white/50">No conversions yet. <Link to="/upload" className="text-vrverse-400">Upload a video</Link> to get started.</p></GlassCard>
      ) : (
        <div className="space-y-3">{history.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard className="p-4 flex items-center gap-4">
              <div className="w-24 h-14 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {item.video?.thumbnailPath ? <img src={videoApi.getThumbnailUrl(item.video.id)} alt="" className="w-full h-full object-cover" /> : <Play className="w-6 h-6 text-white/10" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">{item.video?.originalName || 'Unknown'}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className={getStatusColor(item.status)}>{item.status}</span>
                  <span className="text-white/30">{getVRModeLabel(item.vrMode)}</span>
                  <span className="text-white/30">{formatRelativeTime(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.status === 'completed' && (<>
                  <Link to={`/player/${item.videoId}?mode=${item.vrMode}&conversionId=${item.id}`} className="p-2 rounded-lg hover:bg-white/10"><Play className="w-4 h-4 text-vrverse-400" /></Link>
                  <a href={conversionApi.getDownloadUrl(item.id)} className="p-2 rounded-lg hover:bg-white/10"><Download className="w-4 h-4 text-white/40" /></a>
                </>)}
                <button onClick={() => handleDelete(item.id)} className="p-2 rounded-lg hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-white/30" /></button>
              </div>
            </GlassCard>
          </motion.div>
        ))}</div>
      )}
    </div>
  );
}
