import { createMemo, useContext } from "solid-js";
import { GPUContext } from "./GPUContainer.tsx";
import {
  GPUWorkQueueContext,
  PipelineId,
  createGPURender,
} from "./GPUWorkQueue.tsx";

/**
 * Props for the RenderPipeline component.
 */
export type RenderPipelineProps = {
  /**
   * Optional pipeline ID for the bind groups.
   */
  pipeline?: PipelineId;
  /**
   * Optional label for the pipeline.
   */
  label?: string;
  /**
   * The WGSL code for the shaders.
   */
  code: string;
  /**
   * The entry point for the vertex shader.
   */
  vertexMain: string;
  /**
   * The entry point for the fragment shader.
   */
  fragmentMain: string;
  /**
   * The number of vertices to draw or a function to handle custom drawing.
   */
  draw: number | ((encoder: GPURenderPassEncoder) => void);
  /**
   * Optional color attachments for the render pass.
   */
  colorAttachments?: Iterable<GPURenderPassColorAttachment | null>;
};

/**
 * RenderPipeline component defines the render pipeline for WebGPU.
 * @param props - The properties for the RenderPipeline component.
 * @returns undefined
 *
 * @example
 * ```typescript
 * import { RenderPipeline, Canvas } from "@grinstead/webgpu";
 *
 * export function ExampleRenderPipeline() {
 *   return (
 *     <Canvas width={320} height={240}>
 *       <RenderPipeline
 *         label="Basic Render"
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
 * @fragment
 * fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
 *     return vec4f(1, uv.x, uv.y, 1);
 * }
 * `}
 *       />
 *     </Canvas>
 *   );
 * }
 * ```
 */
export function RenderPipeline(props: RenderPipelineProps): undefined {
  const gpu = useContext(GPUContext);

  const getShader = createMemo(() =>
    gpu.device.createShaderModule({
      label: props.label,
      code: props.code,
    })
  );

  const getPipeline = createMemo(() =>
    gpu.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: getShader(),
        entryPoint: props.vertexMain,
      },
      fragment: {
        module: getShader(),
        entryPoint: props.fragmentMain,
        targets: [{ format: gpu.format }],
      },
      primitive: {
        topology: "triangle-strip",
      },
    })
  );

  const manager = useContext(GPUWorkQueueContext)!;

  createGPURender(() => {
    // read these outside the function so that the render function changes
    // whenever these change
    const pipeline = getPipeline();
    const { pipeline: pipelineId, draw, colorAttachments } = props;

    return (encoder) => {
      const run = encoder.beginRenderPass({
        colorAttachments: colorAttachments ?? [
          {
            view: gpu.context.getCurrentTexture().createView(),
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      run.setPipeline(pipeline);

      manager.forEachBindGroup(pipelineId, pipeline, (group, index) => {
        run.setBindGroup(index, group);
      });

      typeof draw === "number" ? run.draw(draw) : draw(run);

      run.end();
    };
  });
}
