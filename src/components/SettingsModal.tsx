/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Volume2, Music, Bell, Keyboard, RotateCcw, AlertTriangle, Play, Check } from 'lucide-react';
import { GameSettings, SaveData } from '../types/game';
import { SoundSystem } from '../services/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  saveData: SaveData;
  onUpdateSettings: (settings: Partial<GameSettings>) => void;
  onResetProgress: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  saveData,
  onUpdateSettings,
  onResetProgress,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [testPlaying, setTestPlaying] = useState(false);

  if (!isOpen) return null;

  const { settings } = saveData;
  const musicEnabled = SoundSystem.getMusicEnabled();
  const sfxEnabled = SoundSystem.getSfxEnabled();

  const handleToggleMusic = () => {
    SoundSystem.init();
    const next = !musicEnabled;
    SoundSystem.setMusicEnabled(next);
    onUpdateSettings({ musicEnabled: next });
  };

  const handleToggleSfx = () => {
    SoundSystem.init();
    const next = !sfxEnabled;
    SoundSystem.setSfxEnabled(next);
    onUpdateSettings({ sfxEnabled: next });
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    SoundSystem.init();
    const vol = parseFloat(e.target.value);
    SoundSystem.setSfxVolume(vol);
    onUpdateSettings({ sfxVolume: vol });
  };

  const handleMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    SoundSystem.init();
    const vol = parseFloat(e.target.value);
    SoundSystem.setMusicVolume(vol);
    onUpdateSettings({ musicVolume: vol });
  };

  const handleTestSfx = () => {
    SoundSystem.init();
    setTestPlaying(true);
    SoundSystem.playStarCollect();
    setTimeout(() => setTestPlaying(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close settings"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-game text-2xl sm:text-3xl font-bold text-white mb-2">
          Game & Audio Settings
        </h2>
        <p className="text-slate-400 text-xs mb-6">
          Adjust independent audio channels and view controls
        </p>

        {/* Audio Section */}
        <div className="space-y-4 mb-6">
          {/* Background Music Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${musicEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-white block">
                    Background Music
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Adventure atmospheric themes
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleMusic}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  musicEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={musicEnabled}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    musicEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Music Slider */}
            <div className="space-y-1 pt-1.5 border-t border-slate-700/40">
              <div className="flex justify-between text-[11px] font-medium text-slate-300">
                <span className="text-slate-400">Music Volume</span>
                <span className={`font-mono ${musicEnabled ? 'text-amber-400' : 'text-slate-500'}`}>
                  {musicEnabled ? `${Math.round(SoundSystem.getMusicVolume() * 100)}%` : 'OFF'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!musicEnabled}
                value={settings.musicVolume}
                onChange={handleMusicChange}
                className={`w-full accent-amber-400 cursor-pointer ${
                  !musicEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Sound Effects Card */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${sfxEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-white block">
                    Game Sound Effects
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Jumps, stomps, stars, damage, portals
                  </span>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleSfx}
                className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  sfxEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={sfxEnabled}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    sfxEnabled ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* SFX Slider */}
            <div className="space-y-1 pt-1.5 border-t border-slate-700/40">
              <div className="flex justify-between text-[11px] font-medium text-slate-300">
                <span className="text-slate-400">SFX Volume</span>
                <span className={`font-mono ${sfxEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {sfxEnabled ? `${Math.round(SoundSystem.getSfxVolume() * 100)}%` : 'OFF'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                disabled={!sfxEnabled}
                value={settings.sfxVolume}
                onChange={handleSfxChange}
                className={`w-full accent-emerald-400 cursor-pointer ${
                  !sfxEnabled ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />

              <div className="pt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={handleTestSfx}
                  disabled={!sfxEnabled}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    sfxEnabled
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Play className={`w-3 h-3 ${testPlaying ? 'animate-ping' : ''}`} />
                  <span>Test SFX</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Persistence Notice */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-2.5 mb-6 flex items-center gap-2 text-[11px] text-slate-400">
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Music and SFX operate independently and save in localStorage.</span>
        </div>

        {/* Controls Reference */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 mb-6 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-white flex items-center gap-1.5 mb-2">
            <Keyboard className="w-4 h-4 text-red-400" />
            <span>Controls Guide</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Move Left / Right</span>
            <span className="font-mono text-slate-200">A / D or ← / →</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Jump / High Bounce</span>
            <span className="font-mono text-slate-200">W / Space / ↑</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Pause / Resume</span>
            <span className="font-mono text-slate-200">Escape / P</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Restart Current Level</span>
            <span className="font-mono text-slate-200">R</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mobile Devices</span>
            <span className="text-emerald-400 font-semibold">Touch Buttons on Screen</span>
          </div>
        </div>

        {/* Danger Zone: Reset Progress */}
        <div className="pt-4 border-t border-slate-800">
          {!showConfirmReset ? (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Game Campaign Progress</span>
            </button>
          ) : (
            <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-300 font-semibold mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Erase all 1,000 level progress?</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onResetProgress();
                    setShowConfirmReset(false);
                    onClose();
                  }}
                  className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => setShowConfirmReset(false)}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
