/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  LevelData,
  PlayerState,
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
  Particle,
} from '../types/game';
import { SoundSystem } from '../services/audio';
import { getWorldForLevel } from '../data/worlds';

export interface GameEngineCallbacks {
  onLevelComplete: (starsEarned: number, timeSeconds: number, coins: number) => void;
  onStarCollected: (count: number) => void;
  onCoinCollected: (total: number) => void;
  onPlayerDeath: (livesRemaining: number) => void;
  onGameOver: () => void;
  onCheckpointActivated: (cpId: string) => void;
  onKeyCollected?: (keyColor: string) => void;
  onGateUnlocked?: (gateColor: string) => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameEngineCallbacks;

  public level: LevelData;
  public player: PlayerState;
  private particles: Particle[] = [];
  private camera = { x: 0, y: 0 };

  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  // Active inputs
  public keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
  };
  private prevJumpKey: boolean = false;
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;

  // Checkpoints
  private lastCheckpoint: Checkpoint | null = null;
  private levelStartTime: number = 0;
  private elapsedSeconds: number = 0;
  private collectedStarsCount: number = 0;
  private collectedCoinsCount: number = 0;

  // Death / Respawn state
  private isDying: boolean = false;
  private deathTimer: number = 0;

  // Level complete state
  public isCompleted: boolean = false;

  private originalLevelSnapshot: LevelData;

  constructor(canvas: HTMLCanvasElement, level: LevelData, callbacks: GameEngineCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    // Deep clone pristine level snapshot to prevent layout or monster position drift
    this.originalLevelSnapshot = JSON.parse(JSON.stringify(level));
    this.level = JSON.parse(JSON.stringify(level));
    this.callbacks = callbacks;

    this.player = this.createInitialPlayerState();
    this.levelStartTime = performance.now();
  }

  private createInitialPlayerState(): PlayerState {
    return {
      x: this.level.playerStart.x,
      y: this.level.playerStart.y,
      vx: 0,
      vy: 0,
      radius: 18,
      isGrounded: false,
      jumpCount: 0,
      squashX: 1,
      squashY: 1,
      rollAngle: 0,
      invulnerableTimer: 2.0, // Safe protection on initial spawn
      facingDirection: 1,
      isSubmerged: false,
      inReverseZone: false,
      gravityDirection: 1,
      alive: true,
      lives: 3,
      maxLives: 3,
      keysCarried: [],
    };
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.levelStartTime = performance.now();
    SoundSystem.startMusic(this.level.worldTheme);
    this.loop(this.lastTime);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    SoundSystem.stopMusic();
  }

  /**
   * Reset entire level to its pristine initial state.
   * Restores all eliminated monsters to their exact spawn positions with full health,
   * resets moving platforms, falling traps, switches, doors, keys, checkpoints, and player's 3 chances.
   */
  public resetLevel(): void {
    // 1. Deep clone from the saved original level snapshot to preserve exact deterministic layout
    this.level = JSON.parse(JSON.stringify(this.originalLevelSnapshot));

    // 2. Explicitly restore all enemies to exact original spawn positions and full vitality
    if (this.level.enemies) {
      this.level.enemies.forEach((enemy) => {
        enemy.alive = true;
        enemy.x = enemy.startX;
        enemy.y = enemy.startY !== undefined ? enemy.startY : (enemy.groundY !== undefined ? enemy.groundY : enemy.y);
        enemy.vx = Math.abs(enemy.vx || 1.2) * (enemy.facing || 1);
        enemy.vy = 0;
        enemy.isAirborne = false;
        enemy.jumpTimer = 1.8;
        enemy.squashX = 1;
        enemy.squashY = 1;
        enemy.hoverTimer = 0;
      });
    }

    // 3. Reset moving & special platforms
    if (this.level.platforms) {
      this.level.platforms.forEach((plat) => {
        if (plat.startX !== undefined) plat.x = plat.startX;
        if (plat.startY !== undefined) plat.y = plat.startY;
        if (plat.type === 'crumbling') {
          plat.crumbleState = 'idle';
          plat.crumbleTimer = 0.8;
        }
        if (plat.type === 'electric') {
          plat.electricCycle = 0;
          plat.electricActive = false;
        }
      });
    }

    // 4. Reset hazards (saws, falling rocks, lasers)
    if (this.level.hazards) {
      this.level.hazards.forEach((hz) => {
        if (hz.startX !== undefined) hz.x = hz.startX;
        if (hz.initialY !== undefined) hz.y = hz.initialY;
        if (hz.type === 'falling_rock') {
          hz.state = 'idle';
          hz.falling = false;
          hz.vy = 0;
          hz.shakeTimer = 0.4;
          hz.respawnTimer = 0;
        }
        if (hz.type === 'laser') {
          hz.laserCycle = 0;
          hz.laserActive = false;
        }
        if (hz.type === 'saw') {
          hz.angle = 0;
        }
      });
    }

    // 5. Reset puzzle switches, gates, timed doors, keys, checkpoints, stars, and coins
    if (this.level.puzzleSwitches) {
      this.level.puzzleSwitches.forEach((sw) => (sw.pressed = false));
    }
    if (this.level.puzzleGates) {
      this.level.puzzleGates.forEach((g) => (g.open = false));
    }
    if (this.level.timedDoors) {
      this.level.timedDoors.forEach((td) => {
        td.open = false;
        td.timer = 0;
      });
    }
    if (this.level.keys) {
      this.level.keys.forEach((k) => (k.collected = false));
    }
    if (this.level.checkpoints) {
      this.level.checkpoints.forEach((cp) => {
        cp.activated = false;
        cp.activeAnimTimer = 0;
      });
    }
    if (this.level.stars) {
      this.level.stars.forEach((s) => (s.collected = false));
    }
    if (this.level.coins) {
      this.level.coins.forEach((c) => (c.collected = false));
    }
    if (this.level.secretAreas) {
      this.level.secretAreas.forEach((sa) => (sa.revealed = false));
    }
    if (this.level.boss) {
      this.level.boss.currentHealth = this.level.boss.maxHealth;
      this.level.boss.state = 'idle';
      this.level.boss.projectiles = [];
      this.level.boss.invulnerableTimer = 0;
      this.level.boss.stateTimer = 0;
    }
    if (this.level.risingLava) {
      this.level.risingLava.y = this.originalLevelSnapshot.risingLava?.y ?? this.level.height;
    }

    // 6. Reset player state with 3 fresh chances (hearts) and safe protection
    this.lastCheckpoint = null;
    this.player = this.createInitialPlayerState();
    this.player.lives = 3;
    this.player.invulnerableTimer = 2.0;
    this.particles = [];
    this.isDying = false;
    this.deathTimer = 0;
    this.isCompleted = false;
    this.elapsedSeconds = 0;
    this.levelStartTime = performance.now();
    this.collectedStarsCount = 0;
    this.collectedCoinsCount = 0;

    // 7. Reset camera to center on initial player position
    this.camera.x = Math.max(0, Math.min(this.level.width - this.canvas.width, this.player.x - this.canvas.width / 2));
    this.camera.y = Math.max(-50, Math.min(this.level.height - this.canvas.height + 50, this.player.y - this.canvas.height / 2));
  }

  /**
   * Alias for restarting the level
   */
  public restartLevel(): void {
    this.resetLevel();
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;

    const dt = Math.min(0.04, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    if (!this.isPaused) {
      this.update(dt);
    }
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  /* ---------------- UPDATE LOGIC ---------------- */

  private update(dt: number): void {
    if (!this.isCompleted) {
      this.elapsedSeconds += dt;
    }

    // Handle dying & respawn state
    if (this.isDying) {
      this.deathTimer += dt;
      this.updateParticles(dt);
      // Only auto-respawn if player has remaining lives; otherwise wait for Game Over screen
      if (this.player.lives > 0 && this.deathTimer >= 1.0) {
        this.respawnPlayer();
      }
      return;
    }

    this.updatePlayer(dt);
    this.updateMechanics(dt);
    this.updateHazards(dt);
    this.updateEnemies(dt);
    if (this.level.boss) {
      this.updateBoss(dt);
    }
    this.updateParticles(dt);
    this.updateCamera();

    // Check goal condition
    const distToGoal = Math.hypot(this.player.x - this.level.goal.x, this.player.y - this.level.goal.y);
    if (distToGoal < this.player.radius + 24 && !this.isCompleted) {
      // If boss level, boss must be defeated first
      if (!this.level.boss || this.level.boss.currentHealth <= 0) {
        this.completeLevel();
      }
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Gravity calculation
    let grav = 0.48;
    if (this.level.isLowGravity) grav = 0.22;
    if (p.isSubmerged) grav = 0.12;

    const effectiveGravity = grav * p.gravityDirection;
    p.vy += effectiveGravity;

    // Terminal velocity
    const maxVy = p.isSubmerged ? 4.5 : 14;
    p.vy = Math.max(-maxVy, Math.min(maxVy, p.vy));

    // Handle inputs with reverse controls awareness
    let moveLeft = this.keys.left;
    let moveRight = this.keys.right;
    if (p.inReverseZone || this.level.hasReverseControls) {
      const temp = moveLeft;
      moveLeft = moveRight;
      moveRight = temp;
    }

    const accel = p.isGrounded ? 0.75 : 0.42;
    const maxSpeed = 5.6;

    if (moveLeft) {
      p.vx -= accel;
      p.facingDirection = -1;
    }
    if (moveRight) {
      p.vx += accel;
      p.facingDirection = 1;
    }

    // Friction
    let friction = 0.88;
    if (p.isGrounded) {
      friction = 0.82;
    }
    p.vx *= friction;

    // Coyote Time & Jump Buffering
    const isJumpPressed = this.keys.jump || this.keys.up;
    const isJumpJustPressed = isJumpPressed && !this.prevJumpKey;

    if (p.isGrounded) {
      this.coyoteTimer = 0.12; // 120ms coyote window
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (isJumpJustPressed) {
      this.jumpBufferTimer = 0.14; // 140ms input buffer
    } else {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }

    // Variable jump height cut when releasing early
    if (!isJumpPressed && this.prevJumpKey && p.vy * p.gravityDirection < -3.5) {
      p.vy *= 0.55;
    }

    // Execute jump
    if (this.jumpBufferTimer > 0 && (this.coyoteTimer > 0 || (p.isSubmerged && p.vy > -2))) {
      p.vy = -11.6 * p.gravityDirection;
      p.isGrounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      p.jumpCount++;
      p.squashX = 0.72;
      p.squashY = 1.38;
      SoundSystem.playJump();
      this.spawnJumpDust(p.x, p.y + p.radius * p.gravityDirection);
    }

    this.prevJumpKey = isJumpPressed;

    // Roll angle based on horizontal movement
    p.rollAngle += (p.vx / p.radius) * 1.2;

    // Apply squash/stretch elastic recovery
    p.squashX += (1 - p.squashX) * 0.15;
    p.squashY += (1 - p.squashY) * 0.15;

    // Tentative position updates
    p.x += p.vx;
    this.resolveHorizontalCollisions();

    p.y += p.vy;
    this.resolveVerticalCollisions();

    // Check bottom boundary fall
    if (p.y > this.level.height + 60 || p.y < -120) {
      this.eliminatePlayer();
    }
  }

  private resolveHorizontalCollisions(): void {
    const p = this.player;
    for (const plat of this.level.platforms) {
      if (plat.type === 'invisible' && !plat.revealed) continue;

      if (
        p.x + p.radius > plat.x &&
        p.x - p.radius < plat.x + plat.width &&
        p.y + p.radius * 0.7 > plat.y &&
        p.y - p.radius * 0.7 < plat.y + plat.height
      ) {
        if (p.vx > 0) {
          p.x = plat.x - p.radius;
          p.vx = 0;
          p.squashX = 0.82;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.width + p.radius;
          p.vx = 0;
          p.squashX = 0.82;
        }
      }
    }

    // Puzzle gates collision
    for (const gate of this.level.puzzleGates) {
      if (!gate.open) {
        if (
          p.x + p.radius > gate.x &&
          p.x - p.radius < gate.x + gate.width &&
          p.y + p.radius * 0.7 > gate.y &&
          p.y - p.radius * 0.7 < gate.y + gate.height
        ) {
          if (p.vx > 0) p.x = gate.x - p.radius;
          else if (p.vx < 0) p.x = gate.x + gate.width + p.radius;
          p.vx = 0;
        }
      }
    }
  }

  private resolveVerticalCollisions(): void {
    const p = this.player;
    let onGround = false;

    for (const plat of this.level.platforms) {
      if (plat.type === 'invisible' && !plat.revealed) {
        // Reveal if very close
        const dist = Math.hypot(p.x - (plat.x + plat.width / 2), p.y - plat.y);
        if (dist < 120) plat.revealed = true;
        continue;
      }

      // Check standing on top (normal gravity)
      if (p.gravityDirection === 1) {
        if (
          p.x + p.radius * 0.75 > plat.x &&
          p.x - p.radius * 0.75 < plat.x + plat.width &&
          p.y + p.radius >= plat.y &&
          p.y + p.radius <= plat.y + 18 &&
          p.vy >= 0
        ) {
          p.y = plat.y - p.radius;
          if (p.vy > 4) {
            p.squashX = 1.35;
            p.squashY = 0.65;
            SoundSystem.playBounce();
          }
          p.vy = 0;
          onGround = true;

          // Conveyor belt push
          if (plat.type === 'conveyor' && plat.conveyorSpeed) {
            p.x += plat.conveyorSpeed;
          }

          // Electric platform shock
          if (plat.type === 'electric' && plat.electricActive && p.invulnerableTimer <= 0) {
            this.eliminatePlayer();
            return;
          }

          // Crumbling platform trigger
          if (plat.type === 'crumbling') {
            if (!plat.crumbleState || plat.crumbleState === 'idle') {
              plat.crumbleState = 'shaking';
              plat.crumbleTimer = 0.8;
            }
          }
        }
      } else {
        // Upside down gravity
        if (
          p.x + p.radius * 0.75 > plat.x &&
          p.x - p.radius * 0.75 < plat.x + plat.width &&
          p.y - p.radius <= plat.y + plat.height &&
          p.y - p.radius >= plat.y + plat.height - 18 &&
          p.vy <= 0
        ) {
          p.y = plat.y + plat.height + p.radius;
          p.vy = 0;
          onGround = true;
        }
      }
    }

    p.isGrounded = onGround;
  }

  private updateMechanics(dt: number): void {
    const p = this.player;

    // Moving platforms
    for (const plat of this.level.platforms) {
      if (plat.type === 'moving' && plat.startX !== undefined && plat.distanceX) {
        const time = performance.now() * 0.001 * (plat.speed || 1);
        const prevX = plat.x;
        plat.x = plat.startX + Math.sin(time) * plat.distanceX;

        // If player is on top of moving platform, carry them along
        if (
          p.isGrounded &&
          p.y + p.radius >= plat.y - 2 &&
          p.y + p.radius <= plat.y + 6 &&
          p.x >= plat.x - 10 &&
          p.x <= plat.x + plat.width + 10
        ) {
          p.x += plat.x - prevX;
        }
      }

      // Crumbling platform logic
      if (plat.type === 'crumbling' && plat.crumbleState === 'shaking') {
        plat.crumbleTimer = (plat.crumbleTimer || 0.8) - dt;
        if (plat.crumbleTimer <= 0) {
          plat.crumbleState = 'fallen';
          plat.y += 3000; // Drop offscreen temporarily
          window.setTimeout(() => {
            plat.y = plat.startY || 450;
            plat.crumbleState = 'idle';
          }, 3000);
        }
      }

      // Electric platforms cycle
      if (plat.type === 'electric') {
        plat.electricCycle = ((plat.electricCycle || 0) + dt * 2) % 4;
        plat.electricActive = plat.electricCycle > 2;
      }
    }

    // Checkpoint detection
    for (const cp of this.level.checkpoints) {
      const dist = Math.hypot(p.x - cp.x, p.y - cp.y);
      if (dist < 40 && !cp.activated) {
        cp.activated = true;
        cp.activeAnimTimer = 1.0;
        this.lastCheckpoint = cp;
        SoundSystem.playCheckpoint();
        this.spawnCheckpointCelebration(cp.x, cp.y);
        this.callbacks.onCheckpointActivated(cp.id);
      }
      if (cp.activeAnimTimer > 0) {
        cp.activeAnimTimer -= dt;
      }
    }

    // Stars collection
    for (const star of this.level.stars) {
      if (!star.collected) {
        const dist = Math.hypot(p.x - star.x, p.y - star.y);
        if (dist < p.radius + 18) {
          star.collected = true;
          this.collectedStarsCount++;
          SoundSystem.playStarCollect();
          this.spawnStarSparkles(star.x, star.y);
          this.callbacks.onStarCollected(this.collectedStarsCount);
        }
      }
    }

    // Coins collection
    for (const coin of this.level.coins) {
      if (!coin.collected) {
        const dist = Math.hypot(p.x - coin.x, p.y - coin.y);
        if (dist < p.radius + 14) {
          coin.collected = true;
          this.collectedCoinsCount += coin.value;
          SoundSystem.playCoin();
          this.callbacks.onCoinCollected(this.collectedCoinsCount);
        }
      }
    }

    // Trampolines
    for (const tramp of this.level.trampolines) {
      if (
        p.x + p.radius > tramp.x &&
        p.x - p.radius < tramp.x + tramp.width &&
        p.y + p.radius >= tramp.y - 6 &&
        p.y + p.radius <= tramp.y + tramp.height &&
        p.vy > 0
      ) {
        p.vy = -tramp.bounceForce;
        p.squashX = 0.65;
        p.squashY = 1.5;
        tramp.springCompress = 1.0;
        SoundSystem.playTrampoline();
      }
      if (tramp.springCompress && tramp.springCompress > 0) {
        tramp.springCompress -= dt * 4;
      }
    }

    // Portals
    for (const portal of this.level.portals) {
      const dist = Math.hypot(p.x - portal.x, p.y - portal.y);
      if (dist < 26) {
        p.x = portal.targetX + 30;
        p.y = portal.targetY;
        SoundSystem.playPortal();
        this.spawnPortalWarpParticles(portal.targetX, portal.targetY, portal.color);
      }
    }

    // Gravity switches
    for (const grav of this.level.gravitySwitches) {
      const dist = Math.hypot(p.x - grav.x, p.y - grav.y);
      if (dist < 28) {
        if (p.gravityDirection !== grav.direction) {
          p.gravityDirection = grav.direction;
          p.vy = -p.vy * 0.6;
          SoundSystem.playSwitch();
        }
      }
    }

    // Water zones
    let inWater = false;
    for (const water of this.level.waterZones) {
      if (
        p.x >= water.x &&
        p.x <= water.x + water.width &&
        p.y >= water.y &&
        p.y <= water.y + water.height
      ) {
        inWater = true;
        p.vx *= 0.94;
        p.vy *= 0.92;
        p.vy -= 0.18; // Buoyancy push
        if (Math.random() < 0.1) {
          this.spawnWaterBubble(p.x, p.y);
        }
      }
    }
    p.isSubmerged = inWater;

    // Wind zones
    for (const wind of this.level.windZones) {
      if (
        p.x >= wind.x &&
        p.x <= wind.x + wind.width &&
        p.y >= wind.y &&
        p.y <= wind.y + wind.height
      ) {
        p.vx += wind.forceX;
        p.vy += wind.forceY;
      }
    }

    // Speed boosters
    for (const boost of this.level.speedBoosters) {
      if (
        p.x + p.radius > boost.x &&
        p.x - p.radius < boost.x + boost.width &&
        Math.abs(p.y - boost.y) < 25
      ) {
        p.vx = boost.direction === 'right' ? boost.boost : -boost.boost;
        SoundSystem.playTrampoline();
      }
    }

    // Adventure Keys collection
    if (this.level.keys) {
      for (const key of this.level.keys) {
        if (!key.collected) {
          const dist = Math.hypot(p.x - key.x, p.y - key.y);
          if (dist < p.radius + 18) {
            key.collected = true;
            p.keysCarried.push(key.gateTargetId);
            SoundSystem.playKeyCollect();
            this.spawnKeyParticles(key.x, key.y, key.color);
            this.callbacks.onKeyCollected?.(key.color);
          }
        }
      }
    }

    // Unlock gates with carried keys
    for (const gate of this.level.puzzleGates) {
      if (!gate.open) {
        const distGate = Math.hypot(p.x - (gate.x + gate.width / 2), p.y - (gate.y + gate.height / 2));
        if (p.keysCarried.includes(gate.id) && distGate < 95) {
          gate.open = true;
          SoundSystem.playGateUnlock();
          this.spawnGateUnlockParticles(gate.x + gate.width / 2, gate.y + gate.height / 2, gate.color);
          this.callbacks.onGateUnlocked?.(gate.color);
        }
      }
    }

    // Secret areas discovery
    if (this.level.secretAreas) {
      for (const sa of this.level.secretAreas) {
        if (!sa.revealed) {
          if (
            p.x >= sa.x &&
            p.x <= sa.x + sa.width &&
            p.y >= sa.y &&
            p.y <= sa.y + sa.height
          ) {
            sa.revealed = true;
            SoundSystem.playStarCollect();
            this.spawnCelebrationSparks(sa.x + sa.width / 2, sa.y + sa.height / 2);
          }
        }
      }
    }

    // Puzzle switches
    for (const sw of this.level.puzzleSwitches) {
      if (!sw.pressed) {
        const dist = Math.hypot(p.x - sw.x, p.y - sw.y);
        if (dist < 26) {
          sw.pressed = true;
          SoundSystem.playSwitch();
          // Open matching gate
          const gate = this.level.puzzleGates.find((g) => g.id === sw.gateTargetId);
          if (gate) gate.open = true;
        }
      }
    }

    // Timed doors
    for (const td of this.level.timedDoors) {
      const distBtn = Math.hypot(p.x - td.buttonX, p.y - td.buttonY);
      if (distBtn < 28) {
        td.timer = td.maxTime;
        td.open = true;
        SoundSystem.playSwitch();
      }
      if (td.timer > 0) {
        td.timer -= dt;
        if (td.timer <= 0) {
          td.open = false;
        }
      }
    }

    // Rising lava
    if (this.level.risingLava && this.level.risingLava.active) {
      this.level.risingLava.y -= this.level.risingLava.speed;
      if (p.y + p.radius >= this.level.risingLava.y && p.invulnerableTimer <= 0) {
        this.eliminatePlayer();
      }
    }
  }

  private updateHazards(dt: number): void {
    const p = this.player;

    for (const hz of this.level.hazards) {
      // Rotating saw blade (with track patrolling if minX/maxX defined)
      if (hz.type === 'saw') {
        hz.angle = (hz.angle || 0) + (hz.rotationSpeed || 0.08);

        if (hz.minX !== undefined && hz.maxX !== undefined && hz.vx) {
          hz.x += hz.vx;
          if (hz.x >= hz.maxX) {
            hz.x = hz.maxX;
            hz.vx = -Math.abs(hz.vx);
          } else if (hz.x <= hz.minX) {
            hz.x = hz.minX;
            hz.vx = Math.abs(hz.vx);
          }
        }

        const radius = hz.radius || 20;
        const dist = Math.hypot(p.x - hz.x, p.y - hz.y);
        if (dist < p.radius + radius && p.invulnerableTimer <= 0) {
          this.eliminatePlayer();
          return;
        }
      }

      // Spikes & Fire
      if (hz.type === 'spike' || hz.type === 'fire') {
        if (
          p.x + p.radius * 0.7 > hz.x &&
          p.x - p.radius * 0.7 < hz.x + hz.width &&
          p.y + p.radius > hz.y &&
          p.y - p.radius < hz.y + hz.height &&
          p.invulnerableTimer <= 0
        ) {
          this.eliminatePlayer();
          return;
        }
      }

      // Falling rock with warning shake and respawn
      if (hz.type === 'falling_rock') {
        if (!hz.state || hz.state === 'idle') {
          // Detect player walking beneath
          if (Math.abs(p.x - hz.x) < 85 && p.y > hz.y && p.y < hz.y + 360) {
            hz.state = 'warning';
            hz.shakeTimer = 0.4;
          }
        } else if (hz.state === 'warning') {
          hz.shakeTimer = (hz.shakeTimer || 0.4) - dt;
          if (Math.random() < 0.3) {
            this.spawnJumpDust(hz.x, hz.y + hz.height / 2);
          }
          if (hz.shakeTimer <= 0) {
            hz.state = 'falling';
            hz.vy = 2.0;
            hz.falling = true;
          }
        } else if (hz.state === 'falling') {
          hz.vy = (hz.vy || 2) + 0.55;
          hz.y += hz.vy;

          // Check collision with platforms (shatters on impact)
          for (const plat of this.level.platforms) {
            if (
              hz.x >= plat.x - 10 &&
              hz.x <= plat.x + plat.width + 10 &&
              hz.y + hz.height / 2 >= plat.y &&
              hz.y + hz.height / 2 <= plat.y + 25
            ) {
              hz.state = 'shattered';
              hz.respawnTimer = 4.0;
              this.spawnRockShatterParticles(hz.x, hz.y);
              break;
            }
          }

          // Check collision with player
          if (
            hz.state === 'falling' &&
            Math.hypot(p.x - hz.x, p.y - hz.y) < p.radius + hz.width / 2 &&
            p.invulnerableTimer <= 0
          ) {
            this.eliminatePlayer();
            return;
          }

          // Offscreen fall check
          if (hz.y > this.level.height + 100) {
            hz.state = 'shattered';
            hz.respawnTimer = 3.5;
          }
        } else if (hz.state === 'shattered') {
          hz.respawnTimer = (hz.respawnTimer || 4.0) - dt;
          if (hz.respawnTimer <= 0) {
            hz.y = hz.initialY || hz.y - 200;
            hz.state = 'idle';
            hz.falling = false;
            hz.vy = 0;
          }
        }
      }

      // Lasers
      if (hz.type === 'laser') {
        hz.laserCycle = ((hz.laserCycle || 0) + 1) % 140;
        hz.laserActive = hz.laserCycle < 80;

        if (hz.laserActive) {
          if (
            p.x + p.radius > hz.x &&
            p.x - p.radius < hz.x + hz.width &&
            p.y + p.radius > hz.y &&
            p.y - p.radius < hz.y + hz.height &&
            p.invulnerableTimer <= 0
          ) {
            this.eliminatePlayer();
            return;
          }
        }
      }
    }
  }

  private updateEnemies(dt: number): void {
    const p = this.player;
    const time = performance.now() * 0.003;

    for (const enemy of this.level.enemies) {
      if (!enemy.alive) continue;

      if (enemy.type === 'patrol') {
        // Standard patrol walker
        enemy.x += enemy.vx;
        if (enemy.x > enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.vx = -Math.abs(enemy.vx);
          enemy.facing = -1;
        } else if (enemy.x < enemy.minX) {
          enemy.x = enemy.minX;
          enemy.vx = Math.abs(enemy.vx);
          enemy.facing = 1;
        }
      } else if (enemy.type === 'jumper') {
        // Jumping hopper monster
        if (!enemy.isAirborne) {
          // On ground: gentle shuffle and jump timer
          enemy.x += enemy.vx * 0.35;
          if (enemy.x > enemy.maxX) {
            enemy.x = enemy.maxX;
            enemy.vx = -Math.abs(enemy.vx);
            enemy.facing = -1;
          } else if (enemy.x < enemy.minX) {
            enemy.x = enemy.minX;
            enemy.vx = Math.abs(enemy.vx);
            enemy.facing = 1;
          }

          enemy.jumpTimer = (enemy.jumpTimer || 2.0) - dt;
          if (enemy.jumpTimer <= 0) {
            // Leap!
            enemy.isAirborne = true;
            enemy.vy = -7.8;
            enemy.facing = p.x < enemy.x ? -1 : 1;
            enemy.vx = enemy.facing * 1.8;
            enemy.squashX = 0.8;
            enemy.squashY = 1.3;
          }
        } else {
          // In air: parabolic arc
          enemy.vy = (enemy.vy || 0) + 0.36;
          enemy.y += enemy.vy;
          enemy.x += enemy.vx;

          if (enemy.x > enemy.maxX + 30) {
            enemy.x = enemy.maxX + 30;
            enemy.vx = -Math.abs(enemy.vx);
          } else if (enemy.x < enemy.minX - 30) {
            enemy.x = enemy.minX - 30;
            enemy.vx = Math.abs(enemy.vx);
          }

          const groundLimit = enemy.groundY || 500;
          if (enemy.y >= groundLimit) {
            enemy.y = groundLimit;
            enemy.vy = 0;
            enemy.isAirborne = false;
            enemy.squashX = 1.35;
            enemy.squashY = 0.75;
            enemy.jumpTimer = 1.6 + Math.random() * 1.2;
          }
        }
      } else if (enemy.type === 'flying') {
        // Sine-wave flying creature with flapping wings
        enemy.x += enemy.vx;
        if (enemy.x > enemy.maxX) {
          enemy.x = enemy.maxX;
          enemy.vx = -Math.abs(enemy.vx);
          enemy.facing = -1;
        } else if (enemy.x < enemy.minX) {
          enemy.x = enemy.minX;
          enemy.vx = Math.abs(enemy.vx);
          enemy.facing = 1;
        }

        const baseY = enemy.startY || 280;
        enemy.y = baseY + Math.sin(time * 3.2 + enemy.startX) * 28;
        enemy.wingAngle = Math.sin(time * 14) * 0.45;
      }

      // Smooth recovery of squash/stretch
      if (enemy.squashX && enemy.squashX !== 1) {
        enemy.squashX += (1 - enemy.squashX) * 0.12;
      }
      if (enemy.squashY && enemy.squashY !== 1) {
        enemy.squashY += (1 - enemy.squashY) * 0.12;
      }

      // Collision with player
      const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (dist < p.radius + enemy.radius) {
        // Fair Stomp Detection: Player is moving downward and above enemy center
        const isStomp = p.vy > 0 && p.y < enemy.y - 4;
        if (isStomp) {
          enemy.alive = false;
          p.vy = -10.5; // Big bouncy reward
          p.squashX = 0.7;
          p.squashY = 1.4;
          SoundSystem.playEnemyStomp();
          this.spawnEnemyDefeatParticles(enemy.x, enemy.y, enemy.color);
        } else if (p.invulnerableTimer <= 0) {
          // Touch from side or bottom damages player
          this.eliminatePlayer();
          return;
        }
      }
    }
  }

  private updateBoss(dt: number): void {
    const boss = this.level.boss;
    if (!boss || boss.currentHealth <= 0) return;

    const p = this.player;
    boss.stateTimer += dt;
    if (boss.invulnerableTimer > 0) boss.invulnerableTimer -= dt;

    // Boss state machine
    if (boss.state === 'idle') {
      boss.vx = 0;
      if (boss.stateTimer > 2.0) {
        boss.state = Math.random() > 0.5 ? 'charging' : 'jumping';
        boss.stateTimer = 0;
        boss.facing = p.x < boss.x ? -1 : 1;
      }
    } else if (boss.state === 'charging') {
      boss.vx = boss.facing * 3.2;
      boss.x += boss.vx;
      if (boss.stateTimer > 1.8) {
        boss.state = 'idle';
        boss.stateTimer = 0;
      }
    } else if (boss.state === 'jumping') {
      if (boss.stateTimer < 0.2) {
        boss.vy = -9;
      }
      boss.vy += 0.4;
      boss.y += boss.vy;
      if (boss.y >= 430) {
        boss.y = 430;
        boss.vy = 0;
        boss.state = 'idle';
        boss.stateTimer = 0;
        // Shockwave projectile
        boss.projectiles.push(
          { x: boss.x - 30, y: boss.y + 20, vx: -4, vy: 0, radius: 10 },
          { x: boss.x + 30, y: boss.y + 20, vx: 4, vy: 0, radius: 10 },
        );
      }
    }

    // Update projectiles
    for (let i = boss.projectiles.length - 1; i >= 0; i--) {
      const proj = boss.projectiles[i];
      proj.x += proj.vx;
      const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
      if (dist < p.radius + proj.radius && p.invulnerableTimer <= 0) {
        this.eliminatePlayer();
        return;
      }
      if (Math.abs(proj.x - boss.x) > 600) {
        boss.projectiles.splice(i, 1);
      }
    }

    // Player vs Boss head stomp
    const distToBoss = Math.hypot(p.x - boss.x, p.y - boss.y);
    if (distToBoss < p.radius + boss.width / 2) {
      const isHeadStomp = p.vy > 0 && p.y < boss.y - boss.height * 0.3;
      if (isHeadStomp && boss.invulnerableTimer <= 0) {
        boss.currentHealth -= 1;
        boss.invulnerableTimer = 1.2;
        p.vy = -12; // Big bounce
        SoundSystem.playBossHit();
        this.spawnBossHitSparks(boss.x, boss.y);

        if (boss.currentHealth <= 0) {
          boss.state = 'defeated';
          SoundSystem.playVictory();
          this.spawnBossDefeatExplosions(boss.x, boss.y);
        }
      } else if (p.invulnerableTimer <= 0 && boss.state !== 'defeated') {
        this.eliminatePlayer();
      }
    }
  }

  /* ---------------- CHECKPOINT & ELIMINATION SYSTEM ---------------- */

  /**
   * Strictly follows prompt requirements:
   * 1. Eliminate the player.
   * 2. Play a short animation.
   * 3. Wait one second.
   * 4. Respawn at the last activated checkpoint (or level start).
   * 5. Restore player health and reset velocity.
   * 6. Provide two seconds of temporary protection.
   * 7. Preserve previously collected stars & coins.
   * 8. Never restart the entire game after a fall.
   */
  public eliminatePlayer(): void {
    if (this.isDying) return;

    this.isDying = true;
    this.deathTimer = 0;
    this.player.alive = false;

    // Deduct one heart (chance)
    this.player.lives = Math.max(0, this.player.lives - 1);
    this.callbacks.onPlayerDeath(this.player.lives);

    if (this.player.lives > 0) {
      SoundSystem.playHurt();
      this.spawnDeathParticles(this.player.x, this.player.y);
    } else {
      // 3rd death: Game Over!
      SoundSystem.playGameOver();
      this.spawnDeathParticles(this.player.x, this.player.y);
      this.callbacks.onGameOver();
    }
  }

  private respawnPlayer(): void {
    this.isDying = false;
    this.deathTimer = 0;

    if (this.lastCheckpoint) {
      this.player.x = this.lastCheckpoint.x;
      this.player.y = this.lastCheckpoint.y;
    } else {
      this.player.x = this.level.playerStart.x;
      this.player.y = this.level.playerStart.y;
    }

    this.player.vx = 0;
    this.player.vy = 0;
    this.player.gravityDirection = 1;
    this.player.alive = true;
    this.player.invulnerableTimer = 2.0; // 2 seconds temporary protection
    this.player.squashX = 1;
    this.player.squashY = 1;
  }

  private completeLevel(): void {
    this.isCompleted = true;
    SoundSystem.playVictory();

    // Calculate stars: 3 max
    // Base 1 star for completion, +1 for 2+ stars collected, +1 for speed
    let starsEarned = Math.max(1, this.collectedStarsCount);
    if (starsEarned < 3 && this.elapsedSeconds < 45) {
      starsEarned = Math.min(3, starsEarned + 1);
    }

    this.callbacks.onLevelComplete(starsEarned, Math.round(this.elapsedSeconds), this.collectedCoinsCount);
  }

  private updateCamera(): void {
    const targetX = this.player.x - this.canvas.width / 2;
    const targetY = this.player.y - this.canvas.height / 2;

    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.08;

    // Bounds clamp
    this.camera.x = Math.max(0, Math.min(this.level.width - this.canvas.width, this.camera.x));
    this.camera.y = Math.max(-50, Math.min(this.level.height - this.canvas.height + 50, this.camera.y));
  }

  /* ---------------- PARTICLES ---------------- */

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.currentLife += dt;
      part.alpha = Math.max(0, 1 - part.currentLife / part.maxLife);

      if (part.currentLife >= part.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnJumpDust(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 1.5,
        radius: 3 + Math.random() * 3,
        color: 'rgba(255, 255, 255, 0.7)',
        alpha: 1,
        maxLife: 0.35,
        currentLife: 0,
      });
    }
  }

  private spawnDeathParticles(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4 + Math.random() * 4,
        color: '#ef4444',
        alpha: 1,
        maxLife: 0.8,
        currentLife: 0,
      });
    }
  }

  private spawnCheckpointCelebration(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 4,
        radius: 3 + Math.random() * 3,
        color: '#10b981',
        alpha: 1,
        maxLife: 0.9,
        currentLife: 0,
      });
    }
  }

  private spawnStarSparkles(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5,
        color: '#fbbf24',
        alpha: 1,
        maxLife: 0.6,
        currentLife: 0,
      });
    }
  }

  private spawnWaterBubble(x: number, y: number): void {
    this.particles.push({
      x: x + (Math.random() - 0.5) * 16,
      y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1 - Math.random() * 1.5,
      radius: 2.5 + Math.random() * 2.5,
      color: 'rgba(255, 255, 255, 0.6)',
      alpha: 0.8,
      maxLife: 1.2,
      currentLife: 0,
    });
  }

  private spawnKeyParticles(x: number, y: number, color: string): void {
    const c = color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#eab308';
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5,
        color: c,
        alpha: 1,
        maxLife: 0.7,
        currentLife: 0,
      });
    }
  }

  private spawnGateUnlockParticles(x: number, y: number, color: string): void {
    const c = color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#eab308';
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        radius: 4,
        color: c,
        alpha: 1,
        maxLife: 0.8,
        currentLife: 0,
      });
    }
  }

  private spawnCelebrationSparks(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 3,
        radius: 3.5,
        color: '#fbbf24',
        alpha: 1,
        maxLife: 0.8,
        currentLife: 0,
      });
    }
  }

  private spawnPortalWarpParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3,
        color,
        alpha: 1,
        maxLife: 0.5,
        currentLife: 0,
      });
    }
  }

  private spawnEnemyDefeatParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 3.5,
        color,
        alpha: 1,
        maxLife: 0.55,
        currentLife: 0,
      });
    }
  }

  private spawnRockShatterParticles(x: number, y: number): void {
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 5,
        vy: -1 - Math.random() * 4,
        radius: 2.5 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#78716c' : '#44403c',
        alpha: 1,
        maxLife: 0.6,
        currentLife: 0,
      });
    }
  }

  private spawnBossHitSparks(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: -3 - Math.random() * 4,
        radius: 4,
        color: '#fbbf24',
        alpha: 1,
        maxLife: 0.6,
        currentLife: 0,
      });
    }
  }

  private spawnBossDefeatExplosions(x: number, y: number): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5 + Math.random() * 5,
        color: Math.random() > 0.5 ? '#ef4444' : '#f59e0b',
        alpha: 1,
        maxLife: 1.2,
        currentLife: 0,
      });
    }
  }

  /* ---------------- RENDERING ---------------- */

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const world = getWorldForLevel(this.level.levelNumber);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw World Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, world.bgColor1);
    bgGrad.addColorStop(1, world.bgColor2);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parallax background decor (clouds, mountain silhouettes, distant stars)
    this.renderParallaxBackground(world);

    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));

    // 2. Render Platforms
    for (const plat of this.level.platforms) {
      if (plat.type === 'invisible' && !plat.revealed) {
        // Draw subtle star dust sparkle hint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(plat.x + 10, plat.y + 4, plat.width - 20, 2);
        continue;
      }
      this.renderPlatform(plat, world);
    }

    // 3. Render Water zones
    for (const water of this.level.waterZones) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.45)';
      ctx.fillRect(water.x, water.y, water.width, water.height);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(water.x, water.y, water.width, water.height);
    }

    // 4. Render Hazards
    for (const hz of this.level.hazards) {
      this.renderHazard(hz, world);
    }

    // 5. Render Mechanics (Portals, Trampolines, Switches, Timed doors, Boosters)
    this.renderMechanics();

    // 6. Render Checkpoints
    for (const cp of this.level.checkpoints) {
      this.renderCheckpoint(cp);
    }

    // 7. Render Collectibles (Coins & Stars)
    this.renderCollectibles();

    // 8. Render Enemies
    for (const enemy of this.level.enemies) {
      if (enemy.alive) {
        this.renderEnemy(enemy);
      }
    }

    // 9. Render Boss
    if (this.level.boss) {
      this.renderBoss(this.level.boss);
    }

    // 10. Render Goal Portal/Flag
    this.renderGoal();

    // 11. Render Particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 12. Render Player (The Red Bouncing Ball)
    if (this.player.alive) {
      this.renderPlayer();
    }

    // 13. Darkness & Light overlay (World 22 / hasDarkness)
    if (this.level.hasDarkness) {
      this.renderDarknessVignette();
    }

    // 14. Rising Lava
    if (this.level.risingLava && this.level.risingLava.active) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.fillRect(0, this.level.risingLava.y, this.level.width, 800);
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(0, this.level.risingLava.y, this.level.width, 8);
    }

    ctx.restore();
  }

  private renderParallaxBackground(world: any): void {
    const ctx = this.ctx;
    const canvas = this.canvas;

    // Distant mountain or hill silhouettes
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width; x += 120) {
      const hillY = canvas.height - 130 + Math.sin((x + this.camera.x * 0.15) * 0.015) * 40;
      ctx.lineTo(x, hillY);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private renderPlatform(plat: Platform, world: any): void {
    const ctx = this.ctx;
    const r = 8;

    ctx.save();
    let fillColor = world.platformColor;
    let accentColor = world.platformAccent;

    if (plat.type === 'ice') {
      fillColor = '#7dd3fc';
      accentColor = '#bae6fd';
    } else if (plat.type === 'conveyor') {
      fillColor = '#334155';
      accentColor = '#64748b';
    } else if (plat.type === 'electric') {
      fillColor = plat.electricActive ? '#facc15' : '#475569';
      accentColor = plat.electricActive ? '#fef08a' : '#64748b';
    } else if (plat.type === 'crumbling') {
      fillColor = '#71717a';
      accentColor = '#a1a1aa';
    }

    // Platform drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.roundRect(plat.x + 2, plat.y + 4, plat.width, plat.height, r);
    ctx.fill();

    // Platform Body with rounded corners
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(plat.x, plat.y, plat.width, plat.height, r);
    ctx.fill();

    // Top Highlight Accent Strip
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.roundRect(plat.x + 2, plat.y + 2, plat.width - 4, 6, [r, r, 0, 0]);
    ctx.fill();

    // Subtle edge highlight
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Conveyor Belt Arrows
    if (plat.type === 'conveyor' && plat.conveyorSpeed) {
      ctx.fillStyle = '#f8fafc';
      const dir = plat.conveyorSpeed > 0 ? 1 : -1;
      const count = Math.floor(plat.width / 24);
      for (let i = 0; i < count; i++) {
        const arrowX = plat.x + 12 + i * 24;
        ctx.beginPath();
        ctx.moveTo(arrowX, plat.y + 11);
        ctx.lineTo(arrowX + dir * 6, plat.y + 15);
        ctx.lineTo(arrowX, plat.y + 19);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private renderHazard(hz: Hazard, world: any): void {
    const ctx = this.ctx;

    if (hz.type === 'spike' || hz.type === 'fire') {
      ctx.save();
      const spikeColor = world.hazardColor || '#ef4444';
      const spikeCount = Math.max(1, Math.floor(hz.width / 16));
      const w = hz.width / spikeCount;

      for (let i = 0; i < spikeCount; i++) {
        const sx = hz.x + i * w;
        // Base plate
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(sx, hz.y + hz.height - 3, w, 3);

        // Gradient spike body
        const grad = ctx.createLinearGradient(sx, hz.y + hz.height, sx + w / 2, hz.y);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, spikeColor);
        grad.addColorStop(1, '#fef08a');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(sx + 1, hz.y + hz.height - 3);
        ctx.lineTo(sx + w / 2, hz.y);
        ctx.lineTo(sx + w - 1, hz.y + hz.height - 3);
        ctx.closePath();
        ctx.fill();

        // Left specular gleam
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx + 1, hz.y + hz.height - 3);
        ctx.lineTo(sx + w / 2, hz.y);
        ctx.stroke();
      }
      ctx.restore();
    } else if (hz.type === 'saw') {
      ctx.save();
      ctx.translate(hz.x, hz.y);
      ctx.rotate(hz.angle || 0);

      const radius = hz.radius || 22;

      // Outer razor blade teeth
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      const toothCount = 10;
      ctx.beginPath();
      for (let i = 0; i < toothCount; i++) {
        const angle = (i / toothCount) * Math.PI * 2;
        const nextAngle = ((i + 1) / toothCount) * Math.PI * 2;
        const toothTipAngle = angle + 0.18;

        const innerX = Math.cos(angle) * (radius - 5);
        const innerY = Math.sin(angle) * (radius - 5);
        const tipX = Math.cos(toothTipAngle) * (radius + 6);
        const tipY = Math.sin(toothTipAngle) * (radius + 6);
        const baseNextX = Math.cos(nextAngle) * (radius - 5);
        const baseNextY = Math.sin(nextAngle) * (radius - 5);

        if (i === 0) ctx.moveTo(innerX, innerY);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(baseNextX, baseNextY);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner danger disc
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, radius - 7, 0, Math.PI * 2);
      ctx.fill();

      // Central metallic bolt
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    } else if (hz.type === 'falling_rock') {
      if (hz.state === 'shattered') return;

      ctx.save();
      let drawX = hz.x;
      let drawY = hz.y;

      // Warning state: rapid wobble shake
      if (hz.state === 'warning') {
        drawX += (Math.random() - 0.5) * 6;

        // Danger exclamation mark
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', hz.x, hz.y - 18);
      }

      ctx.translate(drawX, drawY);

      // Jagged boulder outline
      ctx.fillStyle = '#57534e';
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2;

      const r = hz.width / 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.9);
      ctx.lineTo(r * 0.4, -r * 1.05);
      ctx.lineTo(r * 0.95, -r * 0.4);
      ctx.lineTo(r * 0.85, r * 0.7);
      ctx.lineTo(-r * 0.2, r * 1.0);
      ctx.lineTo(-r * 0.95, r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rock fissure lines
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.4);
      ctx.lineTo(0, r * 0.1);
      ctx.lineTo(r * 0.4, -r * 0.1);
      ctx.stroke();

      ctx.restore();
    } else if (hz.type === 'laser') {
      if (hz.laserActive) {
        ctx.save();
        // Danger beam glow corridor
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(hz.x - 4, hz.y, hz.width + 8, hz.height);

        // Core laser beam
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(hz.x - 1, hz.y, hz.width + 2, hz.height);

        // White core intense line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hz.x + 2, hz.y, Math.max(1, hz.width - 4), hz.height);
        ctx.restore();
      }
    }
  }

  private renderMechanics(): void {
    const ctx = this.ctx;

    // Portals
    for (const p of this.level.portals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const time = performance.now() * 0.003;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18 + Math.sin(time) * 3, 26 + Math.cos(time) * 3, time, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Trampolines
    for (const tramp of this.level.trampolines) {
      ctx.save();
      const comp = tramp.springCompress || 0;
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(tramp.x, tramp.y + comp * 6, tramp.width, tramp.height - comp * 4);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(tramp.x + 4, tramp.y + comp * 6, tramp.width - 8, 4);
      ctx.restore();
    }

    // Gravity Switches
    for (const grav of this.level.gravitySwitches) {
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(grav.x, grav.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      // Arrow pointing up or down
      const dir = grav.direction === 1 ? 1 : -1;
      ctx.moveTo(grav.x, grav.y + 8 * dir);
      ctx.lineTo(grav.x - 6, grav.y - 4 * dir);
      ctx.lineTo(grav.x + 6, grav.y - 4 * dir);
      ctx.fill();
      ctx.restore();
    }

    // Adventure Keys
    if (this.level.keys) {
      for (const key of this.level.keys) {
        if (!key.collected) {
          ctx.save();
          const time = performance.now() * 0.004;
          ctx.translate(key.x, key.y + Math.sin(time * 3 + key.x) * 4);

          const keyColor =
            key.color === 'red'
              ? '#ef4444'
              : key.color === 'blue'
              ? '#3b82f6'
              : '#eab308';

          // Glowing aura
          ctx.fillStyle =
            key.color === 'red'
              ? 'rgba(239, 68, 68, 0.3)'
              : key.color === 'blue'
              ? 'rgba(59, 130, 246, 0.3)'
              : 'rgba(234, 179, 8, 0.3)';
          ctx.beginPath();
          ctx.arc(0, 0, 18, 0, Math.PI * 2);
          ctx.fill();

          // Key Ring (Head)
          ctx.fillStyle = keyColor;
          ctx.beginPath();
          ctx.arc(0, -6, 7, 0, Math.PI * 2);
          ctx.fill();

          // Hollow inner ring
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, -6, 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Key Stem & Teeth
          ctx.fillStyle = keyColor;
          ctx.fillRect(-2, 0, 4, 12);
          ctx.fillRect(2, 4, 4, 3);
          ctx.fillRect(2, 9, 3, 3);

          ctx.restore();
        }
      }
    }

    // Secret Area subtle hints
    if (this.level.secretAreas) {
      for (const sa of this.level.secretAreas) {
        if (!sa.revealed) {
          ctx.save();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
          ctx.fillRect(sa.x, sa.y, sa.width, sa.height);
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 6]);
          ctx.strokeRect(sa.x, sa.y, sa.width, sa.height);
          ctx.restore();
        }
      }
    }

    // Puzzle switches
    for (const sw of this.level.puzzleSwitches) {
      ctx.save();
      ctx.fillStyle = sw.color === 'red' ? '#ef4444' : sw.color === 'blue' ? '#3b82f6' : '#eab308';
      ctx.fillRect(sw.x - 12, sw.y - (sw.pressed ? 4 : 10), 24, sw.pressed ? 6 : 12);
      ctx.restore();
    }

    // Puzzle Gates with Keyhole Lock
    for (const gate of this.level.puzzleGates) {
      if (!gate.open) {
        ctx.save();
        const gateColor =
          gate.color === 'red'
            ? '#ef4444'
            : gate.color === 'blue'
            ? '#3b82f6'
            : '#eab308';

        // Laser barrier field with scanline glow
        ctx.fillStyle = gateColor + '40';
        ctx.fillRect(gate.x, gate.y, gate.width, gate.height);

        // Glowing outer border
        ctx.strokeStyle = gateColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(gate.x, gate.y, gate.width, gate.height);

        // Center Lock Pad with keyhole
        const midY = gate.y + gate.height / 2;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(gate.x + gate.width / 2, midY, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = gateColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Keyhole shape
        ctx.fillStyle = gateColor;
        ctx.beginPath();
        ctx.arc(gate.x + gate.width / 2, midY - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(gate.x + gate.width / 2 - 2, midY - 1);
        ctx.lineTo(gate.x + gate.width / 2 + 2, midY - 1);
        ctx.lineTo(gate.x + gate.width / 2 + 3, midY + 5);
        ctx.lineTo(gate.x + gate.width / 2 - 3, midY + 5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private renderCheckpoint(cp: Checkpoint): void {
    const ctx = this.ctx;
    ctx.save();

    const isAct = cp.activated;
    const time = performance.now() * 0.005;

    // Glowing vertical light beacon on activated checkpoint
    if (isAct) {
      const grad = ctx.createLinearGradient(cp.x, cp.y, cp.x, cp.y - 120);
      grad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cp.x - 14, cp.y - 120, 28, 120);
    }

    // Pole
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cp.x - 3, cp.y - 34, 6, 38);

    // Flag with gentle wave
    const waveX = Math.sin(time + cp.x) * 2;
    ctx.fillStyle = isAct ? '#10b981' : '#64748b';
    ctx.beginPath();
    ctx.moveTo(cp.x + 3, cp.y - 34);
    ctx.lineTo(cp.x + 24 + waveX, cp.y - 23);
    ctx.lineTo(cp.x + 3, cp.y - 12);
    ctx.closePath();
    ctx.fill();

    // Glowing wave on activation
    if (isAct) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cp.x, cp.y - 22, 18 + Math.sin(time * 1.5) * 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCollectibles(): void {
    const ctx = this.ctx;
    const time = performance.now() * 0.004;

    // Coins with rotating 3D coin spin effect
    for (const coin of this.level.coins) {
      if (!coin.collected) {
        ctx.save();
        ctx.translate(coin.x, coin.y + Math.sin(time + coin.x) * 3);
        const spinScale = Math.cos(time * 3 + coin.x);
        ctx.scale(spinScale, 1);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Inner coin core
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Stars with warm glowing aura
    for (const star of this.level.stars) {
      if (!star.collected) {
        ctx.save();
        ctx.translate(star.x, star.y + Math.sin(time * 1.2 + star.x) * 4);

        // Radiant star aura
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, 20 + Math.sin(time * 2) * 3, 0, Math.PI * 2);
        ctx.fill();

        this.drawStarShape(ctx, 0, 0, 5, 14, 7, '#fbbf24', '#f59e0b');
        ctx.restore();
      }
    }
  }

  private drawStarShape(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerR: number,
    innerR: number,
    fill: string,
    stroke: string,
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerR;
      y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderEnemy(enemy: Enemy): void {
    const ctx = this.ctx;
    const time = performance.now() * 0.005;

    ctx.save();
    ctx.translate(enemy.x, enemy.y);

    const facing = enemy.facing || 1;

    if (enemy.type === 'patrol') {
      // ---------------- PATROLLING SLIME / GOBLIN ----------------
      const wobble = Math.sin(time * 3 + enemy.x * 0.05) * 0.08;
      ctx.scale(1 + wobble, 1 - wobble);

      // Slime Body
      const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, enemy.radius);
      bodyGrad.addColorStop(0, '#ffffff');
      bodyGrad.addColorStop(0.3, enemy.color);
      bodyGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      // Organic rounded blob with little antenna/horns
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // Twin cute horn bumps
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(-enemy.radius * 0.5, -enemy.radius * 0.85, 4.5, 0, Math.PI * 2);
      ctx.arc(enemy.radius * 0.5, -enemy.radius * 0.85, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Expressive white eyes looking toward facing direction
      const eyeX = facing * 4;
      const eyeY = -3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(eyeX - 3, eyeY, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeX + 3, eyeY, 3.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black pupils looking in travel direction
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eyeX - 3 + facing * 1.5, eyeY, 1.8, 0, Math.PI * 2);
      ctx.arc(eyeX + 3 + facing * 1.5, eyeY, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Cute menacing tooth/smile
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(eyeX, eyeY + 6, 3, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else if (enemy.type === 'jumper') {
      // ---------------- JUMPING SPRING HOPPER ----------------
      const sx = enemy.squashX || 1;
      const sy = enemy.squashY || 1;
      ctx.scale(sx, sy);

      // Spring coil below feet
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, enemy.radius);
      ctx.lineTo(6, enemy.radius + 3);
      ctx.lineTo(-6, enemy.radius + 6);
      ctx.lineTo(6, enemy.radius + 9);
      ctx.stroke();

      // Hopper Body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius, enemy.radius * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pointed ears tilting backward
      const earTilt = enemy.isAirborne ? -0.4 * facing : 0.1;
      ctx.save();
      ctx.fillStyle = enemy.color;
      // Left ear
      ctx.beginPath();
      ctx.moveTo(-5, -enemy.radius * 0.7);
      ctx.lineTo(-11 + earTilt * 8, -enemy.radius - 12);
      ctx.lineTo(-1, -enemy.radius * 0.9);
      ctx.fill();
      // Right ear
      ctx.beginPath();
      ctx.moveTo(1, -enemy.radius * 0.9);
      ctx.lineTo(7 + earTilt * 8, -enemy.radius - 12);
      ctx.lineTo(5, -enemy.radius * 0.7);
      ctx.fill();
      ctx.restore();

      // Eyes
      const eyeX = facing * 4;
      const eyeY = -3;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeX - 3, eyeY, 4, 0, Math.PI * 2);
      ctx.arc(eyeX + 3, eyeY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Pupils
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(eyeX - 3 + facing * 1.5, eyeY, 2, 0, Math.PI * 2);
      ctx.arc(eyeX + 3 + facing * 1.5, eyeY, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (enemy.type === 'flying') {
      // ---------------- WINGED FLYING CRITTER ----------------
      const wingAng = enemy.wingAngle || 0;

      // Flapping Wings
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = 1.5;

      // Left wing
      ctx.save();
      ctx.translate(-7, -4);
      ctx.rotate(-0.3 + wingAng);
      ctx.beginPath();
      ctx.ellipse(-10, 0, 12, 6, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right wing
      ctx.save();
      ctx.translate(7, -4);
      ctx.rotate(0.3 - wingAng);
      ctx.beginPath();
      ctx.ellipse(10, 0, 12, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.restore();

      // Sleek body
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, enemy.radius * 0.9, enemy.radius * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing eyes
      const eyeX = facing * 4;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(eyeX - 2.5, -2, 3, 0, Math.PI * 2);
      ctx.arc(eyeX + 2.5, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(eyeX - 2.5 + facing * 1, -2, 1.5, 0, Math.PI * 2);
      ctx.arc(eyeX + 2.5 + facing * 1, -2, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // ---------------- SENTRY DRONE ----------------
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing lens
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderBoss(boss: BossEntity): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Flashing when invulnerable
    if (boss.invulnerableTimer > 0 && Math.floor(performance.now() / 80) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Boss body
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height, 16);
    ctx.fill();

    // Stomp target on head
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -boss.height / 2, 14, 0, Math.PI * 2);
    ctx.fill();

    // Health bar above boss
    const barW = 80;
    const barH = 8;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-barW / 2, -boss.height / 2 - 24, barW, barH);
    ctx.fillStyle = '#22c55e';
    const hpPct = Math.max(0, boss.currentHealth / boss.maxHealth);
    ctx.fillRect(-barW / 2, -boss.height / 2 - 24, barW * hpPct, barH);

    // Projectiles
    for (const proj of boss.projectiles) {
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(proj.x - boss.x, proj.y - boss.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderGoal(): void {
    const ctx = this.ctx;
    const g = this.level.goal;
    const time = performance.now() * 0.004;

    ctx.save();
    ctx.translate(g.x, g.y);

    // Swirling portal vortex
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(0, 0, 24 + Math.sin(time) * 4, 34 + Math.cos(time) * 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Golden Crown on top of goal
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.moveTo(-12, -42);
    ctx.lineTo(-6, -34);
    ctx.lineTo(0, -44);
    ctx.lineTo(6, -34);
    ctx.lineTo(12, -42);
    ctx.lineTo(10, -28);
    ctx.lineTo(-10, -28);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * The Red Bouncing Ball character rendering
   * With rolling rotation, specular highlight, expressive eyes, squash & stretch
   */
  private renderPlayer(): void {
    const ctx = this.ctx;
    const p = this.player;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Invulnerability flashing (e.g. 2s post-respawn)
    if (p.invulnerableTimer > 0) {
      if (Math.floor(performance.now() / 90) % 2 === 0) {
        ctx.globalAlpha = 0.55;
      }
      // Glowing shield halo
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Apply squash and stretch
    ctx.scale(p.squashX, p.squashY * p.gravityDirection);

    // Ball Body (Red gradient)
    const ballGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, p.radius);
    ballGrad.addColorStop(0, '#f87171');
    ballGrad.addColorStop(0.5, '#ef4444');
    ballGrad.addColorStop(1, '#b91c1c');

    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Specular shine highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(-5, -6, 5, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Cartoon Eyes
    const eyeOffsetX = p.facingDirection * 4;
    const eyeOffsetY = -2;

    // White sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(eyeOffsetX - 3, eyeOffsetY, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffsetX + 3, eyeOffsetY, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Black pupils tracking motion
    const pupilLookX = Math.max(-2, Math.min(2, p.vx * 0.4));
    const pupilLookY = Math.max(-2, Math.min(2, p.vy * 0.2));
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(eyeOffsetX - 3 + pupilLookX, eyeOffsetY + pupilLookY, 1.8, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX + 3 + pupilLookX, eyeOffsetY + pupilLookY, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cute smile mouth
    ctx.strokeStyle = '#7f1d1d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(eyeOffsetX, eyeOffsetY + 7, 3, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.restore();
  }

  private renderDarknessVignette(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const p = this.player;

    ctx.save();
    // Dark radial shadow centered on player
    const rad = ctx.createRadialGradient(p.x, p.y, 40, p.x, p.y, 220);
    rad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    rad.addColorStop(0.7, 'rgba(0, 0, 0, 0.85)');
    rad.addColorStop(1, 'rgba(0, 0, 0, 0.98)');

    ctx.fillStyle = rad;
    ctx.fillRect(this.camera.x, this.camera.y, canvas.width, canvas.height);
    ctx.restore();
  }
}
