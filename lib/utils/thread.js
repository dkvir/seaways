import { glMatrix, vec3 } from "gl-matrix";
import { firstValueFrom, fromEvent, race, throwError } from "rxjs";
import { map, switchMap } from "rxjs/operators";

import {
  createDisc,
  createGrid,
  createNDCGrid,
  createPlane,
  createQuad,
} from "../graphics";

export class ThreadWorker {
  static globals = new Map();

  constructor(procedure) {
    this.procedure = procedure;
    this.thread = this.createThread();
    this.message$ = fromEvent(this.thread, "message").pipe(map((m) => m.data));
    this.error$ = fromEvent(this.thread, "error").pipe(
      switchMap((e) => throwError(() => e))
    );
  }

  static registerGlobal(name, value) {
    const isFunction = (value) => typeof value === "function";
    const isNative = (fn) => /\[native code\]/.test(fn.toString());
    const replacer = (key, value) => {
      if (isFunction(value)) {
        if (isNative(value)) {
          return `<<${value.name}>>`;
        }
        return `<<${value}>>`;
      }
      return value;
    };
    const escape = (str) =>
      str
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\/g, "")
        .replace(/["']<<|>>['"]/g, "");

    const expr = escape(JSON.stringify(value, replacer, 2));
    this.globals.set(name, expr);
  }

  process(input) {
    this.thread.postMessage(input);
    return firstValueFrom(race(this.message$, this.error$));
  }

  release() {
    this.thread.terminate();
  }

  createThread() {
    const globals = Array.from(ThreadWorker.globals.entries())
      .map(([name, fn]) => `const ${name} = ${fn.toString()}`)
      .join(";\n");
    const fn = this.procedure.toString();

    const content = `${globals};
    setupGlMatrix();
    self.addEventListener('message', (e) => {
      try {
        const result = (${fn})(e.data);
        self.postMessage(result);
      } catch (e) {
        console.warn('ThreadWorker: ', e);
      }
    });
  `;
    const blob = new Blob([content], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    return new Worker(url);
  }
}

export const registerWorkerGlobals = () => {
  ThreadWorker.registerGlobal("glMatrix", {
    ...glMatrix,
    setMatrixArrayType: glMatrix.setMatrixArrayType,
    RANDOM: () => Math.random(),
  });

  // Manually call setMatrixArrayType inside the worker
  ThreadWorker.registerGlobal("setupGlMatrix", () => {
    glMatrix.setMatrixArrayType(Float32Array);
  });

  ThreadWorker.registerGlobal("vec3", vec3);
  ThreadWorker.registerGlobal("createGrid", createGrid);
  ThreadWorker.registerGlobal("createQuad", createQuad);
  ThreadWorker.registerGlobal("createPlane", createPlane);
  ThreadWorker.registerGlobal("createDisc", createDisc);
  ThreadWorker.registerGlobal("createNDCGrid", createNDCGrid);
};
