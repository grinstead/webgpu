import { createMemo, createRenderEffect, useContext } from "solid-js";
import { BindingId, createBinding, createGPUWrite } from "./GPUWorkQueue.tsx";
import { UNIFORM_ALIGNMENT, WebGPUScalar } from "./webgpu_types.ts";
import { GPUContext } from "./GPUContainer.tsx";
import { roundUpToMultiple } from "./utils.ts";
/**
 * Props for the ScalarBinding component.
 */
export type ScalarBindingProps = BindingId & {
  /**
   * Optional label for the buffer.
   */
  label?: string;
  /**
   * The usage, defaults to GPUBufferUsage.UNIFORM. It is not necessary to
   * include GPUBufferUsage.COPY_DST, that flag will always be injected in.
   */
  usage?: GPUBufferUsageFlags;
  /**
   * Data type for the scalar value. Defaults to 'f32'.
   */
  datatype?: WebGPUScalar;
  /**
   * The scalar value to bind.
   */
  value: number;
};

/**
 * ScalarBinding component binds a scalar value to a uniform in the shader.
 * @param props - The properties for the ScalarBinding component.
 * @returns undefined
 *
 * @example
 * ```typescript
 * import { ScalarBinding } from "@grinstead/webgpu";
 * import { createSignal } from "solid-js";
 *
 * export function ExampleScalarBinding() {
 *   const [red, setRed] = createSignal(0);
 *
 *   return (
 *     <Canvas width={320} height={240} onClick={() => setRed(Math.random())}>
 *       <RenderPipeline
 *         label="Scalar Binding Example"
 *         vertexMain="vertexMain"
 *         fragmentMain="fragmentMain"
 *         draw={4}
 *         code={`
 * struct Vertex {
 *   @builtin(position) position: vec4f,
 *   @location(0) fragUV: vec2f,
 * }
 *
 * @vertex
 * fn vertexMain(@builtin(vertex_index) index: u32) -> Vertex {
 *   const fragPoints = array(
 *     vec2f(0, 0),
 *     vec2f(1, 0),
 *     vec2f(0, 1),
 *     vec2f(1, 1),
 *   );
 *
 *   let uv = fragPoints[index];
 *
 *   return Vertex(
 *     vec4f(2 * uv - 1, 0, 1),
 *     uv,
 *   );
 * }
 *
 * @group(0) @binding(0) var<uniform> red: f32;
 *
 * @fragment
 * fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
 *     return vec4f(red, uv.x, uv.y, 1);
 * }
 * `}
 *       />
 *       <ScalarBinding group={0} id={0} value={red()} />
 *     </Canvas>
 *   );
 * }
 * ```
 */
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

/**
 * Props for the VectorBinding component.
 */
export type VectorBindingProps = BindingId & {
  /**
   * Optional label for the buffer.
   */
  label?: string;
  /**
   * The usage, defaults to GPUBufferUsage.UNIFORM. It is not necessary to
   * include GPUBufferUsage.COPY_DST, that flag will always be injected in.
   */
  usage?: GPUBufferUsageFlags;
  /**
   * Data type for the vector values. Defaults to 'f32'.
   */
  datatype?: WebGPUScalar;
  /**
   * The vector values to bind.
   * Can be a 2, 3, or 4 element tuple.
   */
  value:
    | [number, number]
    | [number, number, number]
    | [number, number, number, number];
};

/**
 * VectorBinding component binds a vector value to a uniform in the shader.
 * @param props - The properties for the VectorBinding component.
 * @returns undefined
 *
 * @example
 * ```typescript
 * import { VectorBinding } from "@grinstead/webgpu";
 * import { createSignal } from "solid-js";
 *
 * export function ExampleVectorBinding() {
 *   const [color, setColor] = createSignal([0, 0, 1, 1]);
 *
 *   return (
 *     <Canvas width={320} height={240} onClick={() => setColor([Math.random(), Math.random(), Math.random(), 1])}>
 *       <RenderPipeline
 *         label="Vector Binding Example"
 *         vertexMain="vertexMain"
 *         fragmentMain="fragmentMain"
 *         draw={4}
 *         code={`
 * struct Vertex {
 *   @builtin(position) position: vec4f,
 *   @location(0) fragUV: vec2f,
 * }
 *
 * @vertex
 * fn vertexMain(@builtin(vertex_index) index: u32) -> Vertex {
 *   const fragPoints = array(
 *     vec2f(0, 0),
 *     vec2f(1, 0),
 *     vec2f(0, 1),
 *     vec2f(1, 1),
 *   );
 *
 *   let uv = fragPoints[index];
 *
 *   return Vertex(
 *     vec4f(2 * uv - 1, 0, 1),
 *     uv,
 *   );
 * }
 *
 * @group(0) @binding(0) var<uniform> color: vec4f;
 *
 * @fragment
 * fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
 *     return vec4f(color.r, color.g, color.b, 1);
 * }
 * `}
 *       />
 *       <VectorBinding group={0} id={0} value={color()} />
 *     </Canvas>
 *   );
 * }
 * ```
 */
export function VectorBinding(props: VectorBindingProps): undefined {
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
      let offset = 0;

      switch (datatype) {
        case "u32":
          for (const scalar of value) {
            view.setUint32(offset, scalar, true);
            offset += 4;
          }
          break;
        case "i32":
          for (const scalar of value) {
            view.setInt32(offset, scalar, true);
            offset += 4;
          }
          break;
        default:
          datatype satisfies undefined | "f32";
          for (const scalar of value) {
            view.setFloat32(offset, scalar, true);
            offset += 4;
          }
      }

      device.queue.writeBuffer(buffer, 0, bytes);
    };
  });
}

/**
 * Props for the BufferBinding component.
 */
export type BufferBindingProps = BindingId & {
  /** Optional label for the buffer. */
  label?: string;
  /**
   * The usage, defaults to GPUBufferUsage.UNIFORM. It is not necessary to
   * include GPUBufferUsage.COPY_DST, that flag will always be injected in.
   */
  usage?: GPUBufferUsageFlags;
  /** The ArrayBufferView to bind. */
  value: ArrayBufferView;
};

/**
 * BufferBinding component binds an ArrayBufferView to a uniform in the shader.
 * @param props - The properties for the BufferBinding component.
 * @returns undefined
 *
 * @example
 * ```typescript
 * import { BufferBinding } from "@grinstead/webgpu";
 *
 * export function ExampleBufferBinding() {
 *   return (
 *     <BufferBinding
 *       pipeline="examplePipeline"
 *       group={0}
 *       id={0}
 *       label="Example Buffer"
 *       usage={GPUBufferUsage.UNIFORM | GPUBufferUsage.VERTEX}
 *       value={new Float32Array([0, 1, 2, 3])}
 *     />
 *   );
 * }
 * ```
 */
export function BufferBinding(props: BufferBindingProps): undefined {
  const { device } = useContext(GPUContext);
  const binding = createBinding(props);

  const getSize = createMemo(() =>
    roundUpToMultiple(props.value.byteLength, UNIFORM_ALIGNMENT)
  );

  const getBuffer = createMemo(() =>
    device.createBuffer({
      label: props.label,
      usage: (props.usage ?? GPUBufferUsage.UNIFORM) | GPUBufferUsage.COPY_DST,
      size: getSize(),
    })
  );

  createRenderEffect(() => {
    binding()({ buffer: getBuffer() });
  });

  createGPUWrite(() => {
    const { value } = props;
    const buffer = getBuffer();

    return () => {
      device.queue.writeBuffer(
        buffer,
        0,
        value.buffer,
        value.byteOffset,
        value.byteLength
      );
    };
  });
}
