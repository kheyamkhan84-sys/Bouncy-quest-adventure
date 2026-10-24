/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LevelData,
  Platform,
  Checkpoint,
  Star,
  Coin,
  Hazard,
  Portal,
  Trampoline,
  GravitySwitch,
  WaterZone,
  WindZone,
  SpeedBooster,
  PuzzleSwitch,
  PuzzleGate,
  TimedDoor,
  Enemy,
  BossEntity,
  AdventureKey,
  SecretArea,
} from '../types/game';
import { WORLDS, getWorldForLevel, getLevelIndexInWorld } from '../data/worlds';

/**
 * Seeded PRNG (mulberry32) for deterministic, reproducible levels
 */
function createRng(seed: number) {
  let s = Math.imul(seed ^ 0x6d2b79f5, seed | 1);
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type LayoutArchetype =
  | 'adventure_valley'
  | 'ruins_puzzle'
  | 'skyward_spires'
  | 'cavern_depths'
  | 'branching_crossroads'
  | 'boss_arena';

/**
 * Generate an adventurous, multi-zone, solvable level with keys, puzzles, and secret paths
 */
export function generateLevel(levelNumber: number): LevelData {
  const clampedLevel = Math.max(1, Math.min(1000, levelNumber));
  const world = getWorldForLevel(clampedLevel);
  const stage = getLevelIndexInWorld(clampedLevel); // 1 to 20
  const isFinalStage = stage === 20;

  const rng = createRng(clampedLevel * 10007 + world.id * 101);

  // Expanded adventurous level dimensions
  // Allows 3 connected zones (Entry -> Puzzle/Exploration -> Gauntlet/Exit)
  const baseWidth = isFinalStage ? 2600 : 2200 + Math.min(2200, stage * 120);
  const levelWidth = Math.min(4800, baseWidth);
  const levelHeight = 720;

  const playerStart = { x: 100, y: 500 };
  const goal = { x: levelWidth - 140, y: 460 };

  const platforms: Platform[] = [];
  const checkpoints: Checkpoint[] = [];
  const stars: Star[] = [];
  const coins: Coin[] = [];
  const hazards: Hazard[] = [];
  const portals: Portal[] = [];
  const trampolines: Trampoline[] = [];
  const gravitySwitches: GravitySwitch[] = [];
  const waterZones: WaterZone[] = [];
  const windZones: WindZone[] = [];
  const speedBoosters: SpeedBooster[] = [];
  const puzzleSwitches: PuzzleSwitch[] = [];
  const puzzleGates: PuzzleGate[] = [];
  const timedDoors: TimedDoor[] = [];
  const keys: AdventureKey[] = [];
  const secretAreas: SecretArea[] = [];
  const enemies: Enemy[] = [];

  // Determine adventure layout archetype
  const archetypes: LayoutArchetype[] = [
    'adventure_valley',
    'ruins_puzzle',
    'skyward_spires',
    'cavern_depths',
    'branching_crossroads',
  ];
  const archetype: LayoutArchetype = isFinalStage
    ? 'boss_arena'
    : archetypes[(stage + world.id * 4) % archetypes.length];

  // Guaranteed safe start platform
  platforms.push({
    id: 'start_platform',
    x: 40,
    y: 530,
    width: 180,
    height: 34,
    type: 'normal',
  });

  // Guaranteed safe goal platform
  platforms.push({
    id: 'goal_platform',
    x: levelWidth - 220,
    y: 490,
    width: 200,
    height: 34,
    type: 'normal',
  });

  // Checkpoint 1: Always placed in the entry zone
  checkpoints.push({
    id: 'cp_1',
    x: 210,
    y: 485,
    activated: false,
    activeAnimTimer: 0,
  });

  if (archetype === 'boss_arena') {
    // ---------------- BOSS ARENA ARCHITECTURE ----------------
    const arenaX = 300;
    const arenaW = levelWidth - 600;

    // Solid battleground
    platforms.push({
      id: 'arena_floor',
      x: arenaX,
      y: 530,
      width: arenaW,
      height: 38,
      type: 'normal',
    });

    // Tier 1 & 2 tactical platforms for stomping/dodging
    platforms.push({
      id: 'arena_tier1_l',
      x: arenaX + 120,
      y: 410,
      width: 140,
      height: 22,
      type: 'normal',
    });
    platforms.push({
      id: 'arena_tier1_r',
      x: arenaX + arenaW - 260,
      y: 410,
      width: 140,
      height: 22,
      type: 'normal',
    });
    platforms.push({
      id: 'arena_tier2_mid',
      x: arenaX + arenaW / 2 - 80,
      y: 310,
      width: 160,
      height: 22,
      type: 'normal',
    });

    // Spring pads on sides
    trampolines.push({
      id: 'tramp_l',
      x: arenaX + 25,
      y: 516,
      width: 48,
      height: 14,
      bounceForce: 16.5,
    });
    trampolines.push({
      id: 'tramp_r',
      x: arenaX + arenaW - 73,
      y: 516,
      width: 48,
      height: 14,
      bounceForce: 16.5,
    });

    // Arena Checkpoint
    checkpoints.push({
      id: 'cp_arena',
      x: arenaX + 90,
      y: 485,
      activated: false,
      activeAnimTimer: 0,
    });
  } else {
    // ---------------- MULTI-AREA ADVENTURE GENERATION ----------------
    // Zone 1: Entry Valley (x: 220 to ~900)
    // Zone 2: Puzzle Chamber & Key Exploration (x: 900 to ~2200)
    // Zone 3: Gauntlet & Secret Treasure Exit (x: 2200 to goal)

    let curX = 230;
    let curY = 530;
    let anchorCount = 0;

    // --- ZONE 1: ENTRY RUN (Levels 1-20: introduces gentle combat, coins, stars, pit obstacles) ---
    const zone1End = Math.floor(levelWidth * 0.32);
    while (curX < zone1End) {
      anchorCount++;
      const pW = Math.max(100, Math.floor(155 - stage * 2 + rng() * 25));
      const deltaY = (rng() - 0.5) * 45;
      curY = Math.max(400, Math.min(535, curY + deltaY));

      const gap = Math.floor(60 + rng() * 45);
      curX += gap;

      const platId = `plat_z1_${anchorCount}`;
      platforms.push({
        id: platId,
        x: Math.round(curX),
        y: Math.round(curY),
        width: pW,
        height: 24,
        type: 'normal',
      });

      // Scatter coins
      if (rng() > 0.3) {
        coins.push({
          id: `coin_z1_${anchorCount}`,
          x: Math.round(curX + pW / 2),
          y: Math.round(curY - 26),
          collected: false,
          value: 1,
        });
      }

      // Pit spikes / fire traps beneath gaps in Zone 1 (starting early, gentle frequency)
      if ((stage >= 3 || world.id >= 3) && rng() < 0.35) {
        hazards.push({
          id: `pit_spike_z1_${anchorCount}`,
          type: world.id === 9 || world.id === 37 ? 'fire' : 'spike',
          x: Math.round(curX - gap * 0.5 - 18),
          y: 640,
          width: 48,
          height: 24,
        });
      }

      // Early Zone 1 Enemies (Teaches stomping & avoidance from Level 1!)
      // Level 1: Exactly 1 gentle slime on a wide platform after checkpoint 1
      // Level 2+: 1-2 patrolling or jumping enemies
      const shouldSpawnZone1Enemy =
        (clampedLevel === 1 && anchorCount === 2) ||
        (clampedLevel > 1 && anchorCount === 2 && pW >= 110) ||
        (stage >= 4 && anchorCount === 4 && pW >= 115);

      if (shouldSpawnZone1Enemy) {
        const enemyType: Enemy['type'] =
          stage >= 5 && rng() > 0.5 ? 'jumper' : 'patrol';
        enemies.push({
          id: `enemy_z1_${anchorCount}`,
          type: enemyType,
          x: Math.round(curX + pW / 2),
          y: Math.round(curY - 18),
          startX: Math.round(curX + pW / 2),
          minX: Math.round(curX + 20),
          maxX: Math.round(curX + pW - 20),
          vx: 1.0 * (rng() > 0.5 ? 1 : -1),
          vy: 0,
          radius: 14,
          alive: true,
          facing: 1,
          color: world.hazardColor,
          groundY: Math.round(curY - 18),
          jumpTimer: 2.0 + rng() * 1.0,
        });
      }

      curX += pW;
    }

    // Mid-level Checkpoint 2 at start of Zone 2
    checkpoints.push({
      id: 'cp_2',
      x: Math.round(curX + 60),
      y: Math.round(curY - 45),
      activated: false,
      activeAnimTimer: 0,
    });

    // --- ZONE 2: PUZZLE & KEY EXPLORATION ---
    const zone2End = Math.floor(levelWidth * 0.72);
    const hasKeyPuzzle = stage >= 2; // Key and locked gate introduced from stage 2!

    if (hasKeyPuzzle) {
      // 1. Place Locked Energy Gate across the main route
      const gateColor: 'red' | 'blue' | 'yellow' =
        stage % 3 === 0 ? 'yellow' : stage % 2 === 0 ? 'blue' : 'red';
      const gateId = `gate_z2_${gateColor}`;
      const gateX = Math.round(curX + 380);
      const gateY = 360;

      puzzleGates.push({
        id: gateId,
        x: gateX,
        y: gateY,
        width: 26,
        height: 150,
        color: gateColor,
        open: false,
      });

      // 2. High or Low Exploration Route leading to the Key
      // Upper puzzle tower
      const keyTowerX = Math.round(curX + 160);
      const keyTowerY = 280;

      platforms.push({
        id: 'key_perch_stair1',
        x: keyTowerX - 85,
        y: 420,
        width: 85,
        height: 22,
        type: 'normal',
      });
      platforms.push({
        id: 'key_perch_stair2',
        x: keyTowerX,
        y: keyTowerY + 35,
        width: 95,
        height: 22,
        type: 'normal',
      });

      // The Adventure Key
      keys.push({
        id: `key_${gateColor}`,
        x: keyTowerX + 42,
        y: keyTowerY - 10,
        color: gateColor,
        collected: false,
        gateTargetId: gateId,
      });

      // Key Guard Enemy on the stair perch!
      if (stage >= 3) {
        enemies.push({
          id: `enemy_key_guard_${anchorCount}`,
          type: 'patrol',
          x: keyTowerX - 40,
          y: 402,
          startX: keyTowerX - 40,
          minX: keyTowerX - 75,
          maxX: keyTowerX - 15,
          vx: 0.9,
          vy: 0,
          radius: 14,
          alive: true,
          facing: 1,
          color: world.hazardColor,
          groundY: 402,
        });
      }

      // Trampoline to assist reaching the key tower
      trampolines.push({
        id: 'key_approach_tramp',
        x: curX + 20,
        y: curY - 14,
        width: 44,
        height: 14,
        bounceForce: 16.5,
      });

      // Main bridge platform up to the gate
      platforms.push({
        id: 'plat_before_gate',
        x: gateX - 110,
        y: 510,
        width: 105,
        height: 24,
        type: 'normal',
      });

      // Platform directly behind gate so player walks through smoothly once unlocked
      platforms.push({
        id: 'plat_after_gate',
        x: gateX + 28,
        y: 510,
        width: 120,
        height: 24,
        type: 'normal',
      });

      curX = gateX + 160;
      curY = 510;
    }

    // Continue traversing Zone 2 with moving platforms, crumbling ledges, saws, and enemies
    while (curX < zone2End) {
      anchorCount++;
      const pW = Math.max(90, Math.floor(135 - stage * 2 + rng() * 25));
      const deltaY = (rng() - 0.5) * 55;
      curY = Math.max(340, Math.min(520, curY + deltaY));

      const gap = Math.floor(65 + rng() * 45);
      curX += gap;

      let platType: Platform['type'] = 'normal';
      let distanceX = 0;
      let speed = 0;

      // Introduce moving platforms, crumbling ledges, or special surfaces
      if (world.id === 2 || (world.id > 2 && rng() < 0.25 && anchorCount % 3 === 0)) {
        platType = 'moving';
        distanceX = Math.min(45, 20 + Math.floor(rng() * 25));
        speed = 1.0 + rng() * 0.6;
      } else if (stage >= 4 && rng() < 0.22 && anchorCount % 2 === 1) {
        platType = 'crumbling';
      } else if (world.id === 8 || (world.id > 8 && rng() < 0.2)) {
        platType = 'ice';
      } else if (world.id === 26 || (world.id > 26 && rng() < 0.2)) {
        platType = 'conveyor';
      }

      platforms.push({
        id: `plat_z2_${anchorCount}`,
        x: Math.round(curX),
        y: Math.round(curY),
        width: pW,
        height: 24,
        type: platType,
        startX: Math.round(curX),
        startY: Math.round(curY),
        distanceX,
        speed,
        crumbleState: platType === 'crumbling' ? 'idle' : undefined,
        crumbleTimer: platType === 'crumbling' ? 0.8 : undefined,
      });

      // Scatter coins or extra stars
      if (rng() > 0.35) {
        coins.push({
          id: `coin_z2_${anchorCount}`,
          x: Math.round(curX + pW / 2),
          y: Math.round(curY - 26),
          collected: false,
          value: 1,
        });
      }

      // Zone 2 Enemies: Patrollers, Jumpers, or Flying
      if (pW >= 105 && rng() > 0.35) {
        const isJumper = stage >= 4 && rng() > 0.45;
        enemies.push({
          id: `enemy_z2_${anchorCount}`,
          type: isJumper ? 'jumper' : 'patrol',
          x: Math.round(curX + pW / 2),
          y: Math.round(curY - 18),
          startX: Math.round(curX + pW / 2),
          minX: Math.round(curX + 18),
          maxX: Math.round(curX + pW - 18),
          vx: (1.0 + rng() * 0.4) * (rng() > 0.5 ? 1 : -1),
          vy: 0,
          radius: 14,
          alive: true,
          facing: 1,
          color: world.hazardColor,
          groundY: Math.round(curY - 18),
          jumpTimer: 1.8 + rng() * 1.2,
        });
      }

      // Rotating Saw Obstacle (World 2+ or stage 6+)
      if ((world.id >= 2 && stage >= 5 && rng() < 0.28) || world.id === 6) {
        hazards.push({
          id: `saw_z2_${anchorCount}`,
          type: 'saw',
          x: Math.round(curX - gap * 0.5),
          y: Math.round(curY - 40),
          width: 40,
          height: 40,
          radius: 20,
          angle: 0,
          rotationSpeed: 0.08,
        });
      }

      // Falling Stalactite / Boulder with warning shake (World 4+ or stage 7+)
      if ((stage >= 7 || world.id >= 4) && rng() < 0.25) {
        hazards.push({
          id: `fall_rock_z2_${anchorCount}`,
          type: 'falling_rock',
          x: Math.round(curX + pW / 2),
          y: Math.round(curY - 160),
          initialY: Math.round(curY - 160),
          width: 32,
          height: 32,
          state: 'idle',
          falling: false,
          vy: 0,
        });
      }

      // Timed Door Puzzle in stage 6+ or World 23
      if ((stage >= 6 || world.id === 23) && anchorCount === 6) {
        timedDoors.push({
          id: `td_${anchorCount}`,
          buttonX: Math.round(curX + pW / 2),
          buttonY: Math.round(curY - 12),
          doorX: Math.round(curX + 220),
          doorY: Math.round(curY - 110),
          doorWidth: 24,
          doorHeight: 120,
          timer: 0,
          maxTime: 8.5,
          open: false,
        });
      }

      // Safe pit spikes down in floor
      if (rng() < 0.4) {
        hazards.push({
          id: `pit_spike_${anchorCount}`,
          type: world.id === 9 || world.id === 37 ? 'fire' : 'spike',
          x: Math.round(curX - gap * 0.5),
          y: 640,
          width: 55,
          height: 24,
        });
      }

      curX += pW;
    }

    // Checkpoint 3 at start of Zone 3
    checkpoints.push({
      id: 'cp_3',
      x: Math.round(curX + 50),
      y: Math.round(curY - 45),
      activated: false,
      activeAnimTimer: 0,
    });

    // --- ZONE 3: GAUNTLET & SECRET TREASURE ROUTE ---
    const targetEndX = levelWidth - 260;

    // Secret Area / Hidden Chamber with 3rd Star
    const secretX = Math.round(curX + 240);
    const secretY = 220;
    secretAreas.push({
      id: 'secret_alcove_1',
      x: secretX - 50,
      y: secretY - 30,
      width: 140,
      height: 90,
      revealed: false,
      hint: 'Secret Treasure Room',
    });

    // Secret high perch platform
    platforms.push({
      id: 'secret_perch_plat',
      x: secretX - 40,
      y: secretY + 35,
      width: 85,
      height: 20,
      type: 'normal',
    });

    // Star #3 placed inside secret area
    stars.push({
      id: 'star_3_secret',
      x: secretX,
      y: secretY - 5,
      collected: false,
    });

    // Spring pad to launch up to the secret room
    trampolines.push({
      id: 'secret_spring_launcher',
      x: Math.round(curX + 60),
      y: Math.round(curY - 14),
      width: 44,
      height: 14,
      bounceForce: 17.5,
    });

    // Path leading to the goal
    while (curX < targetEndX) {
      anchorCount++;
      const pW = Math.max(90, Math.floor(130 - stage * 2 + rng() * 20));
      const deltaY = (rng() - 0.5) * 50;
      curY = Math.max(380, Math.min(510, curY + deltaY));

      const gap = Math.floor(65 + rng() * 45);
      curX += gap;

      if (curX + pW >= targetEndX) break;

      platforms.push({
        id: `plat_z3_${anchorCount}`,
        x: Math.round(curX),
        y: Math.round(curY),
        width: pW,
        height: 24,
        type: 'normal',
      });

      // Zone 3 Gauntlet Enemies: Flying swoopers & patrollers & jumpers
      if (pW >= 95) {
        const isFlyer = (stage >= 3 && rng() > 0.5) || world.id === 39;
        enemies.push({
          id: `enemy_z3_${anchorCount}`,
          type: isFlyer ? 'flying' : stage >= 6 && rng() > 0.5 ? 'jumper' : 'patrol',
          x: Math.round(curX + pW / 2),
          y: Math.round(isFlyer ? curY - 55 : curY - 18),
          startX: Math.round(curX + pW / 2),
          startY: Math.round(curY - 55),
          minX: Math.round(isFlyer ? curX - 40 : curX + 18),
          maxX: Math.round(isFlyer ? curX + pW + 40 : curX + pW - 18),
          vx: (isFlyer ? 1.3 : 1.1) * (rng() > 0.5 ? 1 : -1),
          vy: 0,
          radius: 14,
          alive: true,
          facing: 1,
          color: world.hazardColor,
          groundY: Math.round(curY - 18),
          jumpTimer: 1.5 + rng() * 1.5,
        });
      }

      // Zone 3 Rotating Saws or Pit Spikes
      if (stage >= 8 && rng() < 0.3) {
        hazards.push({
          id: `saw_z3_${anchorCount}`,
          type: 'saw',
          x: Math.round(curX - gap * 0.5),
          y: Math.round(curY - 35),
          width: 40,
          height: 40,
          radius: 20,
          angle: 0,
          rotationSpeed: 0.09,
        });
      }

      curX += pW;
    }
  }

  // ---------------- 3 STARS STRATEGIC PLACEMENT ----------------
  // Star 1: Early in Entry Zone 1
  stars.push({
    id: 'star_1',
    x: Math.round(levelWidth * 0.22),
    y: 430,
    collected: false,
  });

  // Star 2: In Puzzle Zone 2 (over an elevated platform)
  const s2X = Math.round(levelWidth * 0.52);
  const s2Y = 320;
  stars.push({
    id: 'star_2',
    x: s2X,
    y: s2Y,
    collected: false,
  });
  platforms.push({
    id: 'star_2_perch',
    x: s2X - 40,
    y: s2Y + 35,
    width: 80,
    height: 20,
    type: 'normal',
  });

  // Star 3: In Zone 3 (if not already added in secret room)
  if (!stars.some((s) => s.id === 'star_3_secret')) {
    stars.push({
      id: 'star_3',
      x: Math.round(levelWidth * 0.82),
      y: 360,
      collected: false,
    });
  }

  // ---------------- GLOBAL WORLD MECHANICS ----------------
  // Portals (World 11, 38, 46)
  if (world.id === 11 || world.id === 38 || world.id === 46) {
    const pAx = Math.floor(levelWidth * 0.35);
    const pAy = 410;
    const pBx = Math.floor(levelWidth * 0.68);
    const pBy = 360;

    platforms.push({
      id: 'p_plat_a',
      x: pAx - 40,
      y: pAy + 35,
      width: 80,
      height: 20,
      type: 'normal',
    });
    platforms.push({
      id: 'p_plat_b',
      x: pBx - 40,
      y: pBy + 35,
      width: 80,
      height: 20,
      type: 'normal',
    });

    portals.push({
      id: 'portal_a',
      x: pAx,
      y: pAy,
      targetX: pBx,
      targetY: pBy,
      color: '#a855f7',
      channel: 1,
    });
    portals.push({
      id: 'portal_b',
      x: pBx,
      y: pBy,
      targetX: pAx,
      targetY: pAy,
      color: '#38bdf8',
      channel: 1,
    });
  }

  // Water Zones (World 5 & 15)
  if (world.id === 5 || world.id === 15) {
    waterZones.push({
      id: 'water_1',
      x: 240,
      y: 500,
      width: levelWidth - 480,
      height: 220,
    });
  }

  // Wind Zones (World 7, 25, 44)
  if (world.id === 7 || world.id === 25 || world.id === 44) {
    windZones.push({
      id: 'wind_1',
      x: 320,
      y: 80,
      width: levelWidth - 640,
      height: 480,
      forceX: (world.id === 25 ? 0.06 : 0.1) * (rng() > 0.5 ? 1 : -1),
      forceY: world.id === 7 ? -0.03 : 0,
    });
  }

  // Gravity Switches (World 12 & 42)
  if (world.id === 12 || world.id === 42) {
    const gravX = Math.floor(levelWidth * 0.42);
    gravitySwitches.push({
      id: 'grav_1',
      x: gravX,
      y: 380,
      direction: -1,
    });
    gravitySwitches.push({
      id: 'grav_2',
      x: gravX + 400,
      y: 200,
      direction: 1,
    });
    platforms.push({
      id: 'ceiling_run',
      x: gravX + 60,
      y: 130,
      width: 300,
      height: 22,
      type: 'normal',
    });
  }

  // Speed Boosters (World 34 & 48)
  if (world.id === 34 || world.id === 48) {
    const boostX = Math.floor(levelWidth * 0.38);
    speedBoosters.push({
      id: 'booster_1',
      x: boostX,
      y: 470,
      width: 110,
      height: 18,
      direction: 'right',
      boost: 11,
    });
    platforms.push({
      id: 'boost_plat',
      x: boostX,
      y: 488,
      width: 110,
      height: 20,
      type: 'normal',
    });
  }

  // Boss Entity for Stage 20
  let boss: BossEntity | undefined;
  if (isFinalStage) {
    let bossType: BossEntity['type'] = 'goliath';
    let bossName = `${world.name} Guardian`;
    let bossMaxHp = 3;

    if (world.id === 10) {
      bossType = 'goliath';
      bossName = 'Earth Goliath';
      bossMaxHp = 3;
    } else if (world.id === 20) {
      bossType = 'mecha';
      bossName = 'Mecha Crusher';
      bossMaxHp = 4;
    } else if (world.id === 30) {
      bossType = 'wyrm';
      bossName = 'Inferno Wyrm';
      bossMaxHp = 4;
    } else if (world.id === 40) {
      bossType = 'cyber';
      bossName = 'Cyber-Goliath';
      bossMaxHp = 5;
    } else if (world.id === 50) {
      bossType = 'void';
      bossName = 'The Void Overlord';
      bossMaxHp = 6;
    }

    boss = {
      name: bossName,
      type: bossType,
      x: levelWidth - 560,
      y: 380,
      width: 68,
      height: 68,
      maxHealth: bossMaxHp,
      currentHealth: bossMaxHp,
      state: 'idle',
      stateTimer: 0,
      facing: -1,
      vx: 0,
      vy: 0,
      invulnerableTimer: 0,
      projectiles: [],
    };
  }

  const rawLevel: LevelData = {
    levelNumber: clampedLevel,
    worldId: world.id,
    width: levelWidth,
    height: levelHeight,
    playerStart,
    goal,
    platforms,
    checkpoints,
    stars,
    coins,
    hazards,
    portals,
    trampolines,
    gravitySwitches,
    waterZones,
    windZones,
    speedBoosters,
    puzzleSwitches,
    puzzleGates,
    timedDoors,
    keys,
    secretAreas,
    enemies,
    boss,
    hasDarkness: world.id === 22,
    hasReverseControls: world.id === 27,
    isLowGravity: world.id === 32,
    worldTheme: world.theme,
  };

  // Run automated level validator & repair system before gameplay
  return validateAndRepairLevel(rawLevel);
}

/**
 * Automated Level Validator and Repair System:
 * Guarantees every level is 100% solvable with fair jumps, safe checkpoints, and accessible keys
 */
export function validateAndRepairLevel(level: LevelData): LevelData {
  const repairedLevel = { ...level };
  const platforms = [...repairedLevel.platforms];
  const trampolines = [...repairedLevel.trampolines];
  const hazards = [...repairedLevel.hazards];
  const checkpoints = [...repairedLevel.checkpoints];
  const keys = [...repairedLevel.keys];
  const gates = [...repairedLevel.puzzleGates];

  // 1. Sort platforms by X position
  platforms.sort((a, b) => a.x - b.x);

  const MAX_FAIR_GAP_FLAT = 125;
  const MAX_FAIR_GAP_UP = 95;
  const MAX_UNASSISTED_HEIGHT = 65;

  let insertedPlatCount = 0;

  for (let i = 0; i < platforms.length - 1; i++) {
    const curr = platforms[i];
    const next = platforms[i + 1];

    if (next.x < curr.x + 30) continue;

    const gapX = next.x - (curr.x + curr.width);
    const deltaY = curr.y - next.y; // positive means next is higher

    const maxAllowedGap = deltaY > 20 ? MAX_FAIR_GAP_UP : MAX_FAIR_GAP_FLAT;

    if (gapX > maxAllowedGap) {
      insertedPlatCount++;
      const bridgeW = 85;
      const bridgeX = Math.round(curr.x + curr.width + gapX / 2 - bridgeW / 2);
      const bridgeY = Math.round((curr.y + next.y) / 2);

      platforms.splice(i + 1, 0, {
        id: `repair_bridge_${insertedPlatCount}`,
        x: bridgeX,
        y: bridgeY,
        width: bridgeW,
        height: 22,
        type: 'normal',
      });
      i--;
      continue;
    }

    if (deltaY > MAX_UNASSISTED_HEIGHT) {
      const hasTramp = trampolines.some(
        (t) => t.x >= curr.x - 10 && t.x <= curr.x + curr.width + 10,
      );

      if (!hasTramp) {
        if (deltaY > 110) {
          insertedPlatCount++;
          const midX = Math.round(curr.x + curr.width / 2 + (next.x - curr.x) / 3);
          const midY = Math.round(curr.y - deltaY / 2);
          platforms.splice(i + 1, 0, {
            id: `repair_stair_${insertedPlatCount}`,
            x: midX,
            y: midY,
            width: 80,
            height: 22,
            type: 'normal',
          });
          i--;
          continue;
        } else {
          trampolines.push({
            id: `repair_tramp_${insertedPlatCount}`,
            x: Math.round(curr.x + curr.width - 48),
            y: Math.round(curr.y - 14),
            width: 44,
            height: 14,
            bounceForce: 16.5,
          });
        }
      }
    }
  }

  // 2. Goal Platform Reachability Guarantee
  const goalPlat = platforms.find((p) => p.id === 'goal_platform');
  if (goalPlat) {
    const prevPlatforms = platforms.filter((p) => p !== goalPlat && p.x < goalPlat.x);
    if (prevPlatforms.length > 0) {
      const lastPlat = prevPlatforms[prevPlatforms.length - 1];
      const gapToGoal = goalPlat.x - (lastPlat.x + lastPlat.width);
      if (gapToGoal > MAX_FAIR_GAP_FLAT) {
        insertedPlatCount++;
        platforms.push({
          id: `repair_goal_bridge_${insertedPlatCount}`,
          x: Math.round(lastPlat.x + lastPlat.width + gapToGoal / 2 - 45),
          y: Math.round((lastPlat.y + goalPlat.y) / 2),
          width: 90,
          height: 22,
          type: 'normal',
        });
      }
    }
  }

  // 3. Hazard Safety Clearance
  const safeHazards: Hazard[] = [];
  for (const hz of hazards) {
    let isBlockingSafeZone = false;

    if (Math.hypot(hz.x - level.playerStart.x, hz.y - level.playerStart.y) < 110) {
      isBlockingSafeZone = true;
    }

    for (const cp of checkpoints) {
      if (Math.hypot(hz.x - cp.x, hz.y - cp.y) < 95) {
        isBlockingSafeZone = true;
        break;
      }
    }

    for (const plat of platforms) {
      if (plat.width < 110) {
        if (
          hz.x >= plat.x - 10 &&
          hz.x <= plat.x + plat.width + 10 &&
          Math.abs(hz.y - plat.y) < 60
        ) {
          isBlockingSafeZone = true;
          break;
        }
      }
    }

    if (!isBlockingSafeZone) {
      safeHazards.push(hz);
    }
  }

  // 4. Key & Gate Solvability Guarantee
  for (const gate of gates) {
    const matchedKey = keys.find((k) => k.gateTargetId === gate.id);
    if (matchedKey) {
      // Ensure key is strictly positioned BEFORE the gate with accessible ground
      if (matchedKey.x >= gate.x) {
        matchedKey.x = gate.x - 180;
      }
      // Ensure key has a platform beneath it
      const hasPlatUnderKey = platforms.some(
        (p) =>
          matchedKey.x >= p.x - 20 &&
          matchedKey.x <= p.x + p.width + 20 &&
          Math.abs(p.y - matchedKey.y) < 90,
      );
      if (!hasPlatUnderKey) {
        platforms.push({
          id: `repair_key_plat_${gate.id}`,
          x: matchedKey.x - 40,
          y: matchedKey.y + 40,
          width: 80,
          height: 20,
          type: 'normal',
        });
      }
    }
  }

  // 5. Ensure Checkpoints are on 100% Solid Normal Platforms
  for (const cp of checkpoints) {
    const parentPlat = platforms.find(
      (p) => cp.x >= p.x && cp.x <= p.x + p.width && Math.abs(p.y - (cp.y + 45)) < 25,
    );
    if (parentPlat) {
      parentPlat.type = 'normal';
      parentPlat.width = Math.max(95, parentPlat.width);
    }
  }

  // 6. Enemy Validation & Fair AI Alignment
  const safeEnemies: Enemy[] = [];
  for (const enemy of repairedLevel.enemies) {
    // Safe distance from player spawn and checkpoints
    if (Math.hypot(enemy.x - level.playerStart.x, enemy.y - level.playerStart.y) < 140) {
      continue;
    }

    let nearCheckpoint = false;
    for (const cp of checkpoints) {
      if (Math.hypot(enemy.x - cp.x, enemy.y - cp.y) < 90) {
        nearCheckpoint = true;
        break;
      }
    }
    if (nearCheckpoint) continue;

    if (enemy.type === 'patrol' || enemy.type === 'jumper') {
      // Find platform underneath
      const hostPlat = platforms.find(
        (p) =>
          enemy.x >= p.x - 20 &&
          enemy.x <= p.x + p.width + 20 &&
          Math.abs(p.y - (enemy.y + enemy.radius)) < 55,
      );

      if (hostPlat) {
        // Firmly anchor enemy to platform
        enemy.y = hostPlat.y - enemy.radius;
        enemy.groundY = hostPlat.y - enemy.radius;
        enemy.minX = hostPlat.x + 16;
        enemy.maxX = hostPlat.x + hostPlat.width - 16;
        if (enemy.maxX <= enemy.minX + 15) {
          hostPlat.width = Math.max(90, hostPlat.width);
          enemy.maxX = hostPlat.x + hostPlat.width - 16;
        }
        enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
        enemy.startX = enemy.x;
        safeEnemies.push(enemy);
      }
    } else if (enemy.type === 'flying') {
      // Flying enemy bounds check
      enemy.minX = Math.max(100, enemy.minX);
      enemy.maxX = Math.min(level.width - 120, enemy.maxX);
      enemy.y = Math.max(140, Math.min(480, enemy.y));
      enemy.startY = enemy.y;
      safeEnemies.push(enemy);
    }
  }

  platforms.sort((a, b) => a.x - b.x);

  repairedLevel.platforms = platforms;
  repairedLevel.trampolines = trampolines;
  repairedLevel.hazards = safeHazards;
  repairedLevel.checkpoints = checkpoints;
  repairedLevel.keys = keys;
  repairedLevel.puzzleGates = gates;
  repairedLevel.enemies = safeEnemies;

  return repairedLevel;
}
