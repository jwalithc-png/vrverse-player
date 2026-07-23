/**
 * VRVerse Player — Home Page
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Play, Globe, Eye, Sparkles, ArrowRight, Clock, Zap } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { videoApi } from '../services/api';
import type { Video } from '../types';
import { formatDuration, formatRelativeTime } from '../utils/formatters';

export function HomePage() {
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);

  useEffect(() => {
    videoApi.getAll().then(res => setRecentVideos(res.videos.slice(0, 6))).catch(() => {});
  }, []);

  return (
    <div className="page-enter space-y-12">
      {/* Hero Section */}
      <section className="relative text-center py-20">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vrverse-500/10 border border-vrverse-500/20 text-vrverse-300 text-sm mb-8">
            <Sparkles className="w-4 h-4" /> Immersive VR Video Experience
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-6">
            <span className="gradient-text">VRVerse</span>
            <br />
            <span className="text-white/90">Player</span>
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Transform any video into an immersive VR experience. Upload, convert, and watch in 180° or 360° virtual reality — right in your browser.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/upload">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="gradient-button flex items-center gap-2 text-lg px-8 py-4">
                <Upload className="w-5 h-5" /> Upload Video <ArrowRight className="w-4 h-4 ml-1" />
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-vrverse-500/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-white/90 mb-6">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Globe, title: '360° VR', desc: 'Full spherical projection for complete immersion', gradient: 'from-purple-500 to-pink-500' },
            { icon: Eye, title: '180° VR', desc: 'Front-facing hemispherical projection', gradient: 'from-vrverse-500 to-purple-500' },
            { icon: Zap, title: 'Fast Processing', desc: 'Multi-threaded FFmpeg pipeline with real-time progress', gradient: 'from-amber-500 to-orange-500' },
          ].map((f, i) => (
            <GlassCard key={i} className="p-6">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white/90 mb-2">{f.title}</h3>
              <p className="text-sm text-white/50">{f.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white/90">Recent Videos</h2>
            <Link to="/history" className="text-sm text-vrverse-400 hover:text-vrverse-300 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentVideos.map(v => (
              <Link key={v.id} to={`/convert/${v.id}`}>
                <GlassCard className="overflow-hidden cursor-pointer">
                  <div className="aspect-video bg-black/40 flex items-center justify-center relative">
                    {v.thumbnailPath ? (
                      <img src={videoApi.getThumbnailUrl(v.id)} alt={v.originalName} className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-10 h-10 text-white/10" />
                    )}
                    {v.duration > 0 && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white">{formatDuration(v.duration)}</span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium text-white/80 truncate">{v.originalName}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                      <Clock className="w-3 h-3" /> {formatRelativeTime(v.createdAt)}
                    </div>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
