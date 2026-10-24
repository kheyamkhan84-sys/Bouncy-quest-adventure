/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Star, Trophy, Sparkles, Crown, Play, ShieldAlert } from 'lucide-react';
import { WORLDS } from '../data/worlds';
import { SaveData } from '../types/game';

interface WorldSelectProps {
  saveData: SaveData;
  onSelectLevel: (levelNumber: number) => void;
  onBackToHome: () => void;
  initialWorldId?: number;
}

export const WorldSelect: React.FC<WorldSelectProps> = ({
  saveData,
  onSelectLevel,
  onBackToHome,
  initialWorldId = 1,
}) => {
  // Page number represents world ID: 1 to 50
  const [selectedWorldId, setSelectedWorldId] = useState<number>(() => {
    return Math.max(1, Math.min(50, initialWorldId || saveData.currentWorld || 1));
  });

  const world = WORLDS[selectedWorldId - 1] || WORLDS[0];

  // Levels for this world: exactly 20 levels
  // World 1: 1..20
  // World 2: 21..40
  // ...
  // World 50: 981..1000
  const startLevel = (selectedWorldId - 1) * 20 + 1;
  const levels = Array.from({ length: 20 }, (_, idx) => startLevel + idx);

  // Unlocking condition: World 1 is unlocked.
  // Next world is automatically unlocked if player has completed level 20 of previous world (or reached it).
  const isWorldUnlocked = selectedWorldId === 1 || saveData.unlockedLevels >= startLevel;

  // Calculate world stats
  let worldStars = 0;
  let completedInWorld = 0;
  levels.forEach((lvlNum) => {
    const record = saveData.completedLevels[lvlNum];
    if (record) {
      worldStars += record.stars || 0;
      completedInWorld++;
    }
  });

  const completionPct = Math.round((completedInWorld / 20) * 100);

  const goToPrevWorld = () => {
    if (selectedWorldId > 1) {
      setSelectedWorldId(selectedWorldId - 1);
    }
  };

  const goToNextWorld = () => {
    if (selectedWorldId < 50) {
      setSelectedWorldId(selectedWorldId + 1);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] py-8 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col justify-between">
      {/* Top Header & Breadcrumb */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          {/* Quick World Jump Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="world-dropdown" className="text-xs text-slate-400 font-medium hidden sm:inline">
              Jump to World:
            </label>
            <select
              id="world-dropdown"
              value={selectedWorldId}
              onChange={(e) => setSelectedWorldId(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              {WORLDS.map((w) => (
                <option key={w.id} value={w.id}>
                  World {w.id}: {w.name} ({saveData.unlockedLevels >= (w.id - 1) * 20 + 1 ? 'Unlocked' : 'Locked'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current World Card Banner */}
        <div
          className="relative rounded-2xl p-6 sm:p-8 mb-8 overflow-hidden shadow-xl border border-slate-700/80"
          style={{
            background: `linear-gradient(135deg, ${world.bgColor1} 0%, ${world.bgColor2} 100%)`,
          }}
        >
          {/* Subtle World Pattern Texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-black/40 text-white/90 border border-white/10">
                  Page {selectedWorldId} of 50
                </span>
                <span className="text-xs text-white/80 font-medium">
                  Levels {startLevel} – {startLevel + 19}
                </span>
              </div>
              <h2 className="font-game text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-md">
                World {world.id}: {world.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-white/90 mb-2">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span className="font-semibold">New Feature:</span>
                <span>{world.mechanicName}</span>
              </div>
              <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed">
                {world.mechanicDescription}
              </p>
            </div>

            {/* World Progress Summary */}
            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col gap-2 min-w-[200px]">
              <div className="flex items-center justify-between text-xs text-white/90">
                <span>World Completion</span>
                <span className="font-bold text-white">{completionPct}%</span>
              </div>
              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-white/80 pt-1">
                <span>Completed: {completedInWorld} / 20</span>
                <div className="flex items-center gap-1 text-amber-300 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-300" />
                  <span>{worldStars} / 60</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 20 Level Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {levels.map((lvlNumber, index) => {
            const isUnlocked = lvlNumber <= saveData.unlockedLevels;
            const record = saveData.completedLevels[lvlNumber];
            const isCompleted = !!record;
            const stars = record ? record.stars : 0;
            const isFinalLevel = index === 19; // Level 20 of this world

            return (
              <button
                key={lvlNumber}
                disabled={!isUnlocked}
                onClick={() => onSelectLevel(lvlNumber)}
                className={`relative group rounded-xl p-3 sm:p-4 text-center transition-all flex flex-col items-center justify-between h-28 sm:h-32 focus:outline-none cursor-pointer ${
                  !isUnlocked
                    ? 'bg-slate-900/60 border border-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    : isFinalLevel
                    ? 'bg-gradient-to-b from-amber-950/70 to-slate-900 border-2 border-amber-500/80 shadow-lg shadow-amber-500/10 hover:border-amber-400 hover:scale-[1.03]'
                    : isCompleted
                    ? 'bg-slate-800/90 border border-emerald-500/50 hover:border-emerald-400 hover:bg-slate-800 hover:scale-[1.03]'
                    : 'bg-slate-800/80 border border-slate-700 hover:border-red-500 hover:scale-[1.03]'
                }`}
              >
                {/* Level Tag Header */}
                <div className="w-full flex items-center justify-between text-[11px] font-semibold">
                  <span className={isUnlocked ? 'text-slate-300' : 'text-slate-600'}>
                    Lv.{lvlNumber}
                  </span>
                  {isFinalLevel && (
                    <span title="Final Challenge / Boss Level">
                      <Crown className="w-4 h-4 text-amber-400" />
                    </span>
                  )}
                </div>

                {/* Level Central Icon / Number */}
                <div className="my-auto">
                  {!isUnlocked ? (
                    <Lock className="w-6 h-6 text-slate-600" />
                  ) : isFinalLevel ? (
                    <div className="font-game text-xl sm:text-2xl font-bold text-amber-300 group-hover:text-amber-200">
                      BOSS
                    </div>
                  ) : (
                    <div className="font-game text-2xl sm:text-3xl font-bold text-white group-hover:text-red-400 transition-colors">
                      {index + 1}
                    </div>
                  )}
                </div>

                {/* Stars Indicator */}
                <div className="flex items-center gap-1">
                  {isUnlocked && (
                    <>
                      {[1, 2, 3].map((starIdx) => (
                        <Star
                          key={starIdx}
                          className={`w-3.5 h-3.5 ${
                            starIdx <= stars
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-600 fill-slate-800'
                          }`}
                        />
                      ))}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* World Pager Footer: Previous & Next World buttons */}
      <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
        <button
          onClick={goToPrevWorld}
          disabled={selectedWorldId <= 1}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
            selectedWorldId <= 1
              ? 'text-slate-600 bg-slate-900 border border-slate-800 cursor-not-allowed'
              : 'text-white bg-slate-800 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous World</span>
        </button>

        <span className="text-xs sm:text-sm text-slate-400 font-medium">
          World <strong className="text-white">{selectedWorldId}</strong> of 50
        </span>

        <button
          onClick={goToNextWorld}
          disabled={selectedWorldId >= 50}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
            selectedWorldId >= 50
              ? 'text-slate-600 bg-slate-900 border border-slate-800 cursor-not-allowed'
              : 'text-white bg-slate-800 hover:bg-slate-700 border border-slate-700'
          }`}
        >
          <span>Next World</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
