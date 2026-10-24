/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SaveData, GameSettings, LevelProgress } from '../types/game';

const CURRENT_SAVE_KEY = 'bouncy_world_adventure_save_v2';
const LEGACY_KEYS = [
  'bouncy_world_adventure_save_v1',
  'bouncy_world_save',
  'bwa_progress',
  'bouncy_ball_levels',
  'bouncy_adventure_progress',
  'bwa_save_data',
];

const DEFAULT_SETTINGS: GameSettings = {
  sfxVolume: 0.8,
  musicVolume: 0.5,
  sfxEnabled: true,
  musicEnabled: true,
  touchControls: 'auto',
  haptics: true,
  showFps: false,
};

const DEFAULT_SAVE_DATA: SaveData = {
  version: 2,
  currentWorld: 1,
  currentLevel: 1,
  unlockedLevels: 1,
  completedLevels: {},
  totalCoins: 0,
  settings: DEFAULT_SETTINGS,
  stats: {
    totalJumps: 0,
    totalDeaths: 0,
    totalStars: 0,
    bossesDefeated: 0,
    playTimeSeconds: 0,
  },
};

export class StorageService {
  private static cachedData: SaveData | null = null;

  /**
   * Load save data with automatic migration from older versions or legacy keys.
   */
  public static load(): SaveData {
    if (this.cachedData) {
      return this.cachedData;
    }

    try {
      // 1. Try current v2 save
      const rawCurrent = localStorage.getItem(CURRENT_SAVE_KEY);
      if (rawCurrent) {
        const parsed = JSON.parse(rawCurrent) as SaveData;
        if (parsed && typeof parsed.unlockedLevels === 'number') {
          this.cachedData = this.sanitize(parsed);
          return this.cachedData;
        }
      }

      // 2. Try migrating from legacy storage keys (e.g. from 1200 level version or v1)
      for (const legacyKey of LEGACY_KEYS) {
        const rawLegacy = localStorage.getItem(legacyKey);
        if (rawLegacy) {
          try {
            const legacyObj = JSON.parse(rawLegacy);
            const migrated = this.migrateLegacyData(legacyObj);
            this.save(migrated);
            this.cachedData = migrated;
            return migrated;
          } catch (e) {
            console.warn(`Failed to parse legacy save key ${legacyKey}:`, e);
          }
        }
      }
    } catch (err) {
      console.error('Error loading save data from localStorage:', err);
    }

    // Default pristine save
    this.cachedData = { ...DEFAULT_SAVE_DATA };
    this.save(this.cachedData);
    return this.cachedData;
  }

  /**
   * Save game progress safely to localStorage
   */
  public static save(data: SaveData): void {
    try {
      this.cachedData = data;
      localStorage.setItem(CURRENT_SAVE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Error saving data to localStorage:', err);
    }
  }

  /**
   * Record level completion with stars and time, and unlock next level.
   */
  public static recordLevelComplete(
    levelNumber: number,
    starsEarned: number,
    elapsedSeconds: number,
    coinsEarned: number = 0,
  ): SaveData {
    const data = this.load();

    const existing = data.completedLevels[levelNumber];
    const bestStars = existing ? Math.max(existing.stars, starsEarned) : starsEarned;
    const bestTime = existing ? Math.min(existing.bestTime, elapsedSeconds) : elapsedSeconds;

    const updatedCompleted: Record<number, LevelProgress> = {
      ...data.completedLevels,
      [levelNumber]: {
        stars: bestStars,
        bestTime: bestTime,
        completedAt: new Date().toISOString(),
      },
    };

    // Unlock next level up to 1000
    const nextLevel = Math.min(1000, Math.max(data.unlockedLevels, levelNumber + 1));
    const nextWorld = Math.min(50, Math.floor((nextLevel - 1) / 20) + 1);

    // Calculate total stars
    let totalStars = 0;
    Object.values(updatedCompleted).forEach((lvl) => {
      totalStars += lvl.stars || 0;
    });

    const isBossLevel = levelNumber % 20 === 0;

    const updatedData: SaveData = {
      ...data,
      currentLevel: nextLevel,
      currentWorld: nextWorld,
      unlockedLevels: nextLevel,
      completedLevels: updatedCompleted,
      totalCoins: data.totalCoins + coinsEarned,
      stats: {
        ...data.stats,
        totalStars,
        bossesDefeated: data.stats.bossesDefeated + (isBossLevel ? 1 : 0),
      },
    };

    this.save(updatedData);
    return updatedData;
  }

  /**
   * Update settings
   */
  public static updateSettings(partial: Partial<GameSettings>): SaveData {
    const data = this.load();
    const updated: SaveData = {
      ...data,
      settings: {
        ...data.settings,
        ...partial,
      },
    };
    this.save(updated);
    return updated;
  }

  /**
   * Record player death
   */
  public static incrementDeaths(): void {
    const data = this.load();
    data.stats.totalDeaths += 1;
    this.save(data);
  }

  /**
   * Record jump
   */
  public static incrementJumps(): void {
    const data = this.load();
    data.stats.totalJumps += 1;
    // Don't write to storage on every jump to avoid thrashing localStorage; cached data updates
  }

  /**
   * Flush cached stats periodically
   */
  public static sync(): void {
    if (this.cachedData) {
      this.save(this.cachedData);
    }
  }

  /**
   * Reset progress with explicit confirmation
   */
  public static resetProgress(): SaveData {
    const resetData: SaveData = {
      ...DEFAULT_SAVE_DATA,
      settings: this.cachedData ? this.cachedData.settings : DEFAULT_SETTINGS,
    };
    this.save(resetData);
    return resetData;
  }

  /**
   * Helper to ensure all fields are valid numbers/objects
   */
  private static sanitize(parsed: any): SaveData {
    const unlocked = Math.min(1000, Math.max(1, Number(parsed.unlockedLevels) || 1));
    const currentLvl = Math.min(1000, Math.max(1, Number(parsed.currentLevel) || 1));
    const currentWld = Math.min(50, Math.max(1, Math.floor((currentLvl - 1) / 20) + 1));

    const completed: Record<number, LevelProgress> = {};
    if (parsed.completedLevels && typeof parsed.completedLevels === 'object') {
      Object.entries(parsed.completedLevels).forEach(([lvlKey, val]: [string, any]) => {
        const lvlNum = parseInt(lvlKey, 10);
        if (lvlNum >= 1 && lvlNum <= 1000 && val) {
          completed[lvlNum] = {
            stars: Math.min(3, Math.max(1, Number(val.stars) || 1)),
            bestTime: Number(val.bestTime) || 30,
            completedAt: val.completedAt || new Date().toISOString(),
          };
        }
      });
    }

    let starSum = 0;
    Object.values(completed).forEach((c) => (starSum += c.stars));

    return {
      version: 2,
      currentWorld: currentWld,
      currentLevel: currentLvl,
      unlockedLevels: unlocked,
      completedLevels: completed,
      totalCoins: Math.max(0, Number(parsed.totalCoins) || 0),
      settings: {
        sfxVolume: typeof parsed.settings?.sfxVolume === 'number' ? parsed.settings.sfxVolume : DEFAULT_SETTINGS.sfxVolume,
        musicVolume: typeof parsed.settings?.musicVolume === 'number' ? parsed.settings.musicVolume : DEFAULT_SETTINGS.musicVolume,
        sfxEnabled: typeof parsed.settings?.sfxEnabled === 'boolean' ? parsed.settings.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
        musicEnabled: typeof parsed.settings?.musicEnabled === 'boolean' ? parsed.settings.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
        touchControls: parsed.settings?.touchControls || 'auto',
        haptics: parsed.settings?.haptics ?? true,
        showFps: parsed.settings?.showFps ?? false,
      },
      stats: {
        totalJumps: Number(parsed.stats?.totalJumps) || 0,
        totalDeaths: Number(parsed.stats?.totalDeaths) || 0,
        totalStars: starSum,
        bossesDefeated: Number(parsed.stats?.bossesDefeated) || 0,
        playTimeSeconds: Number(parsed.stats?.playTimeSeconds) || 0,
      },
    };
  }

  /**
   * Migrate progress from older versions (e.g. 1200-level schema)
   */
  private static migrateLegacyData(legacy: any): SaveData {
    const rawUnlocked = legacy.unlockedLevels || legacy.maxLevel || legacy.highestLevel || 1;
    // Map max 1200 level cap cleanly to 1000 level campaign
    const clampedUnlocked = Math.min(1000, Math.max(1, Number(rawUnlocked) || 1));
    const currentLvl = Math.min(1000, Math.max(1, Number(legacy.currentLevel || legacy.level) || 1));
    const currentWld = Math.min(50, Math.max(1, Math.floor((currentLvl - 1) / 20) + 1));

    const completed: Record<number, LevelProgress> = {};
    if (legacy.completedLevels) {
      if (Array.isArray(legacy.completedLevels)) {
        legacy.completedLevels.forEach((lvl: number) => {
          if (lvl <= 1000) {
            completed[lvl] = { stars: 3, bestTime: 25, completedAt: new Date().toISOString() };
          }
        });
      } else if (typeof legacy.completedLevels === 'object') {
        Object.entries(legacy.completedLevels).forEach(([k, v]: [string, any]) => {
          const num = parseInt(k, 10);
          if (num <= 1000) {
            completed[num] = {
              stars: Math.min(3, Math.max(1, Number(v?.stars || v) || 1)),
              bestTime: Number(v?.bestTime) || 30,
              completedAt: v?.completedAt || new Date().toISOString(),
            };
          }
        });
      }
    }

    return {
      version: 2,
      currentWorld: currentWld,
      currentLevel: currentLvl,
      unlockedLevels: clampedUnlocked,
      completedLevels: completed,
      totalCoins: Number(legacy.coins || legacy.totalCoins) || 0,
      settings: DEFAULT_SETTINGS,
      stats: {
        totalJumps: Number(legacy.totalJumps) || 0,
        totalDeaths: Number(legacy.totalDeaths) || 0,
        totalStars: Object.values(completed).reduce((acc, c) => acc + c.stars, 0),
        bossesDefeated: Number(legacy.bossesDefeated) || 0,
        playTimeSeconds: Number(legacy.playTime) || 0,
      },
    };
  }
}
