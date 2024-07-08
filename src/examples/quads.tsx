import { GPUContainer } from "../GPUContainer.tsx";
import { GPUWorkQueue } from "../GPUWorkQueue.tsx";

export function Quads() {
  const canvas = (<canvas width={320} height={240} />) as HTMLCanvasElement;

  let work: undefined | GPUWorkQueue;

  return (
    <>
      {canvas}
      <GPUContainer canvas={canvas} fallback={"Loading..."}>
        <GPUWorkQueue.Provider ref={work}>
          <div>Loaded!</div>
        </GPUWorkQueue.Provider>
      </GPUContainer>
    </>
  );
}

export default Quads;
