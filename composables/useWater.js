import * as THREE from "three";
import { Water } from "three/examples/jsm/objects/Water";

export const useWater = class WaterWaves {
  constructor(scene, waves) {
    this.water = null;
    this.scene = scene;
    this.waves = waves;
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
    this.water.material.onBeforeCompile = (shader) => {
      shader.uniforms.offsetX = {
        value: 0,
      };
      shader.uniforms.offsetZ = {
        value: 0,
      };
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
      shader.vertexShader =
        "\n                uniform mat4 textureMatrix;\n                uniform float time;\n\n                varying vec4 mirrorCoord;\n                varying vec4 worldPosition;\n\n                #include <common>\n                #include <fog_pars_vertex>\n                #include <shadowmap_pars_vertex>\n                #include <logdepthbuf_pars_vertex>\n\n                uniform vec4 waveA;\n                uniform vec4 waveB;\n                uniform vec4 waveC;\n\n                uniform float offsetX;\n                uniform float offsetZ;\n\n                vec3 GerstnerWave (vec4 wave, vec3 p) {\n                    float steepness = wave.z;\n                    float wavelength = wave.w;\n                    float k = 2.0 * PI / wavelength;\n                    float c = sqrt(9.8 / k);\n                    vec2 d = normalize(wave.xy);\n                    float f = k * (dot(d, vec2(p.x, p.y)) - c * time);\n                    float a = steepness / k;\n\n                    return vec3(\n                        d.x * (a * cos(f)),\n                        d.y * (a * cos(f)),\n                        a * sin(f)\n                    );\n                }\n\n                void main() {\n\n                    mirrorCoord = modelMatrix * vec4( position, 1.0 );\n                    worldPosition = mirrorCoord.xyzw;\n                    mirrorCoord = textureMatrix * mirrorCoord;\n                    vec4 mvPosition =  modelViewMatrix * vec4( position, 1.0 );\n                    \n                    vec3 gridPoint = position.xyz;\n                    vec3 tangent = vec3(1, 0, 0);\n                    vec3 binormal = vec3(0, 0, 1);\n                    vec3 p = gridPoint;\n                    gridPoint.x += offsetX;//*2.0;\n                    gridPoint.y -= offsetZ;//*2.0;\n                    p += GerstnerWave(waveA, gridPoint);\n                    p += GerstnerWave(waveB, gridPoint);\n                    p += GerstnerWave(waveC, gridPoint);\n                    gl_Position = projectionMatrix * modelViewMatrix * vec4( p.x, p.y, p.z, 1.0);\n\n                    #include <beginnormal_vertex>\n                    #include <defaultnormal_vertex>\n                    #include <logdepthbuf_vertex>\n                    #include <fog_vertex>\n                    #include <shadowmap_vertex>\n                }";
      /* shader.fragmentShader = "\n                uniform sampler2D mirrorSampler;\n                uniform float alpha;\n                uniform float time;\n                uniform float size;\n                uniform float distortionScale;\n                uniform sampler2D normalSampler;\n                uniform vec3 sunColor;\n                uniform vec3 sunDirection;\n                uniform vec3 eye;\n                uniform vec3 waterColor;\n\n                varying vec4 mirrorCoord;\n                varying vec4 worldPosition;\n\n                uniform float offsetX;\n                uniform float offsetZ;\n\n                vec4 getNoise( vec2 uv ) {\n                    vec2 uv0 = ( uv / 103.0 ) + vec2(time / 17.0, time / 29.0);\n                    vec2 uv1 = uv / 107.0-vec2( time / -19.0, time / 31.0 );\n                    vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( time / 101.0, time / 97.0 );\n                    vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( time / 109.0, time / -113.0 );\n                    vec4 noise = texture2D( normalSampler, uv0 ) +\n                        texture2D( normalSampler, uv1 ) +\n                        texture2D( normalSampler, uv2 ) +\n                        texture2D( normalSampler, uv3 );\n                    return noise * 0.5 - 1.0;\n                }\n\n                void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {\n                    vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );\n                    float direction = max( 0.0, dot( eyeDirection, reflection ) );\n                    specularColor += pow( direction, shiny ) * sunColor * spec;\n                    diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * sunColor * diffuse;\n                }\n\n                #include <common>\n                #include <packing>\n                #include <bsdfs>\n                #include <fog_pars_fragment>\n                #include <logdepthbuf_pars_fragment>\n                #include <lights_pars_begin>\n                #include <shadowmap_pars_fragment>\n                #include <shadowmask_pars_fragment>\n\n                void main() {\n\n                    #include <logdepthbuf_fragment>\n\n                    vec4 noise = getNoise( (worldPosition.xz) + vec2(offsetX/12.25,offsetZ/12.25) * size );\n                    vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );\n\n                    vec3 diffuseLight = vec3(0.0);\n                    vec3 specularLight = vec3(0.0);\n\n                    vec3 worldToEye = eye-worldPosition.xyz;\n                    vec3 eyeDirection = normalize( worldToEye );\n                    sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );\n\n                    float distance = length(worldToEye);\n\n                    vec2 distortion = surfaceNormal.xz * ( 0.001 + 1.0 / distance ) * distortionScale;\n                    vec3 reflectionSample = vec3( texture2D( mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion ) );\n\n                    float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );\n                    float rf0 = 0.3;\n                    float reflectance = rf0 + ( 1.0 - rf0 ) * pow( ( 1.0 - theta ), 5.0 );\n                    vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) ) * waterColor;\n                    vec3 albedo = mix( ( sunColor * diffuseLight * 0.3 + scatter ) * getShadowMask(), ( vec3( 0.1 ) + reflectionSample * 0.9 + reflectionSample * specularLight ), reflectance);\n                    vec3 outgoingLight = albedo;\n                    gl_FragColor = vec4( outgoingLight, alpha );\n\n                    #include <tonemapping_fragment>\n                    #include <fog_fragment>\n                }"; */
      shader.uniforms.size.value = 10.0;
    };
  }

  getWater() {
    return this.water;
  }
};
