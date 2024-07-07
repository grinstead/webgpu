import {
  JSXElement,
  createComputed,
  createContext,
  useContext,
} from "solid-js";
import { GPUContext, GPUDetails } from "./GPUContainer.tsx";

export type RenderFunc = (encoder: GPUCommandEncoder) => void;
export type UpdateRender = (
  update: null | RenderFunc,
  everyFrame?: boolean
) => void;

export const RenderQueueContext = createContext<{
  reserveSlot: () => UpdateRender;
}>();

type RenderWork = {
  id: number;
  func: RenderFunc;
};

export type RenderQueueProviderProps = {
  ref?: RenderQueue | ((render: RenderQueue) => void);
  children: JSXElement;
};

export class RenderQueue {
  private readonly persistentWork: Map<number, RenderWork> = new Map();
  private readonly oneTimeWork: Map<number, RenderWork> = new Map();
  private nextWorkId = 1;

  static Provider(props: RenderQueueProviderProps) {
    const manager = new RenderQueue(useContext(GPUContext));

    createComputed(() => {
      (props.ref as undefined | ((render: RenderQueue) => void))?.(manager);
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

  reserveSlot(): UpdateRender {
    const id = this.nextWorkId++;

    const work: RenderWork = { id, func: noop };

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

  needsRender() {
    return !!(this.persistentWork.size || this.oneTimeWork.size);
  }

  render() {
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
