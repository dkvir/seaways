import { animationFrames, lastValueFrom } from "rxjs";
import { finalize, takeWhile, map, tap } from "rxjs/operators";

export const SampleStatus = {
  Pending: 0,
  Complete: 1,
  Timeout: 2,
};

export class Sample {
  constructor(gpu, getter, lifetime = 1000) {
    this.gpu = gpu;
    this.getter = getter;
    this.lifetime = lifetime;
    this.sync = this.createSync();
    this.birthtime = performance.now();
  }

  status() {
    if (this.birthtime + this.lifetime >= performance.now()) {
      const result = this.gpu.context.getSyncParameter(
        this.sync,
        WebGL2RenderingContext.SYNC_STATUS
      );
      return result === WebGL2RenderingContext.UNSIGNALED
        ? SampleStatus.Pending
        : SampleStatus.Complete;
    } else {
      return SampleStatus.Timeout;
    }
  }

  outcome() {
    return this.getter();
  }

  release() {
    if (this.sync) {
      this.gpu.context.deleteSync(this.sync);
      this.sync = null;
    }
  }

  toPromise() {
    return lastValueFrom(
      animationFrames().pipe(
        map(() => this.status()),
        tap((status) => {
          if (status === SampleStatus.Timeout) {
            throw new Error("OceanFieldSample: timeout expired");
          }
        }),
        takeWhile((status) => status === SampleStatus.Pending, true),
        map((status) =>
          status === SampleStatus.Complete ? this.outcome() : null
        ),
        finalize(() => this.release())
      )
    );
  }

  createSync() {
    return this.gpu.context.fenceSync(
      WebGL2RenderingContext.SYNC_GPU_COMMANDS_COMPLETE,
      0
    );
  }
}
