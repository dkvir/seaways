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

    // Increase this value to make wake more visible above water
    this.heightOffset = 0.5;

    this.wakeGeometry = null;
    // Increase resolution for smoother wake effect
    this.wakeResolution = { width: 32, length: 64 };
    this.time = 0;
    this.debug = false; // Set to true for debugging

    // Material properties for wake effect - solid white
    this.wakeColor = 0xffffff;
    this.fadeDistance = 40; // Distance from boat where wake starts to fade
  }

  init() {
    // Create wake plane geometry with higher resolution
    this.wakeGeometry = new THREE.PlaneGeometry(
      this.wakeWidth,
      this.wakeLength,
      this.wakeResolution.width,
      this.wakeResolution.length
    );

    // Create custom shader material for wake effect with solid white color
    const wakeMaterial = new THREE.MeshBasicMaterial({
      color: this.wakeColor,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create wake plane mesh with the custom material
    this.wakePlane = new THREE.Mesh(this.wakeGeometry, wakeMaterial);

    // Rotate plane to be horizontal
    this.wakePlane.rotation.x = -Math.PI / 2;

    // Raise it up slightly to avoid z-fighting with water surface
    this.wakePlane.position.y = this.heightOffset;

    // Add to scene
    this.scene.add(this.wakePlane);

    // Add debug helpers if in debug mode
    if (this.debug) {
      const axisHelper = new THREE.AxesHelper(10);
      this.wakePlane.add(axisHelper);

      // Add wireframe to visualize geometry
      const wireframe = new THREE.WireframeGeometry(this.wakeGeometry);
      const line = new THREE.LineSegments(wireframe);
      line.material.color.set(0xff0000);
      line.material.opacity = 0.25;
      line.material.transparent = true;
      this.wakePlane.add(line);

      console.log("Wake plane initialized with debug mode:", this.wakePlane);
    }
  }

  update(bodyPosition, bodyQuaternion, time) {
    if (!this.wakePlane) {
      console.log("No wake plane found in update!");
      return;
    }

    this.time = time;

    // No need to update shader uniforms - using basic material now

    // Position wake behind the boat based on its orientation
    const boatDirection = new THREE.Vector3(0, 0, -1); // Assuming boat forward is -Z
    boatDirection.applyQuaternion(
      new THREE.Quaternion(
        bodyQuaternion.x,
        bodyQuaternion.y,
        bodyQuaternion.z,
        bodyQuaternion.w
      )
    );

    // Position wake slightly behind the boat
    const wakeOffset = boatDirection.clone().multiplyScalar(-5); // Offset wake behind boat

    this.wakePlane.position.set(
      bodyPosition.x + wakeOffset.x,
      bodyPosition.y + this.heightOffset, // Keep height offset constant
      bodyPosition.z + wakeOffset.z
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

    // Apply wave distortion to match water waves
    this.applyGerstnerWaveDistortion(time);

    // Log position periodically for debugging
    if (this.debug && Math.floor(time * 10) % 100 === 0) {
      console.log(
        "Wake plane position:",
        this.wakePlane.position,
        "Body position:",
        bodyPosition
      );
    }
  }

  // Apply Gerstner waves to match the water shader but keep wake above water
  applyGerstnerWaveDistortion(time) {
    if (!this.wakeGeometry || !this.wakePlane) return;

    const positions = this.wakeGeometry.attributes.position;
    const wakeWorldPosition = new THREE.Vector3();
    this.wakePlane.getWorldPosition(wakeWorldPosition);

    // Sample the water wave heights at several key points to find lowest and highest points
    let minWaveHeight = Infinity;
    let maxWaveHeight = -Infinity;

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

      // Keep track of lowest and highest wave points
      minWaveHeight = Math.min(minWaveHeight, displacement.y);
      maxWaveHeight = Math.max(maxWaveHeight, displacement.y);

      // Apply wave height plus a significant offset to ensure it stays above water
      // Increase this value if wake is still going below water
      positions.setZ(i, displacement.y + 0.3);
    }

    // Calculate wave height range
    const waveHeightRange = maxWaveHeight - minWaveHeight;

    // If debug is enabled, log the wave height range occasionally
    if (this.debug && Math.floor(time * 10) % 100 === 0) {
      console.log(
        "Wave height range:",
        waveHeightRange,
        "Min:",
        minWaveHeight,
        "Max:",
        maxWaveHeight
      );
    }

    // Update geometry
    positions.needsUpdate = true;
    this.wakeGeometry.computeVertexNormals();
  }
};
