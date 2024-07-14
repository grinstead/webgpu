export type WGSLSerializeState = {
  nextGroup: number;
  nextBinding: number;
  code: Array<string>;
};

export type WGSLSerializer = (state: WGSLSerializeState) => WGSLSerializeState;

export type WGSLSection<T> = {
  bindings: T;
  parts: Array<string | WGSLSerializer>;
};

export interface WGSLPart<Bindings> {
  toWGSL(): WGSLSection<Bindings>;
}

export class WGSLCode<Bindings = {}>
  implements WGSLPart<Bindings>, WGSLSection<Bindings>
{
  constructor(
    public parts: Array<string | WGSLSerializer>,
    public bindings: Bindings
  ) {}

  toWGSL() {
    return this;
  }

  toString() {
    let state: WGSLSerializeState = { nextGroup: 0, nextBinding: 0, code: [] };

    for (const part of this.parts) {
      if (typeof part === "string") {
        part && state.code.push(part);
      } else {
        state = part(state);
      }
    }

    return state.code.join("");
  }
}

export function wgsl(code: TemplateStringsArray): WGSLCode;
export function wgsl<T1>(
  code: TemplateStringsArray,
  p1: WGSLPart<T1>
): WGSLCode<{ [K in keyof T1]: T1[K] }>;
export function wgsl<T1, T2>(
  code: TemplateStringsArray,
  p1: WGSLPart<T1>,
  p2: WGSLPart<T2>
): WGSLCode<{ [K in keyof (T1 & T2)]: (T1 & T2)[K] }>;
export function wgsl<T1, T2, T3>(
  code: TemplateStringsArray,
  p1: WGSLPart<T1>,
  p2: WGSLPart<T2>,
  p3: WGSLPart<T3>
): WGSLCode<{ [K in keyof (T1 & T2 & T3)]: (T1 & T2 & T3)[K] }>;
export function wgsl<T1, T2, T3, T4>(
  code: TemplateStringsArray,
  p1: WGSLPart<T1>,
  p2: WGSLPart<T2>,
  p3: WGSLPart<T3>,
  p4: WGSLPart<T4>
): WGSLCode<{ [K in keyof (T1 & T2 & T3 & T4)]: (T1 & T2 & T3 & T4)[K] }>;
export function wgsl<T1, T2, T3, T4>(
  code: TemplateStringsArray,
  p1: WGSLPart<T1>,
  p2: WGSLPart<T2>,
  p3: WGSLPart<T3>,
  p4: WGSLPart<T4>,
  ...rest: Array<WGSLPart<any>>
): WGSLCode<{ [K in keyof (T1 & T2 & T3 & T4)]: (T1 & T2 & T3 & T4)[K] }>;
export function wgsl(
  code: TemplateStringsArray,
  ...args: Array<WGSLPart<any>>
) {
  const parts: Array<string | WGSLSerializer> = [code[0]];
  const bindings: any = {};

  for (let i = 0; i < args.length; i++) {
    const result = args[i].toWGSL();
    Object.assign(bindings, result.bindings);
    parts.push(...result.parts);
    parts.push(code[i + 1]);
  }

  return new WGSLCode(parts, bindings);
}
