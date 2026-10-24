import * as THREE from 'three';

/**
 * 9-Pellet Deterministic Tactical Diamond-Choke Shotgun Dispersion Pattern.
 * [0] is dead-center pellet.
 * [1..4] are inner diamond choke (up, right, down, left).
 * [5..8] are outer perimeter ring.
 * Coordinates are normalized [-1.0 .. 1.0].
 */
export const SHOTGUN_PELLETS_PATTERN: [number, number][] = [
  [0.0, 0.0],       // Exact dead-center
  [0.0, 0.45],      // Inner Top
  [0.45, 0.0],      // Inner Right
  [0.0, -0.45],     // Inner Bottom
  [-0.45, 0.0],     // Inner Left
  [-0.72, 0.72],    // Outer Top-Left
  [0.72, 0.72],     // Outer Top-Right
  [0.72, -0.72],    // Outer Bottom-Right
  [-0.72, -0.72]    // Outer Bottom-Left
];

/**
 * Computes individual directional vectors for deterministic multi-pellet spread.
 */
export function calculatePelletDirection(
  baseForward: THREE.Vector3,
  camRight: THREE.Vector3,
  camUp: THREE.Vector3,
  pelletIndex: number,
  baseSpread: number,
  isAiming: boolean
): THREE.Vector3 {
  const spreadScale = isAiming ? baseSpread * 0.42 : baseSpread;
  const pattern = SHOTGUN_PELLETS_PATTERN[pelletIndex % SHOTGUN_PELLETS_PATTERN.length];

  // Tiny pseudo-random micro-jitter per pellet so pattern feels organic yet consistently grouped
  const jitterX = (Math.random() - 0.5) * 0.12 * spreadScale;
  const jitterY = (Math.random() - 0.5) * 0.12 * spreadScale;

  const offsetX = pattern[0] * spreadScale + jitterX;
  const offsetY = pattern[1] * spreadScale + jitterY;

  const pelletDir = baseForward.clone()
    .addScaledVector(camRight, offsetX)
    .addScaledVector(camUp, offsetY)
    .normalize();

  return pelletDir;
}

/**
 * Procedural Viewmodel Sway and Spring-Damper Physics
 */
export class WeaponSpringDynamics {
  posSway = new THREE.Vector3();
  rotSway = new THREE.Euler(0, 0, 0, 'YXZ');
  
  posVel = new THREE.Vector3();
  rotVel = new THREE.Vector3();

  // Kick impulses
  kickPosZ = 0;
  kickPosY = 0;
  kickPitch = 0;
  kickYaw = 0;

  // Sniper Breath Sway
  breathTime = 0;
  breathOffset = new THREE.Vector2();

  update(
    delta: number,
    mouseDeltaX: number,
    mouseDeltaY: number,
    isAiming: boolean,
    isSniper: boolean
  ) {
    const springStrength = isAiming ? 32 : 24;
    const damping = isAiming ? 0.72 : 0.68;

    // Mouse turn inertia sway
    const swayMaxX = isAiming ? 0.015 : 0.055;
    const swayMaxY = isAiming ? 0.012 : 0.045;

    const targetRotYaw = THREE.MathUtils.clamp(-mouseDeltaX * 0.0006, -swayMaxX, swayMaxX);
    const targetRotPitch = THREE.MathUtils.clamp(mouseDeltaY * 0.0006, -swayMaxY, swayMaxY);

    this.rotSway.y = THREE.MathUtils.lerp(this.rotSway.y, targetRotYaw, delta * springStrength);
    this.rotSway.x = THREE.MathUtils.lerp(this.rotSway.x, targetRotPitch, delta * springStrength);
    this.rotSway.z = THREE.MathUtils.lerp(this.rotSway.z, -targetRotYaw * 0.75, delta * springStrength);

    // Physical kick recovery
    this.kickPosZ = THREE.MathUtils.lerp(this.kickPosZ, 0, delta * 22);
    this.kickPosY = THREE.MathUtils.lerp(this.kickPosY, 0, delta * 22);
    this.kickPitch = THREE.MathUtils.lerp(this.kickPitch, 0, delta * 25);
    this.kickYaw = THREE.MathUtils.lerp(this.kickYaw, 0, delta * 25);

    // Sniper Breathing Drift
    if (isAiming && isSniper) {
      this.breathTime += delta * 1.8;
      // Gentle figure-8 lissajous breathing motion
      this.breathOffset.x = Math.sin(this.breathTime) * 0.0035;
      this.breathOffset.y = Math.cos(this.breathTime * 2) * 0.0022;
    } else {
      this.breathTime = 0;
      this.breathOffset.set(0, 0);
    }
  }

  applyKick(weaponKey: string, isAiming: boolean) {
    const aimMult = isAiming ? 0.58 : 1.0;
    if (weaponKey === 'AR') {
      this.kickPosZ = 0.065 * aimMult;
      this.kickPosY = 0.012 * aimMult;
      this.kickPitch = 0.048 * aimMult;
      this.kickYaw = (Math.random() - 0.5) * 0.012 * aimMult;
    } else if (weaponKey === 'SMG') {
      this.kickPosZ = 0.088 * aimMult;
      this.kickPosY = 0.016 * aimMult;
      this.kickPitch = 0.075 * aimMult;
      this.kickYaw = (Math.random() - 0.5) * 0.024 * aimMult;
    } else if (weaponKey === 'SHOTGUN') {
      this.kickPosZ = 0.22 * aimMult;
      this.kickPosY = 0.045 * aimMult;
      this.kickPitch = 0.16 * aimMult;
      this.kickYaw = (Math.random() - 0.5) * 0.035 * aimMult;
    } else if (weaponKey === 'SNIPER') {
      this.kickPosZ = 0.32 * aimMult;
      this.kickPosY = 0.065 * aimMult;
      this.kickPitch = 0.26 * aimMult;
      this.kickYaw = (Math.random() - 0.5) * 0.020 * aimMult;
    }
  }
}
