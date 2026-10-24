/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WorldTheme =
  | 'meadows'
  | 'sky'
  | 'canyon'
  | 'ruins'
  | 'water'
  | 'gearwork'
  | 'wind'
  | 'ice'
  | 'magma'
  | 'boss_goliath'
  | 'warp'
  | 'gravity'
  | 'quake'
  | 'bounce'
  | 'underwater'
  | 'neon'
  | 'critter'
  | 'archipelago'
  | 'magnetic'
  | 'boss_mecha'
  | 'crystal'
  | 'shadow'
  | 'ticktock'
  | 'electric'
  | 'desert'
  | 'conveyor'
  | 'reverse'
  | 'piston'
  | 'chroma'
  | 'boss_wyrm'
  | 'cosmic'
  | 'lunar'
  | 'asteroid'
  | 'hypersonic'
  | 'phantom'
  | 'prism'
  | 'rising_lava'
  | 'multi_portal'
  | 'swarm'
  | 'boss_cyber'
  | 'forest'
  | 'grav_vortex'
  | 'sequencer'
  | 'tempest'
  | 'hazard'
  | 'vector_rift'
  | 'trilock'
  | 'crucible'
  | 'master'
  | 'boss_void';

export interface WorldDefinition {
  id: number; // 1 to 50
  name: string;
  theme: WorldTheme;
  mechanicName: string;
  mechanicDescription: string;
  bgColor1: string;
  bgColor2: string;
  platformColor: string;
  platformAccent: string;
  hazardColor: string;
  bossName?: string;
  ambientParticles?: 'dust' | 'bubbles' | 'snow' | 'sparks' | 'leaves' | 'stars' | 'sand' | 'fog';
}

export interface Vector2D {
  x: number;
  y: number;
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type:
    | 'normal'
    | 'moving'
    | 'crumbling'
    | 'ice'
    | 'conveyor'
    | 'bouncy'
    | 'electric'
    | 'invisible'
    | 'sequencer'
    | 'floating';
  // Moving platform properties
  vx?: number;
  vy?: number;
  startX?: number;
  startY?: number;
  distanceX?: number;
  distanceY?: number;
  speed?: number;
  // Crumbling
  crumbleTimer?: number;
  crumbleState?: 'idle' | 'shaking' | 'fallen' | 'respawning';
  // Conveyor speed (positive = right, negative = left)
  conveyorSpeed?: number;
  // Electric timing
  electricActive?: boolean;
  electricCycle?: number;
  // Sequencer step
  sequenceStep?: number;
  revealed?: boolean;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  activated: boolean;
  activeAnimTimer: number;
}

export interface Star {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  scaleAnim?: number;
}

export interface Coin {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  value: number;
}

export interface Hazard {
  id: string;
  type: 'spike' | 'fire' | 'saw' | 'falling_rock' | 'laser';
  x: number;
  y: number;
  width: number;
  height: number;
  // For saw/rotating
  angle?: number;
  rotationSpeed?: number;
  radius?: number;
  startX?: number;
  minX?: number;
  maxX?: number;
  vx?: number;
  // For falling rock
  falling?: boolean;
  vy?: number;
  triggered?: boolean;
  initialY?: number;
  shakeTimer?: number;
  state?: 'idle' | 'warning' | 'falling' | 'shattered';
  respawnTimer?: number;
  // For laser
  laserActive?: boolean;
  laserCycle?: number;
  orientation?: 'horizontal' | 'vertical';
  length?: number;
}

export interface Portal {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  channel: number;
  exitDirection?: { x: number; y: number };
}

export interface Trampoline {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bounceForce: number;
  springCompress?: number;
}

export interface GravitySwitch {
  id: string;
  x: number;
  y: number;
  direction: 1 | -1; // 1 = normal down, -1 = upside down
  cooldown?: number;
}

export interface WaterZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  forceX: number;
  forceY: number;
}

export interface SpeedBooster {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'left' | 'right';
  boost: number;
}

export interface PuzzleSwitch {
  id: string;
  x: number;
  y: number;
  color: 'red' | 'blue' | 'yellow';
  pressed: boolean;
  gateTargetId: string;
}

export interface PuzzleGate {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: 'red' | 'blue' | 'yellow';
  open: boolean;
}

export interface TimedDoor {
  id: string;
  buttonX: number;
  buttonY: number;
  doorX: number;
  doorY: number;
  doorWidth: number;
  doorHeight: number;
  timer: number;
  maxTime: number;
  open: boolean;
}

export interface Enemy {
  id: string;
  type: 'patrol' | 'jumper' | 'flying' | 'drone';
  x: number;
  y: number;
  startX: number;
  minX: number;
  maxX: number;
  vx: number;
  vy: number;
  radius: number;
  alive: boolean;
  facing: 1 | -1;
  color: string;
  startY?: number;
  groundY?: number;
  jumpTimer?: number;
  isAirborne?: boolean;
  squashX?: number;
  squashY?: number;
  wingAngle?: number;
  hoverTimer?: number;
}

export interface BossEntity {
  name: string;
  type: 'goliath' | 'mecha' | 'wyrm' | 'cyber' | 'void';
  x: number;
  y: number;
  width: number;
  height: number;
  maxHealth: number;
  currentHealth: number;
  state: 'idle' | 'charging' | 'jumping' | 'stunned' | 'attacking' | 'defeated';
  stateTimer: number;
  facing: 1 | -1;
  vx: number;
  vy: number;
  invulnerableTimer: number;
  projectiles: { x: number; y: number; vx: number; vy: number; radius: number }[];
}

export interface AdventureKey {
  id: string;
  x: number;
  y: number;
  color: 'red' | 'blue' | 'yellow' | 'gold';
  collected: boolean;
  gateTargetId: string;
}

export interface SecretArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  revealed: boolean;
  hint: string;
}

export interface LevelData {
  levelNumber: number; // 1 to 1000
  worldId: number; // 1 to 50
  width: number;
  height: number;
  playerStart: Vector2D;
  goal: Vector2D;
  platforms: Platform[];
  checkpoints: Checkpoint[];
  stars: Star[];
  coins: Coin[];
  hazards: Hazard[];
  portals: Portal[];
  trampolines: Trampoline[];
  gravitySwitches: GravitySwitch[];
  waterZones: WaterZone[];
  windZones: WindZone[];
  speedBoosters: SpeedBooster[];
  puzzleSwitches: PuzzleSwitch[];
  puzzleGates: PuzzleGate[];
  timedDoors: TimedDoor[];
  keys: AdventureKey[];
  secretAreas?: SecretArea[];
  enemies: Enemy[];
  boss?: BossEntity;
  risingLava?: {
    active: boolean;
    y: number;
    speed: number;
  };
  hasDarkness?: boolean;
  hasReverseControls?: boolean;
  isLowGravity?: boolean;
  worldTheme: WorldTheme;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isGrounded: boolean;
  jumpCount: number;
  squashX: number;
  squashY: number;
  rollAngle: number;
  invulnerableTimer: number;
  facingDirection: 1 | -1;
  isSubmerged: boolean;
  inReverseZone: boolean;
  gravityDirection: 1 | -1;
  flashlightAngle?: number;
  alive: boolean;
  lives: number;
  maxLives: number;
  keysCarried: string[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  maxLife: number;
  currentLife: number;
  type?: 'spark' | 'smoke' | 'star' | 'bubble' | 'confetti';
}

export interface GameSettings {
  sfxVolume: number;
  musicVolume: number;
  sfxEnabled: boolean;
  musicEnabled: boolean;
  touchControls: 'auto' | 'always' | 'never';
  haptics: boolean;
  showFps: boolean;
}

export interface LevelProgress {
  stars: number; // 0..3
  bestTime: number; // in seconds
  completedAt: string;
}

export interface SaveData {
  version: number;
  currentWorld: number;
  currentLevel: number;
  unlockedLevels: number;
  completedLevels: Record<number, LevelProgress>;
  totalCoins: number;
  settings: GameSettings;
  stats: {
    totalJumps: number;
    totalDeaths: number;
    totalStars: number;
    bossesDefeated: number;
    playTimeSeconds: number;
  };
}
