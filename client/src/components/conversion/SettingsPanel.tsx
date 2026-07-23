/**
 * VRVerse Player — Settings Panel Component
 * Conversion settings form for resolution, FPS, bitrate, quality.
 */
import type { ConversionSettings, Resolution, Quality, ProjectionType } from '../../types';

interface SettingsPanelProps {
  settings: ConversionSettings;
  onChange: (settings: ConversionSettings) => void;
  vrMode: string;
}

export function SettingsPanel({ settings, onChange, vrMode }: SettingsPanelProps) {
  const update = (key: keyof ConversionSettings, value: any) => onChange({ ...settings, [key]: value });

  return (
    <div className="glass-card p-6 space-y-5">
      <h3 className="text-lg font-semibold text-white/90">Conversion Settings</h3>

      {/* Resolution */}
      <div>
        <label className="text-sm text-white/50 mb-2 block">Output Resolution</label>
        <div className="grid grid-cols-4 gap-2">
          {(['720p', '1080p', '1440p', '4k'] as Resolution[]).map(r => (
            <button key={r} onClick={() => update('outputResolution', r)}
              className={`py-2 rounded-xl text-sm font-medium transition-all ${settings.outputResolution === r ? 'bg-vrverse-500/30 text-vrverse-300 border border-vrverse-500/40' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div>
        <label className="text-sm text-white/50 mb-2 block">Output FPS</label>
        <div className="grid grid-cols-2 gap-2">
          {[30, 60].map(fps => (
            <button key={fps} onClick={() => update('outputFps', fps)}
              className={`py-2 rounded-xl text-sm font-medium transition-all ${settings.outputFps === fps ? 'bg-vrverse-500/30 text-vrverse-300 border border-vrverse-500/40' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'}`}>
              {fps} FPS
            </button>
          ))}
        </div>
      </div>

      {/* Bitrate */}
      <div>
        <label className="text-sm text-white/50 mb-2 block">Output Bitrate</label>
        <select value={settings.outputBitrate} onChange={e => update('outputBitrate', e.target.value)}
          className="glass-input w-full">
          <option value="3M">3 Mbps (Low)</option>
          <option value="5M">5 Mbps (Medium)</option>
          <option value="8M">8 Mbps (High)</option>
          <option value="12M">12 Mbps (Very High)</option>
          <option value="20M">20 Mbps (Ultra)</option>
        </select>
      </div>

      {/* Quality */}
      <div>
        <label className="text-sm text-white/50 mb-2 block">Projection Quality</label>
        <div className="grid grid-cols-4 gap-2">
          {(['low', 'medium', 'high', 'ultra'] as Quality[]).map(q => (
            <button key={q} onClick={() => update('projectionQuality', q)}
              className={`py-2 rounded-xl text-sm font-medium capitalize transition-all ${settings.projectionQuality === q ? 'bg-vrverse-500/30 text-vrverse-300 border border-vrverse-500/40' : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'}`}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Projection Type */}
      {vrMode !== 'normal' && (
        <div>
          <label className="text-sm text-white/50 mb-2 block">Projection Type</label>
          <select value={settings.projectionType} onChange={e => update('projectionType', e.target.value as ProjectionType)}
            className="glass-input w-full">
            <option value="equirectangular">Equirectangular</option>
            <option value="fisheye">Fisheye</option>
            <option value="hemisphere">Hemisphere</option>
            <option value="cubemap">Cube Map</option>
            <option value="perspective">Perspective</option>
          </select>
        </div>
      )}
    </div>
  );
}
