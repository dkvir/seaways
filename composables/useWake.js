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

    // Foam shader parameters
    this.foamProperties = {
      voronoiSmoothnessA: 0.5,
      voronoiSmoothnessB: 0.5,
      voronoiSmoothnessC: 0.5,
      voronoiSpeedA: 0.5,
      voronoiSpeedB: 0.5,
      voronoiSpeedC: 0.5,
      voronoiScaleA: 150.0,
      voronoiScaleB: 100.0,
      voronoiScaleC: 50.0,
      voronoiPower: 1.0,
      voronoiColor: new THREE.Color(1, 1, 1),
      scale: 0.25,
    };

    this.wakeGeometry = null;
    // Higher resolution for smoother surface matching
    this.wakeResolution = { width: 64, length: 128 };
    this.time = 0;
    this.debug = false;
    this.clock = new THREE.Clock();
  }

  init() {
    // Create high resolution wake plane geometry
    this.wakeGeometry = new THREE.PlaneGeometry(
      this.wakeProperties.width,
      this.wakeProperties.length,
      this.wakeResolution.width,
      this.wakeResolution.length
    );

    // Create foam shader material
    const foamShader = this.createFoamShader();

    // Create wake plane mesh with the foam shader
    this.wakePlane = new THREE.Mesh(this.wakeGeometry, foamShader);

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

  createFoamShader() {
    // Create custom shader material for foam effect
    const foamShader = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new THREE.Vector2(
            this.wakeProperties.width,
            this.wakeProperties.length
          ),
        },
        voronoiSmoothnessA: { value: this.foamProperties.voronoiSmoothnessA },
        voronoiSmoothnessB: { value: this.foamProperties.voronoiSmoothnessB },
        voronoiSmoothnessC: { value: this.foamProperties.voronoiSmoothnessC },
        voronoiSpeedA: { value: this.foamProperties.voronoiSpeedA },
        voronoiSpeedB: { value: this.foamProperties.voronoiSpeedB },
        voronoiSpeedC: { value: this.foamProperties.voronoiSpeedC },
        voronoiScaleA: { value: this.foamProperties.voronoiScaleA },
        voronoiScaleB: { value: this.foamProperties.voronoiScaleB },
        voronoiScaleC: { value: this.foamProperties.voronoiScaleC },
        voronoiPower: { value: this.foamProperties.voronoiPower },
        voronoiColor: { value: this.foamProperties.voronoiColor },
        scale: { value: this.foamProperties.scale },
        opacity: { value: this.wakeProperties.opacity },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float iTime;
        uniform vec2 iResolution;
        uniform float voronoiSmoothnessA;
        uniform float voronoiSmoothnessB;
        uniform float voronoiSmoothnessC;
        uniform float voronoiSpeedA;
        uniform float voronoiSpeedB;
        uniform float voronoiSpeedC;
        uniform float voronoiScaleA;
        uniform float voronoiScaleB;
        uniform float voronoiScaleC;
        uniform float voronoiPower;
        uniform vec3 voronoiColor;
        uniform float scale;
        uniform float opacity;

        varying vec2 vUv;

        vec3 Hash(vec2 p) {
          float a = dot(p, vec2(127.1, 311.7));
          float b = dot(p, vec2(269.5, 183.3));
          float c = dot(p, vec2(419.2, 371.9));
          return fract(sin(vec3(a, b, c)) * 43758.5453);
        }

        float Voronoi(vec2 uv, float weight, float speed) {
          vec2 cell = floor(uv);
          vec2 fraction = fract(uv);
          float minDistance = 8.0;

          for(int j=-1; j<=1; j++) {
            for(int i=-1; i<=1; i++) {
              vec2 offset = vec2(float(i), float(j));
              vec2 neighbor = cell + offset;
              vec3 hash = Hash(neighbor);
              float currentDistance = length(offset - fraction + hash.xy);
              float scaleValue = hash.x * hash.y;
              float time = fract(iTime * speed);
              if (hash.z < time) scaleValue = scaleValue * time;
              currentDistance += scaleValue;
              float blendFactor = smoothstep(-1.0, 1.0, (minDistance - currentDistance) / weight);
              minDistance = mix(minDistance, currentDistance, blendFactor);
              minDistance -= blendFactor * (1.0 - blendFactor) * weight / (1.0 + 3.0 * weight);
            }
          }

          return minDistance;
        }

        float Foam(vec2 p) {
          float layer1 = Voronoi(voronoiScaleA * p, voronoiSmoothnessA, voronoiSpeedA);
          float layer2 = Voronoi(voronoiScaleB * p, voronoiSmoothnessB, voronoiSpeedB);
          float layer3 = Voronoi(voronoiScaleC * p, voronoiSmoothnessC, voronoiSpeedC);
          return pow(min(min(layer1, layer2), layer3), voronoiPower);
        }

        void main() {
          vec2 uv = vUv;

          // Create a gradient that fades out at the edges
          float edgeFade = 1.0 - 2.0 * max(abs(vUv.x - 0.5), abs(vUv.y - 0.5));
          edgeFade = smoothstep(0.0, 0.5, edgeFade);

          // Get foam value
          float foam = Foam(uv * scale);

          // Apply color and transparency
          gl_FragColor = vec4(foam * voronoiColor, foam * opacity * edgeFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return foamShader;
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

    // Update uniforms
    this.wakePlane.material.uniforms.iResolution.value.set(width, length);

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
    if (this.wakePlane && this.wakePlane.material) {
      this.wakePlane.material.uniforms.opacity.value = opacity;
    }
  }

  // Method to update foam shader parameters
  updateFoamParameter(paramName, value) {
    if (this.foamProperties.hasOwnProperty(paramName)) {
      this.foamProperties[paramName] = value;

      if (this.wakePlane && this.wakePlane.material) {
        // Update the corresponding shader uniform
        if (this.wakePlane.material.uniforms[paramName]) {
          this.wakePlane.material.uniforms[paramName].value = value;
        }
      }
    }
  }

  // Method to update foam color
  updateFoamColor(r, g, b) {
    this.foamProperties.voronoiColor.setRGB(r, g, b);
    if (this.wakePlane && this.wakePlane.material) {
      this.wakePlane.material.uniforms.voronoiColor.value =
        this.foamProperties.voronoiColor;
    }
  }

  // Method to update animation time
  update(delta) {
    if (this.wakePlane && this.wakePlane.material) {
      this.wakePlane.material.uniforms.iTime.value += delta;
    }
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

  // Getter for foam properties
  getFoamProperties() {
    return this.foamProperties;
  }
};
