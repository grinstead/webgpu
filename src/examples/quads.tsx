import { createEffect, createSignal, onMount } from "solid-js";
import { GPUContainer } from "../GPUContainer.tsx";
import { GPUWorkQueue } from "../GPUWorkQueue.tsx";
import { RenderPipeline } from "../RenderPipeline.tsx";

export function Quads() {
  const canvas = (<canvas width={320} height={240} />) as HTMLCanvasElement;

  const [manager, setManager] = createSignal<GPUWorkQueue>();

  createEffect(() => {
    manager()?.runQueued();
  });

  return (
    <>
      {canvas}
      <GPUContainer canvas={canvas} fallback={"Loading..."}>
        <GPUWorkQueue.Provider ref={setManager}>
          <RenderPipeline
            label="Basic Render"
            vertexMain="vertexMain"
            fragmentMain="fragmentMain"
            draw={4}
            code={`
struct Vertex {
  @builtin(position) position: vec4f,
  @location(0) fragUV: vec2f,
}

// just renders 4 points that cover the canvas, all work done in fragment shader
@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> Vertex {
  const fragPoints = array(
    vec2f(0, 0),
    vec2f(1, 0),
    vec2f(0, 1),
    vec2f(1, 1),
  );

  let uv = fragPoints[index];

  return Vertex(
    vec4f(2 * uv - 1, 0, 1),
    uv,
  );
}

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(0, uv.x, uv.y, 1);
}

`}
          />
        </GPUWorkQueue.Provider>
      </GPUContainer>
    </>
  );
}

export default Quads;
