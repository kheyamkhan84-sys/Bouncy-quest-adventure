/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface FooterProps {
  onNavigate: (view: 'home' | 'worlds' | 'game' | 'about' | 'privacy' | 'contact') => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/80 py-8 px-4 sm:px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold text-white">
            ●
          </div>
          <span className="font-game font-semibold text-white">Bouncy World Adventure</span>
          <span>· 50 Worlds · 1,000 Playable Levels</span>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('home')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={() => onNavigate('worlds')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Worlds
          </button>
          <button
            onClick={() => onNavigate('about')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => onNavigate('privacy')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => onNavigate('contact')}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Contact
          </button>
        </div>

        <div className="text-slate-500">
          Built with HTML5 Canvas & Web Audio
        </div>
      </div>
    </footer>
  );
};
