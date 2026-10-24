/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Music, Bell, Play, Check } from 'lucide-react';
import { SoundSystem } from '../services/audio';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
}) => {
  const [musicEnabled, setMusicEnabled] = useState(SoundSystem.getMusicEnabled());
  const [sfxEnabled, setSfxEnabled] = useState(SoundSystem.getSfxEnabled());
  const [musicVolume, setMusicVolume] = useState(SoundSystem.getMusicVolume());
  const [sfxVolume, setSfxVolume] = useState(SoundSystem.getSfxVolume());
  const [testPlaying, setTestPlaying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMusicEnabled(SoundSystem.getMusicEnabled());
      setSfxEnabled(SoundSystem.getSfxEnabled());
      setMusicVolume(SoundSystem.getMusicVolume());
      setSfxVolume(SoundSystem.getSfxVolume());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleMusic = () => {
    SoundSystem.init();
    const next = !musicEnabled;
    setMusicEnabled(next);
    SoundSystem.setMusicEnabled(next);
    onSettingsChanged?.();
  };

  const handleToggleSfx = () => {
    SoundSystem.init();
    const next = !sfxEnabled;
    setSfxEnabled(next);
    SoundSystem.setSfxEnabled(next);
    onSettingsChanged?.();
  };

  const handleMusicVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    SoundSystem.init();
    const val = parseFloat(e.target.value);
    setMusicVolume(val);
    SoundSystem.setMusicVolume(val);
    onSettingsChanged?.();
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    SoundSystem.init();
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    SoundSystem.setSfxVolume(val);
    onSettingsChanged?.();
  };

  const handleTestSfx = () => {
    SoundSystem.init();
    setTestPlaying(true);
    SoundSystem.playStarCollect();
    setTimeout(() => setTestPlaying(false), 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Close audio settings"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-game text-2xl font-bold text-white leading-tight">
              Audio Settings
            </h2>
            <p className="text-slate-400 text-xs">
              Configure background music and sound effects independently
            </p>
          </div>
        </div>

        {/* Setting 1: Background Music */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${musicEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}`}>
                <Music className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm text-white block">
                  Background Music
                </span>
                <span className="text-[11px] text-slate-400">
                  Melodic chiptune adventure themes
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleMusic}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                musicEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={musicEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  musicEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Music Volume Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span className="text-slate-400">Music Volume</span>
              <span className={`font-mono ${musicEnabled ? 'text-amber-400' : 'text-slate-500'}`}>
                {musicEnabled ? `${Math.round(musicVolume * 100)}%` : 'Muted'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              disabled={!musicEnabled}
              value={musicVolume}
              onChange={handleMusicVolumeChange}
              className={`w-full accent-amber-400 cursor-pointer ${
                !musicEnabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            />
          </div>
        </div>

        {/* Setting 2: Game Sound Effects */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${sfxEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm text-white block">
                  Game Sound Effects
                </span>
                <span className="text-[11px] text-slate-400">
                  Jumps, stomps, stars, damage & portals
                </span>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleSfx}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                sfxEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={sfxEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sfxEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* SFX Volume Slider & Test Button */}
          <div className="space-y-1.5 pt-2 border-t border-slate-700/40">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span className="text-slate-400">Sound Effects Volume</span>
              <span className={`font-mono ${sfxEnabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                {sfxEnabled ? `${Math.round(sfxVolume * 100)}%` : 'Muted'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              disabled={!sfxEnabled}
              value={sfxVolume}
              onChange={handleSfxVolumeChange}
              className={`w-full accent-emerald-400 cursor-pointer ${
                !sfxEnabled ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            />

            {/* Test Sound Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleTestSfx}
                disabled={!sfxEnabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  sfxEnabled
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                <Play className={`w-3 h-3 ${testPlaying ? 'animate-ping' : ''}`} />
                <span>Test Sound</span>
              </button>
            </div>
          </div>
        </div>

        {/* Persistence Notice */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 mb-5 flex items-center gap-2 text-[11px] text-slate-400">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Music and sound effects operate independently. Your audio preferences are saved automatically in localStorage.
          </span>
        </div>

        {/* Done / Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-game rounded-xl transition-all shadow-lg shadow-red-600/20 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Done</span>
        </button>
      </div>
    </div>
  );
};
