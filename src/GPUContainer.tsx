import {
  JSXElement,
  Show,
  createComputed,
  createContext,
  createSignal,
} from "solid-js";
import { Result, failure, success } from "@grinstead/result";

export type GPUDetails = {
  context: GPUCanvasContext;
  device: GPUDevice;
  canvas: HTMLCanvasElement;
  format: GPUTextureFormat;
};

export const E_GPU_NOSUPPORT = 422;
export const E_GPU_NOHARDWARE = 404;
/** Error returned when the canvas fails to provide a webgpu context, could be
 * because webgpu is unsupported or (more likely) because the canvas is already
 * being used in a different way */
export const E_GPU_NOWEBGPU = 423;

export const GPU_LOAD_ERROR = {
  [E_GPU_NOSUPPORT]: "This browser does not support WebGPU",
  [E_GPU_NOHARDWARE]: "This hardware is unsupported",
  [E_GPU_NOWEBGPU]: "Failed to initialize",
} as const;

export type GPULoadErrorCode = keyof typeof GPU_LOAD_ERROR;

export const GPUContext = createContext(
  // tricks it into typing the context as always being defined
  undefined as any as GPUDetails
);

export type GPUContainerProps = LoadGPUOptions & {
  canvas: HTMLCanvasElement;
  fallback?: JSXElement;
  failure?: (error: GPULoadErrorCode) => JSXElement;
  children: JSXElement;
};

export class GPULoadError extends Error {
  constructor(readonly code: GPULoadErrorCode) {
    super(GPU_LOAD_ERROR[code]);
    this.name = "GPULoadError";
  }
}

export function GPUContainer(props: GPUContainerProps) {
  const [result, setResult] =
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
    <Show when={result()} fallback={props.fallback}>
      {(result) => {
        const item = result();
        const { failure } = item;

        if (failure != null) {
          const handler = props.failure;

          if (!handler) {
            // hopefully they have an error boundary
            throw new GPULoadError(failure);
          }

          return handler(failure);
        }

        return (
          <GPUContext.Provider value={item.value}>
            {props.children}
          </GPUContext.Provider>
        );
      }}
    </Show>
  );
}

export type LoadGPUOptions = {
  adapter?: GPURequestAdapterOptions;
  device?: GPUDeviceDescriptor;
};

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
