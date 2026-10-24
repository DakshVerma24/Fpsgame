import * as THREE from 'three';

// Shared materials for first-person viewmodels
const matBlackMetal = new THREE.MeshStandardMaterial({
  color: 0x181b22,
  metalness: 0.85,
  roughness: 0.25
});

const matDarkPolymer = new THREE.MeshStandardMaterial({
  color: 0x232730,
  metalness: 0.3,
  roughness: 0.65
});

const matGunSteel = new THREE.MeshStandardMaterial({
  color: 0x3a404d,
  metalness: 0.9,
  roughness: 0.2
});

const matGripRubber = new THREE.MeshStandardMaterial({
  color: 0x121418,
  roughness: 0.9,
  metalness: 0.1
});

const matScopeGlass = new THREE.MeshPhysicalMaterial({
  color: 0x051525,
  metalness: 0.1,
  roughness: 0.1,
  transmission: 0.85,
  transparent: true,
  opacity: 0.8
});

// Tactical Hands and Gloves
export function buildTacticalArms(): THREE.Group {
  const group = new THREE.Group();

  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e27,
    roughness: 0.8,
    metalness: 0.1
  });

  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x282e3b,
    roughness: 0.5,
    metalness: 0.3
  });

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0x0f1217,
    roughness: 0.3,
    metalness: 0.7
  });

  const cuffNeonMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

  // Right Arm (Trigger hand)
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(0.18, -0.28, -0.42);

  // Forearm sleeve
  const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.45), sleeveMat);
  rightForearm.position.set(0.04, -0.02, 0.1);
  rightForearm.rotation.set(0.12, -0.08, -0.05);

  // Wrist cybernetic cuff
  const rightCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.08), armorMat);
  rightCuff.position.set(0.04, -0.02, -0.12);
  const rightCuffScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.035), cuffNeonMat);
  rightCuffScreen.position.set(0.04, 0.04, -0.12);
  rightCuffScreen.rotation.x = -Math.PI / 2;

  // Hand glove
  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.095, 0.14), gloveMat);
  rightHand.position.set(0.04, -0.01, -0.22);

  // Knuckle armor plate
  const rightKnuckles = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.06), armorMat);
  rightKnuckles.position.set(0.04, 0.042, -0.22);

  // Trigger finger
  const triggerFinger = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.09), gloveMat);
  triggerFinger.position.set(0.01, -0.01, -0.3);
  triggerFinger.rotation.x = 0.3;

  rightArmGroup.add(rightForearm, rightCuff, rightCuffScreen, rightHand, rightKnuckles, triggerFinger);

  // Left Arm (Support hand)
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-0.06, -0.25, -0.72);

  const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.42), sleeveMat);
  leftForearm.position.set(-0.16, -0.08, 0.22);
  leftForearm.rotation.set(-0.15, 0.35, 0.15);

  const leftCuff = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.115, 0.07), armorMat);
  leftCuff.position.set(-0.08, -0.05, 0.06);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.12), gloveMat);
  leftHand.position.set(0.0, -0.02, -0.02);
  leftHand.rotation.set(0.2, 0.25, -0.3);

  const leftKnuckles = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.022, 0.05), armorMat);
  leftKnuckles.position.set(0.0, 0.035, -0.02);
  leftKnuckles.rotation.set(0.2, 0.25, -0.3);

  leftArmGroup.add(leftForearm, leftCuff, leftHand, leftKnuckles);

  group.add(rightArmGroup, leftArmGroup);
  return group;
}

// 1. ASSAULT RIFLE // PULSE
export function buildPulseAssaultRifle(): THREE.Group {
  const root = new THREE.Group();
  const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const neonCyanGlow = new THREE.MeshBasicMaterial({ color: 0x00f0ff });

  // Receiver Upper & Lower
  const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.095, 0.48), matGunSteel);
  upperReceiver.position.set(0, 0.03, -0.05);

  const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.085, 0.35), matDarkPolymer);
  lowerReceiver.position.set(0, -0.04, -0.08);

  // M-LOK Tactical Handguard
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.088, 0.42), matBlackMetal);
  handguard.position.set(0, 0.02, -0.42);

  // Handguard vent slots
  for (let i = 0; i < 4; i++) {
    const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.06), neonCyanMat);
    ventL.position.set(-0.042, 0.02, -0.3 - i * 0.08);
    const ventR = ventL.clone();
    ventR.position.x = 0.042;
    root.add(ventL, ventR);
  }

  // Fluted Barrel & Slotted Muzzle Brake
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.38, 12), matGunSteel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.72);

  const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.09, 8), matBlackMetal);
  muzzleBrake.rotation.x = Math.PI / 2;
  muzzleBrake.position.set(0, 0.02, -0.92);

  // Picatinny Top Rail
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.016, 0.65), matBlackMetal);
  topRail.position.set(0, 0.085, -0.22);

  // Holographic Optic Sight
  const opticRiser = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.12), matBlackMetal);
  opticRiser.position.set(0, 0.105, -0.16);

  const opticHood = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.06, 0.14), matDarkPolymer);
  opticHood.position.set(0, 0.145, -0.16);

  const opticLens = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.045), matScopeGlass);
  opticLens.position.set(0, 0.145, -0.225);

  const opticReticle = new THREE.Mesh(new THREE.RingGeometry(0.004, 0.007, 16), neonCyanGlow);
  opticReticle.position.set(0, 0.145, -0.22);

  // Curved Tactical Magazine
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.22, 0.12), matDarkPolymer);
  mag.position.set(0, -0.17, -0.18);
  mag.rotation.x = 0.22;

  // Cartridge Viewport with glowing charge
  const magWindow = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.12, 0.025), neonCyanMat);
  magWindow.position.set(0, -0.17, -0.18);
  magWindow.rotation.x = 0.22;

  // Ergonomic Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.17, 0.095), matGripRubber);
  grip.position.set(0, -0.13, 0.06);
  grip.rotation.x = -0.35;

  // Tactical Buttstock
  const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8), matGunSteel);
  bufferTube.rotation.x = Math.PI / 2;
  bufferTube.position.set(0, 0.03, 0.22);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.14, 0.2), matDarkPolymer);
  stock.position.set(0, -0.01, 0.32);

  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.15, 0.03), matGripRubber);
  stockPad.position.set(0, -0.01, 0.425);

  // Side Tactical Laser Unit
  const laserModule = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.11), matBlackMetal);
  laserModule.position.set(0.056, 0.04, -0.42);
  const laserDiode = new THREE.Mesh(new THREE.CircleGeometry(0.006, 8), neonCyanMat);
  laserDiode.position.set(0.056, 0.04, -0.476);

  root.add(
    upperReceiver, lowerReceiver, handguard, barrel, muzzleBrake,
    topRail, opticRiser, opticHood, opticLens, opticReticle,
    mag, magWindow, grip, bufferTube, stock, stockPad,
    laserModule, laserDiode
  );

  return root;
}

// 2. SMG // VECTOR-X
export function buildVectorSMG(): THREE.Group {
  const root = new THREE.Group();
  const neonPinkMat = new THREE.MeshBasicMaterial({ color: 0xff2bd6 });
  const neonPinkGlow = new THREE.MeshBasicMaterial({ color: 0xff40e0 });

  // Main Kriss Super-V Recoil Body
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.17, 0.36), matDarkPolymer);
  mainBody.position.set(0, 0.01, -0.08);

  // Diagonal Recoil Damper Housing
  const damperHousing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.22), matGunSteel);
  damperHousing.position.set(0, -0.07, -0.15);
  damperHousing.rotation.x = -0.32;

  // Integrated Handstop Foregrip
  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.11, 0.08), matGripRubber);
  foregrip.position.set(0, -0.13, -0.28);
  foregrip.rotation.x = 0.25;

  // Extended 30-Round Stick Mag
  const stickMag = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.26, 0.07), matBlackMetal);
  stickMag.position.set(0, -0.18, -0.04);
  stickMag.rotation.x = -0.18;

  const magStripe = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.18, 0.012), neonPinkMat);
  magStripe.position.set(0, -0.18, -0.04);
  magStripe.rotation.x = -0.18;

  // Barrel with compact suppressor/shroud
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 12), matBlackMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -0.36);

  // Top Rail & Micro Red-Dot Optic
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.014, 0.42), matBlackMetal);
  topRail.position.set(0, 0.1, -0.1);

  const microSightMount = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 0.08), matBlackMetal);
  microSightMount.position.set(0, 0.115, -0.08);

  const microSightHood = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.045, 0.07), matDarkPolymer);
  microSightHood.position.set(0, 0.145, -0.08);

  const microLens = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.035), matScopeGlass);
  microLens.position.set(0, 0.145, -0.116);

  const redDot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), neonPinkGlow);
  redDot.position.set(0, 0.145, -0.114);

  // Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.15, 0.085), matGripRubber);
  grip.position.set(0, -0.08, 0.05);
  grip.rotation.x = -0.32;

  // Folded Wire/Skeleton Stock
  const stockStrut = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.035, 0.26), matGunSteel);
  stockStrut.position.set(0.048, 0.02, 0.02);
  stockStrut.rotation.y = 0.12;

  root.add(
    mainBody, damperHousing, foregrip, stickMag, magStripe,
    barrel, topRail, microSightMount, microSightHood, microLens, redDot,
    grip, stockStrut
  );

  return root;
}

// 3. CYBER-SHOTGUN // SLAG
export function buildCyberShotgun(): THREE.Group {
  const root = new THREE.Group();
  const neonOrangeMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });
  const neonOrangeGlow = new THREE.MeshBasicMaterial({ color: 0xff9900 });

  // Heavy Shotgun Receiver
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.13, 0.44), matGunSteel);
  receiver.position.set(0, 0.01, -0.05);

  // Shell Ejection Port (Right side)
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.045, 0.12), matBlackMetal);
  port.position.set(0.05, 0.02, -0.06);

  // Heavy 12GA Barrel with Perforated Heat Shroud
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.65, 12), matBlackMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -0.52);

  const heatShroud = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.42, 10), matGunSteel);
  heatShroud.rotation.x = Math.PI / 2;
  heatShroud.position.set(0, 0.035, -0.42);

  // Twin Underbarrel Magazine Tube
  const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.58, 12), matBlackMetal);
  magTube.rotation.x = Math.PI / 2;
  magTube.position.set(0, -0.025, -0.48);

  // Ribbed Pump Slide Fore-End
  const pumpGrip = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.09, 0.24), matGripRubber);
  pumpGrip.position.set(0, -0.01, -0.45);

  // Pump grip ridges
  for (let r = 0; r < 5; r++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.092, 0.094, 0.02), matBlackMetal);
    ridge.position.set(0, -0.01, -0.37 - r * 0.04);
    root.add(ridge);
  }

  // Side-Saddle Shell Caddy with 4 12GA shells
  const caddyPlate = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.065, 0.2), matDarkPolymer);
  caddyPlate.position.set(-0.054, 0.01, -0.05);

  for (let s = 0; s < 4; s++) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.07, 8), neonOrangeMat);
    shell.rotation.x = Math.PI / 2;
    shell.position.set(-0.066, 0.01, -0.12 + s * 0.045);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.015, 8), matGunSteel);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(-0.066, 0.01, -0.085 + s * 0.045);
    root.add(shell, rim);
  }

  // Heavy Tactical Buttstock & Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.095), matGripRubber);
  grip.position.set(0, -0.12, 0.08);
  grip.rotation.x = -0.38;

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.15, 0.28), matDarkPolymer);
  stock.position.set(0, -0.02, 0.28);

  const stockRecoilPad = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.16, 0.035), matGripRubber);
  stockRecoilPad.position.set(0, -0.02, 0.425);

  // Ghost-Ring CQB Sights with Tritium glowing dots
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.025), matBlackMetal);
  rearSight.position.set(0, 0.085, 0.08);
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.035, 0.02), matBlackMetal);
  frontSight.position.set(0, 0.078, -0.78);
  const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.005, 6, 6), neonOrangeGlow);
  frontDot.position.set(0, 0.088, -0.78);

  root.add(
    receiver, port, barrel, heatShroud, magTube, pumpGrip,
    caddyPlate, grip, stock, stockRecoilPad,
    rearSight, frontSight, frontDot
  );

  return root;
}

// 4. RAIL-SNIPER // APEX
export function buildApexRailSniper(): THREE.Group {
  const root = new THREE.Group();
  const neonElectricTeal = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
  const neonTealGlow = new THREE.MeshBasicMaterial({ color: 0x55ffdd });

  // Sleek Sniper Chassis Body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.11, 0.52), matDarkPolymer);
  chassis.position.set(0, 0.01, -0.06);

  // Dual Linear Electromagnetic Accelerator Rails
  const topRailBeam = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.85), matGunSteel);
  topRailBeam.position.set(0, 0.045, -0.68);

  const bottomRailBeam = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.85), matGunSteel);
  bottomRailBeam.position.set(0, -0.015, -0.68);

  // Center Accelerator Core with glowing charge channel
  const coreChannel = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.02, 0.82), neonElectricTeal);
  coreChannel.position.set(0, 0.015, -0.68);

  // 3 Magnetic Capacitor Rings along the barrel
  for (let c = 0; c < 3; c++) {
    const ring = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.095, 0.06), matBlackMetal);
    ring.position.set(0, 0.015, -0.45 - c * 0.24);

    const coilGlow = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.098, 0.015), neonTealGlow);
    coilGlow.position.set(0, 0.015, -0.45 - c * 0.24);

    root.add(ring, coilGlow);
  }

  // Aggressive Muzzle Brake
  const chevronMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.075, 0.12), matBlackMetal);
  chevronMuzzle.position.set(0, 0.015, -1.14);

  // High-Power Optic Scope
  const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.36, 16), matBlackMetal);
  scopeTube.rotation.x = Math.PI / 2;
  scopeTube.position.set(0, 0.125, -0.15);

  const scopeBellFront = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 0.12, 16), matBlackMetal);
  scopeBellFront.rotation.x = Math.PI / 2;
  scopeBellFront.position.set(0, 0.125, -0.36);

  const scopeLens = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), matScopeGlass);
  scopeLens.position.set(0, 0.125, -0.421);

  const scopeEyePiece = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.08, 16), matGripRubber);
  scopeEyePiece.rotation.x = Math.PI / 2;
  scopeEyePiece.position.set(0, 0.125, 0.04);

  // Turrets (Elevation & Windage)
  const elevTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 12), matGunSteel);
  elevTurret.position.set(0, 0.165, -0.15);

  const windTurret = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 12), matGunSteel);
  windTurret.rotation.z = Math.PI / 2;
  windTurret.position.set(0.042, 0.125, -0.15);

  // Scope Rings Mount
  const ring1 = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.035), matGunSteel);
  ring1.position.set(0, 0.105, -0.25);
  const ring2 = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.035), matGunSteel);
  ring2.position.set(0, 0.105, -0.05);

  // Precision Skeleton Buttstock with adjustable cheek riser
  const buttstock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.35), matDarkPolymer);
  buttstock.position.set(0, -0.02, 0.32);

  const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.16), matGripRubber);
  cheekRiser.position.set(0, 0.07, 0.26);

  const buttPad = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.16, 0.03), matGripRubber);
  buttPad.position.set(0, -0.02, 0.495);

  // Ergonomic Target Pistol Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.17, 0.09), matGripRubber);
  grip.position.set(0, -0.12, 0.06);
  grip.rotation.x = -0.35;

  // Quantum Battery Slug Box
  const battery = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.16, 0.13), matBlackMetal);
  battery.position.set(0, -0.12, -0.15);
  const batteryLed = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.025, 0.09), neonElectricTeal);
  batteryLed.position.set(0, -0.12, -0.15);

  // Folded Bipod legs under rail
  const bipodLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), matGunSteel);
  bipodLeft.rotation.x = Math.PI / 2;
  bipodLeft.position.set(-0.04, -0.05, -0.65);

  const bipodRight = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.28, 8), matGunSteel);
  bipodRight.rotation.x = Math.PI / 2;
  bipodRight.position.set(0.04, -0.05, -0.65);

  root.add(
    chassis, topRailBeam, bottomRailBeam, coreChannel, chevronMuzzle,
    scopeTube, scopeBellFront, scopeLens, scopeEyePiece,
    elevTurret, windTurret, ring1, ring2,
    buttstock, cheekRiser, buttPad, grip,
    battery, batteryLed, bipodLeft, bipodRight
  );

  return root;
}
