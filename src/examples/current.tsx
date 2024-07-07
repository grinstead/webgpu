import { ErrorBoundary } from "solid-js";
import { GPUContainer } from "../GPUContainer.tsx";
import { RenderQueue } from "../RenderQueue.tsx";

export function Playground() {
  const canvas = (<canvas width={320} height={240} />) as HTMLCanvasElement;

  let render: undefined | RenderQueue;

  return (
    <ErrorBoundary fallback={(e) => <div>{String(e)}</div>}>
      {canvas}
      <GPUContainer canvas={canvas} fallback={"Loading..."}>
        <RenderQueue.Provider ref={render}>
          <div>Loaded!</div>
        </RenderQueue.Provider>
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
