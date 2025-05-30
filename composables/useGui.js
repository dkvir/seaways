import * as THREE from "three";

export const useGui = (
  water,
  waterInstance,
  waves,
  scene,
  cannonDebugRenderer
) => {
  const { $dat } = useNuxtApp();
  const gui = new $dat.GUI();

  const wakeProps = waterInstance.getWakeProperties();
  const waveProps = waterInstance.getWaveProperties();
  const foamProps = waterInstance.getFoamProperties();

  gui.close();
  gui.add(water.material, "wireframe");

  // Wave A Controls
  const waveAFolder = gui.addFolder("Wave A");
  waveAFolder
    .add(waves[0], "direction", 0, 359)
    .name("Direction")
    .onChange(function (v) {
      const x = (v * Math.PI) / 180;
      water.material.uniforms.waveA.value[0] = Math.sin(x);
      water.material.uniforms.waveA.value[1] = Math.cos(x);
    });
  waveAFolder
    .add(waves[0], "steepness", 0, 1, 0.1)
    .name("Steepness")
    .onChange(function (v) {
      water.material.uniforms.waveA.value[2] = v;
    });
  waveAFolder
    .add(waves[0], "wavelength", 1, 500)
    .name("Wavelength")
    .onChange(function (v) {
      water.material.uniforms.waveA.value[3] = v;
    });

  // Wave B Controls
  const waveBFolder = gui.addFolder("Wave B");
  waveBFolder
    .add(waves[1], "direction", 0, 359)
    .name("Direction")
    .onChange(function (v) {
      const x = (v * Math.PI) / 180;
      water.material.uniforms.waveB.value[0] = Math.sin(x);
      water.material.uniforms.waveB.value[1] = Math.cos(x);
    });
  waveBFolder
    .add(waves[1], "steepness", 0, 1, 0.1)
    .name("Steepness")
    .onChange(function (v) {
      water.material.uniforms.waveB.value[2] = v;
    });
  waveBFolder
    .add(waves[1], "wavelength", 1, 500)
    .name("Wavelength")
    .onChange(function (v) {
      water.material.uniforms.waveB.value[3] = v;
    });

  // Wave C Controls
  const waveCFolder = gui.addFolder("Wave C");
  waveCFolder
    .add(waves[2], "direction", 0, 359)
    .name("Direction")
    .onChange(function (v) {
      const x = (v * Math.PI) / 180;
      water.material.uniforms.waveC.value[0] = Math.sin(x);
      water.material.uniforms.waveC.value[1] = Math.cos(x);
    });
  waveCFolder
    .add(waves[2], "steepness", 0, 1, 0.1)
    .name("Steepness")
    .onChange(function (v) {
      water.material.uniforms.waveC.value[2] = v;
    });
  waveCFolder
    .add(waves[2], "wavelength", 1, 500)
    .name("Wavelength")
    .onChange(function (v) {
      water.material.uniforms.waveC.value[3] = v;
    });

  const wakeFolder = gui.addFolder("Wake Properties");
  wakeFolder
    .add(wakeProps, "width", 10, 200)
    .onChange((v) => waterInstance.updateWakeProperty("wakeWidth", v));
  wakeFolder
    .add(wakeProps, "length", 50, 800)
    .onChange((v) => waterInstance.updateWakeProperty("wakeLength", v));
  wakeFolder
    .add(wakeProps, "heightOffset", 0, 0.2)
    .onChange((v) => waterInstance.updateWakeProperty("heightOffset", v));
  wakeFolder
    .add(wakeProps, "positionX", -50, 50)
    .onChange((v) => waterInstance.updateWakeProperty("wakePositionX", v));
  wakeFolder
    .add(wakeProps, "positionY", -10, 10)
    .onChange((v) => waterInstance.updateWakeProperty("positionY", v));
  wakeFolder
    .add(wakeProps, "positionZ", -200, 50)
    .onChange((v) => waterInstance.updateWakeProperty("wakePositionZ", v));
  wakeFolder
    .add(wakeProps, "opacity", 0, 2)
    .onChange((v) => waterInstance.updateWakeProperty("wakeOpacity", v));

  const waveAnimFolder = gui.addFolder("Wave Animation");

  // Add texture speed control - this was missing!
  waveAnimFolder.add(waveProps, "textureSpeed", 0.01, 2.0).onChange((v) => {
    waveProps.textureSpeed = v;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.textureSpeed) {
      waterInstance.foamUniforms.textureSpeed.value = v;
    }
  });

  waveAnimFolder.add(waveProps, "waveFreq", 0.01, 0.5).onChange((v) => {
    waveProps.waveFreq = v;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.wakeWaveFreq) {
      waterInstance.foamUniforms.wakeWaveFreq.value = v;
    }
  });
  waveAnimFolder.add(waveProps, "waveAmp", 0.1, 3.0).onChange((v) => {
    waveProps.waveAmp = v;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.wakeWaveAmp) {
      waterInstance.foamUniforms.wakeWaveAmp.value = v;
    }
  });
  waveAnimFolder.add(waveProps, "waveRoughness", 1.0, 20.0).onChange((v) => {
    waveProps.waveRoughness = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.wakeWaveRoughness
    ) {
      waterInstance.foamUniforms.wakeWaveRoughness.value = v;
    }
  });
  waveAnimFolder.add(waveProps, "timeScale", 0.1, 3.0).onChange((v) => {
    waveProps.timeScale = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.wakeTimeScale
    ) {
      waterInstance.foamUniforms.wakeTimeScale.value = v;
    }
  });
  waveAnimFolder.add(waveProps, "octaves", 1, 8, 1).onChange((v) => {
    waveProps.octaves = v;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.wakeOctaves) {
      waterInstance.foamUniforms.wakeOctaves.value = v;
    }
  });
  waveAnimFolder.add(waveProps, "persistance", 0.01, 0.5).onChange((v) => {
    waveProps.persistance = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.wakePersistance
    ) {
      waterInstance.foamUniforms.wakePersistance.value = v;
    }
  });
  waveAnimFolder.add(waveProps, "lacunarity", 1.0, 3.0).onChange((v) => {
    waveProps.lacunarity = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.wakeLacunarity
    ) {
      waterInstance.foamUniforms.wakeLacunarity.value = v;
    }
  });

  const foamFolder = gui.addFolder("Foam Properties");

  // Voronoi Smoothness
  const smoothnessFolder = foamFolder.addFolder("Voronoi Smoothness");
  smoothnessFolder
    .add(foamProps, "voronoiSmoothnessA", 0.1, 1.0)
    .onChange((v) => {
      foamProps.voronoiSmoothnessA = v;
      if (
        waterInstance.foamUniforms &&
        waterInstance.foamUniforms.voronoiSmoothnessA
      ) {
        waterInstance.foamUniforms.voronoiSmoothnessA.value = v;
      }
    });
  smoothnessFolder
    .add(foamProps, "voronoiSmoothnessB", 0.1, 1.0)
    .onChange((v) => {
      foamProps.voronoiSmoothnessB = v;
      if (
        waterInstance.foamUniforms &&
        waterInstance.foamUniforms.voronoiSmoothnessB
      ) {
        waterInstance.foamUniforms.voronoiSmoothnessB.value = v;
      }
    });
  smoothnessFolder
    .add(foamProps, "voronoiSmoothnessC", 0.1, 1.0)
    .onChange((v) => {
      foamProps.voronoiSmoothnessC = v;
      if (
        waterInstance.foamUniforms &&
        waterInstance.foamUniforms.voronoiSmoothnessC
      ) {
        waterInstance.foamUniforms.voronoiSmoothnessC.value = v;
      }
    });

  // Voronoi Speed
  const speedFolder = foamFolder.addFolder("Voronoi Speed");
  speedFolder.add(foamProps, "voronoiSpeedA", 0.1, 1.0).onChange((v) => {
    foamProps.voronoiSpeedA = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.voronoiSpeedA
    ) {
      waterInstance.foamUniforms.voronoiSpeedA.value = v;
    }
  });
  speedFolder.add(foamProps, "voronoiSpeedB", 0.1, 1.0).onChange((v) => {
    foamProps.voronoiSpeedB = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.voronoiSpeedB
    ) {
      waterInstance.foamUniforms.voronoiSpeedB.value = v;
    }
  });
  speedFolder.add(foamProps, "voronoiSpeedC", 0.1, 1.0).onChange((v) => {
    foamProps.voronoiSpeedC = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.voronoiSpeedC
    ) {
      waterInstance.foamUniforms.voronoiSpeedC.value = v;
    }
  });

  // Voronoi Scale
  const scaleFolder = foamFolder.addFolder("Voronoi Scale");
  scaleFolder.add(foamProps, "voronoiScaleA", 50.0, 300.0).onChange((v) => {
    foamProps.voronoiScaleA = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.voronoiScaleA
    ) {
      waterInstance.foamUniforms.voronoiScaleA.value = v;
    }
  });
  scaleFolder.add(foamProps, "voronoiScaleB", 50.0, 200.0).onChange((v) => {
    foamProps.voronoiScaleB = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.voronoiScaleB
    ) {
      waterInstance.foamUniforms.voronoiScaleB.value = v;
    }
  });
  scaleFolder.add(foamProps, "voronoiScaleC", 20.0, 100.0).onChange((v) => {
    foamProps.voronoiScaleC = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.voronoiScaleC
    ) {
      waterInstance.foamUniforms.voronoiScaleC.value = v;
    }
  });

  // General Foam Properties
  foamFolder.add(foamProps, "voronoiPower", 0.1, 2.0).onChange((v) => {
    foamProps.voronoiPower = v;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.voronoiPower) {
      waterInstance.foamUniforms.voronoiPower.value = v;
    }
  });
  foamFolder.add(foamProps, "scale", 0.001, 0.1).onChange((v) => {
    foamProps.scale = v;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.foamScale) {
      waterInstance.foamUniforms.foamScale.value = v;
    }
  });
  foamFolder.add(foamProps, "foamThreshold", 0.1, 1.0).onChange((v) => {
    foamProps.foamThreshold = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.foamThreshold
    ) {
      waterInstance.foamUniforms.foamThreshold.value = v;
    }
  });
  foamFolder.add(foamProps, "foamIntensity", 0.5, 3.0).onChange((v) => {
    foamProps.foamIntensity = v;
    if (
      waterInstance.foamUniforms &&
      waterInstance.foamUniforms.foamIntensity
    ) {
      waterInstance.foamUniforms.foamIntensity.value = v;
    }
  });

  // Color control - fixed the color conversion
  const colorController = {
    voronoiColor: {
      r: foamProps.voronoiColor.r * 255,
      g: foamProps.voronoiColor.g * 255,
      b: foamProps.voronoiColor.b * 255,
    },
  };

  foamFolder.addColor(colorController, "voronoiColor").onChange((v) => {
    const newColor = new THREE.Color(v.r / 255, v.g / 255, v.b / 255);
    foamProps.voronoiColor = newColor;
    if (waterInstance.foamUniforms && waterInstance.foamUniforms.voronoiColor) {
      waterInstance.foamUniforms.voronoiColor.value = newColor;
    }
  });

  return {
    gui,
  };
};
