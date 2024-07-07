import {
  Accessor,
  JSXElement,
  createComputed,
  createContext,
  createRenderEffect,
  onCleanup,
  useContext,
} from "solid-js";
import { GPUContext, GPUDetails } from "./GPUContainer.tsx";

export type GPUWork = (encoder: GPUCommandEncoder) => void;
export type UpdateWork = (update: null | GPUWork, everyFrame?: boolean) => void;

export const RenderQueueContext = createContext<{
  reserveSlot: () => UpdateWork;
}>();

type GPUWorkWrapper = {
  id: number;
  func: GPUWork;
};

export type GPUWorkQueueProviderProps = {
  ref?: GPUWorkQueue | ((render: GPUWorkQueue) => void);
  children: JSXElement;
};

export class GPUWorkQueue {
  private readonly persistentWork: Map<number, GPUWorkWrapper> = new Map();
  private readonly oneTimeWork: Map<number, GPUWorkWrapper> = new Map();
  private nextWorkId = 1;

  static Provider(props: GPUWorkQueueProviderProps) {
    const manager = new GPUWorkQueue(useContext(GPUContext));

    createComputed(() => {
      (props.ref as undefined | ((render: GPUWorkQueue) => void))?.(manager);
    });

    return (
      <RenderQueueContext.Provider
        value={{ reserveSlot: () => manager.reserveSlot() }}
      >
        {props.children}
      </RenderQueueContext.Provider>
    );
  }

  constructor(readonly gpu: GPUDetails) {}

  reserveSlot(): UpdateWork {
    const id = this.nextWorkId++;

    const work: GPUWorkWrapper = { id, func: noop };

    return (update, everyFrame = false) => {
      const { oneTimeWork, persistentWork } = this;

      if (update) {
        work.func = update;
        (everyFrame ? persistentWork : oneTimeWork).set(id, work);
        (everyFrame ? oneTimeWork : persistentWork).delete(id);
      } else {
        oneTimeWork.delete(id);
        persistentWork.delete(id);
      }
    };
  }

  hasWork() {
    return !!(this.persistentWork.size || this.oneTimeWork.size);
  }

  runQueued() {
    const { oneTimeWork } = this;

    const renders = [...this.persistentWork.values(), ...oneTimeWork.values()];
    oneTimeWork.clear();

    if (!renders.length) return;

    // sort by when they were declared
    renders.sort((a, b) => a.id - b.id);

    // render
    const { device } = this.gpu;
    const encoder = device.createCommandEncoder();

    for (const { func } of renders) {
      func(encoder);
    }

    device.queue.submit([encoder.finish()]);
  }
}

function noop() {}

/**
 * Add code to call whenever the system renders.
 * @param code The code to render, dependencies are tracked
 */
export function createGPURender(code: Accessor<GPUWork>) {
  const update = useContext(RenderQueueContext)!.reserveSlot();

  createRenderEffect(() => {
    update(code(), true);
  });

  onCleanup(() => {
    update(null);
  });
}

/**
 * Add code to write to the GPU whenever the dependencies change.
 * @param code The code to render, dependencies are tracked
 */
export function createGPUWrite(code: Accessor<GPUWork>) {
  const update = useContext(RenderQueueContext)!.reserveSlot();

  createRenderEffect(() => {
    update(code(), false);
  });

  onCleanup(() => {
    update(null);
  });
}
