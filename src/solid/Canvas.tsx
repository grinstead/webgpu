import { JSX, createSignal, onCleanup, onMount } from "solid-js";
import { GPUContainer } from "./GPUContainer.tsx";
import { GPUWorkQueue } from "./GPUWorkQueue.tsx";

/**
 * Props for the Canvas component.
 */
export type CanvasProps = JSX.CanvasHTMLAttributes<HTMLCanvasElement>;

/**
 * The simplest possible way to render a WebGPU Canvas.
 * This component creates a canvas element and initializes WebGPU.
 * It handles the device pixel ratio for high-DPI displays.
 *
 * @param props - The properties for the Canvas component.
 * @returns A SolidJS component that wraps a canvas element with WebGPU initialization.
 *
 * @example
 * ```typescript
 * import { Canvas } from "@grinstead/webgpu";
 *
 * export function ExampleCanvas() {
 *   return (
 *     <Canvas width={800} height={600}>
 *       ...WebGPU components can go here...
 *       <RenderPipeline />
 *     </Canvas>
 *   );
 * }
 * ```
 */
export function Canvas(props: CanvasProps) {
  const [computed, setComputed] = createSignal<{
    width: number;
    height: number;
  }>();

  const canvas = (
    <canvas
      {...props}
      width={props.width ?? computed()?.width}
      height={props.height ?? computed()?.height}
      // giving canvas a dummy value for children makes sure that Solid does not
      // attempt to compute the children property, which is good because we have
      // to wait until WebGPU is initialized before we invoke that property.
      children={null}
    />
  ) as HTMLCanvasElement;

  onMount(() => {
    const computedStyle = getComputedStyle(canvas);
    const ratio = window.devicePixelRatio ?? 1;

    setComputed({
      width: ratio * parseInt(computedStyle.getPropertyValue("width"), 10),
      height: ratio * parseInt(computedStyle.getPropertyValue("height"), 10),
    });
  });

  let manager: undefined | GPUWorkQueue;
  let renderTimer: undefined | ReturnType<typeof requestAnimationFrame>;

  onCleanup(() => {
    if (renderTimer) {
      cancelAnimationFrame(renderTimer);
      renderTimer = undefined;
    }
  });

  return (
    <>
      {canvas}
      <GPUContainer canvas={canvas}>
        <GPUWorkQueue.Provider
          ref={manager}
          onHasWork={() => {
            renderTimer ??= requestAnimationFrame(render);
          }}
        >
          {props.children}
        </GPUWorkQueue.Provider>
      </GPUContainer>
    </>
  );

  function render() {
    renderTimer = undefined;
    manager!.runQueued();
  }
}
