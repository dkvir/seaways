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
    .add(waves[0], "wavelength", 1, 100)
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
    .add(waves[1], "wavelength", 1, 100)
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
    .add(waves[2], "wavelength", 1, 100)
    .name("Wavelength")
    .onChange(function (v) {
      water.material.uniforms.waveC.value[3] = v;
    });

  const wakeFolder = gui.addFolder("Wake Properties");
  wakeFolder
    .add(wakeProps, "width", 10, 200)
    .onChange((v) => waterInstance.updateWakeProperty("width", v));
  wakeFolder
    .add(wakeProps, "length", 50, 800)
    .onChange((v) => waterInstance.updateWakeProperty("length", v));
  wakeFolder
    .add(wakeProps, "heightOffset", 0, 0.2)
    .onChange((v) => waterInstance.updateWakeProperty("heightOffset", v));
  wakeFolder
    .add(wakeProps, "positionX", -50, 50)
    .onChange((v) => waterInstance.updateWakeProperty("positionX", v));
  wakeFolder
    .add(wakeProps, "positionY", -10, 10)
    .onChange((v) => waterInstance.updateWakeProperty("positionY", v));
  wakeFolder
    .add(wakeProps, "positionZ", -200, 50)
    .onChange((v) => waterInstance.updateWakeProperty("positionZ", v));
  wakeFolder
    .add(wakeProps, "opacity", 0, 2)
    .onChange((v) => waterInstance.updateWakeProperty("opacity", v));

  const waveAnimFolder = gui.addFolder("Wave Animation");
  waveAnimFolder
    .add(waveProps, "textureSpeed", 0.1, 3.0)
    .onChange((v) => waterInstance.updateWaveParameter("textureSpeed", v));
  waveAnimFolder
    .add(waveProps, "waveFreq", 0.01, 0.5)
    .onChange((v) => waterInstance.updateWaveParameter("waveFreq", v));
  waveAnimFolder
    .add(waveProps, "waveAmp", 0.1, 3.0)
    .onChange((v) => waterInstance.updateWaveParameter("waveAmp", v));
  waveAnimFolder
    .add(waveProps, "waveRoughness", 1.0, 20.0)
    .onChange((v) => waterInstance.updateWaveParameter("waveRoughness", v));
  waveAnimFolder
    .add(waveProps, "timeScale", 0.1, 3.0)
    .onChange((v) => waterInstance.updateWaveParameter("timeScale", v));
  waveAnimFolder
    .add(waveProps, "octaves", 1, 8, 1)
    .onChange((v) => waterInstance.updateWaveParameter("octaves", v));
  waveAnimFolder
    .add(waveProps, "persistance", 0.01, 0.5)
    .onChange((v) => waterInstance.updateWaveParameter("persistance", v));
  waveAnimFolder
    .add(waveProps, "lacunarity", 1.0, 3.0)
    .onChange((v) => waterInstance.updateWaveParameter("lacunarity", v));

  const foamFolder = gui.addFolder("Foam Properties");

  // Voronoi Smoothness
  const smoothnessFolder = foamFolder.addFolder("Voronoi Smoothness");
  smoothnessFolder
    .add(foamProps, "voronoiSmoothnessA", 0.1, 1.0)
    .onChange((v) =>
      waterInstance.updateFoamParameter("voronoiSmoothnessA", v)
    );
  smoothnessFolder
    .add(foamProps, "voronoiSmoothnessB", 0.1, 1.0)
    .onChange((v) =>
      waterInstance.updateFoamParameter("voronoiSmoothnessB", v)
    );
  smoothnessFolder
    .add(foamProps, "voronoiSmoothnessC", 0.1, 1.0)
    .onChange((v) =>
      waterInstance.updateFoamParameter("voronoiSmoothnessC", v)
    );

  // Voronoi Speed
  const speedFolder = foamFolder.addFolder("Voronoi Speed");
  speedFolder
    .add(foamProps, "voronoiSpeedA", 0.1, 1.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiSpeedA", v));
  speedFolder
    .add(foamProps, "voronoiSpeedB", 0.1, 1.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiSpeedB", v));
  speedFolder
    .add(foamProps, "voronoiSpeedC", 0.1, 1.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiSpeedC", v));

  // Voronoi Scale
  const scaleFolder = foamFolder.addFolder("Voronoi Scale");
  scaleFolder
    .add(foamProps, "voronoiScaleA", 50.0, 300.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiScaleA", v));
  scaleFolder
    .add(foamProps, "voronoiScaleB", 50.0, 200.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiScaleB", v));
  scaleFolder
    .add(foamProps, "voronoiScaleC", 20.0, 100.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiScaleC", v));

  // General Foam Properties
  foamFolder
    .add(foamProps, "voronoiPower", 0.1, 2.0)
    .onChange((v) => waterInstance.updateFoamParameter("voronoiPower", v));
  foamFolder
    .add(foamProps, "scale", 0.001, 0.1)
    .onChange((v) => waterInstance.updateFoamParameter("scale", v));
  foamFolder
    .add(foamProps, "foamThreshold", 0.1, 1.0)
    .onChange((v) => waterInstance.updateFoamParameter("foamThreshold", v));
  foamFolder
    .add(foamProps, "foamIntensity", 0.5, 3.0)
    .onChange((v) => waterInstance.updateFoamParameter("foamIntensity", v));

  // Color control
  foamFolder
    .addColor(foamProps, "voronoiColor")
    .onChange((v) =>
      waterInstance.updateFoamParameter(
        "voronoiColor",
        new THREE.Color(v.r / 255, v.g / 255, v.b / 255)
      )
    );

  return {
    gui,
  };
};
