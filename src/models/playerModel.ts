import * as THREE from 'three';

export interface OperativeMeshUserData {
  name: string;
  team: string;
  nameTag: THREE.Mesh;
  visor: THREE.Mesh;
  targetPos: THREE.Vector3;
  targetRotY: number;
  hp: number;
  beaconLight?: THREE.Mesh;
}

export function createOperativePlayerMesh(name: string, team: string): THREE.Group {
  const root = new THREE.Group();
  const isRed = team === 'RED';
  const teamColorHex = isRed ? 0xff2244 : 0x00e5ff;
  const teamAccentHex = isRed ? 0xff5577 : 0x44f0ff;

  // Materials
  const matArmorPlates = new THREE.MeshStandardMaterial({
    color: 0x222733,
    roughness: 0.35,
    metalness: 0.65
  });

  const matUnderSuit = new THREE.MeshStandardMaterial({
    color: 0x161920,
    roughness: 0.8,
    metalness: 0.2
  });

  const matExoSteel = new THREE.MeshStandardMaterial({
    color: 0x3d4452,
    roughness: 0.25,
    metalness: 0.85
  });

  const matTeamGlow = new THREE.MeshBasicMaterial({ color: teamColorHex });
  const matTeamAccent = new THREE.MeshBasicMaterial({ color: teamAccentHex });
  const matRubber = new THREE.MeshStandardMaterial({ color: 0x0e1014, roughness: 0.9 });

  // 1. TORSO & PLATE CARRIER
  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 1.15, 0);

  // Undersuit chest
  const underChest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.32), matUnderSuit);
  chestGroup.add(underChest);

  // Front ballistic plate carrier
  const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.12), matArmorPlates);
  frontPlate.position.set(0, 0.04, 0.14);
  chestGroup.add(frontPlate);

  // Sternum Glowing Fusion Core
  const reactorRing = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), matExoSteel);
  reactorRing.rotation.x = Math.PI / 2;
  reactorRing.position.set(0, 0.12, 0.21);
  const reactorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.045, 16), matTeamGlow);
  reactorCore.rotation.x = Math.PI / 2;
  reactorCore.position.set(0, 0.12, 0.212);
  chestGroup.add(reactorRing, reactorCore);

  // Segmented Abdominal Armor Ribs
  for (let a = 0; a < 3; a++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.44 - a * 0.04, 0.045, 0.06), matArmorPlates);
    rib.position.set(0, -0.12 - a * 0.065, 0.15);
    chestGroup.add(rib);
  }

  // MOLLE Tactical Pouches
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), matUnderSuit);
  pouchL.position.set(-0.16, -0.16, 0.18);
  const pouchR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.08), matUnderSuit);
  pouchR.position.set(0.16, -0.16, 0.18);
  chestGroup.add(pouchL, pouchR);

  // Armored Neck Collar
  const neckCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.12, 8), matArmorPlates);
  neckCollar.position.set(0, 0.35, 0.02);
  chestGroup.add(neckCollar);

  // Back Spine Exoskeleton
  for (let s = 0; s < 5; s++) {
    const vertebra = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.05), matExoSteel);
    vertebra.position.set(0, 0.2 - s * 0.09, -0.18);
    chestGroup.add(vertebra);
  }

  // Back Jump-Thruster / Power Pack
  const backPack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.16), matArmorPlates);
  backPack.position.set(0, 0.06, -0.24);
  chestGroup.add(backPack);

  // Dual Exhaust Thrusters
  const thrusterL = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.12, 8), matExoSteel);
  thrusterL.position.set(-0.12, -0.16, -0.28);
  const thrusterR = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.12, 8), matExoSteel);
  thrusterR.position.set(0.12, -0.16, -0.28);
  chestGroup.add(thrusterL, thrusterR);

  // Back Beacon Light
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), matTeamGlow);
  beacon.position.set(0, 0.28, -0.25);
  chestGroup.add(beacon);

  root.add(chestGroup);

  // 2. HELMET & HEAD
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.68, 0.02);

  // Ballistic Helmet Dome
  const helmetDome = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.4), matArmorPlates);
  helmetDome.position.set(0, 0.04, -0.02);
  headGroup.add(helmetDome);

  // Top Helmet Mohawk Crest / Sensor Strip
  const helmetCrest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.36), matExoSteel);
  helmetCrest.position.set(0, 0.22, -0.02);
  headGroup.add(helmetCrest);

  // Tactical Visor (Team Glow, animates on voice chat)
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.13, 0.14),
    new THREE.MeshBasicMaterial({ color: teamColorHex })
  );
  visor.position.set(0, 0.06, 0.16);
  headGroup.add(visor);

  // Visor Sunshade Brow
  const visorBrow = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.16), matArmorPlates);
  visorBrow.position.set(0, 0.14, 0.17);
  headGroup.add(visorBrow);

  // Dual Rebreather Filter Canisters on Jaw
  const canisterL = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.08, 10), matExoSteel);
  canisterL.rotation.z = Math.PI / 2;
  canisterL.position.set(-0.16, -0.1, 0.12);
  const canisterR = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.08, 10), matExoSteel);
  canisterR.rotation.z = Math.PI / 2;
  canisterR.position.set(0.16, -0.1, 0.12);

  const filterGrille = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), matRubber);
  filterGrille.position.set(0, -0.1, 0.15);
  headGroup.add(canisterL, canisterR, filterGrille);

  // Tactical Comms Headset & Antenna
  const earCoverL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), matUnderSuit);
  earCoverL.rotation.z = Math.PI / 2;
  earCoverL.position.set(-0.2, 0.04, -0.02);
  const earCoverR = earCoverL.clone();
  earCoverR.position.x = 0.2;

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.24, 6), matExoSteel);
  antenna.position.set(-0.18, 0.22, -0.1);
  antenna.rotation.z = 0.1;
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), matTeamAccent);
  antennaTip.position.set(-0.2, 0.34, -0.1);

  headGroup.add(earCoverL, earCoverR, antenna, antennaTip);
  root.add(headGroup);

  // 3. SHOULDERS & ARMS
  // Left Arm
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.35, 1.35, 0);

  const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), matArmorPlates);
  leftShoulder.position.set(-0.02, 0.02, 0);
  const leftRankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.16), matTeamGlow);
  leftRankStripe.position.set(-0.02, 0.04, 0);

  const leftBicep = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), matUnderSuit);
  leftBicep.position.set(-0.02, -0.16, 0);

  const leftElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), matArmorPlates);
  leftElbowPad.position.set(-0.02, -0.32, -0.06);

  const leftForearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.3, 0.13), matArmorPlates);
  leftForearm.position.set(0.04, -0.38, 0.18);
  leftForearm.rotation.set(0.65, 0.2, -0.2);

  const leftGlove = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), matRubber);
  leftGlove.position.set(0.08, -0.48, 0.32);

  leftArm.add(leftShoulder, leftRankStripe, leftBicep, leftElbowPad, leftForearm, leftGlove);
  root.add(leftArm);

  // Right Arm (Trigger arm holding weapon)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.35, 1.35, 0);

  const rightShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.24), matArmorPlates);
  rightShoulder.position.set(0.02, 0.02, 0);
  const rightRankStripe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.02, 0.16), matTeamGlow);
  rightRankStripe.position.set(0.02, 0.04, 0);

  const rightBicep = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), matUnderSuit);
  rightBicep.position.set(0.02, -0.16, 0);

  const rightElbowPad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), matArmorPlates);
  rightElbowPad.position.set(0.02, -0.32, -0.06);

  const rightForearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.32, 0.13), matArmorPlates);
  rightForearm.position.set(-0.04, -0.34, 0.18);
  rightForearm.rotation.set(0.65, -0.2, 0.2);

  const rightGlove = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), matRubber);
  rightGlove.position.set(-0.08, -0.44, 0.32);

  rightArm.add(rightShoulder, rightRankStripe, rightBicep, rightElbowPad, rightForearm, rightGlove);
  root.add(rightArm);

  // In-Hand Detailed Tactical Carbine
  const weaponMesh = new THREE.Group();
  weaponMesh.position.set(0.15, 0.95, 0.38);
  weaponMesh.rotation.set(-0.15, 0.05, 0);

  const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.55), matExoSteel);
  const wBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8), matExoSteel);
  wBarrel.rotation.x = Math.PI / 2;
  wBarrel.position.set(0, 0.02, 0.38);

  const wMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.1), matUnderSuit);
  wMag.position.set(0, -0.12, 0.08);
  wMag.rotation.x = -0.25;

  const wSight = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.12), matArmorPlates);
  wSight.position.set(0, 0.08, 0.05);

  const wGlow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.02, 0.35), matTeamGlow);
  wGlow.position.set(0, 0.04, 0.05);

  weaponMesh.add(wBody, wBarrel, wMag, wSight, wGlow);
  root.add(weaponMesh);

  // 4. LEGS & BOOTS
  // Left Leg
  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.18, 0.75, 0);

  const leftThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.18), matUnderSuit);
  leftThigh.position.set(0, -0.18, 0);

  const leftThighPouch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.12), matArmorPlates);
  leftThighPouch.position.set(-0.1, -0.16, 0);

  const leftKnee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), matArmorPlates);
  leftKnee.position.set(0, -0.38, 0.08);

  const leftShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), matUnderSuit);
  leftShin.position.set(0, -0.56, 0);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.28), matArmorPlates);
  leftBoot.position.set(0, -0.72, 0.04);
  const leftSole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.3), matRubber);
  leftSole.position.set(0, -0.8, 0.04);

  leftLeg.add(leftThigh, leftThighPouch, leftKnee, leftShin, leftBoot, leftSole);
  root.add(leftLeg);

  // Right Leg
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.18, 0.75, 0);

  const rightThigh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.18), matUnderSuit);
  rightThigh.position.set(0, -0.18, 0);

  const rightHolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.12), matArmorPlates);
  rightHolster.position.set(0.1, -0.16, 0);

  const rightKnee = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.1), matArmorPlates);
  rightKnee.position.set(0, -0.38, 0.08);

  const rightShin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.34, 0.16), matUnderSuit);
  rightShin.position.set(0, -0.56, 0);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.28), matArmorPlates);
  rightBoot.position.set(0, -0.72, 0.04);
  const rightSole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.3), matRubber);
  rightSole.position.set(0, -0.8, 0.04);

  rightLeg.add(rightThigh, rightHolster, rightKnee, rightShin, rightBoot, rightSole);
  root.add(rightLeg);

  // 5. HOLOGRAPHIC OVERHEAD NAMEPLATE
  const nameCanvas = document.createElement('canvas');
  nameCanvas.width = 384;
  nameCanvas.height = 96;
  const nCtx = nameCanvas.getContext('2d')!;

  // Background panel with chamfered corner styling
  nCtx.fillStyle = 'rgba(10, 14, 24, 0.85)';
  nCtx.fillRect(0, 0, 384, 96);

  // Framing border
  nCtx.strokeStyle = isRed ? '#ff3355' : '#00e5ff';
  nCtx.lineWidth = 5;
  nCtx.strokeRect(4, 4, 376, 88);

  // Corner accents
  nCtx.fillStyle = isRed ? '#ff3355' : '#00e5ff';
  nCtx.fillRect(0, 0, 16, 16);
  nCtx.fillRect(368, 0, 16, 16);
  nCtx.fillRect(0, 80, 16, 16);
  nCtx.fillRect(368, 80, 16, 16);

  // Text
  nCtx.font = 'bold 32px "Courier New", monospace';
  nCtx.textAlign = 'center';
  nCtx.textBaseline = 'middle';
  nCtx.fillText(`[${team}] ${name.substring(0, 12)}`, 192, 48);

  const nameTex = new THREE.CanvasTexture(nameCanvas);
  nameTex.minFilter = THREE.LinearFilter;
  const nameTag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 0.48),
    new THREE.MeshBasicMaterial({ map: nameTex, side: THREE.DoubleSide, transparent: true })
  );
  nameTag.position.y = 2.45;
  root.add(nameTag);

  const userData: OperativeMeshUserData = {
    name,
    team,
    nameTag,
    visor,
    targetPos: new THREE.Vector3(),
    targetRotY: 0,
    hp: 100,
    beaconLight: beacon
  };

  root.userData = userData;
  return root;
}
