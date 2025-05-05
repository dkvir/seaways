import * as THREE from "three";
import * as CANNON from "cannon-es";

export const useBoatPhysics = class CannonDebugRenderer {
  constructor(scene, world, options) {
    options = options || {};

    this.scene = scene;
    this.world = world;

    this._meshes = [];

    this._material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });

    this._sphereGeometry = new THREE.SphereGeometry(1);
    this._boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this._planeGeometry = new THREE.PlaneGeometry(10, 10, 10, 10);
    this._cylinderGeometry = new THREE.CylinderGeometry(1, 1, 10, 10);
  }

  update() {
    // Remove all previous meshes
    while (this._meshes.length) {
      const mesh = this._meshes.pop();
      this.scene.remove(mesh);
    }

    // Create new meshes for each body
    this.world.bodies.forEach((body) => {
      body.shapes.forEach((shape, shapeIndex) => {
        const mesh = this._createShapeMesh(shape, body, shapeIndex);
        if (mesh) {
          // move and rotate the mesh to match the body
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);

          this.scene.add(mesh);
          this._meshes.push(mesh);
        }
      });
    });
  }

  _createShapeMesh(shape, body, shapeIndex) {
    let mesh = null;
    const material = this._material;

    switch (shape.type) {
      case CANNON.Shape.types.SPHERE:
        const sphereGeometry = this._sphereGeometry;
        mesh = new THREE.Mesh(sphereGeometry, material);
        mesh.scale.set(shape.radius, shape.radius, shape.radius);
        break;

      case CANNON.Shape.types.BOX:
        const boxGeometry = this._boxGeometry;
        mesh = new THREE.Mesh(boxGeometry, material);
        mesh.scale.set(
          shape.halfExtents.x * 2,
          shape.halfExtents.y * 2,
          shape.halfExtents.z * 2
        );
        break;

      case CANNON.Shape.types.PLANE:
        const planeGeometry = this._planeGeometry;
        mesh = new THREE.Mesh(planeGeometry, material);
        mesh.scale.set(10, 10, 10);
        break;

      case CANNON.Shape.types.TRIMESH:
        const vertices = [];
        for (let i = 0; i < shape.vertices.length; i += 3) {
          vertices.push(
            new THREE.Vector3(
              shape.vertices[i],
              shape.vertices[i + 1],
              shape.vertices[i + 2]
            )
          );
        }
        const indices = shape.indices;
        const trimeshGeometry = new THREE.BufferGeometry().setFromPoints(
          vertices
        );
        trimeshGeometry.setIndex(indices);
        mesh = new THREE.Mesh(trimeshGeometry, material);
        break;

      case CANNON.Shape.types.CYLINDER:
        const cylinderGeometry = this._cylinderGeometry;
        mesh = new THREE.Mesh(cylinderGeometry, material);
        const { radiusTop, radiusBottom, height } = shape;
        mesh.scale.set(radiusTop, height * 0.5, radiusBottom);
        break;
    }

    if (mesh) {
      // Apply the shape's offset and orientation
      const offset = shape.offset || new CANNON.Vec3();
      const orientation = shape.orientation || new CANNON.Quaternion();

      const offsetVector = new THREE.Vector3(offset.x, offset.y, offset.z);
      mesh.position.copy(offsetVector);

      const quaternion = new THREE.Quaternion(
        orientation.x,
        orientation.y,
        orientation.z,
        orientation.w
      );
      mesh.quaternion.copy(quaternion);
    }

    return mesh;
  }
};
