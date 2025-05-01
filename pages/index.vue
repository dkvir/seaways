<template>
  <div class="home-page">
    <canvas id="viewport"></canvas>
    <div id="gui"></div>
  </div>
</template>

<script setup>
// Move the definePageMeta call to the very top, before any imports
definePageMeta({
  ssr: false,
});

// Create a ref to track client-side mounting
const isMounted = ref(false);

// Only import these modules if we're on the client side
let vec3,
  animationFrames,
  Viewport,
  Camera,
  Gpu,
  OceanFieldBuilder,
  OceanFieldBuoyancy,
  Gui,
  readKtx,
  registerWorkerGlobals,
  FpsCameraController,
  World;

// Import Vue's onMounted and ref
import { onMounted, ref } from "vue";

onMounted(async () => {
  isMounted.value = true;

  // Dynamically import all required modules
  const modules = await Promise.all([
    import("gl-matrix").then((m) => {
      vec3 = m.vec3;
      const glMatrix = m.glMatrix;
      glMatrix.setMatrixArrayType(Float32Array);
    }),
    import("rxjs").then((m) => {
      animationFrames = m.animationFrames;
    }),
    import("../lib/viewport").then((m) => {
      Viewport = m.Viewport;
    }),
    import("../lib/graphics").then((m) => {
      Camera = m.Camera;
      Gpu = m.Gpu;
    }),
    import("../lib/ocean").then((m) => {
      OceanFieldBuilder = m.OceanFieldBuilder;
      OceanFieldBuoyancy = m.OceanFieldBuoyancy;
    }),
    import("../lib/gui").then((m) => {
      Gui = m.Gui;
    }),
    import("../lib/utils").then((m) => {
      readKtx = m.readKtx;
      registerWorkerGlobals = m.registerWorkerGlobals;
    }),
    import("../lib/controller").then((m) => {
      FpsCameraController = m.FpsCameraController;
    }),
    import("../lib/physics").then((m) => {
      World = m.World;
    }),
  ]);

  // Initialize the application
  initApplication();
});

// Move the initialization logic to a separate function
async function initApplication() {
  registerWorkerGlobals();
  const canvas = document.getElementById("viewport");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const context = canvas.getContext("webgl2");
  if (!context) {
    throw new Error("Failed to create webgl2 drawing context");
  }

  const gpu = new Gpu(context);
  const camera = new Camera(45.0, canvas.width / canvas.height, 1.0, 1.0e4);
  camera.lookAt(vec3.fromValues(-10, 2.5, -10), vec3.create());

  const cameraController = new FpsCameraController(canvas, camera);
  const gui = new Gui(document.getElementById("gui"));
  const oceanBuilder = new OceanFieldBuilder(gpu);
  const oceanField = oceanBuilder.build(gui.params);
  const buoyancy = new OceanFieldBuoyancy(oceanField);
  const world = new World();

  const skybox = await fetch(
    "https://raw.githubusercontent.com/codeagent/webgl-ocean/master/assets/cubemaps/sky_skybox.ktx"
  )
    .then((r) => r.arrayBuffer())
    .then((skybox) => readKtx(skybox))
    .then((ktx) => gpu.createCubeMap(ktx));

  const viewport = new Viewport(
    gpu,
    oceanField,
    world,
    buoyancy,
    cameraController,
    skybox
  );

  gui.onChange$.subscribe((params) => {
    oceanBuilder.update(oceanField, params);
    viewport.tileRenderer.setSettings(params.tileRenderer);
    viewport.plateRenderer.setSettings(params.plateRenderer);
    viewport.projectedGridRenderer.setSettings(params.gridRenderer);
    viewport.quadTreeRenderer.setSettings(params.quadTreeRenderer);
  });

  animationFrames().subscribe(({ elapsed }) => {
    buoyancy.update();
    world.integrate(1 / 60);
    cameraController.update(1 / 60);
    oceanField.update(elapsed / 1e3);
    viewport.render(gui.params.renderer);
  });
}
</script>

<style lang="scss" scoped>
.home-page {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

#gui {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 10;
}
</style>
