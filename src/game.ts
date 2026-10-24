import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import Peer from 'peerjs';
import {
  buildPeerConfig,
  getActiveIceServers,
  SIGNALING_BROKERS,
  getSelectedBrokerId,
  setSelectedBrokerId,
  getCustomTurnSettings,
  setCustomTurnSettings,
  testWebRtcConnectivity,
  DiagResult
} from './networkConfig';
import {
  buildUpgradedCityMap,
  buildSolarCitadelMap,
  buildDeadshotArenaMap,
  buildNuketownMap,
  buildOsakaMap,
  buildVaticanMap,
  buildHormuzMap,
  buildEIslandMap,
  buildNeoTokyoMap,
  isMapAnimationsActive,
  setMapAnimationsActive,
  initKTX2Support,
  UpgradedMapResult,
  Collider
} from './map/index';
import {
  buildTacticalArms,
  buildPulseAssaultRifle,
  buildVectorSMG,
  buildCyberShotgun,
  buildApexRailSniper
} from './models/weaponModels';
import { createOperativePlayerMesh } from './models/playerModel';
import {
  initSoundEngine,
  playPulseAR,
  playVectorSMG,
  playShotgun,
  playRailSniper,
  playHitmarker,
  playHeadshotDing,
  playMultiKillSting,
  playSlideDash,
  playJump,
  playReloadStart,
  playReloadFinish,
  playDamageTaken,
  playKillConfirmed,
  playMatchStart,
  playVictory,
  playDefeat,
  playFootstep,
  playWallRicochet,
  playRemoteGunshot
} from './audio/soundEffects';
import { botManager, BotOperative, BotDifficulty, checkLineOfSight } from './bots/botManager';
import { calculatePelletDirection, WeaponSpringDynamics } from './weapons/weaponFeel';
import { killFeedback } from './ui/killFeedback';

window.addEventListener('contextmenu', e => e.preventDefault());

// ================= Scene & Optimized Renderer Setup =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e111d);
scene.fog = new THREE.FogExp2(0x0e111d, 0.009);

const DEFAULT_FOV = 75;
const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.rotation.order = 'YXZ';
camera.position.set(-46, 2.0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
document.body.appendChild(renderer.domElement);
initKTX2Support(renderer);

// Dynamic Lighting & Environment
const ambient = new THREE.AmbientLight(0x75809c, 1.6);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x90b4ea, 0x1c1e28, 1.4);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xd8e4ff, 2.4);
moon.position.set(90, 140, 60);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -75;
moon.shadow.camera.right = 75;
moon.shadow.camera.top = 75;
moon.shadow.camera.bottom = -75;
scene.add(moon);

// Group for dynamic neon night lights (can be hidden on low-end or daylight map)
const neonLightsGroup = new THREE.Group();
scene.add(neonLightsGroup);

function addNeonPoint(color: number, x: number, y: number, z: number, intensity: number, dist: number) {
  const light = new THREE.PointLight(color, intensity, dist);
  light.position.set(x, y, z);
  neonLightsGroup.add(light);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color }));
  bulb.position.copy(light.position);
  neonLightsGroup.add(bulb);
  return light;
}

addNeonPoint(0xff3355, -42, 10, -15, 5.0, 50);
addNeonPoint(0x00e5ff, 42, 10, 15, 5.0, 50);
addNeonPoint(0xff2bd6, 0, 12, 0, 5.5, 55);

// ================= Dynamic Multi-Map System Types & State =================
export type MapId =
  | 'DEADSHOT_ARENA'
  | 'NUKETOWN'
  | 'OSAKA'
  | 'VATICAN'
  | 'HORMUZ'
  | 'E_ISLAND'
  | 'SOLAR_CITADEL'
  | 'NEO_TOKYO'
  | 'SECTOR_07';

export interface MapMeta {
  id: MapId;
  name: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  desc: string;
  accentColor: string;
}

export const MAP_REGISTRY: MapMeta[] = [
  {
    id: 'DEADSHOT_ARENA',
    name: 'NEIGHBORHOOD',
    subtitle: 'MODULAR CITY',
    tag: 'URBAN COMBAT',
    tagColor: '#38bdf8',
    desc: 'Low-poly modular city neighborhood with streets, apartments, barricades, and tactical cover.',
    accentColor: '#38bdf8'
  },
  {
    id: 'NUKETOWN',
    name: 'NUKETOWN 2025',
    subtitle: 'NEVADA SUBURB',
    tag: 'CLOSE QUARTERS',
    tagColor: '#ffaa00',
    desc: 'Iconic cul-de-sac with Teal/Yellow homes, school bus, and moving van.',
    accentColor: '#ffaa00'
  },
  {
    id: 'OSAKA',
    name: 'OSAKA DOTONBORI',
    subtitle: 'NEON CANAL',
    tag: 'VERTICAL URBAN',
    tagColor: '#ff2bd6',
    desc: 'Dusk canal district with bridges, Glico runner, Torii gate, and izakaya alleys.',
    accentColor: '#ff2bd6'
  },
  {
    id: 'VATICAN',
    name: 'PIAZZA SAN PIETRO',
    subtitle: 'VATICAN BASILICA',
    tag: 'LONG SIGHTLINES',
    tagColor: '#e0d4c0',
    desc: 'Monumental classical square with Bernini colonnades, obelisk, and papal balcony.',
    accentColor: '#e0d4c0'
  },
  {
    id: 'HORMUZ',
    name: 'STRAIT OF HORMUZ',
    subtitle: 'NAVAL BASTION',
    tag: 'MARITIME STRAIT',
    tagColor: '#1a88bb',
    desc: 'High coastal cliffs overlooking naval strait, fortress battlements, and cruising vessel.',
    accentColor: '#1a88bb'
  },
  {
    id: 'E_ISLAND',
    name: 'E-ISLAND COMPOUND',
    subtitle: 'TROPICAL ESTATE',
    tag: 'COMPOUND ASSAULT',
    tagColor: '#39ff14',
    desc: 'Private tropical atoll with grand mansion, helipad, runway, and luxury yachts.',
    accentColor: '#39ff14'
  },
  {
    id: 'SOLAR_CITADEL',
    name: 'SOLAR CITADEL',
    subtitle: 'MEDITERRANEAN',
    tag: 'DAYTIME SIEGE',
    tagColor: '#ffd700',
    desc: 'High-noon sandstone sanctuary with photovoltaic arrays and open courtyards.',
    accentColor: '#ffd700'
  },
  {
    id: 'NEO_TOKYO',
    name: 'NEO TOKYO',
    subtitle: 'THE LITTLEST TOKYO',
    tag: 'TACTICAL CQB',
    tagColor: '#06b6d4',
    desc: 'Dense multi-level Japanese cyberpunk district with elevated railway loop, tight alleyways, illuminated storefronts, and intense CQB gunfights.',
    accentColor: '#06b6d4'
  }
];

let currentMapId: MapId = 'DEADSHOT_ARENA';
const activeMapGroup = new THREE.Group();
scene.add(activeMapGroup);
let activeMapResult: UpgradedMapResult | null = null;

// ================= Low-End Hardware & Graphics Scaler =================
export type GfxQuality = 'LOW' | 'BALANCED' | 'HIGH';
const storedGfx = (localStorage.getItem('cyberdistrict_gfx') as GfxQuality) || 'BALANCED';
let currentGfx: GfxQuality = storedGfx;

function applyGraphicsQuality(quality: GfxQuality) {
  currentGfx = quality;
  try {
    localStorage.setItem('cyberdistrict_gfx', quality);
  } catch (_) {}

  const isDaylight = currentMapId !== 'OSAKA' && currentMapId !== 'SECTOR_07' && currentMapId !== 'NEO_TOKYO';

  if (quality === 'LOW') {
    // High-performance optimization for low-end devices:
    // Render at 0.82 DPR (greatly lowers fill-rate overhead), turn off shadow cascades and secondary neon point lights
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 0.82));
    renderer.shadowMap.enabled = false;
    moon.castShadow = false;
    neonLightsGroup.visible = false;
    if (activeMapResult?.clutterGroup) {
      activeMapResult.clutterGroup.visible = false;
    }
    ambient.intensity = isDaylight ? 1.35 : 2.4;
    hemi.intensity = isDaylight ? 0.9 : 1.8;
  } else if (quality === 'BALANCED') {
    // 60FPS balanced: 1024 PCF shadows, capped 1.15 DPR
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.15));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    neonLightsGroup.visible = !isDaylight;
    if (activeMapResult?.clutterGroup) {
      activeMapResult.clutterGroup.visible = true;
    }
    ambient.intensity = isDaylight ? 1.1 : 1.6;
    hemi.intensity = isDaylight ? 0.8 : 1.4;
  } else {
    // High: PCFSoftShadowMap, higher map size, 1.5 DPR
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    moon.castShadow = true;
    moon.shadow.mapSize.set(1536, 1536);
    neonLightsGroup.visible = !isDaylight;
    if (activeMapResult?.clutterGroup) {
      activeMapResult.clutterGroup.visible = true;
    }
    ambient.intensity = isDaylight ? 1.1 : 1.6;
    hemi.intensity = isDaylight ? 0.8 : 1.4;
  }
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Synchronize UI labels & selectors
  const gfxSelectEl = document.getElementById('gfxSelect') as HTMLSelectElement | null;
  if (gfxSelectEl && gfxSelectEl.value !== quality) gfxSelectEl.value = quality;
  const hudGfxLabel = document.getElementById('hudGfxLabel');
  if (hudGfxLabel) hudGfxLabel.textContent = quality === 'LOW' ? 'LOW (FAST)' : quality;
  const respawnGfxLabel = document.getElementById('respawnGfxLabel');
  if (respawnGfxLabel) respawnGfxLabel.textContent = quality === 'LOW' ? 'LOW (FAST)' : quality;
  const gfxHudLabelEl = document.getElementById('gfxHudLabel');
  if (gfxHudLabelEl) gfxHudLabelEl.textContent = quality === 'BALANCED' ? '60FPS' : quality;
  const gfxTouchBtnEl = document.getElementById('gfxTouchBtn');
  if (gfxTouchBtnEl) gfxTouchBtnEl.textContent = `⚡${quality === 'BALANCED' ? '60' : quality.slice(0, 3)}`;
}
applyGraphicsQuality(storedGfx);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  applyGraphicsQuality(currentGfx);
});

// ================= Arena Architecture & Terrain =================
const HALF_W = 54;
const HALF_D = 44;
const colliders: Collider[] = [];

// ================= Collision Debug Wireframe Visualizer =================
let showCollisionWireframes = false;
const collisionDebugGroup = new THREE.Group();
collisionDebugGroup.name = 'Collision_Debug_Wireframes';
scene.add(collisionDebugGroup);

function updateCollisionDebugVisuals() {
  while (collisionDebugGroup.children.length > 0) {
    const obj = collisionDebugGroup.children[0];
    if ((obj as any).geometry) (obj as any).geometry.dispose();
    if ((obj as any).material) (obj as any).material.dispose();
    collisionDebugGroup.remove(obj);
  }

  if (!showCollisionWireframes) return;

  for (const c of colliders) {
    if (c.isCylinder && c.centerX !== undefined && c.centerZ !== undefined && c.radius !== undefined) {
      const cyHeight = c.top - Math.max(0, c.bottom);
      const cyCenterY = Math.max(0, c.bottom) + cyHeight / 2;
      const cylGeo = new THREE.CylinderGeometry(c.radius, c.radius, cyHeight, 16);
      const wireGeo = new THREE.WireframeGeometry(cylGeo);
      const line = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0x22c55e }));
      line.position.set(c.centerX, cyCenterY, c.centerZ);
      collisionDebugGroup.add(line);
    } else {
      const box = new THREE.Box3(
        new THREE.Vector3(c.minX, Math.max(0, c.bottom), c.minZ),
        new THREE.Vector3(c.maxX, c.top, c.maxZ)
      );
      const helper = new THREE.Box3Helper(box, new THREE.Color(0x22c55e));
      collisionDebugGroup.add(helper);
    }
  }
}

function toggleCollisionDebug(force?: boolean) {
  showCollisionWireframes = force !== undefined ? force : !showCollisionWireframes;
  updateCollisionDebugVisuals();
  const toggleBtn = document.getElementById('debugCollisionToggle');
  if (toggleBtn) {
    toggleBtn.textContent = showCollisionWireframes ? 'WIREFRAMES: ON [F9]' : 'WIREFRAMES: OFF [F9]';
    toggleBtn.style.color = showCollisionWireframes ? '#22c55e' : '#94a3b8';
    toggleBtn.style.borderColor = showCollisionWireframes ? '#22c55e' : '#475569';
  }
  showAudioToast(`🟩 COLLISION WIREFRAMES: ${showCollisionWireframes ? 'ON' : 'OFF'}`);
}

function heightAt(x: number, z: number): number {
  if (currentMapId !== 'SOLAR_CITADEL') {
    return 0.0;
  }
  const u = (x + HALF_W) / (HALF_W * 2);
  const v = (z + HALF_D) / (HALF_D * 2);

  const yNW = 0.0, ySW = -2.5, yNE = 2.0, ySE = 3.0;
  const topY = THREE.MathUtils.lerp(yNW, yNE, u);
  const botY = THREE.MathUtils.lerp(ySW, ySE, u);
  const baseH = THREE.MathUtils.lerp(topY, botY, v);

  const wave = Math.sin(x * 0.08) * 0.45 + Math.cos(z * 0.08) * 0.45;
  return baseH + wave;
}

// ================= Team Spawn Points & Dynamic Map Spawns =================
const MAP_SPAWNS: Record<MapId, { red: { x: number; z: number }[]; blue: { x: number; z: number }[] }> = {
  DEADSHOT_ARENA: {
    red: [{ x: -38, z: 0 }, { x: -38, z: -6 }, { x: -38, z: 6 }, { x: -40, z: -2 }, { x: -40, z: 2 }],
    blue: [{ x: 36, z: 0 }, { x: 36, z: -5 }, { x: 36, z: 5 }, { x: 38, z: -2 }, { x: 38, z: 2 }]
  },
  NUKETOWN: {
    red: [{ x: -38, z: -18 }, { x: -42, z: -16 }, { x: -34, z: -20 }, { x: -38, z: -12 }],
    blue: [{ x: 38, z: -18 }, { x: 42, z: -16 }, { x: 34, z: -20 }, { x: 38, z: -12 }]
  },
  OSAKA: {
    red: [{ x: -20, z: -22 }, { x: 0, z: -22 }, { x: 20, z: -22 }, { x: -10, z: -26 }],
    blue: [{ x: -20, z: 22 }, { x: 0, z: 22 }, { x: 20, z: 22 }, { x: 10, z: 26 }]
  },
  VATICAN: {
    red: [{ x: -10, z: -42 }, { x: 0, z: -42 }, { x: 10, z: -42 }, { x: 0, z: -48 }],
    blue: [{ x: -15, z: 45 }, { x: 0, z: 45 }, { x: 15, z: 45 }, { x: 0, z: 52 }]
  },
  HORMUZ: {
    red: [{ x: -12, z: -50 }, { x: 0, z: -50 }, { x: 12, z: -50 }, { x: -6, z: -56 }],
    blue: [{ x: -12, z: 50 }, { x: 0, z: 50 }, { x: 12, z: 50 }, { x: 6, z: 56 }]
  },
  E_ISLAND: {
    red: [{ x: -12, z: -18 }, { x: 0, z: -18 }, { x: 12, z: -18 }, { x: 0, z: -26 }],
    blue: [{ x: -6, z: 32 }, { x: 0, z: 32 }, { x: 6, z: 32 }, { x: 0, z: 38 }]
  },
  SOLAR_CITADEL: {
    red: [{ x: -46, z: 0 }, { x: -46, z: -6 }, { x: -46, z: 6 }, { x: -42, z: 2 }],
    blue: [{ x: 46, z: 0 }, { x: 46, z: -6 }, { x: 46, z: 6 }, { x: 42, z: -2 }]
  },
  NEO_TOKYO: {
    red: [{ x: -26, z: 0 }, { x: -26, z: -5 }, { x: -26, z: 5 }, { x: -22, z: 2 }],
    blue: [{ x: 26, z: 0 }, { x: 26, z: -5 }, { x: 26, z: 5 }, { x: 22, z: -2 }]
  },
  SECTOR_07: {
    red: [{ x: -26, z: 0 }, { x: -26, z: -5 }, { x: -26, z: 5 }, { x: -22, z: 2 }],
    blue: [{ x: 26, z: 0 }, { x: 26, z: -5 }, { x: 26, z: 5 }, { x: 22, z: -2 }]
  }
};

const RED_SPAWNS: { x: number; z: number }[] = [...MAP_SPAWNS.DEADSHOT_ARENA.red];
const BLUE_SPAWNS: { x: number; z: number }[] = [...MAP_SPAWNS.DEADSHOT_ARENA.blue];

function updateTeamSpawnsForMap(mapId: MapId) {
  const spawns = MAP_SPAWNS[mapId] || MAP_SPAWNS.DEADSHOT_ARENA;
  RED_SPAWNS.length = 0;
  RED_SPAWNS.push(...spawns.red);
  BLUE_SPAWNS.length = 0;
  BLUE_SPAWNS.push(...spawns.blue);
}

function updateDeployRightCards() {
  const mapMeta = MAP_REGISTRY.find(m => m.id === currentMapId) || MAP_REGISTRY[0];
  const nameEl = document.getElementById('deployMapPreviewTitle');
  const subEl = document.getElementById('deployMapPreviewSub');
  const tagEl = document.getElementById('deployMapPreviewTag');
  const descEl = document.getElementById('deployMapPreviewDesc');
  const bannerEl = document.getElementById('deployMapPreviewBanner');
  if (nameEl) nameEl.textContent = mapMeta.name;
  if (subEl) subEl.textContent = mapMeta.subtitle;
  if (tagEl) {
    tagEl.textContent = mapMeta.tag;
    tagEl.style.color = mapMeta.tagColor;
    tagEl.style.borderColor = `${mapMeta.tagColor}66`;
    tagEl.style.backgroundColor = `${mapMeta.tagColor}22`;
  }
  if (descEl) descEl.textContent = mapMeta.desc;
  if (bannerEl) {
    bannerEl.style.borderLeftColor = mapMeta.accentColor || '#38bdf8';
  }
}

function updateDeployWeaponPreview(weaponIdx: number) {
  const weapons = [
    { name: 'PULSE AR', type: 'BALANCED ASSAULT', stats: 'DMG: 24 • 30 RNDS • AUTO' },
    { name: 'VECTOR SMG', type: 'CQB SLIDE-HOP', stats: 'DMG: 14 • 40 RNDS • FAST ROF' },
    { name: 'PUMP SHOTGUN', type: '12-GAUGE SPREAD', stats: 'DMG: 16x8 • 8 RNDS • CLOSE' },
    { name: 'RAIL SNIPER', type: 'PRECISION SCOPE', stats: 'DMG: 85 • 5 RNDS • MIL-DOT' }
  ];
  const w = weapons[weaponIdx] || weapons[0];
  const nameEl = document.getElementById('deployWeaponPreviewName');
  const statsEl = document.getElementById('deployWeaponPreviewStats');
  if (nameEl) nameEl.textContent = w.name;
  if (statsEl) statsEl.textContent = `${w.type} • ${w.stats}`;
}

export function switchLobbyTab(tab: 'deploy' | 'maps' | 'loadout' | 'settings') {
  const tabs = ['deploy', 'maps', 'loadout', 'settings'] as const;
  tabs.forEach(t => {
    const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
    const btn = document.getElementById(`tabBtn${capitalized}`);
    const page = document.getElementById(`page${capitalized}`);
    if (btn) btn.classList.toggle('active', t === tab);
    if (page) page.classList.toggle('active', t === tab);
  });
}

function syncMapCardSelection(mapId: MapId) {
  const mapSelectEl = document.getElementById('mapSelect') as HTMLSelectElement | null;
  if (mapSelectEl && mapSelectEl.value !== mapId) {
    mapSelectEl.value = mapId;
  }
  document.querySelectorAll('.map-card').forEach(el => {
    const cardMapId = el.getAttribute('data-mapid');
    el.classList.toggle('selected', cardMapId === mapId);
  });
  updateDeployRightCards();
}

function renderMapCardGrids() {
  const lobbyGrid = document.getElementById('lobbyMapGrid');
  const pauseGrid = document.getElementById('pauseMapGrid');
  if (!lobbyGrid && !pauseGrid) return;

  const html = MAP_REGISTRY.map(m => `
    <div class="map-card ${m.id === currentMapId ? 'selected' : ''}" data-mapid="${m.id}">
      <span class="map-card-check">✓</span>
      <span class="map-card-badge" style="background: ${m.tagColor}22; color: ${m.tagColor}; border: 1px solid ${m.tagColor}66;">${m.tag}</span>
      <div class="map-card-title">${m.name}</div>
      <div class="map-card-subtitle">${m.subtitle}</div>
      <div class="map-card-desc">${m.desc}</div>
    </div>
  `).join('');

  if (lobbyGrid) {
    lobbyGrid.innerHTML = html;
    lobbyGrid.querySelectorAll('.map-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-mapid') as MapId;
        if (id) {
          loadMap(id);
          if (networkManager && networkManager.isHost) {
            networkManager.broadcastLobbyState();
          }
          // Update cards and return to deploy smoothly
          updateDeployRightCards();
        }
      });
    });
  }

  if (pauseGrid) {
    pauseGrid.innerHTML = html;
    pauseGrid.querySelectorAll('.map-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-mapid') as MapId;
        if (id) {
          loadMap(id);
          if (networkManager && networkManager.isHost) {
            networkManager.broadcastLobbyState();
          }
          showAudioToast(`🗺️ MAP SWITCHED: ${MAP_REGISTRY.find(m => m.id === id)?.name}`);
        }
      });
    });
  }
}

let isMatchActive = false;
let isSoloMode = false;

// ================= Map Loading Overlay Control =================
function showMapLoadingScreen(mapId: MapId) {
  // Never show loading screen on launch or in menus to ensure clean instant startup
  if (!isMatchActive) return;
  const overlay = document.getElementById('mapLoadingOverlay');
  const nameEl = document.getElementById('mapLoadingName');
  const subEl = document.getElementById('mapLoadingSubtitle');
  if (overlay) {
    const meta = MAP_REGISTRY.find((m) => m.id === mapId);
    if (nameEl) nameEl.textContent = meta ? meta.name : mapId;
    if (subEl) subEl.textContent = meta ? `${meta.subtitle} // ${meta.tag}` : 'TACTICAL DEPLOYMENT';
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
  }
}

function hideMapLoadingScreen() {
  const overlay = document.getElementById('mapLoadingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.display = 'none';
  }
}

window.addEventListener('map-model-ready', () => {
  hideMapLoadingScreen();
  updateCollisionDebugVisuals();
});

// ================= Dynamic Multi-Map System =================
function loadMap(mapId: MapId) {
  currentMapId = mapId;
  if (isMatchActive) {
    showMapLoadingScreen(mapId);
  }

  // Clear previous map geometry
  while (activeMapGroup.children.length > 0) {
    const obj = activeMapGroup.children[0];
    activeMapGroup.remove(obj);
  }
  colliders.length = 0;

  updateTeamSpawnsForMap(mapId);

  if (mapId === 'DEADSHOT_ARENA') {
    // ☀️ NEIGHBORHOOD MODULAR CITY (CLEAN CRISP DAYLIGHT)
    scene.background = new THREE.Color(0x60a5fa);
    scene.fog = new THREE.FogExp2(0xdbeafe, 0.0018);
    moon.color.setHex(0xfffaed);
    moon.intensity = 2.2;
    moon.position.set(40, 150, 45);
    ambient.color.setHex(0xe0f2fe);
    ambient.intensity = currentGfx === 'LOW' ? 1.4 : 1.1;
    hemi.color.setHex(0x93c5fd);
    hemi.groundColor.setHex(0xa8a29e);
    hemi.intensity = 0.9;
    neonLightsGroup.visible = false;
    activeMapResult = buildDeadshotArenaMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D, () => {
      hideMapLoadingScreen();
    });
  } else if (mapId === 'NUKETOWN') {
    setTimeout(hideMapLoadingScreen, 300);

    // ☀️ NUKETOWN 2025 (NEVADA DESERT HIGH-NOON)
    scene.background = new THREE.Color(0x4da6ff);
    scene.fog = new THREE.FogExp2(0xedd5b3, 0.003);
    moon.color.setHex(0xfff3db);
    moon.intensity = 2.2;
    moon.position.set(30, 160, 50);
    ambient.color.setHex(0xf5e2c4);
    ambient.intensity = currentGfx === 'LOW' ? 1.3 : 1.0;
    hemi.color.setHex(0x6eb5ff);
    hemi.groundColor.setHex(0xc7ab82);
    hemi.intensity = 0.8;
    neonLightsGroup.visible = false;
    activeMapResult = buildNuketownMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D);
  } else if (mapId === 'OSAKA') {
    // 🌙 OSAKA DOTONBORI (DUSK NEON CANAL DISTRICT)
    scene.background = new THREE.Color(0x0a0c16);
    scene.fog = new THREE.FogExp2(0x121020, 0.0075);
    moon.color.setHex(0x9cb8f0);
    moon.intensity = 1.8;
    moon.position.set(60, 130, -40);
    ambient.color.setHex(0x4a4868);
    ambient.intensity = currentGfx === 'LOW' ? 1.8 : 1.3;
    hemi.color.setHex(0x605580);
    hemi.groundColor.setHex(0x181a24);
    hemi.intensity = 1.1;
    neonLightsGroup.visible = currentGfx !== 'LOW';
    activeMapResult = buildOsakaMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D);
  } else if (mapId === 'VATICAN') {
    // ☀️ PIAZZA SAN PIETRO (MEDITERRANEAN AZURE MORNING)
    scene.background = new THREE.Color(0x469ce8);
    scene.fog = new THREE.FogExp2(0xede4d4, 0.0024);
    moon.color.setHex(0xfff8e7);
    moon.intensity = 2.1;
    moon.position.set(-40, 150, 40);
    ambient.color.setHex(0xf0e6d6);
    ambient.intensity = currentGfx === 'LOW' ? 1.3 : 0.95;
    hemi.color.setHex(0x76b4f0);
    hemi.groundColor.setHex(0xd0c4b0);
    hemi.intensity = 0.75;
    neonLightsGroup.visible = false;
    activeMapResult = buildVaticanMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D);
  } else if (mapId === 'HORMUZ') {
    // ☀️ STRAIT OF HORMUZ (PERSIAN GULF SUNLIT NAVAL BASTION)
    scene.background = new THREE.Color(0x368ecf);
    scene.fog = new THREE.FogExp2(0xcde1ee, 0.0028);
    moon.color.setHex(0xfff2d4);
    moon.intensity = 2.2;
    moon.position.set(20, 160, 0);
    ambient.color.setHex(0xc8dfe8);
    ambient.intensity = currentGfx === 'LOW' ? 1.35 : 1.0;
    hemi.color.setHex(0x56a2e8);
    hemi.groundColor.setHex(0xa68862);
    hemi.intensity = 0.8;
    neonLightsGroup.visible = false;
    activeMapResult = buildHormuzMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D);
  } else if (mapId === 'E_ISLAND') {
    // ☀️ E-ISLAND COMPOUND (TROPICAL HIGH-NOON SUN)
    scene.background = new THREE.Color(0x3ea3f2);
    scene.fog = new THREE.FogExp2(0xd6effa, 0.0022);
    moon.color.setHex(0xfffaed);
    moon.intensity = 2.3;
    moon.position.set(30, 170, 30);
    ambient.color.setHex(0xd4eef8);
    ambient.intensity = currentGfx === 'LOW' ? 1.4 : 1.05;
    hemi.color.setHex(0x62baf5);
    hemi.groundColor.setHex(0x86b060);
    hemi.intensity = 0.85;
    neonLightsGroup.visible = false;
    activeMapResult = buildEIslandMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D);
  } else if (mapId === 'SOLAR_CITADEL') {
    // ☀️ WARM SUNLIT YELLOW CITADEL (DAYTIME)
    scene.background = new THREE.Color(0x3a92e6);
    scene.fog = new THREE.FogExp2(0xf0c765, 0.0032);
    moon.color.setHex(0xffdf6d);
    moon.intensity = 1.75;
    moon.position.set(50, 150, 30);
    ambient.color.setHex(0xfad875);
    ambient.intensity = currentGfx === 'LOW' ? 1.15 : 0.8;
    hemi.color.setHex(0x56a6fa);
    hemi.groundColor.setHex(0xd99b26);
    hemi.intensity = 0.65;
    neonLightsGroup.visible = false;
    activeMapResult = buildSolarCitadelMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D);
  } else {
    // 🌙 NEO TOKYO (CQB ARENA / THE LITTLEST TOKYO)
    scene.background = new THREE.Color(0x0a0c16);
    scene.fog = new THREE.FogExp2(0x0d111d, 0.007);
    moon.color.setHex(0xa5c9ff);
    moon.intensity = 2.2;
    moon.position.set(70, 140, 50);
    ambient.color.setHex(0x566584);
    ambient.intensity = currentGfx === 'LOW' ? 2.2 : 1.5;
    hemi.color.setHex(0x06b6d4);
    hemi.groundColor.setHex(0x181a26);
    hemi.intensity = 1.2;
    neonLightsGroup.visible = currentGfx !== 'LOW';
    activeMapResult = buildNeoTokyoMap(activeMapGroup as any, colliders, heightAt, HALF_W, HALF_D, () => {
      hideMapLoadingScreen();
    });
  }

  applyGraphicsQuality(currentGfx);
  syncMapCardSelection(mapId);

  // If in active match and map switched live, reposition alive players and bots
  if (isMatchActive) {
    spawnPlayerToTeamBase();
    if (isSoloMode) {
      initSoloBots();
    }
  }

  updateCollisionDebugVisuals();
}

renderMapCardGrids();
loadMap('DEADSHOT_ARENA');

// ================= Weapons & Loadouts =================
interface WeaponDef {
  key: string;
  name: string;
  damage: number;
  fireDelay: number;
  mag: number;
  reserve: number;
  reload: number;
  bulletSpeed: number;
  spread: number;
  pellets: number;
  life: number;
  color: number;
  fov: number;
  scopeType: 'NONE' | 'REDDOT' | 'SNIPER';
  recoilKick: number;
  recoilSide: number;
}

const WEAPONS: WeaponDef[] = [
  { key: 'AR',      name: 'ASSAULT RIFLE // PULSE', damage: 24, fireDelay: 0.12, mag: 30, reserve: 90,  reload: 1.6, bulletSpeed: 85, spread: 0.016, pellets: 1, life: 2.0, color: 0x333b4d, fov: 45, scopeType: 'REDDOT', recoilKick: 0.014, recoilSide: 0.008 },
  { key: 'SMG',     name: 'SMG // VECTOR-X',         damage: 14, fireDelay: 0.08, mag: 25, reserve: 100, reload: 1.3, bulletSpeed: 78, spread: 0.028, pellets: 1, life: 1.5, color: 0x223c58, fov: 50, scopeType: 'REDDOT', recoilKick: 0.010, recoilSide: 0.013 },
  { key: 'SHOTGUN', name: 'CYBER-SHOTGUN // SLAG',   damage: 16, fireDelay: 0.85, mag: 6,  reserve: 24,  reload: 2.2, bulletSpeed: 65, spread: 0.088, pellets: 9, life: 0.6, color: 0x543220, fov: 60, scopeType: 'NONE',   recoilKick: 0.045, recoilSide: 0.018 },
  { key: 'SNIPER',  name: 'RAIL-SNIPER // APEX',     damage: 101, fireDelay: 1.4,  mag: 5,  reserve: 15,  reload: 2.8, bulletSpeed: 135, spread: 0.001, pellets: 1, life: 3.0, color: 0x1e222a, fov: 24, scopeType: 'SNIPER', recoilKick: 0.065, recoilSide: 0.006 },
];

const weaponDynamics = new WeaponSpringDynamics();

let selectedLoadoutIndex = 0;
let currentWeaponIndex = 0;
const ammoState = WEAPONS.map(w => ({ mag: w.mag, reserve: w.reserve }));
let fireTimer = 0;
let reloading = false;
let reloadTimer = 0;
let isAiming = false;

const viewModelGroup = new THREE.Group();
camera.add(viewModelGroup);
scene.add(camera);

const tacticalArms = buildTacticalArms();
viewModelGroup.add(tacticalArms);

const gunGroup = new THREE.Group();
gunGroup.position.set(0.22, -0.28, -0.65);
viewModelGroup.add(gunGroup);

const NORMAL_GUN_POS = new THREE.Vector3(0.22, -0.28, -0.65);
const ADS_GUN_POS = new THREE.Vector3(0, -0.18, -0.45);

// Muzzle Flash & Weapon Shot Light Effect
const muzzleFlashGroup = new THREE.Group();
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffe880, transparent: true, opacity: 0.95, depthWrite: false });
const flashCoreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0, depthWrite: false });
const petalGeo = new THREE.PlaneGeometry(0.24, 0.24);
const petalMesh1 = new THREE.Mesh(petalGeo, flashMat);
const petalMesh2 = new THREE.Mesh(petalGeo, flashMat);
petalMesh2.rotation.z = Math.PI / 4;
const petalCore = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), flashCoreMat);
muzzleFlashGroup.add(petalMesh1, petalMesh2, petalCore);

const muzzlePointLight = new THREE.PointLight(0xffbe44, 4.0, 4.5);
muzzleFlashGroup.add(muzzlePointLight);
muzzleFlashGroup.visible = false;
let muzzleFlashTimeout: any = null;

function triggerMuzzleFlash(weapon: WeaponDef) {
  muzzleFlashGroup.visible = true;
  muzzleFlashGroup.rotation.z = Math.random() * Math.PI * 2;
  const s = weapon.key === 'SNIPER' ? 1.6 : (weapon.key === 'SHOTGUN' ? 1.4 : (weapon.key === 'SMG' ? 0.85 : 1.15));
  muzzleFlashGroup.scale.set(s, s, s);
  clearTimeout(muzzleFlashTimeout);
  muzzleFlashTimeout = setTimeout(() => {
    muzzleFlashGroup.visible = false;
  }, 42);
}

function buildGunMesh(weapon: WeaponDef) {
  gunGroup.clear();
  if (weapon.key === 'AR') {
    gunGroup.add(buildPulseAssaultRifle());
    muzzleFlashGroup.position.set(0, 0.02, -0.96);
  } else if (weapon.key === 'SMG') {
    gunGroup.add(buildVectorSMG());
    muzzleFlashGroup.position.set(0, 0.015, -0.80);
  } else if (weapon.key === 'SHOTGUN') {
    gunGroup.add(buildCyberShotgun());
    muzzleFlashGroup.position.set(0, 0.02, -0.88);
  } else if (weapon.key === 'SNIPER') {
    gunGroup.add(buildApexRailSniper());
    muzzleFlashGroup.position.set(0, 0.025, -1.18);
  }
  gunGroup.add(muzzleFlashGroup);
}

function currentWeapon(): WeaponDef { return WEAPONS[currentWeaponIndex]; }

const scopeOverlayEl = document.getElementById('scopeOverlay')!;
const crosshairEl = document.getElementById('crosshair')!;
const crosshairCenterEl = document.getElementById('crosshair-center')!;

function setAimState(aiming: boolean) {
  isAiming = aiming;
  const w = currentWeapon();
  scopeOverlayEl.className = '';
  
  if (isAiming) {
    crosshairEl.classList.add('ads-aim');
    if (w.scopeType === 'SNIPER') {
      scopeOverlayEl.className = 'scope-sniper active';
      scopeOverlayEl.innerHTML = `
        <div class="sniper-reticle">
          <div class="sniper-reticle-inner"></div>
          <div class="mil-dot mil-h1"></div>
          <div class="mil-dot mil-h2"></div>
          <div class="mil-dot mil-h3"></div>
          <div class="mil-dot mil-h4"></div>
          <div class="mil-dot mil-v1"></div>
          <div class="mil-dot mil-v2"></div>
          <div class="mil-dot mil-v3"></div>
          <div class="mil-dot mil-v4"></div>
        </div>
        <div class="sniper-telemetry">
          <span>RAIL APEX // MAG: 4x</span>
          <span>CAL: 12.7mm AP</span>
          <span>STABILIZER: ACTIVE</span>
        </div>
      `;
      crosshairEl.style.opacity = '0';
      crosshairCenterEl.style.opacity = '0';
      viewModelGroup.visible = false;
      controls.pointerSpeed = 0.38;
    } else if (w.scopeType === 'REDDOT') {
      scopeOverlayEl.className = 'scope-reddot active';
      scopeOverlayEl.innerHTML = '<div class="reddot-reticle"></div>';
      crosshairEl.style.opacity = '0';
      crosshairCenterEl.style.opacity = '0';
      viewModelGroup.visible = true;
      controls.pointerSpeed = 0.65;
    } else {
      crosshairEl.style.opacity = '0.35';
      crosshairCenterEl.style.opacity = '0.35';
      viewModelGroup.visible = true;
      controls.pointerSpeed = 0.75;
    }
  } else {
    crosshairEl.classList.remove('ads-aim');
    crosshairEl.style.opacity = '1';
    crosshairCenterEl.style.opacity = '1';
    viewModelGroup.visible = true;
    controls.pointerSpeed = 1.0;
  }
}

function applySelectedLoadout() {
  currentWeaponIndex = selectedLoadoutIndex;
  const w = currentWeapon();
  ammoState[currentWeaponIndex].mag = w.mag;
  ammoState[currentWeaponIndex].reserve = w.reserve;
  buildGunMesh(w);
  updateWeaponHud();
}

// ================= Game Stats & Telemetry =================
let myPlayerName = 'AGENT-' + Math.floor(Math.random() * 899 + 100);
let currentRoomCode = 'SECTOR-7';
let myTeam = 'RED';

// Intercept pointerlockerror DOM events in capture phase to prevent unhandled console errors in iframes
document.addEventListener('pointerlockerror', (e) => {
  e.stopImmediatePropagation();
}, true);

// PointerLockControls instance & safe lock helper
const controls = new PointerLockControls(camera, document.body);
controls.disconnect();
(controls as any)._onPointerlockError = () => {
  // Graceful fallback for sandboxed iframes or browsers without pointer lock support
};
(controls as any).connect(document.body);

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
if (isTouchDevice) document.body.classList.add('touch-device');

function safeLockPointer() {
  if (isTouchDevice || !isMatchActive || controls.isLocked) return;
  try {
    const promise = (document.body.requestPointerLock as any)?.();
    if (promise && typeof promise.catch === 'function') {
      promise.catch(() => {});
    }
  } catch (_err) {
    // Graceful fallback for sandboxed iframe
  }
}

let matchDuration = 600;
let timeRemaining = 600;
let gameMode = 'NORMAL';

let redScore = 0;
let blueScore = 0;
let personalKills = 0;
let personalDeaths = 0;

// Dash, Slide & Bunny-Hop System (Deadshot.io physics)
const SLIDE_DURATION = 0.85;
let isDashing = false;
let isSliding = false;
let dashTimeRemaining = 0;
let dashCooldownTimer = 0;
let jumpBufferTimer = 0;
let shiftPressed = false;
const dashDir = new THREE.Vector3();
const horizVelocity = new THREE.Vector3();
const NORMAL_EYE_HEIGHT = 1.7;
const DASH_EYE_HEIGHT = 0.92;
let currentEyeHeight = NORMAL_EYE_HEIGHT;
const BASE_SPEED = 9.2;
const SLIDE_IMPULSE_SPEED = 15.5;
const MAX_AIR_SPEED = 17.0;
const GRAVITY = -24;
const JUMP_SPEED = 9.8;

// Procedural weapon sway and inertia
let weaponSwayX = 0;
let weaponSwayY = 0;
let mouseMoveDeltaX = 0;
let mouseMoveDeltaY = 0;

const hudMyTeamEl = document.getElementById('hudMyTeam')!;
const redScoreEl = document.getElementById('redScore')!;
const blueScoreEl = document.getElementById('blueScore')!;
const timerBadgeEl = document.getElementById('timer-badge')!;
const hudModeNameEl = document.getElementById('hudModeName')!;
const hudKillsEl = document.getElementById('hudKills')!;
const hudDeathsEl = document.getElementById('hudDeaths')!;
const hudKDEl = document.getElementById('hudKD')!;
const voiceSpeakerTabsEl = document.getElementById('voiceSpeakerTabs');
const lobbyVoiceCards = document.getElementById('lobbyVoiceCards');
const lobbyMicMeterFill = document.getElementById('lobbyMicMeterFill');
const lobbyMicBtn = document.getElementById('lobbyMicBtn') as HTMLButtonElement | null;
const hostConfigBadge = document.getElementById('hostConfigBadge');
const gfxHudToggle = document.getElementById('gfxHudToggle');
const gfxHudLabel = document.getElementById('gfxHudLabel');
const gfxTouchBtn = document.getElementById('gfxTouchBtn');
const micHudToggle = document.getElementById('micHudToggle')!;
const micHudIcon = document.getElementById('micHudIcon')!;
const micHudLabel = document.getElementById('micHudLabel')!;
const micTouchBtn = document.getElementById('micTouchBtn')!;
const audioRouteHudToggle = document.getElementById('audioRouteHudToggle')!;
const audioRouteIcon = document.getElementById('audioRouteIcon')!;
const audioRouteLabel = document.getElementById('audioRouteLabel')!;
const audioRouteTouchBtn = document.getElementById('audioRouteTouchBtn')!;
const audioRouteSelect = document.getElementById('audioRouteSelect') as HTMLSelectElement | null;
const audioNotification = document.getElementById('audioNotification')!;
const dashBarEl = document.getElementById('dashBar')!;

const redTeamListEl = document.getElementById('redTeamList')!;
const blueTeamListEl = document.getElementById('blueTeamList')!;

const entryModal = document.getElementById('entryModal')!;
const lobbyModal = document.getElementById('lobbyModal')!;
const respawnModal = document.getElementById('respawnModal')!;
const endGameModal = document.getElementById('endGameModal')!;

const hostMissionBtn = document.getElementById('hostMissionBtn');
const joinMissionBtn = document.getElementById('joinMissionBtn');
const soloLobbyBtn = document.getElementById('soloLobbyBtn')!;
const randomRoomBtn = document.getElementById('randomRoomBtn');
const openNetDiagBtn = document.getElementById('openNetDiagBtn');
const closeNetDiagBtn = document.getElementById('closeNetDiagBtn');
const runNetTestBtn = document.getElementById('runNetTestBtn');
const netDiagModal = document.getElementById('netDiagModal');
const netDiagLog = document.getElementById('netDiagLog');
const diagBrokerSelect = document.getElementById('diagBrokerSelect') as HTMLSelectElement | null;
const diagBrokerStatusBadge = document.getElementById('diagBrokerStatusBadge');
const customTurnEnableCheck = document.getElementById('customTurnEnableCheck') as HTMLInputElement | null;
const customTurnFields = document.getElementById('customTurnFields');
const customTurnUrlInput = document.getElementById('customTurnUrlInput') as HTMLInputElement | null;
const customTurnUserInput = document.getElementById('customTurnUserInput') as HTMLInputElement | null;
const customTurnPassInput = document.getElementById('customTurnPassInput') as HTMLInputElement | null;
const saveCustomTurnBtn = document.getElementById('saveCustomTurnBtn');
const copyInviteLinkBtn = document.getElementById('copyInviteLinkBtn');
const lobbyNetDiagBtn = document.getElementById('lobbyNetDiagBtn');
const leaveLobbyBtn = document.getElementById('leaveLobbyBtn');
const lobbyNetStatusText = document.getElementById('lobbyNetStatusText');
const lobbyPingBadge = document.getElementById('lobbyPingBadge');
const hudPingBadge = document.getElementById('hudPingBadge');
const inviteNoticeBanner = document.getElementById('inviteNoticeBanner');
const inviteRoomDisplay = document.getElementById('inviteRoomDisplay');

const startMatchBtn = document.getElementById('startMatchBtn')!;
const returnLobbyBtn = document.getElementById('returnLobbyBtn')!;
const joinRedBtn = document.getElementById('joinRedBtn')!;
const joinBlueBtn = document.getElementById('joinBlueBtn')!;

const timeSelect = document.getElementById('timeSelect') as HTMLSelectElement;
const modeSelect = document.getElementById('modeSelect') as HTMLSelectElement;
const mapSelect = document.getElementById('mapSelect') as HTMLSelectElement | null;
const gfxSelect = document.getElementById('gfxSelect') as HTMLSelectElement | null;
const hostConfigRow = document.getElementById('hostConfigRow')!;
const soloBotConfigRow = document.getElementById('soloBotConfigRow');
const botCountSelect = document.getElementById('botCountSelect') as HTMLSelectElement | null;
const botDiffSelect = document.getElementById('botDiffSelect') as HTMLSelectElement | null;
let soloBotCount = 4;
let soloBotDifficulty: BotDifficulty = 'OPERATIVE';
const clientWaitMsg = document.getElementById('clientWaitMsg')!;
const lobbyRoomTitle = document.getElementById('lobbyRoomTitle')!;
const lobbyRoleTitle = document.getElementById('lobbyRoleTitle')!;

const killfeedEl = document.getElementById('killfeed')!;
const healthBarEl = document.getElementById('healthBar')!;
const healthNumEl = document.getElementById('healthNum');
const weaponNameEl = document.getElementById('weaponName')!;
const ammoMagEl = document.getElementById('ammoMag')!;
const ammoReserveEl = document.getElementById('ammoReserve')!;
const reloadMsgEl = document.getElementById('reloadMsg')!;
const slots = [
  document.getElementById('slot0')!,
  document.getElementById('slot1')!,
  document.getElementById('slot2')!,
  document.getElementById('slot3')!
];

// Clean Random Room Generator
function generateRandomRoomCode(): string {
  const codes = ['ALPHA', 'BRAVO', 'CYBER', 'DELTA', 'ECHO', 'FROST', 'GHOST', 'HYPER', 'IONIC', 'JADE', 'KRYPTO', 'LUNAR', 'NEO', 'OMEGA', 'PULSE', 'RAZOR', 'SOLAR', 'TITAN', 'VIPER', 'ZEUS'];
  const pick = codes[Math.floor(Math.random() * codes.length)];
  const num = Math.floor(10 + Math.random() * 90);
  return `${pick}-${num}`;
}

// Auto-fill and persistent call-sign
try {
  const savedName = localStorage.getItem('cyberfps_callsign');
  if (savedName) {
    const pNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    if (pNameInput) pNameInput.value = savedName;
    myPlayerName = savedName;
  }
} catch (e) {}

// Auto-fill from URL query param
const urlParams = new URLSearchParams(window.location.search);
const inviteRoom = urlParams.get('room') || urlParams.get('join');
const urlRole = urlParams.get('role');
const urlBroker = urlParams.get('broker');
if (urlBroker && SIGNALING_BROKERS[urlBroker]) {
  setSelectedBrokerId(urlBroker);
}

if (inviteRoom) {
  const roomInput = document.getElementById('roomCodeInput') as HTMLInputElement;
  const cleanCode = inviteRoom.toUpperCase().trim();
  if (roomInput) roomInput.value = cleanCode;
  if (inviteNoticeBanner) inviteNoticeBanner.style.display = 'block';
  if (inviteRoomDisplay) inviteRoomDisplay.textContent = cleanCode;
} else {
  // Pre-seed room input with a clean unique default code if empty
  const roomInput = document.getElementById('roomCodeInput') as HTMLInputElement;
  if (roomInput && !roomInput.value) {
    roomInput.value = generateRandomRoomCode();
  }
}

function updateScoreboard() {
  redScoreEl.textContent = String(redScore);
  blueScoreEl.textContent = String(blueScore);
  const mins = Math.floor(Math.max(0, timeRemaining) / 60);
  const secs = Math.floor(Math.max(0, timeRemaining) % 60);
  timerBadgeEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  hudKillsEl.textContent = String(personalKills);
  hudDeathsEl.textContent = String(personalDeaths);
  hudKDEl.textContent = (personalKills / Math.max(1, personalDeaths)).toFixed(2);
}

function updateWeaponHud() {
  const w = currentWeapon();
  const state = ammoState[currentWeaponIndex];
  weaponNameEl.textContent = w.name;
  ammoMagEl.textContent = gameMode === 'NOAMMO' ? '∞' : String(state.mag);
  ammoReserveEl.textContent = gameMode === 'NOAMMO' ? '∞' : String(state.reserve);
  slots.forEach((s, i) => s.classList.toggle('active', i === currentWeaponIndex));
}

function setupLoadoutPicker(containerId: string) {
  const cards = document.querySelectorAll<HTMLElement>(`#${containerId} .weapon-card`);
  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedLoadoutIndex = parseInt(card.dataset.widx || '0');
      currentWeaponIndex = selectedLoadoutIndex;
      applySelectedLoadout();
      updateDeployWeaponPreview(selectedLoadoutIndex);
      try {
        initSoundEngine();
        playReloadFinish();
      } catch (_) {}
    });
  });
}
setupLoadoutPicker('lobbyLoadoutPicker');
setupLoadoutPicker('respawnLoadoutPicker');
updateDeployWeaponPreview(selectedLoadoutIndex);
updateDeployRightCards();

// ================= Tab Navigation & Interaction Wiring =================
const tabBtnDeploy = document.getElementById('tabBtnDeploy');
const tabBtnMaps = document.getElementById('tabBtnMaps');
const tabBtnLoadout = document.getElementById('tabBtnLoadout');
const tabBtnSettings = document.getElementById('tabBtnSettings');

if (tabBtnDeploy) tabBtnDeploy.addEventListener('click', () => switchLobbyTab('deploy'));
if (tabBtnMaps) tabBtnMaps.addEventListener('click', () => switchLobbyTab('maps'));
if (tabBtnLoadout) tabBtnLoadout.addEventListener('click', () => switchLobbyTab('loadout'));
if (tabBtnSettings) tabBtnSettings.addEventListener('click', () => switchLobbyTab('settings'));

const quickChangeMapBtn = document.getElementById('quickChangeMapBtn');
if (quickChangeMapBtn) quickChangeMapBtn.addEventListener('click', () => switchLobbyTab('maps'));

const quickChangeWeaponBtn = document.getElementById('quickChangeWeaponBtn');
if (quickChangeWeaponBtn) quickChangeWeaponBtn.addEventListener('click', () => switchLobbyTab('loadout'));

const backToDeployBtn1 = document.getElementById('backToDeployBtn1');
if (backToDeployBtn1) backToDeployBtn1.addEventListener('click', () => switchLobbyTab('deploy'));
const backToDeployBtn2 = document.getElementById('backToDeployBtn2');
if (backToDeployBtn2) backToDeployBtn2.addEventListener('click', () => switchLobbyTab('deploy'));
const backToDeployBtn3 = document.getElementById('backToDeployBtn3');
if (backToDeployBtn3) backToDeployBtn3.addEventListener('click', () => switchLobbyTab('deploy'));

// Mouse Look Sensitivity Control
let mouseSensitivity = 1.0;
try {
  const savedSens = localStorage.getItem('cyberfps_sensitivity');
  if (savedSens) mouseSensitivity = parseFloat(savedSens) || 1.0;
} catch (e) {}

const mouseSensSlider = document.getElementById('mouseSensSlider') as HTMLInputElement | null;
const mouseSensVal = document.getElementById('mouseSensVal');
if (mouseSensSlider) {
  mouseSensSlider.value = mouseSensitivity.toString();
  if (mouseSensVal) mouseSensVal.textContent = `${mouseSensitivity.toFixed(1)}x`;
  (controls as any).pointerSpeed = mouseSensitivity;
  mouseSensSlider.addEventListener('input', () => {
    mouseSensitivity = parseFloat(mouseSensSlider.value) || 1.0;
    if (mouseSensVal) mouseSensVal.textContent = `${mouseSensitivity.toFixed(1)}x`;
    (controls as any).pointerSpeed = mouseSensitivity;
    try { localStorage.setItem('cyberfps_sensitivity', mouseSensitivity.toString()); } catch (e) {}
  });
}

function triggerSlideDash() {
  if (!isMatchActive || health <= 0 || !isGrounded || dashCooldownTimer > 0 || isDashing) return;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

  const forwardInput = ((move.forward ? 1 : 0) - (move.back ? 1 : 0)) + joystickVector.y;
  const rightInput = ((move.right ? 1 : 0) - (move.left ? 1 : 0)) + joystickVector.x;

  dashDir.set(0, 0, 0);
  dashDir.addScaledVector(forward, forwardInput !== 0 ? forwardInput : 1);
  dashDir.addScaledVector(right, rightInput);
  if (dashDir.lengthSq() === 0) dashDir.copy(forward);
  dashDir.normalize();

  isDashing = true;
  isSliding = true;
  dashTimeRemaining = SLIDE_DURATION;

  // Impart slide impulse and preserve any higher existing momentum
  const currentSpeed = horizVelocity.length();
  const slideSpeed = Math.max(currentSpeed * 1.12, SLIDE_IMPULSE_SPEED);
  horizVelocity.copy(dashDir).multiplyScalar(slideSpeed);

  playSlideDash();
  if (isAiming) setAimState(false);
}

// ================= Proximity Voice Chat & Audio Routing =================
type AudioOutputMode = 'SPEAKER' | 'EARPIECE';
let currentAudioOutputMode: AudioOutputMode =
  (localStorage.getItem('cyberdistrict_audio_output') as AudioOutputMode) || 'SPEAKER';
let selectedAudioOutputDeviceId: string =
  localStorage.getItem('cyberdistrict_audio_sink_id') || '';

let audioNotificationTimer: number | null = null;
function showAudioToast(msg: string) {
  if (!audioNotification) return;
  audioNotification.textContent = msg;
  audioNotification.classList.add('show');
  if (audioNotificationTimer) clearTimeout(audioNotificationTimer);
  audioNotificationTimer = window.setTimeout(() => {
    audioNotification.classList.remove('show');
  }, 2400);
}

function updateAudioRouteUI() {
  const isSpeaker = currentAudioOutputMode === 'SPEAKER';
  if (audioRouteHudToggle) {
    audioRouteHudToggle.classList.toggle('earpiece', !isSpeaker);
  }
  if (audioRouteIcon) {
    audioRouteIcon.textContent = isSpeaker ? '🔊' : '📱';
  }
  if (audioRouteLabel) {
    audioRouteLabel.textContent = isSpeaker ? 'SPEAKER' : 'EARPIECE';
  }
  if (audioRouteTouchBtn) {
    audioRouteTouchBtn.classList.toggle('earpiece', !isSpeaker);
    audioRouteTouchBtn.textContent = isSpeaker ? '🔊' : '📱';
  }
  if (audioRouteSelect) {
    audioRouteSelect.value = currentAudioOutputMode;
  }
}

async function applyAudioOutputRouting(mode: AudioOutputMode, explicitDeviceId?: string, notify = false) {
  currentAudioOutputMode = mode;
  localStorage.setItem('cyberdistrict_audio_output', mode);
  if (explicitDeviceId !== undefined) {
    selectedAudioOutputDeviceId = explicitDeviceId;
    localStorage.setItem('cyberdistrict_audio_sink_id', explicitDeviceId);
  }

  let targetSinkId = selectedAudioOutputDeviceId;

  // Search enumerated audiooutput devices if no explicit sink ID has been chosen
  if (!targetSinkId && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
      if (mode === 'SPEAKER') {
        const speakerDev = audioOutputs.find(d => {
          const l = d.label.toLowerCase();
          return l.includes('speaker') || l.includes('loudspeaker') || l.includes('haut-parleur') || l.includes('altavoz') || l.includes('built-in');
        });
        if (speakerDev) targetSinkId = speakerDev.deviceId;
      } else {
        const earDev = audioOutputs.find(d => {
          const l = d.label.toLowerCase();
          return l.includes('earpiece') || l.includes('receiver') || l.includes('headset') || l.includes('headphone') || l.includes('casque');
        });
        if (earDev) targetSinkId = earDev.deviceId;
      }
    } catch (e) {}
  }

  // 1. AudioContext output routing (Voice & Procedural SFX)
  if (voiceAudioCtx && 'setSinkId' in voiceAudioCtx) {
    try {
      await (voiceAudioCtx as any).setSinkId(targetSinkId || '');
    } catch (e) {}
  }

  // 2. Set sink on remote voices & update speaker gain multiplier
  remoteVoices.forEach((v) => {
    if (v.hiddenAudio && 'setSinkId' in v.hiddenAudio) {
      (v.hiddenAudio as any).setSinkId(targetSinkId || '').catch(() => {});
    }
    if (v.gain) {
      v.gain.gain.value = currentAudioOutputMode === 'SPEAKER' ? 2.4 : 1.0;
    }
  });

  // 3. Dynamic mobile track constraints (switching phone out of telephony earpiece mode into speaker mode)
  if (localVoiceStream) {
    const track = localVoiceStream.getAudioTracks()[0];
    if (track && track.applyConstraints) {
      const isMobile = isTouchDevice || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      try {
        await track.applyConstraints({
          echoCancellation: mode === 'EARPIECE' || !isMobile,
          noiseSuppression: true,
          autoGainControl: true
        });
      } catch (e) {}
    }
  }

  updateAudioRouteUI();

  if (notify) {
    showAudioToast(
      mode === 'SPEAKER'
        ? '🔊 AUDIO OUTPUT: LOUDSPEAKER'
        : '📱 AUDIO OUTPUT: EARPIECE'
    );
  }
}

function toggleAudioOutputMode() {
  const nextMode: AudioOutputMode = currentAudioOutputMode === 'SPEAKER' ? 'EARPIECE' : 'SPEAKER';
  applyAudioOutputRouting(nextMode, undefined, true);
}

async function promptSelectAudioOutput() {
  if (navigator.mediaDevices && (navigator.mediaDevices as any).selectAudioOutput) {
    try {
      const device = await (navigator.mediaDevices as any).selectAudioOutput();
      if (device && device.deviceId) {
        const isSpeaker = !device.label.toLowerCase().includes('earpiece');
        const mode: AudioOutputMode = isSpeaker ? 'SPEAKER' : 'EARPIECE';
        await applyAudioOutputRouting(mode, device.deviceId, true);
        showAudioToast(`🎧 ROUTED: ${device.label || 'OUTPUT DEVICE'}`);
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.warn('selectAudioOutput error:', err);
      }
    }
  }
  toggleAudioOutputMode();
}

let voiceAudioCtx: AudioContext | null = null;
let localVoiceStream: MediaStream | null = null;
let localVoiceSource: MediaStreamAudioSourceNode | null = null;
let localAnalyser: AnalyserNode | null = null;
let isMicMuted = false;
let localIsSpeaking = false;

interface RemoteVoiceEntry {
  stream: MediaStream;
  source?: MediaStreamAudioSourceNode;
  panner?: PannerNode;
  gain?: GainNode;
  analyser?: AnalyserNode;
  hiddenAudio?: HTMLAudioElement;
  call?: any;
  isSpeaking: boolean;
  volume: number;
}

const remoteVoices = new Map<string, RemoteVoiceEntry>();
const pendingVoiceCalls = new Set<string>();
const MAX_PROXIMITY_DIST = 75;
const MIN_PROXIMITY_DIST = 3.0;

const PEER_CONFIG = buildPeerConfig();

function getOrCreateAudioContext(): AudioContext {
  if (!voiceAudioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    voiceAudioCtx = new AudioContextClass({ latencyHint: 'interactive' });
    initSoundEngine(voiceAudioCtx);
    if (selectedAudioOutputDeviceId && 'setSinkId' in voiceAudioCtx) {
      (voiceAudioCtx as any).setSinkId(selectedAudioOutputDeviceId).catch(() => {});
    }
  }
  if (voiceAudioCtx.state === 'suspended') {
    voiceAudioCtx.resume().catch(() => {});
  }
  return voiceAudioCtx;
}

window.addEventListener('touchstart', () => { getOrCreateAudioContext(); initSoundEngine(); }, { once: false, passive: true });
window.addEventListener('pointerdown', () => { getOrCreateAudioContext(); initSoundEngine(); }, { once: false, passive: true });
window.addEventListener('keydown', () => { getOrCreateAudioContext(); initSoundEngine(); }, { once: false, passive: true });

function createSilentFallbackStream(): MediaStream {
  const ctx = getOrCreateAudioContext();
  const osc = ctx.createOscillator();
  const dst = ctx.createMediaStreamDestination();
  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(dst);
  osc.start();
  return dst.stream;
}

async function initProximityMic(): Promise<MediaStream> {
  getOrCreateAudioContext();
  if (localVoiceStream) return localVoiceStream;

  const isMobile = isTouchDevice || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const audioConstraints = (isMobile && currentAudioOutputMode === 'SPEAKER')
    ? {
        echoCancellation: false, // Forces mobile OS to keep audio in media loudspeaker pipeline!
        noiseSuppression: true,
        autoGainControl: true
      }
    : {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

  try {
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      localVoiceStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false
      });
    } else {
      localVoiceStream = createSilentFallbackStream();
      isMicMuted = true;
    }
  } catch (err) {
    console.warn('Microphone fallback active:', err);
    localVoiceStream = createSilentFallbackStream();
    isMicMuted = true;
  }

  try {
    if (voiceAudioCtx) {
      localVoiceSource = voiceAudioCtx.createMediaStreamSource(localVoiceStream);
      localAnalyser = voiceAudioCtx.createAnalyser();
      localAnalyser.fftSize = 256;
      localAnalyser.smoothingTimeConstant = 0.4;
      localVoiceSource.connect(localAnalyser);
    }
  } catch (e) {
    console.warn('Audio analyser error:', e);
  }

  updateMicHudDisplay();
  return localVoiceStream;
}

function toggleMicMute() {
  isMicMuted = !isMicMuted;
  if (localVoiceStream) {
    localVoiceStream.getAudioTracks().forEach(track => {
      track.enabled = !isMicMuted;
    });
  }
  updateMicHudDisplay();
}

function updateMicHudDisplay() {
  if (isMicMuted) {
    micHudToggle.classList.add('muted');
    micHudIcon.textContent = '🔇';
    micHudLabel.textContent = 'MUTED [V]';
    micTouchBtn.classList.add('muted');
    micTouchBtn.textContent = '🔇';
    if (lobbyMicBtn) {
      lobbyMicBtn.classList.add('muted');
      lobbyMicBtn.textContent = '🔇 MIC MUTED [V]';
    }
  } else {
    micHudToggle.classList.remove('muted');
    micHudIcon.textContent = '🎙️';
    micHudLabel.textContent = 'MIC ON [V]';
    micTouchBtn.classList.remove('muted');
    micTouchBtn.textContent = '🎙️';
    if (lobbyMicBtn) {
      lobbyMicBtn.classList.remove('muted');
      lobbyMicBtn.textContent = '🎙️ MIC ACTIVE [V]';
    }
  }
}

if (lobbyMicBtn) {
  lobbyMicBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMicMute();
  });
}

micHudToggle.addEventListener('click', () => toggleMicMute());
audioRouteHudToggle.addEventListener('click', () => toggleAudioOutputMode());
audioRouteHudToggle.addEventListener('dblclick', () => promptSelectAudioOutput());
audioRouteTouchBtn.addEventListener('click', (e) => {
  e.preventDefault();
  toggleAudioOutputMode();
});
if (audioRouteSelect) {
  audioRouteSelect.addEventListener('change', () => {
    applyAudioOutputRouting(audioRouteSelect.value as AudioOutputMode, undefined, true);
  });
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyV') toggleMicMute();
});

function setupRemoteVoice(remotePeerId: string, stream: MediaStream, call: any = null) {
  const ctx = getOrCreateAudioContext();
  cleanupRemoteVoice(remotePeerId);

  const hiddenAudio = document.createElement('audio');
  hiddenAudio.style.display = 'none';
  hiddenAudio.setAttribute('playsinline', '');
  hiddenAudio.setAttribute('autoplay', '');
  hiddenAudio.muted = true;
  hiddenAudio.srcObject = stream;
  document.body.appendChild(hiddenAudio);

  if (selectedAudioOutputDeviceId && 'setSinkId' in hiddenAudio) {
    (hiddenAudio as any).setSinkId(selectedAudioOutputDeviceId).catch(() => {});
  }

  hiddenAudio.play().catch(() => {
    const unlock = () => {
      hiddenAudio.play().catch(() => {});
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
  });

  let source: MediaStreamAudioSourceNode | undefined;
  let panner: PannerNode | undefined;
  let gain: GainNode | undefined;
  let analyser: AnalyserNode | undefined;

  try {
    source = ctx.createMediaStreamSource(stream);
    panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = MIN_PROXIMITY_DIST;
    panner.maxDistance = MAX_PROXIMITY_DIST;
    panner.rolloffFactor = 1.2;
    panner.coneInnerAngle = 360;

    gain = ctx.createGain();
    const isSpeaker = currentAudioOutputMode === 'SPEAKER';
    gain.gain.value = isSpeaker ? 2.4 : 1.0;

    // Vocal presence boost filter for mobile loudspeakers
    const presenceFilter = ctx.createBiquadFilter();
    presenceFilter.type = 'peaking';
    presenceFilter.frequency.value = 2400; // 2.4kHz presence boost for vocal clarity
    presenceFilter.Q.value = 1.2;
    presenceFilter.gain.value = isSpeaker ? 3.5 : 0;

    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;

    source.connect(analyser);
    source.connect(presenceFilter);
    presenceFilter.connect(panner);
    panner.connect(gain);
    gain.connect(ctx.destination);
  } catch (e) {
    console.warn('Web Audio routing fallback:', e);
  }

  remoteVoices.set(remotePeerId, {
    stream, source, panner, gain, analyser, hiddenAudio, call,
    isSpeaking: false, volume: 0
  });

  updateSpeakerTabs();
}

function cleanupRemoteVoice(remotePeerId: string) {
  const v = remoteVoices.get(remotePeerId);
  if (v) {
    try {
      if (v.source) v.source.disconnect();
      if (v.panner) v.panner.disconnect();
      if (v.gain) v.gain.disconnect();
      if (v.analyser) v.analyser.disconnect();
      if (v.hiddenAudio) {
        v.hiddenAudio.pause();
        v.hiddenAudio.srcObject = null;
        v.hiddenAudio.remove();
      }
    } catch (e) {}
    remoteVoices.delete(remotePeerId);
  }
  pendingVoiceCalls.delete(remotePeerId);
  updateSpeakerTabs();
}

const freqBuffer = new Uint8Array(128);
const VOICE_THRESHOLD = 14;

function pollVoiceActivity() {
  if (localAnalyser && !isMicMuted) {
    localAnalyser.getByteFrequencyData(freqBuffer);
    let sum = 0;
    for (let i = 0; i < freqBuffer.length; i++) sum += freqBuffer[i];
    const avg = sum / freqBuffer.length;
    localIsSpeaking = avg > VOICE_THRESHOLD;
    if (lobbyMicMeterFill) {
      const pct = Math.min(100, Math.round((avg / 65) * 100));
      lobbyMicMeterFill.style.width = `${pct}%`;
    }
  } else {
    localIsSpeaking = false;
    if (lobbyMicMeterFill) {
      lobbyMicMeterFill.style.width = '0%';
    }
  }

  remoteVoices.forEach((v, peerId) => {
    if (v.analyser) {
      v.analyser.getByteFrequencyData(freqBuffer);
      let sum = 0;
      for (let i = 0; i < freqBuffer.length; i++) sum += freqBuffer[i];
      const avg = sum / freqBuffer.length;
      v.volume = avg;
      v.isSpeaking = avg > VOICE_THRESHOLD;

      const mesh = remotePlayers.get(peerId);
      if (mesh && mesh.userData && mesh.userData.visor) {
        if (v.isSpeaking) {
          mesh.userData.visor.material.color.setHex(0x00ff88);
        } else {
          mesh.userData.visor.material.color.setHex(mesh.userData.team === 'RED' ? 0xff2244 : 0x00e5ff);
        }
      }
    }
  });

  updateLobbyVoiceUI();
}
setInterval(pollVoiceActivity, 80);

function updateLobbyVoiceUI() {
  if (voiceSpeakerTabsEl) {
    voiceSpeakerTabsEl.innerHTML = '';
  }

  // During active match, proximity chat is purely directional 3D audio.
  // We completely hide any on-screen indicators so players cannot see other players' locations.
  if (isMatchActive) {
    return;
  }

  // In Lobby: render operative comms station so players can chat and test audio
  if (!lobbyVoiceCards) return;
  lobbyVoiceCards.innerHTML = '';

  // 1. Local Player Card
  const localCard = document.createElement('div');
  const localSpeakingClass = (localIsSpeaking && !isMicMuted) ? ' speaking' : '';
  const localMutedClass = isMicMuted ? ' muted' : '';
  localCard.className = `lobby-voice-card team-${myTeam.toLowerCase()}${localSpeakingClass}${localMutedClass}`;
  localCard.innerHTML = `
    <div style="display:flex; align-items:center; gap:6px;">
      <span>${isMicMuted ? '🔇' : (localIsSpeaking ? '🎙️' : '🔈')}</span>
      <strong style="color:#fff;">${myPlayerName || 'OPERATIVE'}</strong>
      <span style="font-size:9px; padding:1px 4px; border-radius:2px; background:rgba(0,255,136,0.2); color:#00ff88;">YOU</span>
    </div>
    <div style="display:flex; align-items:center; gap:6px;">
      <span style="font-size:10px; color:${isMicMuted ? '#ff5577' : (localIsSpeaking ? '#00ff88' : '#88aacc')}; font-weight:bold;">${isMicMuted ? 'MUTED' : (localIsSpeaking ? 'TALKING' : 'ONLINE')}</span>
      <div class="voice-wave"><span></span><span></span><span></span></div>
    </div>
  `;
  lobbyVoiceCards.appendChild(localCard);

  // 2. Solo Mode representation
  if (isSoloMode) {
    const enemyTeam = myTeam === 'RED' ? 'BLUE' : 'RED';
    const friendlyTeam = myTeam;
    const names = ['ALPHA', 'VIPER', 'SPECTER', 'TITAN', 'APEX', 'GHOST'];
    const weapons = ['AR', 'SMG', 'AR', 'SNIPER', 'SMG', 'AR'];

    for (let i = 0; i < soloBotCount; i++) {
      let team = enemyTeam;
      if (soloBotCount >= 4 && i === 0) team = friendlyTeam;
      if (soloBotCount >= 6 && i === 1) team = friendlyTeam;

      const botName = `BOT ${names[i % names.length]}`;
      const isRed = team === 'RED';
      const teamClass = isRed ? 'team-red' : 'team-blue';
      const teamBadgeColor = isRed ? '#ff3355' : '#00e5ff';
      const teamBg = isRed ? 'rgba(255,51,85,0.18)' : 'rgba(0,229,255,0.18)';

      const card = document.createElement('div');
      card.className = `lobby-voice-card ${teamClass} muted`;
      card.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px;">
          <span>🤖</span>
          <strong style="color:#ffffff;">${botName}</strong>
          <span style="font-size:9px; padding:1px 4px; border-radius:2px; background:${teamBg}; color:${teamBadgeColor};">${team}</span>
        </div>
        <span style="font-size:10px; color:#88a0b5;">AI &bull; ${weapons[i % weapons.length]} &bull; ${soloBotDifficulty}</span>
      `;
      lobbyVoiceCards.appendChild(card);
    }
    return;
  }

  // 3. Networked Lobby peers
  if (!networkManager) return;

  for (const [peerId, info] of networkManager.lobbyRoster.entries()) {
    if (networkManager.peer && peerId === networkManager.peer.id) continue;

    const rVoice = remoteVoices.get(peerId);
    const isSpeaking = rVoice ? rVoice.isSpeaking : false;
    const teamClass = (info.team || 'red').toLowerCase();

    const card = document.createElement('div');
    card.className = `lobby-voice-card team-${teamClass}` + (isSpeaking ? ' speaking' : '');
    card.innerHTML = `
      <div style="display:flex; align-items:center; gap:6px;">
        <span>${isSpeaking ? '🔊' : '🔈'}</span>
        <strong style="color:#fff;">${info.name || 'OPERATIVE'}</strong>
        <span style="font-size:9px; padding:1px 4px; border-radius:2px; background:${info.team === 'BLUE' ? 'rgba(0,229,255,0.2)' : 'rgba(255,51,85,0.2)'}; color:${info.team === 'BLUE' ? '#00e5ff' : '#ff3355'};">${info.team || 'RED'}</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:10px; color:${isSpeaking ? '#00ff88' : '#88aacc'}; font-weight:bold;">${isSpeaking ? 'TALKING' : 'CONNECTED'}</span>
        <div class="voice-wave"><span></span><span></span><span></span></div>
      </div>
    `;
    lobbyVoiceCards.appendChild(card);
  }
}
const updateSpeakerTabs = updateLobbyVoiceUI;

// ================= Remote Player Avatars =================
const remotePlayers = new Map<string, THREE.Group>();

function createPlayerMesh(name: string, team: string): THREE.Group {
  return createOperativePlayerMesh(name, team);
}

// ================= Solo Mode Bot AI System =================
function spawnBotBullet(bot: BotOperative, muzzlePos: THREE.Vector3, shootDir: THREE.Vector3) {
  const tracer = new THREE.Mesh(tracerGeo, bot.team === 'RED' ? tracerMatRed : tracerMatBlue);
  tracer.position.copy(muzzlePos);
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), shootDir);
  tracer.userData = {
    velocity: shootDir.clone().multiplyScalar(bot.weapon.bulletSpeed),
    life: 1.8,
    damage: bot.weapon.damage,
    isBotBullet: true,
    attackerName: `[BOT] ${bot.name}`,
    attackerTeam: bot.team,
    attackerId: bot.id
  };
  scene.add(tracer);
  bullets.push(tracer);

  // Directional 3D gunshot sound relative to player camera
  const dist = camera.position.distanceTo(muzzlePos);
  if (dist < 85) {
    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const toMuzzle = new THREE.Vector3().subVectors(muzzlePos, camera.position).normalize();
    const pan = Math.max(-0.95, Math.min(0.95, camRight.dot(toMuzzle)));
    const vol = Math.max(0.10, 1.0 - (dist / 85));
    playRemoteGunshot(bot.weapon.key, vol, pan);
  }
}

function handleBotDeath(bot: BotOperative, killerName: string, killerTeam: string) {
  bot.alive = false;
  bot.mesh.visible = false;
  bot.respawnTimer = 3.5;
  if (killerName === myPlayerName) {
    personalKills++;
  }
  if (killerTeam === 'RED') redScore++;
  else if (killerTeam === 'BLUE') blueScore++;
  killNotice(killerName, `[BOT] ${bot.name}`);
  updateScoreboard();
  spawnWallImpactSparks(bot.pos.clone().add(new THREE.Vector3(0, 1.0, 0)), new THREE.Vector3(0, 1.5, 0));
}

function initSoloBots() {
  botManager.initBots(
    soloBotCount,
    soloBotDifficulty,
    myTeam,
    currentMapId,
    heightAt,
    scene,
    RED_SPAWNS,
    BLUE_SPAWNS
  );
  // Also register their meshes into remotePlayers for consistent entity tracking
  botManager.bots.forEach(b => {
    remotePlayers.set(b.id, b.mesh);
  });
}

function updateSoloBots(delta: number) {
  if (!isSoloMode || !isMatchActive) return;

  botManager.update(
    delta,
    camera.position,
    myTeam,
    health,
    colliders,
    heightAt,
    (bot, muzzlePos, shootDir) => {
      spawnBotBullet(bot, muzzlePos, shootDir);
    },
    (bot, killerName, killerTeam) => {
      handleBotDeath(bot, killerName, killerTeam);
    }
  );
}

// ================= WebRTC Network Manager =================
class NetworkManager {
  roomCode: string;
  playerName: string;
  forceRole: string | null;
  brokerId: string;
  hostPeerId: string;
  peer: any = null;
  hostConn: any = null;
  clients = new Map<string, any>();
  clientPings = new Map<string, number>();
  isHost = false;
  connecting = false;
  lastBroadcast = 0;
  lobbyRoster = new Map<string, { name: string; team: string; ping?: number }>();
  joinAttempts = 0;
  hostReclaimAttempts = 0;
  pingInterval: any = null;
  currentPing = 0;
  clientRetryTimer: any = null;
  connectionTimeout: any = null;
  joinAckTimer: any = null;

  constructor(roomCode: string, playerName: string, forceRole: string | null = null, brokerId?: string) {
    this.roomCode = (roomCode || 'SECTOR-7').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '') || 'SECTOR-7';
    this.playerName = playerName.trim() || myPlayerName;
    this.forceRole = forceRole;
    this.brokerId = brokerId || getSelectedBrokerId();
    this.hostPeerId = `cyberfps-v3-host-${this.roomCode}`;

    this.updateStatusDisplay(`INITIALIZING WEBRTC ON ${SIGNALING_BROKERS[this.brokerId]?.name || 'BROKER'}...`, '--');

    if (this.forceRole === 'host') {
      this.becomeHost();
    } else {
      this.connectAsClient();
    }

    this.startHeartbeat();
  }

  updateStatusDisplay(text: string, pingText?: string) {
    if (lobbyNetStatusText) {
      lobbyNetStatusText.innerHTML = text;
    }
    if (pingText !== undefined) {
      if (lobbyPingBadge) lobbyPingBadge.textContent = pingText;
      if (hudPingBadge) hudPingBadge.textContent = pingText;
    }
  }

  startHeartbeat() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (!this.isHost && this.hostConn && this.hostConn.open) {
        this.hostConn.send(JSON.stringify({
          type: 'ping',
          senderId: this.peer ? this.peer.id : '',
          sentTime: Date.now()
        }));
      }
    }, 2500);
  }

  stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  cleanupPeer() {
    if (this.peer) {
      try {
        this.peer.removeAllListeners();
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }

  setupVoiceListeners() {
    if (!this.peer) return;

    this.peer.on('call', (call: any) => {
      const streamToSend = localVoiceStream || createSilentFallbackStream();
      call.answer(streamToSend);
      call.on('stream', (remoteStream: MediaStream) => {
        setupRemoteVoice(call.peer, remoteStream, call);
      });
      call.on('close', () => cleanupRemoteVoice(call.peer));
      call.on('error', () => cleanupRemoteVoice(call.peer));
    });
  }

  syncVoiceMeshCalls() {
    if (!this.peer || this.peer.destroyed || !this.peer.open || !localVoiceStream) return;
    const myId = this.peer.id;

    for (const [peerId] of this.lobbyRoster.entries()) {
      if (peerId === myId) continue;
      if (myId < peerId && !remoteVoices.has(peerId) && !pendingVoiceCalls.has(peerId)) {
        pendingVoiceCalls.add(peerId);
        setTimeout(() => pendingVoiceCalls.delete(peerId), 6000);

        const call = this.peer.call(peerId, localVoiceStream);
        if (call) {
          call.on('stream', (remoteStream: MediaStream) => {
            pendingVoiceCalls.delete(peerId);
            setupRemoteVoice(peerId, remoteStream, call);
          });
          call.on('close', () => {
            pendingVoiceCalls.delete(peerId);
            cleanupRemoteVoice(peerId);
          });
          call.on('error', () => {
            pendingVoiceCalls.delete(peerId);
            cleanupRemoteVoice(peerId);
          });
        }
      }
    }
  }

  connectAsClient() {
    this.cleanupPeer();
    if (this.clientRetryTimer) {
      clearTimeout(this.clientRetryTimer);
      this.clientRetryTimer = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.joinAckTimer) {
      clearInterval(this.joinAckTimer);
      this.joinAckTimer = null;
    }
    this.isHost = false;
    this.connecting = true;
    this.joinAttempts++;

    lobbyRoleTitle.textContent = 'CONNECTING AS OPERATIVE...';
    clientWaitMsg.textContent = `Looking for Host in room "${this.roomCode}" (Attempt ${this.joinAttempts}/12)...`;
    clientWaitMsg.style.display = 'block';
    hostConfigRow.style.opacity = '0.55';
    hostConfigRow.style.pointerEvents = 'none';
    if (hostConfigBadge) hostConfigBadge.textContent = 'HOST CONTROLLED';
    startMatchBtn.style.display = 'none';

    this.updateStatusDisplay(`Contacting WebRTC broker [${this.brokerId}]...`, '--');

    const myRandomId = `cyberfps-v3-p-${this.roomCode}-${Math.floor(Math.random() * 1000000)}`;
    const PeerConstructor: any = (window as any).Peer || Peer;
    const peerConfig = buildPeerConfig(this.brokerId);
    this.peer = new PeerConstructor(myRandomId, peerConfig);

    let hostFound = false;

    this.peer.on('open', () => {
      if (!this.connecting) return;
      this.setupVoiceListeners();

      this.updateStatusDisplay(`Broker ready. Connecting to Host [${this.roomCode}]...`, '--');
      clientWaitMsg.textContent = `Negotiating STUN/TURN traversal with Host in room "${this.roomCode}"...`;
      const conn = this.peer.connect(this.hostPeerId, { reliable: true });

      conn.on('open', () => {
        hostFound = true;
        this.connecting = false;
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        this.hostConn = conn;
        this.isHost = false;
        lobbyRoleTitle.textContent = 'CONNECTED AS OPERATIVE (CLIENT)';
        hostConfigRow.style.opacity = '0.55';
        hostConfigRow.style.pointerEvents = 'none';
        if (hostConfigBadge) hostConfigBadge.textContent = 'HOST CONTROLLED';
        startMatchBtn.style.display = 'none';
        clientWaitMsg.textContent = 'Connected! Awaiting Mission Start from Host...';
        clientWaitMsg.style.display = 'block';

        this.updateStatusDisplay(`🟢 CONNECTED TO HOST &bull; Room: [${this.roomCode}]`, '0ms');
        
        // Handshake: send join and resend until synchronized
        const sendJoin = () => {
          this.sendToHost({ type: 'joinLobby', id: this.peer ? this.peer.id : '', name: this.playerName, team: myTeam });
        };
        sendJoin();
        if (this.joinAckTimer) clearInterval(this.joinAckTimer);
        this.joinAckTimer = setInterval(() => {
          if (this.hostConn && this.hostConn.open && (!this.lobbyRoster.has(this.peer ? this.peer.id : '') || this.lobbyRoster.size === 0)) {
            sendJoin();
          } else {
            if (this.joinAckTimer) {
              clearInterval(this.joinAckTimer);
              this.joinAckTimer = null;
            }
          }
        }, 1500);

        this.setupClientListeners(conn);
      });

      conn.on('close', () => {
        if (!this.isHost) {
          lobbyRoleTitle.textContent = 'HOST DISCONNECTED';
          clientWaitMsg.textContent = 'Host disconnected from session. Click below to reconnect or re-host.';
          clientWaitMsg.style.display = 'block';
          this.updateStatusDisplay(`Host session ended.`, '--');
          this.showClientRetryPrompt();
        }
      });

      conn.on('error', (err: any) => {
        console.warn('Operative data channel error:', err);
      });

      this.connectionTimeout = setTimeout(() => {
        if (!hostFound && this.connecting && !this.isHost) {
          if (this.joinAttempts < 12) {
            clientWaitMsg.textContent = `Host not detected yet in "${this.roomCode}" (Attempt ${this.joinAttempts}/12)...`;
            this.updateStatusDisplay(`Waiting for host in [${this.roomCode}]. Retrying...`, '--');
            this.clientRetryTimer = setTimeout(() => this.connectAsClient(), 1500);
          } else {
            this.showClientRetryPrompt();
          }
        }
      }, 7000);
    });

    this.peer.on('error', (err: any) => {
      console.warn('Operative client event:', err.type, err);
      if (err.type === 'peer-unavailable') {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        if (this.connecting && !this.isHost) {
          if (this.joinAttempts < 12) {
            clientWaitMsg.textContent = `Waiting for Host in room "${this.roomCode}"... (Attempt ${this.joinAttempts}/12)`;
            this.updateStatusDisplay(`Host initializing in [${this.roomCode}]. Retrying in 1.5s...`, '--');
            this.clientRetryTimer = setTimeout(() => this.connectAsClient(), 1500);
          } else {
            this.showClientRetryPrompt();
          }
        }
      } else if (err.type === 'unavailable-id') {
        this.clientRetryTimer = setTimeout(() => this.connectAsClient(), 500);
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.updateStatusDisplay(`Signaling node busy. Reconnecting...`, '--');
        this.clientRetryTimer = setTimeout(() => this.connectAsClient(), 2000);
      }
    });
  }

  showClientRetryPrompt() {
    clientWaitMsg.innerHTML = `Host not detected in room "<strong>${this.roomCode}</strong>". Ensure Host created room or claim host role. <div style="display:inline-flex; gap:8px; margin-left:8px;"><button id="retryJoinBtn" style="padding:4px 12px; font-family:inherit; background:#00e5ff; color:#000; font-weight:bold; border:none; border-radius:3px; cursor:pointer;">RETRY</button><button id="claimHostBtn" style="padding:4px 12px; font-family:inherit; background:#39ff14; color:#000; font-weight:bold; border:none; border-radius:3px; cursor:pointer;">HOST THIS ROOM</button></div>`;
    const retryBtn = document.getElementById('retryJoinBtn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        this.joinAttempts = 0;
        this.connectAsClient();
      };
    }
    const claimHostBtn = document.getElementById('claimHostBtn');
    if (claimHostBtn) {
      claimHostBtn.onclick = () => {
        this.becomeHost();
      };
    }
  }

  becomeHost() {
    this.connecting = false;
    this.cleanupPeer();
    this.isHost = true;

    lobbyRoleTitle.textContent = 'STARTING AS HOST...';
    clientWaitMsg.style.display = 'none';
    this.updateStatusDisplay(`Initializing Host node for room [${this.roomCode}]...`, 'HOST');

    const PeerConstructor: any = (window as any).Peer || Peer;
    const peerConfig = buildPeerConfig(this.brokerId);
    this.peer = new PeerConstructor(this.hostPeerId, peerConfig);

    this.peer.on('open', () => {
      this.isHost = true;
      this.setupVoiceListeners();
      lobbyRoleTitle.textContent = 'HOST (CONFIGURING MISSION)';
      hostConfigRow.style.opacity = '1';
      hostConfigRow.style.pointerEvents = 'auto';
      if (hostConfigBadge) hostConfigBadge.textContent = 'HOST MATCH CONFIG';
      startMatchBtn.style.display = 'inline-block';
      clientWaitMsg.style.display = 'none';

      this.lobbyRoster.set(this.peer.id, { name: this.playerName, team: myTeam, ping: 0 });
      this.updateStatusDisplay(`🟢 ACTIVE HOST &bull; Room: [${this.roomCode}]`, 'HOST');
      this.updateLobbyUI();
      this.syncVoiceMeshCalls();
      this.injectInviteLinkButton();
    });

    this.peer.on('connection', (conn: any) => {
      conn.on('open', () => {
        this.clients.set(conn.peer, conn);
        this.broadcastLobbyState();
      });

      conn.on('data', (data: any) => {
        this.handleData(data);
        for (const [id, c] of this.clients.entries()) {
          if (id !== conn.peer && c.open) {
            try { c.send(data); } catch (e) {}
          }
        }
      });

      conn.on('close', () => {
        this.lobbyRoster.delete(conn.peer);
        this.removePlayer(conn.peer);
        this.clients.delete(conn.peer);
        this.clientPings.delete(conn.peer);
        cleanupRemoteVoice(conn.peer);
        this.broadcast({ type: 'playerLeave', id: conn.peer });
        this.broadcastLobbyState();
        this.updateLobbyUI();
      });

      conn.on('error', (err: any) => {
        console.warn('Host client connection error:', err);
      });
    });

    this.peer.on('error', (err: any) => {
      console.warn('Host error:', err.type, err);
      if (err.type === 'unavailable-id') {
        // If room ID is occupied:
        // 1. If user refreshed the tab, previous socket on broker takes ~1s to close. Retry reclaiming.
        // 2. If already claimed by another active operative, smoothly join their room as operative!
        if (this.hostReclaimAttempts < 2) {
          this.hostReclaimAttempts++;
          this.updateStatusDisplay(`Reconnecting Host socket for room [${this.roomCode}]...`, 'HOST');
          setTimeout(() => this.becomeHost(), 1200);
        } else {
          console.log(`Room [${this.roomCode}] already hosted. Connecting as Operative...`);
          this.updateStatusDisplay(`Host already active in room [${this.roomCode}]. Joining as operative...`, '--');
          this.connectAsClient();
        }
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.updateStatusDisplay(`Signaling node reconnecting...`, 'HOST');
        setTimeout(() => this.becomeHost(), 1500);
      }
    });
  }

  injectInviteLinkButton() {
    let copyBtn = document.getElementById('copyInviteBtn');
    if (!copyBtn && lobbyRoomTitle && lobbyRoomTitle.parentNode) {
      copyBtn = document.createElement('button');
      copyBtn.id = 'copyInviteBtn';
      copyBtn.textContent = '📋 COPY INVITE LINK';
      copyBtn.style.cssText = 'margin-left: 12px; padding: 6px 12px; font-size: 13px; font-family: inherit; font-weight: bold; cursor: pointer; background: #00e5ff; color: #0a0e17; border: none; border-radius: 4px; box-shadow: 0 0 10px rgba(0, 229, 255, 0.4);';
      copyBtn.onclick = () => {
        const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(this.roomCode)}&role=join&broker=${encodeURIComponent(this.brokerId)}`;
        navigator.clipboard.writeText(inviteUrl).then(() => {
          copyBtn!.textContent = '✅ LINK COPIED!';
          setTimeout(() => { if (copyBtn) copyBtn.textContent = '📋 COPY INVITE LINK'; }, 2500);
        }).catch(() => {
          prompt('Squad Invite Link:', inviteUrl);
        });
      };
      lobbyRoomTitle.parentNode.insertBefore(copyBtn, lobbyRoomTitle.nextSibling);
    }
  }

  setupClientListeners(conn: any) {
    conn.on('data', (data: any) => this.handleData(data));
  }

  broadcast(packet: any) {
    const payload = typeof packet === 'string' ? packet : JSON.stringify(packet);
    if (this.isHost) {
      for (const c of this.clients.values()) {
        if (c.open) c.send(payload);
      }
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(payload);
    }
  }

  sendToHost(packet: any) {
    if (this.hostConn && this.hostConn.open) {
      const payload = typeof packet === 'string' ? packet : JSON.stringify(packet);
      this.hostConn.send(payload);
    }
  }

  broadcastLobbyState() {
    if (!this.isHost) return;
    const rosterObj: Record<string, any> = {};
    for (const [k, v] of this.lobbyRoster.entries()) rosterObj[k] = v;
    this.broadcast({
      type: 'lobbySync',
      roster: rosterObj,
      matchDuration,
      gameMode,
      selectedMap: currentMapId,
      mapAnimationsEnabled: isMapAnimationsActive(),
      timeRemaining,
      redScore,
      blueScore,
      isMatchActive
    });
    this.updateLobbyUI();
    this.syncVoiceMeshCalls();
  }

  updateLobbyUI() {
    redTeamListEl.innerHTML = '';
    blueTeamListEl.innerHTML = '';
    for (const [id, p] of this.lobbyRoster.entries()) {
      const item = document.createElement('div');
      const isSelf = this.peer && id === this.peer.id;
      const hostLabel = id === this.hostPeerId || (this.isHost && isSelf) ? ' <span style="color:#00ff88; font-size:10px; font-weight:bold;">[HOST]</span>' : '';
      const pingLabel = p.ping !== undefined && p.ping > 0 ? ` <span style="color:#00e5ff; font-size:10px;">[${p.ping}ms]</span>` : '';
      item.innerHTML = `• ${p.name}${hostLabel}${pingLabel}`;
      if (p.team === 'RED') redTeamListEl.appendChild(item);
      else blueTeamListEl.appendChild(item);
    }
    updateSpeakerTabs();
  }

  handleData(raw: any) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

      // Online Map Animations Synchronization (affects everyone in lobby)
      if (data.type === 'mapAnimationsSync') {
        if (data.enabled !== undefined) {
          setMapAnimationsActive(data.enabled);
          updateMapAnimationsUI();
          showAudioToast(`🚄 LOBBY ANIMATIONS: ${data.enabled ? 'ON' : 'OFF'}`);
        }
        return;
      }

      if (data.type === 'requestMapAnimationsToggle') {
        if (this.isHost) {
          setMapAnimationsActive(data.enabled);
          updateMapAnimationsUI();
          this.broadcast({
            type: 'mapAnimationsSync',
            enabled: data.enabled
          });
          showAudioToast(`🚄 LOBBY ANIMATIONS: ${data.enabled ? 'ON' : 'OFF'}`);
        }
        return;
      }

      // Ping / Pong measurement
      if (data.type === 'ping') {
        if (this.isHost) {
          const client = this.clients.get(data.senderId);
          if (client && client.open) {
            client.send(JSON.stringify({
              type: 'pong',
              sentTime: data.sentTime
            }));
          }
        }
        return;
      }

      if (data.type === 'pong') {
        const rtt = Math.max(1, Date.now() - (data.sentTime || Date.now()));
        this.currentPing = Math.round(rtt / 2);
        this.updateStatusDisplay(`🟢 CONNECTED TO HOST &bull; Room: [${this.roomCode}]`, `${this.currentPing}ms`);
        this.sendToHost({
          type: 'reportPing',
          id: this.peer ? this.peer.id : '',
          ping: this.currentPing
        });
        return;
      }

      if (data.type === 'reportPing') {
        if (this.isHost) {
          this.clientPings.set(data.id, data.ping);
          const op = this.lobbyRoster.get(data.id);
          if (op) {
            op.ping = data.ping;
            this.updateLobbyUI();
          }
        }
        return;
      }

      if (data.type === 'joinLobby' || data.type === 'updateTeam') {
        this.lobbyRoster.set(data.id, { name: data.name, team: data.team, ping: data.ping || 0 });
        if (this.isHost) this.broadcastLobbyState();
        else this.updateLobbyUI();
        this.syncVoiceMeshCalls();
      } else if (data.type === 'playerLeave') {
        this.lobbyRoster.delete(data.id);
        this.clientPings.delete(data.id);
        this.removePlayer(data.id);
        cleanupRemoteVoice(data.id);
        this.updateLobbyUI();
      } else if (data.type === 'lobbySync') {
        this.lobbyRoster.clear();
        for (const k in data.roster) this.lobbyRoster.set(k, data.roster[k]);

        for (const [id] of remotePlayers.entries()) {
          if (!this.lobbyRoster.has(id)) {
            this.removePlayer(id);
            cleanupRemoteVoice(id);
          }
        }

        matchDuration = data.matchDuration;
        timeRemaining = data.timeRemaining;
        gameMode = data.gameMode;
        redScore = data.redScore;
        blueScore = data.blueScore;
        hudModeNameEl.textContent = gameMode;
        timeSelect.value = String(matchDuration);
        modeSelect.value = gameMode;
        if (data.selectedMap && data.selectedMap !== currentMapId) {
          loadMap(data.selectedMap);
          if (mapSelect) mapSelect.value = data.selectedMap;
        }
        if (data.mapAnimationsEnabled !== undefined && data.mapAnimationsEnabled !== isMapAnimationsActive()) {
          setMapAnimationsActive(data.mapAnimationsEnabled);
          updateMapAnimationsUI();
        }
        this.updateLobbyUI();
        updateScoreboard();
        this.syncVoiceMeshCalls();
      } else if (data.type === 'startMatch') {
        matchDuration = data.matchDuration;
        timeRemaining = matchDuration;
        gameMode = data.gameMode;
        hudModeNameEl.textContent = gameMode;
        if (data.selectedMap && data.selectedMap !== currentMapId) {
          loadMap(data.selectedMap);
        }
        if (data.mapAnimationsEnabled !== undefined && data.mapAnimationsEnabled !== isMapAnimationsActive()) {
          setMapAnimationsActive(data.mapAnimationsEnabled);
          updateMapAnimationsUI();
        }
        startActiveGame();
      } else if (data.type === 'pos') {
        let p = remotePlayers.get(data.id);
        if (!p) {
          p = createPlayerMesh(data.name || 'AGENT', data.team || 'RED');
          scene.add(p);
          remotePlayers.set(data.id, p);
        }
        p.userData.targetPos.set(data.x, data.y, data.z);
        p.userData.targetRotY = data.rotY;
        p.userData.hp = data.hp;
        p.userData.team = data.team;
        p.userData.name = data.name;
        const isAlive = (data.alive !== false) && (data.hp === undefined || data.hp > 0);
        p.userData.alive = isAlive;
        p.visible = isAlive;
      } else if (data.type === 'playerDeath') {
        const p = remotePlayers.get(data.id);
        if (p) {
          p.visible = false;
          p.userData.alive = false;
        }
        for (const [, rp] of remotePlayers.entries()) {
          if (rp.userData && rp.userData.name === data.name) {
            rp.visible = false;
            rp.userData.alive = false;
          }
        }
      } else if (data.type === 'shoot') {
        spawnRemoteTracer(new THREE.Vector3(data.ox, data.oy, data.oz), new THREE.Vector3(data.dx, data.dy, data.dz), data.team);
      } else if (data.type === 'damage') {
        if (this.peer && data.targetId === this.peer.id) {
          takeDamage(data.dmg, data.attackerName, data.attackerTeam, data.attackerId);
        }
      } else if (data.type === 'killSync') {
        killNotice(data.killer, data.victim);
        if (data.killer === myPlayerName) {
          personalKills++;
          killFeedback.recordKill({
            victimName: data.victim,
            victimTeam: data.victimTeam || 'ENEMY',
            weaponName: currentWeapon().name.split('//')[0].trim(),
            distanceMeters: data.distance || 18,
            isHeadshot: !!data.isHeadshot
          });
          showHitmarker(true, !!data.isHeadshot);
        }
        if (data.victimId) {
          const p = remotePlayers.get(data.victimId);
          if (p) {
            p.visible = false;
            p.userData.alive = false;
          }
        }
        for (const [, rp] of remotePlayers.entries()) {
          if (rp.userData && rp.userData.name === data.victim) {
            rp.visible = false;
            rp.userData.alive = false;
          }
        }
        redScore = data.redScore;
        blueScore = data.blueScore;
        updateScoreboard();
      }
    } catch (e) {}
  }

  removePlayer(id: string) {
    const p = remotePlayers.get(id);
    if (p) {
      scene.remove(p);
      remotePlayers.delete(id);
    }
  }

  destroy() {
    this.connecting = false;
    if (this.clientRetryTimer) {
      clearTimeout(this.clientRetryTimer);
      this.clientRetryTimer = null;
    }
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.joinAckTimer) {
      clearInterval(this.joinAckTimer);
      this.joinAckTimer = null;
    }
    this.stopHeartbeat();
    for (const conn of this.clients.values()) {
      try { conn.close(); } catch (e) {}
    }
    this.clients.clear();
    this.clientPings.clear();
    if (this.hostConn) {
      try { this.hostConn.close(); } catch (e) {}
      this.hostConn = null;
    }
    this.cleanupPeer();
    this.lobbyRoster.clear();
  }
}

let networkManager: NetworkManager | null = null;

setInterval(() => {
  if (networkManager) {
    networkManager.syncVoiceMeshCalls();
  }
}, 4000);

// ================= Team Spawn Base Resolution =================

function spawnPlayerToTeamBase() {
  const pool = myTeam === 'RED' ? RED_SPAWNS : BLUE_SPAWNS;
  const sp = pool[Math.floor(Math.random() * pool.length)];
  const spawnY = heightAt(sp.x, sp.z) + NORMAL_EYE_HEIGHT;
  camera.position.set(sp.x, spawnY, sp.z);
  verticalVelocity = 0;
  currentEyeHeight = NORMAL_EYE_HEIGHT;
  isDashing = false;
  isSliding = false;
  dashTimeRemaining = 0;
  horizVelocity.set(0, 0, 0);
  const spawnYaw = myTeam === 'RED' ? -Math.PI / 2 : Math.PI / 2;
  const euler = new THREE.Euler(0, spawnYaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
  camera.rotation.set(0, spawnYaw, 0);
}

// Entry Modal & Connection Handlers
if (hostMissionBtn) {
  hostMissionBtn.addEventListener('click', () => {
    getOrCreateAudioContext();
    initProximityMic().catch(() => {});
    isSoloMode = false;
    if (soloBotConfigRow) soloBotConfigRow.style.display = 'none';
    const pNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    const rCodeInput = document.getElementById('roomCodeInput') as HTMLInputElement;
    myPlayerName = pNameInput?.value.trim() || myPlayerName;
    try { localStorage.setItem('cyberfps_callsign', myPlayerName); } catch (e) {}
    currentRoomCode = rCodeInput?.value.trim().toUpperCase() || generateRandomRoomCode();
    if (rCodeInput) rCodeInput.value = currentRoomCode;

    entryModal.style.display = 'none';
    lobbyModal.style.display = 'flex';
    lobbyRoomTitle.textContent = currentRoomCode;

    if (networkManager) networkManager.destroy();
    networkManager = new NetworkManager(currentRoomCode, myPlayerName, 'host');
  });
}

if (joinMissionBtn) {
  joinMissionBtn.addEventListener('click', () => {
    getOrCreateAudioContext();
    initProximityMic().catch(() => {});
    isSoloMode = false;
    if (soloBotConfigRow) soloBotConfigRow.style.display = 'none';
    const pNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    const rCodeInput = document.getElementById('roomCodeInput') as HTMLInputElement;
    myPlayerName = pNameInput?.value.trim() || myPlayerName;
    try { localStorage.setItem('cyberfps_callsign', myPlayerName); } catch (e) {}
    currentRoomCode = rCodeInput?.value.trim().toUpperCase() || 'SECTOR-7';

    entryModal.style.display = 'none';
    lobbyModal.style.display = 'flex';
    lobbyRoomTitle.textContent = currentRoomCode;

    if (networkManager) networkManager.destroy();
    networkManager = new NetworkManager(currentRoomCode, myPlayerName, 'join');
  });
}

if (randomRoomBtn) {
  randomRoomBtn.addEventListener('click', () => {
    const rCodeInput = document.getElementById('roomCodeInput') as HTMLInputElement;
    if (rCodeInput) {
      rCodeInput.value = generateRandomRoomCode();
    }
  });
}

if (copyInviteLinkBtn) {
  copyInviteLinkBtn.addEventListener('click', () => {
    const brokerId = networkManager ? networkManager.brokerId : getSelectedBrokerId();
    const targetRoom = currentRoomCode || 'SECTOR-7';
    const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(targetRoom)}&role=join&broker=${encodeURIComponent(brokerId)}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      copyInviteLinkBtn.textContent = '✅ SQUAD INVITE LINK COPIED!';
      setTimeout(() => { copyInviteLinkBtn.textContent = '📋 COPY SQUAD INVITE LINK'; }, 2500);
    }).catch(() => {
      prompt('Squad Invite Link:', inviteUrl);
    });
  });
}

function openNetworkDiagnostics() {
  if (netDiagModal) netDiagModal.style.display = 'flex';
  if (diagBrokerSelect) {
    diagBrokerSelect.value = getSelectedBrokerId();
  }
  const customTurn = getCustomTurnSettings();
  if (customTurnEnableCheck) {
    customTurnEnableCheck.checked = customTurn.enabled;
    if (customTurnFields) customTurnFields.style.display = customTurn.enabled ? 'flex' : 'none';
  }
  if (customTurnUrlInput) customTurnUrlInput.value = customTurn.url || '';
  if (customTurnUserInput) customTurnUserInput.value = customTurn.username || '';
  if (customTurnPassInput) customTurnPassInput.value = customTurn.credential || '';
}

function closeNetworkDiagnostics() {
  if (netDiagModal) netDiagModal.style.display = 'none';
}

if (openNetDiagBtn) openNetDiagBtn.addEventListener('click', openNetworkDiagnostics);
if (lobbyNetDiagBtn) lobbyNetDiagBtn.addEventListener('click', openNetworkDiagnostics);
if (closeNetDiagBtn) closeNetDiagBtn.addEventListener('click', closeNetworkDiagnostics);

if (leaveLobbyBtn) {
  leaveLobbyBtn.addEventListener('click', () => {
    if (networkManager) {
      networkManager.destroy();
      networkManager = null;
    }
    lobbyModal.style.display = 'none';
    entryModal.style.display = 'flex';
  });
}

window.addEventListener('beforeunload', () => {
  if (networkManager) {
    try { networkManager.destroy(); } catch (e) {}
  }
});

window.addEventListener('pagehide', () => {
  if (networkManager) {
    try { networkManager.destroy(); } catch (e) {}
  }
});

if (diagBrokerSelect) {
  diagBrokerSelect.addEventListener('change', () => {
    setSelectedBrokerId(diagBrokerSelect.value);
    if (diagBrokerStatusBadge) {
      diagBrokerStatusBadge.textContent = 'UPDATED';
      setTimeout(() => { diagBrokerStatusBadge.textContent = 'ACTIVE'; }, 1500);
    }
  });
}

if (customTurnEnableCheck) {
  customTurnEnableCheck.addEventListener('change', () => {
    if (customTurnFields) customTurnFields.style.display = customTurnEnableCheck.checked ? 'flex' : 'none';
    setCustomTurnSettings({
      enabled: customTurnEnableCheck.checked,
      url: customTurnUrlInput?.value.trim() || '',
      username: customTurnUserInput?.value.trim() || '',
      credential: customTurnPassInput?.value.trim() || ''
    });
  });
}

if (saveCustomTurnBtn) {
  saveCustomTurnBtn.addEventListener('click', () => {
    setCustomTurnSettings({
      enabled: customTurnEnableCheck ? customTurnEnableCheck.checked : true,
      url: customTurnUrlInput?.value.trim() || '',
      username: customTurnUserInput?.value.trim() || '',
      credential: customTurnPassInput?.value.trim() || ''
    });
    saveCustomTurnBtn.textContent = '✅ SAVED!';
    setTimeout(() => { saveCustomTurnBtn.textContent = 'SAVE CREDENTIALS'; }, 2000);
  });
}

if (runNetTestBtn) {
  runNetTestBtn.addEventListener('click', async () => {
    if (!netDiagLog) return;
    netDiagLog.textContent = 'Starting WebRTC NAT Traversal self-test...\nGathering STUN and TURN relay candidates...';
    runNetTestBtn.setAttribute('disabled', 'true');
    try {
      const res = await testWebRtcConnectivity((line) => {
        netDiagLog.textContent += '\n' + line;
        netDiagLog.scrollTop = netDiagLog.scrollHeight;
      });
      netDiagLog.textContent += `\n\n════════════════════════════════\nSUMMARY: Found ${res.candidatesFound} candidates in ${res.durationMs}ms.\nSTUN Server Resolution: ${res.stunOk ? 'PASSED ✅' : 'FAILED ❌'}\nTURN Relay Traversal: ${res.turnOk ? 'AVAILABLE (Full NAT bypass) ✅' : 'NOT DETECTED (Direct UDP/STUN available)'}\n════════════════════════════════`;
    } catch (e: any) {
      netDiagLog.textContent += '\nDiagnostics error: ' + (e?.message || e);
    } finally {
      runNetTestBtn.removeAttribute('disabled');
    }
  });
}

function updateSoloLobbyUI() {
  if (!isSoloMode) return;
  const enemyTeam = myTeam === 'RED' ? 'BLUE' : 'RED';
  const friendlyTeam = myTeam;

  const names = ['ALPHA', 'VIPER', 'SPECTER', 'TITAN', 'APEX', 'GHOST'];
  const redList: string[] = [];
  const blueList: string[] = [];

  const youBadge = `<span style="font-size:9px; background:rgba(0,255,136,0.25); color:#00ff88; padding:1px 5px; border-radius:2px; font-weight:bold; margin-left:4px;">YOU</span>`;
  if (myTeam === 'RED') {
    redList.push(`<div>• ${myPlayerName} ${youBadge}</div>`);
  } else {
    blueList.push(`<div>• ${myPlayerName} ${youBadge}</div>`);
  }

  for (let i = 0; i < soloBotCount; i++) {
    let team = enemyTeam;
    if (soloBotCount >= 4 && i === 0) team = friendlyTeam;
    if (soloBotCount >= 6 && i === 1) team = friendlyTeam;

    const botTag = `<div>• [BOT] ${names[i % names.length]} <span style="font-size:9px; color:#88a0b5;">[AI-${soloBotDifficulty}]</span></div>`;
    if (team === 'RED') {
      redList.push(botTag);
    } else {
      blueList.push(botTag);
    }
  }

  redTeamListEl.innerHTML = redList.join('');
  blueTeamListEl.innerHTML = blueList.join('');
  updateSpeakerTabs();
}

if (soloLobbyBtn) {
  soloLobbyBtn.addEventListener('click', async () => {
    getOrCreateAudioContext();
    initProximityMic().catch(() => {});
    isSoloMode = true;
    const pNameInput = document.getElementById('playerNameInput') as HTMLInputElement;
    myPlayerName = pNameInput?.value.trim() || myPlayerName;
    try { localStorage.setItem('cyberfps_callsign', myPlayerName); } catch (e) {}
    currentRoomCode = 'SOLO';
    entryModal.style.display = 'none';
    lobbyModal.style.display = 'flex';
    lobbyRoomTitle.textContent = 'SOLO (BOT MATCH)';
    lobbyRoleTitle.textContent = 'SOLO OPERATIVE (OFFLINE)';
    if (soloBotConfigRow) soloBotConfigRow.style.display = 'flex';
    updateSoloLobbyUI();
  });
}

const pNameInput = document.getElementById('playerNameInput') as HTMLInputElement | null;
if (pNameInput) {
  pNameInput.addEventListener('input', () => {
    myPlayerName = pNameInput.value.trim() || myPlayerName;
    try { localStorage.setItem('cyberfps_callsign', myPlayerName); } catch (e) {}
    if (isSoloMode) {
      updateSoloLobbyUI();
    } else if (networkManager) {
      const id = networkManager.peer ? networkManager.peer.id : 'local';
      networkManager.lobbyRoster.set(id, { name: myPlayerName, team: myTeam });
      networkManager.updateLobbyUI();
      if (networkManager.isHost) networkManager.broadcastLobbyState();
    }
  });
}

// Automatically start in the clean COD/Deadshot main menu lobby on game launch
isSoloMode = true;
if (soloBotConfigRow) soloBotConfigRow.style.display = 'flex';
lobbyRoomTitle.textContent = 'SOLO (BOT MATCH)';
lobbyRoleTitle.textContent = 'SOLO OPERATIVE (OFFLINE)';
updateSoloLobbyUI();

if (botCountSelect) {
  botCountSelect.addEventListener('change', () => {
    soloBotCount = parseInt(botCountSelect.value) || 4;
    updateSoloLobbyUI();
  });
}

if (botDiffSelect) {
  botDiffSelect.addEventListener('change', () => {
    soloBotDifficulty = (botDiffSelect.value as BotDifficulty) || 'OPERATIVE';
    updateSoloLobbyUI();
  });
}

// Team Switching
joinRedBtn.addEventListener('click', () => {
  if (isMatchActive) return;
  myTeam = 'RED';
  hudMyTeamEl.textContent = 'RED';
  hudMyTeamEl.style.color = '#ff3355';
  if (isSoloMode) {
    updateSoloLobbyUI();
  }
  if (networkManager) {
    const id = networkManager.peer ? networkManager.peer.id : 'local';
    networkManager.lobbyRoster.set(id, { name: myPlayerName, team: myTeam });
    networkManager.broadcast({ type: 'updateTeam', id, name: myPlayerName, team: myTeam });
    networkManager.updateLobbyUI();
  }
});

joinBlueBtn.addEventListener('click', () => {
  if (isMatchActive) return;
  myTeam = 'BLUE';
  hudMyTeamEl.textContent = 'BLUE';
  hudMyTeamEl.style.color = '#00e5ff';
  if (isSoloMode) {
    updateSoloLobbyUI();
  }
  if (networkManager) {
    const id = networkManager.peer ? networkManager.peer.id : 'local';
    networkManager.lobbyRoster.set(id, { name: myPlayerName, team: myTeam });
    networkManager.broadcast({ type: 'updateTeam', id, name: myPlayerName, team: myTeam });
    networkManager.updateLobbyUI();
  }
});

timeSelect.addEventListener('change', () => {
  matchDuration = parseInt(timeSelect.value);
  timeRemaining = matchDuration;
  if (networkManager && networkManager.isHost) networkManager.broadcastLobbyState();
});

modeSelect.addEventListener('change', () => {
  gameMode = modeSelect.value;
  hudModeNameEl.textContent = gameMode;
  if (networkManager && networkManager.isHost) networkManager.broadcastLobbyState();
});

if (mapSelect) {
  mapSelect.addEventListener('change', () => {
    loadMap(mapSelect.value as MapId);
    if (networkManager && networkManager.isHost) networkManager.broadcastLobbyState();
  });
}

if (gfxSelect) {
  gfxSelect.addEventListener('change', () => {
    applyGraphicsQuality(gfxSelect.value as GfxQuality);
  });
}

startMatchBtn.addEventListener('click', () => {
  initSoundEngine();
  getOrCreateAudioContext();
  matchDuration = parseInt(timeSelect.value);
  timeRemaining = matchDuration;
  gameMode = modeSelect.value;
  hudModeNameEl.textContent = gameMode;
  redScore = 0; blueScore = 0;
  personalKills = 0; personalDeaths = 0;

  if (networkManager && networkManager.isHost) {
    networkManager.broadcast({ type: 'startMatch', matchDuration, gameMode, selectedMap: currentMapId, mapAnimationsEnabled: isMapAnimationsActive() });
  }
  startActiveGame(true);
});

function startActiveGame(isUserInitiated: boolean = false) {
  initSoundEngine();
  getOrCreateAudioContext();
  playMatchStart();
  lobbyModal.style.display = 'none';
  respawnModal.style.display = 'none';
  endGameModal.style.display = 'none';
  if (pauseModal) pauseModal.style.display = 'none';
  isMatchActive = true;
  health = MAX_HEALTH;
  updateHealthDisplay();

  applySelectedLoadout();
  spawnPlayerToTeamBase();
  updateScoreboard();

  if (isSoloMode) {
    initSoloBots();
  }

  if (isUserInitiated) {
    safeLockPointer();
  }
}

returnLobbyBtn.addEventListener('click', () => {
  endGameModal.style.display = 'none';
  lobbyModal.style.display = 'flex';
  isMatchActive = false;
  timeRemaining = matchDuration;
  updateScoreboard();
});

// ================= In-Game Tactical Pause & Map Selector Modal =================
const pauseModal = document.getElementById('pauseModal') as HTMLElement | null;
const resumeMatchBtn = document.getElementById('resumeMatchBtn');
const pauseReturnLobbyBtn = document.getElementById('pauseReturnLobbyBtn');
const pauseGfxToggleBtn = document.getElementById('pauseGfxToggleBtn');
const pauseGfxLabel = document.getElementById('pauseGfxLabel');
const hudPauseBtn = document.getElementById('hudPauseBtn');

function openPauseModal() {
  if (!pauseModal || !isMatchActive) return;
  pauseModal.style.display = 'flex';
  if (controls.isLocked) {
    controls.unlock();
  }
}

function closePauseModal() {
  if (!pauseModal) return;
  pauseModal.style.display = 'none';
  if (isMatchActive && !isTouchDevice) {
    safeLockPointer();
  }
}

function togglePauseModal() {
  if (!pauseModal) return;
  if (pauseModal.style.display === 'flex') {
    closePauseModal();
  } else {
    openPauseModal();
  }
}

if (resumeMatchBtn) {
  resumeMatchBtn.addEventListener('click', () => {
    closePauseModal();
  });
}

if (hudPauseBtn) {
  hudPauseBtn.addEventListener('click', () => {
    togglePauseModal();
  });
}

if (pauseReturnLobbyBtn) {
  pauseReturnLobbyBtn.addEventListener('click', () => {
    closePauseModal();
    isMatchActive = false;
    timeRemaining = matchDuration;
    lobbyModal.style.display = 'flex';
    updateScoreboard();
    showAudioToast('🚪 RETURNED TO MISSION LOBBY');
  });
}

if (pauseGfxToggleBtn) {
  pauseGfxToggleBtn.addEventListener('click', () => {
    cycleGraphicsQuality();
    if (pauseGfxLabel) {
      pauseGfxLabel.textContent = currentGfx === 'LOW' ? 'LOW (FAST)' : (currentGfx === 'BALANCED' ? 'BALANCED (60FPS)' : 'HIGH (HERO)');
    }
  });
}

// ================= Damage, Health & Death Handling =================
let health = 100;
const MAX_HEALTH = 100;
let lastDamageTime = -999;
const REGEN_DELAY = 4.5;
const REGEN_RATE = 10;

function updateHealthDisplay() {
  healthBarEl.style.width = (health / MAX_HEALTH * 100) + '%';
  healthBarEl.style.background = health > 50 ? '#39ff14' : (health > 20 ? '#ffaa00' : '#ff2244');
  if (healthNumEl) healthNumEl.textContent = String(Math.round(health));
}

function takeDamage(amount: number, attackerName: string | null = null, attackerTeam: string | null = null, _attackerId: string | null = null) {
  if (!isMatchActive || health <= 0) return;
  if (attackerTeam && attackerTeam === myTeam) return;

  health = Math.max(0, health - amount);
  lastDamageTime = clockElapsed;
  playDamageTaken();
  showDamageTakenIndicator();
  updateHealthDisplay();

  if (health <= 0) {
    personalDeaths++;
    killFeedback.resetStreak();
    if (attackerTeam === 'RED') redScore++;
    else if (attackerTeam === 'BLUE') blueScore++;

    killNotice(attackerName || 'SYSTEM', myPlayerName);
    updateScoreboard();

    if (networkManager) {
      const myId = networkManager.peer ? networkManager.peer.id : 'local';
      networkManager.broadcast({
        type: 'killSync',
        killer: attackerName || 'SYSTEM',
        victim: myPlayerName,
        victimId: myId,
        redScore,
        blueScore
      });
      networkManager.broadcast({
        type: 'playerDeath',
        id: myId,
        name: myPlayerName
      });
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const curRotY = Math.atan2(camDir.x, camDir.z);

      networkManager.broadcast({
        type: 'pos',
        id: myId,
        name: myPlayerName,
        team: myTeam,
        x: camera.position.x,
        y: camera.position.y - currentEyeHeight,
        z: camera.position.z,
        rotY: curRotY,
        hp: 0,
        alive: false
      });
    }
    triggerRespawnSequence();
  }
}

function killNotice(killer: string, victim: string) {
  const item = document.createElement('div');
  item.className = 'kill-item';
  item.innerHTML = `<span style="color:#ff3355">${killer}</span> 💥 <span style="color:#00e5ff">${victim}</span>`;
  killfeedEl.appendChild(item);
  setTimeout(() => item.remove(), 4000);
}

let respawnCountdown = 4;
let respawnInterval: any = null;

function completeRespawn() {
  if (respawnInterval) clearInterval(respawnInterval);
  respawnModal.style.display = 'none';
  health = MAX_HEALTH;
  updateHealthDisplay();
  applySelectedLoadout();
  spawnPlayerToTeamBase();
  if (!isTouchDevice && isMatchActive) {
    safeLockPointer();
  }
  if (networkManager) {
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    const curRotY = Math.atan2(camDir.x, camDir.z);

    networkManager.broadcast({
      type: 'pos',
      id: networkManager.peer ? networkManager.peer.id : 'local',
      name: myPlayerName,
      team: myTeam,
      x: camera.position.x,
      y: camera.position.y - currentEyeHeight,
      z: camera.position.z,
      rotY: curRotY,
      hp: health,
      alive: true
    });
  }
}

function triggerRespawnSequence() {
  if (controls.isLocked) controls.unlock();
  if (document.exitPointerLock) document.exitPointerLock();

  // Highlight currently selected weapon in respawn modal
  const cards = document.querySelectorAll<HTMLElement>('#respawnLoadoutPicker .weapon-card');
  cards.forEach(c => {
    const widx = parseInt(c.dataset.widx || '0');
    c.classList.toggle('selected', widx === currentWeaponIndex);
  });

  if (pauseModal) pauseModal.style.display = 'none';
  respawnModal.style.display = 'flex';
  respawnCountdown = 4;
  const timerNum = document.getElementById('respawnTimerNum');
  if (timerNum) timerNum.textContent = String(respawnCountdown);

  clearInterval(respawnInterval);
  respawnInterval = setInterval(() => {
    respawnCountdown--;
    if (timerNum) timerNum.textContent = String(respawnCountdown);
    if (respawnCountdown <= 0) {
      completeRespawn();
    }
  }, 1000);
}

// Wire up instant deployment and modal event blockers
const instantDeployBtn = document.getElementById('instantDeployBtn');
if (instantDeployBtn) {
  instantDeployBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (health <= 0 && isMatchActive) {
      completeRespawn();
    }
  });
}

function cycleGraphicsQuality() {
  const next: GfxQuality = currentGfx === 'LOW' ? 'BALANCED' : (currentGfx === 'BALANCED' ? 'HIGH' : 'LOW');
  applyGraphicsQuality(next);
  showAudioToast(`⚡ GFX QUALITY: ${next}`);
}

const hudGfxBtn = document.getElementById('hudGfxBtn');
if (hudGfxBtn) {
  hudGfxBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleGraphicsQuality();
  });
}

if (gfxHudToggle) {
  gfxHudToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleGraphicsQuality();
  });
}

if (gfxTouchBtn) {
  gfxTouchBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleGraphicsQuality();
  });
}

if (gfxSelect) {
  gfxSelect.addEventListener('change', () => {
    applyGraphicsQuality(gfxSelect.value as GfxQuality);
    showAudioToast(`⚡ GFX QUALITY: ${gfxSelect.value}`);
  });
}

const debugCollisionToggleBtn = document.getElementById('debugCollisionToggle');
if (debugCollisionToggleBtn) {
  debugCollisionToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCollisionDebug();
  });
}

function updateMapAnimationsUI() {
  const toggleBtn = document.getElementById('mapAnimationsToggle');
  const active = isMapAnimationsActive();
  if (toggleBtn) {
    toggleBtn.textContent = active ? 'ANIMATIONS: ON' : 'ANIMATIONS: OFF';
    toggleBtn.style.color = active ? '#38bdf8' : '#94a3b8';
    toggleBtn.style.borderColor = active ? '#38bdf8' : '#475569';
  }
}

function toggleMapAnimationsSetting(notifyLobby = true) {
  const current = isMapAnimationsActive();
  const next = !current;
  setMapAnimationsActive(next);
  updateMapAnimationsUI();
  showAudioToast(`🚄 MAP ANIMATIONS: ${next ? 'ON' : 'OFF'}`);

  // In online multiplayer, sync across the entire lobby
  if (notifyLobby && networkManager) {
    if (networkManager.isHost) {
      networkManager.broadcast({
        type: 'mapAnimationsSync',
        enabled: next
      });
    } else {
      networkManager.sendToHost({
        type: 'requestMapAnimationsToggle',
        enabled: next
      });
    }
  }
}

const mapAnimationsToggleBtn = document.getElementById('mapAnimationsToggle');
if (mapAnimationsToggleBtn) {
  mapAnimationsToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMapAnimationsSetting(true);
  });
}
updateMapAnimationsUI();

const respawnGfxBtn = document.getElementById('respawnGfxBtn');
if (respawnGfxBtn) {
  respawnGfxBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleGraphicsQuality();
  });
}

const respawnModalEl = document.getElementById('respawnModal');
if (respawnModalEl) {
  respawnModalEl.addEventListener('mousedown', (e) => e.stopPropagation());
  respawnModalEl.addEventListener('pointerdown', (e) => e.stopPropagation());
}

function finishMatch() {
  isMatchActive = false;
  if (controls.isLocked) controls.unlock();

  endGameModal.style.display = 'flex';
  document.getElementById('endRedScore')!.textContent = String(redScore);
  document.getElementById('endBlueScore')!.textContent = String(blueScore);
  document.getElementById('endKills')!.textContent = String(personalKills);
  document.getElementById('endDeaths')!.textContent = String(personalDeaths);
  document.getElementById('endKD')!.textContent = (personalKills / Math.max(1, personalDeaths)).toFixed(2);

  const title = document.getElementById('endGameTitle')!;
  const sub = document.getElementById('endGameSub')!;

  if (redScore === blueScore) {
    title.textContent = 'STALEMATE // DRAW';
    title.style.color = '#ffdd44';
    sub.textContent = 'NEITHER SQUAD SECURED SECTOR DOMINANCE';
    playVictory();
  } else if ((myTeam === 'RED' && redScore > blueScore) || (myTeam === 'BLUE' && blueScore > redScore)) {
    title.textContent = 'VICTORY';
    title.style.color = '#00ff88';
    sub.textContent = `${myTeam} TEAM SECURED FULL SECTOR DOMINANCE`;
    playVictory();
  } else {
    title.textContent = 'DEFEAT';
    title.style.color = '#ff3355';
    sub.textContent = `HOSTILE FORCES SEIZED CONTROL OF THE SECTOR`;
    playDefeat();
  }
}

// ================= Movement, Input & Multi-Touch System =================
const move = { forward: false, back: false, left: false, right: false };
const velocity = new THREE.Vector3();
let verticalVelocity = 0;
let isGrounded = true;

function tryJump() {
  jumpBufferTimer = 0.18;
  if (isGrounded) {
    performJump();
  }
}

function performJump() {
  verticalVelocity = JUMP_SPEED;
  isGrounded = false;
  jumpBufferTimer = 0;
  playJump();

  // If jumping while sliding (Deadshot slide-hop / bunny-hop)
  if (isSliding || isDashing) {
    isSliding = false;
    isDashing = false;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const curSpeed = horizVelocity.length();
    const hopSpeed = Math.max(curSpeed, SLIDE_IMPULSE_SPEED * 0.96);
    horizVelocity.copy(forward).multiplyScalar(hopSpeed);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'F9') {
    e.preventDefault();
    toggleCollisionDebug();
    return;
  }
  if (e.code === 'Escape') {
    if (isMatchActive) {
      togglePauseModal();
      e.preventDefault();
      return;
    }
  }
  if (!isMatchActive) return;
  switch (e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.back = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
    case 'ShiftLeft':
    case 'ShiftRight':
      shiftPressed = true;
      triggerSlideDash();
      break;
    case 'KeyR': startReload(); break;
    case 'Space': tryJump(); break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.back = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
    case 'ShiftLeft':
    case 'ShiftRight':
      shiftPressed = false;
      break;
  }
});

document.addEventListener('mousemove', (e) => {
  if (controls.isLocked) {
    mouseMoveDeltaX += e.movementX || 0;
    mouseMoveDeltaY += e.movementY || 0;
  }
});

// Touch controls
const joystickZone = document.getElementById('joystickZone')!;
const joystickKnob = document.getElementById('joystickKnob')!;
const fireBtn = document.getElementById('fireBtn')!;
const adsBtn = document.getElementById('adsBtn')!;
const slideBtn = document.getElementById('slideBtn')!;
const reloadBtn = document.getElementById('reloadBtn')!;
const jumpBtn = document.getElementById('jumpBtn')!;

let joystickTouchId: number | null = null;
const joystickVector = { x: 0, y: 0 };
let joystickCenter = { x: 0, y: 0 };
const JOYSTICK_MAX_RADIUS = 42;

const activeTouchMap = new Map<number, { type: string; lastX?: number; lastY?: number }>();
let isFireButtonHeld = false;
const LOOK_SENSITIVITY = 0.0062;

function updateJoystickFromPos(clientX: number, clientY: number) {
  const dx = clientX - joystickCenter.x;
  const dy = clientY - joystickCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const clampedDist = Math.min(dist, JOYSTICK_MAX_RADIUS);
  const knobX = Math.cos(angle) * clampedDist;
  const knobY = Math.sin(angle) * clampedDist;
  joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
  joystickVector.x = knobX / JOYSTICK_MAX_RADIUS;
  joystickVector.y = -knobY / JOYSTICK_MAX_RADIUS;
}

window.addEventListener('touchstart', (e) => {
  if (!isMatchActive) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const target = document.elementFromPoint(t.clientX, t.clientY);

    if (joystickZone.contains(target)) {
      if (joystickTouchId === null) {
        joystickTouchId = t.identifier;
        const rect = joystickZone.getBoundingClientRect();
        joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        updateJoystickFromPos(t.clientX, t.clientY);
        activeTouchMap.set(t.identifier, { type: 'joystick' });
      }
      continue;
    }

    if (target === fireBtn) {
      isFireButtonHeld = true;
      fireBtn.classList.add('active');
      tryShoot();
      activeTouchMap.set(t.identifier, { type: 'fire_look', lastX: t.clientX, lastY: t.clientY });
      continue;
    }

    if (target === adsBtn) {
      setAimState(!isAiming);
      adsBtn.classList.toggle('active', isAiming);
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (target === slideBtn) {
      triggerSlideDash();
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (target === jumpBtn) {
      tryJump();
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (target === reloadBtn) {
      startReload();
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (target === micTouchBtn) {
      toggleMicMute();
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (target === audioRouteTouchBtn) {
      toggleAudioOutputMode();
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (gfxTouchBtn && target === gfxTouchBtn) {
      cycleGraphicsQuality();
      activeTouchMap.set(t.identifier, { type: 'btn' });
      continue;
    }

    if (t.clientX > window.innerWidth * 0.32) {
      activeTouchMap.set(t.identifier, { type: 'look', lastX: t.clientX, lastY: t.clientY });
    }
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (!isMatchActive) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];

    if (t.identifier === joystickTouchId) {
      updateJoystickFromPos(t.clientX, t.clientY);
      continue;
    }

    const touchData = activeTouchMap.get(t.identifier);
    if (touchData && (touchData.type === 'look' || touchData.type === 'fire_look')) {
      const dx = t.clientX - (touchData.lastX ?? t.clientX);
      const dy = t.clientY - (touchData.lastY ?? t.clientY);
      touchData.lastX = t.clientX;
      touchData.lastY = t.clientY;

      const sens = isAiming ? LOOK_SENSITIVITY * 0.5 : LOOK_SENSITIVITY;
      camera.rotation.y -= dx * sens;
      camera.rotation.x -= dy * sens;
      camera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.rotation.x));
      mouseMoveDeltaX += dx * 2.0;
      mouseMoveDeltaY += dy * 2.0;
    }
  }
}, { passive: false });

const handleTouchEnd = (e: TouchEvent) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];

    if (t.identifier === joystickTouchId) {
      joystickTouchId = null;
      joystickVector.x = 0;
      joystickVector.y = 0;
      joystickKnob.style.transform = `translate(0px, 0px)`;
    }

    const touchData = activeTouchMap.get(t.identifier);
    if (touchData && touchData.type === 'fire_look') {
      isFireButtonHeld = false;
      fireBtn.classList.remove('active');
    }

    activeTouchMap.delete(t.identifier);
  }
};

window.addEventListener('touchend', handleTouchEnd, { passive: false });
window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// ================= Bullets, Hitmarkers, Particles & Combat =================
// Supersonic high-velocity tracers (replaces blue bullet spheres)
const tracerGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.95, 5);
tracerGeo.rotateX(Math.PI / 2);
const tracerMatLocal = new THREE.MeshBasicMaterial({ color: 0xfff6cf });
const tracerMatRed = new THREE.MeshBasicMaterial({ color: 0xff2844 });
const tracerMatBlue = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
const bullets: THREE.Mesh[] = [];

// Wall Impact Spark Particles & Decals
interface SparkParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}
const sparkParticles: SparkParticle[] = [];
const sparkGeo = new THREE.BoxGeometry(0.04, 0.04, 0.04);
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd044 });

interface ImpactDecal {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}
const impactDecals: ImpactDecal[] = [];
const ringGeo = new THREE.RingGeometry(0.02, 0.11, 16);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xff9900, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });

function spawnWallImpactSparks(hitPos: THREE.Vector3, hitNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0)) {
  playWallRicochet();
  const sparkCount = 9 + Math.floor(Math.random() * 5);
  for (let s = 0; s < sparkCount; s++) {
    const spark = new THREE.Mesh(sparkGeo, sparkMat);
    spark.position.copy(hitPos);
    const vel = hitNormal.clone().multiplyScalar(4 + Math.random() * 4);
    vel.x += (Math.random() - 0.5) * 6;
    vel.y += Math.random() * 4 + 1.2;
    vel.z += (Math.random() - 0.5) * 6;
    scene.add(spark);
    sparkParticles.push({
      mesh: spark,
      velocity: vel,
      life: 0.35 + Math.random() * 0.2,
      maxLife: 0.55
    });
  }

  const decal = new THREE.Mesh(ringGeo, ringMat.clone());
  decal.position.copy(hitPos).addScaledVector(hitNormal, 0.02);
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), hitNormal);
  scene.add(decal);
  impactDecals.push({
    mesh: decal,
    life: 0.25,
    maxLife: 0.25
  });
}

// 3D Floating Holographic Damage Numbers
interface FloatingNumber {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}
const floatingNumbers: FloatingNumber[] = [];

function spawnDamageNumber(pos: THREE.Vector3, amount: number, isKill: boolean = false, isHeadshot: boolean = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 70;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.font = '900 32px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (isHeadshot) {
    ctx.fillStyle = '#ffdd00';
    ctx.shadowColor = 'rgba(255, 30, 75, 0.95)';
    ctx.shadowBlur = 14;
    ctx.fillText(isKill ? 'HEADSHOT' : `CRIT -${amount}`, 80, 35);
  } else if (isKill) {
    ctx.fillStyle = '#ff1744';
    ctx.shadowColor = 'rgba(255, 23, 68, 0.95)';
    ctx.shadowBlur = 10;
    ctx.fillText('ELIM', 80, 35);
  } else {
    ctx.fillStyle = amount >= 40 ? '#ffea00' : '#ffffff';
    ctx.shadowColor = 'rgba(0, 229, 255, 0.95)';
    ctx.shadowBlur = 8;
    ctx.fillText(`-${amount}`, 80, 35);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 1.0, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(isHeadshot ? 1.8 : 1.4, isHeadshot ? 0.8 : 0.7, 1);
  sprite.position.copy(pos).add(new THREE.Vector3(
    (Math.random() - 0.5) * 0.3,
    (isHeadshot ? 1.6 : 0.9) + Math.random() * 0.3,
    (Math.random() - 0.5) * 0.3
  ));
  scene.add(sprite);
  floatingNumbers.push({
    sprite,
    velocity: new THREE.Vector3((Math.random() - 0.5) * 0.5, 2.2, (Math.random() - 0.5) * 0.5),
    life: 0.7,
    maxLife: 0.7
  });
}

// Camera Trauma, Walking Bobbing & Recoil Kick
let cameraTrauma = 0;
let strafeTilt = 0;
let recoilKickZ = 0;
let recoilKickPitch = 0;
let recoilCamRecovery = 0;
let walkStepTimer = 0;
let walkBobY = 0;
let walkBobX = 0;
let lastStepTrough = false;

function addCameraTrauma(amount: number) {
  cameraTrauma = Math.min(1.0, cameraTrauma + amount);
}

function applyRecoilKick(weapon: WeaponDef) {
  const aimMult = isAiming ? 0.6 : 1.0;
  let kickZ = 0.052;
  let kickPitch = 0.036;
  let camPitchClimb = 0.012;
  let camYawJitter = 0.0035;
  let traumaVal = 0.09;

  // Differentiated recoil hierarchy:
  // 1. Lowest in Assault Rifle
  // 2. Then in SMG (noticeable rapid climb, lateral spray)
  // 3. High in Shotgun (heavy physical impulse, punchy kick)
  // 4. High / Highest in Sniper (massive railgun impulse, highest vertical climb, intense trauma)
  if (weapon.key === 'AR') {
    kickZ = 0.052 * aimMult;
    kickPitch = 0.036 * aimMult;
    camPitchClimb = 0.012 * aimMult;
    camYawJitter = 0.0035 * aimMult;
    traumaVal = 0.09;
  } else if (weapon.key === 'SMG') {
    kickZ = 0.082 * aimMult;
    kickPitch = 0.062 * aimMult;
    camPitchClimb = 0.024 * aimMult;
    camYawJitter = 0.011 * aimMult;
    traumaVal = 0.16;
  } else if (weapon.key === 'SHOTGUN') {
    kickZ = 0.19 * aimMult;
    kickPitch = 0.14 * aimMult;
    camPitchClimb = 0.068 * aimMult;
    camYawJitter = 0.018 * aimMult;
    traumaVal = 0.40;
  } else if (weapon.key === 'SNIPER') {
    kickZ = 0.28 * aimMult;
    kickPitch = 0.22 * aimMult;
    camPitchClimb = 0.112 * aimMult;
    camYawJitter = 0.014 * aimMult;
    traumaVal = 0.62;
  }

  recoilKickZ = Math.min(0.35, recoilKickZ + kickZ);
  recoilKickPitch = Math.min(0.28, recoilKickPitch + kickPitch);

  // Directly apply angular climb to camera pitch & slight random yaw jitter
  camera.rotation.x = Math.min(Math.PI / 2 - 0.04, camera.rotation.x + camPitchClimb);
  camera.rotation.y += (Math.random() - 0.5) * camYawJitter;

  // Buffer recovery so crosshair partially returns back toward center smoothly
  recoilCamRecovery = Math.min(0.16, recoilCamRecovery + camPitchClimb * 0.55);

  addCameraTrauma(traumaVal);
  weaponDynamics.applyKick(weapon.key, isAiming);
  triggerMuzzleFlash(weapon);
}

const hitmarker = document.getElementById('hitmarker')!;
const damageIndicatorEl = document.getElementById('damageIndicator')!;
let hitmarkerTimeout: any = null;
let damageIndicatorTimeout: any = null;

function flashBotHit(mesh: THREE.Group) {
  mesh.traverse((child: any) => {
    if (child.isMesh && child.material) {
      const origColor = child.material.color ? child.material.color.getHex() : null;
      if (child.material.emissive) {
        const origEmissive = child.material.emissive.getHex();
        child.material.emissive.setHex(0xffffff);
        setTimeout(() => {
          if (child.material && child.material.emissive) {
            child.material.emissive.setHex(origEmissive);
          }
        }, 80);
      }
    }
  });
}

function showHitmarker(isKill: boolean = false, isHeadshot: boolean = false, healthPercent: number = 1.0) {
  playHitmarker(isKill, isHeadshot, healthPercent);
  killFeedback.triggerHitVignette(isHeadshot);

  if (isKill) {
    addCameraTrauma(isHeadshot ? 0.32 : 0.22);
  }

  hitmarker.classList.remove('kill', 'headshot', 'active');
  void hitmarker.offsetWidth; // trigger reflow for smooth re-trigger animation

  const badge = document.getElementById('killConfirmBadge');
  if (badge) {
    if (isHeadshot && isKill) {
      badge.textContent = '🎯 HEADSHOT ELIM';
    } else if (isHeadshot) {
      badge.textContent = '🎯 HEADSHOT';
    } else if (isKill) {
      badge.textContent = 'ELIMINATED';
    } else {
      badge.textContent = '';
    }
  }

  if (isHeadshot) {
    hitmarker.classList.add('headshot');
  } else if (isKill) {
    hitmarker.classList.add('kill');
  }
  hitmarker.classList.add('active');

  clearTimeout(hitmarkerTimeout);
  hitmarkerTimeout = setTimeout(() => {
    hitmarker.classList.remove('active', 'kill', 'headshot');
  }, (isKill || isHeadshot) ? 280 : 95);
}

function showDamageTakenIndicator() {
  if (!damageIndicatorEl) return;
  damageIndicatorEl.classList.add('active');
  addCameraTrauma(0.38); // screen shake on taking hit
  clearTimeout(damageIndicatorTimeout);
  damageIndicatorTimeout = setTimeout(() => {
    damageIndicatorEl.classList.remove('active');
  }, 160);
}

function spawnRemoteTracer(origin: THREE.Vector3, dir: THREE.Vector3, team: string) {
  const tracer = new THREE.Mesh(tracerGeo, team === 'RED' ? tracerMatRed : tracerMatBlue);
  tracer.position.copy(origin);
  tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
  tracer.userData.velocity = dir.clone().multiplyScalar(95);
  tracer.userData.life = 1.0;
  scene.add(tracer);
  bullets.push(tracer);
}

function fireOnePellet(weapon: WeaponDef, pelletIndex: number = 0) {
  let dir = new THREE.Vector3();
  camera.getWorldDirection(dir);

  if (weapon.key === 'SHOTGUN') {
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    camRight.crossVectors(dir, camera.up).normalize();
    camUp.crossVectors(camRight, dir).normalize();
    dir = calculatePelletDirection(dir, camRight, camUp, pelletIndex, weapon.spread, isAiming);
  } else {
    const currentSpread = isAiming ? weapon.spread * 0.35 : weapon.spread;
    dir.x += (Math.random() - 0.5) * currentSpread;
    dir.y += (Math.random() - 0.5) * currentSpread;
    dir.z += (Math.random() - 0.5) * currentSpread;
    dir.normalize();
  }

  const bullet = new THREE.Mesh(tracerGeo, tracerMatLocal);
  bullet.position.copy(camera.position);
  bullet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
  bullet.userData.velocity = dir.clone().multiplyScalar(weapon.bulletSpeed * 1.3);
  bullet.userData.life = weapon.life;
  bullet.userData.damage = weapon.damage;
  bullet.userData.isLocal = true;
  bullet.userData.weaponKey = weapon.key;
  scene.add(bullet);
  bullets.push(bullet);

  if (networkManager && (weapon.key !== 'SHOTGUN' || pelletIndex === 0)) {
    networkManager.broadcast({
      type: 'shoot',
      ox: camera.position.x, oy: camera.position.y, oz: camera.position.z,
      dx: dir.x, dy: dir.y, dz: dir.z,
      team: myTeam
    });
  }
}

function tryShoot() {
  if (!isMatchActive || health <= 0) return;
  if (reloading || fireTimer > 0) return;

  const weapon = currentWeapon();
  const state = ammoState[currentWeaponIndex];

  if (gameMode !== 'NOAMMO') {
    if (state.mag <= 0) { startReload(); return; }
    state.mag -= 1;
  }

  // Ensure sound engine audio context is resumed for zero-latency shot sound
  const ctx = initSoundEngine();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  for (let p = 0; p < weapon.pellets; p++) fireOnePellet(weapon, p);
  applyRecoilKick(weapon);

  // Weapon audio feedback
  if (weapon.key === 'AR') playPulseAR();
  else if (weapon.key === 'SMG') playVectorSMG();
  else if (weapon.key === 'SHOTGUN') playShotgun();
  else if (weapon.key === 'SNIPER') playRailSniper();

  fireTimer = weapon.fireDelay;
  updateWeaponHud();
}

let isMouseDown = false;
document.addEventListener('mousedown', (e) => { 
  if (!isMatchActive || health <= 0) return;
  if (!isTouchDevice && !controls.isLocked) {
    safeLockPointer();
  }
  if (e.button === 0) { isMouseDown = true; tryShoot(); } 
  else if (e.button === 2) setAimState(true);
});

document.addEventListener('mouseup', (e) => { 
  if (e.button === 0) isMouseDown = false; 
  else if (e.button === 2) setAimState(false);
});

// Fallback mouse look when Pointer Lock is restricted or pending in iframe sandboxes
const _fallbackEuler = new THREE.Euler(0, 0, 0, 'YXZ');
window.addEventListener('mousemove', (e) => {
  if (!isMatchActive || isTouchDevice || controls.isLocked) return;
  const dx = e.movementX || 0;
  const dy = e.movementY || 0;
  if (dx === 0 && dy === 0) return;

  _fallbackEuler.setFromQuaternion(camera.quaternion);
  _fallbackEuler.y -= dx * 0.0022;
  _fallbackEuler.x -= dy * 0.0022;
  _fallbackEuler.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, _fallbackEuler.x));
  camera.quaternion.setFromEuler(_fallbackEuler);
});

function startReload() {
  if (gameMode === 'NOAMMO') return;
  const state = ammoState[currentWeaponIndex];
  const weapon = currentWeapon();
  if (reloading || state.mag >= weapon.mag || state.reserve <= 0) return;
  if (isAiming) setAimState(false);
  playReloadStart();
  reloading = true;
  reloadTimer = weapon.reload;
  reloadMsgEl.style.opacity = '1';
}

function finishReload() {
  const state = ammoState[currentWeaponIndex];
  const weapon = currentWeapon();
  const taken = Math.min(weapon.mag - state.mag, state.reserve);
  state.mag += taken;
  state.reserve -= taken;
  reloading = false;
  reloadMsgEl.style.opacity = '0';
  playReloadFinish();
  updateWeaponHud();
}

// ================= Main Loop =================
const clock = new THREE.Clock();
let clockElapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  clockElapsed += delta;

  // Match Timer
  if (isMatchActive) {
    timeRemaining -= delta;
    updateScoreboard();

    if (timeRemaining <= 0) {
      timeRemaining = 0;
      finishMatch();
    }
  }

  // Update active map atmosphere & animated effects
  activeMapResult?.update(delta, clockElapsed);

  // Jump buffer handling
  if (jumpBufferTimer > 0) {
    jumpBufferTimer -= delta;
    if (isGrounded && jumpBufferTimer > 0) {
      performJump();
    }
  }

  // Dash & Slide Timers & Camera Height Lerp (Deadshot.io slide mechanics)
  const isCrouchSlide = isDashing || isSliding || (shiftPressed && isGrounded);
  const targetEyeHeight = isCrouchSlide ? DASH_EYE_HEIGHT : NORMAL_EYE_HEIGHT;
  currentEyeHeight = THREE.MathUtils.lerp(currentEyeHeight, targetEyeHeight, delta * 16);

  if (isDashing) {
    dashTimeRemaining -= delta;
    if (dashTimeRemaining <= 0) {
      isDashing = false;
      isSliding = false;
      dashCooldownTimer = 0.12;
    }
  } else if (dashCooldownTimer > 0) {
    dashCooldownTimer -= delta;
  }

  // Dash Bar HUD
  const currentSpeedVal = horizVelocity.length();
  const isHighMomentum = currentSpeedVal > BASE_SPEED * 1.25;
  if (isDashing || isSliding) {
    dashBarEl.style.width = '100%';
    dashBarEl.style.background = '#39ff14';
    slideBtn.classList.add('active');
  } else if (isHighMomentum) {
    dashBarEl.style.width = '100%';
    dashBarEl.style.background = '#00e5ff';
    slideBtn.classList.remove('active');
  } else if (dashCooldownTimer > 0) {
    dashBarEl.style.width = (((0.12 - dashCooldownTimer) / 0.12) * 100) + '%';
    dashBarEl.style.background = '#ffaa00';
    slideBtn.classList.remove('active');
  } else {
    dashBarEl.style.width = '100%';
    dashBarEl.style.background = '#39ff14';
    slideBtn.classList.remove('active');
  }

  // Dynamic Speed FOV Punch (Deadshot.io kinetic speed feeling)
  let targetFov = isAiming ? currentWeapon().fov : DEFAULT_FOV;
  if (!isAiming) {
    const speedRatio = Math.max(0, (currentSpeedVal - BASE_SPEED) / Math.max(1, BASE_SPEED));
    const slidePunch = (isSliding || isDashing) ? 7.5 : 0;
    const speedPunch = Math.min(13, speedRatio * 14.5);
    targetFov = DEFAULT_FOV + slidePunch + speedPunch;
  }
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, delta * 15);
  camera.updateProjectionMatrix();

  // Recoil recovery & Camera Trauma decay
  recoilKickZ = THREE.MathUtils.lerp(recoilKickZ, 0, delta * 18);
  recoilKickPitch = THREE.MathUtils.lerp(recoilKickPitch, 0, delta * 20);
  cameraTrauma = Math.max(0, cameraTrauma - delta * 3.2);

  // Smooth angular recoil recovery (settles crosshair partially back toward target after shot)
  if (recoilCamRecovery > 0.0002 && fireTimer <= (currentWeapon().fireDelay * 0.72)) {
    const recoverStep = Math.min(recoilCamRecovery, (recoilCamRecovery * 4.2 + 0.04) * delta);
    camera.rotation.x = Math.max(-Math.PI / 2 + 0.04, camera.rotation.x - recoverStep);
    recoilCamRecovery -= recoverStep;
  }

  // Kinesthetic Dynamic Slide Camera Tilt (Dutch angle roll)
  const strafeInput = ((move.right ? 1 : 0) - (move.left ? 1 : 0)) + joystickVector.x;
  let targetRoll = 0;
  if (isSliding || isDashing) {
    // Dynamic Dutch-angle camera tilt: 4.2° to 5.0° roll into slide/strafe vector
    const slideRollDir = strafeInput !== 0 ? -Math.sign(strafeInput) * 0.082 : -0.068;
    targetRoll = slideRollDir;
  } else {
    // Subtle tactical roll on normal strafe
    targetRoll = -strafeInput * (isAiming ? 0.015 : 0.038);
  }
  strafeTilt = THREE.MathUtils.lerp(strafeTilt, targetRoll, delta * (isSliding || isDashing ? 14 : 10));

  // Procedural weapon sway, viewmodel inertia & physical gun kick
  weaponDynamics.update(delta, mouseMoveDeltaX, mouseMoveDeltaY, isAiming, currentWeapon().key === 'SNIPER');
  mouseMoveDeltaX = 0;
  mouseMoveDeltaY = 0;

  // Sniper Scope breath sway reticle drift
  if (isAiming && currentWeapon().key === 'SNIPER') {
    const sniperReticle = document.querySelector('.sniper-reticle') as HTMLElement;
    if (sniperReticle) {
      const bx = weaponDynamics.breathOffset.x * 2200;
      const by = weaponDynamics.breathOffset.y * 2200;
      sniperReticle.style.transform = `translate(calc(-50% + ${bx.toFixed(1)}px), calc(-50% + ${by.toFixed(1)}px))`;
    }
  }

  // Gun viewmodel alignment with walking bobbing, physical kick, and procedural spring sway
  const targetGunPos = isAiming ? ADS_GUN_POS : NORMAL_GUN_POS;
  const aimSwayFactor = isAiming ? 0.12 : 1.0;
  gunGroup.position.x = THREE.MathUtils.lerp(gunGroup.position.x, targetGunPos.x + (isAiming ? 0 : walkBobX * 0.35) + weaponDynamics.rotSway.y * aimSwayFactor * 0.35, delta * 24);
  gunGroup.position.y = THREE.MathUtils.lerp(gunGroup.position.y, targetGunPos.y + (isAiming ? 0 : walkBobY * 0.25) - weaponDynamics.rotSway.x * aimSwayFactor * 0.35 - weaponDynamics.kickPosY, delta * 24);
  gunGroup.position.z = THREE.MathUtils.lerp(gunGroup.position.z, targetGunPos.z + recoilKickZ + weaponDynamics.kickPosZ, delta * 24);
  gunGroup.rotation.x = THREE.MathUtils.lerp(gunGroup.rotation.x, recoilKickPitch + weaponDynamics.kickPitch + weaponDynamics.rotSway.x * aimSwayFactor, delta * 24);
  gunGroup.rotation.y = THREE.MathUtils.lerp(gunGroup.rotation.y, weaponDynamics.kickYaw + weaponDynamics.rotSway.y * aimSwayFactor, delta * 24);
  gunGroup.rotation.z = THREE.MathUtils.lerp(gunGroup.rotation.z, (isAiming ? 0 : strafeTilt * 0.75 + weaponDynamics.rotSway.z * aimSwayFactor), delta * 24);

  // Hologram Plaza Animation
  if (activeMapResult?.holoGemMesh) {
    activeMapResult.holoGemMesh.rotation.x += delta * 0.8;
    activeMapResult.holoGemMesh.rotation.y += delta * 1.2;
  }

  // Update Remote Players & Solo Bots
  remotePlayers.forEach((mesh) => {
    if (!mesh.visible || mesh.userData.alive === false) return;
    mesh.position.lerp(mesh.userData.targetPos, 0.2);
    mesh.rotation.y = THREE.MathUtils.lerp(mesh.rotation.y, mesh.userData.targetRotY, 0.2);
    if (mesh.userData.nameTag) {
      mesh.userData.nameTag.lookAt(camera.position);
    }
    if (mesh.userData.beaconLight) {
      const pulse = 0.75 + 0.25 * Math.sin(clockElapsed * 5);
      mesh.userData.beaconLight.scale.setScalar(pulse);
    }
  });

  // Solo mode AI bots update
  updateSoloBots(delta);

  // Spatial Audio Listener & Proximity Updates
  if (voiceAudioCtx && voiceAudioCtx.state === 'running') {
    const p = camera.position;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const up = camera.up;

    if (voiceAudioCtx.listener.positionX) {
      voiceAudioCtx.listener.positionX.setTargetAtTime(p.x, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.positionY.setTargetAtTime(p.y, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.positionZ.setTargetAtTime(p.z, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.forwardX.setTargetAtTime(fwd.x, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.forwardY.setTargetAtTime(fwd.y, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.forwardZ.setTargetAtTime(fwd.z, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.upX.setTargetAtTime(up.x, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.upY.setTargetAtTime(up.y, voiceAudioCtx.currentTime, 0.05);
      voiceAudioCtx.listener.upZ.setTargetAtTime(up.z, voiceAudioCtx.currentTime, 0.05);
    } else if (voiceAudioCtx.listener.setPosition) {
      voiceAudioCtx.listener.setPosition(p.x, p.y, p.z);
      voiceAudioCtx.listener.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z);
    }

    remoteVoices.forEach((voice, peerId) => {
      const playerMesh = remotePlayers.get(peerId);
      const mult = currentAudioOutputMode === 'SPEAKER' ? 2.4 : 1.0;
      if (!isMatchActive || !playerMesh) {
        if (voice.gain) voice.gain.gain.value = mult;
        return;
      }

      const targetPos = playerMesh.position;
      const dist = camera.position.distanceTo(targetPos);

      if (voice.gain) {
        voice.gain.gain.value = dist > MAX_PROXIMITY_DIST ? 0 : mult;
      }

      if (voice.panner) {
        if (voice.panner.positionX) {
          voice.panner.positionX.setTargetAtTime(targetPos.x, voiceAudioCtx!.currentTime, 0.05);
          voice.panner.positionY.setTargetAtTime(targetPos.y + 1.6, voiceAudioCtx!.currentTime, 0.05);
          voice.panner.positionZ.setTargetAtTime(targetPos.z, voiceAudioCtx!.currentTime, 0.05);
        } else if (voice.panner.setPosition) {
          voice.panner.setPosition(targetPos.x, targetPos.y + 1.6, targetPos.z);
        }
      }
    });
  }

  if (fireTimer > 0) fireTimer -= delta;
  if (isMouseDown || isFireButtonHeld) tryShoot();

  if (reloading) {
    reloadTimer -= delta;
    if (reloadTimer <= 0) finishReload();
  }

  // Health Regen
  if (health > 0 && health < MAX_HEALTH && (clockElapsed - lastDamageTime) > REGEN_DELAY) {
    health = Math.min(MAX_HEALTH, health + REGEN_RATE * delta);
    updateHealthDisplay();
  }

  // Movement & Collisions (Deadshot.io momentum, slide-hop & air-strafing)
  if (isMatchActive) {
    const forwardInput = ((move.forward ? 1 : 0) - (move.back ? 1 : 0)) + joystickVector.y;
    const rightInput = ((move.right ? 1 : 0) - (move.left ? 1 : 0)) + joystickVector.x;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

    const wishDir = new THREE.Vector3();
    wishDir.addScaledVector(forward, forwardInput);
    wishDir.addScaledVector(right, rightInput);
    const hasInput = wishDir.lengthSq() > 0.001;
    if (hasInput) wishDir.normalize();

    const maxRunSpeed = (gameMode === 'SPEED' ? BASE_SPEED * 1.8 : BASE_SPEED) * (isAiming ? 0.58 : 1.0);

    if (isGrounded) {
      if (isSliding || isDashing) {
        // Sliding: gently steerable along camera direction, low friction decay
        horizVelocity.lerp(forward.clone().multiplyScalar(horizVelocity.length()), delta * 3.5);
        horizVelocity.multiplyScalar(Math.pow(0.965, delta * 60));
      } else if (hasInput) {
        const targetVel = wishDir.clone().multiplyScalar(maxRunSpeed);
        horizVelocity.lerp(targetVel, delta * 15);
      } else {
        horizVelocity.multiplyScalar(Math.pow(0.70, delta * 60));
      }
    } else {
      // Airborne: air control and momentum conservation (jumping preserves run speed without acceleration boost)
      const currentAirSpeed = horizVelocity.length();
      if (hasInput) {
        if (currentAirSpeed > maxRunSpeed) {
          // Carrying high momentum (e.g. intentional slide-hop): preserve velocity magnitude and allow steering
          horizVelocity.lerp(wishDir.clone().multiplyScalar(currentAirSpeed), delta * 2.8);
          horizVelocity.multiplyScalar(Math.pow(0.994, delta * 60));
        } else {
          // Normal airborne movement: cap acceleration to maxRunSpeed so jumping never grants free slide speed
          const curProj = horizVelocity.dot(wishDir);
          const addSpeed = Math.max(0, maxRunSpeed - curProj);
          if (addSpeed > 0) {
            const accel = Math.min(addSpeed, 18.0 * delta);
            horizVelocity.addScaledVector(wishDir, accel);
          }
        }
      }
      if (horizVelocity.length() > MAX_AIR_SPEED) {
        horizVelocity.normalize().multiplyScalar(MAX_AIR_SPEED);
      }
    }

    velocity.copy(horizVelocity).multiplyScalar(delta);

    // Wall sliding resolution: test X and Z axes independently
    const feet = camera.position.y - currentEyeHeight;
    const headTop = feet + currentEyeHeight + 0.1;
    const PLAYER_COL_RADIUS = 0.28;

    const testX = camera.position.x + velocity.x;
    let blockedX = false;
    for (const p of colliders) {
      if (p.isCylinder && p.centerX !== undefined && p.centerZ !== undefined && p.radius !== undefined) {
        const dx = testX - p.centerX;
        const dz = camera.position.z - p.centerZ;
        const colDist = p.radius + PLAYER_COL_RADIUS;
        if (dx * dx + dz * dz < colDist * colDist) {
          if (!(feet >= p.top - 0.35) && !(headTop <= p.bottom + 0.05)) { blockedX = true; break; }
        }
      } else {
        if (testX >= p.minX && testX <= p.maxX && camera.position.z >= p.minZ && camera.position.z <= p.maxZ) {
          if (!(feet >= p.top - 0.35) && !(headTop <= p.bottom + 0.05)) { blockedX = true; break; }
        }
      }
    }
    if (!blockedX) camera.position.x = testX;
    else horizVelocity.x = 0;

    const testZ = camera.position.z + velocity.z;
    let blockedZ = false;
    for (const p of colliders) {
      if (p.isCylinder && p.centerX !== undefined && p.centerZ !== undefined && p.radius !== undefined) {
        const dx = camera.position.x - p.centerX;
        const dz = testZ - p.centerZ;
        const colDist = p.radius + PLAYER_COL_RADIUS;
        if (dx * dx + dz * dz < colDist * colDist) {
          if (!(feet >= p.top - 0.35) && !(headTop <= p.bottom + 0.05)) { blockedZ = true; break; }
        }
      } else {
        if (camera.position.x >= p.minX && camera.position.x <= p.maxX && testZ >= p.minZ && testZ <= p.maxZ) {
          if (!(feet >= p.top - 0.35) && !(headTop <= p.bottom + 0.05)) { blockedZ = true; break; }
        }
      }
    }
    if (!blockedZ) camera.position.z = testZ;
    else horizVelocity.z = 0;

    camera.position.x = Math.max(-HALF_W + 1.5, Math.min(HALF_W - 1.5, camera.position.x));
    camera.position.z = Math.max(-HALF_D + 1.5, Math.min(HALF_D - 1.5, camera.position.z));

    // Calculate realistic walking bobbing & footstep audio sync
    const horizSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z) / Math.max(0.001, delta);
    const isMoving = horizSpeed > 0.4 && isGrounded;

    if (isMoving) {
      const stepCadence = isDashing ? 18 : (horizSpeed > 7.5 ? 13 : 9.5);
      walkStepTimer += delta * stepCadence;

      const ampY = isAiming ? 0.012 : (isDashing ? 0.075 : 0.052);
      const ampX = isAiming ? 0.006 : 0.028;

      const targetBobY = Math.sin(walkStepTimer * 2) * ampY;
      const targetBobX = Math.cos(walkStepTimer) * ampX;
      walkBobY = THREE.MathUtils.lerp(walkBobY, targetBobY, delta * 16);
      walkBobX = THREE.MathUtils.lerp(walkBobX, targetBobX, delta * 16);

      // Trigger footstep sound on step trough
      const stepPhase = Math.sin(walkStepTimer * 2);
      if (stepPhase < -0.82) {
        if (!lastStepTrough) {
          lastStepTrough = true;
          playFootstep();
        }
      } else {
        lastStepTrough = false;
      }
    } else {
      walkBobY = THREE.MathUtils.lerp(walkBobY, 0, delta * 8);
      walkBobX = THREE.MathUtils.lerp(walkBobX, 0, delta * 8);
    }

    let surface = heightAt(camera.position.x, camera.position.z);
    for (const p of colliders) {
      if (p.isCylinder && p.centerX !== undefined && p.centerZ !== undefined && p.radius !== undefined) {
        const dx = camera.position.x - p.centerX;
        const dz = camera.position.z - p.centerZ;
        if (dx * dx + dz * dz <= p.radius * p.radius) {
          if (feet >= p.top - 0.35) surface = Math.max(surface, p.top);
        }
      } else {
        if (camera.position.x >= p.minX && camera.position.x <= p.maxX && camera.position.z >= p.minZ && camera.position.z <= p.maxZ) {
          if (feet >= p.top - 0.35) surface = Math.max(surface, p.top);
        }
      }
    }
    const groundY = surface + currentEyeHeight + walkBobY;

    verticalVelocity += GRAVITY * delta;
    camera.position.y += verticalVelocity * delta;
    if (camera.position.y <= groundY) {
      camera.position.y = groundY;
      verticalVelocity = 0;
      isGrounded = true;
    } else {
      isGrounded = false;
    }

    if (networkManager && (clockElapsed - networkManager.lastBroadcast > 0.05)) {
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const curRotY = Math.atan2(camDir.x, camDir.z);

      networkManager.broadcast({
        type: 'pos',
        id: networkManager.peer ? networkManager.peer.id : 'local',
        name: myPlayerName,
        team: myTeam,
        x: camera.position.x,
        y: camera.position.y - currentEyeHeight,
        z: camera.position.z,
        rotY: curRotY,
        hp: health,
        alive: health > 0 && isMatchActive
      });
      networkManager.lastBroadcast = clockElapsed;
    }
  }

  // Update Spark Particles
  for (let i = sparkParticles.length - 1; i >= 0; i--) {
    const sp = sparkParticles[i];
    sp.mesh.position.addScaledVector(sp.velocity, delta);
    sp.velocity.y -= 18 * delta; // gravity
    sp.life -= delta;
    const sc = Math.max(0, sp.life / sp.maxLife);
    sp.mesh.scale.setScalar(sc);
    if (sp.life <= 0) {
      scene.remove(sp.mesh);
      sparkParticles.splice(i, 1);
    }
  }

  // Update Impact Decals
  for (let i = impactDecals.length - 1; i >= 0; i--) {
    const dec = impactDecals[i];
    dec.life -= delta;
    const progress = 1 - (dec.life / dec.maxLife);
    dec.mesh.scale.setScalar(1 + progress * 1.5);
    (dec.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, dec.life / dec.maxLife);
    if (dec.life <= 0) {
      scene.remove(dec.mesh);
      (dec.mesh.material as THREE.Material).dispose();
      impactDecals.splice(i, 1);
    }
  }

  // Update 3D Floating Damage Numbers
  for (let i = floatingNumbers.length - 1; i >= 0; i--) {
    const fn = floatingNumbers[i];
    fn.sprite.position.addScaledVector(fn.velocity, delta);
    fn.velocity.y = Math.max(0.4, fn.velocity.y - delta * 3.5);
    fn.life -= delta;
    (fn.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, fn.life / fn.maxLife);
    if (fn.life <= 0) {
      scene.remove(fn.sprite);
      fn.sprite.material.dispose();
      floatingNumbers.splice(i, 1);
    }
  }

  // Bullets Simulation & Wall/PvP Hit Checks
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.position.addScaledVector(b.userData.velocity, delta);
    b.userData.life -= delta;

    let hit = false;
    if (b.userData.isLocal) {
      // Check hits against solo bots
      if (isSoloMode) {
        for (const bot of botManager.bots) {
          if (!bot.alive || bot.team === myTeam) continue;
          const botCenter = bot.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
          if (b.position.distanceTo(botCenter) < 1.15) {
            const isHeadshot = b.position.y >= bot.pos.y + 1.40;
            const finalDmg = isHeadshot ? Math.round(b.userData.damage * 2.0) : b.userData.damage;
            const isKill = botManager.damageBot(bot, finalDmg, myPlayerName, myTeam, camera.position);
            flashBotHit(bot.mesh);
            spawnDamageNumber(bot.pos, finalDmg, isKill, isHeadshot);
            if (isKill) {
              handleBotDeath(bot, myPlayerName, myTeam);
              const dist = camera.position.distanceTo(bot.pos);
              killFeedback.recordKill({
                victimName: `[BOT] ${bot.name}`,
                victimTeam: bot.team,
                weaponName: currentWeapon().name.split('//')[0].trim(),
                distanceMeters: dist,
                isHeadshot
              });
              showHitmarker(true, isHeadshot);
            } else {
              showHitmarker(false, isHeadshot, bot.hp / bot.maxHp);
            }
            hit = true;
            break;
          }
        }
      }

      // Check hits against remote multiplayer players
      if (!hit) {
        for (const [peerId, rPlayer] of remotePlayers.entries()) {
          if (!rPlayer.visible || rPlayer.userData.alive === false) continue;
          if (rPlayer.userData.team === myTeam) continue;

          const playerCenter = rPlayer.position.clone().add(new THREE.Vector3(0, 1.0, 0));
          if (b.position.distanceTo(playerCenter) < 1.1) {
            const isHeadshot = b.position.y >= rPlayer.position.y + 1.40;
            const finalDmg = isHeadshot ? Math.round(b.userData.damage * 2.0) : b.userData.damage;
            showHitmarker(false, isHeadshot);
            spawnDamageNumber(rPlayer.position, finalDmg, false, isHeadshot);

            if (networkManager) {
              networkManager.broadcast({
                type: 'damage',
                targetId: peerId,
                attackerName: myPlayerName,
                attackerTeam: myTeam,
                attackerId: networkManager.peer ? networkManager.peer.id : 'local',
                dmg: finalDmg,
                isHeadshot
              });
            }
            hit = true;
            break;
          }
        }
      }

      // Check wall / collider hits & spawn wall sparks
      if (!hit) {
        for (const p of colliders) {
          if (b.position.x >= p.minX && b.position.x <= p.maxX &&
              b.position.z >= p.minZ && b.position.z <= p.maxZ &&
              b.position.y >= p.bottom && b.position.y <= p.top) {
            hit = true;
            spawnWallImpactSparks(b.position, new THREE.Vector3(0, 0.6, 0));
            break;
          }
        }
      }

      // Check floor / terrain impact & spawn floor sparks
      if (!hit && b.position.y <= heightAt(b.position.x, b.position.z) + 0.1) {
        hit = true;
        spawnWallImpactSparks(b.position, new THREE.Vector3(0, 1, 0));
      }
    } else if (b.userData.isBotBullet) {
      // 1. Check hit against local player
      if (b.userData.attackerTeam !== myTeam && health > 0) {
        const playerCenter = camera.position.clone();
        playerCenter.y -= currentEyeHeight * 0.45;
        if (b.position.distanceTo(playerCenter) < 1.05) {
          hit = true;
          takeDamage(b.userData.damage, b.userData.attackerName, b.userData.attackerTeam, b.userData.attackerId);
        }
      }

      // 2. Check hit against opposing bots (bot vs bot crossfire)
      if (!hit && isSoloMode) {
        for (const targetBot of botManager.bots) {
          if (!targetBot.alive || targetBot.team === b.userData.attackerTeam || targetBot.id === b.userData.attackerId) continue;
          const targetCenter = targetBot.pos.clone().add(new THREE.Vector3(0, 1.0, 0));
          if (b.position.distanceTo(targetCenter) < 1.15) {
            const isKill = botManager.damageBot(targetBot, b.userData.damage, b.userData.attackerName, b.userData.attackerTeam);
            flashBotHit(targetBot.mesh);
            if (isKill) {
              handleBotDeath(targetBot, b.userData.attackerName, b.userData.attackerTeam);
            }
            hit = true;
            break;
          }
        }
      }

      // 3. Check collider occlusion
      if (!hit) {
        for (const p of colliders) {
          if (b.position.x >= p.minX && b.position.x <= p.maxX &&
              b.position.z >= p.minZ && b.position.z <= p.maxZ &&
              b.position.y >= p.bottom && b.position.y <= p.top) {
            hit = true;
            spawnWallImpactSparks(b.position, new THREE.Vector3(0, 0.6, 0));
            break;
          }
        }
      }

      // 4. Check floor impact
      if (!hit && b.position.y <= heightAt(b.position.x, b.position.z) + 0.1) {
        hit = true;
        spawnWallImpactSparks(b.position, new THREE.Vector3(0, 1, 0));
      }
    } else {
      // Remote multiplayer bullets: check colliders and floor
      for (const p of colliders) {
        if (b.position.x >= p.minX && b.position.x <= p.maxX &&
            b.position.z >= p.minZ && b.position.z <= p.maxZ &&
            b.position.y >= p.bottom && b.position.y <= p.top) {
          hit = true;
          spawnWallImpactSparks(b.position, new THREE.Vector3(0, 0.6, 0));
          break;
        }
      }
      if (!hit && b.position.y <= heightAt(b.position.x, b.position.z) + 0.1) {
        hit = true;
        spawnWallImpactSparks(b.position, new THREE.Vector3(0, 1, 0));
      }
    }

    if (hit || b.userData.life <= 0) {
      scene.remove(b);
      bullets.splice(i, 1);
    }
  }

  // Apply Screen Shake & Strafe Roll for the render pass
  const savedCamQuat = camera.quaternion.clone();

  if (cameraTrauma > 0.001 || Math.abs(strafeTilt) > 0.001) {
    const traumaSq = cameraTrauma * cameraTrauma;
    const shakePitch = traumaSq * Math.sin(clockElapsed * 50) * 0.022;
    const shakeYaw = traumaSq * Math.cos(clockElapsed * 42) * 0.018;
    const shakeRoll = traumaSq * Math.sin(clockElapsed * 56) * 0.03 + strafeTilt;

    const shakeEuler = new THREE.Euler(shakePitch, shakeYaw, shakeRoll, 'YXZ');
    const shakeQuat = new THREE.Quaternion().setFromEuler(shakeEuler);
    camera.quaternion.multiply(shakeQuat);
  }

  renderer.render(scene, camera);

  // Restore pure camera orientation so pointer controls and aim never drift
  camera.quaternion.copy(savedCamQuat);
}

updateScoreboard();
updateWeaponHud();
updateMicHudDisplay();
updateAudioRouteUI();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
