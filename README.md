# @grinstead/webgpu

This is a TypeScript library that is designed to make it easy to use WebGPU.
It is built on top of [SolidJS](https://www.solidjs.com/), so it is lightweight while maintaining powerful reactivity.

This project is in early stages and is subject to change.

## Installation

To install `@grinstead/webgpu`, use npm or yarn:

```sh
npm install @grinstead/webgpu
```

or

```sh
yarn add @grinstead/webgpu
```

## Usage

The easiest entrypoint to this library is the `<Canvas>` component, here is a simple interactive canvas:

```typescript
import { RenderPipeline, Canvas, ScalarBinding } from "@grinstead/webgpu";
import { createSignal } from "solid-js";

// renders a square gradient that randomly changes color when clicked
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

@group(0) @binding(0) var<uniform> red: f32;

@fragment
fn fragmentMain(@location(0) uv: vec2f) -> @location(0) vec4f {
    return vec4f(red, uv.x, uv.y, 1);
}

`}
      />
      <ScalarBinding group={0} id={0} value={red()} />
    </Canvas>
  );
}
```
