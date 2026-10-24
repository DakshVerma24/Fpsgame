import * as THREE from 'three';
import { Collider, HeightAtFunction } from '../map/mapTypes';
import { createOperativePlayerMesh } from '../models/playerModel';

export type BotDifficulty = 'RECRUIT' | 'OPERATIVE' | 'VETERAN';

export interface BotWeaponProfile {
  key: 'AR' | 'SMG' | 'SNIPER';
  name: string;
  damage: number;
  fireDelay: number;
  burstCount: number;
  burstCooldown: number;
  bulletSpeed: number;
  spread: number;
}

export const BOT_WEAPONS: Record<string, BotWeaponProfile> = {
  AR: {
    key: 'AR',
    name: 'PULSE AR',
    damage: 18,
    fireDelay: 0.12,
    burstCount: 3,
    burstCooldown: 0.75,
    bulletSpeed: 85,
    spread: 0.024
  },
  SMG: {
    key: 'SMG',
    name: 'VECTOR SMG',
    damage: 12,
    fireDelay: 0.08,
    burstCount: 5,
    burstCooldown: 0.65,
    bulletSpeed: 78,
    spread: 0.042
  },
  SNIPER: {
    key: 'SNIPER',
    name: 'RAIL SNIPER',
    damage: 65,
    fireDelay: 1.8,
    burstCount: 1,
    burstCooldown: 1.8,
    bulletSpeed: 125,
    spread: 0.008
  }
};

export interface BotOperative {
  id: string;
  name: string;
  team: 'RED' | 'BLUE';
  difficulty: BotDifficulty;
  weapon: BotWeaponProfile;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  velocity: THREE.Vector3;
  isGrounded: boolean;

  state: 'PATROL' | 'ENGAGE' | 'PURSUIT' | 'RELOAD';
  targetWaypoint: THREE.Vector3;
  targetWaypointIndex: number;
  waypoints: THREE.Vector3[];
  lastKnownTargetPos: THREE.Vector3 | null;
  pursuitTimer: number;

  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;

  shootCooldown: number;
  burstRemaining: number;
  reloadTimer: number;
  strafeDir: number;
  strafeTimer: number;
  hopTimer: number;
  stuckTimer: number;
  lastPos: THREE.Vector3;

  // Overhead Health Bar
  healthCanvas: HTMLCanvasElement;
  healthContext: CanvasRenderingContext2D;
  healthTexture: THREE.CanvasTexture;
  healthSprite: THREE.Sprite;
}

/**
 * High-performance 3D line of sight raycaster against all arena bounding box colliders.
 * Returns true if clear vision exists between p1 and p2.
 */
export function checkLineOfSight(p1: THREE.Vector3, p2: THREE.Vector3, colliders: Collider[]): boolean {
  const dirX = p2.x - p1.x;
  const dirY = p2.y - p1.y;
  const dirZ = p2.z - p1.z;

  for (let i = 0; i < colliders.length; i++) {
    const box = colliders[i];
    let tmin = 0;
    let tmax = 1;

    // X Axis Slab
    if (Math.abs(dirX) < 1e-6) {
      if (p1.x < box.minX || p1.x > box.maxX) continue;
    } else {
      let t1 = (box.minX - p1.x) / dirX;
      let t2 = (box.maxX - p1.x) / dirX;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    // Y Axis Slab
    if (Math.abs(dirY) < 1e-6) {
      if (p1.y < box.bottom || p1.y > box.top) continue;
    } else {
      let t1 = (box.bottom - p1.y) / dirY;
      let t2 = (box.top - p1.y) / dirY;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    // Z Axis Slab
    if (Math.abs(dirZ) < 1e-6) {
      if (p1.z < box.minZ || p1.z > box.maxZ) continue;
    } else {
      let t1 = (box.minZ - p1.z) / dirZ;
      let t2 = (box.maxZ - p1.z) / dirZ;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }

    // Overlapping ray-box interval
    if (tmin < 1 && tmax > 0) {
      return false; // Vision is obstructed by this solid obstacle
    }
  }

  return true;
}

/**
 * Returns map-tailored tactical patrol waypoints so bots cover key lanes, ramps, and choke points.
 */
export function getTacticalWaypointsForMap(mapId: string, heightAt: HeightAtFunction): THREE.Vector3[] {
  let pts: [number, number][] = [];

  if (mapId === 'DEADSHOT_ARENA') {
    pts = [
      // West Avenue & Red Spawn Approach
      [-38, 0], [-38, -6], [-38, 6],
      [-24, -20], [-24, -10], [-24, 0], [-24, 10], [-24, 20],
      // North Boulevard
      [-24, -14], [0, -14], [10, -14], [26, -14],
      // South Boulevard
      [-24, 18], [0, 18], [10, 18], [26, 18],
      // Central Cross Alley (between boutique & east shops)
      [0, -5], [0, 0], [0, 4],
      // East Boulevard & Blue Spawn Approach
      [10, 0], [26, 0], [32, 0], [36, 0], [30, -10], [30, 10]
    ];
  } else if (mapId === 'NUKETOWN') {
    pts = [
      [-38, -16], [-28, 4], [-14, -6], [-4, 6],
      [0, -10], [6, 4], [14, -6], [28, 4],
      [38, -16], [0, 20], [-10, 14], [10, 14]
    ];
  } else if (mapId === 'OSAKA') {
    pts = [
      [-30, -22], [-15, -22], [0, -22], [15, -22], [30, -22],
      [-35, 0], [0, 0], [35, 0],
      [-30, 22], [-15, 22], [0, 18], [15, 22], [30, 22]
    ];
  } else if (mapId === 'VATICAN') {
    pts = [
      [0, -44], [-15, -40], [15, -40],
      [-22, 5], [0, 5], [22, 5],
      [-30, 18], [30, 18],
      [0, 42], [-12, 55], [12, 55]
    ];
  } else if (mapId === 'HORMUZ') {
    pts = [
      [-14, -50], [0, -50], [14, -50], [0, -36],
      [-20, -18], [0, -18], [20, -18],
      [-14, 50], [0, 50], [14, 50]
    ];
  } else if (mapId === 'E_ISLAND') {
    pts = [
      [0, -22], [-16, -20], [16, -20], [0, -8],
      [-24, 8], [24, 6],
      [-28, 12], [0, 18], [0, 34], [18, 24]
    ];
  } else if (mapId === 'SOLAR_CITADEL') {
    pts = [
      [-32, 0], [-20, -12], [-20, 12], [-10, 0],
      [0, -14], [0, 0], [0, 14],
      [10, 0], [20, -12], [20, 12], [32, 0]
    ];
  } else {
    pts = [
      [-32, -8], [-32, 8], [-16, -10], [-16, 10],
      [0, -12], [0, 0], [0, 12],
      [16, -10], [16, 10], [32, -8], [32, 8]
    ];
  }

  return pts.map(([x, z]) => new THREE.Vector3(x, heightAt(x, z), z));
}

/**
 * Create overhead billboard health bar and operative tag.
 */
function createOverheadHealthBar(name: string, team: 'RED' | 'BLUE'): {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.9, 0.48, 1.0);
  sprite.position.set(0, 2.35, 0);

  return { sprite, canvas, ctx, texture };
}

export function updateBotHealthDisplay(bot: BotOperative) {
  const ctx = bot.healthContext;
  const w = 256;
  const h = 64;
  ctx.clearRect(0, 0, w, h);

  const isRed = bot.team === 'RED';
  const teamColor = isRed ? '#ff3355' : '#00e5ff';

  // Operative Name
  ctx.font = 'bold 20px Rajdhani, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(`[BOT] ${bot.name}`, w / 2, 22);

  // Background Container
  const barW = 180;
  const barH = 10;
  const barX = (w - barW) / 2;
  const barY = 30;

  ctx.fillStyle = 'rgba(12, 16, 26, 0.85)';
  ctx.fillRect(barX, barY, barW, barH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Health Fill
  const hpPct = Math.max(0, Math.min(1, bot.hp / bot.maxHp));
  ctx.fillStyle = teamColor;
  ctx.fillRect(barX + 1, barY + 1, (barW - 2) * hpPct, barH - 2);

  bot.healthTexture.needsUpdate = true;
}

/**
 * Wall and obstacle collision resolver with terrain/container support.
 */
export function moveBotWithCollision(
  bot: BotOperative,
  moveVec: THREE.Vector3,
  colliders: Collider[],
  heightAt: HeightAtFunction
): { blocked: boolean } {
  const radius = 0.55;
  const feetY = bot.pos.y;
  const headY = bot.pos.y + 1.8;

  // 1. Move along X
  const testX = bot.pos.x + moveVec.x;
  let blockedX = false;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (testX + radius >= c.minX && testX - radius <= c.maxX &&
        bot.pos.z + radius >= c.minZ && bot.pos.z - radius <= c.maxZ) {
      if (!(feetY >= c.top - 0.45) && !(headY <= c.bottom + 0.1)) {
        blockedX = true;
        break;
      }
    }
  }
  if (!blockedX) {
    bot.pos.x = testX;
  } else {
    bot.velocity.x = 0;
  }

  // 2. Move along Z
  const testZ = bot.pos.z + moveVec.z;
  let blockedZ = false;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (bot.pos.x + radius >= c.minX && bot.pos.x - radius <= c.maxX &&
        testZ + radius >= c.minZ && testZ - radius <= c.maxZ) {
      if (!(feetY >= c.top - 0.45) && !(headY <= c.bottom + 0.1)) {
        blockedZ = true;
        break;
      }
    }
  }
  if (!blockedZ) {
    bot.pos.z = testZ;
  } else {
    bot.velocity.z = 0;
  }

  // Arena bounds clamping
  bot.pos.x = Math.max(-50, Math.min(50, bot.pos.x));
  bot.pos.z = Math.max(-40, Math.min(40, bot.pos.z));

  // 3. Ground & Container Elevation
  let surfaceY = heightAt(bot.pos.x, bot.pos.z);
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (bot.pos.x >= c.minX - 0.25 && bot.pos.x <= c.maxX + 0.25 &&
        bot.pos.z >= c.minZ - 0.25 && bot.pos.z <= c.maxZ + 0.25) {
      if (feetY >= c.top - 0.55) {
        surfaceY = Math.max(surfaceY, c.top);
      }
    }
  }

  // Gravity & Landing
  if (bot.pos.y > surfaceY + 0.05) {
    bot.velocity.y -= 26.0 * 0.016;
    bot.pos.y += bot.velocity.y * 0.016;
    if (bot.pos.y <= surfaceY) {
      bot.pos.y = surfaceY;
      bot.velocity.y = 0;
      bot.isGrounded = true;
    } else {
      bot.isGrounded = false;
    }
  } else {
    bot.pos.y = surfaceY;
    bot.velocity.y = 0;
    bot.isGrounded = true;
  }

  bot.mesh.position.copy(bot.pos);
  return { blocked: blockedX || blockedZ };
}

export class BotManager {
  bots: BotOperative[] = [];
  tacticalWaypoints: THREE.Vector3[] = [];
  redSpawns: { x: number; z: number }[] = [];
  blueSpawns: { x: number; z: number }[] = [];

  constructor() {}

  initBots(
    count: number,
    difficulty: BotDifficulty,
    playerTeam: string,
    mapId: string,
    heightAt: HeightAtFunction,
    scene: THREE.Scene,
    redSpawns: { x: number; z: number }[],
    blueSpawns: { x: number; z: number }[]
  ) {
    this.clear(scene);
    this.redSpawns = redSpawns;
    this.blueSpawns = blueSpawns;
    this.tacticalWaypoints = getTacticalWaypointsForMap(mapId, heightAt);

    const callsigns = ['ALPHA', 'VIPER', 'SPECTER', 'TITAN', 'APEX', 'GHOST', 'RAZOR', 'HYPER'];
    const botWeapons: ('AR' | 'SMG' | 'SNIPER')[] = ['AR', 'SMG', 'AR', 'SNIPER', 'SMG', 'AR'];

    const enemyTeam: 'RED' | 'BLUE' = playerTeam === 'RED' ? 'BLUE' : 'RED';
    const friendlyTeam: 'RED' | 'BLUE' = playerTeam === 'RED' ? 'RED' : 'BLUE';

    // Distribute teams: In a 2-bot match, both are enemies (1v2).
    // In a 4-bot match, 1 is ally, 3 are enemies.
    // In a 6-bot match, 2 are allies, 4 are enemies (3v4).
    for (let i = 0; i < count; i++) {
      let team: 'RED' | 'BLUE' = enemyTeam;
      if (count >= 4 && i === 0) team = friendlyTeam;
      if (count >= 6 && i === 1) team = friendlyTeam;

      const name = `${callsigns[i % callsigns.length]}`;
      const id = `bot_${team.toLowerCase()}_${i}`;
      const weaponKey = botWeapons[i % botWeapons.length];
      const weapon = { ...BOT_WEAPONS[weaponKey] };

      // Scale weapon stats by difficulty
      if (difficulty === 'RECRUIT') {
        weapon.damage = Math.round(weapon.damage * 0.75);
        weapon.spread *= 1.5;
        weapon.burstCooldown *= 1.35;
      } else if (difficulty === 'VETERAN') {
        weapon.damage = Math.round(weapon.damage * 1.15);
        weapon.spread *= 0.75;
        weapon.burstCooldown *= 0.8;
      }

      const mesh = createOperativePlayerMesh(`[BOT] ${name}`, team);
      const spawnPool = team === 'RED' ? redSpawns : blueSpawns;
      const sp = spawnPool[i % spawnPool.length];
      const startPos = new THREE.Vector3(sp.x, heightAt(sp.x, sp.z), sp.z);
      mesh.position.copy(startPos);
      scene.add(mesh);

      // Create Overhead Health Bar
      const { sprite, canvas, ctx, texture } = createOverheadHealthBar(name, team);
      mesh.add(sprite);

      const bot: BotOperative = {
        id,
        name,
        team,
        difficulty,
        weapon,
        mesh,
        pos: startPos.clone(),
        velocity: new THREE.Vector3(),
        isGrounded: true,
        state: 'PATROL',
        targetWaypoint: this.tacticalWaypoints[i % this.tacticalWaypoints.length].clone(),
        targetWaypointIndex: i % this.tacticalWaypoints.length,
        waypoints: this.tacticalWaypoints,
        lastKnownTargetPos: null,
        pursuitTimer: 0,
        hp: 100,
        maxHp: 100,
        alive: true,
        respawnTimer: 0,
        shootCooldown: 1.0 + Math.random() * 0.8,
        burstRemaining: weapon.burstCount,
        reloadTimer: 0,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: 1.0 + Math.random() * 1.5,
        hopTimer: 2.0 + Math.random() * 3.0,
        stuckTimer: 0,
        lastPos: startPos.clone(),
        healthCanvas: canvas,
        healthContext: ctx,
        healthTexture: texture,
        healthSprite: sprite
      };

      updateBotHealthDisplay(bot);
      this.bots.push(bot);
    }
  }

  update(
    delta: number,
    playerPos: THREE.Vector3,
    playerTeam: string,
    playerHealth: number,
    colliders: Collider[],
    heightAt: HeightAtFunction,
    onBotShoot: (bot: BotOperative, muzzlePos: THREE.Vector3, shootDir: THREE.Vector3) => void,
    onBotEliminated: (bot: BotOperative, killerName: string, killerTeam: string) => void
  ) {
    const playerTargetPos = playerPos.clone();
    playerTargetPos.y -= 0.5; // Aim at chest

    for (let bIdx = 0; bIdx < this.bots.length; bIdx++) {
      const bot = this.bots[bIdx];

      // Handle Respawn
      if (!bot.alive) {
        bot.respawnTimer -= delta;
        if (bot.respawnTimer <= 0) {
          bot.alive = true;
          bot.hp = bot.maxHp;
          bot.mesh.visible = true;
          const pool = bot.team === 'RED' ? this.redSpawns : this.blueSpawns;
          const sp = pool[Math.floor(Math.random() * pool.length)];
          bot.pos.set(sp.x, heightAt(sp.x, sp.z), sp.z);
          bot.mesh.position.copy(bot.pos);
          bot.state = 'PATROL';
          bot.lastKnownTargetPos = null;
          bot.burstRemaining = bot.weapon.burstCount;
          updateBotHealthDisplay(bot);
        }
        continue;
      }

      // 1. Perception & Target Evaluation (Player + Opposing Bots)
      const botEye = bot.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
      let bestTargetPos: THREE.Vector3 | null = null;
      let minTargetDist = Infinity;

      // Check Local Player
      if (playerTeam !== bot.team && playerHealth > 0) {
        const dist = botEye.distanceTo(playerTargetPos);
        if (dist < 48) {
          const los = checkLineOfSight(botEye, playerTargetPos, colliders);
          if (los) {
            bestTargetPos = playerTargetPos;
            minTargetDist = dist;
          }
        }
      }

      // Check Opposing Bots
      for (let oIdx = 0; oIdx < this.bots.length; oIdx++) {
        const other = this.bots[oIdx];
        if (!other.alive || other.team === bot.team || other.id === bot.id) continue;
        const otherChest = other.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
        const dist = botEye.distanceTo(otherChest);
        if (dist < minTargetDist && dist < 42) {
          if (checkLineOfSight(botEye, otherChest, colliders)) {
            bestTargetPos = otherChest;
            minTargetDist = dist;
          }
        }
      }

      // State Transition
      if (bestTargetPos) {
        bot.state = 'ENGAGE';
        bot.lastKnownTargetPos = bestTargetPos.clone();
        bot.pursuitTimer = 4.0;
      } else if (bot.lastKnownTargetPos && bot.pursuitTimer > 0) {
        bot.state = 'PURSUIT';
        bot.pursuitTimer -= delta;
      } else {
        bot.state = 'PATROL';
        bot.lastKnownTargetPos = null;
      }

      // 2. Behavioral Execution
      const moveVec = new THREE.Vector3();
      const baseSpeed = bot.difficulty === 'VETERAN' ? 6.2 : (bot.difficulty === 'OPERATIVE' ? 5.0 : 3.8);

      if (bot.state === 'ENGAGE' && bestTargetPos) {
        // Face target smoothly
        const dx = bestTargetPos.x - bot.pos.x;
        const dz = bestTargetPos.z - bot.pos.z;
        const targetYaw = Math.atan2(dx, dz);
        let yawDiff = targetYaw - bot.mesh.rotation.y;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
        const turnRate = bot.difficulty === 'VETERAN' ? 12 : 7;
        bot.mesh.rotation.y += Math.sign(yawDiff) * Math.min(Math.abs(yawDiff), turnRate * delta);

        // Combat movement: Strafe left/right, advance if far, back up if point-blank
        bot.strafeTimer -= delta;
        if (bot.strafeTimer <= 0) {
          bot.strafeDir *= -1;
          bot.strafeTimer = 1.0 + Math.random() * 1.6;
        }

        const forward = new THREE.Vector3(Math.sin(bot.mesh.rotation.y), 0, Math.cos(bot.mesh.rotation.y)).normalize();
        const right = new THREE.Vector3(forward.z, 0, -forward.x);

        // Advance or retreat
        if (minTargetDist > 20) {
          moveVec.addScaledVector(forward, baseSpeed * 0.7 * delta);
        } else if (minTargetDist < 6) {
          moveVec.addScaledVector(forward, -baseSpeed * 0.8 * delta);
        }
        // Lateral strafe
        moveVec.addScaledVector(right, bot.strafeDir * baseSpeed * 0.85 * delta);

        // Deadshot slide-hop / jump impulse during combat
        bot.hopTimer -= delta;
        if (bot.hopTimer <= 0 && bot.isGrounded) {
          bot.hopTimer = 2.5 + Math.random() * 3.5;
          if (bot.difficulty !== 'RECRUIT') {
            bot.velocity.y = 8.5; // Jump
            moveVec.addScaledVector(forward, 2.2 * delta); // forward slide hop boost
          }
        }

        // Firing Mechanics
        bot.shootCooldown -= delta;
        if (bot.shootCooldown <= 0) {
          const aimDir = new THREE.Vector3().subVectors(bestTargetPos, botEye).normalize();
          // Verify aim alignment before pulling trigger
          const botForward = new THREE.Vector3(Math.sin(bot.mesh.rotation.y), 0, Math.cos(bot.mesh.rotation.y));
          if (aimDir.dot(botForward) > 0.65) {
            onBotShoot(bot, botEye, aimDir);

            bot.burstRemaining--;
            if (bot.burstRemaining > 0) {
              bot.shootCooldown = bot.weapon.fireDelay;
            } else {
              bot.burstRemaining = bot.weapon.burstCount;
              bot.shootCooldown = bot.weapon.burstCooldown + Math.random() * 0.25;
            }
          }
        }
      } else if (bot.state === 'PURSUIT' && bot.lastKnownTargetPos) {
        // Move towards last seen enemy coordinates to flush them out
        const toTarget = new THREE.Vector3().subVectors(bot.lastKnownTargetPos, bot.pos);
        toTarget.y = 0;
        const dist = toTarget.length();
        if (dist > 1.5) {
          toTarget.normalize();
          moveVec.addScaledVector(toTarget, baseSpeed * delta);
          bot.mesh.rotation.y = Math.atan2(toTarget.x, toTarget.z);
        } else {
          bot.lastKnownTargetPos = null;
          bot.state = 'PATROL';
        }
      } else {
        // PATROL: Navigate through tactical waypoints
        const wp = bot.targetWaypoint;
        const toWp = new THREE.Vector3().subVectors(wp, bot.pos);
        toWp.y = 0;
        const distToWp = toWp.length();

        if (distToWp < 2.5) {
          bot.targetWaypointIndex = (bot.targetWaypointIndex + 1) % bot.waypoints.length;
          bot.targetWaypoint = bot.waypoints[bot.targetWaypointIndex].clone();
        } else {
          toWp.normalize();
          moveVec.addScaledVector(toWp, baseSpeed * 0.85 * delta);
          bot.mesh.rotation.y = Math.atan2(toWp.x, toWp.z);
        }
      }

      // 3. Collision Resolution & Anti-Stuck System
      const { blocked } = moveBotWithCollision(bot, moveVec, colliders, heightAt);

      if (blocked) {
        bot.stuckTimer += delta;
        if (bot.stuckTimer > 0.8) {
          // If stuck on corner/container, steer sideways or cycle waypoint
          bot.strafeDir *= -1;
          bot.targetWaypointIndex = (bot.targetWaypointIndex + 1) % bot.waypoints.length;
          bot.targetWaypoint = bot.waypoints[bot.targetWaypointIndex].clone();
          bot.stuckTimer = 0;
        }
      } else {
        bot.stuckTimer = Math.max(0, bot.stuckTimer - delta * 0.5);
      }
    }
  }

  damageBot(
    bot: BotOperative,
    amount: number,
    attackerName: string,
    attackerTeam: string,
    attackerPos?: THREE.Vector3
  ): boolean {
    if (!bot.alive) return false;

    bot.hp = Math.max(0, bot.hp - amount);
    updateBotHealthDisplay(bot);

    // Retaliation aggro: immediately turn to attacker
    if (attackerPos) {
      bot.lastKnownTargetPos = attackerPos.clone();
      bot.state = 'ENGAGE';
      bot.pursuitTimer = 5.0;
    }

    return bot.hp <= 0;
  }

  clear(scene: THREE.Scene) {
    this.bots.forEach(b => {
      scene.remove(b.mesh);
      b.healthTexture.dispose();
    });
    this.bots.length = 0;
  }
}

export const botManager = new BotManager();
