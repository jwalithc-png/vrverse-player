/**
 * VRVerse Player — Settings Page
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';
import { settingsApi } from '../services/api';

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { settingsApi.getAll().then(r => setSettings(r.settings)).catch(() => {}); }, []);

  const update = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }));

  const save = async () => {
    try { await settingsApi.updateMany(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); } catch {}
  };

  const reset = () => setSettings({
    defaultResolution: '1080p', defaultFps: '30', defaultBitrate: '5M',
    defaultQuality: 'high', theme: 'dark', maxUploadSize: String(500 * 1024 * 1024),
  });

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vrverse-500 to-purple-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white/90">Settings</h1>
        </div>
      </motion.div>

      <GlassCard className="p-6 space-y-6" hover={false}>
        <h3 className="text-lg font-semibold text-white/90">Default Conversion Settings</h3>

        <div>
          <label className="text-sm text-white/50 mb-2 block">Default Resolution</label>
          <div className="grid grid-cols-4 gap-2">
            {['720p', '1080p', '1440p', '4k'].map(r => (
              <button key={r} onClick={() => update('defaultResolution', r)}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${settings.defaultResolution === r ? 'bg-vrverse-500/30 text-vrverse-300 border border-vrverse-500/40' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'}`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/50 mb-2 block">Default FPS</label>
          <div className="grid grid-cols-2 gap-2">
            {['30', '60'].map(f => (
              <button key={f} onClick={() => update('defaultFps', f)}
                className={`py-2 rounded-xl text-sm font-medium transition-all ${settings.defaultFps === f ? 'bg-vrverse-500/30 text-vrverse-300 border border-vrverse-500/40' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'}`}>
                {f} FPS
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-white/50 mb-2 block">Default Bitrate</label>
          <select value={settings.defaultBitrate || '5M'} onChange={e => update('defaultBitrate', e.target.value)} className="glass-input w-full">
            <option value="3M">3 Mbps</option><option value="5M">5 Mbps</option>
            <option value="8M">8 Mbps</option><option value="12M">12 Mbps</option><option value="20M">20 Mbps</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-white/50 mb-2 block">Default Quality</label>
          <div className="grid grid-cols-4 gap-2">
            {['low', 'medium', 'high', 'ultra'].map(q => (
              <button key={q} onClick={() => update('defaultQuality', q)}
                className={`py-2 rounded-xl text-sm font-medium capitalize transition-all ${settings.defaultQuality === q ? 'bg-vrverse-500/30 text-vrverse-300 border border-vrverse-500/40' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="flex gap-3">
        <button onClick={save} className="gradient-button flex items-center gap-2">
          <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button onClick={reset} className="glass-button flex items-center gap-2 text-white/50">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>
    </div>
  );
}
