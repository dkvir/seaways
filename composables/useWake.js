import * as THREE from "three";

export const useWake = class WakeEffect {
  constructor(scene, boatObject, mainWater, waves) {
    this.scene = scene;
    this.boat = boatObject;
    this.mainWater = mainWater;
    this.waves = waves;
    this.wakePlane = null;
    this.wakeWidth = 70;
    this.wakeLength = 400;

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
};
