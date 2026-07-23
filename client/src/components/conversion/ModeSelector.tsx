/**
 * VRVerse Player — Mode Selector Component
 */
import { motion } from 'framer-motion';
import { Monitor, Eye, Globe } from 'lucide-react';
import type { VRMode } from '../../types';

interface ModeSelectorProps {
  onSelect: (mode: VRMode) => void;
  selected?: VRMode;
}

const modes = [
  { id: 'normal' as VRMode, icon: Monitor, title: 'Normal Player', desc: 'Play the original video without VR conversion.', gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-500/20' },
  { id: 'vr180' as VRMode, icon: Eye, title: 'VR 180°', desc: 'Immersive 180° hemispherical projection for front-facing VR.', gradient: 'from-vrverse-500 to-purple-500', shadow: 'shadow-vrverse-500/20', popular: true },
  { id: 'vr360' as VRMode, icon: Globe, title: 'VR 360°', desc: 'Full 360° equirectangular projection for complete immersion.', gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-500/20' },
];

export function ModeSelector({ onSelect, selected }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {modes.map((mode, i) => {
        const Icon = mode.icon;
        const isSelected = selected === mode.id;
        return (
          <motion.button key={mode.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.98 }} onClick={() => onSelect(mode.id)}
            className={`relative glass-card p-8 text-left transition-all duration-300 ${isSelected ? 'border-vrverse-500/50 bg-vrverse-500/10 shadow-xl ' + mode.shadow : 'hover:border-white/20'}`}>
            {mode.popular && <div className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-vrverse-500 to-purple-500 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">Popular</div>}
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${mode.gradient} flex items-center justify-center mb-5 shadow-lg ${mode.shadow}`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{mode.title}</h3>
            <p className="text-sm text-white/50 leading-relaxed">{mode.desc}</p>
            {isSelected && <motion.div layoutId="mode-indicator" className="absolute bottom-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r from-vrverse-500 to-purple-500" />}
          </motion.button>
        );
      })}
    </div>
  );
}
