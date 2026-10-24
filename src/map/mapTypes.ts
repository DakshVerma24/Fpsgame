import * as THREE from 'three';

export interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  top: number;
  bottom: number;
  isCylinder?: boolean;
  centerX?: number;
  centerZ?: number;
  radius?: number;
}

export type HeightAtFunction = (x: number, z: number) => number;

export interface MapContext {
  scene: THREE.Scene;
  colliders: Collider[];
  heightAt: HeightAtFunction;
  halfW: number;
  halfD: number;
  addCollider: (x: number, y: number, z: number, w: number, h: number, d: number) => void;
  addFoundation: (w: number, d: number, x: number, z: number, bottomH?: number) => void;
  clutterGroup?: THREE.Group;
}

export interface BuildingOptions {
  w: number;
  h: number;
  d: number;
  x: number;
  z: number;
  baseMaterial: THREE.Material;
  trimColor?: number;
  hasBalconies?: boolean;
  hasStorefront?: boolean;
  hasRoofGear?: boolean;
  hasConduits?: boolean;
}
