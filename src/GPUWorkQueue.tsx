import {
  Accessor,
  JSXElement,
  createComputed,
  createContext,
  createMemo,
  createRenderEffect,
  onCleanup,
  useContext,
} from "solid-js";
import { GPUContext, GPUDetails } from "./GPUContainer.tsx";

export type PipelineId = string | undefined;
export type BindingId = {
  pipeline?: PipelineId;
  group: number;
  id: GPUIndex32;
};

export type GPUWork = (encoder: GPUCommandEncoder) => void;
export type UpdateWork = (update: null | GPUWork, everyFrame?: boolean) => void;
export type UpdateBinding = (resource: null | GPUBindingResource) => void;

export const GPUWorkQueueContext = createContext<GPUWorkQueue>();

type GPUWorkWrapper = {
  id: number;
  func: GPUWork;
};

export type GPUWorkQueueProviderProps = {
  ref?: GPUWorkQueue | ((render: GPUWorkQueue) => void);
  onHasWork?: () => void;
  children: JSXElement;
};

type BindingData = {
  id: GPUIndex32;
  dropped: boolean;
  resource: null | GPUBindingResource;
};

type BindGroupData = {
  id: number;
  dropped: boolean;
  compiled: undefined | null | WeakMap<GPUPipelineBase, GPUBindGroup>;
  bindings: Map<number, BindingData>;
};

type PipelineData = {
  id: PipelineId;
  dropped: boolean;
  groups: Map<number, BindGroupData>;
};

export class GPUWorkQueue {
  private readonly persistentWork: Map<number, GPUWorkWrapper> = new Map();
  private readonly oneTimeWork: Map<number, GPUWorkWrapper> = new Map();

  private readonly pipelines: Map<PipelineId, PipelineData> = new Map();

  hasWork: boolean = false;
  onHasWork: undefined | (() => void) = undefined;

  private nextWorkId = 1;

  static Provider(props: GPUWorkQueueProviderProps) {
    const manager = new GPUWorkQueue(useContext(GPUContext));

    createComputed(() => {
      (props.ref as undefined | ((render: GPUWorkQueue) => void))?.(manager);
    });

    createComputed(() => {
      manager.onHasWork = props.onHasWork;
    });

    return (
      <GPUWorkQueueContext.Provider value={manager}>
        {props.children}
      </GPUWorkQueueContext.Provider>
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
        this._markWork();
      } else {
        oneTimeWork.delete(id);
        persistentWork.delete(id);
      }
    };
  }

  makeBinding(pipelineId: PipelineId, groupId: number, id: GPUIndex32) {
    let pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      pipeline = { id: pipelineId, dropped: false, groups: new Map() };
      this.pipelines.set(pipelineId, pipeline);
    }

    let group = pipeline.groups.get(groupId);
    if (!group) {
      group = {
        id: groupId,
        dropped: false,
        compiled: undefined,
        bindings: new Map(),
      };
      pipeline.groups.set(groupId, group);
    } else {
      group.compiled = undefined;

      const prev = group.bindings.get(id);
      if (prev) prev.dropped = true;
    }

    const binding: BindingData = {
      id,
      dropped: false,
      resource: null,
    };

    group.bindings.set(id, binding);

    // default to null just in case they accidentally pass `undefined` in
    return (resource: null | GPUBindingResource = null) => {
      // maybe short-circuit and do nothing
      if (binding.dropped || resource === binding.resource) return;

      binding.resource = resource;
      group.compiled = undefined;
      this._markWork();
    };
  }

  private _markWork() {
    if (!this.hasWork) {
      this.hasWork = true;
      this.onHasWork?.();
    }
  }

  forEachBindGroup(
    pipelineId: PipelineId,
    pipeline: GPUPipelineBase,
    map: (group: GPUBindGroup, id: number) => void
  ) {
    const pipelineData = this.pipelines.get(pipelineId);
    if (!pipelineData) return;

    pipelineData.groups.forEach((group) => {
      let { compiled } = group;

      // if the group is actually empty, then we are done
      if (compiled === null) return;

      let cached = compiled?.get(pipeline);

      // check if we need to compile the group
      if (!cached) {
        const entries: Array<GPUBindGroupEntry> = [];
        group.bindings.forEach(({ id, resource }) => {
          resource && entries.push({ binding: id, resource });
        });

        if (!entries.length) {
          // this is an empty bind group, save it as such and move on
          group.compiled = null;
          return;
        }

        // create the bind group
        cached = this.gpu.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(group.id),
          entries,
        });

        // cache it
        if (!compiled) group.compiled = compiled = new WeakMap();
        compiled.set(pipeline, cached);
      }

      map(cached, group.id);
    });
  }

  runQueued() {
    this.hasWork = false;
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
  const update = useContext(GPUWorkQueueContext)!.reserveSlot();

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
  const update = useContext(GPUWorkQueueContext)!.reserveSlot();

  createRenderEffect(() => {
    update(code(), false);
  });

  onCleanup(() => {
    update(null);
  });
}

export function createBinding(props: BindingId) {
  const context = useContext(GPUWorkQueueContext);

  return createMemo<UpdateBinding>((prev) => {
    prev?.(null);
    return context!.makeBinding(props.pipeline, props.group, props.id);
  });
}
