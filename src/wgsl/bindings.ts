import { Dealias, WEBGPU_ALIAS, WebGPUType } from "./webgpu_types.ts";
import { WGSLPart, WGSLSerializeState } from "./wgsl.ts";

export type ParseBindings<S extends string> = S extends ""
  ? {}
  : S extends `\n${infer R}`
  ? ParseBindings<R>
  : S extends ` ${infer R}`
  ? ParseBindings<R>
  : S extends `var<uniform> ${infer Name}: ${infer T extends WebGPUType};${infer R}`
  ? { [k in Name]: Dealias<T> } & ParseBindings<R>
  : never;

export function bindings<S extends string>(
  code: S
): WGSLPart<ParseBindings<S>> {
  const bindings: any = {};

  const regex = /\bvar<uniform>\s*([^\s:;]+):\s*([^\s;]+);/gm;
  let match;
  while ((match = regex.exec(code))) {
    const [, name, datatype] = match;

    bindings[name] = WEBGPU_ALIAS.hasOwnProperty(datatype)
      ? WEBGPU_ALIAS[datatype as keyof typeof WEBGPU_ALIAS]
      : datatype;
  }

  return {
    toWGSL() {
      return { bindings, parts: [encodeBindings] };
    },
  };

  function encodeBindings(state: WGSLSerializeState): WGSLSerializeState {
    const group = state.nextGroup++;
    state.nextBinding = 0;

    const result = code.replace(
      /var<uniform>/g,
      () => `@group(${group}) @binding(${state.nextBinding++}) var<uniform>`
    );

    state.code.push(result);

    return state;
  }
}
