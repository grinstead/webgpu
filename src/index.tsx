/* @refresh reload */
import { ErrorBoundary, render } from "solid-js/web";
import Example from "./examples/current.tsx";

const root = document.getElementById("root");

render(
  () => (
    <ErrorBoundary
      fallback={(e) => (
        <>
          <h4>Fatal Error</h4>
          <div>{String(e)}</div>
        </>
      )}
    >
      <Example />
    </ErrorBoundary>
  ),
  root!
);
