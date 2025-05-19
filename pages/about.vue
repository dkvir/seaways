<template>
  <div class="about">
    <canvas class="canvas"></canvas>
  </div>
</template>

<script setup>
import * as THREE from "three";
import * as CANNON from "cannon-es";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let stats;
let camera, scene, renderer, controls;
let waterClass, modelClass;
let light,
  lightShift = new THREE.Vector3(0, 1, 0);
let clock, delta;
let world, cannonDebugRenderer;
let wakeEffect;

const waves = [
  {
    direction: 0,
    steepness: 0.1,
    wavelength: 57.2,
  },
  {
    direction: 306,
    steepness: 0.2,
    wavelength: 32,
  },
  {
    direction: 176,
    steepness: 0.2,
    wavelength: 59,
  },
];

onMounted(() => {
  init();
  animate();
  useGui(waterClass.getWater(), waves, scene, cannonDebugRenderer);
});

function init() {
  renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector(".canvas"),
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x909497);
  camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    1,
    50000
  );
  camera.position.set(30, 30, 100);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 0, 0);

  light = new THREE.DirectionalLight();
  light.castShadow = true;
  light.shadow.mapSize.width = 512;
  light.shadow.mapSize.height = 512;
  light.shadow.camera.near = 0.001;
  light.shadow.camera.far = 10;
  light.shadow.camera.top = 10;
  light.shadow.camera.bottom = -10;
  light.shadow.camera.left = -10;
  light.shadow.camera.right = 10;
  scene.add(light);
  scene.add(light.target);

  world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);

  waterClass = new useWater(scene, waves);
  waterClass.createWater();
  scene.add(waterClass.getWater());

  modelClass = new useModel(
    scene,
    renderer,
    world,
    waterClass.getWater(),
    waves
  );
  modelClass.loadGLBModel(
    "/mesh/boat.glb",
    new THREE.Vector3(0, 2, 0),
    new THREE.Vector3(1, 1, 1),
    new THREE.Vector3(0, 0, 0)
  );

  wakeEffect = new useWake(scene, modelClass.model, waterClass.getWater());
  wakeEffect.init();

  const sky = new useSun(scene, renderer, waterClass.getWater());
  sky.updateSun();

  stats = Stats();
  document.body.appendChild(stats.dom);

  window.addEventListener("resize", onWindowResize);
  clock = new THREE.Clock();
  cannonDebugRenderer = new useBoatPhysics(scene, world);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  delta = Math.min(clock.getDelta(), 0.1);

  if (modelClass.getModelBody()) {
    if (clock.elapsedTime < 2) {
      const stabForce = new CANNON.Vec3(0, 150, 0);
      modelClass
        .getModelBody()
        .applyForce(stabForce, modelClass.getModelBody().position);

      const upVector = new CANNON.Vec3(0, 1, 0);
      const currentUp = new CANNON.Vec3();
      modelClass
        .getModelBody()
        .vectorToWorldFrame(new CANNON.Vec3(0, 1, 0), currentUp);

      const targetQuat = new CANNON.Quaternion();
      targetQuat.setFromVectors(currentUp, upVector);

      const torque = new CANNON.Vec3(
        targetQuat.x * 15.0,
        targetQuat.y * 15.0,
        targetQuat.z * 15.0
      );

      modelClass
        .getModelBody()
        .torque.vadd(torque, modelClass.getModelBody().torque);

      modelClass
        .getModelBody()
        .velocity.scale(0.8, modelClass.getModelBody().velocity);
      modelClass
        .getModelBody()
        .angularVelocity.scale(0.8, modelClass.getModelBody().angularVelocity);
    }

    modelClass.applyBuoyancyForce();
    modelClass.updateMixer(delta);

    if (wakeEffect) {
      wakeEffect.update(
        modelClass.getModelBody().position,
        modelClass.getModelBody().quaternion
      );
    }

    if (cannonDebugRenderer) {
      cannonDebugRenderer.update();
    }
  }

  world.step(delta);
  modelClass.updateModelMesh();

  waterClass.getWater().material.uniforms["time"].value += delta;
  light.position.copy(light.target.position).add(lightShift);

  render();
  stats.update();
  controls.update();
}

function render() {
  renderer.render(scene, camera);
}
</script>

<style lang="scss" scoped></style>
