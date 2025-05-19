import * as THREE from "three";

export const useWake = class WakeEffect {
  constructor(scene, boatObject, mainWater) {
    this.scene = scene;
    this.boat = boatObject;
    this.mainWater = mainWater;
    this.wakePlane = null;
    this.wakeWidth = 70; // Match hull width from useModel.js (hullWidth)
    this.wakeLength = 190; // Match hull length from useModel.js (hullLength)
    this.offsetY = -1.0; // Position slightly below the hull for visibility
  }

  init() {
    // Create wake plane geometry
    const geometry = new THREE.PlaneGeometry(this.wakeWidth, this.wakeLength);

    // Create white, semi-transparent material
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Create wake plane mesh
    this.wakePlane = new THREE.Mesh(geometry, material);

    // Rotate plane to be horizontal (wake appears on water surface)
    this.wakePlane.rotation.x = -Math.PI / 2;

    // Add to scene
    this.scene.add(this.wakePlane);
  }

  update(bodyPosition, bodyQuaternion) {
    if (!this.wakePlane) return;

    // Use the exact position of the physics body
    this.wakePlane.position.set(
      bodyPosition.x,
      bodyPosition.y + this.offsetY,
      bodyPosition.z
    );

    // Apply the exact rotation of the physics body
    this.wakePlane.quaternion.set(
      bodyQuaternion.x,
      bodyQuaternion.y,
      bodyQuaternion.z,
      bodyQuaternion.w
    );

    // Keep the plane horizontal regardless of boat's pitch and roll
    // Extract the current yaw from the quaternion
    const euler = new THREE.Euler().setFromQuaternion(
      this.wakePlane.quaternion,
      "YXZ"
    );
    // Reset to only keep the yaw rotation
    this.wakePlane.rotation.set(-Math.PI / 2, 0, euler.y);
  }
};
