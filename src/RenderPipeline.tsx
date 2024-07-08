import { createMemo, useContext } from "solid-js";
import { GPUContext } from "./GPUContainer.tsx";
import {
  GPUWorkQueueContext,
  PipelineId,
  createGPURender,
} from "./GPUWorkQueue.tsx";

export type RenderPipelineProps = {
  pipeline?: PipelineId;
  label?: string;
  code: string;
  vertexMain: string;
  fragmentMain: string;
  draw: number | ((encoder: GPURenderPassEncoder) => void);
  colorAttachments?: Iterable<GPURenderPassColorAttachment | null>;
};

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
