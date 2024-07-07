import { ErrorBoundary } from "solid-js";
import {
  GPUContainer,
  GPULoadError,
  GPU_LOAD_ERROR,
} from "../GPUContainer.tsx";

export default function App() {
  const canvas = (<canvas width={320} height={240} />) as HTMLCanvasElement;

  return (
    <ErrorBoundary fallback={(e) => <div>{String(e)}</div>}>
      {canvas}
      <GPUContainer canvas={canvas} fallback={"Loading..."}>
        <div>Loaded!</div>
      </GPUContainer>
    </ErrorBoundary>
  );
}
