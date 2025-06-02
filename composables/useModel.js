import * as THREE from "three";
import * as CANNON from "cannon-es";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

export const useModel = class Model {
  constructor(scene, renderer, world, water, waves) {
    this.scene = scene;
    this.renderer = renderer;
    this.world = world;
    this.water = water;
    this.waves = waves;
    this.model = null;
    this.modelBody = null;
    this.modelMesh = null;
    this.mixer = null;

    this.bodyToMeshOffsetX = 7;
    this.bodyToMeshOffsetY = -10;
    this.bodyToMeshOffsetZ = 10;

    // Initialize DRACO loader
    this.setupLoaders();
  }

  setupLoaders() {
    // Create DRACO loader
    this.dracoLoader = new DRACOLoader();

    // Set the path to DRACO decoder files
    // Option 1: Use CDN (recommended for web deployment)
    this.dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );

    // Option 2: Use local files (uncomment if you have local DRACO files)
    // this.dracoLoader.setDecoderPath('/draco/');

    // Enable pre-loading of WASM decoder (optional, improves performance)
    this.dracoLoader.preload();

    // Create GLTF loader and set DRACO loader as extension
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  loadGLBModel(modelPath, position, scale, rotation) {
    // Use the configured GLTF loader with DRACO support
    this.gltfLoader.load(
      modelPath,
      (gltf) => {
        this.model = gltf.scene;
        this.animations = gltf.animations;

        if (scale) {
          this.model.scale.set(scale.x, scale.y, scale.z);
        }

        if (position) {
          this.model.position.set(position.x, position.y, position.z);
        }

        if (rotation) {
          this.model.rotation.set(rotation.x, rotation.y, rotation.z);
        }

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            child.material.depthWrite = true;
            child.material.flatShading = false;
            child.material.transparent = false;
            this.modelMesh = child;
          }
        });

        this.scene.add(this.model);

        this.createModelPhysics(position);

        if (this.animations && this.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);

          // Play the first animation in the list (you can change the index if needed)
          const action = this.mixer.clipAction(this.animations[0]);
          action.loop = THREE.LoopRepeat; // loop mode
          action.clampWhenFinished = false;
          action.enable = true;
          action.play();
        }
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          // console.log(`Loading: ${Math.round(percentComplete)}%`);
        }
      },
      (error) => {
        console.error("An error occurred loading the DRACO model:", error);
      }
    );
  }

  // Method to load models with custom DRACO settings
  loadGLBModelWithDracoConfig(
    modelPath,
    position,
    scale,
    rotation,
    dracoConfig = {}
  ) {
    // Create a new DRACO loader with custom configuration
    const customDracoLoader = new DRACOLoader();

    // Apply custom DRACO configuration
    const config = {
      decoderPath: "https://www.gstatic.com/draco/versioned/decoders/1.5.6/",
      workerLimit: 4, // Number of web workers to use
      ...dracoConfig,
    };

    customDracoLoader.setDecoderPath(config.decoderPath);

    if (config.workerLimit) {
      customDracoLoader.setWorkerLimit(config.workerLimit);
    }

    // Create GLTF loader with custom DRACO loader
    const customGltfLoader = new GLTFLoader();
    customGltfLoader.setDRACOLoader(customDracoLoader);

    customGltfLoader.load(
      modelPath,
      (gltf) => {
        // Same loading logic as above
        this.model = gltf.scene;
        this.animations = gltf.animations;

        if (scale) {
          this.model.scale.set(scale.x, scale.y, scale.z);
        }

        if (position) {
          this.model.position.set(position.x, position.y, position.z);
        }

        if (rotation) {
          this.model.rotation.set(rotation.x, rotation.y, rotation.z);
        }

        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
            child.material.depthWrite = true;
            child.material.flatShading = false;
            child.material.transparent = false;
            this.modelMesh = child;
          }
        });

        this.scene.add(this.model);
        console.log("Custom DRACO model loaded successfully:", modelPath);

        this.createModelPhysics(position);

        if (this.animations && this.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          const action = this.mixer.clipAction(this.animations[0]);
          action.loop = THREE.LoopRepeat;
          action.clampWhenFinished = false;
          action.enable = true;
          action.play();
        }

        // Clean up custom loader
        customDracoLoader.dispose();
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          console.log(`Loading custom DRACO: ${Math.round(percentComplete)}%`);
        }
      },
      (error) => {
        console.error(
          "An error occurred loading the custom DRACO model:",
          error
        );
        customDracoLoader.dispose();
      }
    );
  }

  // Clean up method to dispose of loaders
  dispose() {
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    if (this.model) {
      this.scene.remove(this.model);
      this.model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }
  }

  createModelPhysics(position) {
    const hullWidth = 70;
    const hullHeight = 50;
    const hullLength = 190;

    this.modelBody = new CANNON.Body({
      mass: 50,
      position: new CANNON.Vec3(
        position.x - this.bodyToMeshOffsetX,
        position.y - this.bodyToMeshOffsetY,
        position.z - this.bodyToMeshOffsetZ
      ),

      velocity: new CANNON.Vec3(0, 0, 0),
      angularVelocity: new CANNON.Vec3(0, 0, 0),
      material: new CANNON.Material({
        friction: 0.3,
        restitution: 0.3,
      }),
    });

    const centerOffsetX = 0;
    const centerOffsetY = 2;
    const centerOffsetZ = 0;

    const hullShape = new CANNON.Box(
      new CANNON.Vec3(hullWidth / 2, hullHeight / 2, hullLength / 2)
    );
    this.modelBody.addShape(
      hullShape,
      new CANNON.Vec3(centerOffsetX, centerOffsetY, centerOffsetZ)
    );

    // Add a deeper keel for better stability
    const keelShape = new CANNON.Box(new CANNON.Vec3(1, 4, hullLength / 2));
    this.modelBody.addShape(
      keelShape,
      new CANNON.Vec3(centerOffsetX, centerOffsetY - 4, centerOffsetZ)
    );

    const leftStabilizerShape = new CANNON.Box(
      new CANNON.Vec3(3, 1, hullLength / 3)
    );
    this.modelBody.addShape(
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
    this.modelBody.addShape(
      rightStabilizerShape,
      new CANNON.Vec3(
        centerOffsetX + hullWidth / 3,
        centerOffsetY - 1,
        centerOffsetZ
      )
    );

    this.world.addBody(this.modelBody);

    this.modelBody.linearDamping = 0.5;
    this.modelBody.angularDamping = 0.9;

    this.modelBody.buoyancyPoints = [
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

      new CANNON.Vec3(centerOffsetX, centerOffsetY - 1, centerOffsetZ),
      new CANNON.Vec3(centerOffsetX, centerOffsetY - 3, centerOffsetZ),

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

  applyBuoyancyForce() {
    if (!this.modelBody || !this.water) return;

    const waterDensity = 2.5;
    const t = this.water.material.uniforms["time"].value;
    let submergedPoints = 0;

    const boatPos = this.modelBody.position;
    const boatQuat = this.modelBody.quaternion;

    for (const localPoint of this.modelBody.buoyancyPoints) {
      const worldPoint = new CANNON.Vec3();
      this.modelBody.pointToWorldFrame(localPoint, worldPoint);

      const waveInfo = this.getWaveInfo(worldPoint.x, worldPoint.z, t);
      const waveHeight = waveInfo.position.y;

      const depth = waveHeight - worldPoint.y;

      if (depth > 0) {
        submergedPoints++;

        const buoyancyMultiplier = 1.8; // Increased from 1.5
        const force = new CANNON.Vec3(
          0,
          waterDensity * 9.82 * depth * buoyancyMultiplier,
          0
        );
        this.modelBody.applyForce(force, worldPoint);

        if (this.modelBody.velocity.length() > 0.1) {
          const pointVel = new CANNON.Vec3();
          this.modelBody.getVelocityAtWorldPoint(worldPoint, pointVel);

          const dragCoefficient = 0.3; // Increased from 0.2
          const dragForce = pointVel.scale(-dragCoefficient * depth);
          this.modelBody.applyForce(dragForce, worldPoint);
        }
      }
    }

    if (submergedPoints > 0) {
      const waveInfo = this.getWaveInfo(boatPos.x, boatPos.z, t);
      const waveNormal = new CANNON.Vec3(
        waveInfo.normal.x,
        waveInfo.normal.y,
        waveInfo.normal.z
      );

      const upVector = new CANNON.Vec3(0, 1, 0);

      const localUpVector = new CANNON.Vec3();
      const invQuat = boatQuat.inverse();
      invQuat.vmult(upVector, localUpVector);

      const targetQuat = new CANNON.Quaternion();
      targetQuat.setFromVectors(localUpVector, waveNormal);

      const alignmentForce = 0.5; // Slight increase from 0.4
      const torque = new CANNON.Vec3(
        targetQuat.x * alignmentForce,
        targetQuat.y * alignmentForce,
        targetQuat.z * alignmentForce
      );

      this.modelBody.torque.vadd(torque, this.modelBody.torque);

      const keelPoint = new CANNON.Vec3(0, -0.8, 0);
      const keelWorldPoint = new CANNON.Vec3();
      this.modelBody.pointToWorldFrame(keelPoint, keelWorldPoint);

      const worldUp = new CANNON.Vec3(0, 1, 0);
      const boatUp = new CANNON.Vec3();
      this.modelBody.vectorToWorldFrame(new CANNON.Vec3(0, 1, 0), boatUp);

      const tiltDot = worldUp.dot(boatUp);

      if (tiltDot < 0.8) {
        const stabForce = new CANNON.Vec3(0, 40 * (1 - tiltDot), 0);
        this.modelBody.applyForce(stabForce, keelWorldPoint);
      }
    }
  }

  updateModelMesh() {
    if (this.modelBody && this.model) {
      this.model.position.set(
        this.modelBody.position.x + this.bodyToMeshOffsetX,
        this.modelBody.position.y + this.bodyToMeshOffsetY,
        this.modelBody.position.z + this.bodyToMeshOffsetZ
      );

      this.model.quaternion.set(
        this.modelBody.quaternion.x,
        this.modelBody.quaternion.y,
        this.modelBody.quaternion.z,
        this.modelBody.quaternion.w
      );
    }
  }

  getWaveInfo(x, z, time) {
    const pos = new THREE.Vector3();
    const tangent = new THREE.Vector3(1, 0, 0);
    const binormal = new THREE.Vector3(0, 0, 1);
    Object.keys(this.waves).forEach((wave) => {
      const w = this.waves[wave];
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

  getModelBody() {
    return this.modelBody;
  }

  updateMixer(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
  }
};
