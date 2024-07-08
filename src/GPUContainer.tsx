import {
  JSXElement,
  Show,
  createComputed,
  createContext,
  createSignal,
} from "solid-js";
import { Result, failure, success } from "@grinstead/result";

/**
 * Details about the GPU context.
 */
export type GPUDetails = {
  context: GPUCanvasContext;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  format: GPUTextureFormat;
};

/**
 * Error code for when the browser does not supprot WebGPU.
 */
export const E_GPU_NOSUPPORT = 422;
/** Error code for when the computer has no acceptable gpu. */
export const E_GPU_NOHARDWARE = 404;
/**
 * Error returned when the canvas fails to provide a WebGPU context,
 * could be because WebGPU is unsupported or (more likely) because
 * the canvas is already being used in a different way.
 */
export const E_GPU_NOWEBGPU = 423;

/**
 * Human-readable error messages for GPU loading failures.
 */
export const GPU_LOAD_ERROR = {
  [E_GPU_NOSUPPORT]: "This browser does not support WebGPU",
  [E_GPU_NOHARDWARE]: "This hardware is unsupported",
  [E_GPU_NOWEBGPU]: "Failed to initialize",
} as const;

/**
 * Type for GPU load error codes.
 */
export type GPULoadErrorCode = keyof typeof GPU_LOAD_ERROR;

/**
 * Context to provide GPUDetails.
 */
export const GPUContext = createContext(
  // tricks it into typing the context as always being defined
  undefined as any as GPUDetails
);

/**
 * Props for the GPUContainer component.
 */
export type GPUContainerProps = LoadGPUOptions & {
  /** The HTML canvas element to use for WebGPU rendering. */
  canvas: HTMLCanvasElement;
  /** An optional fallback element to display while the GPU context is being initialized. */
  fallback?: JSXElement;
  /**
   * An optional function that returns a JSX element to display if the GPU context fails to initialize.
   * If nothing is provided, a {@link GPULoadError} will be thrown that could be caught by a surrounding `ErrorBoundary`
   */
  failure?: (error: GPULoadErrorCode) => JSXElement;
  /**
   * The children elements that will be rendered inside the GPU context provider.
   */
  children: JSXElement;
};

/**
 * Error class for GPU loading failures.
 */
export class GPULoadError extends Error {
  constructor(readonly code: GPULoadErrorCode) {
    super(GPU_LOAD_ERROR[code]);
    this.name = "GPULoadError";
  }
}

/**
 * GPUContainer component to initialize and provide a WebGPU context.
 * @param props - The properties for the GPUContainer component.
 * @returns A SolidJS component that provides the WebGPU context.
 *
 * @example
 * ```typescript
 * import { GPUContainer } from "@grinstead/webgpu";
 *
 * export function ExampleGPUContainer() {
 *   const canvasRef = useRef<HTMLCanvasElement>(null);
 *
 *   return (
 *     <GPUContainer canvas={canvasRef.current}>
 *       WebGPU components can go here
 *     </GPUContainer>
 *   );
 * }
 * ```
 */
export function GPUContainer(props: GPUContainerProps) {
  const [getResult, setResult] =
    createSignal<Result<GPUDetails, GPULoadErrorCode>>();

  let loadId = 0;
  createComputed(() => {
    const id = ++loadId;

    setResult(undefined);
    loadGPU(props.canvas, {
      adapter: props.adapter,
      device: props.device,
    }).then((result) => {
      if (id === loadId) {
        setResult(result);
      }
    });
  });

  return (
    <Show when={getResult()} keyed fallback={props.fallback}>
      {(result) => {
        const { failure } = result;

        if (failure != null) {
          const handler = props.failure;

          if (!handler) {
            // hopefully they have an error boundary
            throw new GPULoadError(failure);
          }

          return handler(failure);
        }

        return (
          <GPUContext.Provider value={result.value}>
            {props.children}
          </GPUContext.Provider>
        );
      }}
    </Show>
  );
}

/**
 * Options for loading the GPU.
 */
export type LoadGPUOptions = {
  /** Optional adapter options for requesting a GPU adapter. */
  adapter?: GPURequestAdapterOptions;
  /** Optional device descriptor for requesting a GPU device. */
  device?: GPUDeviceDescriptor;
};

/**
 * Loads and initializes the GPU context for a canvas element.
 * @param canvas - The canvas element to use for WebGPU.
 * @param options - Optional adapter and device options.
 * @returns A promise that resolves to a Result with GPUDetails or a GPULoadErrorCode.
 *
 * @example
 * ```typescript
 * import { loadGPU } from "@grinstead/webgpu";
 *
 * const canvas = document.createElement("canvas");
 * loadGPU(canvas).then((result) => {
 *   if (result.failure) {
 *     console.error("Failed to initialize WebGPU:", result.failure);
 *   } else {
 *     const { context, device, format } = result.value;
 *     // Use the GPU context...
 *   }
 * });
 * ```
 */
export async function loadGPU(
  canvas: HTMLCanvasElement,
  options?: LoadGPUOptions
): Promise<Result<GPUDetails, GPULoadErrorCode>> {
  const { gpu } = navigator as Partial<NavigatorGPU>;
  if (!gpu) return failure<GPULoadErrorCode>(E_GPU_NOSUPPORT);

  const adapter = await gpu.requestAdapter(options?.adapter);
  if (!adapter) return failure<GPULoadErrorCode>(E_GPU_NOHARDWARE);

  const device = await adapter.requestDevice(options?.device);

  const context = canvas.getContext("webgpu");
  if (!context) return failure<GPULoadErrorCode>(E_GPU_NOWEBGPU);

  const format = gpu.getPreferredCanvasFormat();

  context.configure({ device, format });

  return success({ context, device, canvas, format });
}
