/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Volume2, VolumeX, Maximize2, Minimize2, Settings, Trophy, Coins, Compass } from 'lucide-react';
import { SoundSystem } from '../services/audio';
import { SaveData } from '../types/game';

interface NavbarProps {
  currentView: 'home' | 'worlds' | 'game' | 'about' | 'privacy' | 'contact';
  onNavigate: (view: 'home' | 'worlds' | 'game' | 'about' | 'privacy' | 'contact') => void;
  saveData: SaveData;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  saveData,
  onOpenSettings,
}) => {
  const [isMuted, setIsMuted] = React.useState(SoundSystem.getIsMuted());
  const [isFullscreen, setIsFullscreen] = React.useState(!!document.fullscreenElement);

  const toggleSound = () => {
    const muted = SoundSystem.toggleMute();
    setIsMuted(muted);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  React.useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Mascot */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded-lg p-1"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-400 shadow-md shadow-red-500/30 flex items-center justify-center relative transform group-hover:scale-105 transition-transform">
            {/* Cartoon Eyes */}
            <div className="flex gap-1">
              <div className="w-1.5 h-2 bg-white rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
              </div>
              <div className="w-1.5 h-2 bg-white rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="text-left">
            <span className="font-game text-xl font-bold tracking-wide text-white group-hover:text-red-400 transition-colors">
              Bouncy World
            </span>
            <span className="block text-[10px] tracking-wider uppercase text-slate-400 font-semibold">
              1,000 Levels
            </span>
          </div>
        </button>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onNavigate('home')}
            className={`hover:text-white transition-colors cursor-pointer ${
              currentView === 'home' ? 'text-red-400 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('worlds')}
            className={`flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer ${
              currentView === 'worlds' ? 'text-red-400 font-semibold' : ''
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            50 Worlds
          </button>
          <button
            onClick={() => onNavigate('about')}
            className={`hover:text-white transition-colors cursor-pointer ${
              currentView === 'about' ? 'text-red-400 font-semibold' : ''
            }`}
          >
            About Game
          </button>
          <button
            onClick={() => onNavigate('privacy')}
            className={`hover:text-white transition-colors cursor-pointer ${
              currentView === 'privacy' ? 'text-red-400 font-semibold' : ''
            }`}
          >
            Privacy
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className={`hover:text-white transition-colors cursor-pointer ${
              currentView === 'contact' ? 'text-red-400 font-semibold' : ''
            }`}
          >
            Contact
          </button>
        </nav>

        {/* Stats & Actions */}
        <div className="flex items-center gap-3">
          {/* Stars Count */}
          <div
            className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md"
            title="Total Stars Collected"
          >
            <Trophy className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{saveData.stats.totalStars}</span>
            <span className="text-slate-500 text-[10px]">/ 3000</span>
          </div>

          {/* Coins Count */}
          <div
            className="hidden sm:flex items-center gap-1.5 text-yellow-300 text-xs font-semibold px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md"
            title="Total Coins"
          >
            <Coins className="w-3.5 h-3.5 text-yellow-400" />
            <span>{saveData.totalCoins}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
            title={isMuted ? 'Unmute audio' : 'Mute audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:inline-flex p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle Fullscreen"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Settings"
            title="Game Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
