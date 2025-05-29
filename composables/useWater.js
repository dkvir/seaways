// Enhanced useWater.js with static foam/wake effect positioned at wake geometry
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water";

export const useWater = class WaterWaves {
  constructor(scene, waves, wakeInstance = null) {
    this.water = null;
    this.scene = scene;
    this.waves = waves;
    this.wakeInstance = wakeInstance; // Reference to wake instance

    // Static foam properties - will be set from wake geometry
    this.staticFoamPoint = new THREE.Vector3(-6.5, 4, -105);
    this.foamWidth = 90; // Default, will be updated from wake
    this.foamLength = 400; // Default, will be updated from wake
    this.foamIntensity = 1.0;
    this.foamEnabled = true;
  }

  createWater() {
    const geometry = new THREE.BufferGeometry();

    const thetaSegments = 128;
    const phiSegments = 512;
    const thetaStart = 0;
    const thetaLength = Math.PI * 2;

    const indices = [];
    const vertices = [];
    const normals = [];
    const uvs = [];

    let radius = 0;
    let radiusStep = 1;
    const vertex = new THREE.Vector3();
    const uv = new THREE.Vector2();

    for (let j = 0; j <= phiSegments; j++) {
      for (let i = 0; i <= thetaSegments; i++) {
        const segment = thetaStart + (i / thetaSegments) * thetaLength;
        vertex.x = radius * Math.cos(segment);
        vertex.y = radius * Math.sin(segment);
        vertices.push(vertex.x, vertex.y, vertex.z);
        normals.push(0, 0, 1);
        uv.x = (vertex.x + 1) / 2;
        uv.y = (vertex.y + 1) / 2;
        uvs.push(uv.x, uv.y);
      }
      radiusStep = radiusStep * 1.01;
      radius += radiusStep;
    }

    for (let j = 0; j < phiSegments; j++) {
      const thetaSegmentLevel = j * (thetaSegments + 1);
      for (let i = 0; i < thetaSegments; i++) {
        const segment = i + thetaSegmentLevel;
        const a = segment;
        const b = segment + thetaSegments + 1;
        const c = segment + thetaSegments + 2;
        const d = segment + 1;
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geometry.setIndex(indices);
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3)
    );
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

    this.water = new Water(geometry, {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: new THREE.TextureLoader().load(
        "/textures/waternormals.jpg",
        function (texture) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        }
      ),
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 8,
      fog: this.scene.fog !== undefined,
    });

    this.water.rotation.x = -Math.PI / 2;
    this.setupFoamShader();

    // Initialize foam position from wake instance if available
    this.updateFoamFromWake();
  }

  updateFoamFromWake() {
    if (this.wakeInstance) {
      const wakeProps = this.wakeInstance.getWakeProperties();
      this.staticFoamPoint.set(
        wakeProps.positionX,
        wakeProps.positionY,
        wakeProps.positionZ
      );
      this.foamWidth = wakeProps.width;
      this.foamLength = wakeProps.length;

      // Update shader uniforms if they exist
      if (this.foamUniforms) {
        this.foamUniforms.staticFoamPoint.value.copy(this.staticFoamPoint);
        this.foamUniforms.foamWidth.value = this.foamWidth;
        this.foamUniforms.foamLength.value = this.foamLength;
      }
    }
  }

  setupFoamShader() {
    this.water.material.onBeforeCompile = (shader) => {
      shader.uniforms.offsetX = { value: 0 };
      shader.uniforms.offsetZ = { value: 0 };

      // Static foam/wake effect uniforms
      shader.uniforms.staticFoamPoint = { value: this.staticFoamPoint };
      shader.uniforms.foamEnabled = { value: this.foamEnabled ? 1.0 : 0.0 };
      shader.uniforms.foamWidth = { value: this.foamWidth };
      shader.uniforms.foamLength = { value: this.foamLength };
      shader.uniforms.foamIntensity = { value: this.foamIntensity };

      shader.uniforms.waveA = {
        value: [
          Math.sin((this.waves[0].direction * Math.PI) / 180),
          Math.cos((this.waves[0].direction * Math.PI) / 180),
          this.waves[0].steepness,
          this.waves[0].wavelength,
        ],
      };
      shader.uniforms.waveB = {
        value: [
          Math.sin((this.waves[1].direction * Math.PI) / 180),
          Math.cos((this.waves[1].direction * Math.PI) / 180),
          this.waves[1].steepness,
          this.waves[1].wavelength,
        ],
      };
      shader.uniforms.waveC = {
        value: [
          Math.sin((this.waves[2].direction * Math.PI) / 180),
          Math.cos((this.waves[2].direction * Math.PI) / 180),
          this.waves[2].steepness,
          this.waves[2].wavelength,
        ],
      };

      // Enhanced vertex shader
      shader.vertexShader = `
        uniform mat4 textureMatrix;
        uniform float time;

        varying vec4 mirrorCoord;
        varying vec4 worldPosition;
        varying vec3 vWorldPos;

        #include <common>
        #include <fog_pars_vertex>
        #include <shadowmap_pars_vertex>
        #include <logdepthbuf_pars_vertex>

        uniform vec4 waveA;
        uniform vec4 waveB;
        uniform vec4 waveC;
        uniform float offsetX;
        uniform float offsetZ;

        vec3 GerstnerWave (vec4 wave, vec3 p) {
          float steepness = wave.z;
          float wavelength = wave.w;
          float k = 2.0 * PI / wavelength;
          float c = sqrt(9.8 / k);
          vec2 d = normalize(wave.xy);
          float f = k * (dot(d, vec2(p.x, p.y)) - c * time);
          float a = steepness / k;

          return vec3(
            d.x * (a * cos(f)),
            d.y * (a * cos(f)),
            a * sin(f)
          );
        }

        void main() {
          mirrorCoord = modelMatrix * vec4( position, 1.0 );
          worldPosition = mirrorCoord.xyzw;
          mirrorCoord = textureMatrix * mirrorCoord;
          vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );

          vec3 gridPoint = position.xyz;
          vec3 tangent = vec3(1, 0, 0);
          vec3 binormal = vec3(0, 0, 1);
          vec3 p = gridPoint;
          gridPoint.x += offsetX;
          gridPoint.y -= offsetZ;
          p += GerstnerWave(waveA, gridPoint);
          p += GerstnerWave(waveB, gridPoint);
          p += GerstnerWave(waveC, gridPoint);

          vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4( p.x, p.y, p.z, 1.0);

          #include <beginnormal_vertex>
          #include <defaultnormal_vertex>
          #include <logdepthbuf_vertex>
          #include <fog_vertex>
          #include <shadowmap_vertex>
        }`;

      // Enhanced fragment shader with static foam/wake effect
      shader.fragmentShader = `
        uniform sampler2D mirrorSampler;
        uniform float alpha;
        uniform float time;
        uniform float size;
        uniform float distortionScale;
        uniform sampler2D normalSampler;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;
        uniform vec3 eye;
        uniform vec3 waterColor;
        uniform float offsetX;
        uniform float offsetZ;

        // Static foam/wake effect uniforms
        uniform vec3 staticFoamPoint;
        uniform float foamEnabled;
        uniform float foamWidth;
        uniform float foamLength;
        uniform float foamIntensity;

        varying vec4 mirrorCoord;
        varying vec4 worldPosition;
        varying vec3 vWorldPos;

        // Hash functions for noise generation
        const vec4 cHashA4 = vec4(0., 1., 57., 58.);
        const vec3 cHashA3 = vec3(1., 57., 113.);
        const float cHashM = 43758.54;

        vec4 Hashv4f(float p) {
          return fract(sin(p + cHashA4) * cHashM);
        }

        // 2D noise function
        float Noisefv2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3. - 2. * f);
          vec4 t = Hashv4f(dot(i, cHashA3.xy));
          return mix(mix(t.x, t.y, f.x), mix(t.z, t.w, f.x), f.y);
        }

        // Fractional Brownian Motion for foam texture
        float Fbm2(vec2 p) {
          float f = 0.0;
          float a = 0.5;
          for(int i = 0; i < 5; i++) {
            f += a * Noisefv2(p);
            p *= 2.0;
            a *= 0.5;
          }
          return f;
        }

        // Create foam pattern
        float foamPattern(vec2 p, float intensity) {
          vec2 q = p * 8.0 + vec2(time * 0.3, time * 0.2);
          float foam = Fbm2(q);

          // Add turbulence
          vec2 r = p * 16.0 + vec2(time * 0.1, -time * 0.15);
          foam += 0.3 * Fbm2(r);

          // Create bubbling effect
          vec2 s = p * 32.0 + vec2(-time * 0.4, time * 0.25);
          foam += 0.15 * Fbm2(s);

          return clamp(foam * intensity, 0.0, 1.0);
        }

        // Static wake pattern function - rectangular area matching wake geometry
        float staticWakePattern(vec2 worldPos) {
            if(foamEnabled < 0.5) return 0.0;

            // Calculate relative position from foam center
            vec2 relativePos = worldPos - staticFoamPoint.xz;

            // Create rectangular bounds matching wake geometry dimensions
            float halfWidth = foamWidth * 0.5;
            float halfLength = foamLength * 0.5;

            // Check if we're within the rectangular wake area
            if(abs(relativePos.x) < halfWidth && abs(relativePos.y) < halfLength) {
                // Calculate distance from center as percentage
                vec2 normalizedPos = relativePos / vec2(halfWidth, halfLength);

                // Create wake shape - stronger at center, fading towards edges
                float centerFalloff = 1.0 - length(normalizedPos);
                centerFalloff = smoothstep(0.0, 1.0, centerFalloff);

                // Create wake pattern with boat-like shape (stronger at the back)
                float lengthFactor = (normalizedPos.y + 1.0) * 0.5; // 0 at front, 1 at back
                float wakeShape = centerFalloff * (0.3 + 0.7 * lengthFactor);

                // Multi-scale foam texture
                vec2 foamCoord1 = worldPos * 0.05 + vec2(time * 0.1, time * 0.05);
                vec2 foamCoord2 = worldPos * 0.1 + vec2(-time * 0.15, time * 0.1);
                vec2 foamCoord3 = worldPos * 0.2 + vec2(time * 0.08, -time * 0.12);

                float foam1 = foamPattern(foamCoord1, 1.0);
                float foam2 = foamPattern(foamCoord2, 0.8);
                float foam3 = foamPattern(foamCoord3, 0.6);

                // Layer the foam effects
                float combinedFoam = foam1 * 0.6 + foam2 * 0.3 + foam3 * 0.1;

                // Add wave-like disturbance pattern
                float wavePhase = (length(normalizedPos) * 0.3) - (time * 1.5);
                float waveRipple = (sin(wavePhase) * 0.5 + 0.5) * 0.3 + 0.7;

                // Apply foam threshold
                float foamThreshold = 0.4 + 0.2 * wakeShape;
                float foamMask = smoothstep(foamThreshold - 0.1, foamThreshold + 0.1, combinedFoam);

                // Final wake effect
                float wakeEffect = wakeShape * foamMask * foamIntensity * waveRipple;

                // Add extra bright spots for realism
                vec2 bubbleCoord = worldPos * 0.3 + vec2(time * 0.2, -time * 0.18);
                float bubbles = foamPattern(bubbleCoord, 1.5);
                float bubbleMask = smoothstep(0.7, 0.9, bubbles) * wakeShape;
                wakeEffect += bubbleMask * 0.3;

                return clamp(wakeEffect, 0.0, 1.0);
            }

            return 0.0;
        }

        vec4 getNoise(vec2 uv) {
          vec2 uv0 = (uv / 103.0) + vec2(time / 17.0, time / 29.0);
          vec2 uv1 = uv / 107.0 - vec2(time / -19.0, time / 31.0);
          vec2 uv2 = uv / vec2(8907.0, 9803.0) + vec2(time / 101.0, time / 97.0);
          vec2 uv3 = uv / vec2(1091.0, 1027.0) - vec2(time / 109.0, time / -113.0);
          vec4 noise = texture2D(normalSampler, uv0) +
              texture2D(normalSampler, uv1) +
              texture2D(normalSampler, uv2) +
              texture2D(normalSampler, uv3);
          return noise * 0.5 - 1.0;
        }

        void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor) {
          vec3 reflection = normalize(reflect(-sunDirection, surfaceNormal));
          float direction = max(0.0, dot(eyeDirection, reflection));
          specularColor += pow(direction, shiny) * sunColor * spec;
          diffuseColor += max(dot(sunDirection, surfaceNormal), 0.0) * sunColor * diffuse;
        }

        #include <common>
        #include <packing>
        #include <bsdfs>
        #include <fog_pars_fragment>
        #include <logdepthbuf_pars_fragment>
        #include <lights_pars_begin>
        #include <shadowmap_pars_fragment>
        #include <shadowmask_pars_fragment>

        void main() {
          #include <logdepthbuf_fragment>

          vec4 noise = getNoise((worldPosition.xz) + vec2(offsetX/12.25, offsetZ/12.25) * size);
          vec3 surfaceNormal = normalize(noise.xzy * vec3(1.5, 1.0, 1.5));

          vec3 diffuseLight = vec3(0.0);
          vec3 specularLight = vec3(0.0);

          vec3 worldToEye = eye - worldPosition.xyz;
          vec3 eyeDirection = normalize(worldToEye);
          sunLight(surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight);

          float distance = length(worldToEye);

          vec2 distortion = surfaceNormal.xz * (0.001 + 1.0 / distance) * distortionScale;
          vec3 reflectionSample = vec3(texture2D(mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion));

          float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
          float rf0 = 0.3;
          float reflectance = rf0 + (1.0 - rf0) * pow((1.0 - theta), 5.0);
          vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
          vec3 albedo = mix((sunColor * diffuseLight * 0.3 + scatter) * getShadowMask(), (vec3(0.1) + reflectionSample * 0.9 + reflectionSample * specularLight), reflectance);

          // Calculate static wake/foam effect
          float wakeEffect = staticWakePattern(vWorldPos.xz);

          // Create foam color with slight blue tint
          vec3 foamColor = vec3(0.95, 0.98, 1.0);

          // Enhanced foam effect with edge highlighting
          float foamMask = pow(wakeEffect, 0.8);
          vec3 finalColor = mix(albedo, foamColor, foamMask);

          // Add extra brightness to foam areas
          finalColor += foamColor * wakeEffect * 0.3;

          gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), alpha);

          #include <tonemapping_fragment>
          #include <fog_fragment>
        }`;

      shader.uniforms.size.value = 10.0;

      // Store reference to shader uniforms for updates
      this.foamUniforms = {
        staticFoamPoint: shader.uniforms.staticFoamPoint,
        foamEnabled: shader.uniforms.foamEnabled,
        foamWidth: shader.uniforms.foamWidth,
        foamLength: shader.uniforms.foamLength,
        foamIntensity: shader.uniforms.foamIntensity,
      };
    };
  }

  // Method to set static foam position and dimensions
  setStaticFoam(position, width, length) {
    this.staticFoamPoint.copy(position);
    this.foamWidth = width;
    this.foamLength = length;

    if (this.foamUniforms) {
      this.foamUniforms.staticFoamPoint.value.copy(this.staticFoamPoint);
      this.foamUniforms.foamWidth.value = this.foamWidth;
      this.foamUniforms.foamLength.value = this.foamLength;
    }
  }

  // Method to update foam position (useful for moving boats)
  updateFoamPosition(x, y, z) {
    this.staticFoamPoint.set(x, y, z);
    if (this.foamUniforms) {
      this.foamUniforms.staticFoamPoint.value.copy(this.staticFoamPoint);
    }
  }

  // Method to update foam dimensions
  updateFoamDimensions(width, length) {
    this.foamWidth = width;
    this.foamLength = length;
    if (this.foamUniforms) {
      this.foamUniforms.foamWidth.value = width;
      this.foamUniforms.foamLength.value = length;
    }
  }

  // Method to enable/disable foam
  setFoamEnabled(enabled) {
    this.foamEnabled = enabled;
    if (this.foamUniforms) {
      this.foamUniforms.foamEnabled.value = enabled ? 1.0 : 0.0;
    }
  }

  // Method to set foam intensity
  setFoamIntensity(intensity) {
    this.foamIntensity = intensity;
    if (this.foamUniforms) {
      this.foamUniforms.foamIntensity.value = intensity;
    }
  }

  // Method to sync with wake instance
  syncWithWake() {
    this.updateFoamFromWake();
  }

  // Remove mouse event setup methods since we're using static foam
  cleanup() {
    // No mouse events to clean up
  }

  getWater() {
    return this.water;
  }
};
