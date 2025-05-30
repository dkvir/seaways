// Enhanced useWater.js with combined wake/foam effect shader
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water";

export const useWater = class WaterWaves {
  constructor(scene, waves, wakeInstance = null) {
    this.water = null;
    this.scene = scene;
    this.waves = waves;
    this.wakeInstance = wakeInstance;

    // Wake properties from useWake
    this.wakeProperties = {
      width: 90,
      length: 400,
      heightOffset: 0.05,
      positionX: -6.5,
      positionY: 4,
      positionZ: -105,
      opacity: 1.0,
    };

    // Wave animation properties from useWake
    this.waveProperties = {
      waveFreq: 0.13,
      waveAmp: 1.0,
      waveRoughness: 8.0,
      timeScale: 1.0,
      octaves: 6,
      persistance: 0.1,
      lacunarity: 1.5,
    };

    // Foam shader parameters from useWake
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

    this.foamUniforms = null;
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
    this.setupEnhancedWakeShader();
  }

  setupEnhancedWakeShader() {
    this.water.material.onBeforeCompile = (shader) => {
      // Original water uniforms
      shader.uniforms.offsetX = { value: 0 };
      shader.uniforms.offsetZ = { value: 0 };

      // Wake position and dimensions uniforms
      shader.uniforms.wakePositionX = { value: this.wakeProperties.positionX };
      shader.uniforms.wakePositionZ = { value: this.wakeProperties.positionZ };
      shader.uniforms.wakeWidth = { value: this.wakeProperties.width };
      shader.uniforms.wakeLength = { value: this.wakeProperties.length };
      shader.uniforms.wakeOpacity = { value: this.wakeProperties.opacity };

      // Enhanced foam shader uniforms from useWake
      shader.uniforms.voronoiSmoothnessA = {
        value: this.foamProperties.voronoiSmoothnessA,
      };
      shader.uniforms.voronoiSmoothnessB = {
        value: this.foamProperties.voronoiSmoothnessB,
      };
      shader.uniforms.voronoiSmoothnessC = {
        value: this.foamProperties.voronoiSmoothnessC,
      };
      shader.uniforms.voronoiSpeedA = {
        value: this.foamProperties.voronoiSpeedA,
      };
      shader.uniforms.voronoiSpeedB = {
        value: this.foamProperties.voronoiSpeedB,
      };
      shader.uniforms.voronoiSpeedC = {
        value: this.foamProperties.voronoiSpeedC,
      };
      shader.uniforms.voronoiScaleA = {
        value: this.foamProperties.voronoiScaleA,
      };
      shader.uniforms.voronoiScaleB = {
        value: this.foamProperties.voronoiScaleB,
      };
      shader.uniforms.voronoiScaleC = {
        value: this.foamProperties.voronoiScaleC,
      };
      shader.uniforms.voronoiPower = {
        value: this.foamProperties.voronoiPower,
      };
      shader.uniforms.voronoiColor = {
        value: this.foamProperties.voronoiColor,
      };
      shader.uniforms.foamScale = { value: this.foamProperties.scale };
      shader.uniforms.foamThreshold = {
        value: this.foamProperties.foamThreshold,
      };
      shader.uniforms.foamIntensity = {
        value: this.foamProperties.foamIntensity,
      };

      // Wave animation uniforms from useWake
      shader.uniforms.wakeWaveFreq = { value: this.waveProperties.waveFreq };
      shader.uniforms.wakeWaveAmp = { value: this.waveProperties.waveAmp };
      shader.uniforms.wakeWaveRoughness = {
        value: this.waveProperties.waveRoughness,
      };
      shader.uniforms.wakeTimeScale = { value: this.waveProperties.timeScale };
      shader.uniforms.wakeOctaves = { value: this.waveProperties.octaves };
      shader.uniforms.wakePersistance = {
        value: this.waveProperties.persistance,
      };
      shader.uniforms.wakeLacunarity = {
        value: this.waveProperties.lacunarity,
      };

      // Original Gerstner wave uniforms
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

      // Enhanced vertex shader (same as original with wave calculations)
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

      // Enhanced fragment shader combining original water with wake shader
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

        // Wake properties
        uniform float wakePositionX;
        uniform float wakePositionZ;
        uniform float wakeWidth;
        uniform float wakeLength;
        uniform float wakeOpacity;

        // Enhanced foam properties from useWake
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
        uniform float foamScale;
        uniform float foamThreshold;
        uniform float foamIntensity;

        // Wave animation properties from useWake
        uniform float wakeWaveFreq;
        uniform float wakeWaveAmp;
        uniform float wakeWaveRoughness;
        uniform float wakeTimeScale;
        uniform float wakeOctaves;
        uniform float wakePersistance;
        uniform float wakeLacunarity;

        varying vec4 mirrorCoord;
        varying vec4 worldPosition;
        varying vec3 vWorldPos;

        const float pi = 3.14159265359;
        const vec4 cHashA4 = vec4(0., 1., 57., 58.);
        const float cHashM = 43758.54;

        // Hash functions from useWake
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

        // Wave height calculation from useWake
        float WakeWaveHt(vec3 p) {
          const mat2 qRot = mat2(1.6, -1.2, 1.2, 1.6);
          vec4 t4, t4o, ta4, v4;
          vec2 q2, t2, v2;
          float wFreq, wAmp, pRough, ht;

          wFreq = wakeWaveFreq;
          wAmp = wakeWaveAmp;
          pRough = wakeWaveRoughness;

          t4o.xz = time * wakeTimeScale * vec2(1., -1.);
          q2 = p.xz;
          ht = 0.;

          for(int j = 0; j < 4; j++) {
            if(float(j) >= wakeOctaves) break;

            t4 = (t4o.xxzz + vec4(q2, q2)) * wFreq;
            t2 = Noisev2v4(t4);
            t4 += 2. * vec4(t2.xx, t2.yy) - 1.;
            ta4 = abs(sin(t4));
            v4 = (1. - ta4) * (ta4 + sqrt(1. - ta4 * ta4));
            v2 = pow(1. - pow(v4.xz * v4.yw, vec2(0.65)), vec2(pRough));
            ht += (v2.x + v2.y) * wAmp;

            q2 *= qRot;
            wFreq *= wakeLacunarity;
            wAmp *= wakePersistance;
            pRough = 0.8 * pRough + 0.2;
          }

          return ht;
        }

        // Improved hash function for Voronoi
        vec3 Hash(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
          p3 += dot(p3, p3.yxz + 33.33);
          return fract((p3.xxy + p3.yzz) * p3.zyx);
        }

        // Voronoi functions from useWake
        float Voronoi(vec2 uv, float smoothness, float speed) {
          vec2 cell = floor(uv);
          vec2 fraction = fract(uv);
          float minDistance = 8.0;

          for(int j = -1; j <= 1; j++) {
            for(int i = -1; i <= 1; i++) {
              vec2 offset = vec2(float(i), float(j));
              vec2 neighbor = cell + offset;
              vec3 hash = Hash(neighbor);

              vec2 point = 0.5 + 0.3 * sin(time * speed + 6.2831 * hash.xy);
              vec2 diff = offset + point - fraction;
              float distance = length(diff);

              float h = max(smoothness - abs(distance - minDistance), 0.0) / smoothness;
              minDistance = mix(minDistance, distance, h) - h * (1.0 - h) * smoothness * 0.5;
            }
          }

          return minDistance;
        }

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

              vec2 point = 0.5 + 0.35 * sin(time * speed + 6.2831 * hash.xy);
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

          return smoothstep(0.0, smoothness, f2 - f1);
        }

        // Enhanced Foam function from useWake
        float EnhancedFoam(vec2 p, float waveInfluence) {
          vec2 distortion = vec2(
            WakeWaveHt(vec3(p.x * 0.05, 0.0, p.y * 0.05)),
            WakeWaveHt(vec3(p.x * 0.05 + 100.0, 0.0, p.y * 0.05 + 100.0))
          ) * 0.05;

          p += distortion;

          float layer1 = Voronoi(voronoiScaleA * p, voronoiSmoothnessA, voronoiSpeedA);
          float layer2 = VoronoiF1F2(voronoiScaleB * p, voronoiSmoothnessB, voronoiSpeedB);
          float layer3 = Voronoi(voronoiScaleC * p, voronoiSmoothnessC, voronoiSpeedC);

          float foam = layer1 * 0.4 + layer2 * 0.4 + layer3 * 0.2;
          foam = pow(foam, voronoiPower);
          foam = mix(foam, foam * foamIntensity, waveInfluence * 0.5);

          return clamp(foam, 0.0, 1.0);
        }

        // Wake pattern calculation
        float calculateWakeEffect(vec2 worldPos) {
          // Calculate relative position from wake center
          vec2 relativePos = worldPos - vec2(wakePositionX, wakePositionZ);

          // Check if we're within the wake bounds
          float halfWidth = wakeWidth * 0.5;
          float halfLength = wakeLength * 0.5;

          if(abs(relativePos.x) > halfWidth || abs(relativePos.y) > halfLength) {
            return 0.0;
          }

          // Calculate UV coordinates for the wake area
          vec2 wakeUV = (relativePos + vec2(halfWidth, halfLength)) / vec2(wakeWidth, wakeLength);

          // Create edge fade similar to the original wake shader
          float edgeFade = 1.0 - 1.8 * max(abs(wakeUV.x - 0.5), abs(wakeUV.y - 0.5));
          edgeFade = smoothstep(0.1, 0.9, edgeFade);

          // Create wake pattern
          float wakePattern = 1.0 - abs(wakeUV.x - 0.5) * 2.0;
          wakePattern = pow(wakePattern, 0.8) * 0.7;

          // Calculate wave influence
          float waveHeight = WakeWaveHt(vec3(worldPos.x, 0.0, worldPos.y));
          float waveInfluence = smoothstep(foamThreshold, 1.0, abs(waveHeight));

          // Get enhanced foam
          float foam = EnhancedFoam(wakeUV * foamScale, waveInfluence);
          foam = foam * wakePattern * (0.6 + waveInfluence * 0.2);

          // Apply brightness variation
          float brightness = 0.8 + sin(waveHeight * 2.0) * 0.05;

          return foam * brightness * edgeFade * wakeOpacity;
        }

        // Original water noise function
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

          // Calculate enhanced wake effect
          float wakeEffect = calculateWakeEffect(vWorldPos.xz);

          // Apply wake effect to water
          vec3 finalColor = mix(albedo, voronoiColor, wakeEffect);
          finalColor += voronoiColor * wakeEffect * 0.3; // Extra brightness

          gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), alpha);

          #include <tonemapping_fragment>
          #include <fog_fragment>
        }`;

      shader.uniforms.size.value = 10.0;

      // Store reference to uniforms for updates
      this.foamUniforms = {
        wakePositionX: shader.uniforms.wakePositionX,
        wakePositionZ: shader.uniforms.wakePositionZ,
        wakeWidth: shader.uniforms.wakeWidth,
        wakeLength: shader.uniforms.wakeLength,
        wakeOpacity: shader.uniforms.wakeOpacity,
        voronoiSmoothnessA: shader.uniforms.voronoiSmoothnessA,
        voronoiSmoothnessB: shader.uniforms.voronoiSmoothnessB,
        voronoiSmoothnessC: shader.uniforms.voronoiSmoothnessC,
        voronoiSpeedA: shader.uniforms.voronoiSpeedA,
        voronoiSpeedB: shader.uniforms.voronoiSpeedB,
        voronoiSpeedC: shader.uniforms.voronoiSpeedC,
        voronoiScaleA: shader.uniforms.voronoiScaleA,
        voronoiScaleB: shader.uniforms.voronoiScaleB,
        voronoiScaleC: shader.uniforms.voronoiScaleC,
        voronoiPower: shader.uniforms.voronoiPower,
        voronoiColor: shader.uniforms.voronoiColor,
        foamScale: shader.uniforms.foamScale,
        foamThreshold: shader.uniforms.foamThreshold,
        foamIntensity: shader.uniforms.foamIntensity,
        wakeWaveFreq: shader.uniforms.wakeWaveFreq,
        wakeWaveAmp: shader.uniforms.wakeWaveAmp,
        wakeWaveRoughness: shader.uniforms.wakeWaveRoughness,
        wakeTimeScale: shader.uniforms.wakeTimeScale,
        wakeOctaves: shader.uniforms.wakeOctaves,
        wakePersistance: shader.uniforms.wakePersistance,
        wakeLacunarity: shader.uniforms.wakeLacunarity,
      };
    };
  }

  // Add water to scene
  addToScene() {
    if (this.water && this.scene) {
      this.scene.add(this.water);
    }
  }

  // Remove water from scene
  removeFromScene() {
    if (this.water && this.scene) {
      this.scene.remove(this.water);
    }
  }

  // Methods to update wake properties
  updateWakePosition(x, z) {
    this.wakeProperties.positionX = x;
    this.wakeProperties.positionZ = z;
    if (this.foamUniforms) {
      this.foamUniforms.wakePositionX.value = x;
      this.foamUniforms.wakePositionZ.value = z;
    }
  }

  updateWakeDimensions(width, length) {
    this.wakeProperties.width = width;
    this.wakeProperties.length = length;
    if (this.foamUniforms) {
      this.foamUniforms.wakeWidth.value = width;
      this.foamUniforms.wakeLength.value = length;
    }
  }

  updateWakeOpacity(opacity) {
    this.wakeProperties.opacity = opacity;
    if (this.foamUniforms) {
      this.foamUniforms.wakeOpacity.value = opacity;
    }
  }

  // Method to update foam parameters (completion)
  updateFoamParameter(paramName, value) {
    if (this.foamProperties.hasOwnProperty(paramName)) {
      this.foamProperties[paramName] = value;
      if (this.foamUniforms && this.foamUniforms[paramName]) {
        this.foamUniforms[paramName].value = value;
      }
    }
  }

  // Method to update wave parameters
  updateWaveParameter(paramName, value) {
    if (this.waveProperties.hasOwnProperty(paramName)) {
      this.waveProperties[paramName] = value;
      if (
        this.foamUniforms &&
        this.foamUniforms[
          "wake" + paramName.charAt(0).toUpperCase() + paramName.slice(1)
        ]
      ) {
        this.foamUniforms[
          "wake" + paramName.charAt(0).toUpperCase() + paramName.slice(1)
        ].value = value;
      }
    }
  }

  // Get water mesh for external access
  getWater() {
    return this.water;
  }

  // Update method for animation loop
  update() {
    if (this.water) {
      this.water.material.uniforms["time"].value += 1.0 / 60.0;
    }
  }

  // Cleanup method
  dispose() {
    if (this.water) {
      if (this.water.geometry) {
        this.water.geometry.dispose();
      }
      if (this.water.material) {
        this.water.material.dispose();
      }
      this.removeFromScene();
    }
  }
};
