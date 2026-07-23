/**
 * VRVerse Player — Navbar Component
 * Top navigation with gradient logo and navigation links.
 */

import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Upload, Settings, Clock, Download, Play,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/upload', icon: Upload, label: 'Upload' },
  { to: '/history', icon: Clock, label: 'History' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-vrverse-500 to-purple-600 flex items-center justify-center shadow-lg shadow-vrverse-500/25 group-hover:shadow-vrverse-500/40 transition-shadow">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">VRVerse</h1>
              <p className="text-[10px] text-white/30 -mt-1 tracking-widest uppercase">Player</p>
            </div>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to;
              return (
                <Link key={to} to={to} className="relative">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-vrverse-500/20 text-vrverse-300 border border-vrverse-500/30'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </motion.div>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute -bottom-[17px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-vrverse-500 to-purple-500 rounded-full"
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
