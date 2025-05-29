// Enhanced useWater.js with hover effect
import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water";

export const useWater = class WaterWaves {
  constructor(scene, waves) {
    this.water = null;
    this.scene = scene;
    this.waves = waves;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoverPoint = new THREE.Vector3(0, 0, 0);
    this.isHovering = false;
    this.hoverRadius = 200.0;
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
    this.setupHoverShader();
  }

  setupHoverShader() {
    this.water.material.onBeforeCompile = (shader) => {
      shader.uniforms.offsetX = { value: 0 };
      shader.uniforms.offsetZ = { value: 0 };

      // Hover effect uniforms
      shader.uniforms.hoverPoint = { value: this.hoverPoint };
      shader.uniforms.isHovering = { value: 0.0 };
      shader.uniforms.hoverRadius = { value: this.hoverRadius };

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

      // Enhanced vertex shader with hover detection
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

          // Pass world position for hover detection
          vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;

          gl_Position = projectionMatrix * modelViewMatrix * vec4( p.x, p.y, p.z, 1.0);

          #include <beginnormal_vertex>
          #include <defaultnormal_vertex>
          #include <logdepthbuf_vertex>
          #include <fog_vertex>
          #include <shadowmap_vertex>
        }`;

      // Enhanced fragment shader with hover effect
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

        // Hover effect uniforms
        uniform vec3 hoverPoint;
        uniform float isHovering;
        uniform float hoverRadius;

        varying vec4 mirrorCoord;
        varying vec4 worldPosition;
        varying vec3 vWorldPos;

        vec4 getNoise( vec2 uv ) {
          vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);
          vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );
          vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );
          vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );
          vec4 noise = texture2D( normalSampler, uv0 ) +
              texture2D( normalSampler, uv1 ) +
              texture2D( normalSampler, uv2 ) +
              texture2D( normalSampler, uv3 );
          return noise * 0.5 - 1.0;
        }

        void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
          vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
          float direction = max( 0.0, dot( eyeDirection, reflection ) );
          specularColor += pow( direction, shiny ) * sunColor * spec;
          diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;
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

          vec4 noise = getNoise( (worldPosition.xz) + vec2(offsetX/12.25,offsetZ/12.25) * size );
          vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );

          vec3 diffuseLight = vec3(0.0);
          vec3 specularLight = vec3(0.0);

          vec3 worldToEye = eye-worldPosition.xyz;
          vec3 eyeDirection = normalize( worldToEye );
          sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );

          float distance = length(worldToEye);

          vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;
          vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );

          float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
          float rf0 = 0.3;
          float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );
          vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;
          vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);

          // Add hover effect
          float hoverEffect = 0.0;
          if (isHovering > 0.5) {
            float hoverDist = length(vWorldPos.xz - hoverPoint.xz);
            float normalizedDist = hoverDist / hoverRadius;
            // Create smooth circular falloff
            hoverEffect = smoothstep(1.0, 0.0, normalizedDist);
            // Make it more pronounced
            hoverEffect = pow(hoverEffect, 2.0);
          }

          // Blend with white based on hover effect
          vec3 hoverColor = vec3(1.0, 1.0, 1.0);
          vec3 finalColor = mix(albedo, hoverColor, hoverEffect * 0.8);

          gl_FragColor = vec4( finalColor, alpha );

          #include <tonemapping_fragment>
          #include <fog_fragment>
        }`;

      shader.uniforms.size.value = 10.0;

      // Store reference to shader uniforms for updates
      this.hoverUniforms = {
        hoverPoint: shader.uniforms.hoverPoint,
        isHovering: shader.uniforms.isHovering,
        hoverRadius: shader.uniforms.hoverRadius,
      };
    };
  }

  setupMouseEvents(camera, renderer) {
    const canvas = renderer.domElement;

    const onMouseMove = (event) => {
      // Calculate mouse position in normalized device coordinates
      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update raycaster
      this.raycaster.setFromCamera(this.mouse, camera);

      // Check intersection with water
      const intersects = this.raycaster.intersectObject(this.water);

      if (intersects.length > 0) {
        const intersect = intersects[0];
        this.hoverPoint.copy(intersect.point);
        this.isHovering = true;

        // Update shader uniforms if available
        if (this.hoverUniforms) {
          this.hoverUniforms.hoverPoint.value.copy(this.hoverPoint);
          this.hoverUniforms.isHovering.value = 1.0;
        }

        canvas.style.cursor = "pointer";
      } else {
        this.isHovering = false;
        if (this.hoverUniforms) {
          this.hoverUniforms.isHovering.value = 0.0;
        }
        canvas.style.cursor = "default";
      }
    };

    const onMouseLeave = () => {
      this.isHovering = false;
      if (this.hoverUniforms) {
        this.hoverUniforms.isHovering.value = 0.0;
      }
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Store event listeners for cleanup
    this.mouseEvents = {
      mousemove: onMouseMove,
      mouseleave: onMouseLeave,
    };
  }

  setHoverRadius(radius) {
    this.hoverRadius = radius;
    if (this.hoverUniforms) {
      this.hoverUniforms.hoverRadius.value = radius;
    }
  }

  cleanup() {
    if (this.mouseEvents) {
      const canvas = document.querySelector(".canvas");
      if (canvas) {
        canvas.removeEventListener("mousemove", this.mouseEvents.mousemove);
        canvas.removeEventListener("mouseleave", this.mouseEvents.mouseleave);
      }
    }
  }

  getWater() {
    return this.water;
  }
};
