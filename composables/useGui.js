export const useGui = (water, waves, scene, cannonDebugRenderer) => {
  const { $dat } = useNuxtApp();
  const gui = new $dat.GUI();

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
  waveCFolder.open();

  // Physics Debug Toggle
  gui
    .add({ debug: true }, "debug")
    .name("Show Physics")
    .onChange(function (value) {
      if (value) {
        cannonDebugRenderer = new useBoatPhysics(scene, world);
      } else {
        cannonDebugRenderer = null;
        // Remove debug meshes
        scene.children.forEach((child) => {
          if (child.isDebugMesh) {
            scene.remove(child);
          }
        });
      }
    });

  // Add wake effect controls - this needs to be set up after wake is initialized
  let wakeEffect = null;

  // Function to add Wake controls (will be called from about.vue)
  const addWakeControls = (wake) => {
    if (wake) {
      wakeEffect = wake;
      const wakeFolder = gui.addFolder("Wake Effect");

      // Add visibility toggle
      wakeFolder
        .add({ visible: true }, "visible")
        .name("Show Wake")
        .onChange((value) => {
          wakeEffect.toggleVisibility(value);
        });

      // Add dimension controls
      const props = wakeEffect.getWakeProperties();
      wakeFolder
        .add(props, "width", 10, 200)
        .name("Width")
        .onChange((value) => {
          wakeEffect.updateDimensions(value, props.length);
        });

      wakeFolder
        .add(props, "length", 100, 800)
        .name("Length")
        .onChange((value) => {
          wakeEffect.updateDimensions(props.width, value);
        });

      // Add position controls
      wakeFolder
        .add(props, "positionX", -50, 50)
        .name("X Position")
        .onChange((value) => {
          wakeEffect.updatePosition(value, props.positionY, props.positionZ);
        });

      wakeFolder
        .add(props, "positionY", -5, 5)
        .name("Y Position")
        .onChange((value) => {
          wakeEffect.updatePosition(props.positionX, value, props.positionZ);
        });

      wakeFolder
        .add(props, "positionZ", -200, 200)
        .name("Z Position")
        .onChange((value) => {
          wakeEffect.updatePosition(props.positionX, props.positionY, value);
        });

      // Add opacity control
      wakeFolder
        .add(props, "opacity", 0, 1)
        .name("Opacity")
        .onChange((value) => {
          wakeEffect.updateOpacity(value);
        });

      wakeFolder.open();
    }
  };

  return {
    gui,
    addWakeControls,
  };
};
