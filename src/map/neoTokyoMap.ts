import * as THREE from 'three';
import { Collider, HeightAtFunction } from './mapTypes';
import { UpgradedMapResult } from './mapBuilder';
import { loadNeoTokyoModel, instantiateNeoTokyoModel, generateNeoTokyoColliders } from './glbModelLoader';

// Global state for map animations (defaults to ON; synced across online lobbies)
let mapAnimationsActive = true;
try {
  const saved = localStorage.getItem('neo_tokyo_animations');
  if (saved !== null) {
    mapAnimationsActive = saved !== 'false';
  }
} catch (_) {}

export function isMapAnimationsActive(): boolean {
  return mapAnimationsActive;
}

export function setMapAnimationsActive(active: boolean) {
  mapAnimationsActive = active;
  try {
    localStorage.setItem('neo_tokyo_animations', active ? 'true' : 'false');
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('map-animations-toggle', { detail: { active } }));
}

/**
 * Littlest Neo Tokyo Map:
 * Loads the Littlest Neo Tokyo GLB directly using Three.js GLTFLoader,
 * carefully deep-cloning all physical meshes while filtering out corrupted outline shells.
 */
export function buildNeoTokyoMap(
  scene: THREE.Scene,
  colliders: Collider[],
  _heightAt: HeightAtFunction,
  _halfW: number,
  _halfD: number,
  onModelLoaded?: () => void
): UpgradedMapResult {
  const mapGroup = new THREE.Group();
  mapGroup.name = 'NeoTokyo_Map_Group';
  scene.add(mapGroup);

  // Train live collision boxes
  const trainCar1Collider: Collider = {
    minX: 18.0,
    maxX: 21.0,
    minZ: -29.0,
    maxZ: -21.0,
    top: 3.5,
    bottom: 0.0
  };
  const trainCar2Collider: Collider = {
    minX: 15.0,
    maxX: 18.0,
    minZ: -29.0,
    maxZ: -21.0,
    top: 3.5,
    bottom: 0.0
  };
  colliders.push(trainCar1Collider, trainCar2Collider);

  let mixer: THREE.AnimationMixer | null = null;
  let animAction: THREE.AnimationAction | null = null;
  let trainCar1Obj: THREE.Object3D | null = null;
  let trainCar2Obj: THREE.Object3D | null = null;
  const tempBox = new THREE.Box3();

  // Load GLTF directly using Three.js GLTFLoader
  loadNeoTokyoModel()
    .then((gltf) => {
      // Carefully deep-clone physical meshes, strip outline hulls, and calibrate PBR materials
      const { model, animations } = instantiateNeoTokyoModel(gltf);

      // Put the pristine cloned meshes directly into the map
      mapGroup.add(model);

      // Register detailed colliders (diagonal building walls, solid core blocks, poles)
      generateNeoTokyoColliders(model, colliders);

      // Setup AnimationMixer directly on model
      if (animations && animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        animAction = mixer.clipAction(animations[0]);
        animAction.setLoop(THREE.LoopRepeat, Infinity);
        animAction.play();
        if (!mapAnimationsActive) {
          animAction.paused = true;
        }
      }

      // Track train car meshes for dynamic moving collision
      trainCar1Obj = model.getObjectByName('Object680') || null;
      trainCar2Obj = model.getObjectByName('Object681') || null;

      if (onModelLoaded) {
        onModelLoaded();
      }
      window.dispatchEvent(new CustomEvent('map-model-ready', { detail: { mapId: 'NEO_TOKYO' } }));
    })
    .catch((err) => {
      console.warn('Could not load Neo Tokyo model:', err);
      if (onModelLoaded) {
        onModelLoaded();
      }
      window.dispatchEvent(new CustomEvent('map-model-ready', { detail: { mapId: 'NEO_TOKYO' } }));
    });

  // Listen for real-time animation toggle changes (from UI or lobby sync)
  const onAnimToggle = (e: Event) => {
    const customEvt = e as CustomEvent<{ active: boolean }>;
    const active = customEvt.detail?.active ?? mapAnimationsActive;
    if (animAction) {
      animAction.paused = !active;
    }
  };
  window.addEventListener('map-animations-toggle', onAnimToggle);

  return {
    update: (delta: number, _elapsed: number) => {
      if (mixer && mapAnimationsActive) {
        mixer.update(delta);
      }
      if (trainCar1Obj) {
        tempBox.setFromObject(trainCar1Obj);
        trainCar1Collider.minX = tempBox.min.x - 0.15;
        trainCar1Collider.maxX = tempBox.max.x + 0.15;
        trainCar1Collider.minZ = tempBox.min.z - 0.15;
        trainCar1Collider.maxZ = tempBox.max.z + 0.15;
        trainCar1Collider.bottom = tempBox.min.y;
        trainCar1Collider.top = tempBox.max.y;
      }
      if (trainCar2Obj) {
        tempBox.setFromObject(trainCar2Obj);
        trainCar2Collider.minX = tempBox.min.x - 0.15;
        trainCar2Collider.maxX = tempBox.max.x + 0.15;
        trainCar2Collider.minZ = tempBox.min.z - 0.15;
        trainCar2Collider.maxZ = tempBox.max.z + 0.15;
        trainCar2Collider.bottom = tempBox.min.y;
        trainCar2Collider.top = tempBox.max.y;
      }
    },
    holoGemMesh: null
  };
}
