import * as THREE from "three";
import { Sky } from "three/examples/jsm/objects/Sky";

export const useSun = class Sun {
  constructor(scene, renderer, water) {
    this.scene = scene;
    this.renderer = renderer;
    this.water = water;

    this.sun = new THREE.Vector3();
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    this.scene.add(this.sky);

    this.skyUniforms = this.sky.material.uniforms;

    this.skyUniforms["turbidity"].value = 10;
    this.skyUniforms["rayleigh"].value = 2;
    this.skyUniforms["mieCoefficient"].value = 0.005;
    this.skyUniforms["mieDirectionalG"].value = 0.8;

    this.parameters = {
      elevation: 2,
      azimuth: 180,
    };

    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
  }

  updateSun() {
    const phi = THREE.MathUtils.degToRad(90 - this.parameters.elevation);
    const theta = THREE.MathUtils.degToRad(this.parameters.azimuth);

    this.sun.setFromSphericalCoords(1, phi, theta);

    this.sky.material.uniforms["sunPosition"].value.copy(this.sun);
    this.water.material.uniforms["sunDirection"].value
      .copy(this.sun)
      .normalize();

    this.scene.environment = this.pmremGenerator.fromScene(this.sky).texture;
  }
};
