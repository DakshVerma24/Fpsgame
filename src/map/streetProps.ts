import * as THREE from 'three';
import { MapContext } from './mapTypes';
import {
  createManholeTexture,
  createStormDrainTexture,
  createDumpsterTexture,
  createSidewalkTexture
} from './mapTextures';

// Shared materials
const concreteBarrierMat = new THREE.MeshStandardMaterial({
  color: 0x3d4758,
  roughness: 0.8,
  metalness: 0.2
});

const hazardStripeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, metalness: 0.85, roughness: 0.3 });
const lampHeadMat = new THREE.MeshBasicMaterial({ color: 0xd8eeff });
const bollardBaseMat = new THREE.MeshStandardMaterial({ color: 0x242b38, metalness: 0.7, roughness: 0.3 });
const benchWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a4128, roughness: 0.7 });
const benchMetalMat = new THREE.MeshStandardMaterial({ color: 0x1f2735, metalness: 0.8 });

/**
 * Creates sidewalk curb platforms along major avenues with proper colliders and foundations.
 */
export function createSidewalks(ctx: MapContext): void {
  const { scene, heightAt, addCollider, addFoundation } = ctx;
  const sidewalkTex = createSidewalkTexture();
  sidewalkTex.repeat.set(4, 24);
  const sidewalkMat = new THREE.MeshStandardMaterial({
    map: sidewalkTex,
    roughness: 0.7,
    metalness: 0.2
  });

  // Sidewalk definitions: [x, z, width, length, rotY]
  const sidewalkConfigs = [
    // West Pedestrian Walkway (near Red base)
    { x: -30, z: -15, w: 4.5, l: 26, rotY: 0 },
    { x: -30, z: 15, w: 4.5, l: 26, rotY: 0 },
    // East Pedestrian Walkway (near Blue base)
    { x: 30, z: -15, w: 4.5, l: 26, rotY: 0 },
    { x: 30, z: 15, w: 4.5, l: 26, rotY: 0 },
    // North & South Central Promenade Segments
    { x: -14, z: -25, w: 22, l: 4.0, rotY: 0 },
    { x: 14, z: -25, w: 22, l: 4.0, rotY: 0 },
    { x: -14, z: 25, w: 22, l: 4.0, rotY: 0 },
    { x: 14, z: 25, w: 22, l: 4.0, rotY: 0 }
  ];

  sidewalkConfigs.forEach(({ x, z, w, l, rotY }) => {
    const curH = 0.25;
    const y = heightAt(x, z);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, curH, l), sidewalkMat);
    mesh.position.set(x, y + curH / 2, z);
    mesh.rotation.y = rotY;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Subtle step collider so players smoothly step onto it
    addCollider(x, y + curH / 2, z, w, curH, l);
    addFoundation(w + 0.2, l + 0.2, x, z, y - 2);

    // Beveled curb trim line placed on the street-facing edge of the sidewalk
    let curbX = x;
    let curbZ = z;
    if (w < l) {
      // North-South walkway: curb faces toward the central roadway (x = 0)
      curbX = x > 0 ? x - w / 2 + 0.15 : x + w / 2 - 0.15;
    } else {
      // East-West walkway: curb faces toward the central avenue (z = 0)
      curbZ = z > 0 ? z - l / 2 + 0.15 : z + l / 2 - 0.15;
    }

    const curbTrim = new THREE.Mesh(
      new THREE.BoxGeometry(w > l ? w : 0.28, 0.32, l > w ? l : 0.28),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
    );
    curbTrim.position.set(curbX, y + 0.16, curbZ);
    scene.add(curbTrim);
  });
}

/**
 * Creates circular manhole covers and storm sewer drain grates embedded in the roadway.
 */
export function createStreetDrains(ctx: MapContext): void {
  const { scene, heightAt, clutterGroup } = ctx;
  const targetGroup = clutterGroup || scene;
  const manholeTex = createManholeTexture();
  const manholeMat = new THREE.MeshBasicMaterial({
    map: manholeTex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });
  const manholeGeo = new THREE.CylinderGeometry(0.75, 0.76, 0.04, 16);

  const drainTex = createStormDrainTexture();
  const drainMat = new THREE.MeshBasicMaterial({
    map: drainTex,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3
  });
  const drainGeo = new THREE.BoxGeometry(1.6, 0.04, 0.8);

  // Manhole coordinates across roads
  const manholes = [
    [-15, 0], [15, 0], [-35, -5], [35, 5], [0, -14], [0, 14], [-24, 18], [24, -18]
  ];
  manholes.forEach(([mx, mz]) => {
    const y = heightAt(mx, mz) + 0.04;
    const mesh = new THREE.Mesh(manholeGeo, manholeMat);
    mesh.position.set(mx, y, mz);
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    targetGroup.add(mesh);
  });

  // Storm drain coordinates near sidewalks
  const drains = [
    [-27.5, -8, 0], [-27.5, 8, 0], [27.5, -8, 0], [27.5, 8, 0],
    [-8, -23, Math.PI / 2], [8, -23, Math.PI / 2], [-8, 23, Math.PI / 2], [8, 23, Math.PI / 2]
  ];
  drains.forEach(([dx, dz, rotY]) => {
    const y = heightAt(dx, dz) + 0.05;
    const mesh = new THREE.Mesh(drainGeo, drainMat);
    mesh.position.set(dx, y, dz);
    mesh.rotation.y = rotY;
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
    targetGroup.add(mesh);
  });
}

/**
 * Cyberpunk streetlight poles with angled luminaires and practical downlights.
 */
export function createStreetLamps(ctx: MapContext): void {
  const { scene, heightAt, addCollider } = ctx;
  const lampPoleH = 6.8;
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, lampPoleH, 8);
  const armGeo = new THREE.BoxGeometry(0.12, 0.12, 2.2);
  const headGeo = new THREE.BoxGeometry(0.45, 0.16, 0.9);

  // High-performance ground glow decal (replaces 8 expensive dynamic spotlights)
  const poolGeo = new THREE.CircleGeometry(2.5, 12);
  poolGeo.rotateX(-Math.PI / 2);
  const poolMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.12 });

  const lampPositions = [
    { x: -28, z: -10, rotY: Math.PI / 2 },
    { x: -28, z: 10, rotY: Math.PI / 2 },
    { x: 28, z: -10, rotY: -Math.PI / 2 },
    { x: 28, z: 10, rotY: -Math.PI / 2 },
    { x: -12, z: -23, rotY: 0 },
    { x: 12, z: -23, rotY: 0 },
    { x: -12, z: 23, rotY: Math.PI },
    { x: 12, z: 23, rotY: Math.PI }
  ];

  lampPositions.forEach(({ x, z, rotY }) => {
    const baseY = heightAt(x, z);
    const lampGroup = new THREE.Group();
    lampGroup.position.set(x, baseY, z);
    lampGroup.rotation.y = rotY;

    // Vertical mast
    const pole = new THREE.Mesh(poleGeo, lampPoleMat);
    pole.position.y = lampPoleH / 2;
    pole.castShadow = true;
    lampGroup.add(pole);

    // Overhang horizontal boom arm
    const boom = new THREE.Mesh(armGeo, lampPoleMat);
    boom.position.set(0, lampPoleH - 0.2, 0.9);
    lampGroup.add(boom);

    // Luminaire light fixture
    const head = new THREE.Mesh(headGeo, lampHeadMat);
    head.position.set(0, lampPoleH - 0.35, 1.8);
    lampGroup.add(head);

    // Ground light pool decal
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(0, 0.02, 1.8);
    lampGroup.add(pool);

    lampGroup.updateMatrix();
    lampGroup.matrixAutoUpdate = false;
    scene.add(lampGroup);
    addCollider(x, baseY + lampPoleH / 2, z, 0.5, lampPoleH, 0.5);
  });
}

/**
 * Heavy-duty industrial dumpsters with hinged angled lids and hazard markings.
 */
export function createDumpsters(ctx: MapContext): void {
  const { scene, heightAt, addCollider, addFoundation } = ctx;
  const dW = 3.2;
  const dH = 1.9;
  const dD = 2.0;

  const dumpsterMat = new THREE.MeshStandardMaterial({
    map: createDumpsterTexture('#1b2d24', 'WASTE // 09'),
    metalness: 0.6,
    roughness: 0.45
  });

  const dumpsterBlueMat = new THREE.MeshStandardMaterial({
    map: createDumpsterTexture('#1c2838', 'BIO-HAZ // 04'),
    metalness: 0.6,
    roughness: 0.45
  });

  const dumpsters = [
    { x: -32, z: -24, rotY: 0.2, mat: dumpsterMat },
    { x: 32, z: 24, rotY: -0.3, mat: dumpsterBlueMat },
    { x: -14, z: -7, rotY: Math.PI / 2, mat: dumpsterMat },
    { x: 14, z: 7, rotY: -Math.PI / 2, mat: dumpsterBlueMat }
  ];

  dumpsters.forEach(({ x, z, rotY, mat }) => {
    const baseY = heightAt(x, z);
    const group = new THREE.Group();
    group.position.set(x, baseY, z);
    group.rotation.y = rotY;

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(dW, dH * 0.8, dD), mat);
    body.position.y = (dH * 0.8) / 2 + 0.15;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Angled Lid
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x11161d, metalness: 0.8 });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(dW + 0.1, 0.15, dD + 0.1), lidMat);
    lid.position.y = dH * 0.8 + 0.22;
    group.add(lid);

    // Base caster wheels
    const wheelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.15, 8);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0d12 });
    [[-dW / 2 + 0.3, -dD / 2 + 0.3], [dW / 2 - 0.3, -dD / 2 + 0.3], [-dW / 2 + 0.3, dD / 2 - 0.3], [dW / 2 - 0.3, dD / 2 - 0.3]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.12, wz);
      group.add(w);
    });

    scene.add(group);
    addCollider(x, baseY + dH / 2, z, dW, dH, dD);
    addFoundation(dW + 0.1, dD + 0.1, x, z, baseY - 3);
  });
}

/**
 * Concrete Jersey highway barricades with yellow/black hazard chevrons.
 */
export function createConcreteBarriers(ctx: MapContext): void {
  const { scene, heightAt, addCollider, addFoundation } = ctx;
  const bW = 3.6;
  const bH = 1.35;
  const bD = 0.9;

  const barrierGeo = new THREE.BoxGeometry(bW, bH, bD);

  const barrierLocs = [
    { x: -6, z: -10, rotY: 0 },
    { x: 6, z: 10, rotY: 0 },
    { x: -6, z: 10, rotY: Math.PI / 2 },
    { x: 6, z: -10, rotY: Math.PI / 2 },
    { x: -22, z: 2, rotY: 0.3 },
    { x: 22, z: -2, rotY: -0.3 }
  ];

  barrierLocs.forEach(({ x, z, rotY }) => {
    const baseY = heightAt(x, z);
    const group = new THREE.Group();
    group.position.set(x, baseY + bH / 2, z);
    group.rotation.y = rotY;

    const body = new THREE.Mesh(barrierGeo, concreteBarrierMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Hazard stripe band
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(bW + 0.02, 0.25, bD + 0.02), hazardStripeMat);
    stripe.position.y = 0.2;
    group.add(stripe);

    scene.add(group);
    addCollider(x, baseY + bH / 2, z, bW, bH, bD);
    addFoundation(bW + 0.1, bD + 0.1, x, z, baseY - 3);
  });
}

/**
 * Glowing neon street security bollards marking pedestrian safety zones.
 */
export function createNeonBollards(ctx: MapContext): void {
  const { scene, heightAt, addCollider } = ctx;
  const bH = 1.1;
  const bR = 0.18;
  const postGeo = new THREE.CylinderGeometry(bR, bR, bH, 10);
  const ringGeo = new THREE.TorusGeometry(bR + 0.02, 0.03, 8, 12);
  ringGeo.rotateX(Math.PI / 2);
  const ringCyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
  const ringRedMat = new THREE.MeshBasicMaterial({ color: 0xff3355 });

  const bollardPositions = [
    // West choke
    { x: -26, z: -3, team: 'RED' }, { x: -26, z: 0, team: 'RED' }, { x: -26, z: 3, team: 'RED' },
    // East choke
    { x: 26, z: -3, team: 'BLUE' }, { x: 26, z: 0, team: 'BLUE' }, { x: 26, z: 3, team: 'BLUE' },
    // Center plazas
    { x: -14, z: -16, team: 'RED' }, { x: -14, z: -18, team: 'RED' },
    { x: 14, z: 16, team: 'BLUE' }, { x: 14, z: 18, team: 'BLUE' }
  ];

  bollardPositions.forEach(({ x, z, team }) => {
    const baseY = heightAt(x, z);
    const post = new THREE.Mesh(postGeo, bollardBaseMat);
    post.position.set(x, baseY + bH / 2, z);
    post.castShadow = true;

    const ring = new THREE.Mesh(ringGeo, team === 'RED' ? ringRedMat : ringCyanMat);
    ring.position.y = bH * 0.35;
    post.add(ring);

    post.updateMatrix();
    post.matrixAutoUpdate = false;
    const targetGroup = ctx.clutterGroup || scene;
    targetGroup.add(post);
    addCollider(x, baseY + bH / 2, z, 0.45, bH, 0.45);
  });
}

/**
 * Parked tactical cyberpunk vehicle for environmental realism and strategic street cover.
 */
export function createParkedTacticalVehicles(ctx: MapContext): void {
  const { scene, heightAt, addCollider, addFoundation } = ctx;

  const vehicleConfigs = [
    { x: -24, z: -18, rotY: 0.4, color: 0x1f2937, accent: 0xff3355 },
    { x: 24, z: 18, rotY: -0.4, color: 0x1e293b, accent: 0x00e5ff }
  ];

  vehicleConfigs.forEach(({ x, z, rotY, color, accent }) => {
    const baseY = heightAt(x, z);
    const carGroup = new THREE.Group();
    carGroup.position.set(x, baseY, z);
    carGroup.rotation.y = rotY;

    const vW = 2.4;
    const vH = 1.4;
    const vL = 5.2;

    // Chassis base
    const bodyMat = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.25 });
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(vW, 0.7, vL), bodyMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    carGroup.add(chassis);

    // Sloped cabin canopy (dark polarized glass)
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a101d, metalness: 0.95, roughness: 0.1 });
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(vW * 0.85, 0.65, vL * 0.5), glassMat);
    cabin.position.set(0, 1.15, -0.2);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Cyberpunk headlights (bright emissive strips)
    const headMat = new THREE.MeshBasicMaterial({ color: accent });
    const headL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.1), headMat);
    headL.position.set(-vW * 0.35, 0.6, vL / 2 + 0.02);
    const headR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.1), headMat);
    headR.position.set(vW * 0.35, 0.6, vL / 2 + 0.02);
    carGroup.add(headL, headR);

    // Red taillight bar
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff1133 });
    const tailBar = new THREE.Mesh(new THREE.BoxGeometry(vW * 0.8, 0.1, 0.1), tailMat);
    tailBar.position.set(0, 0.65, -vL / 2 - 0.02);
    carGroup.add(tailBar);

    // Armored heavy wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.9 });
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelPositions = [
      [-vW / 2 - 0.08, 0.42, vL * 0.3],
      [vW / 2 + 0.08, 0.42, vL * 0.3],
      [-vW / 2 - 0.08, 0.42, -vL * 0.3],
      [vW / 2 + 0.08, 0.42, -vL * 0.3]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    carGroup.updateMatrix();
    carGroup.matrixAutoUpdate = false;
    scene.add(carGroup);
    addCollider(x, baseY + vH / 2, z, vW + 0.4, vH, vL);
    addFoundation(vW + 0.6, vL + 0.2, x, z, baseY - 3);
  });
}

/**
 * Public street furniture: benches and recycling/data terminals.
 */
export function createStreetBenches(ctx: MapContext): void {
  const { scene, heightAt, addCollider, clutterGroup } = ctx;
  const targetGroup = clutterGroup || scene;
  const benchW = 2.4;
  const benchH = 0.85;
  const benchD = 0.75;

  const benchConfigs = [
    { x: -30, z: -8, rotY: Math.PI / 2 },
    { x: -30, z: 8, rotY: Math.PI / 2 },
    { x: 30, z: -8, rotY: -Math.PI / 2 },
    { x: 30, z: 8, rotY: -Math.PI / 2 }
  ];

  benchConfigs.forEach(({ x, z, rotY }) => {
    // Benches are situated on sidewalks elevated 0.25m above ground
    const baseY = heightAt(x, z) + 0.25;
    const group = new THREE.Group();
    group.position.set(x, baseY, z);
    group.rotation.y = rotY;

    // Wooden slat seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(benchW, 0.08, benchD), benchWoodMat);
    seat.position.y = 0.45;
    group.add(seat);

    // Slat backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(benchW, 0.35, 0.08), benchWoodMat);
    back.position.set(0, 0.68, -benchD / 2 + 0.04);
    group.add(back);

    // Metal legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.45, benchD);
    const legL = new THREE.Mesh(legGeo, benchMetalMat);
    legL.position.set(-benchW * 0.4, 0.22, 0);
    const legR = new THREE.Mesh(legGeo, benchMetalMat);
    legR.position.set(benchW * 0.4, 0.22, 0);
    group.add(legL, legR);

    group.updateMatrix();
    group.matrixAutoUpdate = false;
    targetGroup.add(group);
    addCollider(x, baseY + benchH / 2, z, benchW, benchH, benchD);
  });
}
