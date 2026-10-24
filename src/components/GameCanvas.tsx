/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Compass,
  Star,
  Coins,
  ChevronRight,
  Shield,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  X,
  Heart,
  HeartOff,
  Key,
  Sliders,
} from 'lucide-react';
import { GameEngine } from '../engine/gameEngine';
import { generateLevel } from '../engine/levelGenerator';
import { getWorldForLevel, getLevelIndexInWorld } from '../data/worlds';
import { SoundSystem } from '../services/audio';
import { StorageService } from '../services/storage';
import { SaveData } from '../types/game';
import { AudioSettingsModal } from './AudioSettingsModal';

interface GameCanvasProps {
  levelNumber: number;
  saveData: SaveData;
  onLevelComplete: (nextLevelNumber: number) => void;
  onExitToWorlds: (worldId?: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  levelNumber,
  saveData,
  onLevelComplete,
  onExitToWorlds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(SoundSystem.getIsMuted());
  const [starsCollected, setStarsCollected] = useState(0);
  const [coinsCollected, setCoinsCollected] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [checkpointNotif, setCheckpointNotif] = useState<string | null>(null);
  const [lives, setLives] = useState<number>(3);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [carriedKeys, setCarriedKeys] = useState<string[]>([]);
  const [adventureToast, setAdventureToast] = useState<string | null>(null);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);

  const [levelBanner, setLevelBanner] = useState<{
    worldNum: number;
    lvlNum: number;
    worldName: string;
    mechanic: string;
  } | null>(null);

  // Victory modal state
  const [showVictory, setShowVictory] = useState(false);
  const [victoryStats, setVictoryStats] = useState<{
    stars: number;
    time: number;
    coins: number;
  } | null>(null);

  const world = getWorldForLevel(levelNumber);
  const stageInWorld = getLevelIndexInWorld(levelNumber);

  // Initialize and run engine
  const startLevel = useCallback(
    (lvlNum: number) => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      canvas.width = 960;
      canvas.height = 540;

      const currentWorldDef = getWorldForLevel(lvlNum);
      const levelData = generateLevel(lvlNum);

      if (engineRef.current) {
        engineRef.current.stop();
      }

      setStarsCollected(0);
      setCoinsCollected(0);
      setTimerSeconds(0);
      setShowVictory(false);
      setVictoryStats(null);
      setIsPaused(false);
      setLives(3);
      setIsGameOver(false);
      setCarriedKeys([]);
      setAdventureToast(null);

      // Trigger cinematic level intro card
      setLevelBanner({
        worldNum: currentWorldDef.id,
        lvlNum,
        worldName: currentWorldDef.name,
        mechanic: currentWorldDef.mechanicName,
      });
      const bannerTimer = window.setTimeout(() => {
        setLevelBanner(null);
      }, 2200);

      const engine = new GameEngine(canvas, levelData, {
        onLevelComplete: (stars, time, coins) => {
          // Save progress
          StorageService.recordLevelComplete(lvlNum, stars, time, coins);

          setVictoryStats({ stars, time, coins });
          setShowVictory(true);

          // Confetti celebration
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch (e) {}
        },
        onStarCollected: (count) => {
          setStarsCollected(count);
        },
        onCoinCollected: (total) => {
          setCoinsCollected(total);
        },
        onPlayerDeath: (livesRemaining) => {
          setLives(livesRemaining);
          StorageService.incrementDeaths();
          if (livesRemaining > 0) {
            setCheckpointNotif(`${livesRemaining} Chance${livesRemaining === 1 ? '' : 's'} Remaining!`);
            window.setTimeout(() => setCheckpointNotif(null), 2000);
          }
        },
        onGameOver: () => {
          setLives(0);
          setIsGameOver(true);
        },
        onCheckpointActivated: () => {
          setCheckpointNotif('Checkpoint Reached!');
          window.setTimeout(() => setCheckpointNotif(null), 2000);
        },
        onKeyCollected: (keyColor) => {
          setCarriedKeys((prev) => [...prev, keyColor]);
          setAdventureToast(`${keyColor.toUpperCase()} Key Found! Gate can be unlocked.`);
          window.setTimeout(() => setAdventureToast(null), 2500);
        },
        onGateUnlocked: (gateColor) => {
          setAdventureToast(`${gateColor.toUpperCase()} Barrier Dissolved! Path is clear.`);
          window.setTimeout(() => setAdventureToast(null), 2500);
        },
      });

      engineRef.current = engine;
      engine.start();
    },
    [],
  );

  useEffect(() => {
    startLevel(levelNumber);
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, [levelNumber, startLevel]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      SoundSystem.init(); // Audio unlock on gesture
      if (!engineRef.current) return;

      const keys = engineRef.current.keys;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = true;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        keys.jump = true;
        keys.up = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keys.down = true;
      }
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        setIsPaused((prev) => {
          const next = !prev;
          if (next) engineRef.current?.pause();
          else engineRef.current?.resume();
          return next;
        });
      }
      if (e.key === 'r' || e.key === 'R') {
        if (engineRef.current) {
          engineRef.current.resetLevel();
          setIsPaused(false);
          setShowVictory(false);
          setIsGameOver(false);
          setLives(3);
          setCarriedKeys([]);
          setStarsCollected(0);
          setCoinsCollected(0);
          setTimerSeconds(0);
          setAdventureToast(null);
          setCheckpointNotif(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const keys = engineRef.current.keys;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keys.right = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        keys.jump = false;
        keys.up = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        keys.down = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Timer interval for HUD
  useEffect(() => {
    if (isPaused || showVictory) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, showVictory]);

  const togglePause = () => {
    if (!engineRef.current) return;
    setIsPaused((prev) => {
      const next = !prev;
      if (next) engineRef.current?.pause();
      else engineRef.current?.resume();
      return next;
    });
  };

  const restartCurrentLevel = () => {
    if (engineRef.current) {
      engineRef.current.resetLevel();
      setIsPaused(false);
      setShowVictory(false);
      setIsGameOver(false);
      setLives(3);
      setCarriedKeys([]);
      setStarsCollected(0);
      setCoinsCollected(0);
      setTimerSeconds(0);
      setAdventureToast(null);
      setCheckpointNotif(null);
    }
  };

  const toggleSound = () => {
    const muted = SoundSystem.toggleMute();
    setIsMuted(muted);
  };

  const handleNextLevel = () => {
    const nextLvl = Math.min(1000, levelNumber + 1);
    onLevelComplete(nextLvl);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-2 sm:p-4 relative">
      {/* Top In-Game HUD Bar */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 mb-2 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* World & Level Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onExitToWorlds(world.id)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Return to World Selection"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Worlds</span>
          </button>
          <div className="h-4 w-px bg-slate-700 hidden sm:block" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-game text-base sm:text-lg font-bold text-white">
                World {world.id} · Level {levelNumber}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 hidden md:inline">
                ({world.name})
              </span>
            </div>
            <span className="text-[10px] text-amber-300 font-medium block">
              Mechanic: {world.mechanicName}
            </span>
          </div>
        </div>

        {/* Stats: 3 Chances (Hearts) & Keys & Stars & Coins & Timer */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-semibold">
          {/* 3 Visible Hearts / Chances */}
          <div
            className="flex items-center gap-1 px-2.5 py-1 bg-red-950/40 border border-red-500/30 rounded-lg"
            title={`${lives} Chances Remaining`}
          >
            {[1, 2, 3].map((heartIndex) => (
              <Heart
                key={heartIndex}
                className={`w-4 h-4 transition-all duration-300 ${
                  heartIndex <= lives
                    ? 'text-red-500 fill-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]'
                    : 'text-slate-700 fill-slate-900/60'
                } ${lives === 1 && heartIndex === 1 ? 'animate-bounce' : ''}`}
              />
            ))}
          </div>

          {/* Carried Keys */}
          {carriedKeys.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              {carriedKeys.map((kColor, i) => (
                <span key={i} title={`${kColor} Key`}>
                  <Key
                    className={`w-3.5 h-3.5 ${
                      kColor === 'red' ? 'text-red-400' : kColor === 'blue' ? 'text-blue-400' : 'text-amber-400'
                    }`}
                  />
                </span>
              ))}
            </div>
          )}

          {/* 3 Stars status */}
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-4 h-4 ${
                  starIdx <= starsCollected
                    ? 'text-amber-400 fill-amber-400 animate-pulse'
                    : 'text-slate-600 fill-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Coins */}
          <div className="flex items-center gap-1 text-yellow-300">
            <Coins className="w-3.5 h-3.5" />
            <span>{coinsCollected}</span>
          </div>

          {/* Timer */}
          <div className="text-slate-300 font-mono">
            {formatTimer(timerSeconds)}
          </div>
        </div>

        {/* Action Buttons: Pause, Restart, Audio Settings, Mute */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePause}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={restartCurrentLevel}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Restart Level"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAudioSettingsOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition-colors cursor-pointer"
            title="Audio Settings (Music & Sound Effects)"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="relative w-full max-w-4xl aspect-[16/9] bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
        />

        {/* Cinematic Level Intro Banner */}
        {levelBanner && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-6 py-3 rounded-2xl shadow-2xl text-center pointer-events-none z-20">
            <span className="text-[11px] font-bold text-red-400 tracking-wider uppercase block">
              World {levelBanner.worldNum} · {levelBanner.worldName}
            </span>
            <span className="font-game text-xl sm:text-2xl font-bold text-white block">
              Level {levelBanner.lvlNum}
            </span>
            <span className="text-xs text-amber-300 font-medium">
              Feature: {levelBanner.mechanic}
            </span>
          </div>
        )}

        {/* Checkpoint Notification Toast */}
        {checkpointNotif && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-white font-game text-sm px-4 py-1.5 rounded-full shadow-lg border border-emerald-300/40 animate-bounce flex items-center gap-2 pointer-events-none z-20">
            <Shield className="w-4 h-4 fill-white" />
            <span>{checkpointNotif}</span>
          </div>
        )}

        {/* Adventure Keys & Doors Toast */}
        {adventureToast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-amber-500/95 text-slate-950 font-game text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-xl border border-amber-200 animate-bounce flex items-center gap-2 pointer-events-none z-20 font-bold">
            <Key className="w-4 h-4" />
            <span>{adventureToast}</span>
          </div>
        )}

        {/* Mobile On-Screen Touch Controls */}
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-end p-4">
          <div className="w-full flex items-end justify-between pointer-events-auto select-none">
            {/* Left and Right directional thumb buttons */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/70 active:bg-red-600/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-lg active:scale-95 transition-all touch-none cursor-pointer"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundSystem.init();
                  if (engineRef.current) engineRef.current.keys.left = true;
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  if (engineRef.current) engineRef.current.keys.left = false;
                }}
                onPointerLeave={() => {
                  if (engineRef.current) engineRef.current.keys.left = false;
                }}
                aria-label="Move Left"
              >
                <ArrowLeft className="w-7 h-7" />
              </button>

              <button
                type="button"
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/70 active:bg-red-600/80 border border-white/20 text-white flex items-center justify-center backdrop-blur-sm shadow-lg active:scale-95 transition-all touch-none cursor-pointer"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundSystem.init();
                  if (engineRef.current) engineRef.current.keys.right = true;
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  if (engineRef.current) engineRef.current.keys.right = false;
                }}
                onPointerLeave={() => {
                  if (engineRef.current) engineRef.current.keys.right = false;
                }}
                aria-label="Move Right"
              >
                <ArrowRight className="w-7 h-7" />
              </button>
            </div>

            {/* Jump Button */}
            <div>
              <button
                type="button"
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 active:from-red-700 active:to-rose-600 border-2 border-white/40 text-white flex flex-col items-center justify-center backdrop-blur-sm shadow-xl active:scale-95 transition-all touch-none cursor-pointer"
                onPointerDown={(e) => {
                  e.preventDefault();
                  SoundSystem.init();
                  if (engineRef.current) {
                    engineRef.current.keys.jump = true;
                    engineRef.current.keys.up = true;
                  }
                }}
                onPointerUp={(e) => {
                  e.preventDefault();
                  if (engineRef.current) {
                    engineRef.current.keys.jump = false;
                    engineRef.current.keys.up = false;
                  }
                }}
                onPointerLeave={() => {
                  if (engineRef.current) {
                    engineRef.current.keys.jump = false;
                    engineRef.current.keys.up = false;
                  }
                }}
                aria-label="Jump & Bounce"
              >
                <ArrowUp className="w-8 h-8" />
                <span className="text-[10px] font-game font-bold -mt-1">JUMP</span>
              </button>
            </div>
          </div>
        </div>

        {/* Pause Overlay Modal */}
        {isPaused && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-30">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
              <h3 className="font-game text-2xl font-bold text-white mb-2">Game Paused</h3>
              <p className="text-slate-400 text-xs mb-6">
                Level {levelNumber} · {world.name}
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={togglePause}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-game rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Resume Game</span>
                </button>

                <button
                  onClick={() => setIsAudioSettingsOpen(true)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-game rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <span>Audio Settings</span>
                </button>

                <button
                  onClick={restartCurrentLevel}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-game rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Restart Level</span>
                </button>

                <button
                  onClick={() => onExitToWorlds(world.id)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-game rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Compass className="w-5 h-5 text-emerald-400" />
                  <span>World Selection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Modal (All 3 Chances Lost) */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-40">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-red-600/80 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl relative animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 mx-auto -mt-12 sm:-mt-14 mb-4 flex items-center justify-center shadow-lg shadow-red-500/40">
                <HeartOff className="w-8 h-8 text-red-400" />
              </div>

              <h2 className="font-game text-3xl sm:text-4xl font-bold text-white mb-1">
                Game Over
              </h2>
              <p className="text-slate-400 text-xs mb-6 font-medium">
                All 3 chances used on Level {levelNumber} ({world.name}).
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={restartCurrentLevel}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-game text-lg rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Try Again (3 Fresh Hearts)</span>
                </button>

                <button
                  onClick={() => onExitToWorlds(world.id)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-game text-sm rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>World Selection</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Victory Modal */}
        {showVictory && victoryStats && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-40">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto -mt-12 sm:-mt-14 mb-4 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Star className="w-8 h-8 text-emerald-300 fill-emerald-300 animate-spin" />
              </div>

              <h2 className="font-game text-3xl sm:text-4xl font-bold text-white mb-1">
                Level Complete!
              </h2>
              <p className="text-slate-400 text-xs mb-6 font-medium">
                World {world.id}: Level {levelNumber} Conquered
              </p>

              {/* 3-Star Rating Animation */}
              <div className="flex items-center justify-center gap-3 mb-6">
                {[1, 2, 3].map((starIdx) => (
                  <div
                    key={starIdx}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                      starIdx <= victoryStats.stars
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 scale-105'
                        : 'bg-slate-800 border-slate-700 text-slate-600'
                    }`}
                  >
                    <Star
                      className={`w-7 h-7 ${
                        starIdx <= victoryStats.stars
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-800 text-slate-700'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Stats Summary */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 mb-6 flex items-center justify-around text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Time</span>
                  <span className="font-bold text-white text-sm font-mono">
                    {formatTimer(victoryStats.time)}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Coins</span>
                  <span className="font-bold text-yellow-300 text-sm">
                    +{victoryStats.coins}
                  </span>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div>
                  <span className="text-slate-400 block mb-0.5">Next Level</span>
                  <span className="font-bold text-emerald-400 text-sm">
                    {levelNumber < 1000 ? levelNumber + 1 : 'Completed!'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                {levelNumber < 1000 ? (
                  <button
                    onClick={handleNextLevel}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-game text-lg rounded-xl shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Next Level</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="text-amber-400 font-game text-xl py-2">
                    YOU HAVE BEATEN ALL 1,000 LEVELS! MASTER OF BOUNCY WORLD!
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={restartCurrentLevel}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-game text-sm rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Replay</span>
                  </button>

                  <button
                    onClick={() => onExitToWorlds(world.id)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-game text-sm rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>World Select</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audio Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
        onSettingsChanged={() => setIsMuted(SoundSystem.getIsMuted())}
      />
    </div>
  );
};
