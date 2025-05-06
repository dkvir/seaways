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
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

var stats;
var camera, scene, renderer, controls;
var waterClass, water;
var light,
  lightShift = new THREE.Vector3(0, 1, 0);
var clock, delta;
var world, cannonDebugRenderer;

var model;
var modelMesh;
var modelBody;

var bodyToMeshOffsetX = 7; // Adjust these values to align the mesh with the physics body
var bodyToMeshOffsetY = -10; // Increase to move mesh up relative to physics body
var bodyToMeshOffsetZ = 10; // Adjust forward/backward alignment

const waves = [
  {
    direction: 45,
    steepness: 0.1,
    wavelength: 7,
  },
  {
    direction: 306,
    steepness: 0.2,
    wavelength: 32,
  },
  {
    direction: 196,
    steepness: 0.3,
    wavelength: 59,
  },
];

onMounted(() => {
  init();
  animate();
  useGui(water, waves, scene, cannonDebugRenderer);
});

function getWaveInfo(x, z, time) {
  const pos = new THREE.Vector3();
  const tangent = new THREE.Vector3(1, 0, 0);
  const binormal = new THREE.Vector3(0, 0, 1);
  Object.keys(waves).forEach((wave) => {
    const w = waves[wave];
    const k = (Math.PI * 2) / w.wavelength;
    const c = Math.sqrt(9.8 / k);
    const d = new THREE.Vector2(
      Math.sin((w.direction * Math.PI) / 180),
      -Math.cos((w.direction * Math.PI) / 180)
    );
    const f = k * (d.dot(new THREE.Vector2(x, z)) - c * time);
    const a = w.steepness / k;
    pos.x += d.y * (a * Math.cos(f));
    pos.y += a * Math.sin(f);
    pos.z += d.x * (a * Math.cos(f));
    tangent.x += -d.x * d.x * (w.steepness * Math.sin(f));
    tangent.y += d.x * (w.steepness * Math.cos(f));
    tangent.z += -d.x * d.y * (w.steepness * Math.sin(f));
    binormal.x += -d.x * d.y * (w.steepness * Math.sin(f));
    binormal.y += d.y * (w.steepness * Math.cos(f));
    binormal.z += -d.y * d.y * (w.steepness * Math.sin(f));
  });
  const normal = binormal.cross(tangent).normalize();
  return {
    position: pos,
    normal: normal,
  };
}

function loadGLBModel(modelPath, position, scale, rotation) {
  const loader = new GLTFLoader();

  loader.load(
    modelPath,
    function (gltf) {
      model = gltf.scene;

      if (scale) {
        model.scale.set(scale.x, scale.y, scale.z);
      }

      if (position) {
        model.position.set(position.x, position.y, position.z);
      }

      if (rotation) {
        model.rotation.set(rotation.x, rotation.y, rotation.z);
      }

      model.traverse(function (child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = false;
          child.material.depthWrite = true;
          child.material.flatShading = false;
          child.material.transparent = false;
          modelMesh = child;
        }
      });

      scene.add(model);
      console.log("Model loaded successfully:", modelPath);

      createModelPhysics(position);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.error("An error occurred loading the model:", error);
    }
  );
}
function createModelPhysics(position) {
  const hullWidth = 70;
  const hullHeight = 50;
  const hullLength = 190;

  // Apply the inverse offset when creating the physics body
  // This ensures the physics body is positioned correctly relative to the mesh
  modelBody = new CANNON.Body({
    mass: 50,
    position: new CANNON.Vec3(
      position.x - bodyToMeshOffsetX,
      position.y - bodyToMeshOffsetY,
      position.z - bodyToMeshOffsetZ
    ),
    // Initialize with zero velocity to prevent immediate sinking
    velocity: new CANNON.Vec3(0, 0, 0),
    angularVelocity: new CANNON.Vec3(0, 0, 0),
    material: new CANNON.Material({
      friction: 0.3,
      restitution: 0.3,
    }),
  });

  // Calculate center offset for the physics shapes
  const centerOffsetX = 0;
  const centerOffsetY = 2;
  const centerOffsetZ = 0;

  // Main hull shape
  const hullShape = new CANNON.Box(
    new CANNON.Vec3(hullWidth / 2, hullHeight / 2, hullLength / 2)
  );
  modelBody.addShape(
    hullShape,
    new CANNON.Vec3(centerOffsetX, centerOffsetY, centerOffsetZ)
  );

  // Add a deeper keel for better stability
  const keelShape = new CANNON.Box(new CANNON.Vec3(1, 4, hullLength / 2));
  modelBody.addShape(
    keelShape,
    new CANNON.Vec3(centerOffsetX, centerOffsetY - 4, centerOffsetZ)
  );

  // Add side stabilizers
  const leftStabilizerShape = new CANNON.Box(
    new CANNON.Vec3(3, 1, hullLength / 3)
  );
  modelBody.addShape(
    leftStabilizerShape,
    new CANNON.Vec3(
      centerOffsetX - hullWidth / 3,
      centerOffsetY - 1,
      centerOffsetZ
    )
  );

  const rightStabilizerShape = new CANNON.Box(
    new CANNON.Vec3(3, 1, hullLength / 3)
  );
  modelBody.addShape(
    rightStabilizerShape,
    new CANNON.Vec3(
      centerOffsetX + hullWidth / 3,
      centerOffsetY - 1,
      centerOffsetZ
    )
  );

  world.addBody(modelBody);

  // Physics properties for better water behavior
  modelBody.linearDamping = 0.5;
  modelBody.angularDamping = 0.9;

  // Define buoyancy points for more realistic water interaction
  modelBody.buoyancyPoints = [
    // Hull corners
    new CANNON.Vec3(
      -hullWidth / 2 + centerOffsetX,
      centerOffsetY,
      -hullLength / 2 + centerOffsetZ
    ),
    new CANNON.Vec3(
      hullWidth / 2 + centerOffsetX,
      centerOffsetY,
      -hullLength / 2 + centerOffsetZ
    ),
    new CANNON.Vec3(
      -hullWidth / 2 + centerOffsetX,
      centerOffsetY,
      hullLength / 2 + centerOffsetZ
    ),
    new CANNON.Vec3(
      hullWidth / 2 + centerOffsetX,
      centerOffsetY,
      hullLength / 2 + centerOffsetZ
    ),

    // Middle points for stability
    new CANNON.Vec3(centerOffsetX, centerOffsetY - 1, centerOffsetZ), // Middle
    new CANNON.Vec3(centerOffsetX, centerOffsetY - 3, centerOffsetZ), // Lower middle

    // Front and back centerline points
    new CANNON.Vec3(
      centerOffsetX,
      centerOffsetY,
      -hullLength / 2 + centerOffsetZ
    ),
    new CANNON.Vec3(
      centerOffsetX,
      centerOffsetY,
      hullLength / 2 + centerOffsetZ
    ),

    // Side center points
    new CANNON.Vec3(
      -hullWidth / 2 + centerOffsetX,
      centerOffsetY,
      centerOffsetZ
    ),
    new CANNON.Vec3(
      hullWidth / 2 + centerOffsetX,
      centerOffsetY,
      centerOffsetZ
    ),

    // Extra keel points for better wave response
    new CANNON.Vec3(
      centerOffsetX,
      centerOffsetY - 4,
      -hullLength / 4 + centerOffsetZ
    ),
    new CANNON.Vec3(
      centerOffsetX,
      centerOffsetY - 4,
      hullLength / 4 + centerOffsetZ
    ),
  ];
}

function applyBuoyancyForce() {
  if (!modelBody || !water) return;

  // Increase water density for better flotation behavior
  const waterDensity = 2.5;
  const t = water.material.uniforms["time"].value;
  let submergedPoints = 0;

  const boatPos = modelBody.position;
  const boatQuat = modelBody.quaternion;

  // Apply buoyancy force to each defined point
  for (const localPoint of modelBody.buoyancyPoints) {
    const worldPoint = new CANNON.Vec3();
    modelBody.pointToWorldFrame(localPoint, worldPoint);

    // Get wave height at this position
    const waveInfo = getWaveInfo(worldPoint.x, worldPoint.z, t);
    const waveHeight = waveInfo.position.y;

    // Calculate submersion depth
    const depth = waveHeight - worldPoint.y;

    if (depth > 0) {
      submergedPoints++;

      // Calculate and apply buoyancy force - stronger at deeper points
      const buoyancyMultiplier = 1.8; // Increased from 1.5
      const force = new CANNON.Vec3(
        0,
        waterDensity * 9.82 * depth * buoyancyMultiplier,
        0
      );
      modelBody.applyForce(force, worldPoint);

      // Apply drag force when moving through water
      if (modelBody.velocity.length() > 0.1) {
        const pointVel = new CANNON.Vec3();
        modelBody.getVelocityAtWorldPoint(worldPoint, pointVel);

        // Higher drag for deeper parts and faster movement
        const dragCoefficient = 0.3; // Increased from 0.2
        const dragForce = pointVel.scale(-dragCoefficient * depth);
        modelBody.applyForce(dragForce, worldPoint);
      }
    }
  }

  // Apply wave alignment forces if at least one point is submerged
  if (submergedPoints > 0) {
    const waveInfo = getWaveInfo(boatPos.x, boatPos.z, t);
    const waveNormal = new CANNON.Vec3(
      waveInfo.normal.x,
      waveInfo.normal.y,
      waveInfo.normal.z
    );

    const upVector = new CANNON.Vec3(0, 1, 0);

    // Calculate the rotation needed to align with wave surface
    const localUpVector = new CANNON.Vec3();
    const invQuat = boatQuat.inverse();
    invQuat.vmult(upVector, localUpVector);

    const targetQuat = new CANNON.Quaternion();
    targetQuat.setFromVectors(localUpVector, waveNormal);

    // Apply torque to rotate toward wave normal
    const alignmentForce = 0.5; // Slight increase from 0.4
    const torque = new CANNON.Vec3(
      targetQuat.x * alignmentForce,
      targetQuat.y * alignmentForce,
      targetQuat.z * alignmentForce
    );

    modelBody.torque.vadd(torque, modelBody.torque);

    // Add additional stability force when boat is tilting too much
    const keelPoint = new CANNON.Vec3(0, -0.8, 0);
    const keelWorldPoint = new CANNON.Vec3();
    modelBody.pointToWorldFrame(keelPoint, keelWorldPoint);

    const worldUp = new CANNON.Vec3(0, 1, 0);
    const boatUp = new CANNON.Vec3();
    modelBody.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0), boatUp);

    // Calculate how much the boat is tilting (1 = perfectly upright, 0 = sideways)
    const tiltDot = worldUp.dot(boatUp);

    // Apply strong righting force if the boat is tilting too much
    if (tiltDot < 0.8) {
      // Increased threshold from 0.7
      const stabForce = new CANNON.Vec3(0, 40 * (1 - tiltDot), 0); // Increased from 30
      modelBody.applyForce(stabForce, keelWorldPoint);
    }
  }
}

function updateModelMesh() {
  if (modelBody && model) {
    // Apply the visual mesh position with offsets from the physics body
    model.position.set(
      modelBody.position.x + bodyToMeshOffsetX,
      modelBody.position.y + bodyToMeshOffsetY,
      modelBody.position.z + bodyToMeshOffsetZ
    );

    // Copy the rotation from the physics body
    model.quaternion.set(
      modelBody.quaternion.x,
      modelBody.quaternion.y,
      modelBody.quaternion.z,
      modelBody.quaternion.w
    );
  }
}

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

  // Create water first
  waterClass = new useWater(scene, waves);
  waterClass.createWater();
  water = waterClass.getWater();
  scene.add(water);

  // Initialize time for accurate wave height calculation
  water.material.uniforms["time"].value = 0;

  // Get initial wave height at boat position (0,0)
  const waveInfo = getWaveInfo(0, 0, 0);
  const waterSurfaceY = waveInfo.position.y;

  // Now load the boat with the correct initial height
  loadGLBModel(
    "/mesh/boat.glb",
    new THREE.Vector3(0, waterSurfaceY + 2, 0), // Position - slightly above wave height
    new THREE.Vector3(1, 1, 1), // Scale
    new THREE.Vector3(0, 0, 0) // Rotation
  );

  const sky = new useSun(scene, renderer, water);
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

  if (modelBody) {
    // Apply initial stabilization for the first few seconds
    if (clock.elapsedTime < 2) {
      // Apply stronger stabilization force during initialization
      const stabForce = new CANNON.Vec3(0, 150, 0);
      modelBody.applyForce(stabForce, modelBody.position);

      // Ensure boat stays level during initialization
      const upVector = new CANNON.Vec3(0, 1, 0);
      const currentUp = new CANNON.Vec3();
      modelBody.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0), currentUp);

      const targetQuat = new CANNON.Quaternion();
      targetQuat.setFromVectors(currentUp, upVector);

      const torque = new CANNON.Vec3(
        targetQuat.x * 15.0,
        targetQuat.y * 15.0,
        targetQuat.z * 15.0
      );

      modelBody.torque.vadd(torque, modelBody.torque);

      // Dampen initial velocity to prevent bouncing
      modelBody.velocity.scale(0.8, modelBody.velocity);
      modelBody.angularVelocity.scale(0.8, modelBody.angularVelocity);
    }

    applyBuoyancyForce();

    if (cannonDebugRenderer) {
      cannonDebugRenderer.update();
    }
  }

  world.step(delta);

  updateModelMesh();

  water.material.uniforms["time"].value += delta;
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
