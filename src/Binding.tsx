import { createMemo, createRenderEffect, useContext } from "solid-js";
import {
  BindingId,
  GPUWorkQueueContext,
  createBinding,
  createGPUWrite,
} from "./GPUWorkQueue.tsx";
import { UNIFORM_ALIGNMENT, WebGPUScalar } from "./webgpu.ts";
import { GPUContext } from "./GPUContainer.tsx";

export type ScalarBindingProps = BindingId & {
  label?: string;
  /**
   * The usage, defaults to GPUBufferUsage.UNIFORM. It is not necessary to
   * include GPUBufferUsage.COPY_DST, that flag will always be injected in.
   */
  usage?: GPUBufferUsageFlags;
  /** Defaults to 'f32' */
  datatype?: WebGPUScalar;
  value: number;
};

export function ScalarBinding(props: ScalarBindingProps): undefined {
  const { device } = useContext(GPUContext);
  const binding = createBinding(props);

  const getBuffer = createMemo(() =>
    device.createBuffer({
      label: props.label,
      usage: (props.usage ?? GPUBufferUsage.UNIFORM) | GPUBufferUsage.COPY_DST,
      size: UNIFORM_ALIGNMENT,
    })
  );

  createRenderEffect(() => {
    binding()({ buffer: getBuffer() });
  });

  createGPUWrite(() => {
    const { datatype, value } = props;
    const buffer = getBuffer();

    return () => {
      const bytes = new ArrayBuffer(UNIFORM_ALIGNMENT);
      const view = new DataView(bytes);

      switch (datatype) {
        case "u32":
          view.setUint32(0, value, true);
          break;
        case "i32":
          view.setInt32(0, value, true);
          break;
        default:
          datatype satisfies undefined | "f32";
          view.setFloat32(0, value, true);
      }

      device.queue.writeBuffer(buffer, 0, bytes);
    };
  });
}
