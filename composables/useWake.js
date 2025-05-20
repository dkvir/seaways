import * as THREE from "three";

export const useWake = class WakeEffect {
  constructor(scene, boatObject, mainWater, waves) {
    this.scene = scene;
    this.boat = boatObject;
    this.mainWater = mainWater;
    this.waves = waves;
    this.wakePlane = null;

    // Make these properties accessible for GUI
    this.wakeProperties = {
      width: 70,
      length: 400,
      heightOffset: 0.05,
      positionX: -6.5,
      positionY: 4,
      positionZ: -105,
      opacity: 1.0,
    };

    this.wakeGeometry = null;
    // Higher resolution for smoother surface matching
    this.wakeResolution = { width: 64, length: 128 };
    this.time = 0;
    this.debug = false;

    // Material properties for wake effect
    this.wakeColor = 0xffffff;
    this.fadeDistance = 40;
  }

  init() {
    // Create high resolution wake plane geometry
    this.wakeGeometry = new THREE.PlaneGeometry(
      this.wakeProperties.width,
      this.wakeProperties.length,
      this.wakeResolution.width,
      this.wakeResolution.length
    );

    // Create semi-transparent material for wake effect
    const wakeMaterial = new THREE.MeshBasicMaterial({
      color: this.wakeColor,
      transparent: true,
      opacity: this.wakeProperties.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Create wake plane mesh
    this.wakePlane = new THREE.Mesh(this.wakeGeometry, wakeMaterial);

    // Rotate plane to be horizontal - same orientation as water plane
    this.wakePlane.rotation.x = -Math.PI / 2;

    // Set initial position
    this.wakePlane.position.set(
      this.wakeProperties.positionX,
      this.wakeProperties.positionY,
      this.wakeProperties.positionZ
    );

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

  // Method to update wake plane dimensions
  updateDimensions(width, length) {
    this.wakeProperties.width = width;
    this.wakeProperties.length = length;

    // Remove old geometry
    this.wakeGeometry.dispose();

    // Create new geometry with updated dimensions
    this.wakeGeometry = new THREE.PlaneGeometry(
      width,
      length,
      this.wakeResolution.width,
      this.wakeResolution.length
    );

    // Update mesh with new geometry
    this.wakePlane.geometry = this.wakeGeometry;

    // Update vertices reference
    this.originalVertices = [];
    const positions = this.wakeGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      this.originalVertices.push({
        x: positions.getX(i),
        y: positions.getY(i),
      });
    }
  }

  // Method to update wake plane position
  updatePosition(x, y, z) {
    this.wakeProperties.positionX = x;
    this.wakeProperties.positionY = y;
    this.wakeProperties.positionZ = z;
    this.wakePlane.position.set(x, y, z);
  }

  // Method to update opacity
  updateOpacity(opacity) {
    this.wakeProperties.opacity = opacity;
    this.wakePlane.material.opacity = opacity;
  }

  // Method to toggle visibility
  toggleVisibility(visible) {
    this.wakePlane.visible = visible;
  }

  // Getter for wake plane
  getWakePlane() {
    return this.wakePlane;
  }

  // Getter for wake properties
  getWakeProperties() {
    return this.wakeProperties;
  }
};
