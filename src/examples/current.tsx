import { ErrorBoundary } from "solid-js";
import { GPUContainer } from "../GPUContainer.tsx";
import { GPUWorkQueue } from "../GPUWorkQueue.tsx";

export function Playground() {
  const canvas = (<canvas width={320} height={240} />) as HTMLCanvasElement;

  let render: undefined | GPUWorkQueue;

  return (
    <ErrorBoundary fallback={(e) => <div>{String(e)}</div>}>
      {canvas}
      <GPUContainer canvas={canvas} fallback={"Loading..."}>
        <GPUWorkQueue.Provider ref={render}>
          <div>Loaded!</div>
        </GPUWorkQueue.Provider>
      </GPUContainer>
    </ErrorBoundary>
  );
}

export function BasicError() {
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

export default Playground;
