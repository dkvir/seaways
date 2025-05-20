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

    // Smaller height offset for precise positioning just above water
    this.heightOffset = 0.05;

    this.wakeGeometry = null;
    // Higher resolution for smoother surface matching
    this.wakeResolution = { width: 64, length: 128 };
    this.time = 0;
    this.debug = false;

    // Material properties for wake effect
    this.wakeColor = 0xffffff;
    this.wakeOpacity = 0.7;
    this.fadeDistance = 40;
  }

  init() {
    // Create high resolution wake plane geometry
    this.wakeGeometry = new THREE.PlaneGeometry(
      this.wakeWidth,
      this.wakeLength,
      this.wakeResolution.width,
      this.wakeResolution.length
    );

    // Create semi-transparent material for wake effect
    const wakeMaterial = new THREE.MeshBasicMaterial({
      color: this.wakeColor,
      transparent: true,
      opacity: this.wakeOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Create wake plane mesh
    this.wakePlane = new THREE.Mesh(this.wakeGeometry, wakeMaterial);

    // Rotate plane to be horizontal - same orientation as water plane
    this.wakePlane.rotation.x = -Math.PI / 2;

    // Store original vertices for reference
    this.originalVertices = [];
    const positions = this.wakeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      this.originalVertices.push({
        x: positions.getX(i),
        y: positions.getY(i),
      });
    }

    // Add to scene
    this.scene.add(this.wakePlane);

    // Add debug helpers if in debug mode
    if (this.debug) {
      const axisHelper = new THREE.AxesHelper(10);
      this.wakePlane.add(axisHelper);

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

    // Get boat direction vector
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
    const wakeOffset = boatDirection.clone().multiplyScalar(-5);

    this.wakePlane.position.set(
      bodyPosition.x + wakeOffset.x,
      bodyPosition.y, // Base position - will be adjusted by heightOffset in wave distortion
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

    // Apply wave distortion to match water shader exactly
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

  // Apply the exact same wave distortion as the water with a height offset
  applyGerstnerWaveDistortion(time) {
    if (!this.wakeGeometry || !this.wakePlane) return;

    const positions = this.wakeGeometry.attributes.position;

    // Save the wake's current world position and rotation for positioning
    const wakeWorldPosition = new THREE.Vector3();
    this.wakePlane.getWorldPosition(wakeWorldPosition);

    // Get local-to-world and world-to-local matrices for coordinate conversions
    const wakeWorldMatrix = this.wakePlane.matrixWorld.clone();
    const wakeWorldMatrixInverse = new THREE.Matrix4()
      .copy(wakeWorldMatrix)
      .invert();

    // For each vertex in the wake geometry
    for (let i = 0; i < positions.count; i++) {
      // Get vertex position in local coordinates
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = 0; // Original z value, will be replaced

      // Convert to world position
      const localPos = new THREE.Vector3(x, y, z);
      const worldPos = localPos.clone().applyMatrix4(wakeWorldMatrix);

      // We only need the x,z coordinates from world space to calculate the water height
      // This is the exact point on the water surface below this wake vertex
      const worldX = worldPos.x;
      const worldZ = worldPos.z;

      // Calculate the water height at this x,z position using the exact same Gerstner wave formula
      // This code is identical to what's in the water shader
      let waterHeight = 0;

      for (let j = 0; j < this.waves.length; j++) {
        const wave = this.waves[j];
        const k = (Math.PI * 2) / wave.wavelength;
        const c = Math.sqrt(9.8 / k);
        const d = new THREE.Vector2(
          Math.sin((wave.direction * Math.PI) / 180),
          Math.cos((wave.direction * Math.PI) / 180)
        );
        const f = k * (d.dot(new THREE.Vector2(worldX, worldZ)) - c * time);
        const a = wave.steepness / k;

        // Only need the Y component of the displacement for height
        waterHeight += a * Math.sin(f);
      }

      // Create the point at water surface level
      const waterSurfacePoint = new THREE.Vector3(worldX, waterHeight, worldZ);

      // Add the height offset to position the wake above the water
      waterSurfacePoint.y += this.heightOffset;

      // Convert back to wake's local coordinates
      const offsetLocalPos = waterSurfacePoint
        .clone()
        .applyMatrix4(wakeWorldMatrixInverse);

      // Apply the height to the wake vertex
      // We only need to update Z since X and Y define the grid position
      positions.setZ(i, offsetLocalPos.z);
    }

    // Update geometry
    positions.needsUpdate = true;
    this.wakeGeometry.computeVertexNormals();
  }
};
