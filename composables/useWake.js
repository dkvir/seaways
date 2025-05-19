import * as THREE from "three";

export const useWake = class WakeEffect {
  constructor(scene, boatObject, mainWater) {
    this.scene = scene;
    this.boat = boatObject;
    this.mainWater = mainWater;
  }

  init() {}
};
