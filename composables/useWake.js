import * as THREE from "three";

export const useWake = class WakeEffect {
  constructor(scene, boatObject, mainWater) {
    this.scene = scene;
    this.boat = boatObject;
    this.mainWater = mainWater;
    this.wakeMesh = null;
    this.wakeMaterial = null;
    this.clock = new THREE.Clock();
    this.wakeWidth = 20;
    this.wakeLength = 60;
    this.segmentCount = 64;
    this.waveSpeed = 2.0;
    this.waveFrequency = 0.3;
    this.waveAmplitude = 1.0;
    this.foamColor = new THREE.Color(0.9, 0.9, 0.9);
    this.foamOpacity = 0.8;
    this.fadeDistance = 40; // Distance over which the wake fades out
    this.wakeTrailLength = 120; // How long the wake trail persists
    this.wakeHistory = []; // Store positions and orientations for persistent wake

    this.init();
  }

  init() {
    // Main wake geometry (directly behind boat)
    const geometry = new THREE.PlaneGeometry(
      this.wakeWidth,
      this.wakeLength,
      this.segmentCount,
      this.segmentCount * 2 // More segments along the length
    );

    this.wakeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uBoatPosition: { value: new THREE.Vector3() },
        uBoatDirection: { value: new THREE.Vector3(0, 0, 1) },
        uWakeWidth: { value: this.wakeWidth },
        uWakeLength: { value: this.wakeLength },
        uWaveSpeed: { value: this.waveSpeed },
        uWaveFrequency: { value: this.waveFrequency },
        uWaveAmplitude: { value: this.waveAmplitude },
        uFoamColor: { value: this.foamColor },
        uFoamOpacity: { value: this.foamOpacity },
        uFadeDistance: { value: this.fadeDistance },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uBoatPosition;
        uniform vec3 uBoatDirection;
        uniform float uWakeWidth;
        uniform float uWakeLength;
        uniform float uWaveSpeed;
        uniform float uWaveFrequency;
        uniform float uWaveAmplitude;
        uniform float uFadeDistance;

        varying float vWakeFactor;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        // Simple noise function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // 2D Noise function
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);

          // Four corners in 2D of a tile
          float a = random(i);
          float b = random(i + vec2(1.0, 0.0));
          float c = random(i + vec2(0.0, 1.0));
          float d = random(i + vec2(1.0, 1.0));

          // Smooth interpolation
          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
        }

        void main() {
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          vec3 relativePosition = vWorldPosition - uBoatPosition;

          // Project the relative position onto the boat's local Z-axis (backward direction)
          float alongWake = dot(relativePosition, -uBoatDirection);
          vec3 rightVector = normalize(cross(vec3(0,1,0), uBoatDirection));
          float acrossWake = dot(relativePosition, rightVector);

          // V-shaped wake pattern
          float vShapeFactor = smoothstep(0.0, uWakeWidth * 0.5, abs(acrossWake) * (1.0 + 0.5 * alongWake / uWakeLength));

          // Calculate wake factor based on position relative to boat
          float wakeMask = (1.0 - vShapeFactor) * smoothstep(uWakeLength, 0.0, alongWake);
          wakeMask *= smoothstep(-2.0, 5.0, alongWake); // No wake in front of boat

          // Apply wave displacement
          if (wakeMask > 0.01) {
            float noiseValue = noise(relativePosition.xz * 0.1 + uTime * 0.05) * 2.0;
            float waveFactor = sin(alongWake * uWaveFrequency - uTime * uWaveSpeed + noiseValue) *
                               uWaveAmplitude * wakeMask;

            // Add ripple effect
            float ripple = sin(length(relativePosition.xz) * 0.5 - uTime * 2.0) * 0.15 * wakeMask;

            vec3 displacedPosition = position + vec3(0, (waveFactor + ripple) * 0.5, 0);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);

            // Calculate fade based on distance
            vWakeFactor = wakeMask * smoothstep(uFadeDistance, 0.0, alongWake);
          } else {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vWakeFactor = 0.0;
          }
        }
      `,
      fragmentShader: `
        uniform vec3 uFoamColor;
        uniform float uFoamOpacity;
        uniform float uTime;

        varying float vWakeFactor;
        varying vec2 vUv;
        varying vec3 vWorldPosition;

        // Simple noise function
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        // 2D noise
        float noise(vec2 st) {
          vec2 i = floor(st);
          vec2 f = fract(st);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(random(i), random(i + vec2(1.0, 0.0)), u.x),
            mix(random(i + vec2(0.0, 1.0)), random(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // Fractal Brownian Motion
        float fbm(vec2 st) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 0.0;
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }

        void main() {
          if (vWakeFactor <= 0.01) {
            discard;
            return;
          }

          // Create foam texture with FBM noise
          vec2 foamUv = vWorldPosition.xz * 0.1 + uTime * 0.05;
          float foam = fbm(foamUv);

          // Add detail to foam
          foam = smoothstep(0.4, 0.6, foam);

          // Combine with wake factor
          float finalOpacity = uFoamOpacity * vWakeFactor * foam;

          // Fade at the edges
          float edgeFade = smoothstep(0.0, 0.1, vWakeFactor) *
                           smoothstep(1.0, 0.9, vWakeFactor);

          // Final color with slight blue tint at lower opacity areas
          vec3 finalColor = mix(vec3(0.8, 0.85, 0.95), uFoamColor, foam);

          gl_FragColor = vec4(finalColor, finalOpacity * edgeFade);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.wakeMesh = new THREE.Mesh(geometry, this.wakeMaterial);
    this.wakeMesh.rotation.x = -Math.PI / 2;
    this.wakeMesh.renderOrder = 2; // Render after the main water
    this.scene.add(this.wakeMesh);

    // Create v-shaped wake particles
    this.initVShapedWake();
  }

  initVShapedWake() {
    // Create particles for the V-shaped wake
    const particleCount = 2000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const wakeData = new Float32Array(particleCount * 3); // age, size, type

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      wakeData[i * 3] = -1; // Age (-1 means inactive)
      wakeData[i * 3 + 1] = Math.random() * 0.5 + 0.5; // Size
      wakeData[i * 3 + 2] = Math.floor(Math.random() * 3); // Type of particle
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "wakeData",
      new THREE.BufferAttribute(wakeData, 3)
    );

    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uFoamColor: { value: this.foamColor },
      },
      vertexShader: `
        attribute vec3 wakeData;
        varying float vOpacity;
        varying float vType;

        void main() {
          float age = wakeData.x;
          float size = wakeData.y;
          vType = wakeData.z;

          if (age < 0.0) {
            // Inactive particle
            gl_Position = vec4(0.0);
            gl_PointSize = 0.0;
            vOpacity = 0.0;
          } else {
            // Active particle
            float lifePercent = age / 5.0; // 5 seconds max life
            vOpacity = 1.0 - lifePercent;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (1.0 - lifePercent * 0.5) * 10.0;
          }
        }
      `,
      fragmentShader: `
        uniform vec3 uFoamColor;
        varying float vOpacity;
        varying float vType;

        void main() {
          if (vOpacity <= 0.01) discard;

          // Calculate distance from center for circle shape
          vec2 cxy = 2.0 * gl_PointCoord - 1.0;
          float r = dot(cxy, cxy);
          if (r > 1.0) discard;

          // Different particle types
          vec3 color = uFoamColor;
          if (vType > 1.5) {
            color = vec3(0.8, 0.9, 1.0); // Bluish tint for some particles
          }

          // Soften edge of particle
          float alpha = vOpacity * (1.0 - smoothstep(0.8, 1.0, r));
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.wakeParticles = new THREE.Points(particleGeometry, particleMaterial);
    this.wakeParticles.frustumCulled = false;
    this.scene.add(this.wakeParticles);

    this.lastEmitTime = 0;
    this.activeParticles = 0;
  }

  updateWakeParticles(deltaTime) {
    if (!this.wakeParticles) return;

    const positions = this.wakeParticles.geometry.attributes.position;
    const wakeData = this.wakeParticles.geometry.attributes.wakeData;
    const count = positions.count;
    const boatSpeed = this.getBoatSpeed();

    // Only emit particles if boat is moving
    const emitRate = boatSpeed > 0.5 ? 50 : 0;

    // Update existing particles
    for (let i = 0; i < count; i++) {
      const age = wakeData.array[i * 3];

      if (age > 0) {
        // Update active particle
        wakeData.array[i * 3] += deltaTime;

        // Kill old particles
        if (wakeData.array[i * 3] > 5.0) {
          wakeData.array[i * 3] = -1;
          this.activeParticles--;
        }
      }
    }

    // Emit new particles
    if (
      this.clock.getElapsedTime() - this.lastEmitTime > 1 / emitRate &&
      boatSpeed > 0.5
    ) {
      this.lastEmitTime = this.clock.getElapsedTime();

      // Get boat direction and position
      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(this.boat.quaternion);
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(this.boat.quaternion);

      // Find an inactive particle
      for (let i = 0; i < count && this.activeParticles < 1000; i++) {
        if (wakeData.array[i * 3] < 0) {
          // Activate this particle
          const side = Math.random() > 0.5 ? 1 : -1;
          const distanceBehind = -Math.random() * 2 - 0.5;
          const distanceSide = side * (Math.random() * 0.8 + 0.8);

          // Position behind and to the side of boat
          const pos = new THREE.Vector3()
            .copy(this.boat.position)
            .add(forward.clone().multiplyScalar(distanceBehind))
            .add(right.clone().multiplyScalar(distanceSide));

          // Set water level height
          pos.y = 0.05;

          // Set position
          positions.array[i * 3] = pos.x;
          positions.array[i * 3 + 1] = pos.y;
          positions.array[i * 3 + 2] = pos.z;

          // Set as active with random size
          wakeData.array[i * 3] = 0; // Age
          this.activeParticles++;
          break;
        }
      }
    }

    positions.needsUpdate = true;
    wakeData.needsUpdate = true;
    this.wakeParticles.material.uniforms.uTime.value =
      this.clock.getElapsedTime();
  }

  getBoatSpeed() {
    // Simple method to estimate boat speed from its current movement
    if (!this.lastPosition) {
      this.lastPosition = this.boat.position.clone();
      this.lastUpdateTime = this.clock.getElapsedTime();
      return 0;
    }

    const currentTime = this.clock.getElapsedTime();
    const deltaTime = currentTime - this.lastUpdateTime;

    if (deltaTime > 0) {
      const distance = this.boat.position.distanceTo(this.lastPosition);
      const speed = distance / deltaTime;

      this.lastPosition.copy(this.boat.position);
      this.lastUpdateTime = currentTime;

      return speed;
    }

    return 0;
  }

  update() {
    if (!this.boat || !this.wakeMesh || !this.wakeMaterial) return;

    const deltaTime = this.clock.getDelta();
    this.wakeMaterial.uniforms.uTime.value = this.clock.getElapsedTime();
    this.wakeMaterial.uniforms.uBoatPosition.value.copy(this.boat.position);

    // Get the boat's forward direction
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.boat.quaternion);
    this.wakeMaterial.uniforms.uBoatDirection.value.copy(forward).normalize();

    // Position the wake mesh behind the boat
    const wakeOffset = new THREE.Vector3(0, 0, -this.wakeLength / 2);
    wakeOffset.applyQuaternion(this.boat.quaternion);
    this.wakeMesh.position.copy(this.boat.position).add(wakeOffset);

    // Align wake with boat rotation
    this.wakeMesh.quaternion.copy(this.boat.quaternion);
    this.wakeMesh.quaternion.multiply(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
    );

    // Update particles for V-shaped wake
    this.updateWakeParticles(deltaTime);

    // Store boat position and orientation for wake trail
    if (
      this.lastTrailUpdate === undefined ||
      this.clock.getElapsedTime() - this.lastTrailUpdate > 0.1
    ) {
      this.storeWakePosition();
      this.lastTrailUpdate = this.clock.getElapsedTime();
    }
  }

  storeWakePosition() {
    // Store boat position and orientation for persistent wake
    if (this.getBoatSpeed() > 0.5) {
      this.wakeHistory.push({
        position: this.boat.position.clone(),
        orientation: this.boat.quaternion.clone(),
        time: this.clock.getElapsedTime(),
      });

      // Remove old entries
      while (
        this.wakeHistory.length > 0 &&
        this.clock.getElapsedTime() - this.wakeHistory[0].time > 10
      ) {
        this.wakeHistory.shift();
      }
    }
  }

  dispose() {
    if (this.wakeMesh) {
      this.scene.remove(this.wakeMesh);
      this.wakeMesh.geometry.dispose();
      this.wakeMaterial.dispose();
      this.wakeMesh = null;
      this.wakeMaterial = null;
    }

    if (this.wakeParticles) {
      this.scene.remove(this.wakeParticles);
      this.wakeParticles.geometry.dispose();
      this.wakeParticles.material.dispose();
      this.wakeParticles = null;
    }
  }
};
