import * as THREE from "three";

export const useWake = class WakeEffect {
  constructor(scene, boatObject, mainWater, waves) {
    this.scene = scene;
    this.boat = boatObject;
    this.mainWater = mainWater;
    this.waves = waves;
    this.wakePlane = null;
    this.wakeWidth = 70;
    this.wakeLength = 190;

    this.heightOffset = 0.1;

    this.wakeGeometry = null;
    this.wakeResolution = { width: 20, length: 40 };
    this.time = 0;
    this.debug = true; // Enable debug mode
  }

  init() {
    // Create wake plane geometry with higher resolution for better wave effects
    this.wakeGeometry = new THREE.PlaneGeometry(
      this.wakeWidth,
      this.wakeLength,
      this.wakeResolution.width,
      this.wakeResolution.length
    );

    // Create material for wake effect
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create wake plane mesh
    this.wakePlane = new THREE.Mesh(this.wakeGeometry, material);

    // Rotate plane to be horizontal
    this.wakePlane.rotation.x = -Math.PI / 2;

    // Raise it up slightly to avoid z-fighting with water surface
    this.wakePlane.position.y = this.heightOffset;

    // Add to scene
    this.scene.add(this.wakePlane);

    // Add debug helpers if in debug mode
    if (this.debug) {
      // Add a visible axis helper to mark the center
      const axisHelper = new THREE.AxesHelper(10);
      this.wakePlane.add(axisHelper);
    }

    console.log("Wake plane initialized:", this.wakePlane);
  }

  update(bodyPosition, bodyQuaternion, time) {
    if (!this.wakePlane) {
      console.log("No wake plane found in update!");
      return;
    }

    this.time = time;

    // Set position to match the boat position with a small height offset
    this.wakePlane.position.set(
      bodyPosition.x,
      bodyPosition.y + this.heightOffset,
      bodyPosition.z
    );

    // Extract and apply only the yaw rotation
    const euler = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion(
        bodyQuaternion.x,
        bodyQuaternion.y,
        bodyQuaternion.z,
        bodyQuaternion.w
      ),
      "YXZ"
    );

    // Keep plane horizontal but rotate based on boat's yaw
    this.wakePlane.rotation.set(-Math.PI / 2, 0, euler.y);

    // Always apply wave distortion to match water waves
    this.applyGerstnerWaveDistortion(time);

    // Log position periodically to verify the plane is where we expect
    if (this.debug && Math.floor(time * 10) % 100 === 0) {
      console.log(
        "Wake plane position:",
        this.wakePlane.position,
        "Body position:",
        bodyPosition
      );
    }
  }

  // New method to apply Gerstner waves identical to the water shader
  applyGerstnerWaveDistortion(time) {
    if (!this.wakeGeometry || !this.wakePlane) return;

    const positions = this.wakeGeometry.attributes.position;

    // For each vertex in the wake geometry
    for (let i = 0; i < positions.count; i++) {
      // Get original vertex position in local coordinates
      let x = positions.getX(i);
      let y = positions.getY(i);
      let z = positions.getZ(i);

      // Convert to world position for wave calculation
      const localPos = new THREE.Vector3(x, y, z);
      const worldPos = this.wakePlane.localToWorld(localPos.clone());

      // Apply Gerstner wave function (similar to shader)
      const p = new THREE.Vector3(worldPos.x, worldPos.z, 0); // Swap Y and Z due to plane rotation

      // Start with zero displacement
      const displacement = new THREE.Vector3(0, 0, 0);

      // Apply each wave effect
      Object.keys(this.waves).forEach((wave) => {
        const w = this.waves[wave];
        const k = (Math.PI * 2) / w.wavelength;
        const c = Math.sqrt(9.8 / k);
        const d = new THREE.Vector2(
          Math.sin((w.direction * Math.PI) / 180),
          Math.cos((w.direction * Math.PI) / 180)
        );
        const f = k * (d.dot(new THREE.Vector2(p.x, p.y)) - c * time);
        const a = w.steepness / k;

        // Gerstner wave formula
        displacement.x += d.x * (a * Math.cos(f));
        displacement.y += a * Math.sin(f);
        displacement.z += d.y * (a * Math.cos(f));
      });

      // Apply displacement to vertex
      const offsetY = displacement.y; // Height displacement

      // Update vertex position - only change the z-coordinate (which is height in local space)
      positions.setZ(i, offsetY);
    }

    // Update geometry
    positions.needsUpdate = true;
    this.wakeGeometry.computeVertexNormals();
  }

  // This method is replaced by applyGerstnerWaveDistortion
  applyWaveDistortion() {
    // This is now deprecated - keeping for reference
    if (!this.wakeGeometry || !this.wakePlane) return;

    const positions = this.wakeGeometry.attributes.position;
    const localOrigin = new THREE.Vector3(0, 0, 0);
    const worldOrigin = this.wakePlane.localToWorld(localOrigin.clone());

    // Apply wave distortion to each vertex
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      // Convert local vertex coordinates to world coordinates
      const localVertex = new THREE.Vector3(x, 0, z);
      const worldVertex = this.wakePlane.localToWorld(localVertex.clone());

      // Get wave height at this world position
      const waveInfo = this.getWaveInfo(
        worldVertex.x,
        worldVertex.z,
        this.time
      );

      // Calculate relative height to the origin to maintain wake shape
      const relativeHeight = waveInfo.position.y - worldOrigin.y;

      // Apply the wave height to the vertex Y position
      positions.setY(i, relativeHeight);
    }

    // Update the geometry
    positions.needsUpdate = true;
    this.wakeGeometry.computeVertexNormals();
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
};
