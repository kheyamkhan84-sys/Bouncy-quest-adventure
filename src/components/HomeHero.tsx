/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, RotateCcw, Compass, Shield, Sparkles, Layers, Zap, Star } from 'lucide-react';
import { SaveData } from '../types/game';
import { getWorldForLevel } from '../data/worlds';

interface HomeHeroProps {
  saveData: SaveData;
  onPlayCurrent: () => void;
  onStartNew: () => void;
  onOpenWorlds: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  saveData,
  onPlayCurrent,
  onStartNew,
  onOpenWorlds,
}) => {
  const currentLevel = saveData.currentLevel || 1;
  const currentWorld = getWorldForLevel(currentLevel);
  const totalStars = saveData.stats.totalStars;
  const completedCount = Object.keys(saveData.completedLevels).length;

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-10 px-4 sm:px-6 relative overflow-hidden">
      {/* Decorative ambient glowing circles */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center z-10">
        {/* Animated Bouncy Mascot */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative animate-bounce">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-red-600 via-rose-500 to-red-400 shadow-xl shadow-red-500/40 flex items-center justify-center border-2 border-red-300/40 relative">
              {/* Highlight */}
              <div className="absolute top-3 left-4 w-7 h-5 bg-white/40 rounded-full rotate-[-30deg]" />

              {/* Expressive cartoon eyes */}
              <div className="flex gap-2.5 z-10">
                <div className="w-4 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-3 bg-slate-950 rounded-full"></div>
                </div>
                <div className="w-4 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-2.5 h-3 bg-slate-950 rounded-full"></div>
                </div>
              </div>

              {/* Cheerful mouth */}
              <div className="absolute bottom-4 w-5 h-2.5 border-b-2 border-red-950 rounded-full"></div>
            </div>
          </div>
          {/* Shadow squish underneath */}
          <div className="w-20 sm:w-24 h-3 bg-slate-950/40 rounded-full blur-sm -mt-1 scale-95" />
        </div>

        {/* Title & Subtitle */}
        <h1 className="font-game text-4xl sm:text-6xl font-bold tracking-tight text-white mb-3">
          Bouncy World <span className="text-red-500">Adventure</span>
        </h1>
        <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8 font-ui">
          Roll, bounce, and conquer an epic campaign of <strong className="text-white">50 unique worlds</strong> and{' '}
          <strong className="text-red-400">1,000 playable levels</strong>. Master trampolines, gravity inversions, portals, and thrilling boss battles!
        </p>

        {/* Main Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          {/* Continue Game Button (if progressed) */}
          {completedCount > 0 ? (
            <button
              onClick={onPlayCurrent}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-game text-xl rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>Continue Level {currentLevel}</span>
            </button>
          ) : (
            <button
              onClick={onPlayCurrent}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-game text-xl rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>Play Game</span>
            </button>
          )}

          {/* World Selection Button */}
          <button
            onClick={onOpenWorlds}
            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 font-game text-xl rounded-xl shadow-md flex items-center justify-center gap-3 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Compass className="w-6 h-6 text-emerald-400" />
            <span>World Selection (50)</span>
          </button>
        </div>

        {/* Player Current Progress Kicker */}
        {completedCount > 0 && (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 max-w-lg mx-auto mb-12 flex items-center justify-between text-sm">
            <div className="text-left">
              <span className="text-xs text-slate-400 block font-medium">CURRENT CAMPAIGN</span>
              <span className="font-semibold text-white">
                World {currentWorld.id}: {currentWorld.name}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                <span>{totalStars} Stars</span>
              </div>
              <div className="text-slate-300">
                {completedCount} / 1000 Cleared
              </div>
            </div>
          </div>
        )}

        {/* 4 Core Pillar Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">50 Themed Worlds</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              From Emerald Meadows and Sunken Atlantis to Lunar Basins and the Void Core.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">1,000 Playable Levels</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Every level guaranteed solvable with progressive ramps and 3-star mastery.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">50 New Mechanics</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Portals, moving platforms, gravity switches, lasers, puzzles, and bosses.
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">Checkpoint System</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Instant checkpoint respawn with temporary invulnerability and saved stars.
            </p>
          </div>
        </div>

        {/* Controls Guide Banner */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono">A / D</kbd>
            <span>or</span>
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono">← / →</kbd>
            <span>Move Left/Right</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-200 font-mono">W / Space / ↑</kbd>
            <span>Jump & Bounce</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Mobile Touch Controls Included</span>
          </div>
        </div>
      </div>
    </div>
  );
};
