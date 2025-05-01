import { vec3 } from "gl-matrix";

import { Box, World, Cylinder, Sphere } from "./physics";
import OBJ from "./assets/objects/shapes";
import { loadObj } from "./utils";

const obj = loadObj(OBJ);

export const createCube = (world, buoyancy, size = 1) => {
  const body = world.createBody(
    1,
    new Box(vec3.fromValues(size, size, size)),
    vec3.fromValues(3.0, 2.0, 3.0)
  );

  const geometry = buoyancy.oceanField["gpu"].createGeometry(obj["cube"]);

  const floatingBody = buoyancy.createFloatingBody(body, [
    vec3.fromValues(0.5 * size, -0.5 * size, 0.5 * size),
    vec3.fromValues(0.5 * size, -0.5 * size, -0.5 * size),
    vec3.fromValues(-0.5 * size, -0.5 * size, -0.5 * size),
    vec3.fromValues(-0.5 * size, -0.5 * size, 0.5 * size),
    vec3.fromValues(0.5 * size, 0.5 * size, 0.5 * size),
    vec3.fromValues(0.5 * size, 0.5 * size, -0.5 * size),
    vec3.fromValues(-0.5 * size, 0.5 * size, -0.5 * size),
    vec3.fromValues(-0.5 * size, 0.5 * size, 0.5 * size),
  ]);

  return [floatingBody, geometry];
};

export const createCylinder = (world, buoyancy, height = 2, radius = 0.5) => {
  const body = world.createBody(
    1,
    new Cylinder(height, radius),
    vec3.fromValues(-3.0, 2.0, 3.0)
  );
  const geometry = buoyancy.oceanField["gpu"].createGeometry(obj["cylinder"]);
  const floatingBody = buoyancy.createFloatingBody(body, [
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      0.5 * height,
      -radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      0.5 * height,
      radius * Math.SQRT1_2
    ),
    vec3.fromValues(radius * Math.SQRT1_2, 0.5 * height, radius * Math.SQRT1_2),
    vec3.fromValues(
      radius * Math.SQRT1_2,
      0.5 * height,
      -radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      -0.5 * height,
      -radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      -0.5 * height,
      radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      radius * Math.SQRT1_2,
      -0.5 * height,
      radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      radius * Math.SQRT1_2,
      -0.5 * height,
      -radius * Math.SQRT1_2
    ),
  ]);

  return [floatingBody, geometry];
};

export const createDuck = (world, buoyancy, size = 1) => {
  const body = world.createBody(
    1,
    new Sphere(size),
    vec3.fromValues(-3.0, 2.0, -3.0)
  );

  const geometry = buoyancy.oceanField["gpu"].createGeometry(obj["duck"]);
  const floatingBody = buoyancy.createFloatingBody(body, [
    vec3.fromValues(-size * Math.SQRT1_2, -size * 0.5, -size * Math.SQRT1_2),
    vec3.fromValues(-size * Math.SQRT1_2, -size * 0.5, size * Math.SQRT1_2),
    vec3.fromValues(size * Math.SQRT1_2, -size * 0.5, size * Math.SQRT1_2),
    vec3.fromValues(size * Math.SQRT1_2, -size * 0.5, -size * Math.SQRT1_2),
  ]);

  return [floatingBody, geometry];
};

export const createBox = (
  world,
  buoyancy,
  width = 2,
  height = 1,
  depth = 3
) => {
  const body = world.createBody(
    1,
    new Sphere(1),
    vec3.fromValues(-3.0, 2.0, -3.0)
  );

  const geometry = buoyancy.oceanField["gpu"].createGeometry(obj["cube"]); // Reusing cube geometry

  // Creating floating body with 8 vertices (corners of the box)
  const floatingBody = buoyancy.createFloatingBody(body, [
    vec3.fromValues(0.5 * width, -0.5 * height, 0.5 * depth), // bottom layer
    vec3.fromValues(0.5 * width, -0.5 * height, -0.5 * depth),
    vec3.fromValues(-0.5 * width, -0.5 * height, -0.5 * depth),
    vec3.fromValues(-0.5 * width, -0.5 * height, 0.5 * depth),
    vec3.fromValues(0.5 * width, 0.5 * height, 0.5 * depth), // top layer
    vec3.fromValues(0.5 * width, 0.5 * height, -0.5 * depth),
    vec3.fromValues(-0.5 * width, 0.5 * height, -0.5 * depth),
    vec3.fromValues(-0.5 * width, 0.5 * height, 0.5 * depth),
  ]);

  return [floatingBody, geometry];
};

export const createDonut = (
  world,
  buoyancy,
  radius = 1.0,
  innerRadius = 0.25
) => {
  const body = world.createBody(
    1,
    new Cylinder(innerRadius * 2, radius + innerRadius),
    vec3.fromValues(3.0, 2.0, -3.0)
  );

  const geometry = buoyancy.oceanField["gpu"].createGeometry(obj["donut"]);
  const floatingBody = buoyancy.createFloatingBody(body, [
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      -innerRadius,
      -radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      -innerRadius,
      radius * Math.SQRT1_2
    ),
    vec3.fromValues(radius * Math.SQRT1_2, -innerRadius, radius * Math.SQRT1_2),
    vec3.fromValues(
      radius * Math.SQRT1_2,
      -innerRadius,
      -radius * Math.SQRT1_2
    ),
    vec3.fromValues(
      -radius * Math.SQRT1_2,
      innerRadius,
      -radius * Math.SQRT1_2
    ),
    vec3.fromValues(-radius * Math.SQRT1_2, innerRadius, radius * Math.SQRT1_2),
    vec3.fromValues(radius * Math.SQRT1_2, innerRadius, radius * Math.SQRT1_2),
    vec3.fromValues(radius * Math.SQRT1_2, innerRadius, -radius * Math.SQRT1_2),
  ]);

  return [floatingBody, geometry];
};
