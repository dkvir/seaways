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
      width: 90,
      length: 400,
      heightOffset: 0.05,
      positionX: -6.5,
      positionY: 4,
      positionZ: -105,
      opacity: 1.0,
    };

    // Enhanced wave animation properties
    this.waveProperties = {
      waveFreq: 0.13,
      waveAmp: 1.0,
      waveRoughness: 8.0,
      timeScale: 1.0,
      octaves: 6,
      persistance: 0.1,
      lacunarity: 1.5,
    };

    // Foam shader parameters
    this.foamProperties = {
      voronoiSmoothnessA: 0.3,
      voronoiSmoothnessB: 0.4,
      voronoiSmoothnessC: 0.5,
      voronoiSpeedA: 0.3,
      voronoiSpeedB: 0.2,
      voronoiSpeedC: 0.4,
      voronoiScaleA: 150.0,
      voronoiScaleB: 100.0,
      voronoiScaleC: 50.0,
      voronoiPower: 0.7,
      voronoiColor: new THREE.Color(1, 1, 1),
      scale: 0.01,
      foamThreshold: 0.4,
      foamIntensity: 1.2,
    };

    this.wakeGeometry = null;
    // Higher resolution for smoother surface matching
    this.wakeResolution = { width: 64, length: 128 };
    this.time = 0;
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

    // Create enhanced foam shader material
    const foamShader = this.createEnhancedFoamShader();

    // Create wake plane mesh with the enhanced foam shader
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
  }

  createEnhancedFoamShader() {
    // Create custom shader material with ocean-style wave animation
    const foamShader = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: {
          value: new THREE.Vector2(
            this.wakeProperties.width,
            this.wakeProperties.length
          ),
        },
        // Foam properties
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
        foamThreshold: { value: this.foamProperties.foamThreshold },
        foamIntensity: { value: this.foamProperties.foamIntensity },
        opacity: { value: this.wakeProperties.opacity },
        // Wave animation properties
        waveFreq: { value: this.waveProperties.waveFreq },
        waveAmp: { value: this.waveProperties.waveAmp },
        waveRoughness: { value: this.waveProperties.waveRoughness },
        timeScale: { value: this.waveProperties.timeScale },
        octaves: { value: this.waveProperties.octaves },
        persistance: { value: this.waveProperties.persistance },
        lacunarity: { value: this.waveProperties.lacunarity },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        void main() {
          vUv = uv;
          vPosition = position;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
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
        uniform float foamThreshold;
        uniform float foamIntensity;
        uniform float opacity;

        // Wave animation uniforms
        uniform float waveFreq;
        uniform float waveAmp;
        uniform float waveRoughness;
        uniform float timeScale;
        uniform int octaves;
        uniform float persistance;
        uniform float lacunarity;

        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;

        const float pi = 3.14159265359;
        const vec4 cHashA4 = vec4(0., 1., 57., 58.);
        const float cHashM = 43758.54;

        // Hash functions from the ocean shader
        vec4 Hashv4f(float p) {
          return fract(sin(p + cHashA4) * cHashM);
        }

        vec2 Noisev2v4(vec4 p) {
          vec4 i, f, t1, t2;
          i = floor(p);
          f = fract(p);
          f = f * f * (3. - 2. * f);
          t1 = Hashv4f(dot(i.xy, vec2(1., 57.)));
          t2 = Hashv4f(dot(i.zw, vec2(1., 57.)));
          return vec2(
            mix(mix(t1.x, t1.y, f.x), mix(t1.z, t1.w, f.x), f.y),
            mix(mix(t2.x, t2.y, f.z), mix(t2.z, t2.w, f.z), f.w)
          );
        }

        // Wave height calculation adapted from ocean shader
        float WaveHt(vec3 p) {
          const mat2 qRot = mat2(1.6, -1.2, 1.2, 1.6);
          vec4 t4, t4o, ta4, v4;
          vec2 q2, t2, v2;
          float wFreq, wAmp, pRough, ht;

          wFreq = waveFreq;
          wAmp = waveAmp;
          pRough = waveRoughness;

          t4o.xz = iTime * timeScale * vec2(1., -1.);
          q2 = p.xz;
          ht = 0.;

          for(int j = 0; j < 4; j++) {
            if(j >= octaves) break;

            t4 = (t4o.xxzz + vec4(q2, q2)) * wFreq;
            t2 = Noisev2v4(t4);
            t4 += 2. * vec4(t2.xx, t2.yy) - 1.;
            ta4 = abs(sin(t4));
            v4 = (1. - ta4) * (ta4 + sqrt(1. - ta4 * ta4));
            v2 = pow(1. - pow(v4.xz * v4.yw, vec2(0.65)), vec2(pRough));
            ht += (v2.x + v2.y) * wAmp;

            q2 *= qRot;
            wFreq *= lacunarity;
            wAmp *= persistance;
            pRough = 0.8 * pRough + 0.2;
          }

          return ht;
        }

        // Improved hash function for better distribution
        vec3 Hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yxz + 33.33);
          return fract((p3.xxy + p3.yzz) * p3.zyx);
        }

        // Improved Voronoi function with smoother animation
        float Voronoi(vec2 uv, float smoothness, float speed) {
          vec2 cell = floor(uv);
          vec2 fraction = fract(uv);
          float minDistance = 8.0;

          for(int j = -1; j <= 1; j++) {
            for(int i = -1; i <= 1; i++) {
              vec2 offset = vec2(float(i), float(j));
              vec2 neighbor = cell + offset;
              vec3 hash = Hash(neighbor);

              // Smooth animation with sine wave instead of fract for smoother transitions
              vec2 point = 0.5 + 0.3 * sin(iTime * speed + 6.2831 * hash.xy);
              vec2 diff = offset + point - fraction;
              float distance = length(diff);

              // Smooth minimum using exponential blending
              float h = max(smoothness - abs(distance - minDistance), 0.0) / smoothness;
              minDistance = mix(minDistance, distance, h) - h * (1.0 - h) * smoothness * 0.5;
            }
          }

          return minDistance;
        }

        // Alternative Voronoi with F1 - F2 for more interesting patterns
        float VoronoiF1F2(vec2 uv, float smoothness, float speed) {
          vec2 cell = floor(uv);
          vec2 fraction = fract(uv);

          float f1 = 8.0;
          float f2 = 8.0;

          for(int j = -1; j <= 1; j++) {
            for(int i = -1; i <= 1; i++) {
              vec2 offset = vec2(float(i), float(j));
              vec2 neighbor = cell + offset;
              vec3 hash = Hash(neighbor);

              // Smoother point animation
              vec2 point = 0.5 + 0.35 * sin(iTime * speed + 6.2831 * hash.xy);
              vec2 diff = offset + point - fraction;
              float distance = length(diff);

              if(distance < f1) {
                f2 = f1;
                f1 = distance;
              } else if(distance < f2) {
                f2 = distance;
              }
            }
          }

          // Return the difference for interesting edge patterns
          return smoothstep(0.0, smoothness, f2 - f1);
        }

        float Foam(vec2 p, float waveInfluence) {
          // Reduce wave distortion to minimize noise
          vec2 distortion = vec2(
            WaveHt(vec3(p.x * 0.05, 0.0, p.y * 0.05)),
            WaveHt(vec3(p.x * 0.05 + 100.0, 0.0, p.y * 0.05 + 100.0))
          ) * 0.05;

          p += distortion;

          // Use improved Voronoi functions
          float layer1 = Voronoi(voronoiScaleA * p, voronoiSmoothnessA, voronoiSpeedA);
          float layer2 = VoronoiF1F2(voronoiScaleB * p, voronoiSmoothnessB, voronoiSpeedB);
          float layer3 = Voronoi(voronoiScaleC * p, voronoiSmoothnessC, voronoiSpeedC);

          // Combine layers more smoothly
          float foam = layer1 * 0.4 + layer2 * 0.4 + layer3 * 0.2;
          foam = pow(foam, voronoiPower);

          // Apply wave influence more smoothly
          foam = mix(foam, foam * foamIntensity, waveInfluence * 0.5);

          return clamp(foam, 0.0, 1.0);
        }

        void main() {
        vec2 uv = vUv;

        // Calculate wave influence at this position
        float waveHeight = WaveHt(vWorldPosition);
        float waveInfluence = smoothstep(foamThreshold, 1.0, abs(waveHeight));

        // Create a smoother gradient that fades out at the edges - MODIFIED
        float edgeFade = 1.0 - 1.8 * max(abs(vUv.x - 0.5), abs(vUv.y - 0.5));
        edgeFade = smoothstep(0.1, 0.9, edgeFade);

        // Create wake pattern with reduced center intensity - MODIFIED
        float wakePattern = 1.0 - abs(vUv.x - 0.5) * 2.0;
        wakePattern = pow(wakePattern, 0.8) * 0.7;

        // Get enhanced foam value with wave influence
        float foam = Foam(uv * scale, waveInfluence);

        // Combine foam with reduced intensity - MODIFIED
        foam = foam * wakePattern * (0.6 + waveInfluence * 0.2);

        // Reduced brightness variation - MODIFIED
        float brightness = 0.8 + sin(waveHeight * 2.0) * 0.05;

        // Apply color and transparency
        vec3 finalColor = foam * voronoiColor * brightness;
        float finalAlpha = foam * opacity * edgeFade;

        // Ensure minimum alpha to prevent complete disappearance
        finalAlpha = max(finalAlpha, 0.01);

        gl_FragColor = vec4(finalColor, finalAlpha);
      }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    return foamShader;
  }

  // Enhanced method to update wave properties
  updateWaveParameter(paramName, value) {
    if (this.waveProperties.hasOwnProperty(paramName)) {
      this.waveProperties[paramName] = value;

      if (this.wakePlane && this.wakePlane.material) {
        // Update the corresponding shader uniform
        if (this.wakePlane.material.uniforms[paramName]) {
          this.wakePlane.material.uniforms[paramName].value = value;
        }
      }
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

  // Getter for wave animation properties
  getWaveProperties() {
    return this.waveProperties;
  }
};
