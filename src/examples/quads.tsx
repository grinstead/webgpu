import { RenderPipeline } from "../RenderPipeline.tsx";
import { Canvas } from "../Canvas.tsx";
import { ScalarBinding } from "../Binding.tsx";
import { createSignal } from "solid-js";

export function Quads() {
  return (
    <Canvas width={320} height={240}>
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
    </Canvas>
  );
}

export function QuadsInteraction() {
  const [red, setRed] = createSignal(0);

  return (
    <Canvas width={320} height={240} onClick={() => setRed(Math.random())}>
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

@group(0) @binding(1) var<uniform> red: f32;

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(red, uv.x, uv.y, 1);
}

`}
      />
      <ScalarBinding group={0} id={1} value={red()} />
    </Canvas>
  );
}

export default Quads;
