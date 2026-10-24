import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import {
  createTravertinePiazzaTexture,
  createClassicalBasilicaFacadeTexture,
  createFlutedColumnTexture
} from './mapTextures';

/**
 * Vatican City - Piazza San Pietro (Deadshot Tactical Edition)
 * Monumental classical arena featuring high-resolution Italian travertine paving,
 * detailed St. Peter's Basilica facade with arched porticos and pediment friezes,
 * fluted Corinthian columns, Bernini colonnades, Maderno & Bernini twin fountains,
 * central Egyptian obelisk, and tactical marble balustrades & bench cover for competitive gunfights.
 */
export function buildVaticanMap(
  scene: THREE.Scene,
  colliders: Collider[],
  _heightAt: HeightAtFunction,
  _halfW: number,
  _halfD: number
): UpgradedMapResult {
  const mapGroup = new THREE.Group();
  scene.add(mapGroup);

  function addCollider(x: number, y: number, z: number, w: number, h: number, d: number) {
    colliders.push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      top: y + h / 2,
      bottom: y - h / 2
    });
  }

  function markStatic(mesh: THREE.Object3D) {
    mesh.updateMatrix();
    mesh.matrixAutoUpdate = false;
  }

  // --- High-Quality Deadshot PBR Materials ---
  const texPiazza = createTravertinePiazzaTexture();
  const texFacade = createClassicalBasilicaFacadeTexture();
  const texColumn = createFlutedColumnTexture();

  const matPiazza = new THREE.MeshStandardMaterial({
    map: texPiazza,
    roughness: 0.72,
    metalness: 0.08
  });
  const matFacade = new THREE.MeshStandardMaterial({
    map: texFacade,
    roughness: 0.75,
    metalness: 0.06
  });
  const matColumn = new THREE.MeshStandardMaterial({
    map: texColumn,
    roughness: 0.65,
    metalness: 0.1
  });
  const matStoneTrim = new THREE.MeshStandardMaterial({ color: 0xdfd4c0, roughness: 0.65, metalness: 0.08 });
  const matMarbleWhite = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.45, metalness: 0.15 });
  const matGoldTrim = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.85, roughness: 0.25 });
  const matDomeMetal = new THREE.MeshStandardMaterial({ color: 0x5a7566, metalness: 0.68, roughness: 0.38 });
  const matDarkArch = new THREE.MeshStandardMaterial({ color: 0x141822, roughness: 0.95 });
  const matWater = new THREE.MeshStandardMaterial({
    color: 0x0099cc,
    emissive: 0x003355,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.75,
    roughness: 0.08,
    metalness: 0.45
  });
  const matBenchWood = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.85 });

  // ── PIAZZA (Main Ground) ──
  const piazzaMesh = new THREE.Mesh(new THREE.BoxGeometry(130, 1.2, 120), matPiazza);
  piazzaMesh.position.set(0, -0.6, 10);
  piazzaMesh.receiveShadow = true;
  markStatic(piazzaMesh);
  mapGroup.add(piazzaMesh);
  addCollider(0, -0.6, 10, 130, 1.2, 120);

  // Radial Stone Pattern lines in the square
  const numLines = 16;
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xf5eedd, roughness: 0.55 });
  for (let i = 0; i < numLines; i++) {
    const angle = (i / numLines) * Math.PI * 2;
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 52), lineMat);
    line.position.set(Math.sin(angle) * 26, 0.02, Math.cos(angle) * 26 + 5);
    line.rotation.y = angle;
    line.receiveShadow = true;
    markStatic(line);
    mapGroup.add(line);
  }

  // ── ST. PETER'S BASILICA FACADE ──
  // Main facade wall
  const facadeMain = new THREE.Mesh(new THREE.BoxGeometry(62, 30, 12), matFacade);
  facadeMain.position.set(0, 15, -60);
  facadeMain.castShadow = true;
  facadeMain.receiveShadow = true;
  markStatic(facadeMain);
  mapGroup.add(facadeMain);
  addCollider(0, 15, -60, 62, 30, 12);

  // Grand Arched Portico Entrances (Ground floor depth)
  [-16, 0, 16].forEach(px => {
    // Recessed dark arched portal
    const portal = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 2), matDarkArch);
    portal.position.set(px, 4.5, -53.8);
    markStatic(portal);
    mapGroup.add(portal);

    // Stone arch framing
    const archTrim = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.8, 2.2), matMarbleWhite);
    archTrim.position.set(px, 9.4, -53.7);
    markStatic(archTrim);
    mapGroup.add(archTrim);
  });

  // Central raised section
  const facadeCenter = new THREE.Mesh(new THREE.BoxGeometry(26, 5, 12), matFacade);
  facadeCenter.position.set(0, 32.5, -60);
  facadeCenter.castShadow = true;
  markStatic(facadeCenter);
  mapGroup.add(facadeCenter);
  addCollider(0, 32.5, -60, 26, 5, 12);

  // Flanking wings
  [-36, 36].forEach(wx => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(14, 20, 8), matFacade);
    wing.position.set(wx, 10, -62);
    wing.castShadow = true;
    wing.receiveShadow = true;
    markStatic(wing);
    mapGroup.add(wing);
    addCollider(wx, 10, -62, 14, 20, 8);
  });

  // ── PAPAL BALCONY & ROOM (Elevation Y=20, Z=-54) ──
  // Balcony floor
  const balconyFloor = new THREE.Mesh(new THREE.BoxGeometry(12, 0.6, 4.5), matMarbleWhite);
  balconyFloor.position.set(0, 20, -53.5);
  balconyFloor.receiveShadow = true;
  markStatic(balconyFloor);
  mapGroup.add(balconyFloor);
  addCollider(0, 20, -53.5, 12, 0.6, 4.5);

  // Balcony front railing
  const balconyFrontRail = new THREE.Mesh(new THREE.BoxGeometry(12, 0.8, 0.4), matStoneTrim);
  balconyFrontRail.position.set(0, 20.7, -51.3);
  balconyFrontRail.castShadow = true;
  markStatic(balconyFrontRail);
  mapGroup.add(balconyFrontRail);
  addCollider(0, 20.7, -51.3, 12, 0.8, 0.4);

  // Balcony side railings
  [-5.8, 5.8].forEach(rx => {
    const sRail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 4.5), matStoneTrim);
    sRail.position.set(rx, 20.7, -53.5);
    markStatic(sRail);
    mapGroup.add(sRail);
    addCollider(rx, 20.7, -53.5, 0.4, 0.8, 4.5);
  });

  // Balcony Support Brackets underneath
  [-3.5, 0, 3.5].forEach(bx => {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 3.5), matStoneTrim);
    bracket.position.set(bx, 19.0, -53.5);
    markStatic(bracket);
    mapGroup.add(bracket);
  });

  // Papal Room interior behind balcony
  const roomY = 20.25;
  const roomZ = -58;
  const roomW = 14;
  const roomD = 8;
  const roomH = 5.2;

  const roomFloor = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.3, roomD), new THREE.MeshStandardMaterial({ color: 0xc8a868, roughness: 0.4 }));
  roomFloor.position.set(0, roomY, roomZ);
  markStatic(roomFloor);
  mapGroup.add(roomFloor);
  addCollider(0, roomY, roomZ, roomW, 0.3, roomD);

  const roomBack = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.4), matFacade);
  roomBack.position.set(0, roomY + roomH / 2, roomZ - roomD / 2);
  markStatic(roomBack);
  mapGroup.add(roomBack);
  addCollider(0, roomY + roomH / 2, roomZ - roomD / 2, roomW, roomH, 0.4);

  // Red carpet runner in papal room
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(3, 0.04, roomD - 1), new THREE.MeshStandardMaterial({ color: 0x8b1a1a, roughness: 0.9 }));
  carpet.position.set(0, roomY + 0.18, roomZ);
  markStatic(carpet);
  mapGroup.add(carpet);

  // ── BASILICA DOME ──
  const domeGroup = new THREE.Group();
  domeGroup.position.set(0, 38, -66);
  mapGroup.add(domeGroup);

  // Dome drum cylinder with pilasters
  const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 7, 24), matFacade);
  domeDrum.position.set(0, 0, 0);
  domeDrum.castShadow = true;
  markStatic(domeDrum);
  domeGroup.add(domeDrum);

  // Dome drum cornice ring
  const drumCornice = new THREE.Mesh(new THREE.CylinderGeometry(11.8, 11.4, 0.8, 24), matMarbleWhite);
  drumCornice.position.set(0, 3.8, 0);
  markStatic(drumCornice);
  domeGroup.add(drumCornice);

  // Dome hemisphere
  const domeHemisphere = new THREE.Mesh(new THREE.SphereGeometry(12.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), matDomeMetal);
  domeHemisphere.position.set(0, 10, 0);
  domeHemisphere.castShadow = true;
  markStatic(domeHemisphere);
  domeGroup.add(domeHemisphere);

  // Dome ribs
  for (let i = 0; i < 12; i++) {
    const rAngle = (i / 12) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.4, 12, 0.4), matGoldTrim);
    rib.position.set(Math.sin(rAngle) * 9.5, 14, Math.cos(rAngle) * 9.5);
    rib.rotation.y = rAngle;
    rib.rotation.x = 0.25;
    markStatic(rib);
    domeGroup.add(rib);
  }

  // Dome lantern
  const domeLantern = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, 5.5, 12), matMarbleWhite);
  domeLantern.position.set(0, 22.5, 0);
  markStatic(domeLantern);
  domeGroup.add(domeLantern);

  // Golden cross on top of dome
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.2, 0.35), matGoldTrim);
  crossV.position.set(0, 26.5, 0);
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.35), matGoldTrim);
  crossH.position.set(0, 27.2, 0);
  markStatic(crossV);
  markStatic(crossH);
  domeGroup.add(crossV, crossH);

  // ── FACADE COLUMNS & PEDIMENT ──
  const colPositions = [-14, -8, 8, 14];
  colPositions.forEach(cx => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 26, 16), matColumn);
    col.position.set(cx, 15, -53.5);
    col.castShadow = true;
    markStatic(col);
    mapGroup.add(col);
    addCollider(cx, 15, -53.5, 2.0, 26, 2.0);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), matMarbleWhite);
    cap.position.set(cx, 28.5, -53.5);
    markStatic(cap);
    mapGroup.add(cap);

    const basePed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 2.4), matMarbleWhite);
    basePed.position.set(cx, 0.8, -53.5);
    markStatic(basePed);
    mapGroup.add(basePed);
  });

  // Triangular Pediment
  const pedimentGroup = new THREE.Group();
  pedimentGroup.position.set(0, 34, -54);
  mapGroup.add(pedimentGroup);

  const pedimentBeam = new THREE.Mesh(new THREE.BoxGeometry(32, 2.4, 4), matStoneTrim);
  pedimentBeam.position.set(0, -3.2, 0);
  pedimentBeam.castShadow = true;
  markStatic(pedimentBeam);
  pedimentGroup.add(pedimentBeam);

  const pedimentCone = new THREE.Mesh(new THREE.ConeGeometry(16, 5.5, 4), matStoneTrim);
  pedimentCone.rotation.y = Math.PI / 4;
  pedimentCone.position.set(0, 0.2, 0);
  pedimentCone.castShadow = true;
  markStatic(pedimentCone);
  pedimentGroup.add(pedimentCone);

  // ── BERNINI'S COLONNADES (Curved Arms) ──
  function buildColonnade(isLeft: boolean) {
    const sign = isLeft ? -1 : 1;
    const centerX = sign * 30;
    const centerZ = 8;
    const radius = 36;
    const numColumns = 18;
    const startAngle = isLeft ? Math.PI * 0.52 : -Math.PI * 0.02;
    const endAngle = isLeft ? Math.PI * 1.02 : Math.PI * 0.48;

    const colCoords: { x: number; z: number }[] = [];
    for (let i = 0; i < numColumns; i++) {
      const t = i / (numColumns - 1);
      const angle = startAngle + t * (endAngle - startAngle);
      const cx = centerX + Math.cos(angle) * radius;
      const cz = centerZ + Math.sin(angle) * radius;
      colCoords.push({ x: cx, z: cz });

      const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 12, 12), matColumn);
      colMesh.position.set(cx, 6, cz);
      colMesh.castShadow = true;
      markStatic(colMesh);
      mapGroup.add(colMesh);
      addCollider(cx, 6, cz, 1.4, 12, 1.4);

      // Classical base plinth
      const bPlinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), matMarbleWhite);
      bPlinth.position.set(cx, 0.3, cz);
      markStatic(bPlinth);
      mapGroup.add(bPlinth);
    }

    // Connect tops with entablature beam
    for (let i = 0; i < colCoords.length - 1; i++) {
      const p1 = colCoords[i];
      const p2 = colCoords[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const len = Math.sqrt(dx * dx + dz * dz);
      const rotY = Math.atan2(dx, dz);

      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.0, len + 0.4), matStoneTrim);
      beam.position.set((p1.x + p2.x) / 2, 13, (p1.z + p2.z) / 2);
      beam.rotation.y = rotY;
      beam.castShadow = true;
      markStatic(beam);
      mapGroup.add(beam);
    }

    // Statues along colonnade top
    for (let i = 0; i < 10; i++) {
      const t = (i + 0.5) / 10;
      const angle = startAngle + t * (endAngle - startAngle);
      const sx = centerX + Math.cos(angle) * radius;
      const sz = centerZ + Math.sin(angle) * radius;

      const statueBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.4, 0.65), matMarbleWhite);
      statueBody.position.set(sx, 15.5, sz);
      const statueHead = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), matMarbleWhite);
      statueHead.position.set(sx, 17.0, sz);
      markStatic(statueBody);
      markStatic(statueHead);
      mapGroup.add(statueBody, statueHead);
    }
  }

  buildColonnade(true);
  buildColonnade(false);

  // ── CENTRAL EGYPTIAN OBELISK ──
  const obeliskGroup = new THREE.Group();
  obeliskGroup.position.set(0, 0, 5);
  mapGroup.add(obeliskGroup);

  const obeliskBase = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.2, 4.8), matMarbleWhite);
  obeliskBase.position.set(0, 1.6, 0);
  obeliskBase.castShadow = true;
  markStatic(obeliskBase);
  obeliskGroup.add(obeliskBase);
  addCollider(0, 1.6, 5, 4.8, 3.2, 4.8);

  // Red and Blue granite shaft
  const matObeliskGranite = new THREE.MeshStandardMaterial({ color: 0xc46b52, roughness: 0.45, metalness: 0.15 });
  const obeliskShaft = new THREE.Mesh(new THREE.BoxGeometry(2.0, 25, 2.0), matObeliskGranite);
  obeliskShaft.position.set(0, 15.7, 0);
  obeliskShaft.castShadow = true;
  markStatic(obeliskShaft);
  obeliskGroup.add(obeliskShaft);

  const obeliskTip = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.4, 4), matGoldTrim);
  obeliskTip.rotation.y = Math.PI / 4;
  obeliskTip.position.set(0, 29.4, 0);
  markStatic(obeliskTip);
  obeliskGroup.add(obeliskTip);

  const obeliskCross = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.25), matGoldTrim);
  obeliskCross.position.set(0, 31.4, 0);
  const obeliskCrossH = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 0.25), matGoldTrim);
  obeliskCrossH.position.set(0, 31.8, 0);
  markStatic(obeliskCross);
  markStatic(obeliskCrossH);
  obeliskGroup.add(obeliskCross, obeliskCrossH);

  // ── TWIN FOUNTAINS (Maderno & Bernini) ──
  const fountainWaters: THREE.Mesh[] = [];

  function buildFountain(fx: number, fz: number) {
    const fGroup = new THREE.Group();
    fGroup.position.set(fx, 0, fz);
    mapGroup.add(fGroup);

    // Octagonal tiered stone basin
    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.6, 1.2, 16), matMarbleWhite);
    fBase.position.set(0, 0.6, 0);
    fBase.castShadow = true;
    markStatic(fBase);
    fGroup.add(fBase);
    addCollider(fx, 0.6, fz, 8.2, 1.2, 8.2);

    const fWater = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.25, 16), matWater);
    fWater.position.set(0, 1.15, 0);
    fGroup.add(fWater);
    fountainWaters.push(fWater);

    const fCenterCol = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 3.2, 12), matMarbleWhite);
    fCenterCol.position.set(0, 2.4, 0);
    markStatic(fCenterCol);
    fGroup.add(fCenterCol);

    const fUpperBasin = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 1.5, 0.9, 12), matStoneTrim);
    fUpperBasin.position.set(0, 4.2, 0);
    markStatic(fUpperBasin);
    fGroup.add(fUpperBasin);

    // Upper water jet
    const fJet = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.4, 8), matWater);
    fJet.position.set(0, 5.2, 0);
    fGroup.add(fJet);
  }

  buildFountain(-22, 5);
  buildFountain(22, 5);

  // ── DEADSHOT COMPETITIVE TACTICAL COVER (Marble Balustrades & Benches) ──
  // 1. Classical Marble Balustrade Cover (Waist-high tactical cover for sliding & peeking)
  function createBalustradeBarrier(bx: number, bz: number, rotY: number, length: number) {
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0, bz);
    bGroup.rotation.y = rotY;
    mapGroup.add(bGroup);

    // Base pedestal
    const bBase = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 0.9), matMarbleWhite);
    bBase.position.set(0, 0.175, 0);
    bBase.castShadow = true;
    bBase.receiveShadow = true;
    markStatic(bBase);
    bGroup.add(bBase);

    // Top rail (1.1m height, perfect Deadshot head-glitch / cover height)
    const bTop = new THREE.Mesh(new THREE.BoxGeometry(length, 0.25, 0.8), matMarbleWhite);
    bTop.position.set(0, 1.05, 0);
    bTop.castShadow = true;
    markStatic(bTop);
    bGroup.add(bTop);

    // Mid baluster pillars
    const numPillars = Math.max(3, Math.floor(length / 1.1));
    for (let i = 0; i < numPillars; i++) {
      const px = -length / 2 + (i + 0.5) * (length / numPillars);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.65, 8), matStoneTrim);
      pillar.position.set(px, 0.65, 0);
      markStatic(pillar);
      bGroup.add(pillar);
    }

    // End posts
    [-length / 2 + 0.3, length / 2 - 0.3].forEach(epx => {
      const ePost = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.25, 0.85), matStoneTrim);
      ePost.position.set(epx, 0.625, 0);
      markStatic(ePost);
      bGroup.add(ePost);
    });

    // Add exact collider
    const cosR = Math.abs(Math.cos(rotY));
    const sinR = Math.abs(Math.sin(rotY));
    const boundW = length * cosR + 0.9 * sinR;
    const boundD = length * sinR + 0.9 * cosR;
    addCollider(bx, 0.6, bz, boundW, 1.2, boundD);
  }

  // Tactical barriers positioned around middle & team approach lanes
  createBalustradeBarrier(-18, -18, 0, 7.5);
  createBalustradeBarrier(18, -18, 0, 7.5);
  createBalustradeBarrier(-18, 28, 0, 7.5);
  createBalustradeBarrier(18, 28, 0, 7.5);

  createBalustradeBarrier(-32, 5, Math.PI / 2, 8.0);
  createBalustradeBarrier(32, 5, Math.PI / 2, 8.0);

  // 2. Classical Stone Benches (0.65m height - slide over or crouch behind)
  function createBench(bx: number, bz: number, rotY = 0) {
    const bench = new THREE.Group();
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rotY;
    mapGroup.add(bench);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 1.0), matMarbleWhite);
    seat.position.set(0, 0.55, 0);
    seat.castShadow = true;
    markStatic(seat);
    bench.add(seat);

    [-1.4, 1.4].forEach(legX => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.55, 0.8), matStoneTrim);
      leg.position.set(legX, 0.275, 0);
      markStatic(leg);
      bench.add(leg);
    });

    addCollider(bx, 0.35, bz, 3.8, 0.7, 1.2);
  }

  createBench(-9, 5, Math.PI / 2);
  createBench(9, 5, Math.PI / 2);
  createBench(-9, -5, Math.PI / 2);
  createBench(9, -5, Math.PI / 2);

  // 3. Classical Planter Urns & Pedestals
  function createUrnPlinth(px: number, pz: number, isRed = false) {
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 1.6), matMarbleWhite);
    plinth.position.set(px, 0.6, pz);
    plinth.castShadow = true;
    markStatic(plinth);
    mapGroup.add(plinth);
    addCollider(px, 0.6, pz, 1.6, 1.2, 1.6);

    const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.45, 1.1, 10), matGoldTrim);
    urn.position.set(px, 1.75, pz);
    markStatic(urn);
    mapGroup.add(urn);

    // Heraldic Team Crest Trim on Plinth
    const crestMat = new THREE.MeshStandardMaterial({
      color: isRed ? 0xcc2233 : 0x0088dd,
      roughness: 0.4,
      metalness: 0.6
    });
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.05), crestMat);
    crest.position.set(px, 0.6, pz + 0.82);
    markStatic(crest);
    mapGroup.add(crest);
  }

  createUrnPlinth(-6, -28, true);
  createUrnPlinth(6, -28, true);
  createUrnPlinth(-6, 38, false);
  createUrnPlinth(6, 38, false);

  // ── VIA DELLA CONCILIAZIONE (Avenue Entrance) ──
  const avenueRoad = new THREE.Mesh(new THREE.BoxGeometry(32, 0.2, 80), matPiazza);
  avenueRoad.position.set(0, 0.05, 80);
  avenueRoad.receiveShadow = true;
  markStatic(avenueRoad);
  mapGroup.add(avenueRoad);
  addCollider(0, 0.05, 80, 32, 0.2, 80);

  // Flanking Italian Classical Street Buildings with detailed facades
  [-26, 26].forEach(bx => {
    const bldg = new THREE.Mesh(new THREE.BoxGeometry(18, 22, 80), matFacade);
    bldg.position.set(bx, 11, 80);
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    markStatic(bldg);
    mapGroup.add(bldg);
    addCollider(bx, 11, 80, 18, 22, 80);
  });

  return {
    update: (_delta: number, elapsed: number) => {
      // Dynamic fountain water animation
      const breath = 0.35 + Math.sin(elapsed * 2.8) * 0.15;
      matWater.emissiveIntensity = breath;
      fountainWaters.forEach((mesh, idx) => {
        mesh.rotation.y = elapsed * 0.2 * (idx === 0 ? 1 : -1);
      });
    }
  };
}
